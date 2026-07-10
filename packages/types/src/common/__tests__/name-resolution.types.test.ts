/**
 * Type-level invariant probes for the SF-1 name-resolution value types
 * (`ResolutionProvenance`, `ResolvedName`, `ResolvedAddress`, `ResolutionResult<T>`,
 * `NameResolutionError`).
 *
 * These are **compile-time** assertions enforced by `pnpm typecheck`
 * (`tsc --noEmit`, which compiles this file via tsconfig `include: ["src/**\/*"]`).
 * The `@ts-expect-error` directives are two-way: an unused `@ts-expect-error` is
 * itself a tsc error (TS2578), so if a regression ever *loosens* one of these
 * invariants — making a rejected access legal — the typecheck breaks and names the
 * exact property that drifted. The `expectTypeOf(...)` assertions fail to compile
 * when the observed type diverges from the asserted one.
 *
 * The runtime `expect`s exist only so Vitest registers the file; the real coverage
 * is the type layer evaluated by tsc. `vitest --typecheck` additionally evaluates
 * the `expectTypeOf` assertions inside the runner.
 *
 * Verifies: INV-1, INV-2, INV-6, INV-7, INV-9, INV-18 (INV-10 covered incidentally).
 */
import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  NameResolutionError,
  ResolutionProvenance,
  ResolutionResult,
  ResolvedAddress,
  ResolvedName,
} from '../../index';

describe('INV-1: ResolutionResult<T> forces narrowing before value access', () => {
  it('exposes the correct arm after narrowing on the ok discriminant', () => {
    const forward = {} as ResolutionResult<ResolvedAddress>;
    if (forward.ok) {
      expectTypeOf(forward.value).toEqualTypeOf<ResolvedAddress>();
    } else {
      expectTypeOf(forward.error).toEqualTypeOf<NameResolutionError>();
    }
    expect(true).toBe(true);
  });

  it('rejects .value / .error access without narrowing on ok (compile-time)', () => {
    const r = {} as ResolutionResult<ResolvedName>;
    // @ts-expect-error - `.value` is inaccessible until `ok` is narrowed to true
    void r.value;
    // @ts-expect-error - `.error` is inaccessible until `ok` is narrowed to false
    void r.error;
    expect(true).toBe(true);
  });
});

describe('INV-2: every value-type field is readonly', () => {
  it('rejects mutation of provenance fields', () => {
    const prov = {} as ResolutionProvenance;
    // @ts-expect-error - label is readonly
    prov.label = 'x';
    // @ts-expect-error - external is readonly
    prov.external = true;
    // @ts-expect-error - scopedToNetworkId is readonly
    prov.scopedToNetworkId = '1';
    expect(true).toBe(true);
  });

  it('rejects mutation of ResolvedName / ResolvedAddress fields', () => {
    const rn = {} as ResolvedName;
    // @ts-expect-error - address is readonly
    rn.address = '0x';
    // @ts-expect-error - name is readonly
    rn.name = 'a.eth';
    // @ts-expect-error - forwardVerified is readonly
    rn.forwardVerified = true;

    const ra = {} as ResolvedAddress;
    // @ts-expect-error - address is readonly
    ra.address = '0x';
    // @ts-expect-error - name is readonly
    ra.name = 'a.eth';
    expect(true).toBe(true);
  });

  it('rejects mutation of the result arms (discriminant and payload)', () => {
    const ok = { ok: true, value: {} as ResolvedAddress } as ResolutionResult<ResolvedAddress>;
    // @ts-expect-error - the ok discriminant is readonly
    ok.ok = false;
    if (ok.ok) {
      // @ts-expect-error - value is readonly
      ok.value = {} as ResolvedAddress;
    }
    expect(true).toBe(true);
  });
});

describe('INV-6: ResolvedName.forwardVerified is a required boolean', () => {
  it('is exactly boolean, never boolean | undefined', () => {
    expectTypeOf<ResolvedName['forwardVerified']>().toEqualTypeOf<boolean>();
    expect(true).toBe(true);
  });

  it('cannot be omitted when constructing a ResolvedName', () => {
    const provenance = {} as ResolutionProvenance;
    // @ts-expect-error - forwardVerified is required, not optional
    const rn: ResolvedName = { address: '0x', name: 'a.eth', provenance };
    void rn;
    expect(true).toBe(true);
  });
});

describe('INV-7: NameResolutionError is a closed union of exactly seven codes', () => {
  it('has exactly the seven documented code literals', () => {
    expectTypeOf<NameResolutionError['code']>().toEqualTypeOf<
      | 'NAME_NOT_FOUND'
      | 'ADDRESS_NOT_FOUND'
      | 'UNSUPPORTED_NETWORK'
      | 'UNSUPPORTED_NAME'
      | 'RESOLUTION_TIMEOUT'
      | 'EXTERNAL_GATEWAY_ERROR'
      | 'ADAPTER_ERROR'
    >();
    expect(true).toBe(true);
  });

  it('is exhaustively narrowable — a never-fallback switch compiles', () => {
    const describeCode = (e: NameResolutionError): string => {
      switch (e.code) {
        case 'NAME_NOT_FOUND':
          return e.name;
        case 'ADDRESS_NOT_FOUND':
          return e.address;
        case 'UNSUPPORTED_NETWORK':
          return e.networkId;
        case 'UNSUPPORTED_NAME':
          return e.reason;
        case 'RESOLUTION_TIMEOUT':
          return String(e.elapsedMs);
        case 'EXTERNAL_GATEWAY_ERROR':
          return e.detail;
        case 'ADAPTER_ERROR':
          return e.message;
        default: {
          // If a code is ever added to the union without a matching case, `e` is not
          // narrowed to `never` here and this assignment fails to compile — pinning
          // caller-side exhaustiveness for every consumer that switches on `code`.
          const _exhaustive: never = e;
          return _exhaustive;
        }
      }
    };
    expect(describeCode({ code: 'RESOLUTION_TIMEOUT', elapsedMs: 5000 })).toBe('5000');
  });

  it('rejects codes outside the closed set', () => {
    const bad = { code: 'CCIP_GATEWAY_SIGNATURE_MISMATCH', detail: 'x' };
    // @ts-expect-error - 'CCIP_GATEWAY_SIGNATURE_MISMATCH' is not a member of the closed union
    const _check: NameResolutionError = bad;
    void _check;
    expect(true).toBe(true);
  });
});

describe('INV-9: each error code carries a distinct payload; narrowing on code narrows the payload', () => {
  it('exposes the matching payload after narrowing on code', () => {
    const e = {} as NameResolutionError;
    if (e.code === 'RESOLUTION_TIMEOUT') {
      expectTypeOf(e.elapsedMs).toEqualTypeOf<number>();
    }
    if (e.code === 'UNSUPPORTED_NAME') {
      expectTypeOf(e.reason).toEqualTypeOf<string>();
    }
    if (e.code === 'ADAPTER_ERROR') {
      // INV-10 adjacency: cause is opaque `unknown`, forcing narrowing downstream.
      expectTypeOf(e.cause).toEqualTypeOf<unknown>();
    }
    expect(true).toBe(true);
  });

  it('rejects payload access that does not belong to the narrowed code', () => {
    const e = {} as NameResolutionError;
    if (e.code === 'NAME_NOT_FOUND') {
      // @ts-expect-error - elapsedMs belongs to RESOLUTION_TIMEOUT, not NAME_NOT_FOUND
      void e.elapsedMs;
    }
    if (e.code === 'RESOLUTION_TIMEOUT') {
      // @ts-expect-error - name belongs to NAME_NOT_FOUND, not RESOLUTION_TIMEOUT
      void e.name;
    }
    expect(true).toBe(true);
  });
});

describe('INV-18: address and name fields are plain string, not ecosystem-branded', () => {
  it('types every address/name field on the success types as string', () => {
    expectTypeOf<ResolvedName['address']>().toEqualTypeOf<string>();
    expectTypeOf<ResolvedName['name']>().toEqualTypeOf<string>();
    expectTypeOf<ResolvedAddress['address']>().toEqualTypeOf<string>();
    expectTypeOf<ResolvedAddress['name']>().toEqualTypeOf<string>();
    expect(true).toBe(true);
  });

  it('types the address/name fields carried on error payloads as string', () => {
    const e = {} as NameResolutionError;
    if (e.code === 'NAME_NOT_FOUND') {
      expectTypeOf(e.name).toEqualTypeOf<string>();
    }
    if (e.code === 'ADDRESS_NOT_FOUND') {
      expectTypeOf(e.address).toEqualTypeOf<string>();
    }
    expect(true).toBe(true);
  });
});

// --- Coverage beyond the explicit Stage-5 ask ---
// The following two blocks pin Critical structural invariants (INV-4, INV-15) that
// an exact-key-set assertion enforces for free: adding ANY field to a value type —
// an ecosystem-specific field (INV-4) or a transport-secret field like `client` /
// `endpoint` (INV-15) — flips the `keyof` union and fails the typecheck. This is the
// type-shape half of both invariants; the source-token denylist (lint) half is a
// separate CI concern (see 05-tests.md § Out of Scope).

describe('INV-4: ResolutionProvenance base shape is exactly three chain-agnostic fields', () => {
  it('exposes exactly label, external, and optional scopedToNetworkId — no more', () => {
    expectTypeOf<keyof ResolutionProvenance>().toEqualTypeOf<
      'label' | 'external' | 'scopedToNetworkId'
    >();
    expectTypeOf<ResolutionProvenance['label']>().toEqualTypeOf<string>();
    expectTypeOf<ResolutionProvenance['external']>().toEqualTypeOf<boolean>();
    expectTypeOf<ResolutionProvenance['scopedToNetworkId']>().toEqualTypeOf<string | undefined>();
    expect(true).toBe(true);
  });
});

describe('INV-15: value types accommodate no transport-level state (exact key sets)', () => {
  it('locks the ResolvedName / ResolvedAddress key sets so no client/endpoint/signer field can be added', () => {
    expectTypeOf<keyof ResolvedName>().toEqualTypeOf<
      'address' | 'name' | 'forwardVerified' | 'avatarUrl' | 'provenance'
    >();
    expectTypeOf<keyof ResolvedAddress>().toEqualTypeOf<'name' | 'address' | 'provenance'>();
    expect(true).toBe(true);
  });
});
