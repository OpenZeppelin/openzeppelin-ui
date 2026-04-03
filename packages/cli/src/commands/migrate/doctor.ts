import path from 'node:path';
import { Command } from 'commander';
import pc from 'picocolors';

import { readManifest } from '../../manifest';
import { printError, printJson } from '../../utils/logger';
import { checkTask, type TaskCheckResult } from '../../verification/checker';

interface DoctorOptions {
  manifest: string;
  check?: string;
  json?: boolean;
}

interface DoctorResult {
  ok: boolean;
  action: 'migrate-doctor';
  manifest: string;
  results: TaskCheckResult[];
  passed: number;
  failed: number;
  total: number;
}

/**
 *
 */
export function registerDoctorCommand(parent: Command): void {
  parent
    .command('doctor')
    .description(
      'Verify codebase state against manifest tasks. Output pass/fail per task with diagnostics.'
    )
    .requiredOption('-m, --manifest <path>', 'Path to migration-manifest.json')
    .option('--check <task-id>', 'Check a specific task only')
    .option('--json', 'Emit machine-readable JSON output')
    .action((options: DoctorOptions) => {
      try {
        const manifestPath = path.resolve(options.manifest);
        const manifest = readManifest(manifestPath);

        const tasksToCheck = options.check
          ? manifest.tasks.filter((t) => t.id === options.check)
          : manifest.tasks.filter((t) => t.status === 'completed' || t.status === 'in_progress');

        if (options.check && tasksToCheck.length === 0) {
          throw new Error(`Task "${options.check}" not found in manifest.`);
        }

        const results: TaskCheckResult[] = [];
        for (const task of tasksToCheck) {
          results.push(checkTask(task, manifest.projectRoot));
        }

        const passed = results.filter((r) => r.passed).length;
        const failed = results.filter((r) => !r.passed).length;

        const doctorResult: DoctorResult = {
          ok: failed === 0,
          action: 'migrate-doctor',
          manifest: manifestPath,
          results,
          passed,
          failed,
          total: results.length,
        };

        if (options.json) {
          printJson(doctorResult);
          if (!doctorResult.ok) process.exitCode = 1;
          return;
        }

        if (doctorResult.ok) {
          process.stdout.write(pc.green(`Doctor: all ${passed} checks passed\n`));
        } else {
          process.stdout.write(pc.red(`Doctor: ${failed}/${results.length} checks failed\n`));
        }

        for (const result of results) {
          const icon = result.passed ? pc.green('✓') : pc.red('✗');
          process.stdout.write(`  ${icon} ${result.taskId}\n`);
          for (const diag of result.diagnostics) {
            process.stdout.write(`    ${pc.dim(diag)}\n`);
          }
        }

        if (!doctorResult.ok) process.exitCode = 1;
      } catch (error) {
        printError(error, Boolean(options.json));
      }
    });
}
