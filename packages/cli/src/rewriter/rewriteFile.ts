/**
 * Deterministic code rewriter for the migrate-to-oz-uikit system.
 *
 * Handles the 80% case: import swaps, JSX tag renames, prop renames, and the
 * radix namespace-member transforms. Complex scenarios (layout restructuring,
 * logic migration) are deferred to AI-assisted editing via the orchestration
 * skill.
 *
 * Rewrites are AST-based (TypeScript compiler API): the source is tokenized and
 * edited via offset splices instead of regex/brace-counting. This avoids the
 * corruption the earlier string-based implementation produced on JSX containing
 * parentheses, aliased/multiline imports, nested compound tags, and members
 * whose names are prefixes of one another.
 */

import ts from 'typescript';

import { loadSourceLibraries } from '../catalog/index.js';
import type { MigrationTask } from '../manifest/schema.js';

export interface RewriteContext {
  propMappings?: Record<string, string>;
  variantMap?: Record<string, string>;
  targetPackage?: string;
  targetImportPath?: string;
}

const OZ_NS_UNWRAP = '__OZ_NS_UNWRAP__';
const OZ_NS_OMIT = '__OZ_NS_OMIT__';
const OZ_NS_CLOSE_AS_CHILD = '__OZ_NS_CLOSE_AS_CHILD__';
const DEFAULT_TARGET_PACKAGE = '@openzeppelin/ui-components';

interface TextEdit {
  start: number;
  end: number;
  replacement: string;
}

// ---------------------------------------------------------------------------
// Catalog lookups (unchanged data contract with the planner)
// ---------------------------------------------------------------------------

/** True when the catalog maps this export to a different compound family root (e.g. TabsContent → Tabs); JSX tags keep the export name after migration. */
function isCompoundFamilyExport(componentName: string): boolean {
  for (const lib of Object.values(loadSourceLibraries())) {
    const root = (lib.mappings[componentName] as { source?: string } | undefined)?.source;
    if (root && root !== componentName) return true;
  }
  return false;
}

/** Catalog `source` root for a component (e.g. CardHeader → Card). Used to group compound imports. */
function catalogSourceRootForComponent(componentName: string): string | null {
  for (const lib of Object.values(loadSourceLibraries())) {
    const entry = lib.mappings[componentName] as { source?: string } | undefined;
    if (entry?.source) return entry.source;
  }
  return null;
}

function importSpecifiersBelongToSourceFamily(
  importPath: string,
  bases: string[],
  sourceComponent: string
): boolean {
  if (!bases.includes(sourceComponent)) return false;
  const familyRoot = catalogSourceRootForComponent(sourceComponent);
  if (!familyRoot) return false;
  for (const lib of Object.values(loadSourceLibraries())) {
    if (!lib.importPatterns.some((p) => importPath.includes(p))) continue;
    const allOk = bases.every(
      (base) => (lib.mappings[base] as { source?: string } | undefined)?.source === familyRoot
    );
    if (allOk) return true;
  }
  return false;
}

function findNamespaceMemberToTarget(
  sourceComponent: string,
  importPath: string
): Record<string, string> | null {
  for (const lib of Object.values(loadSourceLibraries())) {
    if (!lib.importPatterns.some((p) => importPath.includes(p))) continue;
    const map = (
      lib.mappings[sourceComponent] as
        | { namespaceMemberToTarget?: Record<string, string> }
        | undefined
    )?.namespaceMemberToTarget;
    if (map && Object.keys(map).length > 0) return map;
  }
  return null;
}

function collectOzComponentNames(memberMap: Record<string, string>): string[] {
  return Object.values(memberMap).filter((v) => !v.startsWith('__OZ_NS_'));
}

function collectCatalogImportPathSubstrings(): string[] {
  return Object.values(loadSourceLibraries()).flatMap((lib) => lib.importPatterns);
}

// ---------------------------------------------------------------------------
// AST utilities
// ---------------------------------------------------------------------------

function parseTsx(source: string): ts.SourceFile {
  return ts.createSourceFile(
    'rewrite.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
}

function visit(node: ts.Node, cb: (node: ts.Node) => void): void {
  cb(node);
  ts.forEachChild(node, (child) => visit(child, cb));
}

/** Applies non-overlapping edits right-to-left so earlier offsets stay valid. */
function applyEdits(source: string, edits: TextEdit[]): string {
  const ordered = [...edits].sort((a, b) => b.start - a.start);
  let result = source;
  for (const edit of ordered) {
    result = result.slice(0, edit.start) + edit.replacement + result.slice(edit.end);
  }
  return result;
}

function collapseBlankLines(source: string): string {
  return source.replace(/^\s*\n{2,}/gm, '\n');
}

function lineStartOffset(source: string, pos: number): number {
  let start = pos;
  while (start > 0 && source[start - 1] !== '\n') start--;
  return start;
}

/** Removes a node, taking the whole physical line with it when the node is the only non-whitespace on that line. */
function removeNodeEdit(source: string, start: number, end: number): TextEdit {
  const lineStart = lineStartOffset(source, start);
  const beforeBlank = source.slice(lineStart, start).trim() === '';
  let lineEnd = end;
  while (lineEnd < source.length && source[lineEnd] !== '\n') lineEnd++;
  const afterBlank = source.slice(end, lineEnd).trim() === '';
  if (beforeBlank && afterBlank) {
    const consumeNewline = lineEnd < source.length ? lineEnd + 1 : lineEnd;
    return { start: lineStart, end: consumeNewline, replacement: '' };
  }
  return { start, end, replacement: '' };
}

function lastImportEnd(sourceFile: ts.SourceFile): number {
  let end = -1;
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) end = statement.getEnd();
  }
  return end;
}

function importModulePath(node: ts.ImportDeclaration): string | null {
  return ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : null;
}

/** Imported (non-aliased) base name of a specifier: `Foo as Bar` → `Foo`. */
function specifierBase(element: ts.ImportSpecifier): string {
  return (element.propertyName ?? element.name).text;
}

/** `Source.Member` tag → member name, or null when the tag is not a namespace member of `source`. */
function namespaceMemberName(tagName: ts.JsxTagNameExpression, source: string): string | null {
  if (
    ts.isPropertyAccessExpression(tagName) &&
    ts.isIdentifier(tagName.expression) &&
    tagName.expression.text === source &&
    ts.isIdentifier(tagName.name)
  ) {
    return tagName.name.text;
  }
  return null;
}

// ---------------------------------------------------------------------------
// OZ named-import construction / merge
// ---------------------------------------------------------------------------

function formatOzNamedImportStatement(
  targetPackage: string,
  namesSorted: string[],
  multiline: boolean
): string {
  if (!multiline) {
    return `import { ${namesSorted.join(', ')} } from '${targetPackage}';`;
  }
  const body = namesSorted.map((n) => `  ${n},`).join('\n');
  return `import {\n${body}\n} from '${targetPackage}';`;
}

function firstLegacyCatalogImport(sourceFile: ts.SourceFile): ts.ImportDeclaration | null {
  const patterns = collectCatalogImportPathSubstrings();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const modPath = importModulePath(statement);
    if (
      modPath &&
      !modPath.includes('@openzeppelin') &&
      patterns.some((p) => modPath.includes(p))
    ) {
      return statement;
    }
  }
  return null;
}

function mergeOzNamedImports(
  content: string,
  targetPackage: string,
  names: string[],
  preferMultiline: boolean
): string {
  const unique = [...new Set(names)].sort((a, b) => a.localeCompare(b));
  if (unique.length === 0) return content;

  const sourceFile = parseTsx(content);

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (importModulePath(statement) !== targetPackage) continue;
    const named = statement.importClause?.namedBindings;
    if (!named || !ts.isNamedImports(named)) continue;

    const existing = named.elements.map((el) => el.getText(sourceFile));
    const merged = [...new Set([...existing, ...unique])].sort((a, b) => a.localeCompare(b));
    const multiline = preferMultiline && merged.length >= 5;
    return applyEdits(content, [
      {
        start: statement.getStart(sourceFile),
        end: statement.getEnd(),
        replacement: formatOzNamedImportStatement(targetPackage, merged, multiline),
      },
    ]);
  }

  const multiline = preferMultiline && unique.length >= 5;
  const newLine = `${formatOzNamedImportStatement(targetPackage, unique, multiline)}\n`;

  const legacy = firstLegacyCatalogImport(sourceFile);
  if (legacy) {
    const insertAt = lineStartOffset(content, legacy.getStart(sourceFile));
    return content.slice(0, insertAt) + newLine + content.slice(insertAt);
  }

  const lastEnd = lastImportEnd(sourceFile);
  if (lastEnd >= 0) {
    const insertAt = content[lastEnd] === '\n' ? lastEnd + 1 : lastEnd;
    return content.slice(0, insertAt) + newLine + content.slice(insertAt);
  }

  return newLine + content;
}

// ---------------------------------------------------------------------------
// Named-import migration (+ JSX tag rename)
// ---------------------------------------------------------------------------

interface NamedImportRewrite {
  content: string;
  found: boolean;
}

/**
 * Swaps legacy named imports of `source` to the OZ package. Whole import groups
 * that belong to one compound family are collapsed into the OZ import; mixed
 * imports keep their unrelated specifiers. Returns `found: false` (a no-op) when
 * no legacy import references the source — so an absent component is never given
 * a spurious OZ import.
 */
function rewriteNamedImports(
  content: string,
  source: string,
  target: string,
  targetPackage: string
): NamedImportRewrite {
  const sourceFile = parseTsx(content);
  const edits: TextEdit[] = [];
  const ozSymbols = new Set<string>();
  let found = false;

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const importPath = importModulePath(statement);
    if (!importPath || importPath.includes('@openzeppelin/')) continue;
    const named = statement.importClause?.namedBindings;
    if (!named || !ts.isNamedImports(named)) continue;

    const bases = named.elements.map(specifierBase);
    if (!bases.includes(source)) continue;
    found = true;

    if (importSpecifiersBelongToSourceFamily(importPath, bases, source)) {
      edits.push(removeNodeEdit(content, statement.getStart(sourceFile), statement.getEnd()));
      for (const base of bases) ozSymbols.add(base);
      continue;
    }

    const remaining = named.elements.filter((el) => specifierBase(el) !== source);
    if (remaining.length === 0) {
      edits.push(removeNodeEdit(content, statement.getStart(sourceFile), statement.getEnd()));
    } else {
      edits.push({
        start: named.getStart(sourceFile),
        end: named.getEnd(),
        replacement: `{ ${remaining.map((el) => el.getText(sourceFile)).join(', ')} }`,
      });
    }
    ozSymbols.add(target);
  }

  if (!found) return { content, found: false };

  ozSymbols.add(target);
  let updated = applyEdits(content, edits);
  updated = mergeOzNamedImports(
    updated,
    targetPackage,
    [...ozSymbols],
    isCompoundFamilyExport(source)
  );
  return { content: collapseBlankLines(updated), found: true };
}

function rewriteJsxTags(content: string, source: string, target: string): string {
  if (source === target) return content;
  const sourceFile = parseTsx(content);
  const edits: TextEdit[] = [];

  visit(sourceFile, (node) => {
    let tagName: ts.JsxTagNameExpression | null = null;
    if (ts.isJsxOpeningElement(node) || ts.isJsxClosingElement(node)) tagName = node.tagName;
    else if (ts.isJsxSelfClosingElement(node)) tagName = node.tagName;
    if (tagName && ts.isIdentifier(tagName) && tagName.text === source) {
      edits.push({
        start: tagName.getStart(sourceFile),
        end: tagName.getEnd(),
        replacement: target,
      });
    }
  });

  return applyEdits(content, edits);
}

function applyPropMappings(
  content: string,
  targetComponent: string,
  propMappings: Record<string, string>
): string {
  const sourceFile = parseTsx(content);
  const edits: TextEdit[] = [];

  visit(sourceFile, (node) => {
    const tagName = ts.isJsxOpeningElement(node)
      ? node.tagName
      : ts.isJsxSelfClosingElement(node)
        ? node.tagName
        : null;
    const attributes = ts.isJsxOpeningElement(node)
      ? node.attributes
      : ts.isJsxSelfClosingElement(node)
        ? node.attributes
        : null;
    if (!tagName || !attributes) return;
    if (!ts.isIdentifier(tagName) || tagName.text !== targetComponent) return;

    for (const attr of attributes.properties) {
      if (!ts.isJsxAttribute(attr) || !ts.isIdentifier(attr.name)) continue;
      const mapped = propMappings[attr.name.text];
      if (mapped && mapped !== attr.name.text) {
        edits.push({
          start: attr.name.getStart(sourceFile),
          end: attr.name.getEnd(),
          replacement: mapped,
        });
      }
    }
  });

  return applyEdits(content, edits);
}

// ---------------------------------------------------------------------------
// Namespace-import migration (radix `import * as X`)
// ---------------------------------------------------------------------------

function extractUseStateSetter(content: string): string {
  return content.match(/\[\s*\w+\s*,\s*(\w+)\s*\]\s*=\s*useState\s*\(/)?.[1] ?? 'setOpen';
}

function firstJsxChildElement(
  node: ts.JsxElement
): ts.JsxElement | ts.JsxSelfClosingElement | null {
  for (const child of node.children) {
    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) return child;
  }
  return null;
}

function hasOnClickAttribute(element: ts.JsxElement | ts.JsxSelfClosingElement): boolean {
  const attributes = ts.isJsxElement(element)
    ? element.openingElement.attributes
    : element.attributes;
  return attributes.properties.some(
    (attr) => ts.isJsxAttribute(attr) && ts.isIdentifier(attr.name) && attr.name.text === 'onClick'
  );
}

/** Converts `<Source.Close asChild>{child}</Source.Close>` into the child with an onClick that closes the dialog. */
function passCloseAsChild(content: string, source: string, members: Set<string>): string {
  if (members.size === 0) return content;
  const sourceFile = parseTsx(content);
  const setter = extractUseStateSetter(content);
  const edits: TextEdit[] = [];

  visit(sourceFile, (node) => {
    if (!ts.isJsxElement(node)) return;
    const member = namespaceMemberName(node.openingElement.tagName, source);
    if (!member || !members.has(member)) return;

    const innerStart = node.openingElement.getEnd();
    const innerEnd = node.closingElement.getStart(sourceFile);
    let inner = content.slice(innerStart, innerEnd);

    const child = firstJsxChildElement(node);
    if (child && !hasOnClickAttribute(child)) {
      const attributes = ts.isJsxElement(child)
        ? child.openingElement.attributes
        : child.attributes;
      const insertPos = attributes.getEnd() - innerStart;
      inner =
        inner.slice(0, insertPos) + ` onClick={() => ${setter}(false)}` + inner.slice(insertPos);
    }

    edits.push({ start: node.getStart(sourceFile), end: node.getEnd(), replacement: inner.trim() });
  });

  return applyEdits(content, edits);
}

function passOmit(content: string, source: string, members: Set<string>): string {
  if (members.size === 0) return content;
  const sourceFile = parseTsx(content);
  const edits: TextEdit[] = [];

  visit(sourceFile, (node) => {
    const tagName = ts.isJsxSelfClosingElement(node)
      ? node.tagName
      : ts.isJsxElement(node)
        ? node.openingElement.tagName
        : null;
    if (!tagName) return;
    const member = namespaceMemberName(tagName, source);
    if (member && members.has(member)) {
      edits.push(removeNodeEdit(content, node.getStart(sourceFile), node.getEnd()));
    }
  });

  return collapseBlankLines(applyEdits(content, edits));
}

function passUnwrap(content: string, source: string, members: Set<string>): string {
  if (members.size === 0) return content;
  const sourceFile = parseTsx(content);
  const edits: TextEdit[] = [];

  visit(sourceFile, (node) => {
    if (!ts.isJsxElement(node)) return;
    const member = namespaceMemberName(node.openingElement.tagName, source);
    if (!member || !members.has(member)) return;
    const innerStart = node.openingElement.getEnd();
    const innerEnd = node.closingElement.getStart(sourceFile);
    edits.push({
      start: node.getStart(sourceFile),
      end: node.getEnd(),
      replacement: content.slice(innerStart, innerEnd).trim(),
    });
  });

  return applyEdits(content, edits);
}

function passRenameMembers(
  content: string,
  source: string,
  renames: Record<string, string>
): string {
  if (Object.keys(renames).length === 0) return content;
  const sourceFile = parseTsx(content);
  const edits: TextEdit[] = [];

  const rename = (tagName: ts.JsxTagNameExpression): void => {
    const member = namespaceMemberName(tagName, source);
    if (member && renames[member]) {
      edits.push({
        start: tagName.getStart(sourceFile),
        end: tagName.getEnd(),
        replacement: renames[member],
      });
    }
  };

  visit(sourceFile, (node) => {
    if (ts.isJsxElement(node)) {
      rename(node.openingElement.tagName);
      rename(node.closingElement.tagName);
    } else if (ts.isJsxSelfClosingElement(node)) {
      rename(node.tagName);
    }
  });

  return applyEdits(content, edits);
}

function removeNamespaceImport(content: string, source: string): string {
  const sourceFile = parseTsx(content);
  const edits: TextEdit[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const named = statement.importClause?.namedBindings;
    if (named && ts.isNamespaceImport(named) && named.name.text === source) {
      edits.push(removeNodeEdit(content, statement.getStart(sourceFile), statement.getEnd()));
    }
  }

  return collapseBlankLines(applyEdits(content, edits));
}

function membersForTarget(memberMap: Record<string, string>, sentinel: string): Set<string> {
  return new Set(
    Object.entries(memberMap)
      .filter(([, target]) => target === sentinel)
      .map(([member]) => member)
  );
}

function rewriteNamespaceImportBody(
  content: string,
  source: string,
  memberMap: Record<string, string>,
  targetPackage: string
): string {
  let result = passCloseAsChild(content, source, membersForTarget(memberMap, OZ_NS_CLOSE_AS_CHILD));
  result = passOmit(result, source, membersForTarget(memberMap, OZ_NS_OMIT));
  result = passUnwrap(result, source, membersForTarget(memberMap, OZ_NS_UNWRAP));

  const renames = Object.fromEntries(
    Object.entries(memberMap).filter(([, target]) => !target.startsWith('__OZ_NS_'))
  );
  result = passRenameMembers(result, source, renames);
  result = removeNamespaceImport(result, source);
  result = mergeOzNamedImports(result, targetPackage, collectOzComponentNames(memberMap), false);

  return collapseBlankLines(result);
}

function tryRewriteNamespaceImport(
  task: MigrationTask,
  content: string,
  targetPackage: string
): string | null {
  const source = task.sourceComponent;
  if (!source) return null;

  const sourceFile = parseTsx(content);
  let importPath: string | null = null;
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const named = statement.importClause?.namedBindings;
    if (named && ts.isNamespaceImport(named) && named.name.text === source) {
      importPath = importModulePath(statement);
      break;
    }
  }
  if (importPath === null) return null;

  const memberMap = findNamespaceMemberToTarget(source, importPath);
  if (!memberMap) return null;

  return rewriteNamespaceImportBody(content, source, memberMap, targetPackage);
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/** @description Rewrites file content for a migration task: imports, JSX tags, and optional prop mappings. */
export function rewriteFile(
  task: MigrationTask,
  content: string,
  context: RewriteContext = {}
): string {
  const source = task.sourceComponent;
  const target = task.targetComponent;
  if (!source || !target) return content;

  const targetPackage = context.targetPackage ?? DEFAULT_TARGET_PACKAGE;
  const hasPropMappings = Boolean(
    context.propMappings && Object.keys(context.propMappings).length > 0
  );

  const namespaceResult = tryRewriteNamespaceImport(task, content, targetPackage);
  if (namespaceResult !== null) {
    return hasPropMappings
      ? applyPropMappings(namespaceResult, target, context.propMappings!)
      : namespaceResult;
  }

  const { content: afterImports, found } = rewriteNamedImports(
    content,
    source,
    target,
    targetPackage
  );
  if (!found) return content;

  let result = afterImports;
  if (!isCompoundFamilyExport(source)) {
    result = rewriteJsxTags(result, source, target);
  }
  if (hasPropMappings) {
    result = applyPropMappings(result, target, context.propMappings!);
  }

  return result;
}
