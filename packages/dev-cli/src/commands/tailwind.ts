import { Command } from 'commander';

import { doctorTailwindProject } from '../lib/tailwind/doctor';
import { fixTailwindProject, printTailwindProject } from '../lib/tailwind/fix';
import {
  printError,
  printJson,
  printTailwindDoctorResult,
  printTailwindFixResult,
  printTailwindPrintResult,
} from '../utils/logger';

interface TailwindCommandOptions {
  project: string;
  css?: string;
  json?: boolean;
  dryRun?: boolean;
}

/**
 * Registers the `tailwind` command group for Tailwind diagnosis and repair.
 */
export function registerTailwindCommand(program: Command): void {
  const tailwindCommand = program
    .command('tailwind')
    .description('Inspect and normalize Tailwind source wiring for OpenZeppelin packages.');

  tailwindCommand
    .command('doctor')
    .description('Validate the Tailwind source configuration for a consumer app.')
    .option('-p, --project <path>', 'Consumer app root', process.cwd())
    .option('--css <path>', 'Override the detected entry stylesheet')
    .option('--json', 'Emit machine-readable JSON output')
    .action((options: TailwindCommandOptions) => {
      try {
        const result = doctorTailwindProject(options.project, options.css);

        if (options.json) {
          printJson({ action: 'tailwind-doctor', ...result });
          if (!result.ok) {
            process.exitCode = 1;
          }
          return;
        }

        printTailwindDoctorResult(result);
        if (!result.ok) {
          process.exitCode = 1;
        }
      } catch (error) {
        printError(error, Boolean(options.json));
      }
    });

  tailwindCommand
    .command('fix')
    .description('Normalize Tailwind setup into a managed generated stylesheet.')
    .option('-p, --project <path>', 'Consumer app root', process.cwd())
    .option('--css <path>', 'Override the detected entry stylesheet')
    .option('--dry-run', 'Show planned file changes without writing them')
    .option('--json', 'Emit machine-readable JSON output')
    .action((options: TailwindCommandOptions) => {
      try {
        const result = fixTailwindProject(options.project, {
          cssPath: options.css,
          dryRun: Boolean(options.dryRun),
        });

        if (options.json) {
          printJson({ action: 'tailwind-fix', ...result });
          if (!result.ok) {
            process.exitCode = 1;
          }
          return;
        }

        printTailwindFixResult(result, Boolean(options.dryRun));
        if (!result.ok) {
          process.exitCode = 1;
        }
      } catch (error) {
        printError(error, Boolean(options.json));
      }
    });

  tailwindCommand
    .command('print')
    .description('Print the resolved Tailwind source plan for a consumer app.')
    .option('-p, --project <path>', 'Consumer app root', process.cwd())
    .option('--css <path>', 'Override the detected entry stylesheet')
    .option('--json', 'Emit machine-readable JSON output')
    .action((options: TailwindCommandOptions) => {
      try {
        const result = printTailwindProject(options.project, options.css);

        if (options.json) {
          printJson({ action: 'tailwind-print', ...result });
          if (!result.ok) {
            process.exitCode = 1;
          }
          return;
        }

        printTailwindPrintResult(result);
        if (!result.ok) {
          process.exitCode = 1;
        }
      } catch (error) {
        printError(error, Boolean(options.json));
      }
    });
}
