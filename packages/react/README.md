# @openzeppelin/ui-react

Core React context providers and hooks for the OpenZeppelin UI ecosystem.

[![npm version](https://img.shields.io/npm/v/@openzeppelin/ui-react.svg)](https://www.npmjs.com/package/@openzeppelin/ui-react)

## Installation

```bash
# Using npm
npm install @openzeppelin/ui-react

# Using yarn
yarn add @openzeppelin/ui-react

# Using pnpm
pnpm add @openzeppelin/ui-react
```

## Peer Dependencies

```bash
pnpm add react react-dom @tanstack/react-query
```

## Overview

This package provides core React context providers and hooks that centralize the management of global wallet state, active network selection, active adapter instances, and the consumption of adapter-specific UI capabilities.

It is a foundational package that can be used to ensure consistent wallet and adapter integration patterns across applications.

## Core Responsibilities

- **Adapter Instance Management:** Provides `AdapterProvider` which maintains a registry of `ContractAdapter` instances, ensuring only one instance exists per network configuration (singleton pattern).
- **Global Wallet/Network State Management:** Provides `WalletStateProvider` which manages:
  - The globally selected active network ID and its corresponding `NetworkConfig`.
  - The active `ContractAdapter` instance for this global network and its loading state.
  - The `EcosystemSpecificReactHooks` (facade hooks) provided by the active adapter.
  - Orchestration of rendering the active adapter's UI context provider.
- **Consistent State Access:** Exports consumer hooks for components to access this managed state and functionality.

## Key Exports

### Providers

- `AdapterProvider`: Manages adapter instances. Requires a `resolveAdapter` prop to fetch/create adapters.
- `WalletStateProvider`: Manages global active network/adapter/wallet state.

### Hooks

- `useAdapterContext()`: Access `AdapterProvider`'s `getAdapterForNetwork` function.
- `useWalletState()`: Access global state like `activeNetworkId`, `activeAdapter`, `walletFacadeHooks`, and `setActiveNetworkId`.

### Derived Hooks

These hooks abstract wallet interactions and work with any adapter implementing the facade pattern:

- `useDerivedAccountStatus()`: Returns connection status, address, and current chain ID.
- `useDerivedSwitchChainStatus()`: Returns the `switchChain` function and switching state.
- `useDerivedChainInfo()`: Returns current chain information.
- `useDerivedConnectStatus()`: Returns wallet connection functions and state.
- `useDerivedDisconnect()`: Returns the disconnect function.
- `useWalletReconnectionHandler()`: Detects wallet reconnection and triggers network switch re-queue.

### UI Components

- `WalletConnectionHeader`: Compact wallet connection status display.
- `WalletConnectionUI`: Full wallet connection interface.
- `WalletConnectionWithSettings`: Wallet connection UI with settings controls.
- `NetworkSwitchManager`: Handles automatic wallet network switching for EVM chains.

## Usage

### Application Setup

```tsx
import { AdapterProvider, WalletStateProvider } from '@openzeppelin/ui-react';

import { getAdapter, getNetworkById } from './core/ecosystemManager';

function AppRoot() {
  return (
    <AdapterProvider resolveAdapter={getAdapter}>
      <WalletStateProvider
        initialNetworkId="ethereum-mainnet"
        getNetworkConfigById={getNetworkById}
      >
        {/* Your application components */}
      </WalletStateProvider>
    </AdapterProvider>
  );
}
```

### Consuming Global State

```tsx
import { useWalletState } from '@openzeppelin/ui-react';

function MyWalletComponent() {
  const {
    activeNetworkId,
    activeNetworkConfig,
    activeAdapter,
    isAdapterLoading,
    walletFacadeHooks,
    setActiveNetworkId,
  } = useWalletState();

  if (isAdapterLoading || !activeAdapter) {
    return <p>Loading wallet information...</p>;
  }

  const accountInfo = walletFacadeHooks?.useAccount ? walletFacadeHooks.useAccount() : null;
  const isConnected = accountInfo?.isConnected;

  return (
    <div>
      <p>Current Network: {activeNetworkConfig?.name || 'None'}</p>
      <p>Wallet Connected: {isConnected ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

### Using NetworkSwitchManager

```tsx
import { useState } from 'react';

import { NetworkSwitchManager } from '@openzeppelin/ui-react';

function MyApp() {
  const [networkToSwitchTo, setNetworkToSwitchTo] = useState<string | null>(null);
  const adapter = useMyAdapter();

  const handleNetworkSwitchComplete = () => {
    setNetworkToSwitchTo(null);
  };

  return (
    <>
      {adapter && networkToSwitchTo && (
        <NetworkSwitchManager
          adapter={adapter}
          targetNetworkId={networkToSwitchTo}
          onNetworkSwitchComplete={handleNetworkSwitchComplete}
        />
      )}
    </>
  );
}
```

## Package Structure

```text
react/
├── src/
│   ├── components/             # UI components (WalletConnection*, NetworkSwitchManager)
│   ├── hooks/                  # Context providers and consumer hooks
│   └── index.ts                # Main package exports
├── package.json
├── tsconfig.json
├── tsdown.config.ts
└── README.md
```

## Dependencies

This package has minimal dependencies to maintain a lightweight footprint:

- **@openzeppelin/ui-types**: Shared type definitions
- **@openzeppelin/ui-utils**: Shared utility functions
- **@openzeppelin/ui-components**: UI components
- **react**: Peer dependency for React hooks and context
- **react-dom**: Peer dependency for React DOM utilities
- **@tanstack/react-query**: Peer dependency for data fetching

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
