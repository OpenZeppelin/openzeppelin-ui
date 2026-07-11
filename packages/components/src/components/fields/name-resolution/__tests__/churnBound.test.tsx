/**
 * @vitest-environment jsdom
 *
 * SF-3 Rev-3 · Resolver-identity-churn hardening (Option C / D9)
 * — INV-123 (per-resolution-intent bounded dispatch, SC-008),
 *   INV-124 (one-shot dev-only churn warning, silent in production),
 *   INV-125 (safe gated degradation under sustained churn + recovery via a
 *   new intent), and INV-119 re-affirmed (a genuine memoized swap re-resolves
 *   the current input exactly once, within budget — acceptance #5).
 *
 * The churn footgun is reproduced faithfully: an integrator resolver whose
 * FUNCTION IDENTITY changes on every render (a fresh inline function) under a
 * stable typed input, forced through many re-renders. The machine keys its
 * dispatch effect on `resolveName` identity, so churn re-fires it every render;
 * the per-intent budget must cap the RPCs regardless of render count. All
 * assertions pin against the EXPORTED `MAX_DISPATCHES_PER_INTENT` constant —
 * never a hard-coded 8 — so the constant stays a Code detail.
 */

import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { useForm, useFormState, useWatch, type Control } from 'react-hook-form';

import type { NameResolver, ResolutionResult, ResolvedAddress } from '@openzeppelin/ui-types';
import { logger } from '@openzeppelin/ui-utils';

import { AddressField } from '../../AddressField';
import { NameResolverProvider } from '../name-resolver-context';
import {
  MAX_DISPATCHES_PER_INTENT,
  useInjectedNameResolution,
  type InjectedResolveName,
} from '../useInjectedNameResolution';
import {
  addressing,
  controlledResolver,
  elapseDebounce,
  errResult,
  HEX_ALICE,
  HEX_BOB,
  okResult,
  settle,
  typeValue,
} from './helpers';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

/** How many renders to force under churn — comfortably above any plausible cap. */
const CHURN_RENDERS = 40;

/**
 * A resolver whose FUNCTION IDENTITY is fresh on every call site (the churn
 * footgun). It records the name into a shared array and never settles, so the
 * machine stays in `loading` and never resolves — modeling an integrator that
 * forgot to memoize. Identity churn is what re-fires the dispatch effect.
 */
function churningResolveName(calls: string[]): InjectedResolveName {
  return (name: string): Promise<ResolutionResult<ResolvedAddress>> => {
    calls.push(name);
    return new Promise<ResolutionResult<ResolvedAddress>>(() => {
      /* never settles: each render supersedes the prior in-flight dispatch */
    });
  };
}

/** Count only the machine's own churn warnings (ignore any unrelated logger.warn). */
function churnWarningCount(spy: ReturnType<typeof vi.spyOn>): number {
  return spy.mock.calls.filter((args) => args[0] === 'AddressField').length;
}

// --------------------------------------------------------------------------
// Machine-level (renderHook) — INV-123 / INV-124 / INV-119 / recovery
// --------------------------------------------------------------------------

interface Props {
  input: string;
  enabled: boolean;
  resolveName?: InjectedResolveName;
  debounceMs?: number;
}

function mountMachine(initial: Props) {
  return renderHook((p: Props) => useInjectedNameResolution(p), { initialProps: initial });
}

async function elapse(ms: number): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

/** Rerender `times` times, each with a fresh churning resolver identity. */
async function churnMachine(
  rerender: (p: Props) => void,
  calls: string[],
  base: Omit<Props, 'resolveName'>,
  times: number
): Promise<void> {
  for (let i = 0; i < times; i++) {
    rerender({ ...base, resolveName: churningResolveName(calls) });
    await act(async () => {});
  }
}

describe('INV-123: resolver dispatch is bounded per resolution intent, regardless of render count', () => {
  it('a churning identity under a stable input is capped at MAX_DISPATCHES_PER_INTENT (not ∝ render count)', async () => {
    const calls: string[] = [];
    const { rerender } = mountMachine({
      input: 'alice.eth',
      enabled: true,
      resolveName: churningResolveName(calls),
    });
    await act(async () => {}); // mount-seeded dispatch (1)

    await churnMachine(rerender, calls, { input: 'alice.eth', enabled: true }, CHURN_RENDERS);

    // bounded by the EXPORTED constant — asserted against the import, never a literal 8
    expect(calls.length).toBe(MAX_DISPATCHES_PER_INTENT);
    // and decisively NOT proportional to the render count
    expect(calls.length).toBeLessThan(CHURN_RENDERS);
    // every dispatch was for the one stable intent
    expect(new Set(calls)).toEqual(new Set(['alice.eth']));
  });

  it('the budget resets on intent change — retyping a different name gets a fresh dispatch after exhaustion', async () => {
    const calls: string[] = [];
    const { rerender } = mountMachine({
      input: 'alice.eth',
      enabled: true,
      resolveName: churningResolveName(calls),
    });
    await act(async () => {});
    await churnMachine(rerender, calls, { input: 'alice.eth', enabled: true }, CHURN_RENDERS);
    expect(calls.length).toBe(MAX_DISPATCHES_PER_INTENT); // alice budget spent

    // retype → new (normalized input × attempt) intent → budget reset → dispatch allowed
    rerender({ input: 'bob.eth', enabled: true, resolveName: churningResolveName(calls) });
    await elapse(300); // debounce the changed input

    const bobCalls = calls.filter((c) => c === 'bob.eth');
    expect(bobCalls.length).toBeGreaterThanOrEqual(1); // fresh intent resolved despite prior exhaustion
    expect(bobCalls.length).toBeLessThanOrEqual(MAX_DISPATCHES_PER_INTENT); // and re-bounded
  });

  it('retry() starts a fresh intent (new attempt) — a new per-intent budget, never the prior one (INV-123(a))', async () => {
    const r = controlledResolver();
    const { result } = mountMachine({
      input: 'alice.eth',
      enabled: true,
      resolveName: r.resolveName,
    });
    await act(async () => {});
    await act(async () => {
      r.deferreds[0].resolve(errResult({ code: 'RESOLUTION_TIMEOUT', elapsedMs: 5000 }));
    });
    expect(result.current.status).toBe('error');

    await act(async () => {
      if (result.current.status === 'error') result.current.retry();
    });
    // attempt bumped → new intentKey → a fresh dispatch (budget not carried across the attempt)
    expect(r.calls).toEqual(['alice.eth', 'alice.eth']);
    expect(result.current).toEqual({ status: 'loading', name: 'alice.eth' });
  });
});

describe('INV-124: a churning resolver identity emits a one-shot, development-only warning', () => {
  it('fires logger.warn exactly once per field instance across many churned renders', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    try {
      const calls: string[] = [];
      const { rerender } = mountMachine({
        input: 'alice.eth',
        enabled: true,
        resolveName: churningResolveName(calls),
      });
      await act(async () => {});
      await churnMachine(rerender, calls, { input: 'alice.eth', enabled: true }, CHURN_RENDERS);

      expect(churnWarningCount(warnSpy)).toBe(1); // one-shot, never spammed
      expect(String(warnSpy.mock.calls[0]?.[1])).toContain('Memoize the resolver');
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('is silent under NODE_ENV=production even while churning (bound still applies)', async () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    try {
      const calls: string[] = [];
      const { rerender } = mountMachine({
        input: 'alice.eth',
        enabled: true,
        resolveName: churningResolveName(calls),
      });
      await act(async () => {});
      await churnMachine(rerender, calls, { input: 'alice.eth', enabled: true }, CHURN_RENDERS);

      expect(calls.length).toBe(MAX_DISPATCHES_PER_INTENT); // still bounded in production
      expect(churnWarningCount(warnSpy)).toBe(0); // but no dev-only diagnostic leaks
    } finally {
      process.env.NODE_ENV = original;
      warnSpy.mockRestore();
    }
  });

  it('never warns on the memoized (stable-identity) path resolving within budget', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    try {
      const r = controlledResolver();
      const { result, rerender } = mountMachine({
        input: 'alice.eth',
        enabled: true,
        resolveName: r.resolveName,
      });
      await act(async () => {});
      await act(async () => {
        r.deferreds[0].resolve(okResult('alice.eth', HEX_ALICE));
      });
      // a few benign re-renders with the SAME (stable) identity
      rerender({ input: 'alice.eth', enabled: true, resolveName: r.resolveName });
      await act(async () => {});
      rerender({ input: 'alice.eth', enabled: true, resolveName: r.resolveName });
      await act(async () => {});

      expect(result.current.status).toBe('resolved');
      expect(r.calls).toEqual(['alice.eth']); // exactly one dispatch, well within budget
      expect(churnWarningCount(warnSpy)).toBe(0);
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe('INV-119 (re-affirmed): a genuine memoized resolver/network swap re-resolves the current input exactly once, within budget', () => {
  it('one identity change re-dispatches once against the new resolver and never trips the churn warning', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    try {
      const netA = controlledResolver();
      const netB = controlledResolver();
      const { result, rerender } = mountMachine({
        input: 'alice.eth',
        enabled: true,
        resolveName: netA.resolveName,
      });
      await act(async () => {});
      await act(async () => {
        netA.deferreds[0].resolve(okResult('alice.eth', HEX_ALICE));
      });
      expect(result.current).toMatchObject({ status: 'resolved', data: { address: HEX_ALICE } });

      // genuine swap: the memoized resolver identity changes EXACTLY ONCE (a network switch)
      rerender({ input: 'alice.eth', enabled: true, resolveName: netB.resolveName });
      await act(async () => {});
      // the prior network's hex is invalidated (settled.source mismatch) → re-resolves
      expect(result.current).toEqual({ status: 'loading', name: 'alice.eth' });
      expect(netB.calls).toEqual(['alice.eth']); // exactly one re-dispatch (≤ 1 budget unit)

      await act(async () => {
        netB.deferreds[0].resolve(okResult('alice.eth', HEX_BOB));
      });
      expect(result.current).toMatchObject({ status: 'resolved', data: { address: HEX_BOB } });

      // a legitimate single swap is nowhere near the cap and never looks like churn
      expect(churnWarningCount(warnSpy)).toBe(0);
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe('INV-123 (settling churn): oscillating settled.source between two resolvers must not refill the budget', () => {
  it('total dispatches stay ≤ MAX_DISPATCHES_PER_INTENT when two settling sources flap for the same input', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    try {
      const netA = controlledResolver();
      const netB = controlledResolver();
      const { result, rerender } = mountMachine({
        input: 'alice.eth',
        enabled: true,
        resolveName: netA.resolveName,
      });
      await act(async () => {});

      // Oscillate well past the cap: each swap settles, so `settled.source` flips
      // on every turn. A budget reset keyed on settled.source ≠ resolveName would
      // refill the counter here and allow unbounded RPC (the REVIEW-UI m1 gap).
      const flaps = MAX_DISPATCHES_PER_INTENT * 3;
      for (let i = 0; i < flaps; i++) {
        const active = i % 2 === 0 ? netA : netB;
        const pending = active.deferreds[active.deferreds.length - 1];
        expect(pending).toBeDefined();
        await act(async () => {
          pending.resolve(okResult('alice.eth', i % 2 === 0 ? HEX_ALICE : HEX_BOB));
        });
        // Swap to the other memoized identity (settled.source now mismatches).
        const next = i % 2 === 0 ? netB : netA;
        rerender({ input: 'alice.eth', enabled: true, resolveName: next.resolveName });
        await act(async () => {});
      }

      const totalDispatches = netA.calls.length + netB.calls.length;
      expect(totalDispatches).toBe(MAX_DISPATCHES_PER_INTENT);
      expect(totalDispatches).toBeLessThan(flaps);
      // Once the shared intent budget is spent, further flaps stay gated (loading).
      expect(result.current.status).toBe('loading');
      expect(churnWarningCount(warnSpy)).toBe(1);
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe('INV-125 (machine): recovery is via a NEW intent — not via in-place memoization of an already-spent intent', () => {
  it('memoizing a spent intent does not re-fire it; a fresh intent (retype) resolves normally against the stable resolver', async () => {
    const churnCalls: string[] = [];
    const stable = controlledResolver();
    const { result, rerender } = mountMachine({
      input: 'alice.eth',
      enabled: true,
      resolveName: churningResolveName(churnCalls),
    });
    await act(async () => {});
    await churnMachine(rerender, churnCalls, { input: 'alice.eth', enabled: true }, CHURN_RENDERS);
    expect(churnCalls.length).toBe(MAX_DISPATCHES_PER_INTENT);
    expect(result.current.status).toBe('loading'); // stuck in the safe gated state

    // stabilize identity but keep the SAME intent — the spent alice.eth budget must NOT re-fire
    rerender({ input: 'alice.eth', enabled: true, resolveName: stable.resolveName });
    await act(async () => {});
    rerender({ input: 'alice.eth', enabled: true, resolveName: stable.resolveName });
    await act(async () => {});
    expect(stable.calls).toEqual([]); // memoization alone does NOT recover a spent intent
    expect(result.current.status).toBe('loading');

    // recovery: a NEW intent (retype) resets the budget and resolves against the stable resolver
    rerender({ input: 'bob.eth', enabled: true, resolveName: stable.resolveName });
    await elapse(300);
    expect(stable.calls).toEqual(['bob.eth']);
    await act(async () => {
      stable.deferreds[0].resolve(okResult('bob.eth', HEX_BOB));
    });
    expect(result.current).toMatchObject({ status: 'resolved', data: { address: HEX_BOB } });
  });
});

// --------------------------------------------------------------------------
// Field-level (real RHF) — INV-125 safe gated degradation + recovery
// --------------------------------------------------------------------------

interface FieldForm {
  recipient: string;
}

/** RHF probe: surfaces the field value + `isValid` and records the write history. */
function Probe({
  control,
  writes,
}: {
  control: Control<FieldForm>;
  writes: string[];
}): React.ReactElement {
  const value = (useWatch({ control, name: 'recipient' }) as string | undefined) ?? '';
  const { isValid } = useFormState({ control });
  if (writes[writes.length - 1] !== value) {
    writes.push(value);
  }
  return (
    <>
      <span data-testid="rhf-value">{value}</span>
      <span data-testid="rhf-valid">{String(isValid)}</span>
    </>
  );
}

const isHexAddress = (v: string): boolean => /^0x[0-9a-fA-F]{40}$/.test(v);

interface ChurnFieldHarness {
  readonly churnCalls: string[];
  readonly stable: ReturnType<typeof controlledResolver>;
  readonly writes: string[];
  readonly force: () => void;
  readonly stabilize: () => void;
  readonly rhfValue: () => string;
  readonly rhfIsValid: () => boolean;
  readonly unmount: () => void;
}

/**
 * Mount the REAL base `AddressField` under a provider whose `resolveName`
 * identity is fresh on every render (churn) until `stabilize()` is called, at
 * which point a single stable (controlled) resolver takes over. `force()`
 * re-renders the tree, minting a new resolver identity while churning.
 */
function renderChurnField(opts: { required?: boolean } = {}): ChurnFieldHarness {
  const churnCalls: string[] = [];
  const stable = controlledResolver();
  const writes: string[] = [];
  const mode = { stable: false };
  let force: () => void = () => {};

  function Root(): React.ReactElement {
    const [, setTick] = React.useState(0);
    force = () => setTick((t) => t + 1);
    const { control } = useForm<FieldForm>({
      defaultValues: { recipient: '' },
      mode: 'onChange',
    });
    const resolver: NameResolver = mode.stable
      ? { resolveName: stable.resolveName } // stable identity (created once)
      : { resolveName: churningResolveName(churnCalls) }; // fresh identity every render
    return (
      <NameResolverProvider {...resolver}>
        <AddressField<FieldForm>
          id="recipient"
          name="recipient"
          label="Recipient"
          control={control}
          addressing={addressing}
          validation={opts.required ? { required: true } : undefined}
        />
        <Probe control={control} writes={writes} />
      </NameResolverProvider>
    );
  }

  const { unmount } = render(<Root />);
  return {
    churnCalls,
    stable,
    writes,
    force: () => force(),
    stabilize: () => {
      mode.stable = true;
    },
    rhfValue: () => screen.getByTestId('rhf-value').textContent ?? '',
    rhfIsValid: () => screen.getByTestId('rhf-valid').textContent === 'true',
    unmount,
  };
}

/** Force `times` churned re-renders through the field tree, inside act. */
async function churnField(force: () => void, times: number): Promise<void> {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      force();
    });
  }
}

describe('INV-125 (field): sustained churn degrades to a safe gated state — bounded, "", submit gated, no wrong hex, no throw', () => {
  it('keeps the RHF value "" and submit gated under indefinite churn, never writing a hex, never throwing', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    try {
      const h = renderChurnField({ required: true });

      typeValue('alice.eth');
      await elapseDebounce(); // first dispatch
      await churnField(h.force, CHURN_RENDERS);

      // safe gated state: value never leaves '' and the form stays gated
      expect(h.rhfValue()).toBe('');
      expect(h.rhfIsValid()).toBe(false);
      // never a wrong (or any) hex written across the whole churn history
      expect(h.writes.filter(isHexAddress)).toEqual([]);
      // dispatch is bounded (INV-123 observed at the field boundary)
      expect(h.churnCalls.length).toBeLessThanOrEqual(MAX_DISPATCHES_PER_INTENT);
      expect(h.churnCalls.length).toBeLessThan(CHURN_RENDERS);
      // the dev warning fired once; nothing threw into the render tree
      expect(churnWarningCount(warnSpy)).toBe(1);
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it('recovers via a fresh intent once the resolver identity is stabilized (retype resolves normally)', async () => {
    const h = renderChurnField();

    typeValue('alice.eth');
    await elapseDebounce();
    await churnField(h.force, CHURN_RENDERS);
    expect(h.rhfValue()).toBe('');
    expect(h.churnCalls.length).toBeLessThanOrEqual(MAX_DISPATCHES_PER_INTENT);

    // stabilize identity; the SAME spent intent must NOT recover by memoization alone
    h.stabilize();
    await act(async () => {
      h.force();
    });
    expect(h.stable.calls).toEqual([]);
    expect(h.rhfValue()).toBe('');

    // recovery: retype a NEW name → fresh intent → resolves against the stable resolver
    typeValue('bob.eth');
    await elapseDebounce();
    expect(h.stable.calls).toEqual(['bob.eth']);

    await settle(h.stable.deferreds[0], okResult('bob.eth', HEX_BOB));
    expect(h.rhfValue()).toBe(HEX_BOB);
    expect(h.rhfIsValid()).toBe(true);
  });
});
