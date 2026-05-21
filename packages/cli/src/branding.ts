import { createRequire } from 'node:module';

import type { PackageFamilyMap, TailwindBrandingOptions } from '@openzeppelin/ui-tailwind-utils';

export const CLI_BRANDING: TailwindBrandingOptions = {
  managedComment: '/* Managed by oz-ui migrate init */',
  // Tailwind auto-fixes run as part of migrate init; doctor verifies state afterward.
  suggestedFixCommand: 'npx oz-ui migrate init --project .',
};

export const CLI_FAMILIES: PackageFamilyMap = {
  ui: {
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

export const OZ_CORE_PACKAGES = [
  '@openzeppelin/ui-types',
  '@openzeppelin/ui-utils',
  '@openzeppelin/ui-styles',
  '@openzeppelin/ui-components',
  '@openzeppelin/ui-renderer',
  '@openzeppelin/ui-react',
  '@openzeppelin/ui-storage',
];

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

export const CLI_VERSION: string = pkg.version;
