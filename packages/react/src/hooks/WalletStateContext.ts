import React, { createContext } from 'react';

import type {
  ContractAdapter,
  EcosystemSpecificReactHooks,
  NetworkConfig,
  UiKitConfiguration,
} from '@openzeppelin/ui-types';

export interface WalletStateContextValue {
  // Globally selected network state
  activeNetworkId: string | null;
  setActiveNetworkId: (networkId: string | null) => void;
  activeNetworkConfig: NetworkConfig | null;

  // Active adapter state
  activeAdapter: ContractAdapter | null;
  isAdapterLoading: boolean;

  // Facade hooks object from the active adapter
  // Consumers will call these hooks (e.g., walletFacadeHooks.useAccount())
  walletFacadeHooks: EcosystemSpecificReactHooks | null;
  reconfigureActiveAdapterUiKit: (uiKitConfig?: Partial<UiKitConfiguration>) => void;
}

/**
 * Shared Global Context Pattern
 * =============================
 *
 * WHY THIS EXISTS:
 * When bundlers (like Vite's optimizeDeps with esbuild) pre-bundle dependencies,
 * they may inline transitive dependencies like @openzeppelin/ui-react into the
 * consuming package's bundle. This creates MULTIPLE instances of this module:
 *
 * 1. The app's direct import → packages/react/dist/index.js
 * 2. The adapter's inlined copy → .vite/deps/@openzeppelin_ui-builder-adapter-evm.js
 *
 * Since React contexts use referential identity, these two module instances have
 * DIFFERENT context objects. When the adapter's components call useWalletState(),
 * they look for a context that was never provided (because WalletStateProvider
 * uses the app's context, not the adapter's inlined copy).
 *
 * SOLUTION:
 * Store the context object on globalThis so ALL module instances share the same
 * React context, regardless of how they were loaded or bundled.
 *
 * WHEN IS THIS NEEDED:
 * - Development with Vite's dependency pre-bundling (optimizeDeps)
 * - When adapters are installed from npm (not workspace-linked with same bundler)
 * - Any scenario where @openzeppelin/ui-react might be duplicated
 *
 * PRODUCTION APPS:
 * In production builds where the app and adapters are bundled together with proper
 * deduplication (e.g., via bundler configuration or peer dependencies), this
 * workaround may not be strictly necessary. However, it provides a safety net
 * and has minimal overhead.
 */
const WALLET_STATE_CONTEXT_KEY = '__OPENZEPPELIN_WALLET_STATE_CONTEXT__';

function getOrCreateSharedContext(): React.Context<WalletStateContextValue | undefined> {
  const global = globalThis as Record<string, unknown>;

  if (!global[WALLET_STATE_CONTEXT_KEY]) {
    global[WALLET_STATE_CONTEXT_KEY] = createContext<WalletStateContextValue | undefined>(
      undefined
    );
  }

  return global[WALLET_STATE_CONTEXT_KEY] as React.Context<WalletStateContextValue | undefined>;
}

export const WalletStateContext = getOrCreateSharedContext();

/**
 * Hook to access wallet state from WalletStateProvider.
 * @throws Error if used outside of WalletStateProvider
 */
export function useWalletState(): WalletStateContextValue {
  const context = React.useContext(WalletStateContext);
  if (context === undefined) {
    throw new Error('useWalletState must be used within a WalletStateProvider');
  }
  return context;
}
