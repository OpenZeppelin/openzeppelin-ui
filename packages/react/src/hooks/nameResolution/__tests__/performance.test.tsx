/**
 * Performance, Scalability & Stability — timer / observer lifecycle, warm-cache
 * latency, rerender scope, bounded memory, network scoping, no ambient refetch.
 *
 * Verifies: INV-35 (debounce timer cleared on change + unmount), INV-36 (no
 * state update after unmount; in-flight result dropped), INV-37 (warm cache →
 * resolved on first commit, no loading/debouncing flash, no adapter call),
 * INV-38 (input change rerenders only that consumer), INV-39 (cache bounded by
 * gcTime), INV-40 (network-scoped keys), INV-41 (no refetch on window focus).
 */
import { act, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { memo, type ReactNode } from 'react';

import type { ResolutionResult, ResolvedAddress, ResolvedName } from '@openzeppelin/ui-types';

import { createResolutionQueryClient } from '../resolutionConfig';
import { useResolveAddress } from '../useResolveAddress';
import { useResolveName } from '../useResolveName';
import {
  ALICE,
  makeCapability,
  makeWalletWrapper,
  REVERSE_UNVERIFIED,
  tick,
  walletWithCapability,
} from './helpers';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('INV-35: debounce timer cleared on input change and on unmount', () => {
  it('rapid typing keeps exactly one live timer; unmount clears the last', () => {
    // Invalid (non-`.eth`) names keep the query disabled, so getTimerCount
    // reflects ONLY the debounce timer, not react-query internals.
    const { Wrapper } = makeWalletWrapper(walletWithCapability(makeCapability()));

    const { rerender, unmount } = renderHook(({ name }) => useResolveName(name), {
      wrapper: Wrapper,
      initialProps: { name: '' },
    });
    // A mounted query observer leaves a constant background timer under fake
    // timers (react-query housekeeping), independent of debouncing; measure the
    // debounce timer as a delta from this baseline. Seeded on mount → no
    // debounce timer armed yet.
    const base = vi.getTimerCount();

    rerender({ name: 'a' });
    expect(vi.getTimerCount()).toBe(base + 1); // exactly one debounce timer armed

    for (const partial of ['ab', 'abc', 'abcd', 'abcde']) {
      rerender({ name: partial });
      // Each keystroke clears the prior timer and arms one — never accumulates.
      expect(vi.getTimerCount()).toBe(base + 1);
    }

    unmount();
    expect(vi.getTimerCount()).toBeLessThan(base + 1); // cleanup cleared the pending debounce timer
  });

  it('a debounce armed then unmounted mid-window never fires setState (no console error)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { Wrapper } = makeWalletWrapper(walletWithCapability(makeCapability()));

    const { rerender, unmount } = renderHook(({ name }) => useResolveName(name), {
      wrapper: Wrapper,
      initialProps: { name: 'a' },
    });
    rerender({ name: 'ab' }); // arms a 300ms timer
    unmount(); // mid-window
    await tick(600); // advance past when the timer would have fired

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('INV-36: no state update after unmount; in-flight result is dropped', () => {
  it('a promise that settles after unmount produces no render and no warning', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let settle: (r: ResolutionResult<ResolvedName>) => void = () => undefined;
    const pending = new Promise<ResolutionResult<ResolvedName>>((res) => {
      settle = res;
    });
    const resolveAddress = vi.fn(() => pending);
    const { Wrapper } = makeWalletWrapper(walletWithCapability(makeCapability({ resolveAddress })));

    const { result, unmount } = renderHook(() => useResolveAddress('0xabc'), {
      wrapper: Wrapper,
    });
    await tick(0);
    expect(result.current.status).toBe('loading'); // in flight

    unmount();
    // The underlying promise is not aborted — it settles, but nothing observes it now.
    await act(async () => {
      settle({ ok: true, value: REVERSE_UNVERIFIED });
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('INV-37: a warm cache resolves on first commit with no loading/debouncing flash', () => {
  it('a re-mount on a fresh cache entry is resolved immediately and calls no adapter', async () => {
    const resolveName = vi.fn(
      async (): Promise<ResolutionResult<ResolvedAddress>> => ({ ok: true, value: ALICE })
    );
    const client = createResolutionQueryClient();
    const { Wrapper } = makeWalletWrapper(walletWithCapability(makeCapability({ resolveName })), {
      client,
    });

    // Warm the cache.
    const warm = renderHook(() => useResolveName('alice.eth'), {
      wrapper: Wrapper,
    });
    await tick(0);
    expect(warm.result.current.status).toBe('resolved');
    expect(resolveName).toHaveBeenCalledTimes(1);
    warm.unmount();

    // Re-mount on the same fresh entry — capture EVERY committed status.
    const seen: string[] = [];
    const { result } = renderHook(
      () => {
        const r = useResolveName('alice.eth');
        seen.push(r.status);
        return r;
      },
      { wrapper: Wrapper }
    );

    expect(seen[0]).toBe('resolved'); // resolved on the FIRST committed render
    expect(seen).not.toContain('loading');
    expect(seen).not.toContain('debouncing');
    expect(result.current).toMatchObject({ status: 'resolved', data: ALICE });
    expect(resolveName).toHaveBeenCalledTimes(1); // no second round-trip
  });
});

describe('INV-38: an input change rerenders only the affected consumer', () => {
  it("changing hook A's input does not rerender hook B", async () => {
    const resolveAddress = vi.fn(
      async (address: string): Promise<ResolutionResult<ResolvedName>> => ({
        ok: true,
        value: { ...REVERSE_UNVERIFIED, address },
      })
    );
    const { Wrapper } = makeWalletWrapper(walletWithCapability(makeCapability({ resolveAddress })));

    const renders = { a: 0, b: 0 };
    const ChildA = memo(function ChildA({ addr }: { addr: string }) {
      useResolveAddress(addr);
      renders.a += 1;
      return null;
    });
    const ChildB = memo(function ChildB({ addr }: { addr: string }) {
      useResolveAddress(addr);
      renders.b += 1;
      return null;
    });
    function Tree({ aAddr }: { aAddr: string }): ReactNode {
      return (
        <>
          <ChildA addr={aAddr} />
          <ChildB addr="0xBBBB" />
        </>
      );
    }

    const { rerender } = render(<Tree aAddr="0xAAAA" />, { wrapper: Wrapper });
    await tick(0);
    const bAfterInit = renders.b;

    // Change only A's input; B's props are unchanged and it is memoized.
    rerender(<Tree aAddr="0xAAAA2" />);
    await tick(0);

    expect(renders.b).toBe(bAfterInit); // B never rerendered on A's change or A's cache write
  });
});

describe('INV-39: the resolution cache is bounded by gcTime', () => {
  it('an unobserved entry is garbage-collected after gcTime', async () => {
    const resolveAddress = vi.fn(
      async (): Promise<ResolutionResult<ResolvedName>> => ({ ok: true, value: REVERSE_UNVERIFIED })
    );
    const client = createResolutionQueryClient();
    const { Wrapper } = makeWalletWrapper(
      walletWithCapability(makeCapability({ resolveAddress })),
      {
        client,
        config: { gcTimeMs: 1000 },
      }
    );

    const { unmount } = renderHook(() => useResolveAddress('0xabc'), {
      wrapper: Wrapper,
    });
    await tick(0);
    expect(client.getQueryCache().getAll()).toHaveLength(1);

    unmount(); // entry now unobserved → gc timer armed
    await tick(1001); // past gcTime
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });
});

describe('INV-40: cache keys are network-scoped (same input, two networks → two entries)', () => {
  it('switching network re-resolves; network B is never served network A cache', async () => {
    const resolveName = vi.fn(
      async (): Promise<ResolutionResult<ResolvedAddress>> => ({ ok: true, value: ALICE })
    );
    const capability = makeCapability({ resolveName });

    const { Wrapper, setWallet } = makeWalletWrapper(
      walletWithCapability(capability, { activeNetworkId: 'eip155:1' })
    );
    renderHook(() => useResolveName('alice.eth'), {
      wrapper: Wrapper,
    });
    await tick(0);
    expect(resolveName).toHaveBeenCalledTimes(1);

    // Switch network → distinct key → cache miss → a second resolution.
    setWallet(walletWithCapability(capability, { activeNetworkId: 'eip155:11155111' }));
    await tick(0);
    expect(resolveName).toHaveBeenCalledTimes(2);
  });
});

describe('INV-230: cache keys are runtime-instance-scoped (same network + input, new runtime → re-resolve)', () => {
  it('forward: replacing activeRuntime on the same network triggers a fresh resolution', async () => {
    const resolveName = vi.fn(
      async (): Promise<ResolutionResult<ResolvedAddress>> => ({ ok: true, value: ALICE })
    );
    const capability = makeCapability({ resolveName });
    const initialWallet = walletWithCapability(capability, { activeNetworkId: 'eip155:1' });
    const { Wrapper, setWallet } = makeWalletWrapper(initialWallet);

    renderHook(() => useResolveName('alice.eth'), { wrapper: Wrapper });
    await tick(0);
    expect(resolveName).toHaveBeenCalledTimes(1);

    setWallet(walletWithCapability(capability, { activeNetworkId: 'eip155:1' }));
    await tick(0);
    expect(resolveName).toHaveBeenCalledTimes(2);
  });

  it('reverse: replacing activeRuntime on the same network triggers a fresh resolution', async () => {
    const resolveAddress = vi.fn(
      async (): Promise<ResolutionResult<ResolvedName>> => ({ ok: true, value: REVERSE_UNVERIFIED })
    );
    const capability = makeCapability({ resolveAddress });
    const { Wrapper, setWallet } = makeWalletWrapper(
      walletWithCapability(capability, { activeNetworkId: 'eip155:1' })
    );

    renderHook(() => useResolveAddress('0xabc'), { wrapper: Wrapper });
    await tick(0);
    expect(resolveAddress).toHaveBeenCalledTimes(1);

    setWallet(walletWithCapability(capability, { activeNetworkId: 'eip155:1' }));
    await tick(0);
    expect(resolveAddress).toHaveBeenCalledTimes(2);
  });
});

describe('INV-41: resolution never fires from a window-focus event', () => {
  it('a resolved value is not refetched when the window regains focus', async () => {
    const resolveAddress = vi.fn(
      async (): Promise<ResolutionResult<ResolvedName>> => ({ ok: true, value: REVERSE_UNVERIFIED })
    );
    const { Wrapper } = makeWalletWrapper(walletWithCapability(makeCapability({ resolveAddress })));

    const { result } = renderHook(() => useResolveAddress('0xabc'), {
      wrapper: Wrapper,
    });
    await tick(0);
    expect(result.current.status).toBe('resolved');
    expect(resolveAddress).toHaveBeenCalledTimes(1);

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(resolveAddress).toHaveBeenCalledTimes(1); // no ambient refetch
  });
});
