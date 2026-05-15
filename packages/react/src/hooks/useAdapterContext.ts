/**
 * useAdapterContext.ts
 *
 * This file provides a hook to access the runtime context throughout the application.
 * It's a critical part of the runtime singleton pattern, allowing components to
 * access the centralized runtime registry.
 *
 * The runtime singleton pattern ensures:
 * - Only one runtime instance exists per network
 * - Wallet connection state is consistent across the app
 * - Better performance by eliminating redundant runtime initialization
 */
import { useContext } from 'react';

import { RuntimeContext, RuntimeContextValue } from './AdapterContext';

/**
 * Hook to access the runtime context
 *
 * This hook provides access to the `getRuntimeForNetwork` function which
 * retrieves or creates runtime instances from the singleton registry.
 *
 * Components should typically use the higher-level wallet/runtime hooks instead
 * of this hook directly, as it handles React state update timing properly.
 *
 * @throws Error if used outside of a RuntimeProvider context
 * @returns The runtime context value
 */
export function useRuntimeContext(): RuntimeContextValue {
  const context = useContext(RuntimeContext);

  if (!context) {
    throw new Error('useRuntimeContext must be used within a RuntimeProvider');
  }

  return context;
}
