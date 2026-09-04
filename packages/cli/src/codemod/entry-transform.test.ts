import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';

import {
  transformEntryFile,
  type EntryAsyncInit,
  type EntryWrapper,
  type TransformEntryOptions,
} from './entry-transform';

const temporaryDirectories: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oz-ui-entry-transform-'));
  temporaryDirectories.push(dir);
  return dir;
}

function writeEntry(projectRoot: string, content: string, file = 'src/main.tsx'): void {
  const filePath = path.join(projectRoot, file);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function readEntry(projectRoot: string, file = 'src/main.tsx'): string {
  return fs.readFileSync(path.join(projectRoot, file), 'utf8');
}

function assertValidTsx(code: string): void {
  const result = ts.transpileModule(code, {
    reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.Latest },
  });
  const syntaxErrors = (result.diagnostics ?? []).filter(
    (d) => d.category === ts.DiagnosticCategory.Error
  );
  expect(syntaxErrors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))).toEqual([]);
}

const OZ_WRAP: EntryWrapper = {
  importLine: "import { OzProviders } from './oz/OzProviders';",
  components: ['OzProviders'],
  skipIfPresent: ['OzProviders', 'RuntimeProvider'],
};

const OZ_INIT: EntryAsyncInit = {
  importLine: "import { initializeAppConfig } from './oz/config';",
  initStatement: 'await initializeAppConfig();',
  bootstrapName: 'bootstrap',
  skipIfPresent: ['initializeAppConfig', 'appConfigService'],
};

const WALLET_OPTIONS: TransformEntryOptions = { wrap: OZ_WRAP, asyncInit: OZ_INIT };

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

afterEach(() => {
  for (const dir of temporaryDirectories.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('transformEntryFile — render-site shapes', () => {
  it('wraps a plain top-level createRoot().render and creates one async bootstrap', () => {
    const dir = createTempDir();
    writeEntry(
      dir,
      [
        "import { createRoot } from 'react-dom/client';",
        "import App from './App';",
        '',
        "createRoot(document.getElementById('root')!).render(",
        '  <React.StrictMode>',
        '    <App />',
        '  </React.StrictMode>',
        ');',
        '',
      ].join('\n')
    );

    const result = transformEntryFile(dir, WALLET_OPTIONS);
    const out = readEntry(dir);

    expect(result.patched).toBe(true);
    expect(result.changes.createdBootstrap).toBe(true);
    expect(countOccurrences(out, 'async function bootstrap()')).toBe(1);
    expect(countOccurrences(out, 'void bootstrap();')).toBe(1);
    expect(out).toContain('await initializeAppConfig();');
    expect(out).toContain('<OzProviders>');
    expect(out.indexOf('await initializeAppConfig();')).toBeLessThan(out.indexOf('createRoot('));
    assertValidTsx(out);
  });

  it('injects into an existing async bootstrap without duplicating it', () => {
    const dir = createTempDir();
    writeEntry(
      dir,
      [
        "import { createRoot } from 'react-dom/client';",
        "import App from './App';",
        '',
        'async function bootstrap() {',
        "  createRoot(document.getElementById('root')!).render(<App />);",
        '}',
        '',
        'void bootstrap();',
        '',
      ].join('\n')
    );

    const result = transformEntryFile(dir, WALLET_OPTIONS);
    const out = readEntry(dir);

    expect(result.changes.injectedInit).toBe(true);
    expect(result.changes.createdBootstrap).toBe(false);
    expect(countOccurrences(out, 'async function bootstrap()')).toBe(1);
    expect(countOccurrences(out, 'void bootstrap();')).toBe(1);
    expect(out).toContain('<OzProviders>');
    assertValidTsx(out);
  });

  it('injects into a sync bootstrap and makes it async (no duplicate declaration)', () => {
    const dir = createTempDir();
    writeEntry(
      dir,
      [
        "import { createRoot } from 'react-dom/client';",
        "import App from './App';",
        '',
        'function bootstrap() {',
        "  createRoot(document.getElementById('root')!).render(<App />);",
        '}',
        '',
        'bootstrap();',
        '',
      ].join('\n')
    );

    const result = transformEntryFile(dir, WALLET_OPTIONS);
    const out = readEntry(dir);

    expect(result.changes.injectedInit).toBe(true);
    expect(result.changes.madeFunctionAsync).toBe(true);
    expect(countOccurrences(out, 'function bootstrap()')).toBe(1);
    expect(out).toContain('async function bootstrap()');
    expect(out).toContain('await initializeAppConfig();');
    assertValidTsx(out);
  });

  it('injects into an arrow bootstrap and makes it async', () => {
    const dir = createTempDir();
    writeEntry(
      dir,
      [
        "import { createRoot } from 'react-dom/client';",
        "import App from './App';",
        '',
        'const bootstrap = () => {',
        "  createRoot(document.getElementById('root')!).render(<App />);",
        '};',
        '',
        'bootstrap();',
        '',
      ].join('\n')
    );

    const result = transformEntryFile(dir, WALLET_OPTIONS);
    const out = readEntry(dir);

    expect(result.changes.injectedInit).toBe(true);
    expect(result.changes.madeFunctionAsync).toBe(true);
    expect(out).toContain('const bootstrap = async () =>');
    expect(out).toContain('await initializeAppConfig();');
    assertValidTsx(out);
  });

  it('wraps only the JSX argument of legacy ReactDOM.render, preserving the container', () => {
    const dir = createTempDir();
    writeEntry(
      dir,
      [
        "import ReactDOM from 'react-dom';",
        "import App from './App';",
        '',
        "ReactDOM.render(<App />, document.getElementById('root'));",
        '',
      ].join('\n')
    );

    const result = transformEntryFile(dir, WALLET_OPTIONS);
    const out = readEntry(dir);

    expect(result.patched).toBe(true);
    expect(out).toContain('<OzProviders>');
    // The container argument must remain a sibling of (outside) the wrapped JSX.
    expect(out).toContain("</OzProviders>, document.getElementById('root')");
    assertValidTsx(out);
  });

  it('does not corrupt a JSX string attribute containing a close paren', () => {
    const dir = createTempDir();
    writeEntry(
      dir,
      [
        "import { createRoot } from 'react-dom/client';",
        "import App from './App';",
        '',
        "createRoot(document.getElementById('root')!).render(",
        '  <App title="oops )" />',
        ');',
        '',
      ].join('\n')
    );

    const result = transformEntryFile(dir, WALLET_OPTIONS);
    const out = readEntry(dir);

    expect(result.patched).toBe(true);
    expect(out).toContain('title="oops )"');
    assertValidTsx(out);
  });

  it('handles createRoot stored in a variable then rendered separately', () => {
    const dir = createTempDir();
    writeEntry(
      dir,
      [
        "import { createRoot } from 'react-dom/client';",
        "import App from './App';",
        '',
        "const root = createRoot(document.getElementById('root')!);",
        'root.render(<App />);',
        '',
      ].join('\n')
    );

    const result = transformEntryFile(dir, WALLET_OPTIONS);
    const out = readEntry(dir);

    expect(result.patched).toBe(true);
    expect(out).toContain('<OzProviders>');
    expect(out).toContain('await initializeAppConfig();');
    assertValidTsx(out);
  });
});

describe('transformEntryFile — idempotency and guards', () => {
  it('is idempotent when re-run on already-wired output', () => {
    const dir = createTempDir();
    writeEntry(
      dir,
      [
        "import { createRoot } from 'react-dom/client';",
        "import App from './App';",
        '',
        "createRoot(document.getElementById('root')!).render(<App />);",
        '',
      ].join('\n')
    );

    transformEntryFile(dir, WALLET_OPTIONS);
    const first = readEntry(dir);
    const second = transformEntryFile(dir, WALLET_OPTIONS);

    expect(second.patched).toBe(false);
    expect(second.reason).toBe('already-wired');
    expect(readEntry(dir)).toBe(first);
  });

  it('returns no-entry-file when no candidate exists', () => {
    const dir = createTempDir();
    const result = transformEntryFile(dir, WALLET_OPTIONS);
    expect(result.reason).toBe('no-entry-file');
    expect(result.patched).toBe(false);
  });

  it('returns no-render-call when there is no render call', () => {
    const dir = createTempDir();
    writeEntry(dir, "console.log('no render here');\n");
    const result = transformEntryFile(dir, WALLET_OPTIONS);
    expect(result.reason).toBe('no-render-call');
    expect(result.patched).toBe(false);
  });

  it('bails on an expression-bodied arrow without writing (unsupported shape)', () => {
    const dir = createTempDir();
    const source = [
      "import { createRoot } from 'react-dom/client';",
      "import App from './App';",
      '',
      "const bootstrap = () => createRoot(document.getElementById('root')!).render(<App />);",
      '',
      'bootstrap();',
      '',
    ].join('\n');
    writeEntry(dir, source);

    const result = transformEntryFile(dir, WALLET_OPTIONS);

    expect(result.reason).toBe('unsupported-shape');
    expect(result.patched).toBe(false);
    expect(readEntry(dir)).toBe(source);
  });
});

describe('transformEntryFile — wrap-only (migrate providers)', () => {
  const PROVIDERS_WRAP: EntryWrapper = {
    importLine: "import { RuntimeProvider, WalletStateProvider } from './oz/runtime-providers';",
    components: ['RuntimeProvider', 'WalletStateProvider'],
    skipIfPresent: ['RuntimeProvider', 'OzProviders'],
  };

  it('wraps the render tree with nested providers and adds the import', () => {
    const dir = createTempDir();
    writeEntry(
      dir,
      [
        "import { createRoot } from 'react-dom/client';",
        "import App from './App';",
        '',
        "createRoot(document.getElementById('root')!).render(",
        '  <React.StrictMode>',
        '    <App />',
        '  </React.StrictMode>',
        ');',
        '',
      ].join('\n')
    );

    const result = transformEntryFile(dir, { wrap: PROVIDERS_WRAP });
    const out = readEntry(dir);

    expect(result.patched).toBe(true);
    expect(result.changes.wrappedRenderTree).toBe(true);
    expect(result.changes.createdBootstrap).toBe(false);
    expect(out).toContain('<RuntimeProvider>');
    expect(out).toContain('<WalletStateProvider>');
    expect(out).toContain(PROVIDERS_WRAP.importLine);
    expect(out).not.toContain('async function');
    assertValidTsx(out);
  });

  it('skips when a provider token is already present', () => {
    const dir = createTempDir();
    const source = [
      "import { RuntimeProvider, WalletStateProvider } from './oz/runtime-providers';",
      "import { createRoot } from 'react-dom/client';",
      '',
      "createRoot(document.getElementById('root')!).render(<App />);",
      '',
    ].join('\n');
    writeEntry(dir, source);

    const result = transformEntryFile(dir, { wrap: PROVIDERS_WRAP });

    expect(result.patched).toBe(false);
    expect(result.reason).toBe('already-wired');
    expect(readEntry(dir)).toBe(source);
  });
});
