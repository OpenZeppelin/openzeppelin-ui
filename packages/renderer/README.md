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

### AddressBookWidget

Full-featured widget for managing a personal address book with aliases, search, network filtering, import/export, and CRUD operations. Designed to receive all data and mutations via props (dependency injection) from `useAddressBookWidgetProps` in `@openzeppelin/ui-storage`.

### AliasEditPopover

Floating popover for inline alias editing. Positioned near the edit trigger via an anchor rect. Includes address lookup and save/create functionality.

### useAliasEditState

Pure UI state hook for managing the inline alias edit popover. Returns `editing`, `onEditLabel`, `handleClose`, and `lastClickRef` for coordinating popover display with `AddressLabelProvider`.

### DynamicFormField

Renders form fields dynamically based on field type configuration.

## Type System

This package uses type definitions from `@openzeppelin/ui-types`. Form and state widgets take **capability intersections** (for example `TransactionFormCapabilities`, `QueryCapability` + `SchemaCapability`) rather than a single monolithic adapter type:

```tsx
import { TransactionForm } from '@openzeppelin/ui-renderer';
import type { FormValues, RenderFormSchema, TransactionFormCapabilities } from '@openzeppelin/ui-types';
```

## Component Styling

This package renders forms using UI components from `@openzeppelin/ui-components`. **This package does not ship pre-compiled CSS.**

Styling relies on the consuming application to:

1. **Include Tailwind CSS** in its build process.
2. **Configure Tailwind** to scan the OpenZeppelin UI and adapter packages that provide class names.
3. **Import the shared theme** from `@openzeppelin/ui-styles`.

For consumer apps that use `@openzeppelin/ui-dev-cli`, the recommended workflow is:

```bash
pnpm exec oz-ui-dev tailwind doctor --project "$PWD"
pnpm exec oz-ui-dev tailwind fix --project "$PWD"
```

That generates a managed `oz-tailwind.generated.css` file so Tailwind v4 always sees the required `@source` entries.

If you need to wire Tailwind manually, use explicit `@source` directives instead of a bare import:

```css
@layer base, components, utilities;

@import 'tailwindcss' source(none);
@source "../node_modules/@openzeppelin/ui-components";
@source "../node_modules/@openzeppelin/ui-react";
@source "../node_modules/@openzeppelin/ui-renderer";
@source "../node_modules/@openzeppelin/ui-styles";
@source "../node_modules/@openzeppelin/ui-utils";
@import '@openzeppelin/ui-styles/global.css';
```

## Usage

### Transaction Form

`TransactionForm` expects an `adapter` prop typed as **`TransactionFormCapabilities`** (execution, schema, type mapping, wallet-related pieces, etc., depending on profile). Derive it from your active `EcosystemRuntime` (for example by intersecting the capabilities your app uses) or pass the object your ecosystem exposes for transaction authoring.

```tsx
import { TransactionForm } from '@openzeppelin/ui-renderer';
import type { RenderFormSchema, TransactionFormCapabilities } from '@openzeppelin/ui-types';

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

function App({
  adapter,
  contractSchema,
}: {
  adapter: TransactionFormCapabilities;
  contractSchema: import('@openzeppelin/ui-types').ContractSchema;
}) {
  return (
    <TransactionForm
      schema={schema}
      contractSchema={contractSchema}
      adapter={adapter}
      onTransactionSuccess={handleTransactionSuccess}
    />
  );
}
```

### Contract State Widget

`ContractStateWidget` extends **`ContractStateCapabilityProps`**: pass `query` and `schema` capabilities (from the active runtime) so view calls use the same network and schema pipeline as the rest of the app.

```tsx
import { ContractStateWidget } from '@openzeppelin/ui-renderer';

function ContractView({
  query,
  schema,
}: {
  query: import('@openzeppelin/ui-types').QueryCapability;
  schema: import('@openzeppelin/ui-types').SchemaCapability;
}) {
  return (
    <ContractStateWidget
      contractSchema={contractSchema}
      contractAddress="0x..."
      query={query}
      schema={schema}
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

See **`TransactionFormProps`** in `@openzeppelin/ui-types` for the full contract. Important props:

| Prop                  | Type                         | Description                                        |
| --------------------- | ---------------------------- | -------------------------------------------------- |
| `schema`              | `RenderFormSchema`           | Form layout and fields                             |
| `contractSchema`      | `ContractSchema` (optional)| ABI / function metadata for the target call        |
| `adapter`             | `TransactionFormCapabilities`| Capability bundle for signing, mapping, execution  |
| `executionConfig`     | `ExecutionConfig` (optional) | EOA vs relayer and related options              |
| `onTransactionSuccess`| callback (optional)          | Fires after a successful transaction lifecycle     |
| `isWalletConnected`   | `boolean` (optional)         | Whether a wallet session is present                |

Network configuration is taken from **`adapter.networkConfig`** (see `RuntimeCapability`).

### `<ContractStateWidget>`

Implements **`ContractStateCapabilityProps`** plus display props:

| Prop              | Type                     | Description                                      |
| ----------------- | ------------------------ | ------------------------------------------------ |
| `contractSchema`  | `ContractSchema \| null` | Contract schema with view functions              |
| `contractAddress` | `string \| null`         | Deployed contract address                        |
| `query`           | `QueryCapability`        | View/query capability (includes `networkConfig`) |
| `schema`          | `SchemaCapability`       | Schema capability for the active network         |
| `isVisible`       | `boolean`                | (Optional) Controls widget visibility            |
| `onToggle`        | `() => void`             | (Optional) Toggle callback                       |
| `error`           | `Error \| null`          | (Optional) External error to surface             |

### `<ContractActionBar>`

| Prop                    | Type            | Description                              |
| ----------------------- | --------------- | ---------------------------------------- |
| `networkConfig`         | `NetworkConfig` | Network configuration to display         |
| `contractAddress`       | `string`        | (Optional) Contract address              |
| `onToggleContractState` | `() => void`    | (Optional) Toggle contract state widget  |
| `isWidgetExpanded`      | `boolean`       | (Optional) Current widget expanded state |

### Address Book Usage

```tsx
import { AddressBookWidget, AliasEditPopover, useAliasEditState } from '@openzeppelin/ui-renderer';
import { useAddressBookWidgetProps, useAliasEditCallbacks } from '@openzeppelin/ui-storage';

function Settings() {
  const widgetProps = useAddressBookWidgetProps(db, { networkId: selectedNetwork?.id });
  const editCallbacks = useAliasEditCallbacks(db);
  const { editing, onEditLabel, handleClose, lastClickRef } = useAliasEditState(
    selectedNetwork?.id
  );

  return (
    <div
      onPointerDown={(e) => {
        lastClickRef.current = { x: e.clientX, y: e.clientY };
      }}
    >
      <AddressBookWidget {...widgetProps} />
      {editing && <AliasEditPopover {...editing} onClose={handleClose} {...editCallbacks} />}
    </div>
  );
}
```

## Package Structure

```text
renderer/
├── src/
│   ├── components/
│   │   ├── AddressBookWidget/       # Address book management widget
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
