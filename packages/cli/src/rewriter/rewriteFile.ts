/**
 * Deterministic code rewriter for the migrate-to-oz-uikit system.
 *
 * Handles the 80% case: import swaps and prop renames.
 * Complex scenarios (layout restructuring, logic migration) are deferred
 * to AI-assisted editing via the orchestration skill.
 */

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

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractUseStateSetter(content: string): string {
  const m = content.match(/\[\s*\w+\s*,\s*(\w+)\s*\]\s*=\s*useState\s*\(/);
  return m?.[1] ?? 'setOpen';
}

function specifierBaseName(spec: string): string {
  return spec.includes(' as ') ? spec.split(' as ')[0].trim() : spec.trim();
}

/** True when the catalog maps this export name to a different compound family root (e.g. TabsContent → Tabs). JSX tags keep the export name after migration. */
function isCompoundFamilyExport(componentName: string): boolean {
  const libraries = loadSourceLibraries();
  for (const lib of Object.values(libraries)) {
    const entry = lib.mappings[componentName] as { source?: string } | undefined;
    const root = entry?.source;
    if (root && root !== componentName) return true;
  }
  return false;
}

/** Catalog `source` root for a component (e.g. CardHeader → Card). Used to group compound imports. */
function catalogSourceRootForComponent(componentName: string): string | null {
  const libraries = loadSourceLibraries();
  for (const lib of Object.values(libraries)) {
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
  const libraries = loadSourceLibraries();
  for (const lib of Object.values(libraries)) {
    const pathMatch = lib.importPatterns.some((p) => importPath.includes(p));
    if (!pathMatch) continue;
    const allOk = bases.every((base) => {
      const entry = lib.mappings[base] as { source?: string } | undefined;
      return entry?.source === familyRoot;
    });
    if (allOk) return true;
  }
  return false;
}

function findNamespaceMemberToTarget(
  sourceComponent: string,
  importPath: string
): Record<string, string> | null {
  const libraries = loadSourceLibraries();
  for (const lib of Object.values(libraries)) {
    const matched = lib.importPatterns.some((p) => importPath.includes(p));
    if (!matched) continue;
    const entry = lib.mappings[sourceComponent] as
      | { namespaceMemberToTarget?: Record<string, string> }
      | undefined;
    const map = entry?.namespaceMemberToTarget;
    if (map && Object.keys(map).length > 0) return map;
  }
  return null;
}

function collectOzComponentNames(memberMap: Record<string, string>): string[] {
  const names: string[] = [];
  for (const v of Object.values(memberMap)) {
    if (v.startsWith('__OZ_NS_')) continue;
    names.push(v);
  }
  return names;
}

function collectCatalogImportPathSubstrings(): string[] {
  const substrings: string[] = [];
  for (const lib of Object.values(loadSourceLibraries())) {
    substrings.push(...lib.importPatterns);
  }
  return substrings;
}

/** Start index of the first import line whose module path matches a catalog legacy pattern (not OZ). */
function firstLegacyCatalogImportLineStart(content: string): number | null {
  const patterns = collectCatalogImportPathSubstrings();
  let idx = 0;
  for (const line of content.split('\n')) {
    const importIdx = line.search(/^\s*import\b/);
    if (importIdx >= 0) {
      const fromMatch = line.match(/from\s*['"]([^'"]+)['"]/);
      const modPath = fromMatch?.[1];
      if (
        modPath &&
        !modPath.includes('@openzeppelin') &&
        patterns.some((p) => modPath.includes(p))
      ) {
        return idx + importIdx;
      }
    }
    idx += line.length + 1;
  }
  return null;
}

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

function mergeOzNamedImports(
  content: string,
  targetPackage: string,
  names: string[],
  preferMultiline: boolean
): string {
  const unique = [...new Set(names)].sort((a, b) => a.localeCompare(b));
  if (unique.length === 0) return content;

  const multiline = preferMultiline && unique.length >= 5;

  const ozImportRegex = new RegExp(
    `import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${escapeRegex(targetPackage)}['"]`
  );
  const ozMatch = content.match(ozImportRegex);

  if (ozMatch) {
    const existing = ozMatch[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const merged = [...new Set([...existing, ...unique])].sort((a, b) => a.localeCompare(b));
    const stmt = formatOzNamedImportStatement(targetPackage, merged, multiline);
    return content.replace(ozMatch[0], stmt);
  }

  const newLine = `${formatOzNamedImportStatement(targetPackage, unique, multiline)}\n`;
  const beforeLegacy = firstLegacyCatalogImportLineStart(content);
  if (beforeLegacy !== null) {
    return content.slice(0, beforeLegacy) + newLine + content.slice(beforeLegacy);
  }

  const lastImportIdx = content.lastIndexOf('import ');
  if (lastImportIdx >= 0) {
    const lineEnd = content.indexOf('\n', lastImportIdx);
    const insertAt = lineEnd >= 0 ? lineEnd + 1 : content.length;
    return content.slice(0, insertAt) + newLine + content.slice(insertAt);
  }

  return newLine + content;
}

function rewriteNamespaceImportBody(
  content: string,
  source: string,
  memberMap: Record<string, string>,
  targetPackage: string
): string {
  let result = content;
  const setter = extractUseStateSetter(content);

  for (const [member, target] of Object.entries(memberMap)) {
    if (target !== OZ_NS_CLOSE_AS_CHILD) continue;
    const closeAsChildRe = new RegExp(
      `<${escapeRegex(source)}\\.${escapeRegex(member)}\\s+asChild>\\s*([\\s\\S]*?)\\s*</${escapeRegex(source)}\\.${escapeRegex(member)}>`,
      'g'
    );
    result = result.replace(closeAsChildRe, (_, inner: string) => {
      const trimmed = inner.trim();
      return trimmed.replace(
        /^[ \t]*<([A-Za-z][\w.]*)([^>]*?)(\/?>)/,
        (full, tag: string, attrs: string, self: string) => {
          if (attrs.includes('onClick')) return full;
          if (self === '/>') return `<${tag}${attrs} onClick={() => ${setter}(false)} />`;
          return `<${tag}${attrs} onClick={() => ${setter}(false)}>`;
        }
      );
    });
  }

  for (const [member, target] of Object.entries(memberMap)) {
    if (target !== OZ_NS_OMIT) continue;
    const omitRe = new RegExp(
      `\\s*<${escapeRegex(source)}\\.${escapeRegex(member)}[^>]*/>\\s*`,
      'g'
    );
    result = result.replace(omitRe, '\n');
  }

  for (const [member, target] of Object.entries(memberMap)) {
    if (target !== OZ_NS_UNWRAP) continue;
    const unwrapRe = new RegExp(
      `<${escapeRegex(source)}\\.${escapeRegex(member)}\\s*>\\s*([\\s\\S]*?)\\s*</${escapeRegex(source)}\\.${escapeRegex(member)}>`,
      'g'
    );
    result = result.replace(unwrapRe, '$1');
  }

  const renameMembers = Object.entries(memberMap)
    .filter(([, target]) => !target.startsWith('__OZ_NS_'))
    .sort((a, b) => b[0].length - a[0].length);

  for (const [member, target] of renameMembers) {
    const openRe = new RegExp(`<${escapeRegex(source)}\\.${escapeRegex(member)}(\\s|>)`, 'g');
    result = result.replace(openRe, `<${target}$1`);
    const closeReTag = new RegExp(`</${escapeRegex(source)}\\.${escapeRegex(member)}>`, 'g');
    result = result.replace(closeReTag, `</${target}>`);
  }

  const nsImportLine = new RegExp(
    `^import\\s+\\*\\s+as\\s+${escapeRegex(source)}\\s+from\\s+['"][^'"]+['"];?\\s*\\n?`,
    'm'
  );
  result = result.replace(nsImportLine, '');

  result = mergeOzNamedImports(result, targetPackage, collectOzComponentNames(memberMap), false);
  result = result.replace(/^\s*\n{2,}/gm, '\n');

  return result;
}

function tryRewriteNamespaceImport(
  task: MigrationTask,
  content: string,
  targetPackage: string
): string | null {
  const source = task.sourceComponent;
  if (!source) return null;

  const nsMatch = content.match(
    new RegExp(`import\\s+\\*\\s+as\\s+${escapeRegex(source)}\\s+from\\s+['"]([^'"]+)['"]`)
  );
  if (!nsMatch) return null;

  const importPath = nsMatch[1];
  const memberMap = findNamespaceMemberToTarget(source, importPath);
  if (!memberMap) return null;

  return rewriteNamespaceImportBody(content, source, memberMap, targetPackage);
}

function rewriteImports(
  content: string,
  sourceComponent: string,
  targetComponent: string,
  targetPackage: string
): string {
  let result = content;
  const preferMultilineOzImport = isCompoundFamilyExport(sourceComponent);

  const importRegex = new RegExp(
    `import\\s*\\{([^}]*\\b${escapeRegex(sourceComponent)}\\b[^}]*)\\}\\s*from\\s*['"]([^'"]+)['"]\\s*;?`,
    'g'
  );

  const matches = [...result.matchAll(importRegex)];
  const ozSymbols = new Set<string>([targetComponent]);

  for (const match of matches) {
    const fullImport = match[0];
    const importList = match[1];
    const importPath = match[2];

    if (fullImport.includes('@openzeppelin/')) continue;

    const specifiers = importList
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const bases = specifiers.map(specifierBaseName);

    if (importSpecifiersBelongToSourceFamily(importPath, bases, sourceComponent)) {
      result = result.replace(fullImport, '');
      for (const b of bases) ozSymbols.add(b);
      continue;
    }

    const remaining = specifiers.filter((s) => specifierBaseName(s) !== sourceComponent);

    if (remaining.length > 0) {
      const newImport = fullImport.replace(importList, ` ${remaining.join(', ')} `);
      result = result.replace(fullImport, newImport);
    } else {
      result = result.replace(fullImport, '');
    }
  }

  result = mergeOzNamedImports(result, targetPackage, [...ozSymbols], preferMultilineOzImport);
  result = result.replace(/^\s*\n{2,}/gm, '\n');

  return result;
}

function rewriteJsx(content: string, sourceComponent: string, targetComponent: string): string {
  if (sourceComponent === targetComponent) return content;

  const tagRegex = new RegExp(`(<\\/?)${escapeRegex(sourceComponent)}(\\s|>|\\/)`, 'g');

  return content.replace(tagRegex, `$1${targetComponent}$2`);
}

function applyPropMappings(
  content: string,
  targetComponent: string,
  propMappings: Record<string, string>
): string {
  let result = content;

  for (const [oldProp, newProp] of Object.entries(propMappings)) {
    const propRegex = new RegExp(
      `(<${escapeRegex(targetComponent)}[^>]*?)\\b${escapeRegex(oldProp)}(\\s*=)`,
      'g'
    );
    result = result.replace(propRegex, `$1${newProp}$2`);
  }

  return result;
}

/** @description Rewrites file content for a migration task: imports, JSX tags, and optional prop mappings. */
export function rewriteFile(
  task: MigrationTask,
  content: string,
  context: RewriteContext = {}
): string {
  const source = task.sourceComponent;
  const target = task.targetComponent;

  if (!source || !target) return content;

  const targetPackage = context.targetPackage ?? '@openzeppelin/ui-components';

  const namespaceResult = tryRewriteNamespaceImport(task, content, targetPackage);
  if (namespaceResult !== null) {
    let result = namespaceResult;
    if (context.propMappings && Object.keys(context.propMappings).length > 0) {
      result = applyPropMappings(result, target, context.propMappings);
    }
    return result;
  }

  let result = rewriteImports(content, source, target, targetPackage);
  if (!isCompoundFamilyExport(source)) {
    result = rewriteJsx(result, source, target);
  }

  if (context.propMappings && Object.keys(context.propMappings).length > 0) {
    result = applyPropMappings(result, target, context.propMappings);
  }

  return result;
}
