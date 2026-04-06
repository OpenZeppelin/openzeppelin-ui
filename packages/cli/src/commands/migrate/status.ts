import path from 'node:path';
import { Command } from 'commander';
import pc from 'picocolors';

import {
  computePhaseProgress,
  readManifest,
  type MigrationManifest,
  type MigrationTask,
  type PhaseProgress,
} from '../../manifest';
import { printError, printJson } from '../../utils/logger';
import type { JsonCommandResult } from './json-results';

interface StatusOptions {
  manifest: string;
  next?: boolean;
  json?: boolean;
}

interface NextTaskSummary {
  id: string;
  phase: string;
  phaseDetail?: string;
  phaseDescription?: string;
  type: string;
  description: string;
  status: string;
  dependsOn: string[];
  validationCommand?: string;
  suggestedCommands: string[];
  suggestedPrimaryCommand?: string;
}

interface StatusResult extends JsonCommandResult<'migrate-status'> {
  manifest: string;
  phases: PhaseProgress[];
  phaseDescriptions?: Record<string, string>;
  totalTasks: number;
  completedTasks: number;
  percentComplete: number;
  nextTask: NextTaskSummary | null;
}

function dependenciesSatisfied(manifest: MigrationManifest, task: MigrationTask): boolean {
  const dependencies = task.dependsOn ?? [];
  return dependencies.every((dependencyId) => {
    const dependency = manifest.tasks.find((candidate) => candidate.id === dependencyId);
    return dependency
      ? dependency.status === 'completed' || dependency.status === 'skipped'
      : false;
  });
}

function isManualTask(task: MigrationTask): boolean {
  return (
    task.type === 'wallet-replacement' ||
    task.type === 'storage-migration' ||
    task.type === 'schema-driven-form'
  );
}

function suggestedCommandsForTask(task: MigrationTask, manifestPath: string): string[] {
  const manifestArg = path.relative(process.cwd(), manifestPath) || manifestPath;
  const executeCommand = `oz-ui migrate execute --manifest ${manifestArg} --task ${task.id}`;
  const validateCommand =
    task.validation?.command ??
    `oz-ui migrate doctor --manifest ${manifestArg} --check ${task.id} --json`;
  const completeCommand = `oz-ui migrate complete --manifest ${manifestArg} --task ${task.id}`;
  const failCommand = `oz-ui migrate fail --manifest ${manifestArg} --task ${task.id} --reason "<blocker>"`;

  if (task.status === 'pending') {
    return [executeCommand];
  }

  if (task.status === 'in_progress') {
    if (isManualTask(task)) {
      return [validateCommand, completeCommand, failCommand];
    }
    return [executeCommand, validateCommand];
  }

  return [];
}

/**
 *
 */
export function registerStatusCommand(parent: Command): void {
  parent
    .command('status')
    .description('Show migration progress per phase from the manifest.')
    .requiredOption('-m, --manifest <path>', 'Path to migration-manifest.json')
    .option('--next', 'Print only the next actionable task')
    .option('--json', 'Emit machine-readable JSON output')
    .action((options: StatusOptions) => {
      try {
        const manifestPath = path.resolve(options.manifest);
        const manifest = readManifest(manifestPath);
        const phases = computePhaseProgress(manifest);

        const totalTasks = manifest.tasks.length;
        const completedTasks = manifest.tasks.filter(
          (t) => t.status === 'completed' || t.status === 'skipped'
        ).length;
        const percentComplete =
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const nextTask =
          manifest.tasks.find(
            (t) =>
              (t.status === 'pending' || t.status === 'in_progress') &&
              dependenciesSatisfied(manifest, t)
          ) ?? null;
        const nextTaskSuggestions = nextTask
          ? suggestedCommandsForTask(nextTask, manifestPath)
          : [];
        const nextTaskSummary: NextTaskSummary | null = nextTask
          ? {
              id: nextTask.id,
              phase: nextTask.phase,
              phaseDetail: nextTask.phaseDetail,
              phaseDescription: manifest.phaseDescriptions?.[nextTask.phase],
              type: nextTask.type,
              description: nextTask.description,
              status: nextTask.status,
              dependsOn: nextTask.dependsOn ?? [],
              validationCommand: nextTask.validation?.command,
              suggestedCommands: nextTaskSuggestions,
              suggestedPrimaryCommand: nextTaskSuggestions[0],
            }
          : null;

        const result: StatusResult = {
          ok: true,
          action: 'migrate-status',
          manifest: manifestPath,
          phases,
          phaseDescriptions: manifest.phaseDescriptions,
          totalTasks,
          completedTasks,
          percentComplete,
          nextTask: nextTaskSummary,
        };

        if (options.json) {
          printJson(result);
          return;
        }

        if (options.next) {
          if (nextTaskSummary) {
            process.stdout.write(pc.bold(`\nNext Task\n`));
            process.stdout.write(`${'─'.repeat(50)}\n`);
            process.stdout.write(`  ID:          ${nextTaskSummary.id}\n`);
            process.stdout.write(`  Phase:       ${nextTaskSummary.phase}\n`);
            if (nextTaskSummary.phaseDetail) {
              process.stdout.write(`  Subphase:    ${nextTaskSummary.phaseDetail}\n`);
            }
            process.stdout.write(`  Status:      ${nextTaskSummary.status}\n`);
            process.stdout.write(`  Type:        ${nextTaskSummary.type}\n`);
            process.stdout.write(`  Description: ${nextTaskSummary.description}\n`);
            if (nextTaskSummary.phaseDescription) {
              process.stdout.write(`  Phase info:  ${nextTaskSummary.phaseDescription}\n`);
            }
            if (nextTaskSummary.dependsOn.length > 0) {
              process.stdout.write(`  Depends on:  ${nextTaskSummary.dependsOn.join(', ')}\n`);
            }
            if (nextTaskSummary.validationCommand) {
              process.stdout.write(`  Validate:    ${nextTaskSummary.validationCommand}\n`);
            }
            if (nextTaskSummary.suggestedCommands.length > 0) {
              process.stdout.write(`  Suggested:\n`);
              for (const command of nextTaskSummary.suggestedCommands) {
                process.stdout.write(`    ${command}\n`);
              }
            }
            process.stdout.write('\n');
          } else {
            process.stdout.write(pc.green('No pending tasks remain.\n'));
          }
          return;
        }

        process.stdout.write(pc.bold(`\nMigration Status — ${percentComplete}% complete\n`));
        process.stdout.write(`${'─'.repeat(50)}\n`);
        process.stdout.write(`  Framework: ${manifest.framework}\n`);
        process.stdout.write(`  Profile:   ${manifest.profile ?? 'not set'}\n`);
        process.stdout.write(`  Tasks:     ${completedTasks}/${totalTasks}\n\n`);

        for (const phase of phases) {
          if (phase.total === 0) continue;

          const pct = Math.round((phase.completed / phase.total) * 100);
          const bar = renderProgressBar(pct, 20);
          const status =
            phase.completed === phase.total
              ? pc.green('done')
              : phase.inProgress > 0
                ? pc.yellow('active')
                : pc.dim('pending');

          process.stdout.write(
            `  ${phase.phase.padEnd(16)} ${bar} ${pct.toString().padStart(3)}% (${phase.completed}/${phase.total}) ${status}\n`
          );

          if (phase.failed > 0) {
            process.stdout.write(`    ${pc.red(`${phase.failed} failed`)}\n`);
          }
        }

        if (nextTaskSummary) {
          process.stdout.write(`\n  ${pc.bold('Next:')} ${nextTaskSummary.description}\n`);
          if (nextTaskSummary.suggestedPrimaryCommand) {
            process.stdout.write(
              `  ${pc.bold('Do:')}   ${nextTaskSummary.suggestedPrimaryCommand}\n`
            );
          }
        }

        process.stdout.write('\n');
      } catch (error) {
        printError(error, Boolean(options.json));
      }
    });
}

function renderProgressBar(percent: number, width: number): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return `[${pc.green('█'.repeat(filled))}${pc.dim('░'.repeat(empty))}]`;
}
