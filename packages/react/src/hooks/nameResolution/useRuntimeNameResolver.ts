import { useContext, useMemo } from 'react';

import type { NameResolver, ResolutionResult, ResolvedAddress } from '@openzeppelin/ui-types';

import { WalletStateContext } from '../WalletStateContext';
import { useNameResolutionContext } from './NameResolutionContext';
import { buildResolutionKey, getRuntimeInstanceId, isTransientError } from './resolutionConfig';
import { ResolutionQueryError, toNameResolutionError } from './resolutionState';

/**
 * Stable empty resolver returned when no runtime / capability is available.
 * No methods ⇒ the consuming field treats a typed name as unsupported and
 * surfaces `UNSUPPORTED_NETWORK` (INV-119) while hex behavior stays legacy.
 */
const EMPTY_RESOLVER: NameResolver = {};

/**
 * Project the active runtime's `NameResolutionCapability` into the injected
 * {@link NameResolver} seam consumed by `@openzeppelin/ui-components` (SF-3, D3).
 * Mounted ambiently by the renderer:
 *
 * ```tsx
 * <NameResolverProvider {...useRuntimeNameResolver()}>{form}</NameResolverProvider>
 * ```
 *
 * Each imperative call is backed by SF-2's **owned** resolution `QueryClient`
 * via `fetchQuery`, reusing SF-2's exact query-key convention
 * (`buildResolutionKey('name', networkId, normalizedName)`) — so a name
 * resolved through the field and the same name resolved by a bare
 * `useResolveName` hit the SAME cache entry: shared cache, dedupe, and
 * out-of-order safety, never a parallel cache (INV-119).
 *
 * Degradation, in order (all method-omission, never a throw):
 * - No `WalletStateProvider` mounted → empty resolver. The context is read
 *   directly (not via `useWalletState()`, which throws) so the ambient
 *   renderer mount stays safe for wallet-less usage.
 * - No active runtime, or runtime without the capability → empty resolver.
 * - Capability without `resolveName` → `isValidName` only; forward unsupported.
 *
 * When the capability is present but the network itself is unsupported, the
 * adapter's `resolveName` resolves `{ ok: false, error: UNSUPPORTED_NETWORK }`
 * and that result passes through unchanged.
 *
 * @returns A referentially stable {@link NameResolver} for the active runtime.
 */
export function useRuntimeNameResolver(): NameResolver {
  const walletState = useContext(WalletStateContext);
  const { queryClient, config } = useNameResolutionContext();

  const activeRuntime = walletState?.activeRuntime ?? null;
  const capability = activeRuntime?.nameResolution;
  // Canonical selected-network id — part of the shared cache key (INV-119);
  // '' when no network is selected, mirroring the SF-2 engine.
  const networkId = walletState?.activeNetworkId ?? '';
  const runtimeInstanceId = getRuntimeInstanceId(activeRuntime);

  return useMemo<NameResolver>(() => {
    if (!capability) {
      return EMPTY_RESOLVER;
    }

    const resolveNameMethod = capability.resolveName;

    return {
      isValidName: (name: string): boolean => capability.isValidName(name),

      resolveName: resolveNameMethod
        ? async (name: string): Promise<ResolutionResult<ResolvedAddress>> => {
            // Normalize exactly as the SF-2 engine (trim, then lowercase) so the
            // cache key — and the echoed `value.name` — match the hook path (INV-119).
            const normalized = name.trim().toLowerCase();
            try {
              const value = await queryClient.fetchQuery<ResolvedAddress, Error>({
                queryKey: buildResolutionKey('name', networkId, normalized, runtimeInstanceId),
                queryFn: async (): Promise<ResolvedAddress> => {
                  // Same ok:false → thrown-error bridge as SF-2's engine, so a
                  // field-initiated fetch and a hook-initiated fetch populate the
                  // cache identically.
                  let result: ResolutionResult<ResolvedAddress>;
                  try {
                    result = await resolveNameMethod(normalized);
                  } catch (cause) {
                    // Backstop for an adapter that throws instead of returning
                    // ok:false (SF-1 INV-8 violation) — keep the no-throw contract.
                    throw new ResolutionQueryError({
                      code: 'ADAPTER_ERROR',
                      message: cause instanceof Error ? cause.message : String(cause),
                      cause,
                    });
                  }
                  if (!result.ok) {
                    throw new ResolutionQueryError(result.error);
                  }
                  return result.value;
                },
                staleTime: config.staleTimeMs,
                gcTime: config.gcTimeMs,
                // Mirror SF-2's retry policy: transient errors up to the cap,
                // definitive negatives never.
                retry: (failureCount, error) =>
                  (error instanceof ResolutionQueryError
                    ? isTransientError(error.resolutionError)
                    : true) && failureCount < config.transientRetryCount,
              });
              return { ok: true, value };
            } catch (error) {
              // Un-bridge back into the seam's no-throw ResolutionResult contract.
              return { ok: false, error: toNameResolutionError(error) };
            }
          }
        : undefined,
    };
  }, [capability, queryClient, config, networkId, runtimeInstanceId]);
}
