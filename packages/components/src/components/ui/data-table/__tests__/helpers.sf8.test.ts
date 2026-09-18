/**
 * SF-8 · DOM-free selection math — INV-186 … INV-188, INV-193, INV-200, INV-203.
 */
import { describe, expect, it } from 'vitest';

import {
  applicableRowKeys,
  headerSelectionState,
  nextSetFromHeaderAction,
  nextSetWithRowKey,
} from '../selection';

describe('INV-186: applicable keys are unique row identities in first-seen order', () => {
  it('collapses duplicate keys without sorting or reading visual indexes', () => {
    const rows = [{ id: 'b' }, { id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(applicableRowKeys(rows, (row) => row.id)).toEqual(['b', 'a', 'c']);
  });

  it('returns no applicable keys for an empty body window', () => {
    expect(applicableRowKeys([], (row: { id: string }) => row.id)).toEqual([]);
  });
});

describe('INV-187 / INV-203: header state is set intersection, never size equality', () => {
  it.each([
    { selected: [], applicable: [], expected: 'none' },
    { selected: ['off-page'], applicable: ['a', 'b'], expected: 'none' },
    { selected: ['a'], applicable: ['a', 'b'], expected: 'some' },
    { selected: ['a', 'b', 'off-page'], applicable: ['a', 'b'], expected: 'all' },
  ] as const)('returns $expected for selected=$selected applicable=$applicable', (testCase) => {
    expect(headerSelectionState(new Set(testCase.selected), testCase.applicable)).toBe(
      testCase.expected
    );
  });

  it('rejects the equal-sized disjoint-set trap as none', () => {
    expect(headerSelectionState(new Set(['x', 'y']), ['a', 'b'])).toBe('none');
  });
});

describe('INV-188 / INV-200: transitions copy input and preserve unrelated identities', () => {
  it('adds and removes one row key without mutating the controlled input', () => {
    const original = new Set(['off-page', 'a']);
    const added = nextSetWithRowKey(original, 'b', true);
    const removed = nextSetWithRowKey(original, 'a', false);

    expect([...original]).toEqual(['off-page', 'a']);
    expect(added).not.toBe(original);
    expect(added).toEqual(new Set(['off-page', 'a', 'b']));
    expect(removed).not.toBe(original);
    expect(removed).toEqual(new Set(['off-page']));
  });

  it('unions applicable keys from none while preserving off-window keys', () => {
    const original = new Set(['off-page']);
    const next = nextSetFromHeaderAction(original, ['a', 'b'], 'none');
    expect(next).toEqual(new Set(['off-page', 'a', 'b']));
    expect(original).toEqual(new Set(['off-page']));
  });

  it.each(['some', 'all'] as const)(
    'subtracts applicable keys from %s while preserving off-window keys',
    (current) => {
      const original = new Set(['off-page', 'a', 'b']);
      const next = nextSetFromHeaderAction(original, ['a', 'b'], current);
      expect(next).toEqual(new Set(['off-page']));
      expect(original).toEqual(new Set(['off-page', 'a', 'b']));
    }
  );

  it('returns a fresh set for an empty applicable window', () => {
    const original = new Set(['off-page']);
    const next = nextSetFromHeaderAction(original, [], 'none');
    expect(next).not.toBe(original);
    expect(next).toEqual(original);
  });
});
