import { Command } from 'commander';

import { resolveSelectedFamilies } from '../interactive/familySelection';
import { loadProjectConfig } from '../lib/config';
import { FamilyKey } from '../lib/families';
import { useLocal, useRemote } from '../lib/localDev';
import { parseFamilyValues } from '../lib/parseFamilyValues';
import { printError, printJson, printUseLocalResult, printUseRemoteResult } from '../utils/logger';

interface UseCommandOptions {
  project: string;
  family: string[];
  json?: boolean;
}

/**
 * Registers the `use` command group for switching local-development modes.
 */
export function registerUseCommand(program: Command): void {
  const useCommand = program
    .command('use')
    .description('Switch between local and published package resolution.');

  useCommand
    .command('local')
    .description('Build, pack, and install local package families for a consumer app.')
    .option('-p, --project <path>', 'Consumer app root', process.cwd())
    .option(
      '-f, --family <family>',
      'Package family to enable',
      (value, previous: string[] = []) => [...previous, value],
      []
    )
    .option('--json', 'Emit machine-readable JSON output')
    .action(async (options: UseCommandOptions) => {
      try {
        const config = loadProjectConfig(options.project);
        const supportedFamilies = Object.keys(config.families) as FamilyKey[];
        const requestedFamilies = parseFamilyValues(options.family);
        const selectedFamilies = await resolveSelectedFamilies(
          requestedFamilies,
          supportedFamilies,
          Boolean(options.json)
        );
        const result = useLocal(options.project, selectedFamilies, {
          quiet: Boolean(options.json),
        });

        if (options.json) {
          printJson({ ok: true, action: 'use-local', ...result });
          return;
        }

        printUseLocalResult(result);
      } catch (error) {
        printError(error, Boolean(options.json));
      }
    });

  useCommand
    .command('remote')
    .description('Reinstall the app against published packages and remove local manifests.')
    .option('-p, --project <path>', 'Consumer app root', process.cwd())
    .option('--json', 'Emit machine-readable JSON output')
    .action((options: Omit<UseCommandOptions, 'family'>) => {
      try {
        const result = useRemote(options.project);

        if (options.json) {
          printJson({ ok: true, action: 'use-remote', ...result });
          return;
        }

        printUseRemoteResult(result);
      } catch (error) {
        printError(error, Boolean(options.json));
      }
    });
}
