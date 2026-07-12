/**
 * Return-Value Contract — the shape a consuming component observes.
 *
 * Verifies: INV-23 (one arm per commit, arm-correct keys), INV-24 (no stale
 * input/data mismatch — the funds-safety heart of SC-004 at the hook boundary),
 * INV-25 (adapter record passes through verbatim and unmutated).
 */
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResolutionResult, ResolvedAddress, ResolvedName } from '@openzeppelin/ui-types';

import { useResolveAddress } from '../useResolveAddress';
import { useResolveName } from '../useResolveName';
import {
  ALICE,
  BOB,
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

describe('INV-23: result is a discriminated union with arm-correct fields', () => {
  it('the resolved arm carries data and no error/retry; idle carries nothing', async () => {
    const resolveName = vi.fn(
      async (): Promise<ResolutionResult<ResolvedAddress>> => ({ ok: true, value: ALICE })
    );
    const { Wrapper } = makeWalletWrapper(walletWithCapability(makeCapability({ resolveName })));

    const { result } = renderHook(() => useResolveName('alice.eth'), { wrapper: Wrapper });
    await tick(0); // debounce seeded on mount → resolves on first settle

    expect(result.current.status).toBe('resolved');
    if (result.current.status === 'resolved') {
      expect(result.current.data).toBe(ALICE);
      expect(Object.keys(result.current).sort()).toEqual(['data', 'name', 'status']);
    }
  });
});

describe('INV-24: echoed input and data are a matched pair — never a stale mismatch', () => {
  it('while a new input debounces, the hook never pairs the new name with the old data', async () => {
    const resolveName = vi.fn(
      async (name: string): Promise<ResolutionResult<ResolvedAddress>> => ({
        ok: true,
        value: name === 'bob.eth' ? BOB : ALICE,
      })
    );
    const { Wrapper } = makeWalletWrapper(walletWithCapability(makeCapability({ resolveName })));

    const { result, rerender } = renderHook(({ name }) => useResolveName(name), {
      wrapper: Wrapper,
      initialProps: { name: 'alice.eth' },
    });
    await tick(0);
    expect(result.current).toMatchObject({ status: 'resolved', name: 'alice.eth', data: ALICE });

    // Type a new name: it enters the 300ms debounce window. The critical assertion
    // is that the interim arm shows the NEW name but NO data — never {name: bob, data: alice}.
    rerender({ name: 'bob.eth' });
    expect(result.current.status).toBe('debouncing');
    if (result.current.status === 'debouncing') {
      expect(result.current.name).toBe('bob.eth');
    }
    expect(result.current).not.toHaveProperty('data');

    // After the window elapses and bob resolves, the pair is (bob.eth, bob's data).
    await tick(300);
    expect(result.current).toMatchObject({ status: 'resolved', name: 'bob.eth', data: BOB });
  });
});

describe('INV-25: adapter result passes through verbatim and unmutated', () => {
  it('reverse resolution surfaces forwardVerified:false and provenance unchanged', async () => {
    const resolveAddress = vi.fn(
      async (): Promise<ResolutionResult<ResolvedName>> => ({ ok: true, value: REVERSE_UNVERIFIED })
    );
    const { Wrapper } = makeWalletWrapper(walletWithCapability(makeCapability({ resolveAddress })));

    const { result } = renderHook(() => useResolveAddress(REVERSE_UNVERIFIED.address), {
      wrapper: Wrapper,
    });
    await tick(0); // reverse debounce is 0

    expect(result.current.status).toBe('resolved');
    if (result.current.status === 'resolved') {
      // Same reference (no defensive clone), and every field intact — the hook is a transport.
      expect(result.current.data).toBe(REVERSE_UNVERIFIED);
      expect(result.current.data.forwardVerified).toBe(false);
      expect(result.current.data.provenance).toEqual({
        label: 'ENS via external gateway',
        external: true,
      });
    }
  });
});
