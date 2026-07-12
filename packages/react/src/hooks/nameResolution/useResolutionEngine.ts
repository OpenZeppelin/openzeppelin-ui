import { useQuery } from '@tanstack/react-query';
import { useContext, useEffect, useRef, useState } from 'react';

import type { NameResolutionCapability, ResolutionResult } from '@openzeppelin/ui-types';
import { logger } from '@openzeppelin/ui-utils';

import { WalletStateContext } from '../WalletStateContext';
import { useNameResolutionContext } from './NameResolutionContext';
import { buildResolutionKey, isTransientError, type ResolutionNamespace } from './resolutionConfig';
import { mapSettledQuery, ResolutionQueryError, type EngineResult } from './resolutionState';

const LOG_SCOPE = 'useResolutionEngine';

/** No-op retry for synthesized errors that never entered the query path (INV-45). */
const NOOP_RETRY = (): void => {};

/**
 * Parameters for {@link useResolutionEngine}. The public hooks bind these to select
 * direction, debounce default, cache namespace, and the capability method.
 */
export interface ResolutionEngineParams<T> {
  /** Raw input; `null` / `undefined` / empty / whitespace-only gate to `idle` (INV-27). */
  readonly input: string | null | undefined;
  /** Cache namespace — keeps forward and reverse lookups disjoint (INV-40). */
  readonly namespace: ResolutionNamespace;
  /** Concrete debounce window (ms); `<= 0` disables debouncing (INV-29). */
  readonly debounceMs: number;
  /** Concrete enabled flag; `false` forces `idle` with no resolution (INV-28). */
  readonly enabled: boolean;
  /**
   * Whether to attempt resolution for a given normalized input. Forward binds
   * `cap.isValidName` → `idle` (never `error`) for non-names (INV-32); reverse
   * binds `() => true`.
   */
  readonly shouldAttempt: (cap: NameResolutionCapability, normalizedInput: string) => boolean;
  /** The directional method, or `undefined` when the adapter omits it (→ INV-45). */
  readonly getMethod: (
    cap: NameResolutionCapability
  ) => ((input: string) => Promise<ResolutionResult<T>>) | undefined;
}

/**
 * Shared engine behind `useResolveName` / `useResolveAddress`. Owns input
 * normalization, debouncing, the `useQuery` wiring (explicit-client form), the
 * capability-absence gate, and the mapping to a direction-agnostic
 * {@link EngineResult}. Not exported from the package.
 */
export function useResolutionEngine<T>(params: ResolutionEngineParams<T>): EngineResult<T> {
  const { input, namespace, debounceMs, enabled, shouldAttempt, getMethod } = params;

  // Soft read — never throw. Mirrors `useRuntimeNameResolver`: read the context
  // directly (not `useWalletState()`, which throws) so wallet-less consumers
  // degrade to idle / UNSUPPORTED_NETWORK instead of crashing the tree.
  const walletState = useContext(WalletStateContext);
  const activeRuntime = walletState?.activeRuntime ?? null;
  const activeNetworkId = walletState?.activeNetworkId ?? null;
  const isRuntimeLoading = walletState?.isRuntimeLoading ?? false;
  const { queryClient, config } = useNameResolutionContext();

  // INV-26: normalize exactly once (trim, then lowercase). The trimmed original-case
  // form is retained for the reverse adapter argument (checksum preservation); the
  // lowercased form is the single value used by the empty gate, the attempt gate,
  // and the cache key.
  const trimmedLive = (input ?? '').trim();
  const normalizedLive = trimmedLive.toLowerCase();

  // INV-35 + INV-37: seed the debounced copy to the initial value on mount (a warm
  // cache is not gated behind a debounce window — SC-002), then debounce only
  // subsequent changes; the effect cleanup clears a pending timer on change/unmount.
  const [debouncedTrimmed, setDebouncedTrimmed] = useState(trimmedLive);
  const seededRef = useRef(false);

  useEffect(() => {
    if (!seededRef.current) {
      seededRef.current = true;
      return; // mount value already seeded via useState — no timer, no debouncing window
    }
    if (debounceMs <= 0) {
      setDebouncedTrimmed(trimmedLive);
      return;
    }
    const timer = setTimeout(() => setDebouncedTrimmed(trimmedLive), debounceMs);
    return () => clearTimeout(timer);
  }, [trimmedLive, debounceMs]);

  const effectiveTrimmed = debounceMs <= 0 ? trimmedLive : debouncedTrimmed;
  const normalizedKey = effectiveTrimmed.toLowerCase();

  const capability = activeRuntime?.nameResolution;
  // Canonical selected-network id (INV-40 key scoping, INV-49 UNSUPPORTED_NETWORK payload).
  // `''` when no network is selected — a valid closed-union payload (INV-49).
  const networkId = activeNetworkId ?? '';
  const method = capability ? getMethod(capability) : undefined;

  const liveAttemptable = capability ? shouldAttempt(capability, normalizedLive) : false;
  const keyAttemptable = capability ? shouldAttempt(capability, normalizedKey) : false;

  // The query is enabled only for a settled, attemptable, resolvable input on a
  // capability that exposes the directional method.
  const queryEnabled =
    enabled &&
    trimmedLive !== '' &&
    capability != null &&
    method != null &&
    normalizedKey !== '' &&
    keyAttemptable;

  const query = useQuery<T, Error>(
    {
      queryKey: buildResolutionKey(namespace, networkId, normalizedKey),
      queryFn: async (): Promise<T> => {
        if (!method) {
          // Unreachable: queryEnabled requires a defined method. Guarded (no `!`).
          throw new ResolutionQueryError({
            code: 'ADAPTER_ERROR',
            message: 'resolution method unexpectedly missing',
          });
        }
        // INV-26 (reverse checksum): forward sends the lowercased name; reverse sends
        // the trimmed original-case address while the cache key stays lowercased.
        const adapterArg = namespace === 'addr' ? effectiveTrimmed : normalizedKey;

        let result: ResolutionResult<T>;
        try {
          result = await method(adapterArg);
        } catch (cause) {
          // INV-43 backstop: an adapter that throws instead of returning ok:false
          // (SF-1 INV-8 violation). Log once at the throw site, then convert to the
          // closed-union ADAPTER_ERROR so nothing escapes into a render / error boundary.
          logger.warn(LOG_SCOPE, 'resolution method threw instead of returning ok:false', cause);
          throw new ResolutionQueryError({
            code: 'ADAPTER_ERROR',
            message: cause instanceof Error ? cause.message : String(cause),
            cause,
          });
        }
        if (!result.ok) {
          // INV-43: bridge SF-1's ok:false into react-query's thrown-error channel.
          throw new ResolutionQueryError(result.error);
        }
        return result.value;
      },
      enabled: queryEnabled,
      staleTime: config.staleTimeMs, // INV-50 / SC-002
      gcTime: config.gcTimeMs, // INV-39
      // INV-41: resolution never fires from ambient events (belt-and-suspenders with
      // the client-level defaults, in case a consumer injects their own client).
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      // INV-47: transient errors retry up to the cap; definitive negatives never retry.
      // failureCount is 0-based at this call site, so `< transientRetryCount` yields
      // exactly `1 + transientRetryCount` attempts.
      retry: (failureCount, error) =>
        (error instanceof ResolutionQueryError ? isTransientError(error.resolutionError) : true) &&
        failureCount < config.transientRetryCount,
    },
    queryClient // INV-48: explicit-client form — no ambient QueryClientProvider required.
  );

  // --- Gate → EngineResult (a total function of gate state × query state, INV-31) ---

  if (!enabled) {
    return { status: 'idle' }; // INV-28
  }
  if (trimmedLive === '') {
    return { status: 'idle' }; // INV-27
  }

  if (capability) {
    if (!liveAttemptable) {
      return { status: 'idle' }; // INV-32: forward non-name → idle, never error
    }
    if (!method) {
      // INV-45: capability present but directional method absent → UNSUPPORTED_NETWORK.
      return unsupportedNetwork(normalizedLive, networkId);
    }
    if (normalizedKey !== normalizedLive) {
      return { status: 'debouncing', input: normalizedLive }; // INV-31: pending debounce window
    }
  } else {
    // INV-46: runtime still loading with a resolvable input → loading, not an error flash.
    if (isRuntimeLoading) {
      return { status: 'loading', input: normalizedLive };
    }
    // INV-45 / INV-49: no runtime (settled) → UNSUPPORTED_NETWORK (networkId may be '').
    return unsupportedNetwork(normalizedLive, networkId);
  }

  // Settled and keyed on the debounced input — surface the query's state (INV-42, INV-44).
  const retry = (): void => {
    void query.refetch(); // INV-34: one refetch per call, current input, ignores staleTime
  };
  return mapSettledQuery(normalizedKey, query, retry);
}

/**
 * Synthesize an `UNSUPPORTED_NETWORK` error arm without touching react-query
 * (INV-45). Drawn from SF-1's closed union so it is indistinguishable from an
 * adapter-returned `UNSUPPORTED_NETWORK`; `networkId` may be `''` (INV-49). Retry
 * is a no-op — there is no query to refetch.
 */
function unsupportedNetwork<T>(input: string, networkId: string): EngineResult<T> {
  return {
    status: 'error',
    input,
    error: { code: 'UNSUPPORTED_NETWORK', networkId },
    retry: NOOP_RETRY,
  };
}
