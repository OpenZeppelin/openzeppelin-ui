import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { patchEntryFileWithConfigService, writeAppConfigFiles } from './setup';

const temporaryDirectories: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oz-cli-setup-'));
  temporaryDirectories.push(dir);
  return dir;
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

afterEach(() => {
  for (const dir of temporaryDirectories.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('writeAppConfigFiles', () => {
  it('creates app.config.json and app.config.json.example in public/', () => {
    const dir = createTempDir();
    writeJson(path.join(dir, 'package.json'), {
      name: 'test-app',
      dependencies: { react: '^19.0.0' },
    });

    const result = writeAppConfigFiles(dir);

    expect(result.configWritten).toBe(true);
    expect(result.exampleWritten).toBe(true);
    expect(fs.existsSync(path.join(dir, 'public', 'app.config.json'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'public', 'app.config.json.example'))).toBe(true);
  });

  it('does not scaffold any WalletConnect config', () => {
    const dir = createTempDir();
    writeJson(path.join(dir, 'package.json'), {
      name: 'test-app',
      dependencies: { react: '^19.0.0' },
    });

    writeAppConfigFiles(dir);

    // WalletConnect support was removed, so nothing should invite the user to
    // configure it -- in either the active config or the documented example.
    const activeRaw = fs.readFileSync(path.join(dir, 'public', 'app.config.json'), 'utf8');
    const exampleRaw = fs.readFileSync(path.join(dir, 'public', 'app.config.json.example'), 'utf8');

    expect(JSON.parse(activeRaw).globalServiceConfigs.walletconnect).toBeUndefined();
    expect(activeRaw).not.toContain('walletconnect');
    expect(exampleRaw).not.toContain('walletconnect');
    expect(exampleRaw).not.toContain('WALLETCONNECT');
  });

  it('detects RainbowKit and adds evm walletui config', () => {
    const dir = createTempDir();
    writeJson(path.join(dir, 'package.json'), {
      name: 'test-app',
      dependencies: {
        react: '^19.0.0',
        '@rainbow-me/rainbowkit': '^2.0.0',
        wagmi: '^2.0.0',
      },
    });

    writeAppConfigFiles(dir);

    const config = JSON.parse(fs.readFileSync(path.join(dir, 'public', 'app.config.json'), 'utf8'));
    expect(config.globalServiceConfigs.walletui).toBeDefined();
    expect(config.globalServiceConfigs.walletui.evm.kitName).toBe('rainbowkit');
  });

  it('detects Stellar wallets kit and adds stellar walletui config', () => {
    const dir = createTempDir();
    writeJson(path.join(dir, 'package.json'), {
      name: 'test-app',
      dependencies: {
        react: '^19.0.0',
        '@creit-tech/stellar-wallets-kit': '^1.0.0',
      },
    });

    writeAppConfigFiles(dir);

    const config = JSON.parse(fs.readFileSync(path.join(dir, 'public', 'app.config.json'), 'utf8'));
    expect(config.globalServiceConfigs.walletui.stellar.kitName).toBe('stellar-wallets-kit');
  });

  it('omits walletui when no wallet library is detected', () => {
    const dir = createTempDir();
    writeJson(path.join(dir, 'package.json'), {
      name: 'test-app',
      dependencies: { react: '^19.0.0' },
    });

    writeAppConfigFiles(dir);

    const config = JSON.parse(fs.readFileSync(path.join(dir, 'public', 'app.config.json'), 'utf8'));
    expect(config.globalServiceConfigs.walletui).toBeUndefined();
  });

  it('is idempotent — does not overwrite existing config', () => {
    const dir = createTempDir();
    writeJson(path.join(dir, 'package.json'), {
      name: 'test-app',
      dependencies: { react: '^19.0.0' },
    });

    const configPath = path.join(dir, 'public', 'app.config.json');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, '{"existing": true}');

    const result = writeAppConfigFiles(dir);

    expect(result.configWritten).toBe(false);
    const content = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(content.existing).toBe(true);
  });

  it('example config includes all documented sections', () => {
    const dir = createTempDir();
    writeJson(path.join(dir, 'package.json'), {
      name: 'test-app',
      dependencies: { react: '^19.0.0' },
    });

    writeAppConfigFiles(dir);

    const example = JSON.parse(
      fs.readFileSync(path.join(dir, 'public', 'app.config.json.example'), 'utf8')
    );
    expect(example._readme).toBeDefined();
    expect(example.globalServiceConfigs).toBeDefined();
    expect(example.networkServiceConfigs).toBeDefined();
    expect(example.rpcEndpoints).toBeDefined();
    expect(example.indexerEndpoints).toBeDefined();
    expect(example.featureFlags).toBeDefined();
    expect(example.defaultLanguage).toBe('en');
  });
});

describe('patchEntryFileWithConfigService', () => {
  it('injects appConfigService import and async wrapper into main.tsx', () => {
    const dir = createTempDir();
    writeJson(path.join(dir, 'package.json'), { name: 'test-app' });
    writeFile(
      path.join(dir, 'src', 'main.tsx'),
      [
        "import React from 'react';",
        "import ReactDOM from 'react-dom/client';",
        "import { App } from './App';",
        '',
        "ReactDOM.createRoot(document.getElementById('root')!).render(",
        '  <React.StrictMode>',
        '    <App />',
        '  </React.StrictMode>',
        ');',
        '',
      ].join('\n')
    );

    const patched = patchEntryFileWithConfigService(dir);

    expect(patched).toBe('src/main.tsx');
    const content = fs.readFileSync(path.join(dir, 'src', 'main.tsx'), 'utf8');
    expect(content).toContain("import { appConfigService } from '@openzeppelin/ui-utils'");
    expect(content).toContain('async function startApp()');
    expect(content).toContain('await appConfigService.initialize(');
    expect(content).toContain("{ type: 'viteEnv', env: import.meta.env }");
    expect(content).toContain("{ type: 'json', path: '/app.config.json' }");
    expect(content).toContain('void startApp()');
    expect(content).toContain('createRoot');
  });

  it('is idempotent — skips if appConfigService already present', () => {
    const dir = createTempDir();
    writeJson(path.join(dir, 'package.json'), { name: 'test-app' });
    writeFile(
      path.join(dir, 'src', 'main.tsx'),
      [
        "import { appConfigService } from '@openzeppelin/ui-utils';",
        "import ReactDOM from 'react-dom/client';",
        '',
        "ReactDOM.createRoot(document.getElementById('root')!).render(<App />);",
      ].join('\n')
    );

    const result = patchEntryFileWithConfigService(dir);

    expect(result).toBeNull();
  });

  it('handles createRoot without ReactDOM prefix', () => {
    const dir = createTempDir();
    writeJson(path.join(dir, 'package.json'), { name: 'test-app' });
    writeFile(
      path.join(dir, 'src', 'main.tsx'),
      [
        "import { createRoot } from 'react-dom/client';",
        "import { App } from './App';",
        '',
        "createRoot(document.getElementById('root')!).render(<App />);",
      ].join('\n')
    );

    const patched = patchEntryFileWithConfigService(dir);

    expect(patched).toBe('src/main.tsx');
    const content = fs.readFileSync(path.join(dir, 'src', 'main.tsx'), 'utf8');
    expect(content).toContain('async function startApp()');
    expect(content).toContain('await appConfigService.initialize(');
  });

  it('returns null when no entry file exists', () => {
    const dir = createTempDir();
    writeJson(path.join(dir, 'package.json'), { name: 'test-app' });

    const result = patchEntryFileWithConfigService(dir);

    expect(result).toBeNull();
  });

  it('returns null when entry file has no createRoot call', () => {
    const dir = createTempDir();
    writeJson(path.join(dir, 'package.json'), { name: 'test-app' });
    writeFile(path.join(dir, 'src', 'main.tsx'), "console.log('no render here');\n");

    const result = patchEntryFileWithConfigService(dir);

    expect(result).toBeNull();
  });
});
