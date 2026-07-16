/**
 * SF-4 · runtimeCreationConfig — unit probes for default OFF posture and strict-enable normalization.
 *
 * Verifies: INV-204, INV-206, INV-207, INV-208, INV-225.
 */
import { describe, expect, it } from 'vitest';

import {
  buildCreateRuntimeOptions,
  DEFAULT_RUNTIME_CREATION_CONFIG,
  isMainnetL1MissFallbackEnabled,
} from '../runtimeCreationConfig';

describe('INV-204: DEFAULT_RUNTIME_CREATION_CONFIG is the empty object', () => {
  it('equals {} with no pre-seeded nameResolution fields', () => {
    expect(DEFAULT_RUNTIME_CREATION_CONFIG).toEqual({});
    expect(DEFAULT_RUNTIME_CREATION_CONFIG).not.toHaveProperty('nameResolution');
  });
});

describe('INV-206 / INV-225: isMainnetL1MissFallbackEnabled strict === true guard', () => {
  const cases: Array<{ label: string; input: unknown; expected: boolean }> = [
    { label: 'undefined', input: undefined, expected: false },
    { label: 'absent field', input: {}, expected: false },
    { label: 'false', input: { enableMainnetL1MissFallback: false }, expected: false },
    { label: 'true', input: { enableMainnetL1MissFallback: true }, expected: true },
    { label: 'string "true"', input: { enableMainnetL1MissFallback: 'true' }, expected: false },
    { label: 'number 1', input: { enableMainnetL1MissFallback: 1 }, expected: false },
    { label: 'null', input: { enableMainnetL1MissFallback: null }, expected: false },
    { label: 'empty string', input: { enableMainnetL1MissFallback: '' }, expected: false },
  ];

  it.each(cases)('$label → $expected', ({ input, expected }) => {
    expect(isMainnetL1MissFallbackEnabled(input as never)).toBe(expected);
  });

  it('does not throw on malformed option bags (INV-225)', () => {
    expect(() =>
      isMainnetL1MissFallbackEnabled({ enableMainnetL1MissFallback: ['yes'] } as never)
    ).not.toThrow();
    expect(isMainnetL1MissFallbackEnabled({ enableMainnetL1MissFallback: ['yes'] } as never)).toBe(
      false
    );
  });
});

describe('INV-207 / INV-208: buildCreateRuntimeOptions threading boundary', () => {
  it('omits nameResolution when opt-in is OFF (unset or false)', () => {
    expect(buildCreateRuntimeOptions(undefined)).toEqual({});
    expect(buildCreateRuntimeOptions({})).toEqual({});
    expect(
      buildCreateRuntimeOptions({ nameResolution: { enableMainnetL1MissFallback: false } })
    ).toEqual({});
    expect(buildCreateRuntimeOptions({ uiKit: 'composer' })).toEqual({ uiKit: 'composer' });
  });

  it('never emits enableMainnetL1MissFallback: false (INV-207)', () => {
    const off = buildCreateRuntimeOptions({
      nameResolution: { enableMainnetL1MissFallback: false },
    });
    expect(off).not.toHaveProperty('nameResolution');
    expect(JSON.stringify(off)).not.toContain('enableMainnetL1MissFallback');
  });

  it('spreads only { enableMainnetL1MissFallback: true } when ON (INV-208)', () => {
    expect(
      buildCreateRuntimeOptions({ nameResolution: { enableMainnetL1MissFallback: true } })
    ).toEqual({ nameResolution: { enableMainnetL1MissFallback: true } });
  });

  it('preserves uiKit and threads opt-in slice independently', () => {
    expect(
      buildCreateRuntimeOptions({
        uiKit: 'operator',
        nameResolution: { enableMainnetL1MissFallback: true },
      })
    ).toEqual({
      uiKit: 'operator',
      nameResolution: { enableMainnetL1MissFallback: true },
    });
  });
});
