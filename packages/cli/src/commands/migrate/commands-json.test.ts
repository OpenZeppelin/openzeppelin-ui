import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Command } from 'commander';
import { afterEach, describe, expect, it } from 'vitest';

import { createEmptyManifest, writeManifest } from '../../manifest';
import type { MigrationManifest } from '../../manifest';
import { registerDoctorCommand } from './doctor';
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
    framework: 'vite',
    sourceLibrary: 'shadcn',
  });
}

afterEach(() => {
  process.exitCode = 0;
  for (const dir of temporaryDirectories.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('migrate command JSON output', () => {
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
    expect(payload.nextTask.validationCommand).toContain('migrate doctor');
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
});
