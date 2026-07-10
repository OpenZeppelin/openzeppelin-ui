/**
 * Pure-unit tests for the React-free config module. No component mount required.
 *
 * Verifies: INV-26 (normalized value keys the cache), INV-29 (DEFAULT_CONFIG
 * values), INV-39 (gcTime bound is configurable), INV-40 (network- + namespace-
 * scoped keys), INV-41 (ambient refetch disabled on the owned client), INV-47
 * (transient-error classification, exhaustive), INV-48 (lazy shared singleton).
 */
import { describe, expect, it } from 'vitest';

import type { NameResolutionError } from '@openzeppelin/ui-types';

import {
  buildResolutionKey,
  createResolutionQueryClient,
  DEFAULT_CONFIG,
  getDefaultResolutionQueryClient,
  isTransientError,
  RESOLUTION_KEY_PREFIX,
} from '../resolutionConfig';

describe('buildResolutionKey — network-scoped, namespace-separated (INV-40, INV-26)', () => {
  it('places prefix, namespace, networkId and normalized input in the key tuple', () => {
    expect(buildResolutionKey('name', 'eip155:1', 'alice.eth')).toEqual([
      RESOLUTION_KEY_PREFIX,
      'name',
      'eip155:1',
      'alice.eth',
    ]);
  });

  it('the same name on two networks yields distinct keys (INV-40)', () => {
    const a = buildResolutionKey('name', 'eip155:1', 'alice.eth');
    const b = buildResolutionKey('name', 'eip155:11155111', 'alice.eth');
    expect(a).not.toEqual(b);
  });

  it('forward and reverse never collide even for the same raw string (INV-40)', () => {
    const forward = buildResolutionKey('name', 'eip155:1', '0xabc');
    const reverse = buildResolutionKey('addr', 'eip155:1', '0xabc');
    expect(forward).not.toEqual(reverse);
  });

  it('an empty networkId is a valid (degraded) key segment (INV-49 support)', () => {
    expect(buildResolutionKey('name', '', 'alice.eth')).toEqual([
      RESOLUTION_KEY_PREFIX,
      'name',
      '',
      'alice.eth',
    ]);
  });
});

describe('isTransientError — exhaustive over the SF-1 closed union (INV-47)', () => {
  // Transient: worth retrying.
  it.each<NameResolutionError>([
    { code: 'RESOLUTION_TIMEOUT', elapsedMs: 5000 },
    { code: 'EXTERNAL_GATEWAY_ERROR', detail: 'gateway 502' },
    { code: 'ADAPTER_ERROR', message: 'boom' },
  ])('classifies $code as transient', (error) => {
    expect(isTransientError(error)).toBe(true);
  });

  // Definitive: a stable answer, never retried.
  it.each<NameResolutionError>([
    { code: 'NAME_NOT_FOUND', name: 'nope.eth' },
    { code: 'ADDRESS_NOT_FOUND', address: '0xdead' },
    { code: 'UNSUPPORTED_NAME', name: 'nope', reason: 'bad tld' },
    { code: 'UNSUPPORTED_NETWORK', networkId: 'eip155:1' },
  ])('classifies $code as definitive (not transient)', (error) => {
    expect(isTransientError(error)).toBe(false);
  });

  // Exhaustiveness (INV-47) is additionally compile-enforced: the switch has no
  // `default`, so a new SF-1 error code fails `tsc`. See nameResolution.types.test.ts.
});

describe('DEFAULT_CONFIG — option defaults resolved here (INV-29)', () => {
  it('carries the documented default knobs', () => {
    expect(DEFAULT_CONFIG).toEqual({
      staleTimeMs: 60_000,
      gcTimeMs: 300_000, // INV-39: a concrete, finite GC bound
      forwardDebounceMs: 300,
      reverseDebounceMs: 0,
      transientRetryCount: 2,
    });
  });
});

describe('createResolutionQueryClient — ambient refetch disabled (INV-41)', () => {
  it('disables refetch on window focus and on reconnect at the client level', () => {
    const client = createResolutionQueryClient();
    const defaults = client.getDefaultOptions().queries;
    expect(defaults?.refetchOnWindowFocus).toBe(false);
    expect(defaults?.refetchOnReconnect).toBe(false);
  });
});

describe('getDefaultResolutionQueryClient — lazy shared singleton (INV-48)', () => {
  it('returns the same reference across calls (created exactly once)', () => {
    const first = getDefaultResolutionQueryClient();
    const second = getDefaultResolutionQueryClient();
    expect(first).toBe(second);
  });

  it('the singleton also has ambient refetch disabled (INV-41)', () => {
    const defaults = getDefaultResolutionQueryClient().getDefaultOptions().queries;
    expect(defaults?.refetchOnWindowFocus).toBe(false);
    expect(defaults?.refetchOnReconnect).toBe(false);
  });
});
