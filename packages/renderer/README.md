# @openzeppelin/ui-renderer

React components for rendering blockchain transaction forms, contract state displays, and wallet interactions.

[![npm version](https://img.shields.io/npm/v/@openzeppelin/ui-renderer.svg)](https://www.npmjs.com/package/@openzeppelin/ui-renderer)

## Installation

```bash
# Using npm
npm install @openzeppelin/ui-renderer @openzeppelin/ui-types

# Using yarn
yarn add @openzeppelin/ui-renderer @openzeppelin/ui-types

# Using pnpm
pnpm add @openzeppelin/ui-renderer @openzeppelin/ui-types
```

## Peer Dependencies

```bash
pnpm add react react-dom react-hook-form
```

## Features

- Transaction form rendering with dynamic field generation
- Contract state querying and display (view functions)
- Transaction status tracking with explorer links
- Execution method configuration (EOA/Relayer)
- Network settings and wallet connection components
- TypeScript support with full type definitions
- Support for both ESM and CommonJS environments

## Components

### TransactionForm

Main component for rendering blockchain transaction forms with dynamic field generation.

### ContractStateWidget

Widget for querying and displaying contract state through view functions. Supports parameter-less view functions with auto-refresh capabilities.

### ContractActionBar

Action bar component displaying network status and contract state toggle controls.

### ExecutionConfigDisplay

Displays and configures transaction execution methods (EOA direct signing or Relayer-based).

### TransactionStatusDisplay

Shows transaction progress, hash display with explorer links, and execution results.

### NetworkSettingsDialog

Dialog for configuring network-specific settings like RPC endpoints and indexer URLs.

### WalletConnectionWithSettings

Composed wallet connection component with integrated settings controls.

### DynamicFormField

Renders form fields dynamically based on field type configuration.

## Type System

This package uses type definitions from `@openzeppelin/ui-types`:

```tsx
import { TransactionForm } from '@openzeppelin/ui-renderer';
import type { ContractAdapter, FormValues, RenderFormSchema } from '@openzeppelin/ui-types';
```

## Component Styling

This package renders forms using UI components from `@openzeppelin/ui-components`. **This package does not ship pre-compiled CSS.**

Styling relies on the consuming application to:

1. **Include Tailwind CSS** in its build process.
2. **Configure Tailwind** to scan the `@openzeppelin/ui-components` package's source files.
3. **Import the shared theme** from `@openzeppelin/ui-styles`.

```css
@import '@openzeppelin/ui-styles/global.css';
@import 'tailwindcss';
```

## Usage

### Transaction Form

```tsx
import { TransactionForm } from '@openzeppelin/ui-renderer';
import type { ContractAdapter, EvmNetworkConfig, RenderFormSchema } from '@openzeppelin/ui-types';

const schema: RenderFormSchema = {
  id: 'transfer-form',
  title: 'Transfer Tokens',
  fields: [
    { id: 'to', name: 'to', type: 'address', label: 'Recipient' },
    { id: 'amount', name: 'amount', type: 'amount', label: 'Amount' },
  ],
  layout: { columns: 1, spacing: 'normal', labelPosition: 'top' },
  submitButton: { text: 'Transfer', loadingText: 'Transferring...' },
};

function App() {
  return (
    <TransactionForm
      schema={schema}
      adapter={adapter}
      networkConfig={networkConfig}
      onSubmit={handleSubmit}
    />
  );
}
```

### Contract State Widget

```tsx
import { ContractStateWidget } from '@openzeppelin/ui-renderer';

function ContractView() {
  return (
    <ContractStateWidget
      contractSchema={schema}
      contractAddress="0x..."
      adapter={adapter}
      isVisible={true}
    />
  );
}
```

### Contract Action Bar

```tsx
import { ContractActionBar } from '@openzeppelin/ui-renderer';

function FormHeader() {
  return (
    <ContractActionBar
      networkConfig={networkConfig}
      contractAddress={contractAddress}
      onToggleContractState={handleToggle}
    />
  );
}
```

## API Reference

### `<TransactionForm>`

| Prop            | Type                       | Description                                  |
| --------------- | -------------------------- | -------------------------------------------- |
| `schema`        | `RenderFormSchema`         | The schema definition for the form           |
| `adapter`       | `ContractAdapter`          | The blockchain adapter instance              |
| `networkConfig` | `NetworkConfig`            | Network configuration for the target network |
| `onSubmit`      | `(data: FormData) => void` | Callback function when form is submitted     |
| `previewMode`   | `boolean`                  | (Optional) Renders form in preview mode      |
| `initialValues` | `FormData`                 | (Optional) Initial values for form fields    |
| `disabled`      | `boolean`                  | (Optional) Disables all form fields          |
| `loading`       | `boolean`                  | (Optional) Shows loading state               |

### `<ContractStateWidget>`

| Prop              | Type              | Description                             |
| ----------------- | ----------------- | --------------------------------------- |
| `contractSchema`  | `ContractSchema`  | The contract schema with view functions |
| `contractAddress` | `string`          | The deployed contract address           |
| `adapter`         | `ContractAdapter` | The blockchain adapter instance         |
| `isVisible`       | `boolean`         | (Optional) Controls widget visibility   |
| `onToggle`        | `() => void`      | (Optional) Callback for toggle actions  |

### `<ContractActionBar>`

| Prop                    | Type            | Description                              |
| ----------------------- | --------------- | ---------------------------------------- |
| `networkConfig`         | `NetworkConfig` | Network configuration to display         |
| `contractAddress`       | `string`        | (Optional) Contract address              |
| `onToggleContractState` | `() => void`    | (Optional) Toggle contract state widget  |
| `isWidgetExpanded`      | `boolean`       | (Optional) Current widget expanded state |

## Package Structure

```text
renderer/
├── src/
│   ├── components/
│   │   ├── ContractActionBar/       # Network status and actions
│   │   ├── ContractStateWidget/     # View function queries
│   │   ├── ExecutionConfigDisplay/  # EOA/Relayer configuration
│   │   ├── network/                 # Network settings components
│   │   ├── transaction/             # Transaction status components
│   │   ├── TransactionForm.tsx      # Main form component
│   │   └── DynamicFormField.tsx     # Dynamic field rendering
│   ├── types/
│   ├── utils/
│   └── index.ts
├── package.json
├── tsconfig.json
└── tsdown.config.ts
```

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
```

## License

[AGPL-3.0](https://github.com/OpenZeppelin/openzeppelin-ui/blob/main/LICENSE)
