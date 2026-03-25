import fs from 'node:fs';
import path from 'node:path';

import { PROJECT_CONFIG_FILE } from './config';
import { FamilyKey } from './families';
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

function createPnpmfileContent(): string {
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

function isAnyLocalFamilyEnabled() {
  return Object.values(STANDARD_FAMILIES).some((family) => process.env[family.envFlag] === 'true');
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

  const families = {};
  for (const [familyKey, overrides] of Object.entries(parsed.families)) {
    if (!STANDARD_FAMILIES[familyKey]) {
      throw new Error(\`Unsupported family "\${familyKey}" in \${CONFIG_FILE}.\`);
    }

    const familyOverrides = isObject(overrides) ? overrides : {};
    const baseFamily = STANDARD_FAMILIES[familyKey];
    families[familyKey] = {
      ...baseFamily,
      defaultPath:
        typeof familyOverrides.defaultPath === 'string' && familyOverrides.defaultPath.length > 0
          ? familyOverrides.defaultPath
          : baseFamily.defaultPath,
      envNames:
        Array.isArray(familyOverrides.envNames) && familyOverrides.envNames.length > 0
          ? familyOverrides.envNames.filter(
              (value) => typeof value === 'string' && value.length > 0
            )
          : [...baseFamily.envNames],
    };
  }

  return {
    cacheDir: path.join(workspaceRoot, parsed.cacheDir || '.packed-packages/local-dev'),
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
  const absolutePath = path.resolve(baseDir, relativePath);

  if (!fs.existsSync(absolutePath)) {
    const envHelp = family.envNames.join(' or ');
    const envSource = envName ? \`\${envName}=\${relativePath}\` : \`default path \${family.defaultPath}\`;
    throw new Error(
      \`[local-dev] \${family.repoName} checkout not found at \${absolutePath} (\${envSource}). Set \${envHelp} to a valid \${family.repoName} checkout.\`
    );
  }

  return absolutePath;
}

function resolvePackageDirectory(workspaceRoot, family, packageName, packagePath) {
  const repoRoot = resolveRepoRoot(workspaceRoot, family);
  const absolutePath = path.resolve(repoRoot, packagePath);
  const packageJsonPath = path.join(absolutePath, 'package.json');

  if (!fs.existsSync(absolutePath) || !fs.existsSync(packageJsonPath)) {
    throw new Error(
      \`[local-dev] Expected \${packageName} to have a package.json at \${packageJsonPath}, but it was not found. Check that \${family.repoName} matches a compatible checkout and contains this package.\`
    );
  }

  return absolutePath;
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

function rewriteDependencies(pkg, context, cacheDir, familyKey, family) {
  const packedPackages = readPackedManifest(cacheDir, familyKey);
  const workspaceRoot = __dirname;

  for (const depType of ['dependencies', 'devDependencies']) {
    if (!pkg[depType]) continue;

    for (const [npmName, packagePath] of Object.entries(family.packageMap)) {
      if (!pkg[depType][npmName]) continue;

      const packedTarballPath = packedPackages && packedPackages[npmName];
      if (packedTarballPath && fs.existsSync(packedTarballPath)) {
        pkg[depType][npmName] = \`file:\${packedTarballPath}\`;
        context.log(\`[local-dev] \${npmName} → \${packedTarballPath} (packed)\`);
        continue;
      }

      const absolutePath = resolvePackageDirectory(workspaceRoot, family, npmName, packagePath);
      pkg[depType][npmName] = \`file:\${absolutePath}\`;
      context.log(\`[local-dev] \${npmName} → \${absolutePath}\`);
    }
  }
}

function readPackage(pkg, context) {
  if (!isAnyLocalFamilyEnabled()) {
    return pkg;
  }

  const workspaceRoot = __dirname;
  const projectConfig = readProjectConfig(workspaceRoot);

  for (const [familyKey, family] of Object.entries(projectConfig.families)) {
    if (process.env[family.envFlag] !== 'true') {
      continue;
    }

    rewriteDependencies(pkg, context, projectConfig.cacheDir, familyKey, family);
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
      `oz-dev use local --project "$PWD" --family ui --family adapters`;
    scripts['dev:uikit:local'] =
      `${localUiPrefix} && ` +
      `LOCAL_UI_PATH="$LOCAL_UI_PATH" oz-dev use local --project "$PWD" --family ui`;
    scripts['dev:adapters:local'] =
      `${localAdaptersPrefix} && ` +
      `LOCAL_ADAPTERS_PATH="$LOCAL_ADAPTERS_PATH" oz-dev use local --project "$PWD" --family adapters`;
  } else if (options.families.includes('adapters')) {
    scripts['dev:local'] =
      `${localAdaptersPrefix} && ` +
      `LOCAL_ADAPTERS_PATH="$LOCAL_ADAPTERS_PATH" oz-dev use local --project "$PWD" --family adapters`;
    scripts['dev:adapters:local'] = scripts['dev:local'];
  } else {
    scripts['dev:local'] =
      `${localUiPrefix} && ` +
      `LOCAL_UI_PATH="$LOCAL_UI_PATH" oz-dev use local --project "$PWD" --family ui`;
    scripts['dev:uikit:local'] = scripts['dev:local'];
  }

  scripts['dev:npm'] = 'oz-dev use remote --project "$PWD"';

  return scripts;
}

function shouldReplaceManagedScript(existingScript: string | undefined): boolean {
  return (
    existingScript === undefined ||
    existingScript.includes('packages/dev-cli/dist/index.mjs') ||
    existingScript.includes('pnpm --filter @openzeppelin/ui-dev-cli build') ||
    existingScript.includes('pnpm dlx @openzeppelin/ui-dev-cli@') ||
    existingScript.includes('oz-dev use ')
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
