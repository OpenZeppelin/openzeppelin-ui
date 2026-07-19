import type { NetworkConfig, ResolvedName } from '@openzeppelin/ui-types';

import { mapAddressEngineResult } from './mapAddressEngineResult';
import { useNameResolutionContext } from './NameResolutionContext';
import { type UseResolveAddressResult } from './resolutionState';
import { useNetworkRuntimeSource } from './useNetworkRuntimeSource';
import { useResolutionEngine } from './useResolutionEngine';

/** Options for {@link useResolveAddress}. */
export interface UseResolveAddressOptions {
  /** Override the reverse debounce window (ms). Default: `config.reverseDebounceMs` (0). */
  readonly debounceMs?: number;
  /** When `false`, the hook stays `idle` and issues no resolution. Default `true`. */
  readonly enabled?: boolean;
  /**
   * When set, reverse-resolve via {@link RuntimeProvider} for this network
   * instead of the wallet-global active runtime.
   */
  readonly network?: NetworkConfig;
}

/**
 * Reverse-resolve an address to a name. Soft-reads the active runtime from
 * `WalletStateContext` (never throws when no provider is mounted — degrades to
 * idle / UNSUPPORTED_NETWORK) and calls `runtime.nameResolution?.resolveAddress`.
 * Pass `options.network` to scope resolution to a specific network without
 * changing the wallet's active network. Caches per (network, address) via the
 * owned QueryClient. Not debounced by default — addresses are pasted, not
 * typed char-by-char.
 *
 * Applies no client-side address-shape check (INV-32): resolution is attempted on
 * any non-empty input and malformed addresses are rejected via the adapter's typed
 * error union. Address-shape validation is SF-3's concern.
 *
 * @param address - The address to reverse-resolve. `null` / empty yields
 *   `status: 'idle'`.
 * @param options - `debounceMs` / `enabled` / `network` overrides.
 * @returns The current {@link UseResolveAddressResult}.
 */
export function useResolveAddress(
  address: string | null | undefined,
  options?: UseResolveAddressOptions
): UseResolveAddressResult {
  const { config } = useNameResolutionContext();
  // INV-29: resolve option defaults at the hook boundary — the engine sees concrete values.
  const debounceMs = options?.debounceMs ?? config.reverseDebounceMs;
  const enabled = options?.enabled ?? true;
  const networkSource = useNetworkRuntimeSource(options?.network ?? null);
  const useNetworkScoped = options?.network != null;

  const engine = useResolutionEngine<ResolvedName>({
    input: address,
    namespace: 'addr',
    debounceMs,
    enabled,
    shouldAttempt: () => true, // INV-32: reverse attempts on any non-empty input
    getMethod: (cap) => cap.resolveAddress,
    runtimeSource: useNetworkScoped ? networkSource : undefined,
  });

  return mapAddressEngineResult(engine);
}
