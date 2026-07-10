import { QueryClient } from '@tanstack/react-query';

import type { NameResolutionError } from '@openzeppelin/ui-types';

/**
 * Cache namespace for a resolution query key. Keeps a forward (name → address)
 * lookup and a reverse (address → name) lookup in disjoint cache entries even
 * when the raw input strings collide. See {@link buildResolutionKey}.
 */
export type ResolutionNamespace = 'name' | 'addr';

/**
 * Tunable knobs for the resolution hooks, overridable per-app via
 * `NameResolutionProvider`'s `config` prop and merged over {@link DEFAULT_CONFIG}.
 */
export interface ResolutionConfig {
  /** Time a resolved value is considered fresh (no refetch). Maps to react-query `staleTime`. */
  readonly staleTimeMs: number;
  /** Time an unobserved cache entry is retained before GC. Maps to react-query `gcTime`. */
  readonly gcTimeMs: number;
  /** Debounce window (ms) for the forward hook before a settled input becomes the query key. */
  readonly forwardDebounceMs: number;
  /** Debounce window (ms) for the reverse hook. Addresses are pasted/stable, so this defaults to 0. */
  readonly reverseDebounceMs: number;
  /** Max retries for TRANSIENT errors. Definitive negatives are never retried. */
  readonly transientRetryCount: number;
}

/**
 * Default resolution config. Values sit within the spec's "seconds-to-minutes"
 * caching guidance; forward debounce is 300ms (typed char-by-char), reverse is 0.
 */
export const DEFAULT_CONFIG: ResolutionConfig = {
  staleTimeMs: 60_000,
  gcTimeMs: 300_000,
  forwardDebounceMs: 300,
  reverseDebounceMs: 0,
  transientRetryCount: 2,
};

/** Stable prefix for every resolution cache key — namespaces this package's keys. */
export const RESOLUTION_KEY_PREFIX = 'oz-name-resolution' as const;

/**
 * Build a network-scoped, namespace-separated cache key (INV-40). A name resolves
 * differently per network and provenance can be chain-scoped, so `networkId` is
 * part of the key; `namespace` keeps forward and reverse lookups disjoint.
 *
 * @param namespace       - `'name'` (forward) or `'addr'` (reverse).
 * @param networkId       - Active network id (`''` when no network is selected).
 * @param normalizedInput - Trimmed + lowercased input (INV-26).
 * @returns A readonly tuple suitable for a TanStack Query `queryKey`.
 */
export function buildResolutionKey(
  namespace: ResolutionNamespace,
  networkId: string,
  normalizedInput: string
): readonly unknown[] {
  return [RESOLUTION_KEY_PREFIX, namespace, networkId, normalizedInput];
}

/**
 * Whether a resolution error is transient (worth retrying) versus a definitive,
 * stable answer (INV-47). Exhaustive over SF-1's closed error union with no
 * `default`: adding a new error code to `@openzeppelin/ui-types` will fail to
 * compile here until it is classified — deliberately coupling SF-2 to SF-1 INV-7.
 *
 * @param error - A typed {@link NameResolutionError}.
 * @returns `true` for transient failures (timeout / gateway / adapter), `false`
 *   for definitive negatives and unsupported-network answers.
 */
export function isTransientError(error: NameResolutionError): boolean {
  switch (error.code) {
    case 'RESOLUTION_TIMEOUT':
    case 'EXTERNAL_GATEWAY_ERROR':
    case 'ADAPTER_ERROR':
      return true;
    case 'NAME_NOT_FOUND':
    case 'ADDRESS_NOT_FOUND':
    case 'UNSUPPORTED_NAME':
    case 'UNSUPPORTED_NETWORK':
      return false;
  }
}

/**
 * Construct a QueryClient tuned for name resolution: ambient refetch triggers are
 * disabled at the client level (INV-41) so a resolved value never silently
 * changes under the user on window focus or network reconnect.
 */
export function createResolutionQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  });
}

/**
 * Process-global key for the default resolution QueryClient. Uses `Symbol.for`
 * so every duplicated module instance (Vite pre-bundling, npm-installed adapters)
 * shares ONE client — the same cross-bundle-singleton pattern as
 * `WalletStateContext`. This is what makes the cache shared with zero wiring
 * (SC-001) and enables cross-instance dedup / warm-cache reuse (INV-33 / INV-37 / INV-48).
 */
const DEFAULT_CLIENT_KEY = Symbol.for('@openzeppelin/ui-react/NameResolutionQueryClient');

interface GlobalWithResolutionClient {
  [DEFAULT_CLIENT_KEY]?: QueryClient;
}

/**
 * Lazily create (exactly once) and return the process-global resolution
 * QueryClient used when no `NameResolutionProvider` is mounted (INV-48).
 *
 * @returns The shared default resolution QueryClient (stable across calls).
 */
export function getDefaultResolutionQueryClient(): QueryClient {
  const globalScope = globalThis as GlobalWithResolutionClient;
  if (!globalScope[DEFAULT_CLIENT_KEY]) {
    globalScope[DEFAULT_CLIENT_KEY] = createResolutionQueryClient();
  }
  return globalScope[DEFAULT_CLIENT_KEY];
}
