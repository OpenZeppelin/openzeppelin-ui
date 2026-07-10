/**
 * @vitest-environment jsdom
 *
 * SF-3 Rev-2 · `useInjectedNameResolution` machine unit suite
 * (INV-117 out-of-order name-drop, INV-83 dispatch gate, INV-85 machine half,
 * INV-87 no-throw backstop, INV-90 retry, plus debounce/normalization).
 *
 * The machine is exercised directly with `renderHook` and a spy `resolveName`
 * returning per-call deferreds, so every status arm — including out-of-order
 * and post-unmount settles — is driven deterministically.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useInjectedNameResolution, type InjectedResolveName } from '../useInjectedNameResolution';
import { controlledResolver, errResult, HEX_ALICE, HEX_BOB, okResult } from './helpers';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

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

describe('INV-83: dispatch gate — idle with zero calls unless enabled + resolveName + non-empty', () => {
  it('stays idle and never calls when enabled=false', async () => {
    const r = controlledResolver();
    const { result } = mountMachine({
      input: 'alice.eth',
      enabled: false,
      resolveName: r.resolveName,
    });
    await elapse(1000);
    expect(result.current).toEqual({ status: 'idle' });
    expect(r.resolveName).not.toHaveBeenCalled();
  });

  it('stays idle and never calls when resolveName is absent', async () => {
    const { result } = mountMachine({ input: 'alice.eth', enabled: true });
    await elapse(1000);
    expect(result.current).toEqual({ status: 'idle' });
  });

  it('stays idle for empty/whitespace input', async () => {
    const r = controlledResolver();
    const { result } = mountMachine({ input: '   ', enabled: true, resolveName: r.resolveName });
    await elapse(1000);
    expect(result.current).toEqual({ status: 'idle' });
    expect(r.resolveName).not.toHaveBeenCalled();
  });

  it('REGRESSION (Bug 2 fix): a stale debounced value is never dispatched when enabled flips true', async () => {
    const r = controlledResolver();
    const { rerender } = mountMachine({
      input: 'alice.sol',
      enabled: false,
      resolveName: r.resolveName,
    });

    await elapse(300); // debounced settles on 'alice.sol' while disabled
    expect(r.resolveName).not.toHaveBeenCalled();

    // classification flips to name-candidate for the NEW input before its debounce
    rerender({ input: 'alice.eth', enabled: true, resolveName: r.resolveName });
    await act(async () => {});
    expect(r.resolveName).not.toHaveBeenCalled(); // no immediate stale 'alice.sol' dispatch

    await elapse(300);
    expect(r.calls).toEqual(['alice.eth']); // exactly the current input, once
  });
});

describe('debounce + normalization', () => {
  it('seeds the mount value without a debounce window (prefilled input dispatches immediately)', async () => {
    const r = controlledResolver();
    const { result } = mountMachine({
      input: 'alice.eth',
      enabled: true,
      resolveName: r.resolveName,
    });
    await act(async () => {});
    expect(r.calls).toEqual(['alice.eth']); // no timer advance needed
    expect(result.current.status).toBe('loading');
  });

  it('debounces subsequent changes — status is `debouncing` until the window elapses, one call per settled value', async () => {
    const r = controlledResolver();
    const { result, rerender } = mountMachine({
      input: '',
      enabled: false,
      resolveName: r.resolveName,
    });

    rerender({ input: 'alice.eth', enabled: true, resolveName: r.resolveName });
    await act(async () => {});
    expect(result.current).toEqual({ status: 'debouncing', name: 'alice.eth' });

    await elapse(299);
    expect(result.current.status).toBe('debouncing');
    await elapse(1);
    expect(result.current).toEqual({ status: 'loading', name: 'alice.eth' });
    expect(r.calls).toEqual(['alice.eth']);
  });

  it('normalizes trim+lowercase before dispatch, and echoes the normalized name in every arm', async () => {
    const r = controlledResolver();
    const { result } = mountMachine({
      input: '  Alice.ETH ',
      enabled: true,
      resolveName: r.resolveName,
    });
    await act(async () => {});
    expect(r.calls).toEqual(['alice.eth']);
    expect(result.current.status).toBe('loading');
    if (result.current.status === 'loading') {
      expect(result.current.name).toBe('alice.eth');
    }

    await act(async () => {
      r.deferreds[0].resolve(okResult('alice.eth', HEX_ALICE));
    });
    expect(result.current).toMatchObject({ status: 'resolved', name: 'alice.eth' });
  });

  it('debounceMs <= 0 disables the debounce window', async () => {
    const r = controlledResolver();
    const { result, rerender } = mountMachine({
      input: '',
      enabled: false,
      resolveName: r.resolveName,
      debounceMs: 0,
    });
    rerender({ input: 'alice.eth', enabled: true, resolveName: r.resolveName, debounceMs: 0 });
    await act(async () => {});
    expect(result.current.status).toBe('loading');
    expect(r.calls).toEqual(['alice.eth']);
  });
});

describe('INV-117: out-of-order settles are dropped (last-write-wins at the component boundary)', () => {
  it('a stale name settling AFTER the current name never surfaces — terminal state carries only the current result', async () => {
    const r = controlledResolver();
    const { result, rerender } = mountMachine({
      input: 'alice.eth',
      enabled: true,
      resolveName: r.resolveName,
    });
    await act(async () => {});
    rerender({ input: 'bob.eth', enabled: true, resolveName: r.resolveName });
    await elapse(300);
    expect(r.calls).toEqual(['alice.eth', 'bob.eth']);

    // settle OUT OF ORDER: bob first…
    await act(async () => {
      r.deferreds[1].resolve(okResult('bob.eth', HEX_BOB));
    });
    expect(result.current).toMatchObject({
      status: 'resolved',
      name: 'bob.eth',
      data: { address: HEX_BOB },
    });

    // …then the stale alice — dropped, no state write, never transiently exposed
    await act(async () => {
      r.deferreds[0].resolve(okResult('alice.eth', HEX_ALICE));
    });
    expect(result.current).toMatchObject({
      status: 'resolved',
      name: 'bob.eth',
      data: { address: HEX_BOB },
    });
  });

  it('a stale settle while the current name is still in flight keeps `loading` (never a mismatched resolved)', async () => {
    const r = controlledResolver();
    const { result, rerender } = mountMachine({
      input: 'alice.eth',
      enabled: true,
      resolveName: r.resolveName,
    });
    await act(async () => {});
    rerender({ input: 'bob.eth', enabled: true, resolveName: r.resolveName });
    await elapse(300);

    await act(async () => {
      r.deferreds[0].resolve(okResult('alice.eth', HEX_ALICE)); // stale
    });
    expect(result.current).toEqual({ status: 'loading', name: 'bob.eth' });
  });
});

describe('INV-85 (machine half): a settled record never outlives its (name, source, attempt) identity', () => {
  it('a resolver identity change (network switch) invalidates a prior resolved record — derives loading, re-dispatches', async () => {
    const rA = controlledResolver();
    const rB = controlledResolver();
    const { result, rerender } = mountMachine({
      input: 'alice.eth',
      enabled: true,
      resolveName: rA.resolveName,
    });
    await act(async () => {});
    await act(async () => {
      rA.deferreds[0].resolve(okResult('alice.eth', HEX_ALICE));
    });
    expect(result.current.status).toBe('resolved');

    rerender({ input: 'alice.eth', enabled: true, resolveName: rB.resolveName });
    await act(async () => {});
    // the old network's hex is NOT re-served; the new resolver is consulted
    expect(result.current).toEqual({ status: 'loading', name: 'alice.eth' });
    expect(rB.calls).toEqual(['alice.eth']);

    await act(async () => {
      rB.deferreds[0].resolve(okResult('alice.eth', HEX_BOB));
    });
    expect(result.current).toMatchObject({ status: 'resolved', data: { address: HEX_BOB } });
  });
});

describe('INV-87: no-throw discipline', () => {
  it('maps a contract-violating rejection into a typed ADAPTER_ERROR (Error → its message)', async () => {
    const r = controlledResolver();
    const { result } = mountMachine({
      input: 'alice.eth',
      enabled: true,
      resolveName: r.resolveName,
    });
    await act(async () => {});
    await act(async () => {
      r.deferreds[0].reject(new Error('gateway exploded'));
    });
    expect(result.current).toMatchObject({
      status: 'error',
      error: { code: 'ADAPTER_ERROR', message: 'gateway exploded' },
    });
  });

  it('maps a non-Error rejection via String(cause)', async () => {
    const r = controlledResolver();
    const { result } = mountMachine({
      input: 'alice.eth',
      enabled: true,
      resolveName: r.resolveName,
    });
    await act(async () => {});
    await act(async () => {
      r.deferreds[0].reject('plain string failure');
    });
    expect(result.current).toMatchObject({
      status: 'error',
      error: { code: 'ADAPTER_ERROR', message: 'plain string failure' },
    });
  });

  it('a settle after unmount is dropped silently (no setState-after-unmount, no throw)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = controlledResolver();
    const { unmount } = mountMachine({
      input: 'alice.eth',
      enabled: true,
      resolveName: r.resolveName,
    });
    await act(async () => {});
    expect(r.calls).toEqual(['alice.eth']);

    unmount();
    await act(async () => {
      r.deferreds[0].resolve(okResult('alice.eth', HEX_ALICE));
    });
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('INV-90: retry re-dispatches and re-derives loading (attempt-scoped staleness)', () => {
  it('retry() from the error arm issues a fresh call; the prior error never re-surfaces', async () => {
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
    // the stale error record is attempt-mismatched → loading, not the old error
    expect(result.current).toEqual({ status: 'loading', name: 'alice.eth' });
    expect(r.calls).toEqual(['alice.eth', 'alice.eth']);

    await act(async () => {
      r.deferreds[1].resolve(okResult('alice.eth', HEX_ALICE));
    });
    expect(result.current).toMatchObject({ status: 'resolved', data: { address: HEX_ALICE } });
  });
});
