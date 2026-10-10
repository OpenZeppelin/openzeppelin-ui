import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { buildCreateFiles } from './templates';
import type { CreateScaffoldResult, ResolvedCreateOptions } from './types';

function installCommand(packageManager: ResolvedCreateOptions['packageManager']): string {
  switch (packageManager) {
    case 'pnpm':
      return 'pnpm install';
    case 'yarn':
      return 'yarn install';
    case 'npm':
      return 'npm install';
  }
}

function assertProjectDirectoryWritable(options: ResolvedCreateOptions): void {
  if (!fs.existsSync(options.projectRoot)) return;

  const entries = fs.readdirSync(options.projectRoot);
  if (entries.length > 0 && !options.force) {
    throw new Error(
      `Target directory ${options.projectRoot} is not empty. Re-run with --force to overwrite generated files.`
    );
  }
}

function writeGeneratedFiles(options: ResolvedCreateOptions): {
  filesWritten: string[];
  filesSkipped: string[];
} {
  const filesWritten: string[] = [];
  const filesSkipped: string[] = [];
  for (const file of buildCreateFiles(options)) {
    const filePath = path.join(options.projectRoot, file.path);

    if (fs.existsSync(filePath) && !options.force) {
      filesSkipped.push(file.path);
      continue;
    }

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.content, 'utf8');
    filesWritten.push(file.path);
  }

  return { filesWritten, filesSkipped };
}

function buildNextSteps(options: ResolvedCreateOptions): string[] {
  const pmRun = options.packageManager === 'npm' ? 'npm run' : `${options.packageManager}`;
  const devCommand = options.packageManager === 'npm' ? `${pmRun} dev` : `${pmRun} dev`;
  const steps = [`cd ${options.projectName}`];

  if (options.skipInstall) {
    steps.push(installCommand(options.packageManager));
  }

  if (options.features.includes('wallet')) {
    steps.push('Edit public/app.config.json or .env.local with your WalletConnect project ID');
    steps.push('Customize adapters and wallet setup in src/oz');
  }

  steps.push(devCommand);
  return steps;
}

/**
 *
 */
export function scaffoldProject(options: ResolvedCreateOptions): CreateScaffoldResult {
  assertProjectDirectoryWritable(options);
  fs.mkdirSync(options.projectRoot, { recursive: true });

  const { filesWritten, filesSkipped } = writeGeneratedFiles(options);
  const command = options.skipInstall ? null : installCommand(options.packageManager);

  if (command) {
    execSync(command, { cwd: options.projectRoot, stdio: 'pipe' });
  }

  return {
    projectName: options.projectName,
    projectRoot: options.projectRoot,
    preset: options.preset,
    ecosystem: options.ecosystem,
    wallet: options.wallet,
    routing: options.routing,
    features: options.features,
    impliedFeatures: options.impliedFeatures,
    filesWritten,
    filesSkipped,
    packageManager: options.packageManager,
    installCommand: command,
    installRan: Boolean(command),
    nextSteps: buildNextSteps(options),
  };
}
