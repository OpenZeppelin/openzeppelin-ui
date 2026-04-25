import path from 'node:path';
import { Command } from 'commander';
import pc from 'picocolors';

import { readManifest, resolveTask, transitionTaskStatus, writeManifest } from '../../manifest';
import { printError, printJson } from '../../utils/logger';
import type { JsonCommandResult, JsonTaskStateSummary } from './json-results';

interface FailOptions {
  manifest: string;
  task: string;
  reason: string;
  json?: boolean;
}

interface FailResult extends JsonCommandResult<'migrate-fail'> {
  manifest: string;
  task: JsonTaskStateSummary & {
    error: string;
  };
}

/**
 *
 */
export function registerFailCommand(parent: Command): void {
  parent
    .command('fail')
    .description('Mark a task as failed with a reason so the manifest records the blocker.')
    .requiredOption('-m, --manifest <path>', 'Path to migration-manifest.json')
    .requiredOption('-t, --task <id>', 'Task id to mark as failed')
    .requiredOption('-r, --reason <text>', 'Reason or blocker to record on the task')
    .option('--json', 'Emit machine-readable JSON output')
    .action((options: FailOptions) => {
      try {
        const manifestPath = path.resolve(options.manifest);
        const manifest = readManifest(manifestPath);
        const task = resolveTask(manifest, options.task);
        const updated = transitionTaskStatus(manifest, task.id, 'failed', options.reason);
        writeManifest(manifestPath, updated);

        const result: FailResult = {
          ok: true,
          action: 'migrate-fail',
          manifest: manifestPath,
          task: {
            id: task.id,
            phase: task.phase,
            phaseDetail: task.phaseDetail,
            type: task.type,
            statusBefore: task.status,
            statusAfter: resolveTask(updated, task.id).status,
            error: resolveTask(updated, task.id).error ?? options.reason,
          },
        };

        if (options.json) {
          printJson(result);
          return;
        }

        process.stdout.write(pc.yellow(`Marked ${task.id} as failed.\n`));
        process.stdout.write(`  Reason: ${options.reason}\n`);
      } catch (error) {
        printError(error, Boolean(options.json));
      }
    });
}
