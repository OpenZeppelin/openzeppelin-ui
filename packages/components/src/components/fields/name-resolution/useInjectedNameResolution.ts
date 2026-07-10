/**
 * Injected name-resolution machine (SF-3).
 *
 * A thin, capability-free async machine that `AddressField` consumes: given a
 * typed input and the injected `resolveName`, it debounces, dispatches, tracks
 * status, and applies the out-of-order name-drop guard (INV-117). It is the
 * component-boundary analogue of SF-2's `useResolveName`, with all hard
 * mechanics (cache, dedupe, retries, UNSUPPORTED synthesis) deliberately left
 * behind the injected function — this hook does ONLY debounce + status
 * derivation + the funds guards.
 *
 * The machine holds no resolved-hex cache of its own (INV-85): its single
 * `settled` record is valid only while it matches the current debounced input,
 * the current resolver function identity, and the current retry attempt — any
 * mismatch derives `loading`, never a stale `resolved`.
 *
 * Resolver-identity-churn backstop (INV-123/124/125). The dispatch effect keys
 * on the injected `resolveName` function identity, so an unstable (non-memoized)
 * integrator resolver re-fires it on every render. To keep that from becoming an
 * unbounded RPC loop (rate-ban + cost + funds-path DoS), the machine caps
 * dispatches per resolution intent — the pair (normalized debounced input × retry
 * attempt) — at {@link MAX_DISPATCHES_PER_INTENT}, regardless of render count. The
 * budget resets on intent change (a new typed name, or `retry()`), so a genuine
 * resolver/network swap still re-resolves the current input within budget
 * (INV-119 / acceptance #5). A churning identity that exhausts the budget emits a
 * one-shot, development-only warning (INV-124) and degrades to the safe gated
 * state (bounded RPC, RHF value `''`, submit gated, never a wrong hex, never a
 * throw — INV-125). This backstop is entirely internal: no signature, param, or
 * return-type change; `AddressField` consumes the machine unchanged.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  NameResolutionError,
  ResolutionResult,
  ResolvedAddress,
} from '@openzeppelin/ui-types';
import { logger } from '@openzeppelin/ui-utils';

/**
 * Default debounce window (ms) for typed names — mirrors SF-2's
 * `forwardDebounceMs` default so the field and the bare hook feel identical.
 */
export const NAME_RESOLUTION_DEBOUNCE_MS = 300;

/**
 * Cap on resolver dispatches per resolution intent — the pair (normalized
 * debounced input × retry attempt) — regardless of how many times the field
 * re-renders (INV-123). Chosen to sit comfortably above the dispatches a single
 * displayed input legitimately incurs (1 initial call + any human-initiated
 * genuine network swaps of that same name, each ≤1 unit — INV-119) and far below
 * per-render identity churn (hundreds/sec): a user does not switch networks eight
 * times while one unedited name sits in the field, whereas churn blows past eight
 * within milliseconds. The budget resets whenever the intent changes, so this
 * bounds a *churning* resolver, never a legitimate one.
 */
export const MAX_DISPATCHES_PER_INTENT = 8;

/** Forward resolver function injected through `NameResolverContext`. */
export type InjectedResolveName = (name: string) => Promise<ResolutionResult<ResolvedAddress>>;

/**
 * Machine result — a discriminated union keyed on `status`, shaped like SF-2's
 * `UseResolveNameResult` so downstream rendering logic carries over verbatim.
 * `name` is always the normalized (trim + lowercase) input the arm refers to.
 */
export type InjectedNameResolutionResult =
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

/** Parameters for {@link useInjectedNameResolution}. */
export interface UseInjectedNameResolutionParams {
  /** The raw typed input (the field's display string). Normalized internally. */
  readonly input: string;
  /**
   * INV-83: `true` only when `classification === 'name-candidate'` AND an
   * injected `resolveName` exists. `false` forces `idle` with zero calls.
   */
  readonly enabled: boolean;
  /** The injected forward resolver. Absent → the machine stays `idle`. */
  readonly resolveName?: InjectedResolveName;
  /** Debounce override (ms); `<= 0` disables debouncing. */
  readonly debounceMs?: number;
}

/**
 * The one settled record the machine keeps. `name` / `source` / `attempt`
 * pin the exact dispatch that produced it, so the status derivation can never
 * pair a result with a different input, resolver (network), or retry cycle.
 */
interface SettledResolution {
  readonly name: string;
  readonly result: ResolutionResult<ResolvedAddress>;
  readonly source: InjectedResolveName;
  readonly attempt: number;
}

/**
 * Debounce + dispatch + status derivation over an injected `resolveName`.
 *
 * Guarantees:
 * - INV-83: no call unless `enabled` (name-candidate + injected method), and
 *   never for a debounced copy that lags the current normalized input.
 * - INV-117: a settled result whose requested name ≠ the current debounced
 *   input is discarded (last-write-wins at the component boundary).
 * - INV-87: a rejecting resolver (contract violation) is mapped to a typed
 *   `ADAPTER_ERROR` — nothing throws into the render tree.
 * - INV-123: resolver dispatches are bounded per resolution intent (normalized
 *   debounced input × retry attempt) at {@link MAX_DISPATCHES_PER_INTENT},
 *   regardless of render count; the budget resets on intent change and `retry()`
 *   never consumes it.
 * - INV-124: an identity-churning resolver that exhausts the budget triggers a
 *   one-shot, development-only `logger.warn` (silent in production).
 * - INV-125: under sustained churn the field stays in the safe gated state — the
 *   perpetually-changing identity keeps failing the `settled.source` check, so
 *   the machine derives `loading`, never `resolved`; combined with INV-87 it
 *   never throws and never writes a hex.
 * - No `setState` after unmount: every dispatch is cancelled on cleanup.
 *
 * @param params - {@link UseInjectedNameResolutionParams}
 * @returns The current {@link InjectedNameResolutionResult}.
 */
export function useInjectedNameResolution({
  input,
  enabled,
  resolveName,
  debounceMs = NAME_RESOLUTION_DEBOUNCE_MS,
}: UseInjectedNameResolutionParams): InjectedNameResolutionResult {
  // Normalize exactly as the SF-2 engine does (trim, then lowercase) so the
  // echoed `name` compares cleanly against the engine's normalized result (INV-79).
  const normalized = input.trim().toLowerCase();

  // Seed the debounced copy on mount (a prefilled value is not gated behind a
  // debounce window), then debounce only subsequent changes — mirrors SF-2.
  const [debounced, setDebounced] = useState(normalized);
  const seededRef = useRef(false);

  useEffect(() => {
    if (!seededRef.current) {
      seededRef.current = true;
      return; // mount value already seeded via useState — no timer
    }
    if (debounceMs <= 0) {
      setDebounced(normalized);
      return;
    }
    const timer = setTimeout(() => setDebounced(normalized), debounceMs);
    return () => clearTimeout(timer);
  }, [normalized, debounceMs]);

  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<SettledResolution | null>(null);

  // INV-117: the machine's current debounced target. A settle handler compares
  // its captured request name against this ref — a mismatch is dropped, so the
  // consumer's INV-79 effect never observes a (resolved, name) pair that
  // mismatches the input it belongs to.
  const currentTargetRef = useRef('');
  currentTargetRef.current = enabled && resolveName ? debounced : '';

  // INV-123 budget refs. `intentKeyRef`/`dispatchCountRef` cap dispatches per
  // resolution intent and reset when the intent changes; `churnWarnedRef` makes
  // the INV-124 warning one-shot per field instance (never reset). All hold only
  // a string key + integer counter + boolean flag — never a resolved hex — so
  // INV-85's no-stale-cache guarantee is preserved and they never gate the write.
  const intentKeyRef = useRef('');
  const dispatchCountRef = useRef(0);
  const churnWarnedRef = useRef(false);

  const warnOnceOnChurn = useCallback((): void => {
    // INV-124: development-only, one-shot per field instance.
    if (process.env.NODE_ENV === 'production' || churnWarnedRef.current) return;
    churnWarnedRef.current = true;
    logger.warn(
      'AddressField',
      'The injected name resolver changes identity on every render, so inline name resolution was ' +
        'bounded to prevent an unbounded RPC loop. Memoize the resolver (e.g. wrap it in useMemo, ' +
        'or use useRuntimeNameResolver from @openzeppelin/ui-react) so its function identity is ' +
        'stable across renders. See the ens-address-input integration guide.'
    );
  }, []);

  useEffect(() => {
    // INV-83: dispatch only when the debounced copy belongs to the currently
    // enabled input. On the render where `enabled` flips true, `debounced` may
    // still hold a stale value (a prior hex / rejected shape / earlier name)
    // for one debounce window — dispatching it would be a spurious call.
    if (!enabled || !resolveName || debounced === '' || debounced !== normalized) return;

    // INV-123: bound dispatches per resolution intent (normalized input × retry
    // attempt), regardless of render count. Under identity churn the effect
    // re-fires every render, but the budget check early-returns before any RPC
    // once the intent's budget is spent — closing the unbounded-loop / DoS window
    // (SC-008). The budget resets whenever the intent changes (a new typed name,
    // or `retry()` bumping `attempt`), so `retry()` never consumes an existing
    // budget and a genuine swap (identity changes once for a given input) still
    // re-resolves within budget (INV-119 / acceptance #5).
    const intentKey = `${debounced}\u0000${attempt}`;
    if (intentKeyRef.current !== intentKey) {
      intentKeyRef.current = intentKey;
      dispatchCountRef.current = 0;
    }
    if (dispatchCountRef.current >= MAX_DISPATCHES_PER_INTENT) {
      warnOnceOnChurn(); // INV-124
      return; // INV-123/125: no further RPC for this intent — degrade to gated
    }
    dispatchCountRef.current += 1;

    let cancelled = false;
    const requestedName = debounced;
    const requestedAttempt = attempt;
    const source = resolveName;

    const settle = (result: ResolutionResult<ResolvedAddress>): void => {
      if (cancelled) return; // superseded dispatch or unmounted — drop
      if (requestedName !== currentTargetRef.current) return; // INV-117: stale name — drop
      setSettled({ name: requestedName, result, source, attempt: requestedAttempt });
    };

    source(requestedName).then(settle, (cause: unknown) => {
      // INV-87 backstop: the injected fn MUST NOT reject for expected failures;
      // map a contract-violating rejection into the closed error union.
      settle({
        ok: false,
        error: {
          code: 'ADAPTER_ERROR',
          message: cause instanceof Error ? cause.message : String(cause),
          cause,
        },
      });
    });

    return () => {
      cancelled = true;
    };
    // `resolveName` identity stays the dispatch trigger (INV-119). `warnOnceOnChurn`
    // is a stable `useCallback([])`, so listing it adds no re-fire and keeps the
    // trigger semantics unchanged.
  }, [enabled, resolveName, debounced, normalized, attempt, warnOnceOnChurn]);

  const retry = useCallback((): void => {
    setAttempt((current) => current + 1);
  }, []);

  // --- Status derivation: a total function of gate state × settled state ---

  if (!enabled || !resolveName || normalized === '') {
    return { status: 'idle' }; // INV-83
  }
  if (debounced !== normalized) {
    return { status: 'debouncing', name: normalized };
  }
  if (
    settled !== null &&
    settled.name === debounced &&
    settled.source === resolveName &&
    settled.attempt === attempt
  ) {
    if (settled.result.ok) {
      return { status: 'resolved', name: settled.name, data: settled.result.value };
    }
    return { status: 'error', name: settled.name, error: settled.result.error, retry };
  }
  return { status: 'loading', name: normalized };
}
