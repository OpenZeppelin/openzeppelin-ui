import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import pc from 'picocolors';

import { parseAgentProfileArg } from '../../agent-assets';
import { CLI_VERSION } from '../../branding';
import { runSetup } from '../../init/setup';
import { detectFramework, detectPackageManager } from '../../utils/framework';
import { printError, printJson } from '../../utils/logger';
import type { JsonCommandResult } from './json-results';

interface InitOptions {
  project: string;
  json?: boolean;
  skipInstall?: boolean;
  /** @description Comma-separated: standard, claude, legacy-cursor, all, none */
  agentProfile?: string;
}

interface InitResult extends JsonCommandResult<'migrate-init'> {
  project: string;
  initVersion: string;
  framework: string;
  packageManager: string;
  packagesInstalled: string[];
  templatesWritten: string[];
  agentsCopied: string[];
  skillCopied: string[];
  agentAssetProfiles: string[];
  agentProfileSelectionWritten: string;
  tailwindFixed: boolean;
  appConfigWritten: boolean;
  configServicePatched: string | null;
}

/**
 *
 */
export function registerInitCommand(parent: Command): void {
  parent
    .command('init')
    .description(
      'Initialize migration: install OZ packages, wire providers, normalize Tailwind, copy agent/skill files.'
    )
    .option('-p, --project <path>', 'Project root directory', process.cwd())
    .option('--json', 'Emit machine-readable JSON output')
    .option('--skip-install', 'Skip package installation')
    .option(
      '--agent-profile <list>',
      'Required. Where to install migration assets: comma-separated standard, claude, legacy-cursor, or all, none'
    )
    .action((options: InitOptions) => {
      try {
        const projectRoot = path.resolve(options.project);

        if (!fs.existsSync(path.join(projectRoot, 'package.json'))) {
          throw new Error(`No package.json found in ${projectRoot}. Is this a Node.js project?`);
        }

        const framework = detectFramework(projectRoot);
        const packageManager = detectPackageManager(projectRoot);

        const agentAssetProfiles = parseAgentProfileArg(options.agentProfile);

        const {
          packagesInstalled,
          templatesWritten,
          agentsCopied,
          skillCopied,
          agentProfileSelectionWritten,
          tailwindFixed,
          appConfigWritten,
          configServicePatched,
        } = runSetup({
          projectRoot,
          skipInstall: Boolean(options.skipInstall),
          agentAssetProfiles,
        });

        const result: InitResult = {
          ok: true,
          action: 'migrate-init',
          project: projectRoot,
          initVersion: CLI_VERSION,
          framework,
          packageManager,
          packagesInstalled,
          templatesWritten,
          agentsCopied,
          skillCopied,
          agentAssetProfiles: [...agentAssetProfiles],
          agentProfileSelectionWritten,
          tailwindFixed,
          appConfigWritten,
          configServicePatched,
        };

        if (options.json) {
          printJson(result);
          return;
        }

        process.stdout.write(pc.green(`Migration initialized for ${projectRoot}\n`));
        process.stdout.write(`  Framework: ${framework}\n`);
        process.stdout.write(`  Package manager: ${packageManager}\n`);
        process.stdout.write(`  CLI version: ${CLI_VERSION}\n`);
        process.stdout.write(
          `  Agent asset profiles: ${pc.dim(agentAssetProfiles.join(', ') || 'none')}\n`
        );

        if (packagesInstalled.length > 0) {
          process.stdout.write(`  Installed ${packagesInstalled.length} OZ packages\n`);
        }

        if (templatesWritten.length > 0) {
          process.stdout.write(`  Templates written:\n`);
          for (const t of templatesWritten) {
            process.stdout.write(`    ${pc.dim(t)}\n`);
          }
        }

        if (agentsCopied.length > 0) {
          process.stdout.write(`  Agent files copied: ${agentsCopied.length}\n`);
        }

        if (skillCopied.length > 0) {
          process.stdout.write(`  Skill files copied: ${skillCopied.length}\n`);
        }

        process.stdout.write(
          `  Agent profile selection written: ${pc.dim(agentProfileSelectionWritten)}\n`
        );

        if (tailwindFixed) {
          process.stdout.write(`  Tailwind configuration normalized\n`);
        }

        if (appConfigWritten) {
          process.stdout.write(
            `  Generated ${pc.dim('public/app.config.json')} with wallet config defaults\n`
          );
        }

        if (configServicePatched) {
          process.stdout.write(
            `  Patched ${pc.dim(configServicePatched)} with appConfigService bootstrap\n`
          );
        }

        process.stdout.write('\n' + pc.bold('Next steps:\n'));
        process.stdout.write(
          `  1. Update ${pc.cyan('public/app.config.json')} with your WalletConnect project ID\n`
        );
        process.stdout.write(
          `  2. Wrap your app root with <OzProviders> from src/oz/OzProviders.tsx\n`
        );
        process.stdout.write(`  3. Configure adapters in src/oz/resolve-runtime.ts\n`);
        process.stdout.write(
          `  4. Run ${pc.cyan('oz-ui migrate analyze --project .')} to scan your codebase\n`
        );
      } catch (error) {
        printError(error, Boolean(options.json));
      }
    });
}
