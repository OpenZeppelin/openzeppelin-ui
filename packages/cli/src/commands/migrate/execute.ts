import path from 'node:path';
import { Command } from 'commander';
import pc from 'picocolors';

import { executeTask } from '../../execution/task-executor';
import { printError, printJson } from '../../utils/logger';

interface ExecuteOptions {
  manifest: string;
  task?: string;
  dryRun?: boolean;
  json?: boolean;
}

export function registerExecuteCommand(parent: Command): void {
  parent
    .command('execute')
    .description(
      'Execute the next actionable migration task. Deterministic setup and component tasks are applied automatically; manual-review tasks return guidance.'
    )
    .requiredOption('-m, --manifest <path>', 'Path to migration-manifest.json')
    .option('-t, --task <id>', 'Execute a specific task id instead of the next actionable task')
    .option(
      '--dry-run',
      'Preview what would be executed without editing files or updating the manifest'
    )
    .option('--json', 'Emit machine-readable JSON output')
    .action((options: ExecuteOptions) => {
      try {
        const result = executeTask({
          manifestPath: options.manifest,
          taskId: options.task,
          dryRun: options.dryRun,
        });

        if (options.json) {
          printJson(result);
          return;
        }

        if (!result.task) {
          process.stdout.write(`${pc.green(result.message ?? 'No actionable task found.')}\n`);
          return;
        }

        process.stdout.write(pc.bold(`\nMigration Execute\n`));
        process.stdout.write(`${'─'.repeat(50)}\n`);
        process.stdout.write(`  Task:        ${result.task.id}\n`);
        process.stdout.write(`  Phase:       ${result.task.phase}\n`);
        if (result.task.phaseDetail) {
          process.stdout.write(`  Subphase:    ${result.task.phaseDetail}\n`);
        }
        process.stdout.write(`  Type:        ${result.task.type}\n`);
        process.stdout.write(`  Mode:        ${result.mode}\n`);
        process.stdout.write(`  Dry run:     ${result.dryRun ? 'yes' : 'no'}\n`);
        process.stdout.write(`  Description: ${result.task.description}\n`);
        process.stdout.write(
          `  Status:      ${result.task.statusBefore} -> ${result.task.statusAfter}\n`
        );

        if (result.changedFiles.length > 0) {
          process.stdout.write(`  Changed:     ${result.changedFiles.join(', ')}\n`);
        }

        if (result.validation) {
          process.stdout.write(`  Validation:  ${result.validation.severity}\n`);
        }

        if (result.message) {
          process.stdout.write(`  Note:        ${result.message}\n`);
        }

        if (result.instructions && result.instructions.length > 0) {
          process.stdout.write(`\n${pc.bold('Instructions')}\n`);
          for (const instruction of result.instructions) {
            process.stdout.write(`  - ${instruction}\n`);
          }
        }

        if (result.validation?.diagnostics.length) {
          process.stdout.write(`\n${pc.bold('Diagnostics')}\n`);
          for (const diagnostic of result.validation.diagnostics) {
            process.stdout.write(`  - ${diagnostic}\n`);
          }
        }

        if (result.validation?.warnings?.length) {
          process.stdout.write(`\n${pc.bold('Warnings')}\n`);
          for (const warning of result.validation.warnings) {
            process.stdout.write(`  - ${warning}\n`);
          }
        }

        if (result.nextTaskId) {
          process.stdout.write(`\n  Next task:   ${result.nextTaskId}\n`);
        }

        process.stdout.write(
          `  Manifest:    ${path.relative(process.cwd(), result.manifest) || result.manifest}\n\n`
        );

        if (!result.ok) {
          process.exitCode = 1;
        }
      } catch (error) {
        printError(error, Boolean(options.json));
      }
    });
}
