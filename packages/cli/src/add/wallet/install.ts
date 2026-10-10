import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import type { EntryTransformReason } from '../../codemod/entry-transform';
import type { JsonCommandResult } from '../../commands/migrate/json-results';
import type {
  CreateEcosystem,
  CreateFeature,
  CreatePreset,
  CreateRouting,
  CreateWallet,
  ResolvedCreateOptions,
} from '../../create/types';
import {
  buildInstallCommand,
  detectPackageManager,
  type PackageManager,
} from '../../utils/framework';
import {
  buildWalletSupportFiles,
  walletAddDependenciesForKit,
  walletAppConfigFile,
} from '../../wallet/scaffold';
import { patchEntryFileForWallet } from './patch-entry';

export type AddWalletEcosystem = Extract<CreateEcosystem, 'evm'>;
export type AddWalletKit = Extract<CreateWallet, 'custom' | 'rainbowkit'>;

export interface AddWalletOptions {
  projectRoot: string;
  ecosystem?: AddWalletEcosystem;
  kit?: AddWalletKit;
  packageManager?: PackageManager;
  skipInstall?: boolean;
  force?: boolean;
}

export interface AddWalletResult extends JsonCommandResult<'add-wallet'> {
  projectRoot: string;
  ecosystem: AddWalletEcosystem;
  kit: AddWalletKit;
  filesWritten: string[];
  filesSkipped: string[];
  packagesInstalled: string[];
  packagesAlreadyPresent: string[];
  packagesToInstall: string[];
  entryFilePatched: string | null;
  /** Outcome of the entry-file patch attempt (e.g. `patched`, `no-render-call`). */
  entryFilePatchReason: EntryTransformReason;
  appConfigPatched: string | null;
  installCommand: string | null;
  installRan: boolean;
  nextSteps: string[];
}

interface PackageJsonLike {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const SUPPORTED_ECOSYSTEMS: readonly AddWalletEcosystem[] = ['evm'];
const SUPPORTED_KITS: readonly AddWalletKit[] = ['custom', 'rainbowkit'];

function assertOneOf<T extends string>(value: string, allowed: readonly T[], label: string): T {
  if (allowed.includes(value as T)) return value as T;
  throw new Error(`Unsupported ${label} "${value}". Expected one of: ${allowed.join(', ')}`);
}

function readPackageJson(projectRoot: string): PackageJsonLike {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`No package.json found in ${projectRoot}. Is this a Node.js project?`);
  }

  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageJsonLike;
}

function splitPackagesByPresence(
  pkg: PackageJsonLike,
  packages: Record<string, string>
): { packagesToInstall: string[]; packagesAlreadyPresent: string[] } {
  const existing = { ...pkg.dependencies, ...pkg.devDependencies };
  const packagesToInstall: string[] = [];
  const packagesAlreadyPresent: string[] = [];

  for (const [name, version] of Object.entries(packages)) {
    if (existing[name]) {
      packagesAlreadyPresent.push(name);
    } else {
      packagesToInstall.push(`${name}@${version}`);
    }
  }

  return { packagesToInstall, packagesAlreadyPresent };
}

function createOptionsForWallet(
  projectRoot: string,
  packageManager: PackageManager,
  pkg: PackageJsonLike,
  ecosystem: AddWalletEcosystem,
  kit: AddWalletKit,
  force: boolean
): ResolvedCreateOptions {
  const projectName = pkg.name?.trim() || path.basename(projectRoot);
  return {
    projectName,
    projectRoot,
    preset: 'dapp' satisfies CreatePreset,
    ecosystem,
    wallet: kit,
    routing: 'none' satisfies CreateRouting,
    features: ['wallet'],
    packageManager,
    skipInstall: false,
    force,
    impliedFeatures: {} as Record<CreateFeature, string>,
  };
}

function writeGeneratedWalletFiles(
  projectRoot: string,
  files: ReturnType<typeof buildWalletSupportFiles>,
  force: boolean
): { filesWritten: string[]; filesSkipped: string[] } {
  const filesWritten: string[] = [];
  const filesSkipped: string[] = [];

  for (const file of files) {
    const filePath = path.join(projectRoot, file.path);
    if (fs.existsSync(filePath) && !force) {
      filesSkipped.push(file.path);
      continue;
    }

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.content, 'utf8');
    filesWritten.push(file.path);
  }

  return { filesWritten, filesSkipped };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readJsonRecord(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) return {};
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  if (!isRecord(parsed)) {
    throw new Error(`${filePath} must contain a JSON object.`);
  }
  return parsed;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function mergeAppConfig(
  projectRoot: string,
  options: ResolvedCreateOptions
): { appConfigPatched: string | null; skipped: boolean } {
  const relativePath = 'public/app.config.json';
  const filePath = path.join(projectRoot, relativePath);

  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, walletAppConfigFile(options).content, 'utf8');
    return { appConfigPatched: relativePath, skipped: false };
  }

  const existing = readJsonRecord(filePath);
  const globalServiceConfigs = isRecord(existing.globalServiceConfigs)
    ? existing.globalServiceConfigs
    : {};
  const walletConnect = isRecord(globalServiceConfigs.walletconnect)
    ? globalServiceConfigs.walletconnect
    : {};
  const walletUi = isRecord(globalServiceConfigs.walletui) ? globalServiceConfigs.walletui : {};
  const rawEcosystemConfig = walletUi[options.ecosystem];
  const ecosystemConfig: Record<string, unknown> = isRecord(rawEcosystemConfig)
    ? rawEcosystemConfig
    : {};
  const next = {
    ...existing,
    globalServiceConfigs: {
      ...globalServiceConfigs,
      walletconnect: {
        projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
        ...walletConnect,
      },
      walletui: {
        ...walletUi,
        [options.ecosystem]: {
          ...ecosystemConfig,
          kitName: options.wallet,
          kitConfig: isRecord(ecosystemConfig.kitConfig) ? ecosystemConfig.kitConfig : {},
        },
        default: isRecord(walletUi.default)
          ? walletUi.default
          : {
              kitName: options.wallet,
              kitConfig: {},
            },
      },
    },
  };

  if (JSON.stringify(existing) === JSON.stringify(next)) {
    return { appConfigPatched: null, skipped: true };
  }

  writeJson(filePath, next);
  return { appConfigPatched: relativePath, skipped: false };
}

/**
 * Human-readable guidance for the cases where the entry file could not be
 * wired automatically, so the user knows exactly what to wire by hand.
 */
function manualEntryWiringSteps(reason: EntryTransformReason): string[] {
  const wrapStep =
    "Wrap your app's render tree with <OzProviders> (import { OzProviders } from './oz/OzProviders')";
  const initStep =
    "Call await initializeAppConfig() before render (import { initializeAppConfig } from './oz/config')";

  switch (reason) {
    case 'no-entry-file':
      return [
        'Could not find a React entry file (src/main.tsx, src/index.tsx, or .jsx equivalents)',
        `Manually: ${wrapStep}`,
        `Manually: ${initStep}`,
      ];
    case 'no-render-call':
    case 'unsupported-shape':
      return [
        'Could not safely patch your entry file automatically — wire it manually:',
        wrapStep,
        initStep,
      ];
    default:
      return [];
  }
}

function buildNextSteps(
  options: ResolvedCreateOptions,
  installCommand: string | null,
  entryReason: EntryTransformReason
): string[] {
  const runCommand =
    options.packageManager === 'npm' ? 'npm run dev' : `${options.packageManager} dev`;
  const steps: string[] = [];

  if (installCommand) {
    steps.push(installCommand);
  }

  steps.push(...manualEntryWiringSteps(entryReason));
  steps.push('Edit public/app.config.json with your WalletConnect project ID');
  steps.push('Customize adapters and wallet setup in src/oz');
  steps.push(runCommand);
  return steps;
}

/**
 * Adds OpenZeppelin UI wallet runtime files and entry wiring to an existing project.
 */
export function addWalletToProject(rawOptions: AddWalletOptions): AddWalletResult {
  const projectRoot = path.resolve(rawOptions.projectRoot);
  const ecosystem = assertOneOf(rawOptions.ecosystem ?? 'evm', SUPPORTED_ECOSYSTEMS, 'ecosystem');
  const kit = assertOneOf(rawOptions.kit ?? 'custom', SUPPORTED_KITS, 'wallet kit');
  const force = Boolean(rawOptions.force);
  const pkg = readPackageJson(projectRoot);
  const packageManager = rawOptions.packageManager ?? detectPackageManager(projectRoot);
  const options = createOptionsForWallet(projectRoot, packageManager, pkg, ecosystem, kit, force);

  const dependencies = walletAddDependenciesForKit(kit);
  const { packagesToInstall, packagesAlreadyPresent } = splitPackagesByPresence(pkg, dependencies);
  const installCommand =
    packagesToInstall.length > 0 ? buildInstallCommand(packageManager, packagesToInstall) : null;

  const { filesWritten, filesSkipped } = writeGeneratedWalletFiles(
    projectRoot,
    buildWalletSupportFiles(options, { includeAppConfig: false }),
    force
  );
  const appConfigResult = mergeAppConfig(projectRoot, options);
  if (appConfigResult.appConfigPatched) {
    filesWritten.push(appConfigResult.appConfigPatched);
  } else if (appConfigResult.skipped) {
    filesSkipped.push('public/app.config.json');
  }

  const entryResult = patchEntryFileForWallet(projectRoot);
  const entryFilePatched = entryResult.patched ? entryResult.entryFile : null;
  const packagesInstalled: string[] = [];
  let installRan = false;

  if (installCommand && !rawOptions.skipInstall) {
    execSync(installCommand, { cwd: projectRoot, stdio: 'pipe' });
    packagesInstalled.push(...packagesToInstall);
    installRan = true;
  }

  return {
    ok: true,
    action: 'add-wallet',
    projectRoot,
    ecosystem,
    kit,
    filesWritten,
    filesSkipped,
    packagesInstalled,
    packagesAlreadyPresent,
    packagesToInstall,
    entryFilePatched,
    entryFilePatchReason: entryResult.reason,
    appConfigPatched: appConfigResult.appConfigPatched,
    installCommand,
    installRan,
    nextSteps: buildNextSteps(
      options,
      rawOptions.skipInstall ? installCommand : null,
      entryResult.reason
    ),
  };
}
