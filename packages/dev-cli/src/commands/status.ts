import { Command } from 'commander';

import { collectStatus } from '../lib/localDev';
import { printError, printJson, printStatusResult } from '../utils/logger';

interface StatusCommandOptions {
  project: string;
  json?: boolean;
}

/**
 * Registers the `status` command for inspecting local-development state.
 */
export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show local development status for a consumer app.')
    .option('-p, --project <path>', 'Consumer app root', process.cwd())
    .option('--json', 'Emit machine-readable JSON output')
    .action((options: StatusCommandOptions) => {
      try {
        const result = collectStatus(options.project);

        if (options.json) {
          printJson({ ok: true, action: 'status', ...result });
          return;
        }

        printStatusResult(result);
      } catch (error) {
        printError(error, Boolean(options.json));
      }
    });
}
