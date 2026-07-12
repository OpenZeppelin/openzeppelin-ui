import type { ResolvedAddress } from '@openzeppelin/ui-types';

import { useNameResolutionContext } from './NameResolutionContext';
import { type EngineResult, type UseResolveNameResult } from './resolutionState';
import { useResolutionEngine } from './useResolutionEngine';

/** Options for {@link useResolveName}. */
export interface UseResolveNameOptions {
  /** Override the forward debounce window (ms). Default: `config.forwardDebounceMs` (300). */
  readonly debounceMs?: number;
  /** When `false`, the hook stays `idle` and issues no resolution. Default `true`. */
  readonly enabled?: boolean;
}

/**
 * Forward-resolve a name to an address. Soft-reads the active runtime from
 * `WalletStateContext` (never throws when no provider is mounted — degrades to
 * idle / UNSUPPORTED_NETWORK) and calls `runtime.nameResolution?.resolveName`.
 * Debounces `name`, caches per (network, name) via the owned QueryClient, and is
 * protected against out-of-order responses (distinct inputs → distinct query keys).
 *
 * Returns a discriminated union keyed on `status`; it never throws for expected
 * failures (they surface in the `error` arm) and never pairs a name with a
 * different name's resolved address (INV-24).
 *
 * @param name    - The name to resolve. `null` / empty / a value failing the
 *   adapter's `isValidName` yields `status: 'idle'` (never `error`).
 * @param options - `debounceMs` / `enabled` overrides.
 * @returns The current {@link UseResolveNameResult}.
 */
export function useResolveName(
  name: string | null | undefined,
  options?: UseResolveNameOptions
): UseResolveNameResult {
  const { config } = useNameResolutionContext();
  // INV-29: resolve option defaults at the hook boundary — the engine sees concrete values.
  const debounceMs = options?.debounceMs ?? config.forwardDebounceMs;
  const enabled = options?.enabled ?? true;

  const engine = useResolutionEngine<ResolvedAddress>({
    input: name,
    namespace: 'name',
    debounceMs,
    enabled,
    shouldAttempt: (cap, normalized) => cap.isValidName(normalized), // INV-32
    getMethod: (cap) => cap.resolveName,
  });

  return toNameResult(engine);
}

/**
 * Remap the engine's generic `input` to `name` (INV-24: keyed off the debounced
 * input carried in the engine result, not the live prop). Exhaustive over the
 * union so a new status cannot silently fall through (INV-23 / INV-42).
 */
function toNameResult(engine: EngineResult<ResolvedAddress>): UseResolveNameResult {
  switch (engine.status) {
    case 'idle':
      return { status: 'idle' };
    case 'debouncing':
      return { status: 'debouncing', name: engine.input };
    case 'loading':
      return { status: 'loading', name: engine.input };
    case 'resolved':
      return { status: 'resolved', name: engine.input, data: engine.data };
    case 'error':
      return { status: 'error', name: engine.input, error: engine.error, retry: engine.retry };
  }
}
