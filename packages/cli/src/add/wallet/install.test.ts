import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Command } from 'commander';
import { afterEach, describe, expect, it } from 'vitest';

import { registerAddCommand } from '../../commands/add';
import { CLI_PACKAGE_NAME, JSON_SCHEMA_VERSION } from '../../commands/migrate/json-results';
import { addWalletToProject } from './install';

const temporaryDirectories: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oz-ui-add-wallet-'));
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

function readJson(filePath: string): Record<string, unknown> {
  return JSON.parse(readFile(filePath)) as Record<string, unknown>;
}

function writeFixtureProject(
  projectRoot: string,
  packageJson: Record<string, unknown> = {
    name: 'wallet-fixture',
    dependencies: { react: '^19.0.0' },
  }
): void {
  writeFile(path.join(projectRoot, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);
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

async function captureStdout(fn: () => Promise<void> | void): Promise<string> {
  const chunks: string[] = [];
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string | Uint8Array) => {
    chunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
    return true;
  }) as typeof process.stdout.write;

  try {
    await fn();
  } finally {
    process.stdout.write = originalWrite;
  }

  return chunks.join('');
}

async function runAdd(args: string[]): Promise<string> {
  const root = new Command();
  registerAddCommand(root);
  return captureStdout(async () => {
    await root.parseAsync(['add', ...args], { from: 'user' });
  });
}

afterEach(() => {
  process.exitCode = 0;
  for (const dir of temporaryDirectories.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('addWalletToProject', () => {
  it('adds custom wallet files, app config, and entry wiring', () => {
    const projectRoot = createTempDir();
    writeFixtureProject(projectRoot);

    const result = addWalletToProject({ projectRoot, skipInstall: true });

    expect(result.action).toBe('add-wallet');
    expect(result.ok).toBe(true);
    expect(result.kit).toBe('custom');
    expect(result.filesWritten).toEqual(
      expect.arrayContaining([
        'src/oz/config.ts',
        'src/oz/runtime.ts',
        'src/oz/OzProviders.tsx',
        'public/app.config.json',
      ])
    );
    expect(result.entryFilePatched).toBe('src/main.tsx');
    expect(result.installRan).toBe(false);
    expect(result.packagesToInstall).toEqual(
      expect.arrayContaining(['@openzeppelin/adapter-evm@^2.0.1', '@wagmi/core@^2.20.3'])
    );

    const main = readFile(path.join(projectRoot, 'src', 'main.tsx'));
    expect(main).toContain("import { initializeAppConfig } from './oz/config';");
    expect(main).toContain("import { OzProviders } from './oz/OzProviders';");
    expect(main).toContain('<OzProviders>');
    expect(main).toContain('await initializeAppConfig();');

    const config = readJson(path.join(projectRoot, 'public', 'app.config.json'));
    const globalServiceConfigs = config.globalServiceConfigs as Record<string, unknown>;
    const walletui = globalServiceConfigs.walletui as Record<string, Record<string, unknown>>;
    expect(walletui.evm.kitName).toBe('custom');
  });

  it('adds RainbowKit config and package planning when requested', () => {
    const projectRoot = createTempDir();
    writeFixtureProject(projectRoot);

    const result = addWalletToProject({
      projectRoot,
      kit: 'rainbowkit',
      skipInstall: true,
    });

    expect(result.filesWritten).toContain('src/oz/wallet/rainbowkit.config.ts');
    expect(result.packagesToInstall).toContain('@rainbow-me/rainbowkit@^2.2.8');
    expect(readFile(path.join(projectRoot, 'src', 'oz', 'runtime.ts'))).toContain(
      "uiKit: 'rainbowkit'"
    );
  });

  it('is idempotent on follow-up runs', () => {
    const projectRoot = createTempDir();
    writeFixtureProject(projectRoot);

    addWalletToProject({ projectRoot, skipInstall: true });
    const result = addWalletToProject({ projectRoot, skipInstall: true });

    expect(result.filesWritten).toEqual([]);
    expect(result.filesSkipped).toEqual(
      expect.arrayContaining([
        'src/oz/config.ts',
        'src/oz/runtime.ts',
        'src/oz/OzProviders.tsx',
        'public/app.config.json',
      ])
    );
    expect(result.entryFilePatched).toBeNull();
  });

  it('rewrites generated files with force', () => {
    const projectRoot = createTempDir();
    writeFixtureProject(projectRoot);

    addWalletToProject({ projectRoot, skipInstall: true });
    writeFile(path.join(projectRoot, 'src', 'oz', 'runtime.ts'), 'stale runtime\n');

    const result = addWalletToProject({ projectRoot, force: true, skipInstall: true });

    expect(result.filesWritten).toContain('src/oz/runtime.ts');
    expect(readFile(path.join(projectRoot, 'src', 'oz', 'runtime.ts'))).toContain('resolveRuntime');
  });

  it('reports a manual-wiring reason and steps when the entry file cannot be patched', () => {
    const projectRoot = createTempDir();
    writeFixtureProject(projectRoot);
    writeFile(path.join(projectRoot, 'src', 'main.tsx'), "console.log('no render here');\n");

    const result = addWalletToProject({ projectRoot, skipInstall: true });

    expect(result.entryFilePatched).toBeNull();
    expect(result.entryFilePatchReason).toBe('no-render-call');
    expect(result.nextSteps).toEqual(
      expect.arrayContaining([
        "Wrap your app's render tree with <OzProviders> (import { OzProviders } from './oz/OzProviders')",
        "Call await initializeAppConfig() before render (import { initializeAppConfig } from './oz/config')",
      ])
    );
  });

  it('reports a patched entry reason on a normal project', () => {
    const projectRoot = createTempDir();
    writeFixtureProject(projectRoot);

    const result = addWalletToProject({ projectRoot, skipInstall: true });

    expect(result.entryFilePatched).toBe('src/main.tsx');
    expect(result.entryFilePatchReason).toBe('patched');
    expect(result.nextSteps).not.toContain(
      "Wrap your app's render tree with <OzProviders> (import { OzProviders } from './oz/OzProviders')"
    );
  });

  it('tracks already-installed packages separately from missing packages', () => {
    const projectRoot = createTempDir();
    writeFixtureProject(projectRoot, {
      name: 'wallet-fixture',
      dependencies: {
        react: '^19.0.0',
        '@openzeppelin/adapter-evm': '^2.0.1',
        '@wagmi/core': '^2.20.3',
      },
    });

    const result = addWalletToProject({ projectRoot, skipInstall: true });

    expect(result.packagesAlreadyPresent).toEqual(
      expect.arrayContaining(['@openzeppelin/adapter-evm', '@wagmi/core'])
    );
    expect(result.packagesToInstall).not.toContain('@openzeppelin/adapter-evm@^2.0.1');
  });

  it('merges existing app.config.json without clobbering custom keys', () => {
    const projectRoot = createTempDir();
    writeFixtureProject(projectRoot);
    writeFile(
      path.join(projectRoot, 'public', 'app.config.json'),
      `${JSON.stringify(
        {
          featureFlags: { keepMe: true },
          globalServiceConfigs: {
            walletconnect: { projectId: 'existing-project-id' },
          },
          rpcEndpoints: { sepolia: 'https://example.invalid' },
        },
        null,
        2
      )}\n`
    );

    addWalletToProject({ projectRoot, kit: 'rainbowkit', skipInstall: true });

    const config = readJson(path.join(projectRoot, 'public', 'app.config.json'));
    const globalServiceConfigs = config.globalServiceConfigs as Record<string, unknown>;
    const walletconnect = globalServiceConfigs.walletconnect as Record<string, unknown>;
    const walletui = globalServiceConfigs.walletui as Record<string, Record<string, unknown>>;

    expect((config.featureFlags as Record<string, unknown>).keepMe).toBe(true);
    expect((config.rpcEndpoints as Record<string, unknown>).sepolia).toBe(
      'https://example.invalid'
    );
    expect(walletconnect.projectId).toBe('existing-project-id');
    expect(walletui.evm.kitName).toBe('rainbowkit');
  });
});

describe('add wallet command', () => {
  it('emits the stable JSON envelope', async () => {
    const projectRoot = createTempDir();
    writeFixtureProject(projectRoot);

    const stdout = await runAdd([
      'wallet',
      '--project',
      projectRoot,
      '--kit',
      'rainbowkit',
      '--skip-install',
      '--yes',
      '--json',
    ]);
    const payload = JSON.parse(stdout);

    expect(payload.action).toBe('add-wallet');
    expect(payload.ok).toBe(true);
    expect(payload.schemaVersion).toBe(JSON_SCHEMA_VERSION);
    expect(payload.cli).toEqual({ name: CLI_PACKAGE_NAME, version: expect.any(String) });
    expect(payload.kit).toBe('rainbowkit');
    expect(payload.filesWritten).toContain('src/oz/wallet/rainbowkit.config.ts');
  });
});
