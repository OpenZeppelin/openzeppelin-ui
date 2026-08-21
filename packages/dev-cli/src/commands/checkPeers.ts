import { Command } from 'commander';

import { checkAdapterPeers } from '../lib/adapterPeers';
import { printAdapterPeerResult, printError, printJson } from '../utils/logger';

interface CheckPeersCommandOptions {
  project: string;
  json?: boolean;
}

/**
 * Registers the `check-peers` command for validating installed adapter peer versions.
 *
 * Deliberately separate from `doctor`: `doctor` validates the local-development
 * workflow (families, repo roots, packed manifests) and is expected to report issues
 * in CI, where local development is off. This guard has to pass there.
 */
export function registerCheckPeersCommand(program: Command): void {
  program
    .command('check-peers')
    .description(
      'Fail if an installed @openzeppelin/ui-* package is older than an installed @openzeppelin/adapter-* requires.'
    )
    .option('-p, --project <path>', 'Consumer app root', process.cwd())
    .option('--json', 'Emit machine-readable JSON output')
    .action((options: CheckPeersCommandOptions) => {
      try {
        const result = checkAdapterPeers(options.project);

        if (options.json) {
          printJson({ action: 'check-peers', ...result });
          if (!result.ok) {
            process.exitCode = 1;
          }
          return;
        }

        printAdapterPeerResult(result);
        if (!result.ok) {
          process.exitCode = 1;
        }
      } catch (error) {
        printError(error, Boolean(options.json));
      }
    });
}
