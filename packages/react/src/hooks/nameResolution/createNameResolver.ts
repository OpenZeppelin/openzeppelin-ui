import type { QueryClient } from '@tanstack/react-query';

import type {
  NameResolutionCapability,
  NameResolver,
  ResolutionResult,
  ResolvedAddress,
} from '@openzeppelin/ui-types';

import {
  buildResolutionKey,
  isTransientError,
  type ResolutionConfig,
  type RuntimeInstanceId,
} from './resolutionConfig';
import { ResolutionQueryError, toNameResolutionError } from './resolutionState';

const EMPTY_RESOLVER: NameResolver = {};

/**
 * Projects a {@link NameResolutionCapability} into the SF-3 {@link NameResolver}
 * seam with SF-2 cache-key parity (INV-119).
 */
export function createNameResolverFromCapability(
  capability: NameResolutionCapability | undefined,
  networkId: string,
  runtimeInstanceId: RuntimeInstanceId,
  queryClient: QueryClient,
  config: ResolutionConfig
): NameResolver {
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
}
