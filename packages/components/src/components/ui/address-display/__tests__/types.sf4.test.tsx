/**
 * SF-4 · Type-level probes — INV-63 (no gating knobs), INV-120 (`resolvedName`
 * prop shape), INV-122 (synchronous resolver contract), SF-1 INV-2
 * consumption (readonly record).
 * artifacts/001-ens-uikit-support/sf-4-address-display/03-invariants.md (Rev 2)
 *
 * NOTE: the package's `tsc --noEmit` excludes *.test.tsx, so the
 * `@ts-expect-error` probes are validated OUT-OF-BAND (see 05-tests.md Test
 * Notes: verified two-way with a test-inclusive tsconfig at the Tests stage).
 * The runtime assertions below keep the positive arms honest under vitest.
 */
import { describe, expect, it } from 'vitest';

import type { AddressNameResolver, ResolvedName } from '@openzeppelin/ui-types';

import { type AddressDisplayProps } from '../address-display';
import { type UseAddressNameResult } from '../use-address-name';
import { verifiedRecord } from './helpers';

describe('INV-63: AddressDisplayProps carries NO enable/debounce/gating knobs', () => {
  it('rejects the Revision-1 wrapper knobs at the type level', () => {
    const withResolutionOptions: AddressDisplayProps = {
      address: '0x1',
      // @ts-expect-error — `resolutionOptions` was a Rev-1 hook-gating knob; it does not exist on the base component
      resolutionOptions: { enabled: false },
    };
    const withDisableNameResolution: AddressDisplayProps = {
      address: '0x1',
      // @ts-expect-error — `disableNameResolution` is not added; zero-config (no prop, no provider) is the opt-out
      disableNameResolution: true,
    };
    // @ts-expect-error — no `enabled` lever exists on the pure value sink
    const withEnabled: AddressDisplayProps = { address: '0x1', enabled: false };

    void withResolutionOptions;
    void withDisableNameResolution;
    void withEnabled;
    expect(true).toBe(true);
  });
});

describe('INV-120: `resolvedName` is an optional, well-typed ResolvedName value', () => {
  it('accepts a ResolvedName record, explicit undefined, and omission; rejects a bare string', () => {
    const withRecord: AddressDisplayProps = { address: '0x1', resolvedName: verifiedRecord() };
    const withUndefined: AddressDisplayProps = { address: '0x1', resolvedName: undefined };
    const omitted: AddressDisplayProps = { address: '0x1' };
    // @ts-expect-error — a bare name string is not a ResolvedName record (no verification field)
    const withString: AddressDisplayProps = { address: '0x1', resolvedName: 'alice.eth' };

    void withString;
    expect(withRecord.resolvedName?.forwardVerified).toBe(true);
    expect(withUndefined.resolvedName).toBeUndefined();
    expect(omitted.resolvedName).toBeUndefined();
  });
});

describe('INV-122: AddressNameResolver.resolveAddressName is SYNCHRONOUS — a Promise-returning resolver is rejected', () => {
  it('accepts a sync resolver; rejects an async one at the type level', () => {
    const sync: AddressNameResolver = {
      resolveAddressName: (): ResolvedName | undefined => undefined,
    };
    const asyncResolver: AddressNameResolver = {
      // @ts-expect-error — Promise<ResolvedName | undefined> violates the synchronous render-time seam
      resolveAddressName: async (): Promise<ResolvedName | undefined> => undefined,
    };

    void asyncResolver;
    expect(sync.resolveAddressName('0x1')).toBeUndefined();
  });

  it('useAddressName surfaces { record: ResolvedName | undefined }', () => {
    const result: UseAddressNameResult = { record: verifiedRecord() };
    const narrowed: ResolvedName | undefined = result.record;
    expect(narrowed?.name).toBe('alice.eth');
  });
});

describe('SF-1 INV-2 (consumed): ResolvedName fields are readonly — SF-4 reads, never mutates', () => {
  it('rejects mutation of a record field at the type level', () => {
    const record = verifiedRecord();
    // @ts-expect-error — `name` is readonly on ResolvedName (SF-1 INV-2)
    record.name = 'mallory.eth';
    expect(typeof record.name).toBe('string');
  });
});
