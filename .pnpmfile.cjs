/**
 * pnpm hook for config-driven local development.
 *
 * This hook reads `.openzeppelin-dev.json` from the repository root and rewrites
 * configured dependency families to either packed tarballs or direct repo paths
 * when their corresponding LOCAL_* flags are enabled.
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = '.openzeppelin-dev.json';
const STANDARD_FAMILIES = {
  ui: {
    repoName: 'openzeppelin-ui',
    envFlag: 'LOCAL_UI',
    envNames: ['LOCAL_UI_PATH'],
    defaultPath: '../openzeppelin-ui',
    packageMap: {
      '@openzeppelin/ui-types': 'packages/types',
      '@openzeppelin/ui-utils': 'packages/utils',
      '@openzeppelin/ui-styles': 'packages/styles',
      '@openzeppelin/ui-components': 'packages/components',
      '@openzeppelin/ui-renderer': 'packages/renderer',
      '@openzeppelin/ui-react': 'packages/react',
      '@openzeppelin/ui-storage': 'packages/storage',
    },
  },
  adapters: {
    repoName: 'openzeppelin-adapters',
    envFlag: 'LOCAL_ADAPTERS',
    envNames: ['LOCAL_ADAPTERS_PATH'],
    defaultPath: '../openzeppelin-adapters',
    packageMap: {
      '@openzeppelin/adapters-vite': 'packages/adapters-vite',
      '@openzeppelin/adapter-evm': 'packages/adapter-evm',
      '@openzeppelin/adapter-midnight': 'packages/adapter-midnight',
      '@openzeppelin/adapter-polkadot': 'packages/adapter-polkadot',
      '@openzeppelin/adapter-solana': 'packages/adapter-solana',
      '@openzeppelin/adapter-stellar': 'packages/adapter-stellar',
    },
  },
};

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
    throw new Error(`${CONFIG_FILE} "cacheDir" must be a subdirectory of the workspace root.`);
  }

  return resolvedCacheDir;
}

function packedManifestExists(cacheDir, familyKey) {
  return fs.existsSync(path.join(cacheDir, `${familyKey}.json`));
}

/**
 * Decides whether a family's dependencies should be rewritten for this install.
 *
 * - LOCAL_* flag explicitly "true"  → active with the full repo-path fallback
 *   (the CLI-driven `use local` install).
 * - LOCAL_* flag explicitly "false" → inactive (the CLI-driven `use remote` install,
 *   which also removes the manifest first): an explicit opt-out is always honored.
 * - flag unset (a routine `pnpm <script>` that triggers an incidental install) → active
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
    throw new Error(`Missing ${CONFIG_FILE} in ${workspaceRoot}.`);
  }

  const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!isObject(parsed) || parsed.version !== 1 || !isObject(parsed.families)) {
    throw new Error(`${CONFIG_FILE} must declare "version": 1 and a "families" object.`);
  }

  const families = Object.create(null);
  for (const [familyKey, overrides] of Object.entries(parsed.families)) {
    if (!Object.prototype.hasOwnProperty.call(STANDARD_FAMILIES, familyKey)) {
      throw new Error(`Unsupported family "${familyKey}" in ${CONFIG_FILE}.`);
    }

    const familyOverrides = isObject(overrides) ? overrides : {};
    const baseFamily = STANDARD_FAMILIES[familyKey];
    const filteredEnvNames =
      Array.isArray(familyOverrides.envNames) && familyOverrides.envNames.length > 0
        ? familyOverrides.envNames.filter((value) => typeof value === 'string' && value.length > 0)
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
    const envSource = envName ? `${envName}=${relativePath}` : `default path ${family.defaultPath}`;
    throw new Error(
      `[local-dev] ${family.repoName} checkout not found at ${resolvedPath} (${envSource}). Set ${envHelp} to a valid ${family.repoName} checkout.`
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
      `[local-dev] Expected ${packageName} to have a package.json at ${expectedPackageJsonPath}, but it was not found. Check that ${family.repoName} matches a compatible checkout and contains this package.`
    );
  }

  const absolutePath = getRealPath(resolvedPath);
  const packageJsonPath = path.join(absolutePath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(
      `[local-dev] Expected ${packageName} to have a package.json at ${packageJsonPath}, but it was not found. Check that ${family.repoName} matches a compatible checkout and contains this package.`
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
  const manifestPath = path.join(cacheDir, `${familyKey}.json`);
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
        pkg[depType][npmName] = `file:${packedTarballPath}`;
        context.log(`[local-dev] ${npmName} → ${packedTarballPath} (packed)`);
        continue;
      }

      // A flag-less (sticky) install only preserves already-materialized tarballs; it must
      // never link a live repo path or throw, so a routine `pnpm <script>` stays idempotent.
      if (packedOnly) {
        continue;
      }

      const absolutePath = resolvePackageDirectoryByName(workspaceRoot, family, npmName);
      if (!absolutePath) {
        continue;
      }

      pkg[depType][npmName] = `file:${absolutePath}`;
      const source = Object.prototype.hasOwnProperty.call(family.packageMap, npmName)
        ? ''
        : ' (workspace fallback)';
      context.log(`[local-dev] ${npmName} → ${absolutePath}${source}`);
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
 * `ALLOW_ADAPTER_PRERELEASES=true` or the existing `LOCAL_ADAPTERS=true` signal.
 */
function allowAdapterPrereleases(pkg) {
  for (const depType of ['dependencies', 'devDependencies']) {
    if (!pkg[depType]) continue;
    for (const [name, range] of Object.entries(pkg[depType])) {
      if (typeof range !== 'string') continue;
      if (!name.startsWith('@openzeppelin/adapter') && !name.startsWith('@openzeppelin/adapters-'))
        continue;
      if (!range.startsWith('^')) continue;
      const m = range.slice(1).match(/^(\d+)\.(\d+)\.(\d+)$/);
      if (!m) continue;
      const maj = Number(m[1]),
        min = Number(m[2]),
        pat = Number(m[3]);
      const upper = maj > 0 ? `${maj + 1}.0.0` : min > 0 ? `0.${min + 1}.0` : `0.0.${pat + 1}`;
      pkg[depType][name] = `>=${maj}.${min}.${pat}-0 <${upper}`;
    }
  }
}

function shouldAllowAdapterPrereleases() {
  return process.env.ALLOW_ADAPTER_PRERELEASES === 'true' || process.env.LOCAL_ADAPTERS === 'true';
}

function readPackage(pkg, context) {
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
