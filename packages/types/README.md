# @openzeppelin/ui-types

Shared TypeScript type definitions for the OpenZeppelin UI ecosystem.

[![npm version](https://img.shields.io/npm/v/@openzeppelin/ui-types.svg)](https://www.npmjs.com/package/@openzeppelin/ui-types)

## Installation

```bash
# Using npm
npm install @openzeppelin/ui-types

# Using yarn
yarn add @openzeppelin/ui-types

# Using pnpm
pnpm add @openzeppelin/ui-types
```

## Purpose

This package serves as the single source of truth for all shared types used across the OpenZeppelin UI packages, including:

- **Capability and runtime types** — `EcosystemRuntime`, per-capability interfaces, and profile names used by adapter packages and apps
- Contract and blockchain-related types (`ContractSchema`, networks, execution)
- Form field and layout definitions
- Transaction and execution configuration types

By centralizing type definitions, we ensure consistency across all packages and eliminate type duplication.

## Usage

The package is organized into namespaces for better organization and to prevent naming collisions.

```typescript
import type {
  EcosystemRuntime,
  NetworkConfig,
  ProfileName,
  TransactionFormCapabilities,
} from '@openzeppelin/ui-types';

// Example: narrowing form props
function describeFormAdapter(adapter: TransactionFormCapabilities): string {
  return adapter.networkConfig.id;
}
```

Import capability groups from the main entry (they are re-exported from `./adapters`):

```typescript
import type { QueryCapability, SchemaCapability, WalletCapability } from '@openzeppelin/ui-types';
```

## Package Structure

```text
types/
├── src/
│   ├── adapters/              # Capability interfaces, profiles, runtime, ecosystem export
│   │   ├── capabilities/    # Tier 2/3 capability contracts (wallet, query, schema, …)
│   │   ├── profiles/        # Profile-narrowed EcosystemRuntime shapes (viewer, transactor, …)
│   │   ├── runtime.ts       # EcosystemRuntime, RuntimeCapability
│   │   ├── ecosystem-export.ts  # EcosystemExport (createRuntime, networks, metadata)
│   │   ├── common.ts        # Shared adapter primitives
│   │   └── index.ts
│   ├── common/              # NetworkEcosystem, address book helpers, …
│   ├── config/              # AppRuntimeConfig and app config types
│   ├── contracts/           # ContractSchema, ContractFunction, …
│   ├── execution/           # EOA / relayer execution config types
│   ├── forms/               # Form fields, layout, schema, validation
│   ├── networks/            # NetworkConfig unions and guards
│   ├── transactions/        # TransactionStatus, progress types
│   └── index.ts             # Main entry re-exports all modules
├── package.json
└── tsconfig.json
```

## Type Definitions

### Adapters & capabilities (`./src/adapters`)

- **`EcosystemRuntime`**: Per-network bundle of optional capabilities (`wallet`, `query`, `schema`, `execution`, `accessControl`, …). Created by each ecosystem’s `createRuntime(profile, networkConfig, options)` (see published `@openzeppelin/adapter-*` packages).
- **`RuntimeCapability`**: Base for Tier 2+ capabilities; includes `networkConfig` and `dispose()`.
- **`ProfileName`**: `'declarative' | 'viewer' | 'transactor' | 'composer' | 'operator'` — selects which capabilities are required for a runtime.
- **`EcosystemExport`**: Metadata + `networks` + `capabilities` factories + `createRuntime` — the object adapter packages publish as `ecosystemDefinition`.
- Individual **capability** interfaces (e.g. `WalletCapability`, `QueryCapability`, `TransactionFormCapabilities`) live under `./capabilities` and are re-exported from the package root.

Legacy monolithic `ContractAdapter` types are **not** part of the current public model; apps compose `EcosystemRuntime` and pass capability intersections (e.g. `TransactionFormProps['adapter']`) into UI packages.

### Config types (`./src/config`)

- `AppRuntimeConfig`: Shape of `app.config.json` for exported applications.

### Common types (`./src/common`)

- `NetworkEcosystem`: Supported blockchain ecosystems (e.g. `'evm'`, `'stellar'`).
- `AddressLabelResolver`, `AddressSuggestion`, `AddressSuggestionResolver`, `AddressBookAlias`, `AddressBookWidgetProps`: shared contracts for address book and labeling (used with `@openzeppelin/ui-components`).

### Contract types (`./src/contracts`)

- `ContractSchema`, `ContractFunction`, `ContractParameter`: ABI-level schema types.

### Form types (`./src/forms`)

- `FieldType`, `FormField`, `RenderFormSchema`, `BuilderFormConfig`, `FieldValidation`, `FormValues`.

### Network types (`./src/networks`)

- `BaseNetworkConfig`, discriminated `NetworkConfig`, and guards such as `isEvmNetworkConfig`.

### Execution types (`./src/execution`)

- `EoaExecutionConfig`, `RelayerExecutionConfig`, `RelayerDetails`, etc.

### Transaction types (`./src/transactions`)

- `TransactionStatus`, `TransactionProgress`, and related UI progress types.

## Integration with Other Packages

- **@openzeppelin/ui-components**: Form and layout types
- **@openzeppelin/ui-renderer**: `TransactionFormProps`, `ContractStateCapabilityProps`, etc.
- **@openzeppelin/ui-utils**: Shared utilities typed against these definitions

## Development

### Building

```bash
# From the monorepo root
pnpm --filter @openzeppelin/ui-types build

# Or from within the types package directory
pnpm build
```

### Testing

```bash
# From the monorepo root
pnpm --filter @openzeppelin/ui-types test

# Or from within the types package directory
pnpm test
```

## License

[AGPL-3.0](https://github.com/OpenZeppelin/openzeppelin-ui/blob/main/LICENSE)
