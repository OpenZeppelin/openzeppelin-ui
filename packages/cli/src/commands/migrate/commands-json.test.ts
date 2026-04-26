import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Command } from 'commander';
import { afterEach, describe, expect, it } from 'vitest';

import { writeAgentProfileSelection } from '../../agent-assets';
import { createEmptyManifest, writeManifest } from '../../manifest';
import type { MigrationManifest } from '../../manifest';
import { registerAnalyzeCommand } from './analyze';
import { registerCompleteCommand } from './complete';
import { registerDoctorCommand } from './doctor';
import { registerExecuteCommand } from './execute';
import { registerFailCommand } from './fail';
import { registerInitCommand } from './init';
import { registerPlanCommand } from './plan';
import { registerStatusCommand } from './status';

const temporaryDirectories: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oz-cli-command-'));
  temporaryDirectories.push(dir);
  return dir;
}

function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
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

function createBaseManifest(dir: string): MigrationManifest {
  return createEmptyManifest(dir, {
    catalogVersion: '1.0.0',
    targetOzVersion: '0.1.0',
    agentAssetProfiles: ['standard', 'claude'],
    framework: 'vite',
    sourceLibrary: 'shadcn',
  });
}

function createAnalyzeFixture(dir: string): void {
  writeJson(path.join(dir, 'package.json'), {
    name: 'fixture-app',
    version: '0.0.0',
    type: 'module',
    dependencies: {
      react: '^19.0.0',
      'react-dom': '^19.0.0',
      wagmi: '^2.0.0',
    },
    devDependencies: {
      vite: '^7.0.0',
      '@tailwindcss/vite': '^4.1.0',
      tailwindcss: '^4.1.0',
    },
  });

  writeFile(path.join(dir, 'vite.config.ts'), 'export default {};');
  writeFile(
    path.join(dir, 'src', 'index.css'),
    "@import 'tailwindcss' source(none);\n@source './';\n"
  );
  writeFile(
    path.join(dir, 'src', 'App.tsx'),
    [
      "import { Button } from '@/components/ui/button';",
      "import { useAccount } from 'wagmi';",
      '',
      'export function App() {',
      '  const { address } = useAccount();',
      '  return <Button>{address ?? "Connect"}</Button>;',
      '}',
    ].join('\n')
  );
}

afterEach(() => {
  process.exitCode = 0;
  for (const dir of temporaryDirectories.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('migrate command JSON output', () => {
  it('init --json returns a structured payload', async () => {
    const dir = createTempDir();
    writeJson(path.join(dir, 'package.json'), {
      name: 'fixture-app',
      version: '0.0.0',
      type: 'module',
      dependencies: {
        react: '^19.0.0',
      },
    });

    const root = new Command();
    registerInitCommand(root);

    const stdout = await captureStdout(async () => {
      await root.parseAsync(
        [
          'init',
          '--project',
          dir,
          '--skip-install',
          '--agent-profile',
          'standard,claude',
          '--json',
        ],
        {
          from: 'user',
        }
      );
    });

    const payload = JSON.parse(stdout);
    expect(payload.action).toBe('migrate-init');
    expect(payload.ok).toBe(true);
    expect(payload.project).toBe(dir);
    expect(payload.agentAssetProfiles).toEqual(['standard', 'claude']);
    expect(payload.agentProfileSelectionWritten).toBe('.oz-ui-migrate.json');
    expect(fs.existsSync(path.join(dir, '.oz-ui-migrate.json'))).toBe(true);
    expect(Array.isArray(payload.templatesWritten)).toBe(true);
  });

  it('analyze --json returns a structured payload with the report nested', async () => {
    const dir = createTempDir();
    createAnalyzeFixture(dir);

    const root = new Command();
    registerAnalyzeCommand(root);

    const stdout = await captureStdout(async () => {
      await root.parseAsync(['analyze', '--project', dir, '--json'], {
        from: 'user',
      });
    });

    const payload = JSON.parse(stdout);
    expect(payload.action).toBe('migrate-analyze');
    expect(payload.ok).toBe(true);
    expect(payload.project).toBe(dir);
    expect(payload.report.framework).toBe('vite');
    expect(payload.report.summary.totalFiles).toBeGreaterThan(0);
  });

  it('plan --json returns a structured payload with manifest metadata', async () => {
    const dir = createTempDir();
    createAnalyzeFixture(dir);
    const reportPath = path.join(dir, 'migration-analysis.json');

    const analyzeRoot = new Command();
    registerAnalyzeCommand(analyzeRoot);
    const analyzeStdout = await captureStdout(async () => {
      await analyzeRoot.parseAsync(['analyze', '--project', dir, '--json'], {
        from: 'user',
      });
    });
    const analyzePayload = JSON.parse(analyzeStdout);
    writeJson(reportPath, analyzePayload.report);
    writeAgentProfileSelection(dir, ['standard', 'claude']);

    const planRoot = new Command();
    registerPlanCommand(planRoot);

    const stdout = await captureStdout(async () => {
      await planRoot.parseAsync(['plan', '--report', reportPath, '--json'], {
        from: 'user',
      });
    });

    const payload = JSON.parse(stdout);
    expect(payload.action).toBe('migrate-plan');
    expect(payload.ok).toBe(true);
    expect(payload.report).toBe(reportPath);
    expect(payload.manifestPath).toContain('migration-manifest.json');
    expect(payload.totalTasks).toBeGreaterThan(0);
    expect(Array.isArray(payload.manifest.tasks)).toBe(true);
    expect(payload.manifest.agentAssetProfiles).toEqual(['standard', 'claude']);
  });

  it('status --json includes next task metadata and phase descriptions', async () => {
    const dir = createTempDir();
    const manifestPath = path.join(dir, 'migration-manifest.json');
    const manifest = createBaseManifest(dir);
    manifest.tasks = [
      {
        id: 'setup-install-packages',
        phase: 'setup',
        phaseDetail: 'foundation',
        type: 'install-packages',
        status: 'completed',
        description: 'Install packages',
      },
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
        dependsOn: ['setup-install-packages'],
        validation: {
          command:
            'oz-ui migrate doctor --manifest migration-manifest.json --check component-replacement-Button-src-App.tsx --json',
          doctorCheck: 'component-replacement-Button-src-App.tsx',
        },
      },
    ];
    writeManifest(manifestPath, manifest);

    const root = new Command();
    registerStatusCommand(root);

    const stdout = await captureStdout(async () => {
      await root.parseAsync(['status', '--manifest', manifestPath, '--json'], {
        from: 'user',
      });
    });

    const payload = JSON.parse(stdout);
    expect(payload.action).toBe('migrate-status');
    expect(payload.phaseDescriptions.setup).toMatch(/Foundation/);
    expect(payload.nextTask.phaseDetail).toBe('ui-primitives');
    expect(payload.nextTask.type).toBe('component-replacement');
    expect(payload.nextTask.validationCommand).toContain('migrate doctor');
    expect(payload.nextTask.suggestedPrimaryCommand).toContain('migrate execute');
    expect(payload.nextTask.suggestedCommands[0]).toContain('--task component-replacement-Button');
  });

  it('status --json suggests validation and lifecycle commands for in-progress manual tasks', async () => {
    const dir = createTempDir();
    const manifestPath = path.join(dir, 'migration-manifest.json');
    const manifest = createBaseManifest(dir);
    manifest.tasks = [
      {
        id: 'setup-install-packages',
        phase: 'setup',
        phaseDetail: 'foundation',
        type: 'install-packages',
        status: 'completed',
        description: 'Install packages',
      },
      {
        id: 'wallet-replacement-wagmi-src-wallet.ts',
        phase: 'wallet-adapter',
        phaseDetail: 'wallet-and-adapters',
        type: 'wallet-replacement',
        status: 'in_progress',
        description: 'Replace wagmi usage with OZ adapter in src/wallet.ts',
        file: 'src/wallet.ts',
        files: ['src/wallet.ts'],
        dependsOn: ['setup-install-packages'],
      },
    ];
    writeManifest(manifestPath, manifest);

    const root = new Command();
    registerStatusCommand(root);

    const stdout = await captureStdout(async () => {
      await root.parseAsync(['status', '--manifest', manifestPath, '--json'], {
        from: 'user',
      });
    });

    const payload = JSON.parse(stdout);
    expect(payload.nextTask.id).toBe('wallet-replacement-wagmi-src-wallet.ts');
    expect(payload.nextTask.suggestedCommands).toHaveLength(3);
    expect(payload.nextTask.suggestedCommands[0]).toContain('migrate doctor');
    expect(payload.nextTask.suggestedCommands[1]).toContain('migrate complete');
    expect(payload.nextTask.suggestedCommands[2]).toContain('migrate fail');
  });

  it('doctor --json includes warning counts and warning severity without failing the run', async () => {
    const dir = createTempDir();
    writeFile(
      path.join(dir, 'src', 'storage.ts'),
      [
        '// TODO: manual review storage migration',
        'export const key = localStorage.getItem("k");',
      ].join('\n')
    );

    const manifestPath = path.join(dir, 'migration-manifest.json');
    const manifest = createBaseManifest(dir);
    manifest.tasks = [
      {
        id: 'storage-migration-localStorage-src-storage.ts',
        phase: 'storage',
        phaseDetail: 'storage',
        type: 'storage-migration',
        status: 'completed',
        description: 'Flag localStorage usage in src/storage.ts for manual review',
        file: 'src/storage.ts',
        files: ['src/storage.ts'],
        manualReview: true,
      },
    ];
    writeManifest(manifestPath, manifest);

    const root = new Command();
    registerDoctorCommand(root);

    const stdout = await captureStdout(async () => {
      await root.parseAsync(['doctor', '--manifest', manifestPath, '--json'], {
        from: 'user',
      });
    });

    const payload = JSON.parse(stdout);
    expect(payload.action).toBe('migrate-doctor');
    expect(payload.ok).toBe(true);
    expect(payload.warnings).toBe(1);
    expect(payload.failed).toBe(0);
    expect(payload.results[0].severity).toBe('warning');
    expect(payload.results[0].warnings.join('\n')).toMatch(/manual review/);
    expect(process.exitCode).toBe(0);
  });

  it('execute --json reports manual guidance for wallet tasks', async () => {
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

    const root = new Command();
    registerExecuteCommand(root);

    const stdout = await captureStdout(async () => {
      await root.parseAsync(['execute', '--manifest', manifestPath, '--json'], {
        from: 'user',
      });
    });

    const payload = JSON.parse(stdout);
    expect(payload.action).toBe('migrate-execute');
    expect(payload.mode).toBe('manual');
    expect(payload.task.id).toBe('wallet-replacement-wagmi-src-wallet.ts');
    expect(payload.instructions.join('\n')).toMatch(/useRuntimeContext|useWalletState/);
  });

  it('complete --json validates and completes manual tasks', async () => {
    const dir = createTempDir();
    writeFile(
      path.join(dir, 'src', 'storage.ts'),
      [
        '// TODO: manual review storage migration',
        'export const key = localStorage.getItem("k");',
      ].join('\n')
    );

    const manifestPath = path.join(dir, 'migration-manifest.json');
    const manifest = createBaseManifest(dir);
    manifest.tasks = [
      {
        id: 'storage-migration-localStorage-src-storage.ts',
        phase: 'storage',
        phaseDetail: 'storage',
        type: 'storage-migration',
        status: 'pending',
        description: 'Flag localStorage usage in src/storage.ts for manual review',
        file: 'src/storage.ts',
        files: ['src/storage.ts'],
        manualReview: true,
      },
    ];
    writeManifest(manifestPath, manifest);

    const root = new Command();
    registerCompleteCommand(root);

    const stdout = await captureStdout(async () => {
      await root.parseAsync(
        ['complete', '--manifest', manifestPath, '--task', manifest.tasks[0].id, '--json'],
        {
          from: 'user',
        }
      );
    });

    const payload = JSON.parse(stdout);
    expect(payload.action).toBe('migrate-complete');
    expect(payload.ok).toBe(true);
    expect(payload.task.statusAfter).toBe('completed');
    expect(payload.validation.severity).toBe('warning');
  });

  it('fail --json records a blocker reason on manual tasks', async () => {
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

    const root = new Command();
    registerFailCommand(root);

    const stdout = await captureStdout(async () => {
      await root.parseAsync(
        [
          'fail',
          '--manifest',
          manifestPath,
          '--task',
          manifest.tasks[0].id,
          '--reason',
          'blocked by unresolved provider contract',
          '--json',
        ],
        {
          from: 'user',
        }
      );
    });

    const payload = JSON.parse(stdout);
    expect(payload.action).toBe('migrate-fail');
    expect(payload.task.statusAfter).toBe('failed');
    expect(payload.task.error).toMatch(/provider contract/);
  });
});
