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

  it('warns when Claude skill mirrors are missing', () => {
    const dir = createTempDir();
    writeFile(path.join(dir, '.cursor', 'skills', 'migrate-to-oz-uikit', 'SKILL.md'), '# skill');

    const task: MigrationTask = {
      id: 'setup-copy-skill',
      phase: 'setup',
      type: 'copy-skill',
      status: 'pending',
      description: 'Copy migration skill file to project',
    };

    const result = checkTask(task, dir);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe('warning');
    expect(result.warnings?.join('\n')).toMatch(/\.claude\/skills/);
  });

  it('passes when analyzer, executor, and verifier agents exist in Cursor', () => {
    const dir = createTempDir();
    writeFile(path.join(dir, '.cursor', 'agents', 'migration-analyzer.md'), '# analyzer');
    writeFile(path.join(dir, '.cursor', 'agents', 'migration-executor.md'), '# executor');
    writeFile(path.join(dir, '.cursor', 'agents', 'migration-verifier.md'), '# verifier');

    const task: MigrationTask = {
      id: 'setup-copy-agents',
      phase: 'setup',
      type: 'copy-agents',
      status: 'pending',
      description: 'Copy migration agent files to project',
    };

    const result = checkTask(task, dir);
    expect(result.passed).toBe(true);
    expect(result.diagnostics.join('\n')).toMatch(/migration-executor/);
  });

  describe('entry-file provider-source detection', () => {
    function wireProvidersTask(): MigrationTask {
      return {
        id: 'setup-wire-providers',
        phase: 'setup',
        type: 'wire-providers',
        status: 'pending',
        description: 'Wire OZ providers into the app root',
      };
    }

    function walletReplacementTask(file: string): MigrationTask {
      return {
        id: `wallet-replacement-${file.replace(/\//g, '-')}`,
        phase: 'wallet-adapter',
        type: 'wallet-replacement',
        status: 'pending',
        description: `Replace wagmi usage with OZ adapter in ${file}`,
        file,
      };
    }

    it('wire-providers warns when entry file imports providers from local stub', () => {
      const dir = createTempDir();
      writeFile(
        path.join(dir, 'src', 'main.tsx'),
        [
          "import { RuntimeProvider, WalletStateProvider } from './oz/runtime-providers';",
          'ReactDOM.createRoot(document.getElementById("root")!).render(',
          '  <RuntimeProvider><WalletStateProvider><App /></WalletStateProvider></RuntimeProvider>',
          ');',
        ].join('\n')
      );

      const result = checkTask(wireProvidersTask(), dir);
      expect(result.passed).toBe(true);
      expect(result.severity).toBe('warning');
      expect(result.warnings?.join('\n')).toMatch(/local stub/);
      expect(result.warnings?.join('\n')).toMatch(/@openzeppelin\/ui-react/);
    });

    it('wire-providers passes cleanly when entry file uses @openzeppelin/ui-react providers', () => {
      const dir = createTempDir();
      writeFile(
        path.join(dir, 'src', 'main.tsx'),
        [
          "import { RuntimeProvider, WalletStateProvider } from '@openzeppelin/ui-react';",
          'ReactDOM.createRoot(document.getElementById("root")!).render(',
          '  <RuntimeProvider><WalletStateProvider><App /></WalletStateProvider></RuntimeProvider>',
          ');',
        ].join('\n')
      );

      const result = checkTask(wireProvidersTask(), dir);
      expect(result.passed).toBe(true);
      expect(result.severity).toBe('pass');
      expect(result.warnings).toBeUndefined();
    });

    it('wire-providers detects stub via index.tsx entry file', () => {
      const dir = createTempDir();
      writeFile(
        path.join(dir, 'src', 'index.tsx'),
        [
          "import { RuntimeProvider, WalletStateProvider } from '../oz/runtime-providers';",
          '<RuntimeProvider><WalletStateProvider><App /></WalletStateProvider></RuntimeProvider>',
        ].join('\n')
      );

      const result = checkTask(wireProvidersTask(), dir);
      expect(result.passed).toBe(true);
      expect(result.severity).toBe('warning');
      expect(result.warnings?.join('\n')).toMatch(/local stub/);
    });

    it('wallet-replacement fails when entry file uses stub providers', () => {
      const dir = createTempDir();
      writeFile(
        path.join(dir, 'src', 'main.tsx'),
        [
          "import { RuntimeProvider, WalletStateProvider } from './oz/runtime-providers';",
          '<RuntimeProvider><WalletStateProvider><App /></WalletStateProvider></RuntimeProvider>',
        ].join('\n')
      );
      writeFile(
        path.join(dir, 'src', 'hooks', 'useWallet.ts'),
        [
          "import { useRuntimeContext, useWalletState } from '@openzeppelin/ui-react';",
          'export function useWallet() {',
          '  const ctx = useRuntimeContext();',
          '  return { ctx, wallet: useWalletState() };',
          '}',
        ].join('\n')
      );

      const result = checkTask(walletReplacementTask('src/hooks/useWallet.ts'), dir);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('fail');
      expect(result.diagnostics.join('\n')).toMatch(/local stub/);
      expect(result.diagnostics.join('\n')).toMatch(/useWalletState must be used/);
    });

    it('wallet-replacement passes when entry file uses real OZ providers', () => {
      const dir = createTempDir();
      writeFile(
        path.join(dir, 'src', 'main.tsx'),
        [
          "import { RuntimeProvider, WalletStateProvider } from '@openzeppelin/ui-react';",
          '<RuntimeProvider><WalletStateProvider><App /></WalletStateProvider></RuntimeProvider>',
        ].join('\n')
      );
      writeFile(
        path.join(dir, 'src', 'hooks', 'useWallet.ts'),
        [
          "import { useRuntimeContext, useWalletState } from '@openzeppelin/ui-react';",
          'export function useWallet() {',
          '  const ctx = useRuntimeContext();',
          '  return { ctx, wallet: useWalletState() };',
          '}',
        ].join('\n')
      );

      const result = checkTask(walletReplacementTask('src/hooks/useWallet.ts'), dir);
      expect(result.passed).toBe(true);
      expect(result.severity).toBe('warning');
      expect(result.warnings?.join('\n')).toMatch(/Provider ancestry/);
      expect(result.diagnostics.join('\n')).not.toMatch(/local stub/);
    });

    it('wallet-replacement still passes when no entry file exists (no false positive)', () => {
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

      const result = checkTask(walletReplacementTask('src/wallet.ts'), dir);
      expect(result.passed).toBe(true);
      expect(result.severity).toBe('warning');
      expect(result.warnings?.join('\n')).toMatch(/Provider ancestry/);
    });

    it('wire-providers ignores entry file when it has no provider imports', () => {
      const dir = createTempDir();
      writeFile(
        path.join(dir, 'src', 'main.tsx'),
        [
          "import React from 'react';",
          "import App from './App';",
          'ReactDOM.createRoot(document.getElementById("root")!).render(<App />);',
        ].join('\n')
      );
      writeFile(
        path.join(dir, 'src', 'oz', 'OzProviders.tsx'),
        [
          "import { RuntimeProvider, WalletStateProvider } from '@openzeppelin/ui-react';",
          'export function OzProviders({ children }) {',
          '  return <RuntimeProvider><WalletStateProvider>{children}</WalletStateProvider></RuntimeProvider>;',
          '}',
        ].join('\n')
      );

      const result = checkTask(wireProvidersTask(), dir);
      expect(result.passed).toBe(true);
      expect(result.severity).toBe('pass');
      expect(result.warnings).toBeUndefined();
    });
  });

  describe('activate-providers gate', () => {
    function activateProvidersTask(): MigrationTask {
      return {
        id: 'setup-activate-providers',
        phase: 'setup',
        type: 'activate-providers',
        status: 'pending',
        description: 'Verify entry file imports providers from @openzeppelin/ui-react',
      };
    }

    it('fails when entry file uses stub providers', () => {
      const dir = createTempDir();
      writeFile(
        path.join(dir, 'src', 'main.tsx'),
        [
          "import { RuntimeProvider, WalletStateProvider } from './oz/runtime-providers';",
          '<RuntimeProvider><WalletStateProvider><App /></WalletStateProvider></RuntimeProvider>',
        ].join('\n')
      );

      const result = checkTask(activateProvidersTask(), dir);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('fail');
      expect(result.diagnostics.join('\n')).toMatch(/local stub/);
    });

    it('passes when entry file uses @openzeppelin/ui-react providers', () => {
      const dir = createTempDir();
      writeFile(
        path.join(dir, 'src', 'main.tsx'),
        [
          "import { RuntimeProvider, WalletStateProvider } from '@openzeppelin/ui-react';",
          '<RuntimeProvider><WalletStateProvider><App /></WalletStateProvider></RuntimeProvider>',
        ].join('\n')
      );

      const result = checkTask(activateProvidersTask(), dir);
      expect(result.passed).toBe(true);
      expect(result.severity).toBe('pass');
    });

    it('fails when no entry file exists', () => {
      const dir = createTempDir();
      writeFile(path.join(dir, 'src', 'other.tsx'), 'export default {};');

      const result = checkTask(activateProvidersTask(), dir);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('fail');
      expect(result.diagnostics.join('\n')).toMatch(/No entry file found/);
    });

    it('warns when entry file has no provider imports at all', () => {
      const dir = createTempDir();
      writeFile(
        path.join(dir, 'src', 'main.tsx'),
        [
          "import React from 'react';",
          "import { OzProviders } from './oz/OzProviders';",
          '<OzProviders><App /></OzProviders>',
        ].join('\n')
      );

      const result = checkTask(activateProvidersTask(), dir);
      expect(result.passed).toBe(true);
      expect(result.severity).toBe('warning');
      expect(result.warnings?.join('\n')).toMatch(/separate wrapper/);
    });
  });
});
