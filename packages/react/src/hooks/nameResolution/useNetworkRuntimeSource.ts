import { useContext } from 'react';

import type { EcosystemRuntime, NetworkConfig } from '@openzeppelin/ui-types';

import { RuntimeContext } from '../AdapterContext';

/**
 * Runtime source for a specific network, loaded through {@link RuntimeProvider}'s
 * registry without mutating the wallet's active network.
 */
export interface NetworkRuntimeSource {
  readonly runtime: EcosystemRuntime | null;
  readonly networkId: string;
  readonly isRuntimeLoading: boolean;
}

/**
 * Soft-reads {@link RuntimeContext} (never throws) and requests the registry
 * runtime for `network`. Call during render so loading state updates propagate.
 *
 * Does not mutate {@link WalletStateProvider}'s active network — wallet-global
 * runtime is never consulted when a scoped network is supplied (INV-154).
 */
export function useNetworkRuntimeSource(network: NetworkConfig | null): NetworkRuntimeSource {
  const runtimeContext = useContext(RuntimeContext);

  if (!network) {
    return { runtime: null, networkId: '', isRuntimeLoading: false };
  }

  if (!runtimeContext) {
    return { runtime: null, networkId: network.id, isRuntimeLoading: false };
  }

  const { runtime, isLoading } = runtimeContext.getRuntimeForNetwork(network);

  return {
    runtime,
    networkId: network.id,
    isRuntimeLoading: isLoading,
  };
}
