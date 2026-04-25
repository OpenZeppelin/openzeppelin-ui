import path from 'node:path';
import { Command } from 'commander';
import pc from 'picocolors';

import { readManifest, resolveTask, transitionTaskStatus, writeManifest } from '../../manifest';
import { printError, printJson } from '../../utils/logger';
import { checkTask, type TaskCheckResult } from '../../verification/checker';
import type { JsonCommandResult, JsonTaskStateSummary } from './json-results';

interface CompleteOptions {
  manifest: string;
  task: string;
  force?: boolean;
  json?: boolean;
}

interface CompleteResult extends JsonCommandResult<'migrate-complete'> {
  manifest: string;
  forced: boolean;
  task: JsonTaskStateSummary;
  validation: TaskCheckResult | null;
}

/**
 *
 */
export function registerCompleteCommand(parent: Command): void {
  parent
    .command('complete')
    .description(
      'Mark a task as completed after manual work. Runs doctor-style validation first unless --force is used.'
    )
    .requiredOption('-m, --manifest <path>', 'Path to migration-manifest.json')
    .requiredOption('-t, --task <id>', 'Task id to mark as completed')
    .option('--force', 'Mark the task completed even if validation fails')
    .option('--json', 'Emit machine-readable JSON output')
    .action((options: CompleteOptions) => {
      try {
        const manifestPath = path.resolve(options.manifest);
        const manifest = readManifest(manifestPath);
        const task = resolveTask(manifest, options.task);
        const validation = options.force ? null : checkTask(task, manifest.projectRoot);

        if (validation && !validation.passed) {
          const result: CompleteResult = {
            ok: false,
            action: 'migrate-complete',
            manifest: manifestPath,
            forced: false,
            task: {
              id: task.id,
              phase: task.phase,
              phaseDetail: task.phaseDetail,
              type: task.type,
              statusBefore: task.status,
              statusAfter: task.status,
            },
            validation,
          };

          if (options.json) {
            printJson(result);
          } else {
            process.stdout.write(pc.red(`Cannot complete ${task.id}; validation failed.\n`));
            for (const diagnostic of validation.diagnostics) {
              process.stdout.write(`  - ${diagnostic}\n`);
            }
            for (const warning of validation.warnings ?? []) {
              process.stdout.write(`  - ${warning}\n`);
            }
          }
          process.exitCode = 1;
          return;
        }

        const updated = transitionTaskStatus(manifest, task.id, 'completed');
        writeManifest(manifestPath, updated);

        const result: CompleteResult = {
          ok: true,
          action: 'migrate-complete',
          manifest: manifestPath,
          forced: Boolean(options.force),
          task: {
            id: task.id,
            phase: task.phase,
            phaseDetail: task.phaseDetail,
            type: task.type,
            statusBefore: task.status,
            statusAfter: resolveTask(updated, task.id).status,
          },
          validation,
        };

        if (options.json) {
          printJson(result);
          return;
        }

        process.stdout.write(pc.green(`Marked ${task.id} as completed.\n`));
        if (validation?.warnings?.length) {
          for (const warning of validation.warnings) {
            process.stdout.write(`  - ${warning}\n`);
          }
        }
      } catch (error) {
        printError(error, Boolean(options.json));
      }
    });
}
