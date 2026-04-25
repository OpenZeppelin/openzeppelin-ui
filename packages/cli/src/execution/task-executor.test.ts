import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  createEmptyManifest,
  readManifest,
  writeManifest,
  type MigrationManifest,
} from '../manifest';
import { executeTask } from './task-executor';

const temporaryDirectories: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oz-cli-execute-'));
  temporaryDirectories.push(dir);
  return dir;
}

function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function createBaseManifest(dir: string): MigrationManifest {
  return createEmptyManifest(dir, {
    catalogVersion: '1.0.0',
    targetOzVersion: '0.1.0',
    framework: 'vite',
    sourceLibrary: 'shadcn',
  });
}

afterEach(() => {
  for (const dir of temporaryDirectories.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('executeTask', () => {
  it('applies deterministic component replacements and completes the task', () => {
    const dir = createTempDir();
    const manifestPath = path.join(dir, 'migration-manifest.json');

    writeFile(
      path.join(dir, 'src', 'App.tsx'),
      [
        "import { Button } from '@/components/ui/button';",
        '',
        'export function App() {',
        '  return <Button>Click</Button>;',
        '}',
      ].join('\n')
    );

    const manifest = createBaseManifest(dir);
    manifest.tasks = [
      {
        id: 'component-replacement-Button-src-App.tsx',
        phase: 'ui-components',
        phaseDetail: 'ui-primitives',
        type: 'component-replacement',
        status: 'pending',
        description: 'Replace Button with OZ Button in src/App.tsx',
        file: 'src/App.tsx',
        files: ['src/App.tsx'],
        sourceComponent: 'Button',
        targetComponent: 'Button',
      },
    ];
    writeManifest(manifestPath, manifest);

    const result = executeTask({ manifestPath });

    expect(result.ok).toBe(true);
    expect(result.mode).toBe('applied');
    expect(result.task?.statusAfter).toBe('completed');
    expect(readManifest(manifestPath).tasks[0]?.status).toBe('completed');

    const updatedSource = fs.readFileSync(path.join(dir, 'src', 'App.tsx'), 'utf8');
    expect(updatedSource).toContain('@openzeppelin/ui-components');
    expect(updatedSource).not.toContain('@/components/ui/button');
  });

  it('rejects component replacement tasks that escape the project root', () => {
    const dir = createTempDir();
    const manifestPath = path.join(dir, 'migration-manifest.json');
    const outsidePath = path.join(dir, '..', 'outside.tsx');
    writeFile(outsidePath, "import { Button } from '@/components/ui/button';\n");

    const manifest = createBaseManifest(dir);
    manifest.tasks = [
      {
        id: 'component-replacement-Button-outside',
        phase: 'ui-components',
        phaseDetail: 'ui-primitives',
        type: 'component-replacement',
        status: 'pending',
        description: 'Reject path traversal outside project root',
        file: '../outside.tsx',
        files: ['../outside.tsx'],
        sourceComponent: 'Button',
        targetComponent: 'Button',
      },
    ];
    writeManifest(manifestPath, manifest);

    const result = executeTask({ manifestPath });

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/escapes project root/);
    expect(fs.readFileSync(outsidePath, 'utf8')).toContain('@/components/ui/button');
  });

  it('returns manual instructions for wallet migration tasks without mutating manifest state', () => {
    const dir = createTempDir();
    const manifestPath = path.join(dir, 'migration-manifest.json');
    const manifest = createBaseManifest(dir);

    manifest.tasks = [
      {
        id: 'wallet-replacement-wagmi-src-wallet.ts',
        phase: 'wallet-adapter',
        phaseDetail: 'wallet-and-adapters',
        type: 'wallet-replacement',
        status: 'pending',
        description: 'Replace wagmi usage with OZ adapter in src/wallet.ts',
        file: 'src/wallet.ts',
        files: ['src/wallet.ts'],
      },
    ];
    writeManifest(manifestPath, manifest);

    const result = executeTask({ manifestPath });

    expect(result.ok).toBe(true);
    expect(result.mode).toBe('manual');
    expect(result.instructions?.join('\n')).toMatch(/useRuntimeContext|useWalletState/);
    expect(readManifest(manifestPath).tasks[0]?.status).toBe('pending');
  });

  it('blocks wallet-replacement execution when entry file uses stub providers', () => {
    const dir = createTempDir();
    const manifestPath = path.join(dir, 'migration-manifest.json');

    writeFile(
      path.join(dir, 'src', 'main.tsx'),
      [
        "import { RuntimeProvider, WalletStateProvider } from './oz/runtime-providers';",
        '<RuntimeProvider><WalletStateProvider><App /></WalletStateProvider></RuntimeProvider>',
      ].join('\n')
    );

    const manifest = createBaseManifest(dir);
    manifest.tasks = [
      {
        id: 'wallet-replacement-wagmi-src-hooks-useWallet.ts',
        phase: 'wallet-adapter',
        phaseDetail: 'wallet-and-adapters',
        type: 'wallet-replacement',
        status: 'pending',
        description: 'Replace wagmi usage with OZ adapter in src/hooks/useWallet.ts',
        file: 'src/hooks/useWallet.ts',
        files: ['src/hooks/useWallet.ts'],
      },
    ];
    writeManifest(manifestPath, manifest);

    const result = executeTask({ manifestPath });

    expect(result.ok).toBe(false);
    expect(result.mode).toBe('manual');
    expect(result.validation?.passed).toBe(false);
    expect(result.message).toMatch(/stub/);
    expect(readManifest(manifestPath).tasks[0]?.status).toBe('pending');
  });

  it('allows wallet-replacement execution when entry file uses real OZ providers', () => {
    const dir = createTempDir();
    const manifestPath = path.join(dir, 'migration-manifest.json');

    writeFile(
      path.join(dir, 'src', 'main.tsx'),
      [
        "import { RuntimeProvider, WalletStateProvider } from '@openzeppelin/ui-react';",
        '<RuntimeProvider><WalletStateProvider><App /></WalletStateProvider></RuntimeProvider>',
      ].join('\n')
    );

    const manifest = createBaseManifest(dir);
    manifest.tasks = [
      {
        id: 'wallet-replacement-wagmi-src-hooks-useWallet.ts',
        phase: 'wallet-adapter',
        phaseDetail: 'wallet-and-adapters',
        type: 'wallet-replacement',
        status: 'pending',
        description: 'Replace wagmi usage with OZ adapter in src/hooks/useWallet.ts',
        file: 'src/hooks/useWallet.ts',
        files: ['src/hooks/useWallet.ts'],
      },
    ];
    writeManifest(manifestPath, manifest);

    const result = executeTask({ manifestPath });

    expect(result.ok).toBe(true);
    expect(result.mode).toBe('manual');
    expect(result.validation).toBeNull();
  });
});
