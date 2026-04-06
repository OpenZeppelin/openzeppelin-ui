import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import pc from 'picocolors';

import { CLI_BRANDING, CLI_FAMILIES, CLI_VERSION, OZ_CORE_PACKAGES } from '../../branding';
import {
  copyAgentFiles,
  copySkillFiles,
  ensureTailwindConfigStubIfNeeded,
  installPackages,
  normalizeTailwind,
  writeProviderTemplates,
} from '../../init/setup';
import { detectFramework, detectPackageManager } from '../../utils/framework';
import { printError, printJson } from '../../utils/logger';
import type { JsonCommandResult } from './json-results';

interface InitOptions {
  project: string;
  json?: boolean;
  skipInstall?: boolean;
}

interface InitResult extends JsonCommandResult<'migrate-init'> {
  project: string;
  framework: string;
  packageManager: string;
  packagesInstalled: string[];
  templatesWritten: string[];
  agentsCopied: string[];
  skillCopied: string[];
  tailwindFixed: boolean;
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
    .action((options: InitOptions) => {
      try {
        const projectRoot = path.resolve(options.project);

        if (!fs.existsSync(path.join(projectRoot, 'package.json'))) {
          throw new Error(`No package.json found in ${projectRoot}. Is this a Node.js project?`);
        }

        const framework = detectFramework(projectRoot);
        const packageManager = detectPackageManager(projectRoot);

        const packagesInstalled = installPackages(
          projectRoot,
          OZ_CORE_PACKAGES,
          Boolean(options.skipInstall)
        );

        const templatesWritten = writeProviderTemplates(projectRoot);
        const agentsCopied = copyAgentFiles(projectRoot);
        const skillCopied = copySkillFiles(projectRoot);
        const tailwindFixed = normalizeTailwind(projectRoot, CLI_FAMILIES, CLI_BRANDING);
        ensureTailwindConfigStubIfNeeded(projectRoot, CLI_FAMILIES);

        const result: InitResult = {
          ok: true,
          action: 'migrate-init',
          project: projectRoot,
          framework,
          packageManager,
          packagesInstalled,
          templatesWritten,
          agentsCopied,
          skillCopied,
          tailwindFixed,
        };

        if (options.json) {
          printJson(result);
          return;
        }

        process.stdout.write(pc.green(`Migration initialized for ${projectRoot}\n`));
        process.stdout.write(`  Framework: ${framework}\n`);
        process.stdout.write(`  Package manager: ${packageManager}\n`);
        process.stdout.write(`  CLI version: ${CLI_VERSION}\n`);

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

        if (tailwindFixed) {
          process.stdout.write(`  Tailwind configuration normalized\n`);
        }

        process.stdout.write('\n' + pc.bold('Next steps:\n'));
        process.stdout.write(
          `  1. Wrap your app root with <OzProviders> from src/oz/OzProviders.tsx\n`
        );
        process.stdout.write(`  2. Configure adapters in src/oz/resolve-runtime.ts\n`);
        process.stdout.write(
          `  3. Run ${pc.cyan('oz-ui migrate analyze --project .')} to scan your codebase\n`
        );
      } catch (error) {
        printError(error, Boolean(options.json));
      }
    });
}
