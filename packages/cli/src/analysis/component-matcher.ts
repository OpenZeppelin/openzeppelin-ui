import ts from 'typescript';

import type {
  ComponentCatalog,
  HtmlElementLibrary,
  SourceLibrary,
  SourceLibraryMapping,
} from '../catalog';
import { isExcludedLibrary, isExcludedPattern } from '../catalog/exclusions';
import type { ScannedFile } from './scanner';

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
  hasOzUiComponentsImport: boolean;
}

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

function mergeConfidence(
  current: ComponentDetectionConfidence,
  next: ComponentDetectionConfidence
): ComponentDetectionConfidence {
  const rank: Record<ComponentDetectionConfidence, number> = {
    low: 0,
    medium: 1,
    high: 2,
  };

  return rank[next] < rank[current] ? next : current;
}

function toPascalCase(input: string): string {
  return input
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join('');
}

function canDirectMatchCatalogImport(source: string): boolean {
  return !source.startsWith('.') && !source.startsWith('/');
}

function getJsxIdentifierText(
  tagName: ts.JsxTagNameExpression
): { kind: 'component'; name: string } | { kind: 'namespace'; namespace: string } | null {
  if (ts.isIdentifier(tagName)) {
    const text = tagName.text;
    if (text && text[0] === text[0]?.toLowerCase()) {
      return null;
    }
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
    ) {
      continue;
    }

    if (!attribute.initializer) return 'text';
    if (ts.isStringLiteral(attribute.initializer)) {
      return attribute.initializer.text.toLowerCase();
    }
    if (
      ts.isJsxExpression(attribute.initializer) &&
      attribute.initializer.expression &&
      ts.isStringLiteral(attribute.initializer.expression)
    ) {
      return attribute.initializer.expression.text.toLowerCase();
    }
  }

  return 'text';
}

function collectJsxFacts(
  tagName: ts.JsxTagNameExpression,
  attributes: ts.JsxAttributes,
  facts: ParsedFileFacts
): void {
  const componentReference = getJsxIdentifierText(tagName);
  if (componentReference?.kind === 'component') {
    incrementCount(facts.componentUsages, componentReference.name);
    return;
  }
  if (componentReference?.kind === 'namespace') {
    incrementCount(facts.namespaceUsages, componentReference.namespace);
    return;
  }

  const intrinsicTag = getIntrinsicJsxTagName(tagName);
  if (!intrinsicTag) return;

  incrementCount(facts.htmlTagUsages, intrinsicTag);
  if (intrinsicTag === 'input') {
    incrementCount(facts.inputTypeUsages, parseInputTypeFromAttributes(attributes));
  }
}

function extractImports(sourceFile: ts.SourceFile): ImportInfo[] {
  const imports: ImportInfo[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }

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
        for (const element of clause.namedBindings.elements) {
          bindings.push({
            importedName: element.propertyName?.text ?? element.name.text,
            localName: element.name.text,
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

    imports.push({
      source: statement.moduleSpecifier.text,
      bindings,
    });
  }

  return imports;
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
    hasOzUiComponentsImport: false,
  };

  for (const imp of facts.imports) {
    if (imp.source === '@openzeppelin/ui-components') {
      facts.hasOzUiComponentsImport = true;
    }
  }

  function visit(node: ts.Node): void {
    if (ts.isJsxSelfClosingElement(node)) {
      collectJsxFacts(node.tagName, node.attributes, facts);
    } else if (ts.isJsxOpeningElement(node)) {
      collectJsxFacts(node.tagName, node.attributes, facts);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return facts;
}

function getNamespaceMappingKey(importSource: string): string | null {
  const packageSegment = importSource.split('/').pop();
  if (!packageSegment) return null;

  const baseName = toPascalCase(packageSegment);
  if (!baseName) return null;

  return `${baseName}Primitive`;
}

function resolveLibraryMapping(
  library: SourceLibrary,
  importedName: string,
  source: string,
  kind: ImportBinding['kind']
) {
  if (kind !== 'namespace' || library.namespaceImportStrategy !== 'package-name') {
    return library.mappings[importedName];
  }

  const namespaceKey = getNamespaceMappingKey(source);
  if (namespaceKey && library.mappings[namespaceKey]) {
    return library.mappings[namespaceKey];
  }

  const packageKey = namespaceKey?.replace(/Primitive$/, '');
  if (packageKey && library.mappings[packageKey]) {
    return library.mappings[packageKey];
  }

  return library.mappings[importedName];
}

function resolveMatchName(
  importedName: string,
  mapping: SourceLibraryMapping | undefined,
  library: SourceLibrary | undefined,
  kind: ImportBinding['kind'],
  sourceImport: string
): string {
  if (!mapping) return importedName;

  if (shouldPreserveNamespaceImportName(importedName, library, kind)) {
    return importedName;
  }

  if (kind === 'namespace' && library?.namespaceReportName === 'target') {
    return mapping.source;
  }

  if (shouldPreserveRelativeShadcnCompoundName(sourceImport, library, mapping)) {
    return importedName;
  }

  return mapping.reportName === 'target' ? mapping.source : importedName;
}

function shouldPreserveNamespaceImportName(
  importedName: string,
  library: SourceLibrary | undefined,
  kind: ImportBinding['kind']
): boolean {
  return (
    kind === 'namespace' &&
    library?.namespaceReportName === 'target' &&
    importedName.endsWith('Primitive')
  );
}

function shouldPreserveRelativeShadcnCompoundName(
  sourceImport: string,
  library: SourceLibrary | undefined,
  mapping: SourceLibraryMapping
): boolean {
  return (
    library?.library === 'shadcn/ui' &&
    sourceImport.startsWith('.') &&
    mapping.reportName === 'target'
  );
}

function findExistingMatchByName(
  matchMap: Map<string, ComponentMatch>,
  matchName: string
): ComponentMatch | undefined {
  return [...matchMap.values()].find((candidate) => candidate.name === matchName);
}

function applyResolvedMatch(
  match: ComponentMatch,
  sourceLibrary: string | null,
  sourceImport: string,
  canonicalFamily: string | null,
  ozTarget: string | null,
  effort: ComponentMatch['effort'],
  category: ComponentMatch['category'],
  capabilities: string[],
  notes: string,
  confidence: ComponentDetectionConfidence
): void {
  match.sourceLibrary = sourceLibrary;
  match.sourceImport = sourceImport;
  match.canonicalFamily = canonicalFamily;
  match.ozTarget = ozTarget;
  match.effort = effort;
  match.category = category;
  match.capabilities = capabilities;
  match.notes = notes;
  match.confidence = mergeConfidence(match.confidence, confidence);
}

function determineObservationConfidence(
  detectorKind: ComponentDetectorKind,
  ozTarget: string | null
): ComponentDetectionConfidence {
  if (!ozTarget) return 'low';
  if (detectorKind === 'html-fallback') return 'medium';
  return 'high';
}

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

function collectImportObservation(
  file: ScannedFile,
  facts: ParsedFileFacts,
  catalog: ComponentCatalog,
  sourceLibraries: Record<string, SourceLibrary>,
  imp: ImportInfo,
  binding: ImportBinding
): ComponentObservation | null {
  const importedName = binding.importedName;
  const usageCount =
    binding.kind === 'namespace'
      ? (facts.namespaceUsages.get(binding.localName) ?? 0)
      : (facts.componentUsages.get(binding.localName) ?? 0);

  if (usageCount === 0) return null;

  if (
    importedName.endsWith('Primitive') &&
    imp.source.startsWith('@radix-ui/') &&
    file.relativePath.split(/[/\\]/).includes('packages')
  ) {
    return null;
  }

  let reportName = importedName;
  let canonicalFamily: string | null = null;
  let ozTarget: string | null = null;
  let effort: ComponentMatch['effort'] = 'unknown';
  let category: ComponentMatch['category'] = 'unknown';
  let capabilities: string[] = [];
  let notes = '';
  let sourceLibrary: string | null = null;
  let detectorKind: ComponentDetectorKind = 'catalog-direct';

  // Direct OZ catalog matches are a useful fallback when the import source is not a local file path.
  if (canDirectMatchCatalogImport(imp.source) && catalog.components[importedName]) {
    const ozComp = catalog.components[importedName];
    ozTarget = importedName;
    canonicalFamily = importedName;
    effort = 'low';
    notes = 'Direct name match in OZ catalog';
    category = ozComp.category;
    capabilities = ozComp.capabilities;
  }

  for (const [libKey, library] of Object.entries(sourceLibraries)) {
    const isFromLibrary = library.importPatterns.some((pattern) => imp.source.includes(pattern));
    if (!isFromLibrary) continue;

    sourceLibrary = libKey;
    const mapping = resolveLibraryMapping(library, importedName, imp.source, binding.kind);
    if (mapping) {
      reportName = resolveMatchName(importedName, mapping, library, binding.kind, imp.source);
      canonicalFamily = mapping.source;
      ozTarget = mapping.source;
      effort = mapping.effort;
      notes = mapping.notes;
      detectorKind = binding.kind === 'namespace' ? 'namespace-mapping' : 'library-mapping';
    }
    break;
  }

  if (ozTarget) {
    const ozComp = catalog.components[ozTarget];
    if (ozComp) {
      category = ozComp.category;
      capabilities = ozComp.capabilities;
    }
  }

  return {
    rawName: importedName,
    reportName,
    canonicalFamily,
    sourceLibrary,
    sourceImport: imp.source,
    ozTarget,
    effort,
    category,
    capabilities,
    usageCount,
    file: file.relativePath,
    notes,
    detectorKind,
    confidence: determineObservationConfidence(detectorKind, ozTarget),
    evidences: createImportEvidences(file, binding, imp.source, usageCount),
  };
}

function mergeObservationIntoMatch(match: ComponentMatch, observation: ComponentObservation): void {
  match.usageCount += observation.usageCount;
  if (!match.files.includes(observation.file)) {
    match.files.push(observation.file);
  }
  if (!match.rawNames.includes(observation.rawName)) {
    match.rawNames.push(observation.rawName);
  }
  if (!match.detectorKinds.includes(observation.detectorKind)) {
    match.detectorKinds.push(observation.detectorKind);
  }
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

    const existingWithSameName = findExistingMatchByName(matchMap, observation.reportName);
    if (existingWithSameName) {
      mergeObservationIntoMatch(existingWithSameName, observation);

      if (!existingWithSameName.ozTarget && observation.ozTarget) {
        applyResolvedMatch(
          existingWithSameName,
          observation.sourceLibrary,
          observation.sourceImport,
          observation.canonicalFamily,
          observation.ozTarget,
          observation.effort,
          observation.category,
          observation.capabilities,
          observation.notes,
          observation.confidence
        );
      }
      continue;
    }

    matchMap.set(matchKey, createMatchFromObservation(observation));
  }

  return [...matchMap.values()].sort((a, b) => b.usageCount - a.usageCount);
}

/** @description Collects raw component observations before deduping them into report rows. */
export function collectComponentObservations(
  files: ScannedFile[],
  catalog: ComponentCatalog,
  sourceLibraries: Record<string, SourceLibrary>
): ComponentObservation[] {
  const observations: ComponentObservation[] = [];

  for (const file of files) {
    const facts = parseFileFacts(file);

    for (const imp of facts.imports) {
      // Skip OZ imports (already migrated)
      if (imp.source.startsWith('@openzeppelin/')) continue;
      if (isExcludedLibrary(imp.source) || isExcludedPattern(imp.source)) continue;

      for (const binding of imp.bindings) {
        const observation = collectImportObservation(
          file,
          facts,
          catalog,
          sourceLibraries,
          imp,
          binding
        );
        if (observation) observations.push(observation);
      }
    }
  }

  return observations.sort((a, b) => {
    if (a.reportName === b.reportName) {
      return a.file.localeCompare(b.file);
    }

    return a.reportName.localeCompare(b.reportName);
  });
}

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

/** @description Aggregates import-based observations into the existing component report format. */
export function analyzeComponents(
  files: ScannedFile[],
  catalog: ComponentCatalog,
  sourceLibraries: Record<string, SourceLibrary>
): ComponentMatch[] {
  return aggregateComponentObservations(
    collectComponentObservations(files, catalog, sourceLibraries)
  );
}

/** @description Collects native HTML element observations before aggregating them. */
export function collectHtmlElementObservations(
  files: ScannedFile[],
  htmlLib: HtmlElementLibrary
): ComponentObservation[] {
  const observations: ComponentObservation[] = [];
  for (const file of files) {
    const facts = parseFileFacts(file);
    const fileHasOzKitImport = facts.hasOzUiComponentsImport;

    for (const tagName of HTML_TAGS) {
      if (fileHasOzKitImport && tagName !== 'button') continue;

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

    if (!fileHasOzKitImport) {
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
  }

  return observations.sort((a, b) => {
    if (a.reportName === b.reportName) {
      return a.file.localeCompare(b.file);
    }

    return a.reportName.localeCompare(b.reportName);
  });
}

export function analyzeHtmlElements(
  files: ScannedFile[],
  htmlLib: HtmlElementLibrary
): ComponentMatch[] {
  return aggregateComponentObservations(collectHtmlElementObservations(files, htmlLib));
}
