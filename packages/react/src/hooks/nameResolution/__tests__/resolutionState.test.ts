/**
 * Pure-unit tests for the React-free react-query → discriminated-union mapping.
 * These pin the arm-selection logic that the behavioral hook tests then exercise
 * end-to-end.
 *
 * Verifies: INV-23 (one arm per commit, arm-correct fields), INV-24 (echoed
 * input is the keyed input, paired with its data), INV-25 (verbatim data
 * passthrough), INV-42 (exhaustive four-state mapping, no undesigned default),
 * INV-43 (typed-error unwrap; non-typed throw → ADAPTER_ERROR, never rethrow).
 */
import { describe, expect, it, vi } from 'vitest';

import type { NameResolutionError, ResolvedAddress } from '@openzeppelin/ui-types';

import {
  mapSettledQuery,
  ResolutionQueryError,
  toNameResolutionError,
  type MappableQueryState,
} from '../resolutionState';
import { ALICE } from './helpers';

const noop = (): void => {};

function queryState<T>(over: Partial<MappableQueryState<T>>): MappableQueryState<T> {
  return { isSuccess: false, isError: false, data: undefined, error: undefined, ...over };
}

describe('mapSettledQuery (INV-23, INV-24, INV-25, INV-42)', () => {
  it('success-with-data → resolved arm echoing the keyed input, data verbatim', () => {
    const result = mapSettledQuery<ResolvedAddress>(
      'alice.eth',
      queryState({ isSuccess: true, data: ALICE }),
      noop
    );
    expect(result.status).toBe('resolved');
    // INV-24: echoed input is the keyed input; INV-25: data is the same reference, unmutated.
    if (result.status === 'resolved') {
      expect(result.input).toBe('alice.eth');
      expect(result.data).toBe(ALICE);
    }
    // INV-23: the resolved arm carries no `error` / `retry`.
    expect(result).not.toHaveProperty('error');
    expect(result).not.toHaveProperty('retry');
  });

  it('isError → error arm with the typed error and a retry (INV-23, INV-42)', () => {
    const retry = vi.fn();
    const error = new ResolutionQueryError({ code: 'NAME_NOT_FOUND', name: 'nope.eth' });
    const result = mapSettledQuery<ResolvedAddress>(
      'nope.eth',
      queryState({ isError: true, error }),
      retry
    );
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.input).toBe('nope.eth');
      expect(result.error).toEqual({ code: 'NAME_NOT_FOUND', name: 'nope.eth' });
      expect(result.retry).toBe(retry);
    }
    // INV-23: the error arm carries no `data`.
    expect(result).not.toHaveProperty('data');
  });

  it('pending (not success, not error) → loading arm (INV-42)', () => {
    const result = mapSettledQuery<ResolvedAddress>('alice.eth', queryState({}), noop);
    expect(result).toEqual({ status: 'loading', input: 'alice.eth' });
  });

  it('success WITHOUT data degrades to loading, never a resolved arm missing its payload (INV-42)', () => {
    const result = mapSettledQuery<ResolvedAddress>(
      'alice.eth',
      queryState({ isSuccess: true, data: undefined }),
      noop
    );
    expect(result).toEqual({ status: 'loading', input: 'alice.eth' });
  });
});

describe('toNameResolutionError — never lets an untyped throw escape (INV-43)', () => {
  it('unwraps a ResolutionQueryError to its typed payload verbatim', () => {
    const typed: NameResolutionError = { code: 'RESOLUTION_TIMEOUT', elapsedMs: 3000 };
    expect(toNameResolutionError(new ResolutionQueryError(typed))).toEqual(typed);
  });

  it('maps a raw Error to ADAPTER_ERROR carrying its message and cause', () => {
    const raw = new Error('viem revert');
    const mapped = toNameResolutionError(raw);
    expect(mapped.code).toBe('ADAPTER_ERROR');
    if (mapped.code === 'ADAPTER_ERROR') {
      expect(mapped.message).toBe('viem revert');
      expect(mapped.cause).toBe(raw);
    }
  });

  it('maps a non-Error throw (string) to ADAPTER_ERROR (INV-43)', () => {
    const mapped = toNameResolutionError('kaboom');
    expect(mapped.code).toBe('ADAPTER_ERROR');
    if (mapped.code === 'ADAPTER_ERROR') {
      expect(mapped.message).toBe('kaboom');
    }
  });
});
