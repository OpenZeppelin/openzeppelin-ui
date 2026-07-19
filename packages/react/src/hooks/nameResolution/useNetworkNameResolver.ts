import type { NameResolver, NetworkConfig } from '@openzeppelin/ui-types';

import { useRuntimeNameResolver } from './useRuntimeNameResolver';

/**
 * @deprecated Pass the network to {@link useRuntimeNameResolver} instead.
 */
export function useNetworkNameResolver(network: NetworkConfig | null): NameResolver {
  return useRuntimeNameResolver(network ?? undefined);
}
