/**
 * Interaction & Transition — the resolution state machine and the interactions
 * that drive it.
 *
 * Verifies: INV-31 (defined transition machine, no off-machine arm), INV-32
 * (forward gates to idle never error; reverse attempts on any non-empty input),
 * INV-33 (identical concurrent inputs share one in-flight request), INV-34
 * (retry only on the error arm, one refetch per call, targets current input).
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResolutionResult, ResolvedAddress, ResolvedName } from '@openzeppelin/ui-types';

import { useWalletState } from '../../WalletStateContext';
import { createResolutionQueryClient } from '../resolutionConfig';
import type { UseResolveAddressResult, UseResolveNameResult } from '../resolutionState';
import { useResolveAddress } from '../useResolveAddress';
import { useResolveName } from '../useResolveName';
import {
  ALICE,
  makeCapability,
  makeWrapper,
  REVERSE_UNVERIFIED,
  tick,
  walletWithCapability,
} from './helpers';

vi.mock('../../WalletStateContext', () => ({ useWalletState: vi.fn() }));
const mockWalletState = vi.mocked(useWalletState);

const LEGAL_STATUSES = ['idle', 'debouncing', 'loading', 'resolved', 'error'];

/** Assert an observed arm carries ONLY the fields legal for its status (INV-31 / INV-23). */
function assertArmShape(r: UseResolveNameResult | UseResolveAddressResult): void {
  const keys = Object.keys(r).sort();
  const inputField = 'name' in r ? 'name' : 'address';
  switch (r.status) {
    case 'idle':
      expect(keys).toEqual(['status']);
      break;
    case 'debouncing':
    case 'loading':
      expect(keys).toEqual([inputField, 'status'].sort());
      break;
    case 'resolved':
      expect(keys).toEqual([inputField, 'data', 'status'].sort());
      break;
    case 'error':
      expect(keys).toEqual([inputField, 'error', 'retry', 'status'].sort());
      break;
  }
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('INV-31: transitions follow the machine; no arm carries a foreign field', () => {
  it('idle → debouncing → resolved → debouncing → idle across a keystroke sequence', async () => {
    const resolveName = vi.fn(
      async (): Promise<ResolutionResult<ResolvedAddress>> => ({ ok: true, value: ALICE })
    );
    mockWalletState.mockReturnValue(walletWithCapability(makeCapability({ resolveName })));

    const seen: string[] = [];
    const { result, rerender } = renderHook(
      ({ name }) => {
        const r = useResolveName(name);
        seen.push(r.status);
        assertArmShape(r); // every committed arm is shape-legal
        return r;
      },
      { wrapper: makeWrapper().Wrapper, initialProps: { name: '' } }
    );

    expect(result.current.status).toBe('idle');
    rerender({ name: 'alice.eth' });
    expect(result.current.status).toBe('debouncing');
    await tick(300);
    expect(result.current.status).toBe('resolved');
    rerender({ name: 'alice2.eth' });
    expect(result.current.status).toBe('debouncing');
    rerender({ name: '' });
    expect(result.current.status).toBe('idle');

    // Every observed status is a member of the legal five.
    for (const s of seen) expect(LEGAL_STATUSES).toContain(s);
  });
});

describe('INV-32: forward gates to idle (never error); reverse attempts on any non-empty input', () => {
  it('forward invalid partial → idle (no adapter call); valid name → resolves', async () => {
    const resolveName = vi.fn(
      async (): Promise<ResolutionResult<ResolvedAddress>> => ({ ok: true, value: ALICE })
    );
    mockWalletState.mockReturnValue(walletWithCapability(makeCapability({ resolveName })));

    const { result, rerender } = renderHook(({ name }) => useResolveName(name), {
      wrapper: makeWrapper().Wrapper,
      initialProps: { name: 'vit' }, // fails the default `.eth` isValidName
    });
    await tick(0);
    expect(result.current.status).toBe('idle');
    expect(resolveName).not.toHaveBeenCalled();

    rerender({ name: 'vitalik.eth' });
    await tick(300);
    expect(result.current.status).toBe('resolved');
    expect(resolveName).toHaveBeenCalledTimes(1);
  });

  it('reverse attempts on a non-empty input and surfaces the adapter negative as error', async () => {
    const resolveAddress = vi.fn(
      async (address: string): Promise<ResolutionResult<ResolvedName>> => ({
        ok: false,
        error: { code: 'ADDRESS_NOT_FOUND', address },
      })
    );
    mockWalletState.mockReturnValue(walletWithCapability(makeCapability({ resolveAddress })));

    const { result } = renderHook(() => useResolveAddress('0x'), {
      wrapper: makeWrapper().Wrapper,
    });
    await tick(0);

    expect(resolveAddress).toHaveBeenCalledWith('0x');
    expect(result.current.status).toBe('error');
    if (result.current.status === 'error') {
      expect(result.current.error.code).toBe('ADDRESS_NOT_FOUND');
    }
  });
});

describe('INV-33: identical concurrent inputs share one in-flight request', () => {
  it('two hooks on the same address under one client trigger exactly one adapter call', async () => {
    const resolveAddress = vi.fn(
      async (): Promise<ResolutionResult<ResolvedName>> => ({ ok: true, value: REVERSE_UNVERIFIED })
    );
    mockWalletState.mockReturnValue(walletWithCapability(makeCapability({ resolveAddress })));
    const client = createResolutionQueryClient();

    const a = renderHook(() => useResolveAddress('0xabc'), {
      wrapper: makeWrapper({ client }).Wrapper,
    });
    const b = renderHook(() => useResolveAddress('0xabc'), {
      wrapper: makeWrapper({ client }).Wrapper,
    });
    await tick(0);

    expect(resolveAddress).toHaveBeenCalledTimes(1);
    expect(a.result.current).toMatchObject({ status: 'resolved', data: REVERSE_UNVERIFIED });
    expect(b.result.current).toMatchObject({ status: 'resolved', data: REVERSE_UNVERIFIED });
  });
});

describe('INV-34: retry exists only on the error arm and triggers one refetch per call', () => {
  it('retry() re-resolves the current input exactly once', async () => {
    let call = 0;
    const resolveName = vi.fn(async (): Promise<ResolutionResult<ResolvedAddress>> => {
      call += 1;
      return call === 1
        ? { ok: false, error: { code: 'RESOLUTION_TIMEOUT', elapsedMs: 3000 } }
        : { ok: true, value: ALICE };
    });
    // transientRetryCount 0 → the first timeout surfaces as error immediately (no auto-retry noise).
    mockWalletState.mockReturnValue(walletWithCapability(makeCapability({ resolveName })));

    const { result } = renderHook(() => useResolveName('alice.eth'), {
      wrapper: makeWrapper({ config: { transientRetryCount: 0 } }).Wrapper,
    });
    await tick(0);
    expect(result.current.status).toBe('error');
    expect(resolveName).toHaveBeenCalledTimes(1);

    // retry is present ONLY on the error arm; calling it fires exactly one more resolution.
    await act(async () => {
      if (result.current.status === 'error') result.current.retry();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(resolveName).toHaveBeenCalledTimes(2);
    expect(result.current).toMatchObject({ status: 'resolved', name: 'alice.eth', data: ALICE });
  });
});
