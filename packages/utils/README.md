# @openzeppelin/ui-utils

Shared, framework-agnostic utility functions for the OpenZeppelin UI ecosystem.

[![npm version](https://img.shields.io/npm/v/@openzeppelin/ui-utils.svg)](https://www.npmjs.com/package/@openzeppelin/ui-utils)

## Installation

```bash
# Using npm
npm install @openzeppelin/ui-utils

# Using yarn
yarn add @openzeppelin/ui-utils

# Using pnpm
pnpm add @openzeppelin/ui-utils
```

## Purpose

This package centralizes common logic that is not tied to any specific blockchain adapter or UI framework (like React). This prevents code duplication and ensures that core functionalities like logging, configuration management, and ID generation are consistent everywhere.

## Key Exports

- **`AppConfigService`**: A singleton service responsible for loading and providing runtime configuration. It can load settings from Vite environment variables or a `public/app.config.json` file, allowing for flexible configuration of RPC URLs, API keys, indexer endpoints, and other parameters.
  - **RPC Endpoints**: Override default RPC URLs per network via `getRpcEndpointOverride(networkId)`.
  - **Indexer Endpoints**: Override default indexer URLs per network via `getIndexerEndpointOverride(networkId)`.
  - **API Keys**: Retrieve explorer API keys via `getExplorerApiKey(serviceId)`.
  - **Global Services**: Access global service parameters like WalletConnect project IDs.
  - **Feature Flags**: Check feature enablement via `isFeatureEnabled(flagName)`.

- **`logger`**: A pre-configured singleton logger for consistent, leveled logging across all packages. It can be enabled, disabled, or have its level changed globally.

- **`generateId`**: A utility for generating unique IDs, used for form fields and other components.

- **`cn`**: A utility (a wrapper around `clsx` and `tailwind-merge`) for conditionally joining CSS class names, essential for building dynamic and themeable UI components with Tailwind CSS.

- **Access Control Utilities** (`./src/access/`): Chain-agnostic utilities for access control operations:
  - **`validateSnapshot`**: Validates the structure of an `AccessSnapshot` object
  - **`serializeSnapshot`**: Serializes an access snapshot to JSON string
  - **`deserializeSnapshot`**: Deserializes a JSON string to an access snapshot
  - **`createEmptySnapshot`**: Creates an empty snapshot with no roles and no ownership
  - **`findRoleAssignment`**: Finds a role assignment by role ID
  - **`compareSnapshots`**: Compares two snapshots and returns differences
  - **`isAccessControlError`**: Type guard to check if an error is an AccessControlError

- **Address Normalization** (`normalizeAddress`, `addressesEqual`): Utilities for normalizing and comparing addresses in a chain-agnostic way.

- **Type Guards and Helpers**: Various other small, reusable functions like `getDefaultValueForType`.

## Package Structure

```text
utils/
├── src/
│   ├── access/                 # Access control utilities (snapshot, errors)
│   ├── config/                 # Configuration management
│   ├── logger/                 # Logging utilities
│   ├── ui/                     # UI utility functions
│   ├── validation/             # Validation and type utilities
│   ├── constants/              # Shared constants
│   └── index.ts                # Main package exports
├── package.json
├── tsconfig.json
├── tsdown.config.ts
├── vitest.config.ts
└── README.md
```

## Usage

```typescript
import { AppConfigService, cn, generateId, logger } from '@openzeppelin/ui-utils';

// Class name utility
const buttonClasses = cn('px-4 py-2 rounded', isActive && 'bg-blue-500', disabled && 'opacity-50');

// Logging
logger.info('MyComponent', 'Component initialized');
logger.error('MyComponent', 'An error occurred', error);

// ID generation
const fieldId = generateId('field_');

// Configuration
const appConfig = AppConfigService.getInstance();
const rpcOverride = appConfig.getRpcEndpointOverride('ethereum-mainnet');
```

## Development

```bash
# Build the package
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint
```

## License

[AGPL-3.0](https://github.com/OpenZeppelin/openzeppelin-ui/blob/main/LICENSE)
