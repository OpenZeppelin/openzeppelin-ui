import path from 'node:path';
import { Command } from 'commander';
import pc from 'picocolors';

import { computePhaseProgress, readManifest, type PhaseProgress } from '../../manifest';
import { printError, printJson } from '../../utils/logger';

interface StatusOptions {
  manifest: string;
  json?: boolean;
}

interface StatusResult {
  ok: boolean;
  action: 'migrate-status';
  manifest: string;
  phases: PhaseProgress[];
  totalTasks: number;
  completedTasks: number;
  percentComplete: number;
}

/**
 *
 */
export function registerStatusCommand(parent: Command): void {
  parent
    .command('status')
    .description('Show migration progress per phase from the manifest.')
    .requiredOption('-m, --manifest <path>', 'Path to migration-manifest.json')
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

        const result: StatusResult = {
          ok: true,
          action: 'migrate-status',
          manifest: manifestPath,
          phases,
          totalTasks,
          completedTasks,
          percentComplete,
        };

        if (options.json) {
          printJson(result);
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

        const nextTask = manifest.tasks.find(
          (t) => t.status === 'pending' || t.status === 'in_progress'
        );
        if (nextTask) {
          process.stdout.write(`\n  ${pc.bold('Next:')} ${nextTask.description}\n`);
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
