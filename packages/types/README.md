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

- Contract and blockchain related types
- Form field and layout definitions
- Adapter interfaces

By centralizing type definitions, we ensure consistency across all packages and eliminate type duplication.

## Usage

The package is organized into namespaces for better organization and to prevent naming collisions.

```typescript
// Import everything
import { adapters, contracts, forms } from '@openzeppelin/ui-types';

// Import specific namespaces
import * as contracts from '@openzeppelin/ui-types';
import * as adapters from '@openzeppelin/ui-types';
import * as forms from '@openzeppelin/ui-types';

// Import specific types from their respective namespaces
import { ContractAdapter } from '@openzeppelin/ui-types';
import { FieldType, FormFieldType } from '@openzeppelin/ui-types';

// Example usage in a function
function validateField(field: forms.FormFieldType): boolean {
  // Implementation
  return true;
}
```

## Package Structure

```text
types/
├── src/
│   ├── adapters/           # Contract adapter interfaces
│   │   ├── base.ts         # Core ContractAdapter interface
│   │   ├── contract-state.ts # Contract state querying capabilities
│   │   └── index.ts        # Re-exports all adapter types
│   ├── common/             # Common types shared across namespaces
│   │   ├── ecosystem.ts    # NetworkEcosystem enum/type
│   │   └── index.ts        # Re-exports common types
│   ├── config/             # Types for runtime application configuration
│   │   └── app-config.ts   # Defines AppRuntimeConfig and related types
│   ├── contracts/          # Contract schema related types
│   │   ├── schema.ts       # ContractSchema, ContractFunction etc.
│   │   └── index.ts        # Re-exports contract types
│   ├── execution/          # Types for transaction execution methods
│   │   ├── eoa.ts
│   │   ├── relayer.ts
│   │   └── ...
│   ├── forms/              # Form field, layout, schema, and validation definitions
│   │   ├── fields.ts       # Base FieldType definitions
│   │   ├── form-field.ts   # FormField definition
│   │   ├── layout.ts       # FormLayout definitions
│   │   ├── schema.ts       # RenderFormSchema, BuilderFormConfig definitions
│   │   ├── validation.ts   # FieldValidation definitions
│   │   ├── values.ts       # FormValues type
│   │   └── index.ts        # Re-exports all form types
│   ├── networks/           # Network configuration types
│   │   ├── config.ts       # Network config interfaces and type guards
│   │   ├── validation.ts   # Network configuration validation utilities
│   │   └── index.ts        # Re-exports all network types
│   ├── transactions/       # Types related to transaction submission status
│   │   ├── status.ts       # TransactionStatus types
│   │   └── index.ts        # Re-exports transaction types
│   └── index.ts            # Main entry point that re-exports all modules
├── package.json
└── tsconfig.json
```

## Type Definitions

### Adapter Types (`./src/adapters`)

Interfaces for blockchain-specific adapters:

- `ContractAdapter`: The core interface defining methods for loading contracts, mapping types, querying state, formatting data, validating addresses, handling transactions, and interacting with wallets.
- `AccessControlService`: Interface for access control and ownership management operations on contracts.

### Config Types (`./src/config`)

- `AppRuntimeConfig`: Defines the shape of the `app.config.json` file used by exported applications.

### Common Types (`./src/common`)

- `NetworkEcosystem`: Enum or type defining supported blockchain ecosystems (e.g., 'evm', 'solana').

### Contract Types (`./src/contracts`)

- `ContractSchema`: Interface for contract schema definitions (ABI in EVM).
- `ContractFunction`: Interface for function definitions within a contract.
- `ContractParameter`: Interface for function parameter definitions.

### Form Types (`./src/forms`)

- `FieldType`: Types of form fields (text, number, boolean, address, select, etc.).
- `FormField`: Complete definition of a form field including ID, type, label, validation, etc.
- `RenderFormSchema`: The schema used by the renderer package.
- `BuilderFormConfig`: The configuration used by builder applications.
- `FieldValidation`: Validation rules for form fields.
- `FormValues`: Type representing the collected data from a form submission.

### Network Types (`./src/networks`)

- Interfaces for common properties (`BaseNetworkConfig`) and ecosystem-specific details.
- The discriminated union type `NetworkConfig` representing any valid network configuration.
- Type guard functions (e.g., `isEvmNetworkConfig(config)`) to safely narrow down the `NetworkConfig` union type.

### Execution Types (`./src/execution`)

- Types related to transaction execution strategies, such as `EoaExecutionConfig`, `RelayerExecutionConfig`, and `RelayerDetails`.

### Transaction Types (`./src/transactions`)

- `TransactionStatus`: Enum or type defining possible states (Idle, Signing, Broadcasting, PendingConfirmation, Success, Error).
- `TransactionProgress`: Interface holding details like transaction hash, error messages, explorer links.

## Integration with Other Packages

This package is a dependency for multiple packages in the ecosystem:

- **@openzeppelin/ui-components**: Uses types for form field rendering
- **@openzeppelin/ui-renderer**: Uses types for form rendering and validation
- **@openzeppelin/ui-utils**: Uses types for utility functions

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
