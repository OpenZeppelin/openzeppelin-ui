import React, { createContext } from 'react';

import type {
  EcosystemRuntime,
  EcosystemSpecificReactHooks,
  NetworkConfig,
  UiKitConfiguration,
} from '@openzeppelin/ui-types';

export interface WalletStateContextValue {
  // Globally selected network state
  activeNetworkId: string | null;
  setActiveNetworkId: (networkId: string | null) => void;
  activeNetworkConfig: NetworkConfig | null;

  // Active runtime state
  activeRuntime: EcosystemRuntime | null;
  isRuntimeLoading: boolean;

  // Facade hooks object from the active runtime's UI kit
  // Consumers will call these hooks (e.g., walletFacadeHooks.useAccount())
  walletFacadeHooks: EcosystemSpecificReactHooks | null;
  reconfigureActiveUiKit: (uiKitConfig?: Partial<UiKitConfiguration>) => void;
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

/**
 * Use Symbol.for() to create a globally unique key that is consistent across
 * all module instances. Unlike Symbol(), Symbol.for() returns the same symbol
 * for the same key string, which is essential for cross-module sharing.
 */
const WALLET_STATE_CONTEXT_KEY = Symbol.for('@openzeppelin/ui-react/WalletStateContext');

/**
 * Type-safe interface for the global object extension.
 * This provides better type safety than using Record<string, unknown>.
 */
interface GlobalWithWalletContext {
  [WALLET_STATE_CONTEXT_KEY]?: React.Context<WalletStateContextValue | undefined>;
}

/**
 * Retrieves or creates the shared WalletStateContext.
 *
 * NOTE ON ATOMICITY:
 * The check-then-set pattern here is not atomic, but this is acceptable because:
 * 1. JavaScript is single-threaded; module initialization is synchronous
 * 2. Even if multiple modules initialize "simultaneously" during parallel loading,
 *    they execute sequentially on the main thread
 * 3. The worst case (two contexts created) would only happen if the check and set
 *    were somehow interleaved, which cannot occur in JS's execution model
 * 4. For React contexts specifically, having the same context object is what matters,
 *    and this pattern guarantees that after initialization
 */
function getOrCreateSharedContext(): React.Context<WalletStateContextValue | undefined> {
  const global = globalThis as GlobalWithWalletContext;

  if (!global[WALLET_STATE_CONTEXT_KEY]) {
    global[WALLET_STATE_CONTEXT_KEY] = createContext<WalletStateContextValue | undefined>(
      undefined
    );
  }

  return global[WALLET_STATE_CONTEXT_KEY];
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
