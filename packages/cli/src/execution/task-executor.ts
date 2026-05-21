import fs from 'node:fs';
import path from 'node:path';

import {
  expectedAgentPathsForProfiles,
  expectedSkillPathsForProfiles,
  resolveManifestAgentProfiles,
  type AgentAssetProfile,
} from '../agent-assets';
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
import {
  checkEntryFileProviderSource,
  checkTask,
  type TaskCheckResult,
} from '../verification/checker';

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

function resolveProjectFilePath(projectRoot: string, relativeFilePath: string): string {
  if (path.isAbsolute(relativeFilePath)) {
    throw new Error(`Task file must be relative to project root: ${relativeFilePath}`);
  }

  const root = path.resolve(projectRoot);
  const resolved = path.resolve(root, relativeFilePath);
  const relative = path.relative(root, resolved);
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Task file escapes project root: ${relativeFilePath}`);
  }

  return resolved;
}

function executeRewriteTask(
  task: MigrationTask,
  projectRoot: string,
  dryRun: boolean
): { changedFiles: string[]; instructions?: string[] } {
  if (!task.file) {
    throw new Error(`Task "${task.id}" is missing a target file.`);
  }

  const filePath = resolveProjectFilePath(projectRoot, task.file);
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
  dryRun: boolean,
  agentAssetProfiles: AgentAssetProfile[]
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
      case 'copy-agents': {
        const files = expectedAgentPathsForProfiles(agentAssetProfiles);
        return {
          changedFiles: files,
          instructions:
            files.length === 0
              ? [
                  'No agent asset profiles are selected in the manifest; nothing would be copied for copy-agents.',
                ]
              : undefined,
        };
      }
      case 'copy-skill': {
        const files = expectedSkillPathsForProfiles(agentAssetProfiles);
        return {
          changedFiles: files,
          instructions:
            files.length === 0
              ? [
                  'No agent asset profiles are selected in the manifest; nothing would be copied for copy-skill.',
                ]
              : undefined,
        };
      }
      default:
        return { changedFiles: [] };
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
      return { changedFiles: copyAgentFiles(projectRoot, agentAssetProfiles) };
    case 'copy-skill':
      return { changedFiles: copySkillFiles(projectRoot, agentAssetProfiles) };
    default:
      return { changedFiles: [] };
  }
}

function manualInstructions(task: MigrationTask): string[] {
  const targetFiles = task.files?.length ? task.files : task.file ? [task.file] : [];
  const fileHint =
    targetFiles.length > 0
      ? `Affected file${targetFiles.length === 1 ? '' : 's'}: ${targetFiles.join(', ')}`
      : '';

  switch (task.type) {
    case 'activate-providers':
      return [
        'Switch the app entry file (src/main.tsx or equivalent) to import RuntimeProvider and WalletStateProvider from @openzeppelin/ui-react — not from the local runtime-providers stub.',
        'Use the generated OzProviders wrapper from src/oz/OzProviders.tsx, or import the providers directly from @openzeppelin/ui-react.',
        'The stub creates a different React context than OZ hooks expect, causing runtime errors.',
      ];
    case 'wallet-replacement':
      return [
        'Replace legacy wallet or chain hooks with OpenZeppelin runtime hooks such as useRuntimeContext() and useWalletState().',
        'Prerequisite: entry file must import providers from @openzeppelin/ui-react, not a local stub.',
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
    case 'remove-stale-deps':
      return [
        'Remove the source-library packages listed in the task notes from package.json.',
        ...(task.notes ?? []),
        'Run the package manager install command afterwards, then rerun doctor.',
      ];
    case 'cleanup-scaffolding':
      return [
        'Remove the runtime-providers.tsx stub if OzProviders.tsx uses @openzeppelin/ui-react directly.',
        'Update the entry file import to use OzProviders instead of the stub.',
        'Commit migration-manifest.json as a git artifact.',
        ...(task.notes ?? []),
      ];
    default:
      return ['This task type requires manual execution.'];
  }
}

/**
 * Checks preconditions that must be satisfied before a manual task can proceed.
 * Returns a failing TaskCheckResult if a precondition is violated, or null if all clear.
 */
function checkManualTaskPreconditions(
  task: MigrationTask,
  projectRoot: string
): TaskCheckResult | null {
  if (task.type === 'wallet-replacement') {
    const providerSource = checkEntryFileProviderSource(projectRoot);
    if (providerSource.entryFile && providerSource.fromStub && !providerSource.fromOz) {
      return {
        taskId: task.id,
        passed: false,
        severity: 'fail',
        diagnostics: [
          `Precondition failed: ${providerSource.entryFile} imports providers from a local stub, not @openzeppelin/ui-react.`,
          'Switch the entry file to use OzProviders (or import directly from @openzeppelin/ui-react) before starting wallet-replacement tasks.',
        ],
      };
    }
  }

  return null;
}

function applyTask(
  task: MigrationTask,
  projectRoot: string,
  dryRun: boolean,
  agentAssetProfiles: AgentAssetProfile[]
): { mode: 'applied' | 'manual'; changedFiles: string[]; instructions?: string[] } {
  switch (task.type) {
    case 'install-packages':
    case 'wire-providers':
    case 'tailwind-normalize':
    case 'copy-agents':
    case 'copy-skill':
      return {
        mode: 'applied',
        ...executeSetupTask(task, projectRoot, dryRun, agentAssetProfiles),
      };
    case 'component-replacement':
    case 'form-field-replacement':
      return { mode: 'applied', ...executeRewriteTask(task, projectRoot, dryRun) };
    case 'activate-providers':
    case 'wallet-replacement':
    case 'storage-migration':
    case 'schema-driven-form':
    case 'remove-stale-deps':
    case 'cleanup-scaffolding':
      return { mode: 'manual', changedFiles: [], instructions: manualInstructions(task) };
  }
}

/**
 *
 */
export function executeTask(options: ExecuteTaskOptions): ExecuteTaskResult {
  const manifestPath = path.resolve(options.manifestPath);
  const dryRun = Boolean(options.dryRun);
  const manifest = readManifest(manifestPath);
  const agentAssetProfiles = resolveManifestAgentProfiles(manifest);
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
    const applied = applyTask(task, manifest.projectRoot, true, agentAssetProfiles);
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
    task.type === 'activate-providers' ||
    task.type === 'wallet-replacement' ||
    task.type === 'storage-migration' ||
    task.type === 'schema-driven-form' ||
    task.type === 'remove-stale-deps' ||
    task.type === 'cleanup-scaffolding'
  ) {
    const preconditionFailure = checkManualTaskPreconditions(task, manifest.projectRoot);
    if (preconditionFailure) {
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
          statusAfter: task.status,
        },
        mode: 'manual',
        changedFiles: [],
        validation: preconditionFailure,
        message: preconditionFailure.diagnostics.join(' '),
        instructions: manualInstructions(task),
        nextTaskId: task.id,
      };
    }

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
    const applied = applyTask(task, manifest.projectRoot, false, agentAssetProfiles);
    const validation = checkTask(task, manifest.projectRoot, {
      agentAssetProfiles,
    });

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
