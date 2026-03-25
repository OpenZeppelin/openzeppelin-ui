import { Command } from 'commander';

import { doctorProject } from '../lib/localDev';
import { printDoctorResult, printError, printJson } from '../utils/logger';

interface DoctorCommandOptions {
  project: string;
  json?: boolean;
}

/**
 * Registers the `doctor` command for validating local-development setup.
 */
export function registerDoctorCommand(program: Command): void {
  program
    .command('doctor')
    .description('Validate the local development configuration and packed manifests.')
    .option('-p, --project <path>', 'Consumer app root', process.cwd())
    .option('--json', 'Emit machine-readable JSON output')
    .action((options: DoctorCommandOptions) => {
      try {
        const result = doctorProject(options.project);

        if (options.json) {
          printJson({ action: 'doctor', ...result });
          if (!result.ok) {
            process.exitCode = 1;
          }
          return;
        }

        printDoctorResult(result);
        if (!result.ok) {
          process.exitCode = 1;
        }
      } catch (error) {
        printError(error, Boolean(options.json));
      }
    });
}
