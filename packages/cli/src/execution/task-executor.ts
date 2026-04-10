import fs from 'node:fs';
import path from 'node:path';

import { CLI_BRANDING, CLI_FAMILIES, OZ_CORE_PACKAGES } from '../branding';
import { loadSourceLibraries } from '../catalog';
import type { JsonCommandResult, JsonTaskStateSummary } from '../commands/migrate/json-results';
import {
  copyAgentFiles,
  copySkillFiles,
  ensurePnpmWorkspaceIsolation,
  ensureTailwindConfigStubIfNeeded,
  installPackages,
  normalizeTailwind,
  writeProviderTemplates,
} from '../init/setup';
import {
  readManifest,
  updateTaskStatus,
  writeManifest,
  type MigrationManifest,
  type MigrationTask,
} from '../manifest';
import { rewriteFile, type RewriteContext } from '../rewriter/rewriteFile';
import { checkTask, type TaskCheckResult } from '../verification/checker';

export interface ExecuteTaskOptions {
  manifestPath: string;
  taskId?: string;
  dryRun?: boolean;
}

export interface ExecuteTaskResult extends JsonCommandResult<'migrate-execute'> {
  manifest: string;
  dryRun: boolean;
  task: (JsonTaskStateSummary & { description: string }) | null;
  mode: 'applied' | 'manual' | 'none';
  changedFiles: string[];
  validation: TaskCheckResult | null;
  message?: string;
  instructions?: string[];
  nextTaskId?: string | null;
}

function dependenciesSatisfied(manifest: MigrationManifest, task: MigrationTask): boolean {
  const deps = task.dependsOn ?? [];
  if (deps.length === 0) return true;
  return deps.every((depId) => {
    const dep = manifest.tasks.find((candidate) => candidate.id === depId);
    return dep ? dep.status === 'completed' || dep.status === 'skipped' : false;
  });
}

function findNextActionableTask(manifest: MigrationManifest): MigrationTask | null {
  return (
    manifest.tasks.find(
      (task) =>
        (task.status === 'pending' || task.status === 'in_progress') &&
        dependenciesSatisfied(manifest, task)
    ) ?? null
  );
}

function resolveTask(manifest: MigrationManifest, taskId?: string): MigrationTask | null {
  if (taskId) {
    return manifest.tasks.find((task) => task.id === taskId) ?? null;
  }
  return findNextActionableTask(manifest);
}

function buildRewriteContext(task: MigrationTask, content: string): RewriteContext {
  const libraries = loadSourceLibraries();
  for (const library of Object.values(libraries)) {
    const matched = library.importPatterns.some((pattern) => content.includes(pattern));
    if (!matched || !task.sourceComponent) continue;

    const mapping = library.mappings[task.sourceComponent];
    if (!mapping) continue;

    return {
      propMappings: mapping.propMappings,
      variantMap: mapping.variantMap,
    };
  }

  return {};
}

function executeRewriteTask(
  task: MigrationTask,
  projectRoot: string,
  dryRun: boolean
): { changedFiles: string[]; instructions?: string[] } {
  if (!task.file) {
    throw new Error(`Task "${task.id}" is missing a target file.`);
  }

  const filePath = path.join(projectRoot, task.file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Target file not found: ${task.file}`);
  }

  const before = fs.readFileSync(filePath, 'utf8');
  const after = rewriteFile(task, before, buildRewriteContext(task, before));

  if (!dryRun && after !== before) {
    fs.writeFileSync(filePath, after, 'utf8');
  }

  return {
    changedFiles: [task.file],
    instructions:
      after === before
        ? [
            'No deterministic rewrite was necessary; validation will confirm whether the task is already satisfied.',
          ]
        : undefined,
  };
}

function executeSetupTask(
  task: MigrationTask,
  projectRoot: string,
  dryRun: boolean
): { changedFiles: string[]; instructions?: string[] } {
  if (dryRun) {
    switch (task.type) {
      case 'install-packages':
        return {
          changedFiles: ['package.json'],
          instructions: [`Would install ${OZ_CORE_PACKAGES.join(', ')}`],
        };
      case 'wire-providers':
        return {
          changedFiles: [
            'src/oz/OzProviders.tsx',
            'src/oz/resolve-runtime.ts',
            'src/oz/runtime-providers.tsx',
            'src/main.tsx',
          ],
          instructions: [
            'Entry file may be src/main.tsx, src/main.jsx, src/index.tsx, or src/index.jsx — only an existing candidate is patched.',
          ],
        };
      case 'tailwind-normalize':
        return { changedFiles: ['tailwind.config.ts'] };
      case 'copy-agents':
        return {
          changedFiles: [
            '.cursor/agents/migration-analyzer.md',
            '.cursor/agents/migration-executor.md',
            '.cursor/agents/migration-verifier.md',
            '.claude/agents/migration-analyzer.md',
            '.claude/agents/migration-executor.md',
            '.claude/agents/migration-verifier.md',
          ],
        };
      case 'copy-skill':
        return {
          changedFiles: [
            '.cursor/skills/migrate-to-oz-uikit/SKILL.md',
            '.claude/skills/migrate-to-oz-uikit/SKILL.md',
          ],
        };
    }
  }

  switch (task.type) {
    case 'install-packages':
      ensurePnpmWorkspaceIsolation(projectRoot);
      installPackages(projectRoot, OZ_CORE_PACKAGES, false);
      return { changedFiles: ['package.json'] };
    case 'wire-providers':
      return { changedFiles: writeProviderTemplates(projectRoot) };
    case 'tailwind-normalize': {
      const changed = normalizeTailwind(projectRoot, CLI_FAMILIES, CLI_BRANDING);
      ensureTailwindConfigStubIfNeeded(projectRoot, CLI_FAMILIES);
      return {
        changedFiles: changed ? ['tailwind.config.ts'] : [],
        instructions: changed ? undefined : ['Tailwind configuration was already normalized.'],
      };
    }
    case 'copy-agents':
      return { changedFiles: copyAgentFiles(projectRoot) };
    case 'copy-skill':
      return { changedFiles: copySkillFiles(projectRoot) };
  }
}

function manualInstructions(task: MigrationTask): string[] {
  const targetFiles = task.files?.length ? task.files : task.file ? [task.file] : [];
  const fileHint =
    targetFiles.length > 0
      ? `Affected file${targetFiles.length === 1 ? '' : 's'}: ${targetFiles.join(', ')}`
      : '';

  switch (task.type) {
    case 'wallet-replacement':
      return [
        'Replace legacy wallet or chain hooks with OpenZeppelin runtime hooks such as useRuntimeContext() and useWalletState().',
        fileHint,
        'Rerun doctor after the refactor to verify legacy imports are gone.',
      ].filter(Boolean);
    case 'storage-migration':
      return [
        'Review the persistence flow manually and add a manual-review marker describing the affected storage keys.',
        fileHint,
        'Data migration remains out of scope; keep behavior the same and flag follow-up work explicitly.',
      ].filter(Boolean);
    case 'schema-driven-form':
      return [
        'Review this form surface manually for RenderFormSchema or TransactionForm migration.',
        fileHint,
        'Validate the rendered UI after refactoring; doctor only checks for structural signals.',
      ].filter(Boolean);
    default:
      return ['This task type requires manual execution.'];
  }
}

function applyTask(
  task: MigrationTask,
  projectRoot: string,
  dryRun: boolean
): { mode: 'applied' | 'manual'; changedFiles: string[]; instructions?: string[] } {
  switch (task.type) {
    case 'install-packages':
    case 'wire-providers':
    case 'tailwind-normalize':
    case 'copy-agents':
    case 'copy-skill':
      return { mode: 'applied', ...executeSetupTask(task, projectRoot, dryRun) };
    case 'component-replacement':
    case 'form-field-replacement':
      return { mode: 'applied', ...executeRewriteTask(task, projectRoot, dryRun) };
    case 'wallet-replacement':
    case 'storage-migration':
    case 'schema-driven-form':
      return { mode: 'manual', changedFiles: [], instructions: manualInstructions(task) };
  }
}

export function executeTask(options: ExecuteTaskOptions): ExecuteTaskResult {
  const manifestPath = path.resolve(options.manifestPath);
  const dryRun = Boolean(options.dryRun);
  const manifest = readManifest(manifestPath);
  const task = resolveTask(manifest, options.taskId);

  if (!task) {
    return {
      ok: true,
      action: 'migrate-execute',
      manifest: manifestPath,
      dryRun,
      task: null,
      mode: 'none',
      changedFiles: [],
      validation: null,
      message: options.taskId
        ? `Task "${options.taskId}" not found in manifest.`
        : 'No actionable task found.',
      nextTaskId: null,
    };
  }

  if (!dependenciesSatisfied(manifest, task)) {
    const blockedBy = (task.dependsOn ?? []).filter((depId) => {
      const dep = manifest.tasks.find((candidate) => candidate.id === depId);
      return !dep || (dep.status !== 'completed' && dep.status !== 'skipped');
    });

    return {
      ok: false,
      action: 'migrate-execute',
      manifest: manifestPath,
      dryRun,
      task: {
        id: task.id,
        phase: task.phase,
        phaseDetail: task.phaseDetail,
        type: task.type,
        description: task.description,
        statusBefore: task.status,
        statusAfter: task.status,
      },
      mode: 'none',
      changedFiles: [],
      validation: null,
      message: `Task is blocked by incomplete dependencies: ${blockedBy.join(', ')}`,
      nextTaskId: findNextActionableTask(manifest)?.id ?? null,
    };
  }

  if (dryRun) {
    const applied = applyTask(task, manifest.projectRoot, true);
    return {
      ok: true,
      action: 'migrate-execute',
      manifest: manifestPath,
      dryRun: true,
      task: {
        id: task.id,
        phase: task.phase,
        phaseDetail: task.phaseDetail,
        type: task.type,
        description: task.description,
        statusBefore: task.status,
        statusAfter: task.status,
      },
      mode: applied.mode,
      changedFiles: applied.changedFiles,
      validation: null,
      instructions: applied.instructions,
      nextTaskId: findNextActionableTask(manifest)?.id ?? null,
    };
  }

  if (
    task.type === 'wallet-replacement' ||
    task.type === 'storage-migration' ||
    task.type === 'schema-driven-form'
  ) {
    return {
      ok: true,
      action: 'migrate-execute',
      manifest: manifestPath,
      dryRun: false,
      task: {
        id: task.id,
        phase: task.phase,
        phaseDetail: task.phaseDetail,
        type: task.type,
        description: task.description,
        statusBefore: task.status,
        statusAfter: task.status,
      },
      mode: 'manual',
      changedFiles: [],
      validation: null,
      instructions: manualInstructions(task),
      nextTaskId: task.id,
    };
  }

  let workingManifest = updateTaskStatus(manifest, task.id, 'in_progress');
  writeManifest(manifestPath, workingManifest);

  try {
    const applied = applyTask(task, manifest.projectRoot, false);
    const validation = checkTask(task, manifest.projectRoot);

    if (!validation.passed) {
      workingManifest = updateTaskStatus(
        workingManifest,
        task.id,
        'failed',
        validation.diagnostics.join('; ')
      );
      writeManifest(manifestPath, workingManifest);

      return {
        ok: false,
        action: 'migrate-execute',
        manifest: manifestPath,
        dryRun: false,
        task: {
          id: task.id,
          phase: task.phase,
          phaseDetail: task.phaseDetail,
          type: task.type,
          description: task.description,
          statusBefore: task.status,
          statusAfter: 'failed',
        },
        mode: applied.mode,
        changedFiles: applied.changedFiles,
        validation,
        instructions: applied.instructions,
        nextTaskId: task.id,
      };
    }

    workingManifest = updateTaskStatus(workingManifest, task.id, 'completed');
    writeManifest(manifestPath, workingManifest);

    return {
      ok: true,
      action: 'migrate-execute',
      manifest: manifestPath,
      dryRun: false,
      task: {
        id: task.id,
        phase: task.phase,
        phaseDetail: task.phaseDetail,
        type: task.type,
        description: task.description,
        statusBefore: task.status,
        statusAfter: 'completed',
      },
      mode: applied.mode,
      changedFiles: applied.changedFiles,
      validation,
      instructions: applied.instructions,
      nextTaskId: findNextActionableTask(workingManifest)?.id ?? null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    workingManifest = updateTaskStatus(workingManifest, task.id, 'failed', message);
    writeManifest(manifestPath, workingManifest);

    return {
      ok: false,
      action: 'migrate-execute',
      manifest: manifestPath,
      dryRun: false,
      task: {
        id: task.id,
        phase: task.phase,
        phaseDetail: task.phaseDetail,
        type: task.type,
        description: task.description,
        statusBefore: task.status,
        statusAfter: 'failed',
      },
      mode: 'applied',
      changedFiles: [],
      validation: null,
      message,
      nextTaskId: task.id,
    };
  }
}
