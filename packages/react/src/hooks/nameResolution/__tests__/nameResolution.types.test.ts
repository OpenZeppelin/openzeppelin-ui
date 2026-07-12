/**
 * Type-level invariant probes. Compile-time assertions enforced by `pnpm
 * typecheck` (`tsc --noEmit`); the runtime `expect`s register the file with
 * Vitest and keep the probe values real (no `declare const`, no uncalled
 * functions — every value here is constructed and asserted).
 *
 * Two-way `@ts-expect-error`: an unused directive is TS2578, so if the union
 * ever loosens (e.g. `data` leaks onto the base arm), these directives go stale
 * and break the typecheck.
 *
 * Verifies (at the type level): INV-23 (illegal field access unrepresentable),
 * INV-25 (data typed as the SF-1 record), INV-34 (retry only on the error arm),
 * INV-32 (options param shape), INV-47 (isTransientError param is the closed
 * union — its exhaustiveness is enforced by the no-`default` switch in source).
 */
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { NameResolutionError, ResolvedAddress, ResolvedName } from '@openzeppelin/ui-types';

import { isTransientError } from '../resolutionConfig';
import type { UseResolveAddressResult, UseResolveNameResult } from '../resolutionState';
import type { UseResolveAddressOptions } from '../useResolveAddress';
import type { UseResolveNameOptions } from '../useResolveName';
import { ALICE, REVERSE_UNVERIFIED } from './helpers';

describe('INV-23: illegal field combinations are unrepresentable', () => {
  it('reading .data / .error / .retry without narrowing is a type error', () => {
    const r: UseResolveNameResult = { status: 'idle' };
    // @ts-expect-error INV-23: `data` is only on the resolved arm
    void r.data;
    // @ts-expect-error INV-23: `error` is only on the error arm
    void r.error;
    // @ts-expect-error INV-34: `retry` is only on the error arm
    void r.retry;
    expect(r.status).toBe('idle');
  });

  it('the reverse result has no debouncing arm', () => {
    // @ts-expect-error INV-23: UseResolveAddressResult omits `debouncing`
    const bad: UseResolveAddressResult = { status: 'debouncing', address: '0x' };
    expect(bad.status).toBe('debouncing');
  });
});

describe('INV-25 / INV-34: narrowed arms carry the correct typed fields', () => {
  it('forward resolved arm data is ResolvedAddress', () => {
    const r: UseResolveNameResult = { status: 'resolved', name: 'alice.eth', data: ALICE };
    if (r.status === 'resolved') {
      expectTypeOf(r.data).toEqualTypeOf<ResolvedAddress>();
    }
    expect(r.status).toBe('resolved');
  });

  it('reverse resolved arm data is ResolvedName', () => {
    const r: UseResolveAddressResult = {
      status: 'resolved',
      address: REVERSE_UNVERIFIED.address,
      data: REVERSE_UNVERIFIED,
    };
    if (r.status === 'resolved') {
      expectTypeOf(r.data).toEqualTypeOf<ResolvedName>();
    }
    expect(r.status).toBe('resolved');
  });

  it('error arm exposes a typed error and a void retry', () => {
    const r: UseResolveNameResult = {
      status: 'error',
      name: 'nope.eth',
      error: { code: 'NAME_NOT_FOUND', name: 'nope.eth' },
      retry: () => undefined,
    };
    if (r.status === 'error') {
      expectTypeOf(r.error).toEqualTypeOf<NameResolutionError>();
      expectTypeOf(r.retry).toEqualTypeOf<() => void>();
    }
    expect(r.status).toBe('error');
  });
});

describe('INV-32 / INV-47: parameter shapes', () => {
  it('both option types expose optional debounceMs / enabled', () => {
    expectTypeOf<UseResolveNameOptions>().toMatchObjectType<{
      debounceMs?: number;
      enabled?: boolean;
    }>();
    expectTypeOf<UseResolveAddressOptions>().toMatchObjectType<{
      debounceMs?: number;
      enabled?: boolean;
    }>();
  });

  it('isTransientError accepts the SF-1 closed error union', () => {
    expectTypeOf(isTransientError).parameter(0).toEqualTypeOf<NameResolutionError>();
    expect(isTransientError({ code: 'RESOLUTION_TIMEOUT', elapsedMs: 1 })).toBe(true);
  });
});
