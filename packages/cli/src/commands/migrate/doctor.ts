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
  warnings: number;
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
        const warnings = results.filter((r) => r.severity === 'warning').length;
        const failed = results.filter((r) => !r.passed).length;

        const doctorResult: DoctorResult = {
          ok: failed === 0,
          action: 'migrate-doctor',
          manifest: manifestPath,
          results,
          passed,
          warnings,
          failed,
          total: results.length,
        };

        if (options.json) {
          printJson(doctorResult);
          if (!doctorResult.ok) process.exitCode = 1;
          return;
        }

        if (doctorResult.ok) {
          const warningSuffix = warnings > 0 ? pc.yellow(` (${warnings} with warnings)`) : '';
          process.stdout.write(
            pc.green(`Doctor: all ${passed} checks passed`) + warningSuffix + '\n'
          );
        } else {
          process.stdout.write(pc.red(`Doctor: ${failed}/${results.length} checks failed\n`));
        }

        for (const result of results) {
          const icon =
            result.severity === 'fail'
              ? pc.red('✗')
              : result.severity === 'warning'
                ? pc.yellow('!')
                : pc.green('✓');
          process.stdout.write(`  ${icon} ${result.taskId}\n`);
          for (const diag of result.diagnostics) {
            process.stdout.write(`    ${pc.dim(diag)}\n`);
          }
          for (const warning of result.warnings ?? []) {
            process.stdout.write(`    ${pc.yellow(warning)}\n`);
          }
        }

        if (!doctorResult.ok) process.exitCode = 1;
      } catch (error) {
        printError(error, Boolean(options.json));
      }
    });
}
