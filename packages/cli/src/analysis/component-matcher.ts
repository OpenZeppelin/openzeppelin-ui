import ts from 'typescript';

import type {
  ComponentCatalog,
  HtmlElementLibrary,
  SourceLibrary,
  SourceLibraryMapping,
} from '../catalog';
import { isExcludedLibrary, isExcludedPattern } from '../catalog/exclusions';
import {
  classifyImportSource,
  inferCompoundFamily,
  isLocalImport,
  type ImportSourceKind,
} from './import-classifier';
import {
  findWorkspacePackageForImport,
  isFileInDesignSystemPackage,
  resolveLocalImportToFile,
  type WorkspacePackageInfo,
} from './import-resolver';
import type { ScannedFile } from './scanner';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ComponentDetectorKind =
  | 'catalog-direct'
  | 'library-mapping'
  | 'namespace-mapping'
  | 'html-fallback';

export type ComponentDetectionConfidence = 'high' | 'medium' | 'low';

export interface ComponentEvidence {
  kind:
    | 'default-import'
    | 'named-import'
    | 'namespace-import'
    | 'jsx-component-usage'
    | 'jsx-namespace-usage'
    | 'html-tag-usage'
    | 'html-input-type';
  file: string;
  usageCount: number;
  sourceImport: string;
  importedName: string | null;
  localName: string | null;
  intrinsicTag: string | null;
  inputType: string | null;
}

export interface ComponentObservation {
  rawName: string;
  reportName: string;
  canonicalFamily: string | null;
  sourceLibrary: string | null;
  sourceImport: string;
  ozTarget: string | null;
  effort: 'low' | 'medium' | 'high' | 'unknown';
  category: 'ui' | 'field' | 'unknown';
  capabilities: string[];
  usageCount: number;
  file: string;
  notes: string;
  detectorKind: ComponentDetectorKind;
  confidence: ComponentDetectionConfidence;
  evidences: ComponentEvidence[];
}

export interface ComponentMatch {
  name: string;
  reportName: string;
  canonicalFamily: string | null;
  rawNames: string[];
  sourceLibrary: string | null;
  sourceImport: string;
  ozTarget: string | null;
  effort: 'low' | 'medium' | 'high' | 'unknown';
  category: 'ui' | 'field' | 'unknown';
  capabilities: string[];
  usageCount: number;
  files: string[];
  notes: string;
  detectorKinds: ComponentDetectorKind[];
  confidence: ComponentDetectionConfidence;
  evidences: ComponentEvidence[];
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface ImportBinding {
  importedName: string;
  localName: string;
  kind: 'named' | 'default' | 'namespace';
}

interface ImportInfo {
  source: string;
  bindings: ImportBinding[];
}

interface ParsedFileFacts {
  imports: ImportInfo[];
  componentUsages: Map<string, number>;
  namespaceUsages: Map<string, number>;
  htmlTagUsages: Map<string, number>;
  inputTypeUsages: Map<string, number>;
}

interface MatchResult {
  reportName: string;
  canonicalFamily: string | null;
  ozTarget: string | null;
  effort: ComponentMatch['effort'];
  category: ComponentMatch['category'];
  capabilities: string[];
  notes: string;
  sourceLibrary: string | null;
  detectorKind: ComponentDetectorKind;
  confidence: ComponentDetectionConfidence;
}

/** Shared context threaded through the detection pipeline. */
export interface AnalysisContext {
  designSystemIndicators: string[];
  workspacePackages: WorkspacePackageInfo[];
  /** Substrings from catalog `importPatterns` only — excludes workspace package names. */
  externalLibraryPatterns: string[];
}

const DEFAULT_ANALYSIS_CONTEXT: AnalysisContext = {
  designSystemIndicators: [],
  workspacePackages: [],
  externalLibraryPatterns: [],
};

const LOCAL_DS_WRAPPER_MAX_DEPTH = 8;

/**
 * True when `start` or any module reachable from it via local-relative / alias
 * imports (within `files`) contains a known third-party UI library import
 * pattern. Workspace package names are intentionally excluded so app shells
 * that only compose `@acme/ui` are not treated as shadcn/Radix wrappers.
 */
function localModuleTransitivelyImportsExternalLibrary(
  start: ScannedFile,
  files: ScannedFile[],
  externalPatterns: readonly string[]
): boolean {
  if (externalPatterns.length === 0) return false;

  const visited = new Set<string>();

  function walk(file: ScannedFile, depth: number): boolean {
    if (depth > LOCAL_DS_WRAPPER_MAX_DEPTH) return false;
    const key = file.relativePath;
    if (visited.has(key)) return false;
    visited.add(key);

    if (externalPatterns.some((p) => file.content.includes(p))) return true;

    const facts = parseFileFacts(file);
    for (const imp of facts.imports) {
      if (isExcludedLibrary(imp.source) || isExcludedPattern(imp.source)) continue;
      const sk = classifyImportSource(imp.source);
      if (!isLocalImport(sk)) continue;
      const resolved = resolveLocalImportToFile(file.relativePath, imp.source, files);
      if (resolved && walk(resolved, depth + 1)) return true;
    }
    return false;
  }

  return walk(start, 0);
}

// ---------------------------------------------------------------------------
// Product configuration — OZ packages that form the migration inventory
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// AST helpers — parsing TypeScript / JSX into structured facts
// ---------------------------------------------------------------------------

function getScriptKind(filePath: string): ts.ScriptKind {
  if (filePath.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (filePath.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (filePath.endsWith('.mts')) return ts.ScriptKind.TS;
  if (filePath.endsWith('.cts')) return ts.ScriptKind.TS;
  if (filePath.endsWith('.js')) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function incrementCount(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function toPascalCase(input: string): string {
  return input
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join('');
}

function getJsxIdentifierText(
  tagName: ts.JsxTagNameExpression
): { kind: 'component'; name: string } | { kind: 'namespace'; namespace: string } | null {
  if (ts.isIdentifier(tagName)) {
    const text = tagName.text;
    if (text && text[0] === text[0]?.toLowerCase()) return null;
    return { kind: 'component', name: text };
  }
  if (ts.isPropertyAccessExpression(tagName) && ts.isIdentifier(tagName.expression)) {
    return { kind: 'namespace', namespace: tagName.expression.text };
  }
  return null;
}

function getIntrinsicJsxTagName(tagName: ts.JsxTagNameExpression): string | null {
  if (!ts.isIdentifier(tagName)) return null;
  const text = tagName.text;
  return text && text[0] === text[0]?.toLowerCase() ? text : null;
}

function parseInputTypeFromAttributes(attributes: ts.JsxAttributes): string {
  for (const attribute of attributes.properties) {
    if (
      !ts.isJsxAttribute(attribute) ||
      !ts.isIdentifier(attribute.name) ||
      attribute.name.text !== 'type'
    )
      continue;
    if (!attribute.initializer) return 'text';
    if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text.toLowerCase();
    if (
      ts.isJsxExpression(attribute.initializer) &&
      attribute.initializer.expression &&
      ts.isStringLiteral(attribute.initializer.expression)
    )
      return attribute.initializer.expression.text.toLowerCase();
  }
  return 'text';
}

function collectJsxFacts(
  tagName: ts.JsxTagNameExpression,
  attributes: ts.JsxAttributes,
  facts: ParsedFileFacts
): void {
  const ref = getJsxIdentifierText(tagName);
  if (ref?.kind === 'component') {
    incrementCount(facts.componentUsages, ref.name);
    return;
  }
  if (ref?.kind === 'namespace') {
    incrementCount(facts.namespaceUsages, ref.namespace);
    return;
  }

  const tag = getIntrinsicJsxTagName(tagName);
  if (!tag) return;
  incrementCount(facts.htmlTagUsages, tag);
  if (tag === 'input')
    incrementCount(facts.inputTypeUsages, parseInputTypeFromAttributes(attributes));
}

function extractImports(sourceFile: ts.SourceFile): ImportInfo[] {
  const imports: ImportInfo[] = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      continue;
    const clause = statement.importClause;
    if (!clause) continue;

    const bindings: ImportBinding[] = [];
    if (clause.name) {
      bindings.push({
        importedName: clause.name.text,
        localName: clause.name.text,
        kind: 'default',
      });
    }
    if (clause.namedBindings) {
      if (ts.isNamedImports(clause.namedBindings)) {
        for (const el of clause.namedBindings.elements) {
          bindings.push({
            importedName: el.propertyName?.text ?? el.name.text,
            localName: el.name.text,
            kind: 'named',
          });
        }
      } else if (ts.isNamespaceImport(clause.namedBindings)) {
        bindings.push({
          importedName: clause.namedBindings.name.text,
          localName: clause.namedBindings.name.text,
          kind: 'namespace',
        });
      }
    }
    imports.push({ source: statement.moduleSpecifier.text, bindings });
  }
  return imports;
}

function hasExportModifier(node: ts.Node): boolean {
  const mods = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

/**
 * PascalCase `export function` declarations — used to detect self-contained UI kit
 * modules (no third-party UI imports) whose exports are all catalog-mapped.
 */
function extractExportedFunctionComponentNames(file: ScannedFile): string[] {
  const sourceFile = ts.createSourceFile(
    file.relativePath,
    file.content,
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(file.relativePath)
  );

  const names: string[] = [];
  for (const stmt of sourceFile.statements) {
    if (!ts.isFunctionDeclaration(stmt) || !stmt.name) continue;
    if (!hasExportModifier(stmt)) continue;
    const text = stmt.name.text;
    if (text && text[0] === text[0]!.toUpperCase()) names.push(text);
  }
  return names;
}

/** Path depth under `src/` (segment count including file), or 0 if not under src/. */
function pathSegmentsDeepUnderSrc(relativePath: string): number {
  const norm = relativePath.replace(/\\/g, '/');
  if (!norm.startsWith('src/')) return 0;
  return norm.slice('src/'.length).split('/').filter(Boolean).length;
}

function isExportShapeInferenceLibrary(
  library: SourceLibrary,
  libKey: string
): library is SourceLibrary {
  if (libKey === 'html-elements') return false;
  if ((library as HtmlElementLibrary).htmlTags) return false;
  if (library.importPatterns.length === 0) return false;
  if (library.catalogFallback && Object.keys(library.mappings).length === 0) return false;
  return Object.keys(library.mappings).length > 0;
}

/**
 * Picks the source library that maps every exported name, preferring libraries
 * that explain more exports as explicit compound rows (reportName: target).
 */
function selectLibraryFullyCoveringExports(
  exportedNames: string[],
  sourceLibraries: Record<string, SourceLibrary>
): { key: string; library: SourceLibrary } | null {
  type Scored = {
    key: string;
    library: SourceLibrary;
    score: number;
    compoundCatalogBreadth: number;
  };
  const candidates: Scored[] = [];

  for (const [key, library] of Object.entries(sourceLibraries)) {
    if (!isExportShapeInferenceLibrary(library, key)) continue;
    if (!exportedNames.every((n) => library.mappings[n])) continue;
    const compoundHits = exportedNames.filter(
      (n) => library.mappings[n]?.reportName === 'target'
    ).length;
    const compoundCatalogBreadth = Object.values(library.mappings).filter(
      (m) => m.reportName === 'target'
    ).length;
    candidates.push({
      key,
      library,
      score: compoundHits * 1000 + exportedNames.length,
      compoundCatalogBreadth,
    });
  }

  if (candidates.length === 0) return null;
  candidates.sort(
    (a, b) =>
      b.score - a.score ||
      b.compoundCatalogBreadth - a.compoundCatalogBreadth ||
      a.key.localeCompare(b.key)
  );
  return { key: candidates[0]!.key, library: candidates[0]!.library };
}

function qualifiesForExportShapeInference(resolved: ScannedFile, exportedNames: string[]): boolean {
  if (exportedNames.length === 0) return false;
  const depth = pathSegmentsDeepUnderSrc(resolved.relativePath);
  if (exportedNames.length >= 2) return true;
  return exportedNames.length === 1 && depth >= 3;
}

function parseFileFacts(file: ScannedFile): ParsedFileFacts {
  const sourceFile = ts.createSourceFile(
    file.relativePath,
    file.content,
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(file.relativePath)
  );

  const facts: ParsedFileFacts = {
    imports: extractImports(sourceFile),
    componentUsages: new Map(),
    namespaceUsages: new Map(),
    htmlTagUsages: new Map(),
    inputTypeUsages: new Map(),
  };

  function visit(node: ts.Node): void {
    if (ts.isJsxSelfClosingElement(node)) collectJsxFacts(node.tagName, node.attributes, facts);
    else if (ts.isJsxOpeningElement(node)) collectJsxFacts(node.tagName, node.attributes, facts);
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return facts;
}

// ---------------------------------------------------------------------------
// Library mapping helpers
// ---------------------------------------------------------------------------

function getNamespaceMappingKey(importSource: string): string | null {
  const segment = importSource.split('/').pop();
  if (!segment) return null;
  const base = toPascalCase(segment);
  return base ? `${base}Primitive` : null;
}

function resolveLibraryMapping(
  library: SourceLibrary,
  importedName: string,
  source: string,
  kind: ImportBinding['kind']
): SourceLibraryMapping | undefined {
  if (kind !== 'namespace' || library.namespaceImportStrategy !== 'package-name') {
    return library.mappings[importedName];
  }
  const nsKey = getNamespaceMappingKey(source);
  if (nsKey && library.mappings[nsKey]) return library.mappings[nsKey];
  const pkgKey = nsKey?.replace(/Primitive$/, '');
  if (pkgKey && library.mappings[pkgKey]) return library.mappings[pkgKey];
  return library.mappings[importedName];
}

/**
 * Determines the report name for a library-matched component.
 * Compounds collapse to family only for non-relative direct library imports.
 */
function resolveLibraryReportName(
  importedName: string,
  mapping: SourceLibraryMapping,
  library: SourceLibrary,
  bindingKind: ImportBinding['kind'],
  sourceKind: ImportSourceKind
): string {
  if (
    bindingKind === 'namespace' &&
    library.namespaceReportName === 'target' &&
    importedName.endsWith('Primitive')
  ) {
    return importedName;
  }
  if (bindingKind === 'namespace' && library.namespaceReportName === 'target') {
    return mapping.source;
  }
  if (mapping.reportName === 'target' && sourceKind !== 'local-relative') {
    return mapping.source;
  }
  return importedName;
}

// ---------------------------------------------------------------------------
// Confidence helpers
// ---------------------------------------------------------------------------

function mergeConfidence(
  current: ComponentDetectionConfidence,
  next: ComponentDetectionConfidence
): ComponentDetectionConfidence {
  const rank: Record<ComponentDetectionConfidence, number> = { low: 0, medium: 1, high: 2 };
  return rank[next] < rank[current] ? next : current;
}

function determineObservationConfidence(
  detectorKind: ComponentDetectorKind,
  ozTarget: string | null
): ComponentDetectionConfidence {
  if (!ozTarget) return 'low';
  if (detectorKind === 'html-fallback') return 'medium';
  return 'high';
}

// ---------------------------------------------------------------------------
// Match strategies
// ---------------------------------------------------------------------------

/**
 * Builds the set of known component families for compound inference.
 * Includes OZ catalog keys AND unique OZ target names from source library
 * mappings (e.g. shadcn mapping `TableBody→Table` implies `Table` is a family
 * even if it's not in the catalog).
 */
function buildKnownFamilies(
  catalog: ComponentCatalog,
  sourceLibraries: Record<string, SourceLibrary>
): ReadonlySet<string> {
  const families = new Set(Object.keys(catalog.components));
  for (const library of Object.values(sourceLibraries)) {
    for (const mapping of Object.values(library.mappings)) {
      if (mapping.source) families.add(mapping.source);
    }
  }
  return families;
}

function enrichWithCatalog(result: MatchResult, catalog: ComponentCatalog): void {
  if (!result.ozTarget) return;
  const entry = catalog.components[result.ozTarget];
  if (entry) {
    result.category = entry.category;
    result.capabilities = entry.capabilities;
  }
}

/**
 * Strategy 1: the import source directly matches a known external library's
 * import patterns. Applies the library's explicit mapping (if any).
 *
 * When a library matches but has no specific mapping for the imported name,
 * libraries with `catalogFallback: true` get a catalog-direct + compound
 * inference check before falling back to an unresolved result. This lets
 * packages like `@openzeppelin/ui-components` auto-resolve their components
 * without needing exhaustive per-component JSON entries.
 */
function tryExternalLibraryMatch(
  imp: ImportInfo,
  binding: ImportBinding,
  sourceKind: ImportSourceKind,
  sourceLibraries: Record<string, SourceLibrary>,
  catalog: ComponentCatalog,
  catalogFamilies: ReadonlySet<string>
): MatchResult | null {
  for (const [libKey, library] of Object.entries(sourceLibraries)) {
    if (!library.importPatterns.some((p) => imp.source.includes(p))) continue;

    const mapping = resolveLibraryMapping(library, binding.importedName, imp.source, binding.kind);
    if (mapping) {
      const reportName = resolveLibraryReportName(
        binding.importedName,
        mapping,
        library,
        binding.kind,
        sourceKind
      );
      const detectorKind: ComponentDetectorKind =
        binding.kind === 'namespace' ? 'namespace-mapping' : 'library-mapping';
      const result: MatchResult = {
        reportName,
        canonicalFamily: mapping.source,
        ozTarget: mapping.source,
        effort: mapping.effort,
        category: 'unknown',
        capabilities: [],
        notes: mapping.notes,
        sourceLibrary: libKey,
        detectorKind,
        confidence: 'high',
      };
      enrichWithCatalog(result, catalog);
      return result;
    }

    if (library.catalogFallback) {
      if (catalog.components[binding.importedName]) {
        const entry = catalog.components[binding.importedName];
        return {
          reportName: binding.importedName,
          canonicalFamily: binding.importedName,
          ozTarget: binding.importedName,
          effort: 'low',
          category: entry.category,
          capabilities: entry.capabilities,
          notes: 'Catalog-direct via library with catalogFallback',
          sourceLibrary: libKey,
          detectorKind: 'catalog-direct',
          confidence: 'high',
        };
      }

      const family = inferCompoundFamily(binding.importedName, catalogFamilies);
      if (family) {
        const entry = catalog.components[family];
        return {
          reportName: binding.importedName,
          canonicalFamily: family,
          ozTarget: family,
          effort: 'low',
          category: entry?.category ?? 'unknown',
          capabilities: entry?.capabilities ?? [],
          notes: `Compound maps to ${family} family`,
          sourceLibrary: libKey,
          detectorKind: 'library-mapping',
          confidence: 'high',
        };
      }

      return null;
    }

    // Library matched but no mapping for this specific import name
    return {
      reportName: binding.importedName,
      canonicalFamily: null,
      ozTarget: null,
      effort: 'unknown',
      category: 'unknown',
      capabilities: [],
      notes: '',
      sourceLibrary: libKey,
      detectorKind: 'library-mapping',
      confidence: 'low',
    };
  }
  return null;
}

/**
 * When a local module implements a UI kit without third-party UI imports, infer
 * the source library from exported component names (all must map in one catalog
 * library). Preserves compound imported names so per-subcomponent detection
 * tuples stay distinct.
 */
function tryInferredExportShapeLibraryMatch(
  binding: ImportBinding,
  sourceKind: ImportSourceKind,
  importSource: string,
  resolved: ScannedFile,
  sourceLibraries: Record<string, SourceLibrary>,
  catalog: ComponentCatalog
): MatchResult | null {
  if (binding.kind === 'namespace') return null;

  const exportedNames = extractExportedFunctionComponentNames(resolved);
  if (!qualifiesForExportShapeInference(resolved, exportedNames)) return null;
  if (!exportedNames.includes(binding.importedName)) return null;

  const pick = selectLibraryFullyCoveringExports(exportedNames, sourceLibraries);
  if (!pick) return null;

  const mapping = resolveLibraryMapping(
    pick.library,
    binding.importedName,
    importSource,
    binding.kind
  );
  if (!mapping) return null;

  const reportName =
    mapping.reportName === 'target'
      ? binding.importedName
      : resolveLibraryReportName(
          binding.importedName,
          mapping,
          pick.library,
          binding.kind,
          sourceKind
        );

  const detectorKind: ComponentDetectorKind =
    binding.kind === 'namespace' ? 'namespace-mapping' : 'library-mapping';
  const result: MatchResult = {
    reportName,
    canonicalFamily: mapping.source,
    ozTarget: mapping.source,
    effort: mapping.effort,
    category: 'unknown',
    capabilities: [],
    notes: mapping.notes,
    sourceLibrary: pick.key,
    detectorKind,
    confidence: 'high',
  };
  enrichWithCatalog(result, catalog);
  return result;
}

const NON_UI_IDENTITY_SUFFIXES = ['Provider', 'Context'] as const;

/**
 * Checks a component name against compound inference and the OZ catalog.
 * Shared logic for strategies 3 and 4.
 *
 * Does NOT iterate source library mappings — those are import-source-specific
 * and applying them to a different package would map names incorrectly
 * (e.g. antd key "Dialog" → source "Modal" would pollute a workspace DS
 * export named Dialog).
 *
 * When `allowIdentityFallback` is true (workspace DS packages only), any
 * used PascalCase export is reported even without a known mapping, unless
 * the name matches a non-UI pattern (e.g. *Provider, *Context).
 */
function tryDesignSystemInferredMatch(
  importedName: string,
  catalog: ComponentCatalog,
  catalogFamilies: ReadonlySet<string>,
  allowIdentityFallback: boolean
): MatchResult | null {
  const family = inferCompoundFamily(importedName, catalogFamilies);
  if (family) {
    const entry = catalog.components[family];
    return {
      reportName: importedName,
      canonicalFamily: family,
      ozTarget: family,
      effort: 'low',
      category: entry?.category ?? 'unknown',
      capabilities: entry?.capabilities ?? [],
      notes: `Compound maps to ${family} family`,
      sourceLibrary: null,
      detectorKind: 'library-mapping',
      confidence: 'high',
    };
  }

  if (catalog.components[importedName]) {
    const entry = catalog.components[importedName];
    return {
      reportName: importedName,
      canonicalFamily: importedName,
      ozTarget: importedName,
      effort: 'low',
      category: entry.category,
      capabilities: entry.capabilities,
      notes: 'Direct name match in OZ catalog',
      sourceLibrary: null,
      detectorKind: 'catalog-direct',
      confidence: 'high',
    };
  }

  if (allowIdentityFallback) {
    if (NON_UI_IDENTITY_SUFFIXES.some((s) => importedName.endsWith(s))) return null;
    return {
      reportName: importedName,
      canonicalFamily: importedName,
      ozTarget: importedName,
      effort: 'unknown',
      category: 'unknown',
      capabilities: [],
      notes: 'Design system workspace export',
      sourceLibrary: null,
      detectorKind: 'library-mapping',
      confidence: 'medium',
    };
  }

  return null;
}

/**
 * Strategy 4: weak fallback — the imported component name happens to match
 * an entry in the OZ catalog. Used only when no stronger signal is available.
 */
function isCatalogOrLibraryMappedName(
  name: string,
  catalog: ComponentCatalog,
  sourceLibraries: Record<string, SourceLibrary>
): boolean {
  if (catalog.components[name]) return true;
  for (const library of Object.values(sourceLibraries)) {
    if (library.mappings[name]) return true;
  }
  return false;
}

function tryCatalogFallback(importedName: string, catalog: ComponentCatalog): MatchResult | null {
  if (catalog.components[importedName]) {
    const entry = catalog.components[importedName];
    return {
      reportName: importedName,
      canonicalFamily: importedName,
      ozTarget: importedName,
      effort: 'low',
      category: entry.category,
      capabilities: entry.capabilities,
      notes: 'Direct name match in OZ catalog',
      sourceLibrary: null,
      detectorKind: 'catalog-direct',
      confidence: 'low',
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Observation building
// ---------------------------------------------------------------------------

function createImportEvidences(
  file: ScannedFile,
  binding: ImportBinding,
  sourceImport: string,
  usageCount: number
): ComponentEvidence[] {
  const importKind: ComponentEvidence['kind'] =
    binding.kind === 'default'
      ? 'default-import'
      : binding.kind === 'namespace'
        ? 'namespace-import'
        : 'named-import';
  const jsxKind: ComponentEvidence['kind'] =
    binding.kind === 'namespace' ? 'jsx-namespace-usage' : 'jsx-component-usage';

  return [
    {
      kind: importKind,
      file: file.relativePath,
      usageCount,
      sourceImport,
      importedName: binding.importedName,
      localName: binding.localName,
      intrinsicTag: null,
      inputType: null,
    },
    {
      kind: jsxKind,
      file: file.relativePath,
      usageCount,
      sourceImport,
      importedName: binding.importedName,
      localName: binding.localName,
      intrinsicTag: null,
      inputType: null,
    },
  ];
}

function buildObservation(
  file: ScannedFile,
  imp: ImportInfo,
  binding: ImportBinding,
  usageCount: number,
  result: MatchResult
): ComponentObservation {
  return {
    rawName: binding.importedName,
    reportName: result.reportName,
    canonicalFamily: result.canonicalFamily,
    sourceLibrary: result.sourceLibrary,
    sourceImport: imp.source,
    ozTarget: result.ozTarget,
    effort: result.effort,
    category: result.category,
    capabilities: result.capabilities,
    usageCount,
    file: file.relativePath,
    notes: result.notes,
    detectorKind: result.detectorKind,
    confidence: result.confidence,
    evidences: createImportEvidences(file, binding, imp.source, usageCount),
  };
}

// ---------------------------------------------------------------------------
// Observation collection — orchestrator
// ---------------------------------------------------------------------------

function getBindingUsageCount(binding: ImportBinding, facts: ParsedFileFacts): number {
  return binding.kind === 'namespace'
    ? (facts.namespaceUsages.get(binding.localName) ?? 0)
    : (facts.componentUsages.get(binding.localName) ?? 0);
}

function collectImportObservation(
  file: ScannedFile,
  facts: ParsedFileFacts,
  catalog: ComponentCatalog,
  sourceLibraries: Record<string, SourceLibrary>,
  imp: ImportInfo,
  binding: ImportBinding,
  files: ScannedFile[],
  ctx: AnalysisContext,
  catalogFamilies: ReadonlySet<string>
): ComponentObservation | null {
  const usageCount = getBindingUsageCount(binding, facts);
  if (usageCount === 0) return null;

  const sourceKind = classifyImportSource(imp.source);

  // Skip namespace primitive imports inside design-system implementation files
  if (
    binding.importedName.endsWith('Primitive') &&
    binding.kind === 'namespace' &&
    isFileInDesignSystemPackage(file, ctx.workspacePackages)
  ) {
    return null;
  }

  // --- Strategy 1: direct external library pattern match ---
  const libResult = tryExternalLibraryMatch(
    imp,
    binding,
    sourceKind,
    sourceLibraries,
    catalog,
    catalogFamilies
  );
  if (libResult) return buildObservation(file, imp, binding, usageCount, libResult);

  // --- Strategy 2: workspace design-system package (generic) ---
  const wsPackage = findWorkspacePackageForImport(imp.source, ctx.workspacePackages);
  if (wsPackage?.isDesignSystem) {
    const wsResult = tryDesignSystemInferredMatch(
      binding.importedName,
      catalog,
      catalogFamilies,
      true
    );
    if (wsResult) return buildObservation(file, imp, binding, usageCount, wsResult);
  }

  // --- Strategy 3: local import that wraps a design system ---
  // Only catalog-direct match — compound inference is too aggressive for
  // app-level wrappers (e.g. TabsSection would falsely match Tabs).
  if (isLocalImport(sourceKind)) {
    const resolved = resolveLocalImportToFile(file.relativePath, imp.source, files);
    if (resolved) {
      const transitivelyExternal = localModuleTransitivelyImportsExternalLibrary(
        resolved,
        files,
        ctx.externalLibraryPatterns
      );
      let localResult: MatchResult | null = null;
      if (transitivelyExternal) {
        localResult = tryCatalogFallback(binding.importedName, catalog);
        if (
          !localResult &&
          isCatalogOrLibraryMappedName(binding.importedName, catalog, sourceLibraries)
        ) {
          localResult = tryDesignSystemInferredMatch(
            binding.importedName,
            catalog,
            catalogFamilies,
            true
          );
        }
      } else {
        localResult = tryInferredExportShapeLibraryMatch(
          binding,
          sourceKind,
          imp.source,
          resolved,
          sourceLibraries,
          catalog
        );
      }
      if (localResult) return buildObservation(file, imp, binding, usageCount, localResult);
    }
  }

  // --- Strategy 4: weak catalog-name fallback (non-local imports only) ---
  if (!isLocalImport(sourceKind)) {
    const fallback = tryCatalogFallback(binding.importedName, catalog);
    if (fallback) return buildObservation(file, imp, binding, usageCount, fallback);
  }

  return null;
}

/** Collects raw component observations before deduping them into report rows. */
export function collectComponentObservations(
  files: ScannedFile[],
  catalog: ComponentCatalog,
  sourceLibraries: Record<string, SourceLibrary>,
  ctx: AnalysisContext = DEFAULT_ANALYSIS_CONTEXT
): ComponentObservation[] {
  const catalogFamilies = buildKnownFamilies(catalog, sourceLibraries);
  const observations: ComponentObservation[] = [];

  for (const file of files) {
    const facts = parseFileFacts(file);

    for (const imp of facts.imports) {
      if (isExcludedLibrary(imp.source) || isExcludedPattern(imp.source)) continue;

      for (const binding of imp.bindings) {
        const obs = collectImportObservation(
          file,
          facts,
          catalog,
          sourceLibraries,
          imp,
          binding,
          files,
          ctx,
          catalogFamilies
        );
        if (obs) observations.push(obs);
      }
    }
  }

  return observations.sort((a, b) =>
    a.reportName === b.reportName
      ? a.file.localeCompare(b.file)
      : a.reportName.localeCompare(b.reportName)
  );
}

// ---------------------------------------------------------------------------
// HTML element observations
// ---------------------------------------------------------------------------

const HTML_TAGS = ['button', 'select', 'textarea', 'label', 'progress', 'dialog'] as const;

function resolveInputOzTarget(inputType: string): string | null {
  switch (inputType) {
    case 'text':
    case 'password':
    case 'email':
    case 'url':
    case 'tel':
    case 'search':
    case 'number':
      return 'Input';
    case 'checkbox':
      return 'Checkbox';
    case 'radio':
      return 'RadioGroup';
    default:
      return null;
  }
}

/** Collects native HTML element observations before aggregating them. */
export function collectHtmlElementObservations(
  files: ScannedFile[],
  htmlLib: HtmlElementLibrary,
  ctx: AnalysisContext = DEFAULT_ANALYSIS_CONTEXT
): ComponentObservation[] {
  const observations: ComponentObservation[] = [];

  for (const file of files) {
    // Files inside a design-system workspace package are implementing
    // UI components — their native HTML is not a migration signal.
    if (isFileInDesignSystemPackage(file, ctx.workspacePackages)) continue;

    const facts = parseFileFacts(file);

    for (const tagName of HTML_TAGS) {
      const ozTarget = Object.entries(htmlLib.mappings).find(([, m]) => m.source === tagName)?.[0];
      if (!ozTarget) continue;

      const usageCount = facts.htmlTagUsages.get(tagName) ?? 0;
      if (usageCount === 0) continue;

      const mapping = htmlLib.mappings[ozTarget];
      observations.push({
        rawName: ozTarget,
        reportName: ozTarget,
        canonicalFamily: ozTarget,
        sourceLibrary: 'html-elements',
        sourceImport: '',
        ozTarget,
        effort: mapping?.effort ?? 'unknown',
        category: 'unknown',
        capabilities: [],
        usageCount,
        file: file.relativePath,
        notes: mapping?.notes ?? '',
        detectorKind: 'html-fallback',
        confidence: determineObservationConfidence('html-fallback', ozTarget),
        evidences: [
          {
            kind: 'html-tag-usage',
            file: file.relativePath,
            usageCount,
            sourceImport: '',
            importedName: null,
            localName: null,
            intrinsicTag: tagName,
            inputType: null,
          },
        ],
      });
    }

    for (const [inputType, usageCount] of facts.inputTypeUsages.entries()) {
      const ozTarget = resolveInputOzTarget(inputType);
      if (!ozTarget) continue;

      const mapping = htmlLib.mappings[ozTarget];
      observations.push({
        rawName: ozTarget,
        reportName: ozTarget,
        canonicalFamily: ozTarget,
        sourceLibrary: 'html-elements',
        sourceImport: '',
        ozTarget,
        effort: mapping?.effort ?? 'unknown',
        category: 'unknown',
        capabilities: [],
        usageCount,
        file: file.relativePath,
        notes: mapping?.notes ?? '',
        detectorKind: 'html-fallback',
        confidence: determineObservationConfidence('html-fallback', ozTarget),
        evidences: [
          {
            kind: 'html-input-type',
            file: file.relativePath,
            usageCount,
            sourceImport: '',
            importedName: null,
            localName: null,
            intrinsicTag: 'input',
            inputType,
          },
        ],
      });
    }
  }

  return observations.sort((a, b) =>
    a.reportName === b.reportName
      ? a.file.localeCompare(b.file)
      : a.reportName.localeCompare(b.reportName)
  );
}

// ---------------------------------------------------------------------------
// Aggregation — merging observations into the final report
// ---------------------------------------------------------------------------

function findExistingMatchByName(
  matchMap: Map<string, ComponentMatch>,
  matchName: string
): ComponentMatch | undefined {
  return [...matchMap.values()].find((candidate) => candidate.name === matchName);
}

function applyResolvedMatch(match: ComponentMatch, observation: ComponentObservation): void {
  match.sourceLibrary = observation.sourceLibrary;
  match.sourceImport = observation.sourceImport;
  match.canonicalFamily = observation.canonicalFamily;
  match.ozTarget = observation.ozTarget;
  match.effort = observation.effort;
  match.category = observation.category;
  match.capabilities = observation.capabilities;
  match.notes = observation.notes;
  match.confidence = mergeConfidence(match.confidence, observation.confidence);
}

function mergeObservationIntoMatch(match: ComponentMatch, observation: ComponentObservation): void {
  match.usageCount += observation.usageCount;
  if (!match.files.includes(observation.file)) match.files.push(observation.file);
  if (!match.rawNames.includes(observation.rawName)) match.rawNames.push(observation.rawName);
  if (!match.detectorKinds.includes(observation.detectorKind))
    match.detectorKinds.push(observation.detectorKind);
  match.evidences.push(...observation.evidences);
  match.confidence = mergeConfidence(match.confidence, observation.confidence);
}

function createMatchFromObservation(observation: ComponentObservation): ComponentMatch {
  return {
    name: observation.reportName,
    reportName: observation.reportName,
    canonicalFamily: observation.canonicalFamily,
    rawNames: [observation.rawName],
    sourceLibrary: observation.sourceLibrary,
    sourceImport: observation.sourceImport,
    ozTarget: observation.ozTarget,
    effort: observation.effort,
    category: observation.category,
    capabilities: observation.capabilities,
    usageCount: observation.usageCount,
    files: [observation.file],
    notes: observation.notes,
    detectorKinds: [observation.detectorKind],
    confidence: observation.confidence,
    evidences: [...observation.evidences],
  };
}

function aggregateComponentObservations(observations: ComponentObservation[]): ComponentMatch[] {
  const matchMap = new Map<string, ComponentMatch>();

  for (const observation of observations) {
    const matchKey = `${observation.sourceLibrary ?? observation.sourceImport}:${observation.reportName}`;
    const existing = matchMap.get(matchKey);

    if (existing) {
      mergeObservationIntoMatch(existing, observation);
      continue;
    }

    const sameNameMatch = findExistingMatchByName(matchMap, observation.reportName);
    if (sameNameMatch) {
      mergeObservationIntoMatch(sameNameMatch, observation);
      if (!sameNameMatch.ozTarget && observation.ozTarget) {
        applyResolvedMatch(sameNameMatch, observation);
      }
      continue;
    }

    matchMap.set(matchKey, createMatchFromObservation(observation));
  }

  return [...matchMap.values()].sort((a, b) => b.usageCount - a.usageCount);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Aggregates import-based observations into the component report format. */
export function analyzeComponents(
  files: ScannedFile[],
  catalog: ComponentCatalog,
  sourceLibraries: Record<string, SourceLibrary>,
  ctx?: AnalysisContext
): ComponentMatch[] {
  return aggregateComponentObservations(
    collectComponentObservations(files, catalog, sourceLibraries, ctx)
  );
}

export function analyzeHtmlElements(
  files: ScannedFile[],
  htmlLib: HtmlElementLibrary,
  ctx?: AnalysisContext
): ComponentMatch[] {
  return aggregateComponentObservations(collectHtmlElementObservations(files, htmlLib, ctx));
}
