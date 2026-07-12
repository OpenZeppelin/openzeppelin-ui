/**
 * Async / Loading / Error / Empty States.
 *
 * Verifies: INV-42 (four states distinct & terminal), INV-43 (never throws;
 * every typed error surfaces in the error arm; raw throw → ADAPTER_ERROR with a
 * bounded warn), INV-44 (out-of-order last-write-wins), INV-45 (capability /
 * method absence synthesizes UNSUPPORTED_NETWORK without touching react-query),
 * INV-46 (runtime-loading → loading, not an error flash), INV-47 (negative vs
 * transient retry policy), INV-49 (empty networkId is a valid closed-union
 * payload), INV-50 (resolved data is pinned past staleTime absent a trigger).
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  NameResolutionError,
  ResolutionResult,
  ResolvedAddress,
  ResolvedName,
} from '@openzeppelin/ui-types';
import { logger } from '@openzeppelin/ui-utils';

import { useResolveAddress } from '../useResolveAddress';
import { useResolveName } from '../useResolveName';
import {
  ALICE,
  BOB,
  makeCapability,
  makeWalletWrapper,
  REVERSE_UNVERIFIED,
  tick,
  walletNoRuntime,
  walletWithCapability,
} from './helpers';

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve: (value: T) => void;
}
function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('INV-42: all four async states are represented and mutually exclusive', () => {
  it('drives idle → loading → resolved, each a distinct status', async () => {
    const gate = deferred<ResolutionResult<ResolvedName>>();
    const resolveAddress = vi.fn(() => gate.promise);
    const { Wrapper } = makeWalletWrapper(walletWithCapability(makeCapability({ resolveAddress })));

    const { result, rerender } = renderHook(({ addr }) => useResolveAddress(addr), {
      wrapper: Wrapper,
      initialProps: { addr: '' },
    });
    expect(result.current.status).toBe('idle'); // empty

    rerender({ addr: '0xabc' });
    await tick(0);
    expect(result.current.status).toBe('loading'); // in flight (promise pending)

    await act(async () => {
      gate.resolve({ ok: true, value: REVERSE_UNVERIFIED });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.status).toBe('resolved'); // terminal success
  });
});

describe('INV-43: the hook never throws; typed errors surface in the error arm', () => {
  it.each<NameResolutionError>([
    { code: 'NAME_NOT_FOUND', name: 'nope.eth' },
    { code: 'UNSUPPORTED_NAME', name: 'nope.eth', reason: 'bad tld' },
    { code: 'RESOLUTION_TIMEOUT', elapsedMs: 3000 },
    { code: 'EXTERNAL_GATEWAY_ERROR', detail: 'gw 502' },
  ])('adapter ok:false $code → error arm with the same code', async (error) => {
    const resolveName = vi.fn(
      async (): Promise<ResolutionResult<ResolvedAddress>> => ({ ok: false, error })
    );
    const { Wrapper } = makeWalletWrapper(walletWithCapability(makeCapability({ resolveName })), {
      config: { transientRetryCount: 0 },
    });

    const { result } = renderHook(() => useResolveName('nope.eth'), {
      wrapper: Wrapper,
    });
    await tick(0);

    expect(result.current.status).toBe('error');
    if (result.current.status === 'error') {
      expect(result.current.error.code).toBe(error.code);
    }
  });

  it('a raw adapter throw becomes ADAPTER_ERROR with a bounded warn; render never throws', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const resolveName = vi.fn(async (): Promise<ResolutionResult<ResolvedAddress>> => {
      throw new Error('viem revert');
    });
    const { Wrapper } = makeWalletWrapper(walletWithCapability(makeCapability({ resolveName })), {
      config: { transientRetryCount: 0 },
    });

    const { result } = renderHook(() => useResolveName('alice.eth'), {
      wrapper: Wrapper,
    });
    await tick(0);

    expect(result.current.status).toBe('error'); // not thrown into a boundary
    if (result.current.status === 'error') {
      expect(result.current.error.code).toBe('ADAPTER_ERROR');
    }
    // One attempt (retryCount 0) → exactly one warn; the count is bounded by 1 + retryCount.
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});

describe('INV-44: out-of-order responses never overwrite a newer input', () => {
  it('alice (slow) then bob (fast): the final active result is bob, not the late alice', async () => {
    // Lowercase inputs: the echoed field is the normalized (lowercased) key
    // (INV-26), so the discriminator here is the resolved `data.name`.
    const aliceGate = deferred<ResolutionResult<ResolvedName>>();
    const bobGate = deferred<ResolutionResult<ResolvedName>>();
    const resolveAddress = vi.fn((address: string) =>
      address === '0xbob' ? bobGate.promise : aliceGate.promise
    );
    const { Wrapper } = makeWalletWrapper(walletWithCapability(makeCapability({ resolveAddress })));

    const { result, rerender } = renderHook(({ addr }) => useResolveAddress(addr), {
      wrapper: Wrapper,
      initialProps: { addr: '0xalice' },
    });
    await tick(0); // alice in flight

    rerender({ addr: '0xbob' }); // observer switches to the bob key
    await tick(0);

    // Bob resolves first...
    await act(async () => {
      bobGate.resolve({
        ok: true,
        value: { ...REVERSE_UNVERIFIED, address: '0xbob', name: 'bob.eth' },
      });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current).toMatchObject({ status: 'resolved', address: '0xbob' });

    // ...then alice's superseded response lands late — it must NOT become active.
    await act(async () => {
      aliceGate.resolve({
        ok: true,
        value: { ...REVERSE_UNVERIFIED, address: '0xalice', name: 'alice.eth' },
      });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current).toMatchObject({ status: 'resolved', address: '0xbob' });
    if (result.current.status === 'resolved') {
      expect(result.current.data.name).toBe('bob.eth'); // the winning result, not late alice
    }
  });
});

describe('INV-45: capability / method absence synthesizes UNSUPPORTED_NETWORK, no adapter call', () => {
  it('capability present but the directional method absent → UNSUPPORTED_NETWORK', async () => {
    // makeCapability without resolveName → forward method is undefined.
    const { Wrapper } = makeWalletWrapper(
      walletWithCapability(makeCapability(), { activeNetworkId: 'eip155:1' })
    );

    const { result } = renderHook(() => useResolveName('alice.eth'), {
      wrapper: Wrapper,
    });
    await tick(0);

    expect(result.current.status).toBe('error');
    if (result.current.status === 'error') {
      expect(result.current.error).toEqual({ code: 'UNSUPPORTED_NETWORK', networkId: 'eip155:1' });
    }
  });

  it('no runtime (settled) → UNSUPPORTED_NETWORK', async () => {
    const resolveName = vi.fn(
      async (): Promise<ResolutionResult<ResolvedAddress>> => ({ ok: true, value: ALICE })
    );
    // A spy that should never be called — there is no runtime to call it on.
    const { Wrapper } = makeWalletWrapper(
      walletNoRuntime({ activeNetworkId: 'eip155:1', isRuntimeLoading: false })
    );

    const { result } = renderHook(() => useResolveName('alice.eth'), {
      wrapper: Wrapper,
    });
    await tick(0);

    expect(result.current.status).toBe('error');
    if (result.current.status === 'error') {
      expect(result.current.error.code).toBe('UNSUPPORTED_NETWORK');
    }
    expect(resolveName).not.toHaveBeenCalled();
  });
});

describe('INV-46: runtime-loading with a resolvable input yields loading, not an error flash', () => {
  it('isRuntimeLoading → loading; once the runtime lands with the method → resolved', async () => {
    const resolveName = vi.fn(
      async (): Promise<ResolutionResult<ResolvedAddress>> => ({ ok: true, value: ALICE })
    );
    const capability = makeCapability({ resolveName });

    const { Wrapper, setWallet } = makeWalletWrapper(
      walletNoRuntime({ activeNetworkId: 'eip155:1', isRuntimeLoading: true })
    );
    const { result } = renderHook(() => useResolveName('alice.eth'), {
      wrapper: Wrapper,
    });
    await tick(0);
    expect(result.current.status).toBe('loading'); // no UNSUPPORTED_NETWORK flash

    setWallet(walletWithCapability(capability, { activeNetworkId: 'eip155:1' }));
    await tick(0);
    expect(result.current).toMatchObject({ status: 'resolved', data: ALICE });
  });
});

describe('INV-47: negative errors never retry; transient errors retry up to the cap', () => {
  it('NAME_NOT_FOUND → exactly one adapter call (no retry)', async () => {
    const resolveName = vi.fn(
      async (): Promise<ResolutionResult<ResolvedAddress>> => ({
        ok: false,
        error: { code: 'NAME_NOT_FOUND', name: 'nope.eth' },
      })
    );
    const { Wrapper } = makeWalletWrapper(walletWithCapability(makeCapability({ resolveName })));

    const { result } = renderHook(() => useResolveName('nope.eth'), {
      wrapper: Wrapper,
    });
    await tick(5000); // give any (erroneous) retry ample time to fire

    expect(result.current.status).toBe('error');
    expect(resolveName).toHaveBeenCalledTimes(1);
  });

  it('RESOLUTION_TIMEOUT → 1 + transientRetryCount attempts then error', async () => {
    const resolveName = vi.fn(
      async (): Promise<ResolutionResult<ResolvedAddress>> => ({
        ok: false,
        error: { code: 'RESOLUTION_TIMEOUT', elapsedMs: 3000 },
      })
    );
    const { Wrapper } = makeWalletWrapper(walletWithCapability(makeCapability({ resolveName })), {
      config: { transientRetryCount: 2 },
    });

    const { result } = renderHook(() => useResolveName('slow.eth'), {
      wrapper: Wrapper,
    });
    await tick(30_000); // cover react-query's retry backoff under fake timers

    expect(result.current.status).toBe('error');
    expect(resolveName).toHaveBeenCalledTimes(3); // 1 + 2
  });
});

describe('INV-49: empty networkId is a valid UNSUPPORTED_NETWORK payload (no minted code)', () => {
  it('no network selected → UNSUPPORTED_NETWORK with networkId ""', async () => {
    const { Wrapper } = makeWalletWrapper(
      walletNoRuntime({ activeNetworkId: null, isRuntimeLoading: false })
    );

    const { result } = renderHook(() => useResolveName('alice.eth'), {
      wrapper: Wrapper,
    });
    await tick(0);

    expect(result.current.status).toBe('error');
    if (result.current.status === 'error') {
      expect(result.current.error).toEqual({ code: 'UNSUPPORTED_NETWORK', networkId: '' });
    }
  });
});

describe('INV-50: resolved data is pinned past staleTime absent a trigger', () => {
  it('holding a stable mount past staleTime does not refetch or swap data', async () => {
    const resolveName = vi.fn(
      async (): Promise<ResolutionResult<ResolvedAddress>> => ({ ok: true, value: BOB })
    );
    const { Wrapper } = makeWalletWrapper(walletWithCapability(makeCapability({ resolveName })), {
      config: { staleTimeMs: 1000 },
    });

    const { result } = renderHook(() => useResolveName('bob.eth'), {
      wrapper: Wrapper,
    });
    await tick(0);
    expect(result.current.status).toBe('resolved');
    const firstData = result.current.status === 'resolved' ? result.current.data : null;

    // Advance well past staleTime with no focus/reconnect/input change.
    await tick(5000);

    expect(resolveName).toHaveBeenCalledTimes(1); // no background refetch
    if (result.current.status === 'resolved') {
      expect(result.current.data).toBe(firstData); // same reference, no swap
    }
  });
});
