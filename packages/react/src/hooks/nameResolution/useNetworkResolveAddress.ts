import type { NetworkConfig } from '@openzeppelin/ui-types';

import { type UseResolveAddressResult } from './resolutionState';
import { useResolveAddress, type UseResolveAddressOptions } from './useResolveAddress';

/**
 * @deprecated Pass `network` in {@link UseResolveAddressOptions} to {@link useResolveAddress}.
 */
export function useNetworkResolveAddress(
  address: string | null | undefined,
  network: NetworkConfig | null | undefined,
  options?: Omit<UseResolveAddressOptions, 'network'>
): UseResolveAddressResult {
  return useResolveAddress(address, network != null ? { ...options, network } : options);
}
