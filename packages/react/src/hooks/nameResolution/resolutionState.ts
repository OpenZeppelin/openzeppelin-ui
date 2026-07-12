import type { NameResolutionError, ResolvedAddress, ResolvedName } from '@openzeppelin/ui-types';

/**
 * Lifecycle status shared by both resolution hooks. `debouncing` is distinct from
 * `loading` so an input field can show a subtle "typing…" state separate from an
 * in-flight call (the reverse hook omits `debouncing`; see {@link UseResolveAddressResult}).
 */
export type NameResolutionStatus = 'idle' | 'debouncing' | 'loading' | 'resolved' | 'error';

/**
 * Forward-resolution (`useResolveName`) result. A discriminated union keyed on
 * `status` so illegal field combinations — e.g. holding both `data` and `error`,
 * or reading `.data` without narrowing — are unrepresentable (INV-23). This is the
 * component-boundary shadow of SC-004: an unresolved name can never be read as a
 * resolved address.
 */
export type UseResolveNameResult =
  | { readonly status: 'idle' }
  | { readonly status: 'debouncing'; readonly name: string }
  | { readonly status: 'loading'; readonly name: string }
  | { readonly status: 'resolved'; readonly name: string; readonly data: ResolvedAddress }
  | {
      readonly status: 'error';
      readonly name: string;
      readonly error: NameResolutionError;
      readonly retry: () => void;
    };

/**
 * Reverse-resolution (`useResolveAddress`) result. No `debouncing` arm — reverse
 * debounce defaults to 0 (addresses are pasted, not typed). A caller-supplied
 * non-zero `debounceMs` surfaces as `loading` rather than widening this type.
 */
export type UseResolveAddressResult =
  | { readonly status: 'idle' }
  | { readonly status: 'loading'; readonly address: string }
  | { readonly status: 'resolved'; readonly address: string; readonly data: ResolvedName }
  | {
      readonly status: 'error';
      readonly address: string;
      readonly error: NameResolutionError;
      readonly retry: () => void;
    };

/**
 * Internal, direction-agnostic result the shared engine produces. The public
 * hooks remap the generic `input` field to `name` / `address` (INV-24: the remap
 * keys off the debounced input carried here, never the live prop).
 */
export type EngineResult<T> =
  | { readonly status: 'idle' }
  | { readonly status: 'debouncing'; readonly input: string }
  | { readonly status: 'loading'; readonly input: string }
  | { readonly status: 'resolved'; readonly input: string; readonly data: T }
  | {
      readonly status: 'error';
      readonly input: string;
      readonly error: NameResolutionError;
      readonly retry: () => void;
    };

/**
 * Internal error used to bridge SF-1's `ok: false` results (and defensively-caught
 * adapter throws) into TanStack Query's thrown-error channel, carrying the typed
 * {@link NameResolutionError} through so the mapping step can surface it unchanged
 * (INV-43). Never leaks past the hook boundary.
 */
export class ResolutionQueryError extends Error {
  readonly resolutionError: NameResolutionError;

  /** @param resolutionError - The typed error to carry through react-query. */
  constructor(resolutionError: NameResolutionError) {
    super(`name resolution failed: ${resolutionError.code}`);
    this.name = 'ResolutionQueryError';
    this.resolutionError = resolutionError;
  }
}

/**
 * Convert any value from react-query's error channel into a typed, closed-union
 * {@link NameResolutionError} (INV-43). A {@link ResolutionQueryError} is
 * unwrapped verbatim; anything else (a react-query internal error) is mapped to
 * `ADAPTER_ERROR` so no untyped throw reaches a component.
 *
 * @param error - The raw `query.error` value (`unknown`).
 * @returns A typed error drawn only from SF-1's closed union.
 */
export function toNameResolutionError(error: unknown): NameResolutionError {
  if (error instanceof ResolutionQueryError) {
    return error.resolutionError;
  }
  const message = error instanceof Error ? error.message : String(error);
  return { code: 'ADAPTER_ERROR', message, cause: error };
}

/**
 * Minimal, React-free view of a settled query's state — the subset the mapping
 * step reads. Keeps {@link mapSettledQuery} unit-testable without react-query.
 */
export interface MappableQueryState<T> {
  readonly isSuccess: boolean;
  readonly isError: boolean;
  readonly data: T | undefined;
  readonly error: unknown;
}

/**
 * Map a settled query's state to exactly one non-gate {@link EngineResult} arm
 * (INV-42, INV-44). The `input` echoed here is the debounced value the query was
 * keyed on, so `data`/`error` are always paired with the input that produced them
 * (INV-24). Success without data degrades to `loading` rather than a resolved arm
 * missing its payload.
 *
 * @param input - The debounced, normalized input keying this query.
 * @param query - The settled query state.
 * @param retry - Bound `refetch` for the `error` arm (INV-34).
 * @returns The `resolved`, `error`, or `loading` arm.
 */
export function mapSettledQuery<T>(
  input: string,
  query: MappableQueryState<T>,
  retry: () => void
): EngineResult<T> {
  if (query.isSuccess && query.data !== undefined) {
    return { status: 'resolved', input, data: query.data };
  }
  if (query.isError) {
    return { status: 'error', input, error: toNameResolutionError(query.error), retry };
  }
  return { status: 'loading', input };
}
