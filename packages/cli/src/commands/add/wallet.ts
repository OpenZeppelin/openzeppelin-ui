import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { Command } from 'commander';
import pc from 'picocolors';

import {
  addWalletToProject,
  type AddWalletKit,
  type AddWalletOptions,
  type AddWalletResult,
} from '../../add/wallet/install';
import { printError, printJson } from '../../utils/logger';

interface AddWalletCommandOptions {
  project: string;
  ecosystem?: 'evm';
  kit?: AddWalletKit;
  packageManager?: AddWalletOptions['packageManager'];
  skipInstall?: boolean;
  force?: boolean;
  yes?: boolean;
  json?: boolean;
}

const WALLET_KITS = ['custom', 'rainbowkit'] as const;

function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase();
}

async function promptForWalletOptions(initial: AddWalletOptions): Promise<AddWalletOptions> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = normalizeAnswer(
      await rl.question(`Wallet kit (${WALLET_KITS.join('/')}) [${initial.kit}]: `)
    );
    const kit =
      answer === ''
        ? initial.kit
        : WALLET_KITS.includes(answer as AddWalletKit)
          ? (answer as AddWalletKit)
          : null;

    if (!kit) {
      throw new Error(
        `Unsupported wallet kit "${answer}". Expected one of: ${WALLET_KITS.join(', ')}`
      );
    }

    return { ...initial, kit };
  } finally {
    rl.close();
  }
}

function renderSuccess(result: AddWalletResult): void {
  process.stdout.write(pc.green(`Wallet wiring added to ${result.projectRoot}\n`));
  process.stdout.write(`  Ecosystem: ${result.ecosystem}\n`);
  process.stdout.write(`  Kit: ${result.kit}\n`);
  process.stdout.write(`  Files written: ${result.filesWritten.length}\n`);
  if (result.filesSkipped.length > 0) {
    process.stdout.write(`  Files skipped: ${result.filesSkipped.length}\n`);
  }
  if (result.entryFilePatched) {
    process.stdout.write(`  Entry file patched: ${pc.cyan(result.entryFilePatched)}\n`);
  } else if (result.entryFilePatchReason !== 'already-wired') {
    process.stdout.write(
      `  ${pc.yellow(`Entry file not patched (${result.entryFilePatchReason}) — see next steps to wire it manually`)}\n`
    );
  }
  if (result.appConfigPatched) {
    process.stdout.write(`  App config updated: ${pc.cyan(result.appConfigPatched)}\n`);
  }

  if (result.installCommand) {
    const installState = result.installRan
      ? 'Installed dependencies'
      : 'Dependency install skipped';
    process.stdout.write(`  ${installState}: ${pc.cyan(result.installCommand)}\n`);
  }

  process.stdout.write(`\n${pc.bold('Next steps')}\n`);
  for (const step of result.nextSteps) {
    process.stdout.write(`  ${pc.cyan(step)}\n`);
  }
}

/**
 * Registers `oz-ui add wallet`, which applies wallet runtime wiring to an
 * existing React app.
 */
export function registerAddWalletCommand(parent: Command): void {
  parent
    .command('wallet')
    .description('Add OpenZeppelin UI wallet/runtime wiring to an existing project.')
    .option('-p, --project <path>', 'Project root directory', process.cwd())
    .option('--ecosystem <ecosystem>', 'Target ecosystem (v1: evm)', 'evm')
    .option('--kit <kit>', 'Wallet kit: custom or rainbowkit')
    .option('--package-manager <pm>', 'npm, pnpm, or yarn')
    .option('--skip-install', 'Write files without installing dependencies')
    .option('--force', 'Overwrite generated wallet files that already exist')
    .option('-y, --yes', 'Use defaults and skip interactive prompts')
    .option('--json', 'Emit machine-readable JSON output')
    .action(async (options: AddWalletCommandOptions) => {
      const json = Boolean(options.json);
      try {
        const baseOptions: AddWalletOptions = {
          projectRoot: path.resolve(options.project),
          ecosystem: options.ecosystem ?? 'evm',
          kit: options.kit ?? 'custom',
          packageManager: options.packageManager,
          skipInstall: Boolean(options.skipInstall),
          force: Boolean(options.force),
        };

        const resolvedOptions =
          options.yes || options.json ? baseOptions : await promptForWalletOptions(baseOptions);
        const result = addWalletToProject(resolvedOptions);

        if (json) {
          printJson(result);
          return;
        }

        renderSuccess(result);
      } catch (error) {
        printError(error, json);
      }
    });
}
