/**
 * Zero-wiring singleton (INV-48).
 *
 * With NO NameResolutionProvider and NO ambient QueryClientProvider mounted, the
 * hooks fall back to the process-global singleton client + DEFAULT_CONFIG and
 * still resolve without throwing, sharing one cache across instances. This file
 * deliberately exercises the global singleton (every other file injects a fresh
 * client via the Provider) — it uses distinct inputs per test so the singleton's
 * persistence across tests can't mask an assertion.
 */
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResolutionResult, ResolvedName } from '@openzeppelin/ui-types';

import { useResolveAddress } from '../useResolveAddress';
import {
  makeCapability,
  makeWalletOnlyWrapper,
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

describe('INV-48: no Provider and no QueryClientProvider required', () => {
  it('a hook with zero wiring resolves without throwing', async () => {
    const resolveAddress = vi.fn(
      async (): Promise<ResolutionResult<ResolvedName>> => ({ ok: true, value: REVERSE_UNVERIFIED })
    );
    const { Wrapper } = makeWalletOnlyWrapper(
      walletWithCapability(makeCapability({ resolveAddress }))
    );

    // No NameResolutionProvider — the explicit-client fallback must not throw "No QueryClient set".
    const { result } = renderHook(() => useResolveAddress('0xnowiring'), { wrapper: Wrapper });
    await tick(0);

    expect(result.current).toMatchObject({ status: 'resolved', data: REVERSE_UNVERIFIED });
  });

  it('two zero-wiring hooks on the same input share one cache (adapter called once)', async () => {
    const resolveAddress = vi.fn(
      async (): Promise<ResolutionResult<ResolvedName>> => ({ ok: true, value: REVERSE_UNVERIFIED })
    );
    const { Wrapper } = makeWalletOnlyWrapper(
      walletWithCapability(makeCapability({ resolveAddress }))
    );

    const a = renderHook(() => useResolveAddress('0xshared-singleton'), { wrapper: Wrapper });
    const b = renderHook(() => useResolveAddress('0xshared-singleton'), { wrapper: Wrapper });
    await tick(0);

    expect(resolveAddress).toHaveBeenCalledTimes(1); // shared global client dedups
    expect(a.result.current.status).toBe('resolved');
    expect(b.result.current.status).toBe('resolved');
  });
});
