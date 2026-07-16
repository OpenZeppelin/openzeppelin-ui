/**
 * SF-4 · runtime-options types — locked field name, additive CreateRuntimeOptions, readonly guards.
 *
 * Verifies: INV-205, INV-209, INV-211, INV-215.
 */
import { readFileSync } from 'fs';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { CreateRuntimeOptions, NameResolutionRuntimeOptions } from '../runtime-options';

const RUNTIME_OPTIONS_SOURCE = readFileSync(
  new URL('../runtime-options.ts', import.meta.url),
  'utf-8'
);

describe('INV-205: locked field name enableMainnetL1MissFallback on NameResolutionRuntimeOptions', () => {
  it('pins keyof NameResolutionRuntimeOptions to the single locked boolean', () => {
    expectTypeOf<
      keyof NameResolutionRuntimeOptions
    >().toEqualTypeOf<'enableMainnetL1MissFallback'>();
    expect(true).toBe(true);
  });

  it('declares enableMainnetL1MissFallback in source — no UIKit aliases', () => {
    expect(RUNTIME_OPTIONS_SOURCE).toMatch(/readonly\s+enableMainnetL1MissFallback\?:/);
    const rejectedAliases = [
      'allowCrossNetworkEnsFallback',
      'mainnetL1Fallback',
      'allowCrossNetworkFallback',
    ];
    for (const alias of rejectedAliases) {
      expect(RUNTIME_OPTIONS_SOURCE).not.toMatch(new RegExp(`readonly\\s+${alias}\\??:`));
    }
  });
});

describe('INV-211: single boolean governs both directions — no per-direction flags', () => {
  it('NameResolutionRuntimeOptions has exactly one optional boolean field', () => {
    type Keys = keyof NameResolutionRuntimeOptions;
    const _singleSwitch: Keys = 'enableMainnetL1MissFallback';
    expect(_singleSwitch).toBe('enableMainnetL1MissFallback');
    expect(RUNTIME_OPTIONS_SOURCE).not.toMatch(/enableReverseMainnetL1Fallback/);
    expect(RUNTIME_OPTIONS_SOURCE).not.toMatch(/enableForwardMainnetL1Fallback/);
  });
});

describe('INV-209: CreateRuntimeOptions is additive — uiKit preserved', () => {
  it('accepts legacy uiKit-only call sites at compile time', () => {
    const legacy: CreateRuntimeOptions = { uiKit: 'composer' };
    expectTypeOf(legacy.uiKit).toEqualTypeOf<string | undefined>();
    expect(true).toBe(true);
  });

  it('accepts omitted third argument shape (all fields optional)', () => {
    const empty: CreateRuntimeOptions = {};
    expectTypeOf(empty).toEqualTypeOf<CreateRuntimeOptions>();
    expect(true).toBe(true);
  });
});

describe('INV-215: CreateRuntimeOptions and NameResolutionRuntimeOptions fields are readonly', () => {
  it('rejects assignment to enableMainnetL1MissFallback (compile-time)', () => {
    const opts: NameResolutionRuntimeOptions = {};
    // @ts-expect-error - readonly field must not be assignable
    opts.enableMainnetL1MissFallback = true;
    expect(true).toBe(true);
  });

  it('rejects assignment to CreateRuntimeOptions.nameResolution (compile-time)', () => {
    const runtimeOpts: CreateRuntimeOptions = {};
    // @ts-expect-error - readonly field must not be assignable
    runtimeOpts.nameResolution = { enableMainnetL1MissFallback: true };
    expect(true).toBe(true);
  });
});
