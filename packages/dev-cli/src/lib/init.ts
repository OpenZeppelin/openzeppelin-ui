import fs from 'node:fs';
import path from 'node:path';

import { PROJECT_CONFIG_FILE } from './config';
import { STANDARD_FAMILIES, type FamilyKey } from './families';
import { CLI_PACKAGE_NAME, getCliDependencyRange } from './packageInfo';

export interface InitProjectOptions {
  projectRoot: string;
  families: FamilyKey[];
  uiPath: string;
  adaptersPath: string;
}

export interface InitProjectResult {
  projectRoot: string;
  configPath: string;
  pnpmfilePath: string;
  updatedScripts: string[];
  keptScripts: string[];
  families: FamilyKey[];
}

function createProjectConfig(options: InitProjectOptions): string {
  const families = Object.fromEntries(
    options.families.map((familyKey) => {
      if (familyKey === 'ui') {
        return [familyKey, { defaultPath: options.uiPath }];
      }

      return [
        familyKey,
        {
          defaultPath: options.adaptersPath,
          envNames: ['LOCAL_ADAPTERS_PATH'],
        },
      ];
    })
  );

  return `${JSON.stringify(
    {
      version: 1,
      cacheDir: '.packed-packages/local-dev',
      families,
    },
    null,
    2
  )}\n`;
}

function serializePnpmfileFamilies(): string {
  const subset: Record<string, unknown> = {};
  for (const [key, family] of Object.entries(STANDARD_FAMILIES)) {
    subset[key] = {
      repoName: family.repoName,
      envFlag: family.envFlag,
      envNames: [...family.envNames],
      defaultPath: family.defaultPath,
      packageMap: { ...family.packageMap },
    };
  }
  return JSON.stringify(subset, null, 2);
}

/**
 * Returns the canonical `.pnpmfile.cjs` hook source.
 *
 * This is the SINGLE SOURCE of the hook: it is written verbatim into consumer repos by
 * `oz-ui-dev init`, and the repository-root `.pnpmfile.cjs` is generated from it too (guarded
 * by the drift test in `pnpmfileTemplate.drift.test.ts`). Never hand-edit a generated file —
 * change this template and regenerate with `pnpm generate:pnpmfile`.
 */
export function createPnpmfileContent(): string {
  const familiesJson = serializePnpmfileFamilies();
  return `/**
 * pnpm hook for config-driven local development.
 *
 * This hook reads \`.openzeppelin-dev.json\` from the repository root and rewrites
 * configured dependency families to either packed tarballs or direct repo paths
 * when their corresponding LOCAL_* flags are enabled.
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = '.openzeppelin-dev.json';
const STANDARD_FAMILIES = ${familiesJson};

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getRealPath(targetPath) {
  return typeof fs.realpathSync.native === 'function'
    ? fs.realpathSync.native(targetPath)
    : fs.realpathSync(targetPath);
}

function resolveCacheDir(workspaceRoot, cacheDir) {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);
  const resolvedCacheDir = path.resolve(resolvedWorkspaceRoot, cacheDir);
  const relativeCacheDir = path.relative(resolvedWorkspaceRoot, resolvedCacheDir);

  if (
    relativeCacheDir === '' ||
    relativeCacheDir.startsWith('..') ||
    path.isAbsolute(relativeCacheDir)
  ) {
    throw new Error(\`\${CONFIG_FILE} "cacheDir" must be a subdirectory of the workspace root.\`);
  }

  return resolvedCacheDir;
}

function packedManifestExists(cacheDir, familyKey) {
  return fs.existsSync(path.join(cacheDir, \`\${familyKey}.json\`));
}

/**
 * Decides whether a family's dependencies should be rewritten for this install.
 *
 * - LOCAL_* flag explicitly "true"  → active with the full repo-path fallback
 *   (the CLI-driven \`use local\` install).
 * - LOCAL_* flag explicitly "false" → inactive (the CLI-driven \`use remote\` install,
 *   which also removes the manifest first): an explicit opt-out is always honored.
 * - flag unset (a routine \`pnpm <script>\` that triggers an incidental install) → active
 *   only while a packed manifest is still present, and only in "packed-only" mode. This
 *   keeps the materialized overlay sticky instead of letting pnpm re-resolve the packages
 *   from the registry and tear the overlay down.
 */
function resolveFamilyActivation(family, familyKey, cacheDir) {
  const flag = process.env[family.envFlag];
  if (flag === 'true') {
    return { active: true, packedOnly: false };
  }
  if (flag === 'false') {
    return { active: false, packedOnly: false };
  }
  return { active: packedManifestExists(cacheDir, familyKey), packedOnly: true };
}

function readProjectConfig(workspaceRoot) {
  const configPath = path.join(workspaceRoot, CONFIG_FILE);
  if (!fs.existsSync(configPath)) {
    throw new Error(\`Missing \${CONFIG_FILE} in \${workspaceRoot}.\`);
  }

  const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!isObject(parsed) || parsed.version !== 1 || !isObject(parsed.families)) {
    throw new Error(\`\${CONFIG_FILE} must declare "version": 1 and a "families" object.\`);
  }

  const families = Object.create(null);
  for (const [familyKey, overrides] of Object.entries(parsed.families)) {
    if (!Object.prototype.hasOwnProperty.call(STANDARD_FAMILIES, familyKey)) {
      throw new Error(\`Unsupported family "\${familyKey}" in \${CONFIG_FILE}.\`);
    }

    const familyOverrides = isObject(overrides) ? overrides : {};
    const baseFamily = STANDARD_FAMILIES[familyKey];
    const filteredEnvNames =
      Array.isArray(familyOverrides.envNames) && familyOverrides.envNames.length > 0
        ? familyOverrides.envNames.filter(
            (value) => typeof value === 'string' && value.length > 0
          )
        : null;
    families[familyKey] = {
      ...baseFamily,
      defaultPath:
        typeof familyOverrides.defaultPath === 'string' && familyOverrides.defaultPath.length > 0
          ? familyOverrides.defaultPath
          : baseFamily.defaultPath,
      envNames:
        filteredEnvNames && filteredEnvNames.length > 0
          ? filteredEnvNames
          : [...baseFamily.envNames],
    };
  }

  const cacheDirFromConfig =
    typeof parsed.cacheDir === 'string' && parsed.cacheDir.trim().length > 0
      ? parsed.cacheDir
      : '.packed-packages/local-dev';

  return {
    cacheDir: resolveCacheDir(workspaceRoot, cacheDirFromConfig),
    families,
  };
}

function getConfiguredPath(envNames, defaultPath) {
  for (const envName of envNames) {
    if (process.env[envName]) {
      return {
        envName,
        relativePath: process.env[envName],
      };
    }
  }

  return {
    envName: null,
    relativePath: defaultPath,
  };
}

function resolveRepoRoot(baseDir, family) {
  const { envName, relativePath } = getConfiguredPath(family.envNames, family.defaultPath);
  const resolvedPath = path.resolve(baseDir, relativePath);

  if (!fs.existsSync(resolvedPath)) {
    const envHelp = family.envNames.join(' or ');
    const envSource = envName ? \`\${envName}=\${relativePath}\` : \`default path \${family.defaultPath}\`;
    throw new Error(
      \`[local-dev] \${family.repoName} checkout not found at \${resolvedPath} (\${envSource}). Set \${envHelp} to a valid \${family.repoName} checkout.\`
    );
  }

  return getRealPath(resolvedPath);
}

function resolvePackageDirectory(workspaceRoot, family, packageName, packagePath) {
  const repoRoot = resolveRepoRoot(workspaceRoot, family);
  const resolvedPath = path.resolve(repoRoot, packagePath);
  const expectedPackageJsonPath = path.join(resolvedPath, 'package.json');

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      \`[local-dev] Expected \${packageName} to have a package.json at \${expectedPackageJsonPath}, but it was not found. Check that \${family.repoName} matches a compatible checkout and contains this package.\`
    );
  }

  const absolutePath = getRealPath(resolvedPath);
  const packageJsonPath = path.join(absolutePath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(
      \`[local-dev] Expected \${packageName} to have a package.json at \${packageJsonPath}, but it was not found. Check that \${family.repoName} matches a compatible checkout and contains this package.\`
    );
  }

  return absolutePath;
}

function findWorkspacePackage(repoRoot, packageName) {
  const packagesDir = path.join(repoRoot, 'packages');
  if (!fs.existsSync(packagesDir)) {
    return null;
  }

  for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const packageRoot = path.join(packagesDir, entry.name);
    const packageJsonPath = path.join(packageRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      continue;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (packageJson.name === packageName) {
        return getRealPath(packageRoot);
      }
    } catch {
      continue;
    }
  }

  return null;
}

function resolvePackageDirectoryByName(workspaceRoot, family, packageName) {
  const explicitPackagePath = family.packageMap[packageName];
  if (explicitPackagePath) {
    return resolvePackageDirectory(workspaceRoot, family, packageName, explicitPackagePath);
  }

  const repoRoot = resolveRepoRoot(workspaceRoot, family);
  return findWorkspacePackage(repoRoot, packageName);
}

function readPackedManifest(cacheDir, familyKey) {
  const manifestPath = path.join(cacheDir, \`\${familyKey}.json\`);
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return isObject(parsed) && isObject(parsed.packages) ? parsed.packages : null;
  } catch {
    return null;
  }
}

function rewriteDependencies(pkg, context, cacheDir, familyKey, family, packedOnly) {
  const packedPackages = readPackedManifest(cacheDir, familyKey);
  const workspaceRoot = __dirname;

  for (const depType of ['dependencies', 'devDependencies']) {
    if (!pkg[depType]) continue;

    for (const npmName of Object.keys(pkg[depType])) {
      const packedTarballPath = packedPackages && packedPackages[npmName];
      if (packedTarballPath && fs.existsSync(packedTarballPath)) {
        pkg[depType][npmName] = \`file:\${packedTarballPath}\`;
        context.log(\`[local-dev] \${npmName} → \${packedTarballPath} (packed)\`);
        continue;
      }

      // A flag-less (sticky) install only preserves already-materialized tarballs; it must
      // never link a live repo path or throw, so a routine \`pnpm <script>\` stays idempotent.
      if (packedOnly) {
        continue;
      }

      const absolutePath = resolvePackageDirectoryByName(workspaceRoot, family, npmName);
      if (!absolutePath) {
        continue;
      }

      pkg[depType][npmName] = \`file:\${absolutePath}\`;
      const source =
        Object.prototype.hasOwnProperty.call(family.packageMap, npmName) ? '' : ' (workspace fallback)';
      context.log(\`[local-dev] \${npmName} → \${absolutePath}\${source}\`);
    }
  }
}

/**
 * Widen caret ranges on adapter packages so pnpm can resolve pre-release
 * versions (e.g. 2.0.0-rc.1) that a plain ^2.0.0 would exclude.
 * Follows standard caret semantics for the upper bound.
 * Skips deps already rewritten to file: paths by local-dev mode.
 *
 * Gated: default installs must NOT widen ranges. Opt in via
 * \`ALLOW_ADAPTER_PRERELEASES=true\` or the existing \`LOCAL_ADAPTERS=true\` signal.
 */
function allowAdapterPrereleases(pkg) {
  for (const depType of ['dependencies', 'devDependencies']) {
    if (!pkg[depType]) continue;
    for (const [name, range] of Object.entries(pkg[depType])) {
      if (typeof range !== 'string') continue;
      if (!name.startsWith('@openzeppelin/adapter') && !name.startsWith('@openzeppelin/adapters-'))
        continue;
      if (!range.startsWith('^')) continue;
      const m = range.slice(1).match(/^(\\d+)\\.(\\d+)\\.(\\d+)$/);
      if (!m) continue;
      const maj = Number(m[1]), min = Number(m[2]), pat = Number(m[3]);
      const upper = maj > 0
        ? \`\${maj + 1}.0.0\`
        : min > 0
          ? \`0.\${min + 1}.0\`
          : \`0.0.\${pat + 1}\`;
      pkg[depType][name] = \`>=\${maj}.\${min}.\${pat}-0 <\${upper}\`;
    }
  }
}

function shouldAllowAdapterPrereleases() {
  return (
    process.env.ALLOW_ADAPTER_PRERELEASES === 'true' || process.env.LOCAL_ADAPTERS === 'true'
  );
}

// --- License compliance: strip the Trezor (T-RSL) stack --------------------
// @creit.tech/stellar-wallets-kit hard-depends on @trezor/connect-web and
// @trezor/connect-plugin-stellar, which together pull in 22 @trezor/* packages
// licensed under the Trezor Reference Source License (T-RSL). T-RSL grants
// "reference use" within the company only and excludes the right to distribute
// the software outside the company.
//
// Nothing we ship reaches that code: the kit's barrel does not re-export
// modules/trezor.module, allowAllModules() returns only the eight non-Trezor
// modules, and trezor.module is an isolated leaf that nothing else in the kit
// imports. Dropping both deps leaves bundle output byte-identical.
//
// Done here rather than through pnpm.patchedDependencies so it is not pinned to
// one kit version, and so it applies however deep the kit is pulled in (e.g.
// via @openzeppelin/adapter-stellar rather than a direct dependency).
const TREZOR_DEP_HOST = '@creit.tech/stellar-wallets-kit';
const TREZOR_DEPS = ['@trezor/connect-web', '@trezor/connect-plugin-stellar'];
const TREZOR_DEP_FIELDS = ['dependencies', 'optionalDependencies', 'peerDependencies'];

function stripTrezorDependencies(pkg, context) {
  if (pkg.name !== TREZOR_DEP_HOST) {
    return;
  }

  for (const field of TREZOR_DEP_FIELDS) {
    for (const dep of TREZOR_DEPS) {
      if (pkg[field] && dep in pkg[field]) {
        delete pkg[field][dep];
        context.log(\`[license] stripped \${dep} from \${pkg.name}@\${pkg.version} (T-RSL)\`);
      }
    }
  }
}

// --- License compliance: strip the WalletConnect / Reown stack ---------------
// We no longer register a WalletConnect connector in any ecosystem, so these
// dependencies are dead weight -- and the EVM one drags in @reown/appkit.
//
// Reown moved AppKit to the Reown Community License at 1.8.3 (commercial fees
// above 500 monthly active users, a mandatory-gateway clause and a
// confidentiality clause). The wagmi team have themselves deprecated their
// walletConnect connector over that relicence, noting they cannot patch a known
// downstream vulnerability (pino@7.11.0) because of it.
//
// Both host packages reach WalletConnect through a single isolated module that
// nothing else imports:
//   - @wagmi/connectors                -> walletConnect.js (dynamic import, unused)
//   - @creit.tech/stellar-wallets-kit   -> modules/walletconnect.module (not in the
//     barrel, not in allowAllModules())
// @wagmi/connectors@8+ makes its WalletConnect dependency an optional peer; until
// we move to wagmi 3 this hook achieves the same on the version we pin.
const WALLETCONNECT_STRIP = {
  '@wagmi/connectors': ['@walletconnect/ethereum-provider'],
  '@creit.tech/stellar-wallets-kit': ['@walletconnect/modal', '@walletconnect/sign-client'],
};
const WALLETCONNECT_DEP_FIELDS = ['dependencies', 'optionalDependencies', 'peerDependencies'];

function stripWalletConnectDependencies(pkg, context) {
  const deps = WALLETCONNECT_STRIP[pkg.name];
  if (!deps) {
    return;
  }

  for (const field of WALLETCONNECT_DEP_FIELDS) {
    for (const dep of deps) {
      if (pkg[field] && dep in pkg[field]) {
        delete pkg[field][dep];
        context.log(\`[license] stripped \${dep} from \${pkg.name}@\${pkg.version} (WalletConnect)\`);
      }
    }
  }
}

// --- License compliance: strip the MetaMask SDK -----------------------------
// @metamask/sdk ships a proprietary ConsenSys licence, not an open-source one:
// "Copyright ConsenSys Software Inc. 2022. All rights reserved", granting only a
// non-exclusive, non-transferable licence for Non-Commercial Use -- and clause 2
// requires any Resulting Program to carry that same Non-Commercial restriction
// forward.
//
// The OpenZeppelin adapters are AGPL-3.0, which forbids conveying the work under
// added restrictions. A non-commercial-only restriction is exactly such a
// restriction, so the two licences cannot both be satisfied. The conflict is
// structural: it does not depend on a monthly-active-user count, and there is no
// clean version to pin (no published version declares a \`license\` field at all).
//
// The same 2715-byte licence file ships in @metamask/sdk,
// @metamask/sdk-communication-layer and @metamask/sdk-install-modal-web.
//
// Scoped to that one name on purpose. Most of @metamask/* is MIT or ISC (utils,
// providers, json-rpc-engine, rpc-errors, superstruct, ...) and is legitimately
// needed; a scope-wide strip would break far more than it fixes.
//
// @wagmi/connectors declares @metamask/sdk as a hard dependency, not an optional
// peer, so it installs whether or not a metaMask() connector is registered.
const METAMASK_STRIP = {
  '@wagmi/connectors': ['@metamask/sdk'],
};
const METAMASK_DEP_FIELDS = ['dependencies', 'optionalDependencies', 'peerDependencies'];

function stripMetaMaskDependencies(pkg, context) {
  const deps = METAMASK_STRIP[pkg.name];
  if (!deps) {
    return;
  }

  for (const field of METAMASK_DEP_FIELDS) {
    for (const dep of deps) {
      if (pkg[field] && dep in pkg[field]) {
        delete pkg[field][dep];
        context.log(\`[license] stripped \${dep} from \${pkg.name}@\${pkg.version} (MetaMask SDK)\`);
      }
    }
  }
}

function readPackage(pkg, context) {
  stripWalletConnectDependencies(pkg, context);
  stripTrezorDependencies(pkg, context);
  stripMetaMaskDependencies(pkg, context);

  const workspaceRoot = __dirname;
  if (fs.existsSync(path.join(workspaceRoot, CONFIG_FILE))) {
    const projectConfig = readProjectConfig(workspaceRoot);

    for (const [familyKey, family] of Object.entries(projectConfig.families)) {
      const activation = resolveFamilyActivation(family, familyKey, projectConfig.cacheDir);
      if (!activation.active) {
        continue;
      }

      rewriteDependencies(
        pkg,
        context,
        projectConfig.cacheDir,
        familyKey,
        family,
        activation.packedOnly
      );
    }
  }

  if (shouldAllowAdapterPrereleases()) {
    allowAdapterPrereleases(pkg);
  }

  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
`;
}

function escapeForDoubleQuotedShell(value: string): string {
  return value.replace(/["\\$`]/g, '\\$&');
}

function createShellDefaultAssignment(envName: string, defaultValue: string): string {
  const escapedDefaultValue = escapeForDoubleQuotedShell(defaultValue);
  return `${envName}="\${${envName}:-${escapedDefaultValue}}"`;
}

function createManagedScripts(options: InitProjectOptions): Record<string, string> {
  const localUiPrefix = createShellDefaultAssignment('LOCAL_UI_PATH', options.uiPath);
  const localAdaptersPrefix = createShellDefaultAssignment(
    'LOCAL_ADAPTERS_PATH',
    options.adaptersPath
  );
  const scripts: Record<string, string> = {};

  if (options.families.includes('ui') && options.families.includes('adapters')) {
    scripts['dev:local'] =
      `${localUiPrefix} && ` +
      `${localAdaptersPrefix} && ` +
      `LOCAL_UI_PATH="$LOCAL_UI_PATH" LOCAL_ADAPTERS_PATH="$LOCAL_ADAPTERS_PATH" ` +
      `oz-ui-dev use local --project "$PWD" --family ui --family adapters`;
    scripts['dev:uikit:local'] =
      `${localUiPrefix} && ` +
      `LOCAL_UI_PATH="$LOCAL_UI_PATH" oz-ui-dev use local --project "$PWD" --family ui`;
    scripts['dev:adapters:local'] =
      `${localAdaptersPrefix} && ` +
      `LOCAL_ADAPTERS_PATH="$LOCAL_ADAPTERS_PATH" oz-ui-dev use local --project "$PWD" --family adapters`;
  } else if (options.families.includes('adapters')) {
    scripts['dev:local'] =
      `${localAdaptersPrefix} && ` +
      `LOCAL_ADAPTERS_PATH="$LOCAL_ADAPTERS_PATH" oz-ui-dev use local --project "$PWD" --family adapters`;
    scripts['dev:adapters:local'] = scripts['dev:local'];
  } else {
    scripts['dev:local'] =
      `${localUiPrefix} && ` +
      `LOCAL_UI_PATH="$LOCAL_UI_PATH" oz-ui-dev use local --project "$PWD" --family ui`;
    scripts['dev:uikit:local'] = scripts['dev:local'];
  }

  scripts['dev:npm'] = 'oz-ui-dev use remote --project "$PWD"';

  return scripts;
}

function shouldReplaceManagedScript(existingScript: string | undefined): boolean {
  return (
    existingScript === undefined ||
    existingScript.includes('packages/dev-cli/dist/index.mjs') ||
    existingScript.includes('pnpm --filter @openzeppelin/ui-dev-cli build') ||
    existingScript.includes('pnpm dlx @openzeppelin/ui-dev-cli@') ||
    existingScript.includes('oz-ui-dev use ') ||
    existingScript.includes('LOCAL_UI=true pnpm install --force') ||
    existingScript.includes('LOCAL_ADAPTERS=true pnpm install --force') ||
    existingScript.includes('setup-local-dev.mjs') ||
    existingScript === 'pnpm install --force'
  );
}

/**
 * Bootstraps a consumer repository with the shared local-development contract.
 */
export function initProject(options: InitProjectOptions): InitProjectResult {
  const projectRoot = path.resolve(options.projectRoot);
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const configPath = path.join(projectRoot, PROJECT_CONFIG_FILE);
  const pnpmfilePath = path.join(projectRoot, '.pnpmfile.cjs');

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`No package.json found in ${projectRoot}.`);
  }

  if (fs.existsSync(pnpmfilePath)) {
    const existingContent = fs.readFileSync(pnpmfilePath, 'utf8');
    if (!existingContent.includes(PROJECT_CONFIG_FILE)) {
      throw new Error(
        '.pnpmfile.cjs already exists and is not managed by the shared local-dev flow.'
      );
    }
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
    scripts?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  packageJson.scripts = packageJson.scripts || {};
  packageJson.devDependencies = packageJson.devDependencies || {};
  packageJson.devDependencies[CLI_PACKAGE_NAME] =
    packageJson.devDependencies[CLI_PACKAGE_NAME] ?? getCliDependencyRange();

  const updatedScripts: string[] = [];
  const keptScripts: string[] = [];
  for (const [scriptName, command] of Object.entries(createManagedScripts(options))) {
    if (shouldReplaceManagedScript(packageJson.scripts[scriptName])) {
      packageJson.scripts[scriptName] = command;
      updatedScripts.push(scriptName);
    } else {
      keptScripts.push(scriptName);
    }
  }

  fs.writeFileSync(configPath, createProjectConfig(options));
  fs.writeFileSync(pnpmfilePath, createPnpmfileContent());
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  return {
    projectRoot,
    configPath,
    pnpmfilePath,
    updatedScripts,
    keptScripts,
    families: options.families,
  };
}
