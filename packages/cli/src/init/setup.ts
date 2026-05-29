/**
 * Pure init/setup logic shared by the CLI command and tests.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import {
  fixTailwindProject,
  printTailwindProject,
  type PackageFamilyMap,
  type TailwindBrandingOptions,
} from '@openzeppelin/ui-tailwind-utils';

import {
  agentDirectoriesForProfiles,
  MIGRATE_SKILL_ID,
  skillDirectoriesForProfiles,
  writeAgentProfileSelection,
} from '../agent-assets';
import { CLI_BRANDING, CLI_FAMILIES, OZ_CORE_PACKAGES } from '../branding';
import { transformEntryFile } from '../codemod/entry-transform';
import type { AgentAssetProfile } from '../manifest/schema';
import { copyTemplateDirectory, writeTemplate } from '../templates';
import { buildInstallCommand, detectPackageManager } from '../utils/framework';

export interface SetupOptions {
  projectRoot: string;
  skipInstall?: boolean;
  /**
   * Where to place migration `SKILL.md` and agent assets. Must be chosen by the caller.
   */
  agentAssetProfiles: readonly AgentAssetProfile[];
}

export interface SetupResult {
  packagesInstalled: string[];
  templatesWritten: string[];
  agentsCopied: string[];
  skillCopied: string[];
  agentProfileSelectionWritten: string;
  tailwindFixed: boolean;
  appConfigWritten: boolean;
  configServicePatched: string | null;
}

/**
 *
 */
export function installPackages(
  projectRoot: string,
  packages: string[],
  skipInstall: boolean
): string[] {
  if (skipInstall || packages.length === 0) return [];

  const pm = detectPackageManager(projectRoot);
  const cmd = buildInstallCommand(pm, packages);

  try {
    execSync(cmd, { cwd: projectRoot, stdio: 'pipe' });
    return packages;
  } catch {
    return [];
  }
}

/**
 *
 */
export function writeProviderTemplates(projectRoot: string): string[] {
  const written: string[] = [];
  const srcDir = path.join(projectRoot, 'src', 'oz');

  if (writeTemplate(path.join(srcDir, 'OzProviders.tsx'), 'runtime-provider-setup.tsx.template')) {
    written.push('src/oz/OzProviders.tsx');
  }

  if (writeTemplate(path.join(srcDir, 'resolve-runtime.ts'), 'resolve-runtime.ts.template')) {
    written.push('src/oz/resolve-runtime.ts');
  }

  if (
    writeTemplate(path.join(srcDir, 'runtime-providers.tsx'), 'runtime-provider-stub.tsx.template')
  ) {
    written.push('src/oz/runtime-providers.tsx');
  }

  const patched = patchEntryFileWithProviders(projectRoot);
  if (patched) written.push(patched);

  return written;
}

const PROVIDER_IMPORT_LINE =
  "import { RuntimeProvider, WalletStateProvider } from './oz/runtime-providers';";

/**
 * Patches the project's entry file to wrap the React render tree with
 * RuntimeProvider and WalletStateProvider. Uses the self-contained stub
 * from src/oz/runtime-providers.tsx so this works before @openzeppelin/ui-react
 * is installed.
 */
export function patchEntryFileWithProviders(projectRoot: string): string | null {
  const result = transformEntryFile(projectRoot, {
    wrap: {
      importLine: PROVIDER_IMPORT_LINE,
      components: ['RuntimeProvider', 'WalletStateProvider'],
      skipIfPresent: ['RuntimeProvider', 'OzProviders'],
    },
  });

  return result.patched ? result.entryFile : null;
}

/**
 * Resolves the public assets directory for the detected framework.
 * Vite/CRA use `public/`, Next.js uses `public/` as well.
 */
function getPublicDir(projectRoot: string): string {
  return path.join(projectRoot, 'public');
}

/**
 * Reads the project's package.json and detects which wallet ecosystem
 * is in use, so we can pre-populate app.config.json appropriately.
 */
function detectWalletEcosystem(projectRoot: string): {
  ecosystem: string | null;
  kitName: string | null;
  hasWalletConnect: boolean;
} {
  const pkgPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) return { ecosystem: null, kitName: null, hasWalletConnect: false };

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    const hasRainbowKit = Boolean(deps['@rainbow-me/rainbowkit']);
    const hasWagmi = Boolean(deps['wagmi']);
    const hasStellarWalletsKit = Boolean(deps['@creit-tech/stellar-wallets-kit']);
    const hasWalletConnect =
      hasRainbowKit ||
      Boolean(deps['@walletconnect/web3-provider']) ||
      Boolean(deps['@web3modal/ethers']);

    if (hasRainbowKit || hasWagmi) {
      return { ecosystem: 'evm', kitName: 'rainbowkit', hasWalletConnect };
    }
    if (hasStellarWalletsKit) {
      return { ecosystem: 'stellar', kitName: 'stellar-wallets-kit', hasWalletConnect };
    }

    return { ecosystem: null, kitName: null, hasWalletConnect };
  } catch {
    return { ecosystem: null, kitName: null, hasWalletConnect: false };
  }
}

interface AppConfigResult {
  configWritten: boolean;
  exampleWritten: boolean;
}

/**
 * Generates `public/app.config.json` with a minimal working config
 * (walletconnect placeholder + detected wallet UI ecosystem) and
 * `public/app.config.json.example` with the full documented template.
 *
 * Prevents the common "No projectId found" failure for RainbowKit
 * projects immediately after init.
 */
export function writeAppConfigFiles(projectRoot: string): AppConfigResult {
  const publicDir = getPublicDir(projectRoot);
  fs.mkdirSync(publicDir, { recursive: true });

  const wallet = detectWalletEcosystem(projectRoot);

  const activeConfigPath = path.join(publicDir, 'app.config.json');
  const exampleConfigPath = path.join(publicDir, 'app.config.json.example');

  let configWritten = false;
  let exampleWritten = false;

  // Active config: minimal, only what's needed to boot without errors
  if (!fs.existsSync(activeConfigPath)) {
    const activeConfig: Record<string, unknown> = {
      globalServiceConfigs: {
        walletconnect: {
          projectId: 'YOUR_WALLETCONNECT_PROJECT_ID_HERE',
        },
        ...(wallet.ecosystem && wallet.kitName
          ? {
              walletui: {
                [wallet.ecosystem]: {
                  kitName: wallet.kitName,
                  kitConfig: {},
                },
              },
            }
          : {}),
      },
    };

    fs.writeFileSync(activeConfigPath, JSON.stringify(activeConfig, null, 2) + '\n', 'utf8');
    configWritten = true;
  }

  // Example config: fully documented with all supported sections
  if (!fs.existsSync(exampleConfigPath)) {
    const exampleConfig = {
      _readme: [
        'Application runtime configuration loaded by appConfigService.',
        'Values here can be overridden by VITE_APP_CFG_* environment variables.',
        'See: https://docs.openzeppelin.com/ui-kit/config',
      ],
      globalServiceConfigs: {
        walletconnect: {
          projectId: 'YOUR_WALLETCONNECT_PROJECT_ID_HERE',
          _comment: 'Required for WalletConnect v2. Get one at https://cloud.walletconnect.com',
        },
        walletui: {
          _comment:
            'Wallet UI config, keyed by ecosystem. Supported kitNames: rainbowkit, stellar-wallets-kit, custom.',
          evm: { kitName: 'rainbowkit', kitConfig: {} },
          stellar: { kitName: 'stellar-wallets-kit', kitConfig: {} },
          default: { kitName: 'custom', kitConfig: {} },
        },
      },
      networkServiceConfigs: {
        _comment: 'Explorer API keys keyed by service identifier (e.g. etherscan, blockscout).',
      },
      rpcEndpoints: {
        _comment: 'Custom RPC URLs keyed by network ID. Overrides default public RPCs.',
      },
      indexerEndpoints: {
        _comment: 'Indexer endpoints keyed by network ID, for historical data queries.',
      },
      featureFlags: {},
      defaultLanguage: 'en',
    };

    fs.writeFileSync(exampleConfigPath, JSON.stringify(exampleConfig, null, 2) + '\n', 'utf8');
    exampleWritten = true;
  }

  return { configWritten, exampleWritten };
}

const APP_CONFIG_IMPORT_LINE = "import { appConfigService } from '@openzeppelin/ui-utils';";

const APP_CONFIG_INIT_STATEMENT = [
  'await appConfigService.initialize([',
  "  { type: 'viteEnv', env: import.meta.env },",
  "  { type: 'json', path: '/app.config.json' },",
  ']);',
].join('\n');

/**
 * Patches the entry file to call `appConfigService.initialize()` before
 * the React render. Wraps the synchronous `createRoot().render()` call in an
 * async bootstrap that loads config from Vite env + JSON.
 *
 * Idempotent: skips if the file already references `appConfigService`.
 */
export function patchEntryFileWithConfigService(projectRoot: string): string | null {
  const result = transformEntryFile(projectRoot, {
    asyncInit: {
      importLine: APP_CONFIG_IMPORT_LINE,
      initStatement: APP_CONFIG_INIT_STATEMENT,
      bootstrapName: 'startApp',
      skipIfPresent: ['appConfigService'],
    },
  });

  return result.patched ? result.entryFile : null;
}

/**
 * @description Installs migration `*.md` agent files into Cursor and/or Claude trees per selected profiles.
 */
export function copyAgentFiles(
  projectRoot: string,
  profiles: readonly AgentAssetProfile[]
): string[] {
  if (profiles.length === 0) return [];
  const copied: string[] = [];
  const root = path.resolve(projectRoot);

  for (const directory of agentDirectoriesForProfiles(profiles)) {
    const result = copyTemplateDirectory('agents', path.join(root, directory));
    copied.push(...result.copied.map((f) => `${directory}/${f}`));
  }

  return copied;
}

const MIGRATE_SKILL_TEMPLATE = `skills/${MIGRATE_SKILL_ID}`;

/**
 * @description Installs `migrate-to-oz-uikit` skill assets per selected profiles.
 */
export function copySkillFiles(
  projectRoot: string,
  profiles: readonly AgentAssetProfile[]
): string[] {
  if (profiles.length === 0) return [];
  const copied: string[] = [];
  const root = path.resolve(projectRoot);

  for (const directory of skillDirectoriesForProfiles(profiles, MIGRATE_SKILL_ID)) {
    try {
      const result = copyTemplateDirectory(MIGRATE_SKILL_TEMPLATE, path.join(root, directory));
      copied.push(...result.copied.map((f) => `${directory}/${f}`));
    } catch {
      // Skill templates may not exist yet
    }
  }

  return copied;
}

/**
 *
 */
export function normalizeTailwind(
  projectRoot: string,
  families: PackageFamilyMap,
  branding: TailwindBrandingOptions
): boolean {
  try {
    const result = fixTailwindProject(projectRoot, families, branding);
    return result.ok && result.changed;
  } catch {
    return false;
  }
}

const ROOT_TAILWIND_CONFIG_NAMES = [
  'tailwind.config.ts',
  'tailwind.config.mts',
  'tailwind.config.js',
  'tailwind.config.mjs',
  'tailwind.config.cjs',
] as const;

/** When the project has no Tailwind-enabled package, emit a root config stub with OZ content paths. */
export function ensureTailwindConfigStubIfNeeded(
  projectRoot: string,
  families: PackageFamilyMap
): void {
  if (ROOT_TAILWIND_CONFIG_NAMES.some((name) => fs.existsSync(path.join(projectRoot, name)))) {
    return;
  }

  const resolved = printTailwindProject(projectRoot, families);
  if (resolved.ok) {
    return;
  }

  writeTemplate(path.join(projectRoot, 'tailwind.config.ts'), 'tailwind.config.ts.template');
}

/**
 * Ensure the project is treated as a standalone pnpm workspace root when it has
 * its own lockfile. Without this, pnpm traverses up the directory tree and may
 * resolve dependencies from a parent workspace, causing version mismatches
 * (e.g., Vite 7 instead of the project's pinned Vite 6).
 */
export function ensurePnpmWorkspaceIsolation(projectRoot: string): boolean {
  const hasLockfile = fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'));
  const hasWorkspaceFile = fs.existsSync(path.join(projectRoot, 'pnpm-workspace.yaml'));

  if (hasLockfile && !hasWorkspaceFile) {
    fs.writeFileSync(path.join(projectRoot, 'pnpm-workspace.yaml'), 'packages: []\n', 'utf8');
    return true;
  }

  return false;
}

/** @description Runs OZ UI kit project setup: packages, provider templates, app config, agents, skill, and Tailwind fixes. */
export function runSetup(options: SetupOptions): SetupResult {
  const { projectRoot, skipInstall = false, agentAssetProfiles } = options;

  if (!fs.existsSync(path.join(projectRoot, 'package.json'))) {
    throw new Error(`No package.json found in ${projectRoot}. Is this a Node.js project?`);
  }

  ensurePnpmWorkspaceIsolation(projectRoot);

  const packagesInstalled = installPackages(projectRoot, OZ_CORE_PACKAGES, skipInstall);
  const templatesWritten = writeProviderTemplates(projectRoot);
  const { configWritten: appConfigWritten } = writeAppConfigFiles(projectRoot);
  const configServicePatched = patchEntryFileWithConfigService(projectRoot);
  const agentsCopied = copyAgentFiles(projectRoot, agentAssetProfiles);
  const skillCopied = copySkillFiles(projectRoot, agentAssetProfiles);
  const agentProfileSelectionWritten = writeAgentProfileSelection(projectRoot, agentAssetProfiles);
  const tailwindFixed = normalizeTailwind(projectRoot, CLI_FAMILIES, CLI_BRANDING);
  ensureTailwindConfigStubIfNeeded(projectRoot, CLI_FAMILIES);

  return {
    packagesInstalled,
    templatesWritten,
    agentsCopied,
    skillCopied,
    agentProfileSelectionWritten,
    tailwindFixed,
    appConfigWritten,
    configServicePatched,
  };
}
