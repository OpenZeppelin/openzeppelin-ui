import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Command } from 'commander';
import { afterEach, describe, expect, it } from 'vitest';

import { registerAddCommand } from '../add';
import { CLI_PACKAGE_NAME, JSON_SCHEMA_VERSION } from '../migrate/json-results';

const temporaryDirectories: string[] = [];

function createTempProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oz-ui-add-cmd-'));
  temporaryDirectories.push(dir);

  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'sample-app', private: true, version: '0.1.0' }, null, 2)
  );
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'src', 'main.tsx'),
    `import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App';\n\ncreateRoot(document.getElementById('root')!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);\n`
  );

  return dir;
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

describe('add wallet command', () => {
  it('emits a JSON envelope with the add-wallet action', async () => {
    const dir = createTempProject();

    const stdout = await runAdd([
      'wallet',
      '--project',
      dir,
      '--kit',
      'custom',
      '--skip-install',
      '--json',
    ]);
    const payload = JSON.parse(stdout);

    expect(payload.action).toBe('add-wallet');
    expect(payload.ok).toBe(true);
    expect(payload.schemaVersion).toBe(JSON_SCHEMA_VERSION);
    expect(payload.cli).toEqual({ name: CLI_PACKAGE_NAME, version: expect.any(String) });
    expect(payload.kit).toBe('custom');
    expect(payload.entryFilePatched).toBe('src/main.tsx');
    expect(payload.filesWritten).toEqual(
      expect.arrayContaining(['src/oz/OzProviders.tsx', 'src/oz/runtime.ts'])
    );
  });

  it('prints a non-JSON success summary by default', async () => {
    const dir = createTempProject();

    const stdout = await runAdd([
      'wallet',
      '--project',
      dir,
      '--kit',
      'rainbowkit',
      '--skip-install',
      '--yes',
    ]);

    expect(stdout).toContain('Wallet wiring added');
    expect(stdout).toContain('rainbowkit');
    expect(stdout).toContain('Files written:');
    expect(stdout).toContain('Next steps');
  });
});
