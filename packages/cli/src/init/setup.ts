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

import { CLI_BRANDING, CLI_FAMILIES, OZ_CORE_PACKAGES } from '../branding';
import { copyTemplateDirectory, writeTemplate } from '../templates';
import { buildInstallCommand, detectPackageManager } from '../utils/framework';

export interface SetupOptions {
  projectRoot: string;
  skipInstall?: boolean;
}

export interface SetupResult {
  packagesInstalled: string[];
  templatesWritten: string[];
  agentsCopied: string[];
  skillCopied: string[];
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

const ENTRY_FILE_CANDIDATES = [
  'src/main.tsx',
  'src/main.jsx',
  'src/index.tsx',
  'src/index.jsx',
] as const;

const PROVIDER_IMPORT_LINE =
  "import { RuntimeProvider, WalletStateProvider } from './oz/runtime-providers';";

/**
 * Patches the project's entry file to wrap the React render tree with
 * RuntimeProvider and WalletStateProvider. Uses the self-contained stub
 * from src/oz/runtime-providers.tsx so this works before @openzeppelin/ui-react
 * is installed.
 */
export function patchEntryFileWithProviders(projectRoot: string): string | null {
  for (const candidate of ENTRY_FILE_CANDIDATES) {
    const filePath = path.join(projectRoot, candidate);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('RuntimeProvider') || content.includes('OzProviders')) return null;

    const patched = injectProviderWiring(content);
    if (patched !== content) {
      fs.writeFileSync(filePath, patched, 'utf8');
      return candidate;
    }
  }

  return null;
}

function injectProviderWiring(source: string): string {
  if (source.includes('RuntimeProvider') || source.includes('OzProviders')) return source;

  let result = source;

  const lastImportIdx = findLastImportIndex(result);
  if (lastImportIdx >= 0) {
    const insertPos = result.indexOf('\n', lastImportIdx);
    if (insertPos >= 0) {
      result =
        result.slice(0, insertPos + 1) + PROVIDER_IMPORT_LINE + '\n' + result.slice(insertPos + 1);
    }
  } else {
    result = PROVIDER_IMPORT_LINE + '\n' + result;
  }

  result = wrapRenderTree(result);

  return result;
}

function findLastImportIndex(source: string): number {
  let lastIdx = -1;
  const importRegex = /^import\s/gm;
  let match;
  while ((match = importRegex.exec(source)) !== null) {
    lastIdx = match.index;
  }
  return lastIdx;
}

/**
 * Wraps the JSX tree inside ReactDOM.createRoot(...).render(<X>) with
 * RuntimeProvider + WalletStateProvider. Targets the common pattern:
 *   .render(<StrictMode>...) or .render(<App />) or .render(<Provider>...)
 */
function wrapRenderTree(source: string): string {
  const renderMatch = source.match(/\.render\(\s*\n?(\s*)/);
  if (!renderMatch) return source;

  const renderIdx = source.indexOf(renderMatch[0]);
  const afterRender = renderIdx + renderMatch[0].length;
  const indent = renderMatch[1] || '  ';

  const closingMatch = findMatchingCloseParen(source, renderIdx);
  if (closingMatch < 0) return source;

  const innerJsx = source.slice(afterRender, closingMatch).trim();

  const wrapped =
    `.render(\n` +
    `${indent}<RuntimeProvider>\n` +
    `${indent}  <WalletStateProvider>\n` +
    `${indent}    ${innerJsx}\n` +
    `${indent}  </WalletStateProvider>\n` +
    `${indent}</RuntimeProvider>\n` +
    `${indent.slice(2) || ''}`;

  return source.slice(0, renderIdx) + wrapped + source.slice(closingMatch);
}

function findMatchingCloseParen(source: string, startIdx: number): number {
  const openIdx = source.indexOf('(', startIdx);
  if (openIdx < 0) return -1;

  let depth = 1;
  for (let i = openIdx + 1; i < source.length; i++) {
    if (source[i] === '(') depth++;
    else if (source[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
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

/**
 * Patches the entry file to call `appConfigService.initialize()` before
 * the React render. Wraps the existing synchronous `createRoot().render()`
 * call in an async IIFE that loads config from Vite env + JSON.
 *
 * Idempotent: skips if the file already references `appConfigService`.
 */
export function patchEntryFileWithConfigService(projectRoot: string): string | null {
  for (const candidate of ENTRY_FILE_CANDIDATES) {
    const filePath = path.join(projectRoot, candidate);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('appConfigService')) return null;

    const patched = injectConfigServiceWiring(content);
    if (patched !== content) {
      fs.writeFileSync(filePath, patched, 'utf8');
      return candidate;
    }
  }

  return null;
}

function injectConfigServiceWiring(source: string): string {
  if (source.includes('appConfigService')) return source;

  // Bail early if there's no createRoot().render() pattern to wrap
  const createRootMatch = source.match(/(?:ReactDOM\.)?createRoot\s*\(/);
  if (!createRootMatch) return source;

  const createRootIdx = source.indexOf(createRootMatch[0]);
  const renderDotIdx = source.indexOf('.render(', createRootIdx);
  if (renderDotIdx < 0) return source;

  const renderCloseParen = findMatchingCloseParen(source, renderDotIdx);
  if (renderCloseParen < 0) return source;

  // Add the import
  let result = source;
  const lastImportIdx = findLastImportIndex(result);
  if (lastImportIdx >= 0) {
    const insertPos = result.indexOf('\n', lastImportIdx);
    if (insertPos >= 0) {
      result =
        result.slice(0, insertPos + 1) +
        APP_CONFIG_IMPORT_LINE +
        '\n' +
        result.slice(insertPos + 1);
    }
  } else {
    result = APP_CONFIG_IMPORT_LINE + '\n' + result;
  }

  // Re-locate createRoot after the import insertion shifted offsets
  const updatedCreateRootMatch = result.match(/(?:ReactDOM\.)?createRoot\s*\(/);
  if (!updatedCreateRootMatch) return result;

  const updatedCreateRootIdx = result.indexOf(updatedCreateRootMatch[0]);

  let stmtStart = updatedCreateRootIdx;
  while (stmtStart > 0 && result[stmtStart - 1] !== '\n') stmtStart--;

  const updatedRenderDotIdx = result.indexOf('.render(', updatedCreateRootIdx);
  if (updatedRenderDotIdx < 0) return result;

  const updatedRenderCloseParen = findMatchingCloseParen(result, updatedRenderDotIdx);
  if (updatedRenderCloseParen < 0) return result;

  let stmtEnd = updatedRenderCloseParen + 1;
  while (stmtEnd < result.length && /[\s;]/.test(result[stmtEnd])) {
    const ch = result[stmtEnd];
    stmtEnd++;
    if (ch === ';') break;
  }

  const renderStatement = result.slice(stmtStart, stmtEnd).trim();

  const asyncWrapper =
    'async function startApp() {\n' +
    '  await appConfigService.initialize([\n' +
    "    { type: 'viteEnv', env: import.meta.env },\n" +
    "    { type: 'json', path: '/app.config.json' },\n" +
    '  ]);\n' +
    '\n' +
    '  ' +
    renderStatement +
    '\n' +
    '}\n' +
    '\n' +
    'void startApp();\n';

  result = result.slice(0, stmtStart) + asyncWrapper + result.slice(stmtEnd);

  return result;
}

/**
 *
 */
export function copyAgentFiles(projectRoot: string): string[] {
  const copied: string[] = [];

  const cursorResult = copyTemplateDirectory('agents', path.join(projectRoot, '.cursor', 'agents'));
  copied.push(...cursorResult.copied.map((f) => `.cursor/agents/${f}`));

  const claudeResult = copyTemplateDirectory('agents', path.join(projectRoot, '.claude', 'agents'));
  copied.push(...claudeResult.copied.map((f) => `.claude/agents/${f}`));

  return copied;
}

/**
 *
 */
export function copySkillFiles(projectRoot: string): string[] {
  const copied: string[] = [];

  try {
    const cursorResult = copyTemplateDirectory(
      'skills/migrate-to-oz-uikit',
      path.join(projectRoot, '.cursor', 'skills', 'migrate-to-oz-uikit')
    );
    copied.push(...cursorResult.copied.map((f) => `.cursor/skills/migrate-to-oz-uikit/${f}`));

    const claudeResult = copyTemplateDirectory(
      'skills/migrate-to-oz-uikit',
      path.join(projectRoot, '.claude', 'skills', 'migrate-to-oz-uikit')
    );
    copied.push(...claudeResult.copied.map((f) => `.claude/skills/migrate-to-oz-uikit/${f}`));
  } catch {
    // Skill templates may not exist yet
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
  const { projectRoot, skipInstall = false } = options;

  if (!fs.existsSync(path.join(projectRoot, 'package.json'))) {
    throw new Error(`No package.json found in ${projectRoot}. Is this a Node.js project?`);
  }

  ensurePnpmWorkspaceIsolation(projectRoot);

  const packagesInstalled = installPackages(projectRoot, OZ_CORE_PACKAGES, skipInstall);
  const templatesWritten = writeProviderTemplates(projectRoot);
  const { configWritten: appConfigWritten } = writeAppConfigFiles(projectRoot);
  const configServicePatched = patchEntryFileWithConfigService(projectRoot);
  const agentsCopied = copyAgentFiles(projectRoot);
  const skillCopied = copySkillFiles(projectRoot);
  const tailwindFixed = normalizeTailwind(projectRoot, CLI_FAMILIES, CLI_BRANDING);
  ensureTailwindConfigStubIfNeeded(projectRoot, CLI_FAMILIES);

  return {
    packagesInstalled,
    templatesWritten,
    agentsCopied,
    skillCopied,
    tailwindFixed,
    appConfigWritten,
    configServicePatched,
  };
}
