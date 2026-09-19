/**
 * SF-4 · Pure virtualization math — INV-115, INV-117, INV-123, INV-125, INV-128,
 * INV-139, INV-140, INV-144, INV-145, INV-148.
 */
import { describe, expect, it } from 'vitest';

import {
  DATA_TABLE_DEFAULT_ESTIMATE_SIZE,
  DATA_TABLE_DEFAULT_OVERSCAN,
  DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT,
} from '../types';
import {
  ariaRowCount,
  ariaRowIndexForBodyRow,
  findBodyIndexByKey,
  isInvalidVirtualizedMaxHeight,
  resolveVirtualization,
  spacerHeights,
} from '../virtualization';
import { numberedTokenRows } from './sf2-fixtures';

describe('INV-140: frozen default constants', () => {
  it('pins estimateSize 64, overscan 8, maxHeight 384', () => {
    expect(DATA_TABLE_DEFAULT_ESTIMATE_SIZE, 'INV-140 / INV-228: estimateSize pin').toBe(64);
    expect(DATA_TABLE_DEFAULT_OVERSCAN, 'INV-140: overscan pin').toBe(8);
    expect(DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT, 'INV-140: maxHeight pin').toBe(384);
  });
});

describe('INV-115 / INV-122 / INV-123: resolveVirtualization active matrix', () => {
  const cases: Array<{
    virtualized: boolean | Record<string, never> | undefined;
    bodyRowCount: number;
    active: boolean;
  }> = [
    { virtualized: undefined, bodyRowCount: 0, active: false },
    { virtualized: undefined, bodyRowCount: 1, active: false },
    { virtualized: undefined, bodyRowCount: 10, active: false },
    { virtualized: false, bodyRowCount: 0, active: false },
    { virtualized: false, bodyRowCount: 1, active: false },
    { virtualized: false, bodyRowCount: 10, active: false },
    { virtualized: true, bodyRowCount: 0, active: false },
    { virtualized: true, bodyRowCount: 1, active: true },
    { virtualized: true, bodyRowCount: 10, active: true },
    { virtualized: {}, bodyRowCount: 0, active: false },
    { virtualized: {}, bodyRowCount: 1, active: true },
    { virtualized: {}, bodyRowCount: 10, active: true },
  ];

  it.each(cases)(
    'virtualized=$virtualized bodyRowCount=$bodyRowCount → active=$active',
    ({ virtualized, bodyRowCount, active }) => {
      const resolved = resolveVirtualization(virtualized, bodyRowCount);
      expect(resolved.active, 'INV-115: no N-row auto-threshold; empty is inactive').toBe(active);
      if (
        active ||
        virtualized === true ||
        (typeof virtualized === 'object' && virtualized !== null)
      ) {
        expect(resolved.estimateSize).toBe(DATA_TABLE_DEFAULT_ESTIMATE_SIZE);
        expect(resolved.overscan).toBe(DATA_TABLE_DEFAULT_OVERSCAN);
        expect(resolved.maxHeight).toBe(DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT);
      }
    }
  );

  it('treats virtualized={{}} as true with kit defaults (INV-123)', () => {
    expect(resolveVirtualization({}, 3)).toEqual(resolveVirtualization(true, 3));
  });

  it('overrides estimateSize, overscan, and maxHeight independently', () => {
    const estimateSize = (index: number) => index + 1;
    const resolved = resolveVirtualization({ estimateSize, overscan: 2, maxHeight: 200 }, 5);
    expect(resolved.active).toBe(true);
    expect(resolved.estimateSize).toBe(estimateSize);
    expect(resolved.overscan).toBe(2);
    expect(resolved.maxHeight).toBe(200);
  });
});

describe('INV-125: invalid maxHeight fails closed to 384', () => {
  it.each([
    ['-1', -1],
    ['0', 0],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
  ] as const)('%s → default 384 and isInvalidVirtualizedMaxHeight', (_label, value) => {
    expect(isInvalidVirtualizedMaxHeight(value), 'INV-125: guard matches resolve').toBe(true);
    expect(resolveVirtualization({ maxHeight: value }, 10).maxHeight).toBe(
      DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT
    );
    expect(resolveVirtualization({ maxHeight: value }, 10).active).toBe(true);
  });

  it('does not treat omitted maxHeight as invalid', () => {
    expect(isInvalidVirtualizedMaxHeight(undefined)).toBe(false);
    expect(resolveVirtualization(true, 4).maxHeight).toBe(
      DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT
    );
  });

  it('never throws on invalid maxHeight', () => {
    expect(() => resolveVirtualization({ maxHeight: Number.NaN }, 1)).not.toThrow();
  });
});

describe('INV-144 / INV-145: APG index helpers', () => {
  it('counts the header row and not the caption', () => {
    expect(ariaRowCount(0), 'INV-144: empty body still has the header row in the formula').toBe(1);
    expect(ariaRowCount(10)).toBe(11);
    expect(ariaRowCount(200)).toBe(201);
  });

  it('maps body index i to aria-rowindex i+2', () => {
    expect(ariaRowIndexForBodyRow(0)).toBe(2);
    expect(ariaRowIndexForBodyRow(49)).toBe(51);
  });
});

describe('INV-117 / INV-139: spacerHeights', () => {
  it('returns zeros when first or last is missing (zero-length window)', () => {
    expect(
      spacerHeights({
        paddingStart: 40,
        totalSize: 1000,
        firstStart: undefined,
        lastEnd: undefined,
      })
    ).toEqual({ paddingTop: 0, paddingBottom: 0 });
    expect(
      spacerHeights({
        paddingStart: 40,
        totalSize: 1000,
        firstStart: 40,
        lastEnd: undefined,
      })
    ).toEqual({ paddingTop: 0, paddingBottom: 0 });
  });

  it('clamps paddingTop when firstStart is under the chrome paddingStart', () => {
    expect(
      spacerHeights({
        paddingStart: 48,
        totalSize: 1000,
        firstStart: 20,
        lastEnd: 200,
      }),
      'INV-139: firstStart < paddingStart must not go negative'
    ).toEqual({ paddingTop: 0, paddingBottom: 800 });
  });

  it('computes Discussion #476 spacers for a mid-list window', () => {
    expect(
      spacerHeights({
        paddingStart: 40,
        totalSize: 1000,
        firstStart: 200,
        lastEnd: 400,
      })
    ).toEqual({ paddingTop: 160, paddingBottom: 600 });
  });
});

describe('INV-128: findBodyIndexByKey', () => {
  const rows = numberedTokenRows(5);

  it('returns the body index for a known key and null for a miss', () => {
    expect(findBodyIndexByKey(rows, (row) => row.id, 'r3')).toBe(3);
    expect(findBodyIndexByKey(rows, (row) => row.id, 'missing')).toBeNull();
  });

  it('skips holes rather than throwing', () => {
    const sparse: Array<{ id: string } | undefined> = [{ id: 'a' }, undefined, { id: 'c' }];
    expect(findBodyIndexByKey(sparse as { id: string }[], (row) => row.id, 'c')).toBe(2);
  });
});
