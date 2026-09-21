import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { resolveCreateOptions } from '../../create/options';
import { resolveCreateAppSpec } from '../../create/recipes';
import { mainTsx } from '../../create/templates/main';
import { patchEntryFileForWallet } from './patch-entry';

const temporaryDirectories: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oz-ui-patch-entry-'));
  temporaryDirectories.push(dir);
  return dir;
}

function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

function writePlainEntryProject(projectRoot: string): void {
  writeFile(
    path.join(projectRoot, 'src', 'main.tsx'),
    [
      "import React from 'react';",
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
}

function writeCreateMinimalEntryProject(projectRoot: string): void {
  const options = resolveCreateOptions({
    projectName: 'smoke-app',
    targetDirectory: projectRoot,
    preset: 'minimal',
    wallet: 'none',
    skipInstall: true,
  });
  const spec = resolveCreateAppSpec(options);
  writeFile(path.join(projectRoot, 'src', 'main.tsx'), mainTsx(spec));
}

afterEach(() => {
  for (const dir of temporaryDirectories.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('patchEntryFileForWallet', () => {
  it('wraps a plain synchronous entry file in async bootstrap', () => {
    const projectRoot = createTempDir();
    writePlainEntryProject(projectRoot);

    const result = patchEntryFileForWallet(projectRoot);
    const main = readFile(path.join(projectRoot, 'src', 'main.tsx'));

    expect(result.patched).toBe(true);
    expect(result.changes.wrappedAsyncBootstrap).toBe(true);
    expect(main.match(/async function bootstrap\(\)/g)).toHaveLength(1);
    expect(main.match(/void bootstrap\(\);/g)).toHaveLength(1);
    expect(main).toContain('await initializeAppConfig();');
    expect(main).toContain('<OzProviders>');
  });

  it('injects initializeAppConfig into an existing bootstrap function', () => {
    const projectRoot = createTempDir();
    writeCreateMinimalEntryProject(projectRoot);

    const result = patchEntryFileForWallet(projectRoot);
    const main = readFile(path.join(projectRoot, 'src', 'main.tsx'));

    expect(result.patched).toBe(true);
    expect(result.changes.wrappedAsyncBootstrap).toBe(true);
    expect(main.match(/async function bootstrap\(\)/g)).toHaveLength(1);
    expect(main.match(/void bootstrap\(\);/g)).toHaveLength(1);
    expect(main.indexOf('await initializeAppConfig();')).toBeLessThan(main.indexOf('createRoot('));
    expect(main).toContain('<OzProviders>');
  });
});
