import path from 'node:path';
import { Command } from 'commander';
import pc from 'picocolors';

import type { JsonCommandResult } from './migrate/json-results';

import { promptForCreateOptions } from '../create/interactive';
import { parseFeatureList, resolveCreateOptions } from '../create/options';
import { scaffoldProject } from '../create/scaffold';
import type { CreateEcosystem, CreatePreset, CreateRouting, CreateWallet } from '../create/types';
import { printError, printJson } from '../utils/logger';

interface CreateCommandOptions {
  directory?: string;
  preset?: CreatePreset;
  ecosystem?: CreateEcosystem;
  wallet?: CreateWallet;
  routing?: CreateRouting;
  with?: string;
  without?: string;
  packageManager?: 'npm' | 'pnpm' | 'yarn';
  skipInstall?: boolean;
  force?: boolean;
  yes?: boolean;
  json?: boolean;
}

interface CreateResult extends JsonCommandResult<'create'> {
  projectName: string;
  projectRoot: string;
  preset: CreatePreset;
  ecosystem: CreateEcosystem;
  wallet: CreateWallet;
  routing: CreateRouting;
  features: string[];
  impliedFeatures: Record<string, string>;
  filesWritten: string[];
  filesSkipped: string[];
  packageManager: string;
  installCommand: string | null;
  installRan: boolean;
  nextSteps: string[];
}

function renderSuccess(result: CreateResult): void {
  process.stdout.write(pc.green(`Created ${result.projectName}\n`));
  process.stdout.write(`  Preset: ${pc.cyan(result.preset)}\n`);
  process.stdout.write(`  Ecosystem: ${result.ecosystem}\n`);
  process.stdout.write(`  Wallet: ${result.wallet}\n`);
  process.stdout.write(`  Routing: ${result.routing}\n`);
  process.stdout.write(`  Components: ${result.features.join(', ') || 'none'}\n`);

  const impliedEntries = Object.entries(result.impliedFeatures);
  if (impliedEntries.length > 0) {
    process.stdout.write(`  Auto-added:\n`);
    for (const [feature, reason] of impliedEntries) {
      process.stdout.write(`    ${feature}: ${pc.dim(reason)}\n`);
    }
  }

  process.stdout.write(`  Files written: ${result.filesWritten.length}\n`);
  if (result.filesSkipped.length > 0) {
    process.stdout.write(`  Files skipped: ${result.filesSkipped.length}\n`);
  }

  if (result.installRan) {
    process.stdout.write(`  Installed dependencies with ${pc.cyan(result.installCommand ?? '')}\n`);
  } else {
    process.stdout.write(`  Dependency install skipped\n`);
  }

  if (result.features.includes('wallet')) {
    process.stdout.write(`\n${pc.bold('OZ wiring')}\n`);
    process.stdout.write(`  Edit ${pc.cyan('src/oz/runtime.ts')} for adapter/runtime behavior\n`);
    process.stdout.write(`  Edit ${pc.cyan('src/oz/OzProviders.tsx')} for provider wiring\n`);
    process.stdout.write(`  Edit ${pc.cyan('public/app.config.json')} for runtime config\n`);
  }

  process.stdout.write(`\n${pc.bold('Next steps')}\n`);
  for (const step of result.nextSteps) {
    process.stdout.write(`  ${pc.cyan(step)}\n`);
  }
}

/**
 *
 */
export function registerCreateCommand(program: Command): void {
  program
    .command('create')
    .argument('[project-name]', 'Project directory name')
    .description('Create a Vite + React + TypeScript app with OpenZeppelin UI wiring.')
    .option('-d, --directory <path>', 'Parent directory for the generated project', process.cwd())
    .option('--preset <preset>', 'minimal, dapp, app-shell, or wizard')
    .option('--ecosystem <ecosystem>', 'Target ecosystem (v1: evm)', 'evm')
    .option('--wallet <wallet>', 'none, custom, or rainbowkit')
    .option('--routing <routing>', 'none or react-router')
    .option('--with <features>', 'Comma-separated feature toggles to include')
    .option('--without <features>', 'Comma-separated feature toggles to exclude')
    .option('--package-manager <pm>', 'npm, pnpm, or yarn')
    .option('--skip-install', 'Generate files without installing dependencies')
    .option('--force', 'Overwrite generated files in a non-empty target directory')
    .option('-y, --yes', 'Use defaults and skip interactive prompts')
    .option('--json', 'Emit machine-readable JSON output')
    .action(async (projectName: string | undefined, options: CreateCommandOptions) => {
      try {
        const baseOptions = {
          projectName: projectName ?? '',
          targetDirectory: path.resolve(options.directory ?? process.cwd()),
          preset: options.preset,
          ecosystem: options.ecosystem,
          wallet: options.wallet,
          routing: options.routing,
          withFeatures: parseFeatureList(options.with),
          withoutFeatures: parseFeatureList(options.without),
          packageManager: options.packageManager,
          skipInstall: Boolean(options.skipInstall),
          force: Boolean(options.force),
        };

        const userOptions =
          options.yes || options.json ? baseOptions : await promptForCreateOptions(baseOptions);
        const resolvedOptions = resolveCreateOptions(userOptions);
        const scaffoldResult = scaffoldProject(resolvedOptions);
        const result: CreateResult = {
          ok: true,
          action: 'create',
          ...scaffoldResult,
        };

        if (options.json) {
          printJson(result);
          return;
        }

        renderSuccess(result);
      } catch (error) {
        printError(error, Boolean(options.json));
      }
    });
}
