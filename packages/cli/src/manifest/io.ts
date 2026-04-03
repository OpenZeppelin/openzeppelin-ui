import fs from 'node:fs';
import path from 'node:path';

import {
  CURRENT_SCHEMA_VERSION,
  MANIFEST_FILENAME,
  type MigrationManifest,
  type MigrationTask,
  type PhaseProgress,
  type TaskStatus,
} from './schema';
import { assertValidTransition } from './transitions';

/**
 *
 */
export function getManifestPath(projectRoot: string): string {
  return path.join(projectRoot, MANIFEST_FILENAME);
}

/**
 *
 */
export function manifestExists(projectRoot: string): boolean {
  return fs.existsSync(getManifestPath(projectRoot));
}

/**
 *
 */
export function readManifest(manifestPath: string): MigrationManifest {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found at ${manifestPath}`);
  }

  const raw = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(raw) as MigrationManifest;

  validateManifest(manifest);
  return manifest;
}

/**
 *
 */
export function writeManifest(manifestPath: string, manifest: MigrationManifest): void {
  manifest.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
}

/**
 *
 */
export function updateTaskStatus(
  manifest: MigrationManifest,
  taskId: string,
  newStatus: TaskStatus,
  error?: string
): MigrationManifest {
  const taskIndex = manifest.tasks.findIndex((t) => t.id === taskId);
  if (taskIndex === -1) {
    throw new Error(`Task "${taskId}" not found in manifest.`);
  }

  const task = manifest.tasks[taskIndex];
  assertValidTransition(task.status, newStatus, taskId);

  const updatedTask: MigrationTask = {
    ...task,
    status: newStatus,
    error: newStatus === 'failed' ? error : undefined,
    completedAt: newStatus === 'completed' ? new Date().toISOString() : task.completedAt,
  };

  const updatedTasks = [...manifest.tasks];
  updatedTasks[taskIndex] = updatedTask;

  return {
    ...manifest,
    tasks: updatedTasks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 *
 */
export function computePhaseProgress(manifest: MigrationManifest): PhaseProgress[] {
  const phaseMap = new Map<string, MigrationTask[]>();

  for (const phase of manifest.phases) {
    phaseMap.set(phase, []);
  }

  for (const task of manifest.tasks) {
    const tasks = phaseMap.get(task.phase) ?? [];
    tasks.push(task);
    phaseMap.set(task.phase, tasks);
  }

  return manifest.phases.map((phase) => {
    const tasks = phaseMap.get(phase) ?? [];
    return {
      phase,
      total: tasks.length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      failed: tasks.filter((t) => t.status === 'failed').length,
      skipped: tasks.filter((t) => t.status === 'skipped').length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    };
  });
}

function validateManifest(manifest: MigrationManifest): void {
  if (!manifest.schemaVersion) {
    throw new Error('Manifest is missing schemaVersion.');
  }

  const [major] = manifest.schemaVersion.split('.').map(Number);
  const [currentMajor] = CURRENT_SCHEMA_VERSION.split('.').map(Number);

  if (major > currentMajor) {
    throw new Error(
      `Manifest schema version ${manifest.schemaVersion} is newer than supported ${CURRENT_SCHEMA_VERSION}. ` +
        'Please upgrade @openzeppelin/ui-cli.'
    );
  }

  if (!manifest.tasks || !Array.isArray(manifest.tasks)) {
    throw new Error('Manifest is missing or has invalid tasks array.');
  }

  if (!manifest.phases || !Array.isArray(manifest.phases)) {
    throw new Error('Manifest is missing or has invalid phases array.');
  }
}

/**
 *
 */
export function createEmptyManifest(
  projectRoot: string,
  options: {
    catalogVersion: string;
    targetOzVersion: string;
    framework: MigrationManifest['framework'];
    sourceLibrary: string | null;
  }
): MigrationManifest {
  const now = new Date().toISOString();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    catalogVersion: options.catalogVersion,
    targetOzVersion: options.targetOzVersion,
    projectRoot,
    framework: options.framework,
    sourceLibrary: options.sourceLibrary,
    profile: null,
    scope: {},
    decisions: [],
    phases: [
      'setup',
      'ui-components',
      'form-fields',
      'schema-forms',
      'wallet-adapter',
      'storage',
      'cleanup',
    ],
    tasks: [],
    createdAt: now,
    updatedAt: now,
  };
}
