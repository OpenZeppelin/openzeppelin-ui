/**
 * pnpm hook for local development with ui-builder adapter packages
 *
 * This file enables seamless local development by dynamically resolving
 * @openzeppelin/ui-builder-adapter-* packages to local file paths when LOCAL_ADAPTERS=true.
 *
 * Usage:
 *   LOCAL_ADAPTERS=true pnpm install   # Use local adapter packages
 *   pnpm install                        # Use npm packages (default)
 *
 * Or use the convenience scripts:
 *   pnpm dev:local               # Enable local adapter packages
 *   pnpm dev:npm                 # Switch to npm adapter packages
 *
 * Expected directory structure:
 *   ~/dev/repos/OpenZeppelin/
 *   ├── openzeppelin-ui/           # This repo
 *   └── ui-builder/      # Adapters repo (sibling directory)
 *
 * Custom path:
 *   LOCAL_ADAPTERS_PATH=../my-adapters-fork LOCAL_ADAPTERS=true pnpm install
 */

const path = require('path');

const LOCAL_ADAPTERS_PATH = process.env.LOCAL_ADAPTERS_PATH || '../ui-builder';

/**
 * Maps npm package names to their directory paths within ui-builder
 */
const ADAPTER_PACKAGE_MAP = {
  '@openzeppelin/ui-builder-adapter-evm': 'packages/adapter-evm',
  '@openzeppelin/ui-builder-adapter-evm-core': 'packages/adapter-evm-core',
  '@openzeppelin/ui-builder-adapter-midnight': 'packages/adapter-midnight',
  '@openzeppelin/ui-builder-adapter-polkadot': 'packages/adapter-polkadot',
  '@openzeppelin/ui-builder-adapter-solana': 'packages/adapter-solana',
  '@openzeppelin/ui-builder-adapter-stellar': 'packages/adapter-stellar',
};

/**
 * Hook called by pnpm for each package being resolved
 * @param {object} pkg - The package.json content
 * @param {object} context - Context with directory info and logging
 * @returns {object} - Modified package.json content
 */
function readPackage(pkg, context) {
  // Skip if local development is not enabled
  if (process.env.LOCAL_ADAPTERS !== 'true') {
    return pkg;
  }

  // Use process.cwd() as fallback if context.dir is undefined
  const baseDir = context.dir || process.cwd();

  // Replace @openzeppelin/ui-builder-adapter-* dependencies with local file: references
  // Note: peerDependencies are excluded because pnpm requires them to be
  // semver ranges, workspace: specs, or catalog: specs (not file: paths)
  for (const depType of ['dependencies', 'devDependencies']) {
    if (!pkg[depType]) continue;

    for (const [npmName, localPath] of Object.entries(ADAPTER_PACKAGE_MAP)) {
      if (pkg[depType][npmName]) {
        const absolutePath = path.resolve(baseDir, LOCAL_ADAPTERS_PATH, localPath);
        pkg[depType][npmName] = `file:${absolutePath}`;
        context.log(`[local-dev] ${npmName} → ${absolutePath}`);
      }
    }
  }

  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
