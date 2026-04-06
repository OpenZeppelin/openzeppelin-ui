import path from 'node:path';
import { Command } from 'commander';
import pc from 'picocolors';

import { computePhaseProgress, readManifest, type PhaseProgress } from '../../manifest';
import { printError, printJson } from '../../utils/logger';

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
  description: string;
  status: string;
  dependsOn: string[];
  validationCommand?: string;
}

interface StatusResult {
  ok: boolean;
  action: 'migrate-status';
  manifest: string;
  phases: PhaseProgress[];
  phaseDescriptions?: Record<string, string>;
  totalTasks: number;
  completedTasks: number;
  percentComplete: number;
  nextTask: NextTaskSummary | null;
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
        const nextTask = manifest.tasks.find(
          (t) => t.status === 'pending' || t.status === 'in_progress'
        );
        const nextTaskSummary: NextTaskSummary | null = nextTask
          ? {
              id: nextTask.id,
              phase: nextTask.phase,
              phaseDetail: nextTask.phaseDetail,
              phaseDescription: manifest.phaseDescriptions?.[nextTask.phase],
              description: nextTask.description,
              status: nextTask.status,
              dependsOn: nextTask.dependsOn ?? [],
              validationCommand: nextTask.validation?.command,
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
