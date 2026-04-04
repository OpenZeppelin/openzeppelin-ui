import ts from 'typescript';

import type {
  ComponentCatalog,
  HtmlElementLibrary,
  SourceLibrary,
  SourceLibraryMapping,
} from '../catalog';
import { isExcludedLibrary, isExcludedPattern } from '../catalog/exclusions';
import type { ScannedFile } from './scanner';

export interface ComponentMatch {
  name: string;
  sourceLibrary: string | null;
  sourceImport: string;
  ozTarget: string | null;
  effort: 'low' | 'medium' | 'high' | 'unknown';
  category: 'ui' | 'field' | 'unknown';
  capabilities: string[];
  usageCount: number;
  files: string[];
  notes: string;
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

function toPascalCase(input: string): string {
  return input
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join('');
}

function isLocalModuleImport(source: string): boolean {
  return (
    source.startsWith('.') ||
    source.startsWith('/') ||
    source.startsWith('@/') ||
    source.startsWith('~/')
  );
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
  kind: ImportBinding['kind']
): string {
  if (!mapping) return importedName;

  if (kind === 'namespace' && library?.namespaceReportName === 'target') {
    return mapping.source;
  }

  return mapping.reportName === 'target' ? mapping.source : importedName;
}

/**
 *
 */
export function analyzeComponents(
  files: ScannedFile[],
  catalog: ComponentCatalog,
  sourceLibraries: Record<string, SourceLibrary>
): ComponentMatch[] {
  const matchMap = new Map<string, ComponentMatch>();

  for (const file of files) {
    const facts = parseFileFacts(file);

    for (const imp of facts.imports) {
      // Skip OZ imports (already migrated)
      if (imp.source.startsWith('@openzeppelin/')) continue;
      if (isExcludedLibrary(imp.source) || isExcludedPattern(imp.source)) continue;

      for (const binding of imp.bindings) {
        const importedName = binding.importedName;
        const usageCount =
          binding.kind === 'namespace'
            ? (facts.namespaceUsages.get(binding.localName) ?? 0)
            : (facts.componentUsages.get(binding.localName) ?? 0);
        if (usageCount === 0) continue;

        if (
          importedName.endsWith('Primitive') &&
          imp.source.startsWith('@radix-ui/') &&
          file.relativePath.split(/[/\\]/).includes('packages')
        ) {
          continue;
        }

        let ozTarget: string | null = null;
        let effort: ComponentMatch['effort'] = 'unknown';
        let category: ComponentMatch['category'] = 'unknown';
        let capabilities: string[] = [];
        let notes = '';
        let sourceLibrary: string | null = null;
        let matchName = importedName;

        // Check against OZ catalog (skip for local modules — local modules are not published OZ packages)
        if (!isLocalModuleImport(imp.source) && catalog.components[importedName]) {
          const ozComp = catalog.components[importedName];
          ozTarget = importedName;
          effort = 'low';
          notes = 'Direct name match in OZ catalog';
          category = ozComp.category;
          capabilities = ozComp.capabilities;
        }

        // Check source library mappings
        for (const [libKey, library] of Object.entries(sourceLibraries)) {
          const isFromLibrary = library.importPatterns.some((p) => imp.source.includes(p));
          if (!isFromLibrary) continue;

          sourceLibrary = libKey;
          const mapping = resolveLibraryMapping(library, importedName, imp.source, binding.kind);
          if (mapping) {
            matchName = resolveMatchName(importedName, mapping, library, binding.kind);
            ozTarget = mapping.source;
            effort = mapping.effort;
            notes = mapping.notes;
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

        const matchKey = `${sourceLibrary ?? imp.source}:${matchName}`;
        const existing = matchMap.get(matchKey);

        if (existing) {
          existing.usageCount += usageCount;
          if (!existing.files.includes(file.relativePath)) {
            existing.files.push(file.relativePath);
          }
          continue;
        }

        matchMap.set(matchKey, {
          name: matchName,
          sourceLibrary,
          sourceImport: imp.source,
          ozTarget,
          effort,
          category,
          capabilities,
          usageCount,
          files: [file.relativePath],
          notes,
        });
      }
    }
  }

  return [...matchMap.values()].sort((a, b) => b.usageCount - a.usageCount);
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

export function analyzeHtmlElements(
  files: ScannedFile[],
  htmlLib: HtmlElementLibrary
): ComponentMatch[] {
  const matchMap = new Map<string, ComponentMatch>();

  function getOrCreate(ozTarget: string): ComponentMatch {
    let match = matchMap.get(ozTarget);
    if (!match) {
      const mapping = htmlLib.mappings[ozTarget];
      match = {
        name: ozTarget,
        sourceLibrary: 'html-elements',
        sourceImport: '',
        ozTarget,
        effort: mapping?.effort ?? 'unknown',
        category: 'unknown',
        capabilities: [],
        usageCount: 0,
        files: [],
        notes: mapping?.notes ?? '',
      };
      matchMap.set(ozTarget, match);
    }
    return match;
  }

  for (const file of files) {
    const facts = parseFileFacts(file);
    const fileHasOzKitImport = facts.hasOzUiComponentsImport;

    for (const tagName of HTML_TAGS) {
      if (fileHasOzKitImport && tagName !== 'button') continue;

      const ozTarget = Object.entries(htmlLib.mappings).find(([, m]) => m.source === tagName)?.[0];
      if (!ozTarget) continue;

      const usageCount = facts.htmlTagUsages.get(tagName) ?? 0;
      if (usageCount === 0) continue;

      const entry = getOrCreate(ozTarget);
      entry.usageCount += usageCount;
      if (!entry.files.includes(file.relativePath)) {
        entry.files.push(file.relativePath);
      }
    }

    if (!fileHasOzKitImport) {
      for (const [inputType, usageCount] of facts.inputTypeUsages.entries()) {
        const ozTarget = resolveInputOzTarget(inputType);
        if (!ozTarget) continue;

        const entry = getOrCreate(ozTarget);
        entry.usageCount += usageCount;
        if (!entry.files.includes(file.relativePath)) {
          entry.files.push(file.relativePath);
        }
      }
    }
  }

  return [...matchMap.values()].sort((a, b) => b.usageCount - a.usageCount);
}
