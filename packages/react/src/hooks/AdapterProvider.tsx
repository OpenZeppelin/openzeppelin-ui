/**
 * RuntimeProvider.tsx
 *
 * This file implements the Runtime Provider component which manages a registry of
 * runtime instances. It's a key part of the runtime singleton pattern which ensures
 * that only one runtime instance exists per network configuration.
 *
 * The runtime registry is shared across the application via React Context, allowing
 * components to access the same runtime instances and maintain consistent wallet
 * connection state.
 *
 * IMPORTANT: This implementation needs special care to avoid React state update errors
 * during component rendering. Direct state updates during render are not allowed, which
 * is why runtime loading is controlled carefully.
 */
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { EcosystemRuntime, NetworkConfig } from '@openzeppelin/ui-types';
import { logger } from '@openzeppelin/ui-utils';

import { RuntimeContext, RuntimeContextValue, RuntimeRegistry } from './AdapterContext';

export interface RuntimeProviderProps {
  children: ReactNode;
  /** Function to resolve/create a runtime instance for a given NetworkConfig. */
  resolveRuntime: (networkConfig: NetworkConfig) => Promise<EcosystemRuntime>;
}

/**
 * Provider component that manages runtime instances centrally
 * to avoid creating multiple instances of the same runtime.
 *
 * This component:
 * 1. Maintains a registry of runtime instances by network ID
 * 2. Tracks loading states for runtimes being initialized
 * 3. Provides a function to get or load runtimes for specific networks
 * 4. Ensures runtime instances are reused when possible
 */
export function RuntimeProvider({ children, resolveRuntime }: RuntimeProviderProps) {
  // Registry to store runtime instances by network ID
  const [runtimeRegistry, setRuntimeRegistry] = useState<RuntimeRegistry>({});

  // Track loading states by network ID
  const [loadingNetworks, setLoadingNetworks] = useState<Set<string>>(new Set());
  const runtimeRegistryRef = useRef(runtimeRegistry);

  useEffect(() => {
    runtimeRegistryRef.current = runtimeRegistry;
  }, [runtimeRegistry]);

  useEffect(() => {
    return () => {
      Object.values(runtimeRegistryRef.current).forEach((runtime) => {
        runtime.dispose();
      });
    };
  }, []);

  // Log registry status on changes
  useEffect(() => {
    const runtimeCount = Object.keys(runtimeRegistry).length;
    if (runtimeCount > 0) {
      logger.info('RuntimeProvider', `Registry contains ${runtimeCount} runtimes:`, {
        networkIds: Object.keys(runtimeRegistry),
        loadingCount: loadingNetworks.size,
        loadingNetworkIds: Array.from(loadingNetworks),
      });
    }
  }, [runtimeRegistry, loadingNetworks]);

  /**
   * Function to get or create a runtime for a network
   *
   * IMPORTANT: Runtime loading is coordinated carefully to avoid React state updates
   * during render, which would cause errors.
   *
   * This function:
   * 1. Returns existing runtimes immediately if available
   * 2. Reports loading state for runtimes being initialized
   * 3. Initiates runtime loading when needed
   */
  const getRuntimeForNetwork = useCallback(
    (networkConfig: NetworkConfig | null) => {
      if (!networkConfig) {
        return { runtime: null, isLoading: false };
      }

      const networkId = networkConfig.id;

      // Debug log to track runtime requests
      logger.debug('RuntimeProvider', `Runtime requested for network ${networkId}`);

      // If we already have this runtime, return it
      if (runtimeRegistry[networkId]) {
        logger.debug('RuntimeProvider', `Using existing runtime for network ${networkId}`);
        return {
          runtime: runtimeRegistry[networkId],
          isLoading: false,
        };
      }

      // If we're already loading this runtime, indicate loading
      if (loadingNetworks.has(networkId)) {
        logger.debug('RuntimeProvider', `Runtime for network ${networkId} is currently loading`);
        return {
          runtime: null,
          isLoading: true,
        };
      }

      // Start loading the runtime.
      setLoadingNetworks((prev) => {
        const newSet = new Set(prev);
        newSet.add(networkId);
        return newSet;
      });

      logger.info(
        'RuntimeProvider',
        `Starting runtime initialization for network ${networkId} (${networkConfig.name})`
      );

      // Use the passed-in resolveRuntime function
      void resolveRuntime(networkConfig)
        .then((runtime) => {
          logger.info('RuntimeProvider', `Runtime for network ${networkId} loaded successfully`, {
            type: runtime.constructor.name,
            objectId: Object.prototype.toString.call(runtime),
          });

          // Update registry with new runtime
          setRuntimeRegistry((prev) => ({
            ...prev,
            [networkId]: runtime,
          }));

          // Remove from loading networks
          setLoadingNetworks((prev) => {
            const newSet = new Set(prev);
            newSet.delete(networkId);
            return newSet;
          });
        })
        .catch((error) => {
          logger.error('RuntimeProvider', `Error loading runtime for network ${networkId}:`, error);

          // Remove from loading networks on error
          setLoadingNetworks((prev) => {
            const newSet = new Set(prev);
            newSet.delete(networkId);
            return newSet;
          });
        });

      return {
        runtime: null,
        isLoading: true,
      };
    },
    [runtimeRegistry, loadingNetworks, resolveRuntime]
  );

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<RuntimeContextValue>(
    () => ({
      getRuntimeForNetwork,
    }),
    [getRuntimeForNetwork]
  );

  return <RuntimeContext.Provider value={contextValue}>{children}</RuntimeContext.Provider>;
}
