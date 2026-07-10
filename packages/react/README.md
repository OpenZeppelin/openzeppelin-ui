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

This package provides core React context providers and hooks that centralize the management of global wallet state, active network selection, **`EcosystemRuntime` instances** (capability bundles per network), and ecosystem-specific UI kit hooks.

It is a foundational package that can be used to ensure consistent wallet and runtime integration patterns across applications.

## Core Responsibilities

- **Runtime instance management:** `RuntimeProvider` keeps a registry of `EcosystemRuntime` instances (one per network id, with disposal on teardown), using a `resolveRuntime` function you supply (typically delegating to an adapter package’s `ecosystemDefinition.createRuntime`).
- **Global wallet / network state:** `WalletStateProvider` manages:
  - Globally selected network id and `NetworkConfig`
  - The active `EcosystemRuntime` and its loading state (`isRuntimeLoading`)
  - `EcosystemSpecificReactHooks` from the active runtime’s UI kit
  - Orchestration of the active ecosystem’s React UI provider (when configured)
- **Consistent access:** Hooks expose this state to components.

## Key Exports

### Providers

- **`RuntimeProvider`**: Registry + loading state; requires `resolveRuntime: (networkConfig) => Promise<EcosystemRuntime>`.
- **`WalletStateProvider`**: Global active network / runtime / wallet facade hooks; requires `getNetworkConfigById` and optionally `loadConfigModule` for UI kit config modules.

### Hooks

- **`useRuntimeContext()`**: Low-level access to `getRuntimeForNetwork` / loading helpers from `RuntimeProvider`.
- **`useWalletState()`**: `activeNetworkId`, `activeNetworkConfig`, **`activeRuntime`**, **`isRuntimeLoading`**, `walletFacadeHooks`, `setActiveNetworkId`, `reconfigureActiveUiKit`.

### Name resolution (ENS forward + reverse)

See the [ENS address input integration guide](../../docs/ens-address-input/README.md) for the full wiring story. Key exports:

- **`NameResolutionProvider`** / **`useResolveName`** / **`useResolveAddress`** — SF-2 async engine (debounce, cache, retries, closed error union)
- **`useRuntimeNameResolver`** — maps the active runtime's `nameResolution` capability into the dumb `NameResolver` shape consumed by `@openzeppelin/ui-components`' `NameResolverProvider`

### Derived hooks

These abstract wallet interactions across ecosystems:

- `useDerivedAccountStatus()`, `useDerivedSwitchChainStatus()`, `useDerivedChainInfo()`, `useDerivedConnectStatus()`, `useDerivedDisconnect()`, `useWalletReconnectionHandler()`.

### UI components

- `WalletConnectionHeader`, `WalletConnectionUI`, `WalletConnectionWithSettings`
- **`NetworkSwitchManager`**: Pass **`wallet`** and **`networkCatalog`** from the active runtime (see below), plus `targetNetworkId` and optional `onNetworkSwitchComplete`.

## Usage

### Application setup

```tsx
import { RuntimeProvider, WalletStateProvider } from '@openzeppelin/ui-react';

import { ecosystemDefinition } from '@openzeppelin/adapter-evm';
import { getNetworkById } from './core/ecosystemManager';

async function resolveRuntime(networkConfig) {
  return ecosystemDefinition.createRuntime('composer', networkConfig, {
    /* profile-specific options if needed */
  });
}

function AppRoot() {
  return (
    <RuntimeProvider resolveRuntime={resolveRuntime}>
      <WalletStateProvider
        initialNetworkId="ethereum-mainnet"
        getNetworkConfigById={getNetworkById}
      >
        {/* Your application */}
      </WalletStateProvider>
    </RuntimeProvider>
  );
}
```

### Consuming global state

```tsx
import { useWalletState } from '@openzeppelin/ui-react';

function MyWalletComponent() {
  const {
    activeNetworkId,
    activeNetworkConfig,
    activeRuntime,
    isRuntimeLoading,
    walletFacadeHooks,
    setActiveNetworkId,
  } = useWalletState();

  if (isRuntimeLoading || !activeRuntime) {
    return <p>Loading wallet information...</p>;
  }

  const accountInfo = walletFacadeHooks?.useAccount ? walletFacadeHooks.useAccount() : null;
  const isConnected = accountInfo?.isConnected;

  return (
    <div>
      <p>Current Network: {activeNetworkConfig?.name ?? 'None'}</p>
      <p>Wallet Connected: {isConnected ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

### NetworkSwitchManager

Use capabilities from the active runtime — **not** a monolithic adapter instance:

```tsx
import { useState } from 'react';

import { NetworkSwitchManager, useWalletState } from '@openzeppelin/ui-react';

function MyApp() {
  const [networkToSwitchTo, setNetworkToSwitchTo] = useState<string | null>(null);
  const { activeRuntime } = useWalletState();

  const handleNetworkSwitchComplete = () => {
    setNetworkToSwitchTo(null);
  };

  const wallet = activeRuntime?.wallet;
  const networkCatalog = activeRuntime?.networkCatalog;

  return (
    <>
      {wallet && networkCatalog && networkToSwitchTo && (
        <NetworkSwitchManager
          wallet={wallet}
          networkCatalog={networkCatalog}
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
│   ├── components/             # WalletConnection*, NetworkSwitchManager
│   ├── hooks/                  # RuntimeProvider, WalletStateProvider, derived hooks
│   └── index.ts
├── package.json
├── tsconfig.json
├── tsdown.config.ts
└── README.md
```

## Dependencies

- **@openzeppelin/ui-types**, **@openzeppelin/ui-utils**, **@openzeppelin/ui-components**
- **react**, **react-dom**, **@tanstack/react-query** (peers)

## Development

```bash
pnpm build
pnpm test
pnpm lint
```

## License

[AGPL-3.0](https://github.com/OpenZeppelin/openzeppelin-ui/blob/main/LICENSE)
