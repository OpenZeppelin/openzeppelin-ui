import { useContext, useMemo } from 'react';

import type { NameResolver, NetworkConfig } from '@openzeppelin/ui-types';

import { WalletStateContext } from '../WalletStateContext';
import { createNameResolverFromCapability } from './createNameResolver';
import { useNameResolutionContext } from './NameResolutionContext';
import { getRuntimeInstanceId } from './resolutionConfig';
import { useNetworkRuntimeSource } from './useNetworkRuntimeSource';

/**
 * Stable empty resolver returned when no runtime / capability is available.
 * No methods ⇒ the consuming field treats a typed name as unsupported and
 * surfaces `UNSUPPORTED_NETWORK` (INV-119) while hex behavior stays legacy.
 */
const EMPTY_RESOLVER: NameResolver = {};

/**
 * Project a runtime's `NameResolutionCapability` into the injected
 * {@link NameResolver} seam consumed by `@openzeppelin/ui-components` (SF-3, D3).
 * Mounted ambiently by the renderer:
 *
 * ```tsx
 * <NameResolverProvider {...useRuntimeNameResolver()}>{form}</NameResolverProvider>
 * ```
 *
 * Pass `scopedNetwork` to resolve against a specific network via
 * {@link RuntimeProvider}'s registry without changing {@link WalletStateProvider}'s
 * active network (e.g. address-book Add Alias dropdown).
 *
 * Each imperative call is backed by SF-2's **owned** resolution `QueryClient`
 * via `fetchQuery`, reusing SF-2's exact query-key convention
 * (`buildResolutionKey('name', networkId, normalizedName)`) — so a name
 * resolved through the field and the same name resolved by a bare
 * `useResolveName` hit the SAME cache entry: shared cache, dedupe, and
 * out-of-order safety, never a parallel cache (INV-119).
 *
 * Degradation, in order (all method-omission, never a throw):
 * - No `WalletStateProvider` mounted (wallet path) or no `RuntimeProvider`
 *   (network path) → empty resolver. The context is read directly (not via
 *   `useWalletState()`, which throws) so the ambient renderer mount stays safe
 *   for wallet-less usage.
 * - No active runtime, or runtime without the capability → empty resolver.
 * - Capability without `resolveName` → `isValidName` only; forward unsupported.
 *
 * When the capability is present but the network itself is unsupported, the
 * adapter's `resolveName` resolves `{ ok: false, error: UNSUPPORTED_NETWORK }`
 * and that result passes through unchanged.
 *
 * @returns A referentially stable {@link NameResolver} for the active runtime.
 */
export function useRuntimeNameResolver(scopedNetwork?: NetworkConfig): NameResolver {
  const walletState = useContext(WalletStateContext);
  const { queryClient, config } = useNameResolutionContext();
  const networkSource = useNetworkRuntimeSource(scopedNetwork ?? null);
  const useNetworkScoped = scopedNetwork != null;

  const activeRuntime = useNetworkScoped
    ? networkSource.runtime
    : (walletState?.activeRuntime ?? null);
  const capability = activeRuntime?.nameResolution;
  // Canonical selected-network id — part of the shared cache key (INV-119);
  // '' when no network is selected, mirroring the SF-2 engine.
  const networkId = useNetworkScoped
    ? networkSource.networkId
    : (walletState?.activeNetworkId ?? '');
  const runtimeInstanceId = getRuntimeInstanceId(activeRuntime);
  const isRuntimeLoading = useNetworkScoped
    ? networkSource.isRuntimeLoading
    : (walletState?.isRuntimeLoading ?? false);

  return useMemo<NameResolver>(() => {
    if (!capability) {
      return EMPTY_RESOLVER;
    }

    return createNameResolverFromCapability(
      capability,
      networkId,
      runtimeInstanceId,
      queryClient,
      config
    );
  }, [capability, networkId, runtimeInstanceId, queryClient, config, isRuntimeLoading]);
}
