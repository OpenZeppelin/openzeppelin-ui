import { Command } from 'commander';

import { resolveSelectedFamilies } from '../interactive/familySelection';
import { FamilyKey, isFamilyKey } from '../lib/families';
import { initProject } from '../lib/init';
import { printError, printJson } from '../utils/logger';

interface InitCommandOptions {
  project: string;
  family: string[];
  uiPath: string;
  adaptersPath: string;
  json?: boolean;
}

function parseFamilyValues(values: string[]): FamilyKey[] {
  return values.map((value) => {
    if (!isFamilyKey(value)) {
      throw new Error(`Unsupported family "${value}".`);
    }

    return value;
  });
}

/**
 * Registers the `init` command used to bootstrap consumer repositories.
 */
export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Bootstrap a consumer app for the shared local-development flow.')
    .option('-p, --project <path>', 'Consumer app root', process.cwd())
    .option(
      '-f, --family <family>',
      'Package family to configure',
      (value, previous: string[] = []) => [...previous, value],
      []
    )
    .option(
      '--ui-path <path>',
      'Default relative path to the openzeppelin-ui checkout',
      '../openzeppelin-ui'
    )
    .option(
      '--adapters-path <path>',
      'Default relative path to the openzeppelin-adapters checkout',
      '../openzeppelin-adapters'
    )
    .option('--json', 'Emit machine-readable JSON output')
    .action(async (options: InitCommandOptions) => {
      try {
        const requestedFamilies = parseFamilyValues(options.family);
        const selectedFamilies = await resolveSelectedFamilies(
          requestedFamilies,
          ['ui', 'adapters'],
          Boolean(options.json)
        );

        const result = initProject({
          projectRoot: options.project,
          families: selectedFamilies,
          uiPath: options.uiPath,
          adaptersPath: options.adaptersPath,
        });

        if (options.json) {
          printJson({ ok: true, action: 'init', ...result });
          return;
        }

        process.stdout.write(`Initialized shared local development for ${result.projectRoot}\n`);
        process.stdout.write(`  config: ${result.configPath}\n`);
        process.stdout.write(`  pnpmfile: ${result.pnpmfilePath}\n`);
        for (const scriptName of result.updatedScripts) {
          process.stdout.write(`  updated script: ${scriptName}\n`);
        }
        for (const scriptName of result.keptScripts) {
          process.stdout.write(`  kept existing script: ${scriptName}\n`);
        }
      } catch (error) {
        printError(error, Boolean(options.json));
      }
    });
}
