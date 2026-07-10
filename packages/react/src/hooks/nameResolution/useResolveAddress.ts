import type { ResolvedName } from '@openzeppelin/ui-types';

import { useNameResolutionContext } from './NameResolutionContext';
import { type EngineResult, type UseResolveAddressResult } from './resolutionState';
import { useResolutionEngine } from './useResolutionEngine';

/** Options for {@link useResolveAddress}. */
export interface UseResolveAddressOptions {
  /** Override the reverse debounce window (ms). Default: `config.reverseDebounceMs` (0). */
  readonly debounceMs?: number;
  /** When `false`, the hook stays `idle` and issues no resolution. Default `true`. */
  readonly enabled?: boolean;
}

/**
 * Reverse-resolve an address to a name. Reads the active runtime from
 * `useWalletState()` and calls `runtime.nameResolution?.resolveAddress`. Caches
 * per (network, address) via the owned QueryClient. Not debounced by default —
 * addresses are pasted, not typed char-by-char.
 *
 * Applies no client-side address-shape check (INV-32): resolution is attempted on
 * any non-empty input and malformed addresses are rejected via the adapter's typed
 * error union. Address-shape validation is SF-3's concern.
 *
 * @param address - The address to reverse-resolve. `null` / empty yields
 *   `status: 'idle'`.
 * @param options - `debounceMs` / `enabled` overrides.
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

  const engine = useResolutionEngine<ResolvedName>({
    input: address,
    namespace: 'addr',
    debounceMs,
    enabled,
    shouldAttempt: () => true, // INV-32: reverse attempts on any non-empty input
    getMethod: (cap) => cap.resolveAddress,
  });

  return toAddressResult(engine);
}

/**
 * Remap the engine's generic `input` to `address` (INV-24). A `debouncing` arm —
 * only reachable when a caller passes a non-zero reverse `debounceMs` — collapses
 * to `loading` so {@link UseResolveAddressResult} keeps no `debouncing` variant.
 */
function toAddressResult(engine: EngineResult<ResolvedName>): UseResolveAddressResult {
  switch (engine.status) {
    case 'idle':
      return { status: 'idle' };
    case 'debouncing':
    case 'loading':
      return { status: 'loading', address: engine.input };
    case 'resolved':
      return { status: 'resolved', address: engine.input, data: engine.data };
    case 'error':
      return { status: 'error', address: engine.input, error: engine.error, retry: engine.retry };
  }
}
