/**
 * Prop / State Contract — the hook's arguments and defaulting.
 *
 * Verifies: INV-26 (single normalization keys gate + cache), INV-27 (empty /
 * whitespace / null / undefined → idle, no attempt), INV-28 (enabled:false →
 * idle), INV-29 (option defaults resolved at the boundary), INV-30 (Provider
 * config merged per-field over DEFAULT_CONFIG).
 */
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResolutionResult, ResolvedAddress, ResolvedName } from '@openzeppelin/ui-types';

import { useWalletState } from '../../WalletStateContext';
import { useNameResolutionContext } from '../NameResolutionContext';
import { createResolutionQueryClient, DEFAULT_CONFIG } from '../resolutionConfig';
import { useResolveAddress } from '../useResolveAddress';
import { useResolveName } from '../useResolveName';
import {
  ALICE,
  BOB,
  makeCapability,
  makeWrapper,
  REVERSE_UNVERIFIED,
  tick,
  walletWithCapability,
} from './helpers';

vi.mock('../../WalletStateContext', () => ({ useWalletState: vi.fn() }));
const mockWalletState = vi.mocked(useWalletState);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('INV-26: one normalization (trim + lowercase) keys both gate and cache', () => {
  it("'  Alice.ETH ' and 'alice.eth' hit the same cache entry (one adapter call)", async () => {
    const resolveName = vi.fn(
      async (): Promise<ResolutionResult<ResolvedAddress>> => ({ ok: true, value: ALICE })
    );
    mockWalletState.mockReturnValue(walletWithCapability(makeCapability({ resolveName })));
    const client = createResolutionQueryClient();

    const first = renderHook(() => useResolveName('alice.eth'), {
      wrapper: makeWrapper({ client }).Wrapper,
    });
    await tick(0);
    expect(first.result.current.status).toBe('resolved');
    expect(resolveName).toHaveBeenCalledTimes(1);

    // Different surrounding whitespace + case → same normalized key → cache hit, no new call.
    const second = renderHook(() => useResolveName('  Alice.ETH '), {
      wrapper: makeWrapper({ client }).Wrapper,
    });
    await tick(0);
    expect(second.result.current).toMatchObject({ status: 'resolved', data: ALICE });
    expect(resolveName).toHaveBeenCalledTimes(1);
  });
});

describe('INV-27: empty-ish input → idle with no attempt', () => {
  it.each([
    ['empty string', ''],
    ['whitespace only', '   '],
    ['null', null],
    ['undefined', undefined],
  ])('%s → idle, adapter never called', async (_label, input) => {
    const resolveName = vi.fn(
      async (): Promise<ResolutionResult<ResolvedAddress>> => ({ ok: true, value: ALICE })
    );
    mockWalletState.mockReturnValue(walletWithCapability(makeCapability({ resolveName })));

    const { result } = renderHook(() => useResolveName(input), { wrapper: makeWrapper().Wrapper });
    await tick(0);

    expect(result.current).toEqual({ status: 'idle' });
    expect(resolveName).not.toHaveBeenCalled();
  });

  it('clearing a populated field returns to idle, discarding the prior resolved display', async () => {
    const resolveName = vi.fn(
      async (): Promise<ResolutionResult<ResolvedAddress>> => ({ ok: true, value: ALICE })
    );
    mockWalletState.mockReturnValue(walletWithCapability(makeCapability({ resolveName })));

    const { result, rerender } = renderHook(({ name }) => useResolveName(name), {
      wrapper: makeWrapper().Wrapper,
      initialProps: { name: 'alice.eth' as string | null },
    });
    await tick(0);
    expect(result.current.status).toBe('resolved');

    rerender({ name: '' });
    expect(result.current).toEqual({ status: 'idle' });
  });
});

describe('INV-28: enabled:false forces idle regardless of input validity', () => {
  it('a fully valid name resolves to nothing while disabled, then resumes when enabled', async () => {
    const resolveName = vi.fn(
      async (): Promise<ResolutionResult<ResolvedAddress>> => ({ ok: true, value: ALICE })
    );
    mockWalletState.mockReturnValue(walletWithCapability(makeCapability({ resolveName })));

    const { result, rerender } = renderHook(
      ({ enabled }) => useResolveName('alice.eth', { enabled }),
      {
        wrapper: makeWrapper().Wrapper,
        initialProps: { enabled: false },
      }
    );
    await tick(0);
    expect(result.current).toEqual({ status: 'idle' });
    expect(resolveName).not.toHaveBeenCalled();

    rerender({ enabled: true });
    await tick(0);
    expect(result.current).toMatchObject({ status: 'resolved', data: ALICE });
    expect(resolveName).toHaveBeenCalledTimes(1);
  });
});

describe('INV-29: option defaults resolved at the hook boundary', () => {
  it('forward hook (no options) debounces the default 300ms exactly', async () => {
    const resolveName = vi.fn(
      async (name: string): Promise<ResolutionResult<ResolvedAddress>> => ({
        ok: true,
        value: name === 'bob.eth' ? BOB : ALICE,
      })
    );
    mockWalletState.mockReturnValue(walletWithCapability(makeCapability({ resolveName })));

    const { result, rerender } = renderHook(({ name }) => useResolveName(name), {
      wrapper: makeWrapper().Wrapper,
      initialProps: { name: 'alice.eth' },
    });
    await tick(0);
    rerender({ name: 'bob.eth' });

    await tick(299);
    expect(result.current.status).toBe('debouncing'); // still within the default window
    await tick(1);
    expect(result.current).toMatchObject({ status: 'resolved', name: 'bob.eth', data: BOB });
  });

  it('reverse hook (no options) uses debounce 0 — resolves without a debounce window', async () => {
    const resolveAddress = vi.fn(
      async (): Promise<ResolutionResult<ResolvedName>> => ({ ok: true, value: REVERSE_UNVERIFIED })
    );
    mockWalletState.mockReturnValue(walletWithCapability(makeCapability({ resolveAddress })));

    const { result } = renderHook(() => useResolveAddress('0xabc'), {
      wrapper: makeWrapper().Wrapper,
    });
    await tick(0); // no 300ms advance needed
    expect(result.current).toMatchObject({ status: 'resolved', data: REVERSE_UNVERIFIED });
  });
});

describe('INV-30: Provider config merged per-field over DEFAULT_CONFIG', () => {
  it('overriding one field leaves every other at its default', () => {
    mockWalletState.mockReturnValue(walletWithCapability(makeCapability()));
    const { Wrapper } = makeWrapper({ config: { staleTimeMs: 120_000 } });

    const { result } = renderHook(() => useNameResolutionContext(), { wrapper: Wrapper });

    expect(result.current.config).toEqual({
      ...DEFAULT_CONFIG,
      staleTimeMs: 120_000,
    });
  });
});
