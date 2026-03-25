export type FamilyKey = 'ui' | 'adapters';

export interface FamilyDefinition {
  key: FamilyKey;
  displayName: string;
  repoName: string;
  envFlag: string;
  envNames: string[];
  defaultPath: string;
  packageMap: Record<string, string>;
  buildArgs: string[];
}

const UI_PACKAGE_MAP = {
  '@openzeppelin/ui-types': 'packages/types',
  '@openzeppelin/ui-utils': 'packages/utils',
  '@openzeppelin/ui-styles': 'packages/styles',
  '@openzeppelin/ui-components': 'packages/components',
  '@openzeppelin/ui-renderer': 'packages/renderer',
  '@openzeppelin/ui-react': 'packages/react',
  '@openzeppelin/ui-storage': 'packages/storage',
};

const ADAPTER_PACKAGE_MAP = {
  '@openzeppelin/adapter-evm': 'packages/adapter-evm',
  '@openzeppelin/adapter-midnight': 'packages/adapter-midnight',
  '@openzeppelin/adapter-polkadot': 'packages/adapter-polkadot',
  '@openzeppelin/adapter-solana': 'packages/adapter-solana',
  '@openzeppelin/adapter-stellar': 'packages/adapter-stellar',
};

function createBuildArgs(packageNames: string[]): string[] {
  return [...packageNames.flatMap((packageName) => ['--filter', packageName]), 'build'];
}

export const STANDARD_FAMILIES: Record<FamilyKey, FamilyDefinition> = {
  ui: {
    key: 'ui',
    displayName: 'OpenZeppelin UI packages',
    repoName: 'openzeppelin-ui',
    envFlag: 'LOCAL_UI',
    envNames: ['LOCAL_UI_PATH'],
    defaultPath: '../openzeppelin-ui',
    packageMap: UI_PACKAGE_MAP,
    buildArgs: createBuildArgs(Object.keys(UI_PACKAGE_MAP)),
  },
  adapters: {
    key: 'adapters',
    displayName: 'OpenZeppelin adapter packages',
    repoName: 'openzeppelin-adapters',
    envFlag: 'LOCAL_ADAPTERS',
    envNames: ['LOCAL_ADAPTERS_PATH'],
    defaultPath: '../openzeppelin-adapters',
    packageMap: ADAPTER_PACKAGE_MAP,
    buildArgs: createBuildArgs(Object.keys(ADAPTER_PACKAGE_MAP)),
  },
};

/**
 * Returns the supported family keys used by the CLI.
 */
export function getFamilyKeys(): FamilyKey[] {
  return Object.keys(STANDARD_FAMILIES) as FamilyKey[];
}

/**
 * Checks whether a string matches a supported family key.
 */
export function isFamilyKey(value: string): value is FamilyKey {
  return Object.prototype.hasOwnProperty.call(STANDARD_FAMILIES, value);
}
