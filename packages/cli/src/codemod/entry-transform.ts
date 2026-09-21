import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

/**
 * AST-based transformer for React entry files (`src/main.tsx` and friends).
 *
 * Shared by `oz-ui add wallet` and `oz-ui migrate init` so there is a single,
 * parser-backed implementation of "wrap the render tree" and "initialize config
 * before render". Earlier revisions used regex/brace-counting string surgery,
 * which corrupted files containing parentheses inside JSX strings, legacy
 * `ReactDOM.render`, or pre-existing bootstrap functions. The parser handles all
 * of those because it tokenizes the source instead of guessing.
 */

export const ENTRY_FILE_CANDIDATES = [
  'src/main.tsx',
  'src/main.jsx',
  'src/index.tsx',
  'src/index.jsx',
] as const;

/** Nested JSX providers to wrap the render tree with (outermost first). */
export interface EntryWrapper {
  /** Import statement that brings the wrapper components into scope. */
  importLine: string;
  /** Component names, outermost to innermost (e.g. `['RuntimeProvider', 'WalletStateProvider']`). */
  components: string[];
  /** If any token already appears in the source, the wrap is treated as done. */
  skipIfPresent: string[];
}

/** Async initialization to run before the React render call. */
export interface EntryAsyncInit {
  /** Import statement that brings the init helper into scope. */
  importLine: string;
  /** Statement source to execute before render (may span multiple lines). */
  initStatement: string;
  /** Name used when a fresh async bootstrap wrapper must be created. */
  bootstrapName: string;
  /** If any token already appears in the source, the init is treated as done. */
  skipIfPresent: string[];
}

export interface TransformEntryOptions {
  wrap?: EntryWrapper;
  asyncInit?: EntryAsyncInit;
}

export interface EntryTransformChanges {
  addedWrapImport: boolean;
  wrappedRenderTree: boolean;
  addedInitImport: boolean;
  injectedInit: boolean;
  createdBootstrap: boolean;
  madeFunctionAsync: boolean;
}

export type EntryTransformReason =
  | 'patched'
  | 'already-wired'
  | 'no-entry-file'
  | 'no-render-call'
  | 'unsupported-shape';

export interface EntryTransformResult {
  entryFile: string | null;
  patched: boolean;
  changes: EntryTransformChanges;
  reason: EntryTransformReason;
}

interface TextEdit {
  start: number;
  end: number;
  replacement: string;
}

/**
 * Locates the project's React entry file and applies the requested wrap and/or
 * async-init transforms. Idempotent: each transform is skipped when its
 * `skipIfPresent` tokens already appear in the source.
 */
export function transformEntryFile(
  projectRoot: string,
  options: TransformEntryOptions
): EntryTransformResult {
  const entryFile = findEntryFile(projectRoot);
  if (!entryFile) {
    return { entryFile: null, patched: false, changes: blankChanges(), reason: 'no-entry-file' };
  }

  const filePath = path.join(projectRoot, entryFile);
  const original = fs.readFileSync(filePath, 'utf8');

  const result = applyTransforms(original, options);

  if (result.reason !== 'patched' || result.source === original) {
    return {
      entryFile,
      patched: false,
      changes: blankChanges(),
      reason: result.reason === 'patched' ? 'already-wired' : result.reason,
    };
  }

  fs.writeFileSync(filePath, result.source, 'utf8');
  return { entryFile, patched: true, changes: result.changes, reason: 'patched' };
}

interface ApplyResult {
  source: string;
  changes: EntryTransformChanges;
  reason: EntryTransformReason;
}

function applyTransforms(original: string, options: TransformEntryOptions): ApplyResult {
  const changes = blankChanges();

  const wantWrap = options.wrap && !hasAnyToken(original, options.wrap.skipIfPresent);
  const wantInit = options.asyncInit && !hasAnyToken(original, options.asyncInit.skipIfPresent);

  if (!wantWrap && !wantInit) {
    return { source: original, changes, reason: 'already-wired' };
  }

  const sourceFile = parseTsx(original);
  const renderCall = findRenderCall(sourceFile);
  if (!renderCall) {
    return { source: original, changes, reason: 'no-render-call' };
  }

  const renderArg = unwrapParens(renderCall.arguments[0]);
  const argStart = renderArg.getStart(sourceFile);
  const argEnd = renderArg.getEnd();
  const baseIndent = lineIndentAt(original, argStart);

  const wrapArg = (text: string, indent: string): string =>
    wantWrap && options.wrap ? buildWrappedJsx(options.wrap.components, text, indent) : text;

  // Decide how the async init (if any) attaches: inject into an enclosing
  // function, or create a fresh bootstrap wrapper around the render statement.
  const initPlan = wantInit && options.asyncInit ? planAsyncInit(sourceFile, renderCall) : null;
  if (wantInit && initPlan === null) {
    return { source: original, changes: blankChanges(), reason: 'unsupported-shape' };
  }

  const edits: TextEdit[] = [];
  const createsBootstrap = initPlan?.kind === 'create';

  // In the "create" path the whole render statement is replaced, so the wrap is
  // baked into that replacement instead of being a separate (overlapping) edit.
  if (wantWrap && options.wrap && !createsBootstrap) {
    edits.push({
      start: argStart,
      end: argEnd,
      replacement: wrapArg(original.slice(argStart, argEnd), baseIndent),
    });
    changes.wrappedRenderTree = true;
  }

  if (initPlan?.kind === 'inject') {
    const injection = `\n${indentBlock(options.asyncInit!.initStatement, initPlan.bodyIndent)}\n`;
    edits.push({ start: initPlan.bodyOpenPos, end: initPlan.bodyOpenPos, replacement: injection });
    changes.injectedInit = true;
    if (initPlan.makeAsyncPos !== null) {
      edits.push({
        start: initPlan.makeAsyncPos,
        end: initPlan.makeAsyncPos,
        replacement: 'async ',
      });
      changes.madeFunctionAsync = true;
    }
  } else if (initPlan?.kind === 'create') {
    const stmtText = original.slice(initPlan.stmtStart, initPlan.stmtEnd);
    const wrappedStmt = wantWrap
      ? replaceRange(
          stmtText,
          argStart - initPlan.stmtStart,
          argEnd - initPlan.stmtStart,
          wrapArg(original.slice(argStart, argEnd), initPlan.stmtIndent + '  ')
        )
      : stmtText;
    if (wantWrap) changes.wrappedRenderTree = true;
    edits.push({
      start: initPlan.stmtStart,
      end: initPlan.stmtEnd,
      replacement: buildBootstrap(options.asyncInit!, wrappedStmt, initPlan.stmtIndent),
    });
    changes.createdBootstrap = true;
  }

  let updated = applyEdits(original, edits);
  updated = insertImportsAfterApply(updated, options, wantWrap, wantInit, changes);

  return { source: updated, changes, reason: 'patched' };
}

type AsyncInitPlan =
  | {
      kind: 'inject';
      bodyOpenPos: number;
      bodyIndent: string;
      makeAsyncPos: number | null;
    }
  | {
      kind: 'create';
      stmtStart: number;
      stmtEnd: number;
      stmtIndent: string;
    };

/**
 * Plans how `asyncInit` attaches to the render call:
 * - inside a block-bodied function → inject at body top (make async if needed);
 * - at module top level → wrap the render statement in a fresh async bootstrap;
 * - inside an expression-bodied arrow → unsupported (returns null).
 */
function planAsyncInit(
  sourceFile: ts.SourceFile,
  renderCall: ts.CallExpression
): AsyncInitPlan | null {
  const source = sourceFile.text;
  const enclosing = findEnclosingFunction(renderCall);

  if (enclosing) {
    if (!enclosing.body || !ts.isBlock(enclosing.body)) return null;
    return {
      kind: 'inject',
      bodyOpenPos: enclosing.body.getStart(sourceFile) + 1,
      bodyIndent: blockBodyIndent(source, enclosing.body, sourceFile),
      makeAsyncPos: isAsyncFunction(enclosing) ? null : enclosing.getStart(sourceFile),
    };
  }

  const statement = findTopLevelStatement(renderCall, sourceFile);
  if (!statement) return null;

  const stmtStart = statement.getStart(sourceFile);
  return {
    kind: 'create',
    stmtStart,
    stmtEnd: statement.getEnd(),
    stmtIndent: lineIndentAt(source, stmtStart),
  };
}

function buildBootstrap(asyncInit: EntryAsyncInit, statementText: string, indent: string): string {
  const innerIndent = `${indent}  `;
  return (
    `async function ${asyncInit.bootstrapName}() {\n` +
    `${indentBlock(asyncInit.initStatement, innerIndent)}\n\n` +
    `${indentBlock(statementText, innerIndent)}\n` +
    `${indent}}\n\n` +
    `${indent}void ${asyncInit.bootstrapName}();`
  );
}

function replaceRange(text: string, start: number, end: number, replacement: string): string {
  return text.slice(0, start) + replacement + text.slice(end);
}

/**
 * Inserts the wrap and/or init import lines after the last existing import.
 * Done on the post-edit source so offsets from the AST pass stay valid; imports
 * always sit at the top, well clear of the render-site edits.
 */
function insertImportsAfterApply(
  source: string,
  options: TransformEntryOptions,
  wantWrap: boolean | undefined,
  wantInit: boolean | undefined,
  changes: EntryTransformChanges
): string {
  let updated = source;

  if (wantWrap && options.wrap && changes.wrappedRenderTree) {
    const before = updated;
    updated = insertImport(updated, options.wrap.importLine);
    changes.addedWrapImport = updated !== before;
  }

  if (wantInit && options.asyncInit && (changes.injectedInit || changes.createdBootstrap)) {
    const before = updated;
    updated = insertImport(updated, options.asyncInit.importLine);
    changes.addedInitImport = updated !== before;
  }

  return updated;
}

function blankChanges(): EntryTransformChanges {
  return {
    addedWrapImport: false,
    wrappedRenderTree: false,
    addedInitImport: false,
    injectedInit: false,
    createdBootstrap: false,
    madeFunctionAsync: false,
  };
}

function findEntryFile(projectRoot: string): string | null {
  for (const candidate of ENTRY_FILE_CANDIDATES) {
    if (fs.existsSync(path.join(projectRoot, candidate))) return candidate;
  }
  return null;
}

function parseTsx(source: string): ts.SourceFile {
  return ts.createSourceFile('entry.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function hasAnyToken(source: string, tokens: string[]): boolean {
  return tokens.some((token) => source.includes(token));
}

function isJsxLike(node: ts.Node): boolean {
  if (ts.isParenthesizedExpression(node)) return isJsxLike(node.expression);
  return ts.isJsxElement(node) || ts.isJsxFragment(node) || ts.isJsxSelfClosingElement(node);
}

function unwrapParens(node: ts.Expression): ts.Expression {
  let current = node;
  while (ts.isParenthesizedExpression(current)) current = current.expression;
  return current;
}

/**
 * First `*.render(<jsx>, ...)` call in source order. Matches
 * `createRoot(el).render(...)`, `root.render(...)`, and legacy
 * `ReactDOM.render(<App />, el)` — the JSX argument is wrapped without touching
 * any trailing container argument.
 */
function findRenderCall(sourceFile: ts.SourceFile): ts.CallExpression | null {
  let found: ts.CallExpression | null = null;

  const visit = (node: ts.Node): void => {
    if (found) return;
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'render' &&
      node.arguments.length > 0 &&
      isJsxLike(node.arguments[0])
    ) {
      found = node;
      return;
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return found;
}

function findEnclosingFunction(
  node: ts.Node
): ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction | null {
  let current: ts.Node | undefined = node.parent;
  while (current && !ts.isSourceFile(current)) {
    if (
      ts.isFunctionDeclaration(current) ||
      ts.isFunctionExpression(current) ||
      ts.isArrowFunction(current)
    ) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function findTopLevelStatement(node: ts.Node, sourceFile: ts.SourceFile): ts.Statement | null {
  let current: ts.Node = node;
  while (current.parent && current.parent !== sourceFile) {
    current = current.parent;
  }
  return current.parent === sourceFile && isStatement(current) ? (current as ts.Statement) : null;
}

function isStatement(node: ts.Node): boolean {
  return node.kind >= ts.SyntaxKind.FirstStatement && node.kind <= ts.SyntaxKind.LastStatement;
}

function isAsyncFunction(
  node: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction
): boolean {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword));
}

function insertImport(source: string, importLine: string): string {
  if (source.includes(importLine)) return source;

  const lastImportEnd = findLastImportEnd(source);
  if (lastImportEnd >= 0) {
    return `${source.slice(0, lastImportEnd)}\n${importLine}${source.slice(lastImportEnd)}`;
  }
  return `${importLine}\n${source}`;
}

function findLastImportEnd(source: string): number {
  const sourceFile = parseTsx(source);
  let lastEnd = -1;
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) lastEnd = statement.getEnd();
  }
  return lastEnd;
}

function applyEdits(source: string, edits: TextEdit[]): string {
  const ordered = [...edits].sort((a, b) => b.start - a.start);
  let result = source;
  for (const edit of ordered) {
    result = result.slice(0, edit.start) + edit.replacement + result.slice(edit.end);
  }
  return result;
}

function lineIndentAt(source: string, pos: number): string {
  let lineStart = pos;
  while (lineStart > 0 && source[lineStart - 1] !== '\n') lineStart--;
  const match = source.slice(lineStart, pos).match(/^\s*/);
  return match ? match[0] : '';
}

function blockBodyIndent(source: string, body: ts.Block, sourceFile: ts.SourceFile): string {
  const firstStatement = body.statements[0];
  if (firstStatement) return lineIndentAt(source, firstStatement.getStart(sourceFile));
  return `${lineIndentAt(source, body.getStart(sourceFile))}  `;
}

/**
 * Re-indents a (possibly multi-line) block to `indent`, preserving relative
 * nesting by stripping the block's common leading whitespace first.
 */
function indentBlock(text: string, indent: string): string {
  const lines = text.split('\n');
  if (lines.length === 1) return `${indent}${text.trim()}`;

  const commonIndent = lines
    .filter((line) => line.trim().length > 0)
    .reduce<number>((min, line) => {
      const leading = line.match(/^\s*/)?.[0].length ?? 0;
      return Math.min(min, leading);
    }, Number.POSITIVE_INFINITY);

  const strip = Number.isFinite(commonIndent) ? commonIndent : 0;
  return lines
    .map((line) => (line.trim().length === 0 ? '' : `${indent}${line.slice(strip)}`))
    .join('\n');
}

/**
 * Wraps `innerText` in nested provider components. The first line carries no
 * base indent because the cursor already sits at the (indented) argument
 * position; subsequent lines are indented relative to `baseIndent`.
 */
function buildWrappedJsx(components: string[], innerText: string, baseIndent: string): string {
  const openTags = components
    .map((name, depth) =>
      depth === 0 ? `<${name}>` : `${baseIndent}${'  '.repeat(depth)}<${name}>`
    )
    .join('\n');

  const closeTags = components
    .map((name, depth) => `${baseIndent}${'  '.repeat(depth)}</${name}>`)
    .reverse()
    .join('\n');

  const innerIndent = `${baseIndent}${'  '.repeat(components.length)}`;
  const inner = indentBlock(innerText, innerIndent);

  return `${openTags}\n${inner}\n${closeTags}`;
}
