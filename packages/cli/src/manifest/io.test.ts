import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  computePhaseProgress,
  createEmptyManifest,
  readManifest,
  updateTaskStatus,
  writeManifest,
} from './io';
import type { MigrationManifest } from './schema';

const temporaryDirectories: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oz-cli-manifest-'));
  temporaryDirectories.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of temporaryDirectories.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('createEmptyManifest', () => {
  it('produces a manifest with correct schema version and empty tasks', () => {
    const manifest = createEmptyManifest('/tmp/project', {
      catalogVersion: '1.0.0',
      targetOzVersion: '0.1.0',
      framework: 'vite',
      sourceLibrary: 'shadcn',
    });

    expect(manifest.schemaVersion).toBe('1.0.0');
    expect(manifest.framework).toBe('vite');
    expect(manifest.sourceLibrary).toBe('shadcn');
    expect(manifest.tasks).toEqual([]);
    expect(manifest.phases).toHaveLength(7);
    expect(manifest.phaseDescriptions?.setup).toMatch(/Foundation/);
  });
});

describe('writeManifest / readManifest', () => {
  it('round-trips a manifest to disk', () => {
    const dir = createTempDir();
    const manifestPath = path.join(dir, 'migration-manifest.json');
    const manifest = createEmptyManifest(dir, {
      catalogVersion: '1.0.0',
      targetOzVersion: '0.1.0',
      framework: 'vite',
      sourceLibrary: null,
    });

    writeManifest(manifestPath, manifest);
    const loaded = readManifest(manifestPath);

    expect(loaded.schemaVersion).toBe('1.0.0');
    expect(loaded.projectRoot).toBe(dir);
  });

  it('throws when manifest is missing', () => {
    expect(() => readManifest('/nonexistent/path/manifest.json')).toThrow(/Manifest not found/);
  });
});

describe('updateTaskStatus', () => {
  it('transitions a task from pending to in_progress', () => {
    const manifest = createEmptyManifest('/tmp/project', {
      catalogVersion: '1.0.0',
      targetOzVersion: '0.1.0',
      framework: 'vite',
      sourceLibrary: null,
    });
    manifest.tasks = [
      {
        id: 'task-1',
        phase: 'setup',
        type: 'install-packages',
        status: 'pending',
        description: 'Install packages',
      },
    ];

    const updated = updateTaskStatus(manifest, 'task-1', 'in_progress');
    expect(updated.tasks[0].status).toBe('in_progress');
  });

  it('records error on failure', () => {
    const manifest = createEmptyManifest('/tmp/project', {
      catalogVersion: '1.0.0',
      targetOzVersion: '0.1.0',
      framework: 'vite',
      sourceLibrary: null,
    });
    manifest.tasks = [
      {
        id: 'task-1',
        phase: 'setup',
        type: 'install-packages',
        status: 'in_progress',
        description: 'Install packages',
      },
    ];

    const updated = updateTaskStatus(manifest, 'task-1', 'failed', 'npm install failed');
    expect(updated.tasks[0].status).toBe('failed');
    expect(updated.tasks[0].error).toBe('npm install failed');
  });

  it('throws for invalid task ID', () => {
    const manifest = createEmptyManifest('/tmp/project', {
      catalogVersion: '1.0.0',
      targetOzVersion: '0.1.0',
      framework: 'vite',
      sourceLibrary: null,
    });

    expect(() => updateTaskStatus(manifest, 'nonexistent', 'in_progress')).toThrow(
      /Task "nonexistent" not found/
    );
  });

  it('throws for invalid transition', () => {
    const manifest = createEmptyManifest('/tmp/project', {
      catalogVersion: '1.0.0',
      targetOzVersion: '0.1.0',
      framework: 'vite',
      sourceLibrary: null,
    });
    manifest.tasks = [
      {
        id: 'task-1',
        phase: 'setup',
        type: 'install-packages',
        status: 'completed',
        description: 'Install packages',
      },
    ];

    expect(() => updateTaskStatus(manifest, 'task-1', 'pending')).toThrow(
      /Invalid task status transition/
    );
  });
});

describe('computePhaseProgress', () => {
  it('computes correct counts per phase', () => {
    const manifest: MigrationManifest = {
      ...createEmptyManifest('/tmp/project', {
        catalogVersion: '1.0.0',
        targetOzVersion: '0.1.0',
        framework: 'vite',
        sourceLibrary: null,
      }),
      tasks: [
        {
          id: 't1',
          phase: 'setup',
          type: 'install-packages',
          status: 'completed',
          description: '',
        },
        { id: 't2', phase: 'setup', type: 'wire-providers', status: 'completed', description: '' },
        {
          id: 't3',
          phase: 'setup',
          type: 'tailwind-normalize',
          status: 'pending',
          description: '',
        },
        {
          id: 't4',
          phase: 'ui-components',
          type: 'component-replacement',
          status: 'failed',
          description: '',
        },
      ],
    };

    const progress = computePhaseProgress(manifest);
    const setupPhase = progress.find((p) => p.phase === 'setup');
    const uiPhase = progress.find((p) => p.phase === 'ui-components');

    expect(setupPhase).toEqual({
      phase: 'setup',
      total: 3,
      completed: 2,
      failed: 0,
      skipped: 0,
      pending: 1,
      inProgress: 0,
    });

    expect(uiPhase).toEqual({
      phase: 'ui-components',
      total: 1,
      completed: 0,
      failed: 1,
      skipped: 0,
      pending: 0,
      inProgress: 0,
    });
  });
});
