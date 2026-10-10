import ts from 'typescript';

/**
 * Shared AST-based import extraction for the analysis pipeline.
 *
 * `component-matcher` needs structured bindings (named/default/namespace) to map
 * components, while `pattern-scanner` needs every module reference (including
 * side-effect imports, `export … from`, and dynamic `import()`) with line/snippet
 * context. Both parse the same way here so there is a single, parser-backed
 * notion of "what does this file import" — no regex that false-positives on
 * `import` mentioned in comments or strings.
 */

export interface ImportBinding {
  importedName: string;
  localName: string;
  kind: 'named' | 'default' | 'namespace';
}

export interface ImportInfo {
  source: string;
  bindings: ImportBinding[];
}

/** A module specifier reference with source-location context, for evidence reporting. */
export interface ModuleImportRef {
  source: string;
  /** 1-based line where the reference begins. */
  line: number;
  /** Trimmed text of the physical line where the reference begins. */
  statement: string;
}

/**
 *
 */
export function getScriptKind(filePath: string): ts.ScriptKind {
  if (filePath.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (filePath.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (filePath.endsWith('.mts')) return ts.ScriptKind.TS;
  if (filePath.endsWith('.cts')) return ts.ScriptKind.TS;
  if (filePath.endsWith('.js')) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

/**
 *
 */
export function createAnalysisSourceFile(filePath: string, content: string): ts.SourceFile {
  return ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(filePath)
  );
}

/**
 * Structured bindings for every static `import` declaration that has an import
 * clause. Side-effect imports, `export … from`, and dynamic imports are omitted
 * (they bind no local names); use {@link extractModuleImportRefs} for those.
 */
export function extractImportBindings(sourceFile: ts.SourceFile): ImportInfo[] {
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

function lineTextAt(sourceFile: ts.SourceFile, pos: number): string {
  const { text } = sourceFile;
  const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
  const newlineIdx = text.indexOf('\n', pos);
  const lineEnd = newlineIdx === -1 ? text.length : newlineIdx;
  return text.slice(lineStart, lineEnd).trim();
}

/**
 * Every module specifier referenced by the file: static imports (including
 * side-effect `import './x'`), re-exports (`export … from`), and dynamic
 * `import('x')`. Deduplicated by source + line.
 */
export function extractModuleImportRefs(sourceFile: ts.SourceFile): ModuleImportRef[] {
  const refs: ModuleImportRef[] = [];
  const seen = new Set<string>();

  const push = (source: string, pos: number): void => {
    if (!source) return;
    const line = sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
    const key = `${source}\0${line}`;
    if (seen.has(key)) return;
    seen.add(key);
    refs.push({ source, line, statement: lineTextAt(sourceFile, pos) });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      push(node.moduleSpecifier.text, node.getStart(sourceFile));
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      push(node.moduleSpecifier.text, node.getStart(sourceFile));
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      push(node.arguments[0].text, node.getStart(sourceFile));
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return refs;
}
