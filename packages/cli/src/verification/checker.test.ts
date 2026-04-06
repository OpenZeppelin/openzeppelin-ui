import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import type { MigrationTask } from '../manifest';
import { checkTask } from './checker';

const temporaryDirectories: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oz-cli-checker-'));
  temporaryDirectories.push(dir);
  return dir;
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

describe('checkTask', () => {
  it('verifies wallet replacement using OZ hooks instead of legacy imports', () => {
    const dir = createTempDir();
    writeFile(
      path.join(dir, 'src', 'wallet.ts'),
      [
        "import { useRuntimeContext, useWalletState } from '@openzeppelin/ui-react';",
        'export function useWalletSignals() {',
        '  const ctx = useRuntimeContext();',
        '  return { ctx, wallet: useWalletState() };',
        '}',
      ].join('\n')
    );

    const task: MigrationTask = {
      id: 'wallet-replacement-src-wallet.ts',
      phase: 'wallet-adapter',
      type: 'wallet-replacement',
      status: 'pending',
      description: 'Replace wagmi usage with OZ adapter in src/wallet.ts',
      file: 'src/wallet.ts',
    };

    const result = checkTask(task, dir);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('warning');
    expect(result.warnings?.join('\n')).toMatch(/Provider ancestry/);
  });

  it('fails wallet replacement when legacy imports remain', () => {
    const dir = createTempDir();
    writeFile(
      path.join(dir, 'src', 'wallet.ts'),
      [
        "import { useAccount } from 'wagmi';",
        'export function useWalletSignals() {',
        '  return useAccount();',
        '}',
      ].join('\n')
    );

    const task: MigrationTask = {
      id: 'wallet-replacement-src-wallet.ts',
      phase: 'wallet-adapter',
      type: 'wallet-replacement',
      status: 'pending',
      description: 'Replace wagmi usage with OZ adapter in src/wallet.ts',
      file: 'src/wallet.ts',
    };

    const result = checkTask(task, dir);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('fail');
    expect(result.diagnostics.join('\n')).toMatch(/Legacy wallet imports/);
  });

  it('accepts storage migration when a manual review marker is present', () => {
    const dir = createTempDir();
    writeFile(
      path.join(dir, 'src', 'storage.ts'),
      [
        '// TODO: manual review storage migration',
        'export const key = localStorage.getItem("k");',
      ].join('\n')
    );

    const task: MigrationTask = {
      id: 'storage-migration-localStorage-src-storage.ts',
      phase: 'storage',
      type: 'storage-migration',
      status: 'pending',
      description: 'Flag localStorage usage in src/storage.ts for manual review',
      file: 'src/storage.ts',
      manualReview: true,
    };

    const result = checkTask(task, dir);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('warning');
    expect(result.warnings?.join('\n')).toMatch(/manual review/);
  });
});
