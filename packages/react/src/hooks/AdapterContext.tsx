/**
 * AdapterContext.tsx
 *
 * This file defines the React Context used for the runtime singleton pattern.
 * It provides types and the context definition, but the actual implementation
 * is in the `RuntimeProvider` component.
 *
 * The runtime singleton pattern ensures that only one runtime instance exists
 * per network configuration, which is critical for consistent wallet connection
 * state across the application.
 */
import { createContext } from 'react';

import type { EcosystemRuntime, NetworkConfig } from '@openzeppelin/ui-types';

/**
 * Registry type that maps network IDs to their corresponding runtime instances.
 */
export interface RuntimeRegistry {
  [networkId: string]: EcosystemRuntime;
}

/**
 * Context value interface defining what's provided through the context.
 * The main functionality is `getRuntimeForNetwork`, which either returns an existing
 * runtime or initiates loading of a new one.
 */
export interface RuntimeContextValue {
  getRuntimeForNetwork: (networkConfig: NetworkConfig | null) => {
    runtime: EcosystemRuntime | null;
    isLoading: boolean;
  };
  /**
   * Evicts a runtime from the registry and calls `dispose()` on it.
   * Used by WalletStateProvider to release superseded runtimes after a safe handoff.
   */
  releaseRuntime: (networkId: string) => void;
}

/**
 * The React Context that provides runtime registry access throughout the app.
 * Components can access this through the `useRuntimeContext` hook.
 */
export const RuntimeContext = createContext<RuntimeContextValue | null>(null);
