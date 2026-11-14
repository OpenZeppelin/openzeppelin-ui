/**
 * @vitest-environment node
 *
 * SF-15 · Pure list model — INV-10 (selection order), INV-15 (totality),
 * INV-19 (filter rule), INV-21 (grouping), INV-22 / INV-26 / INV-27
 * (enabled-index navigation), INV-34 (one linear pass).
 * artifacts/005-uikit-requests/sf-15-searchable-multi-select/03-invariants.md
 */
import { describe, expect, it, vi } from 'vitest';

import {
  buildListModel,
  firstEnabledIndex,
  stepEnabledIndex,
  toggleId,
  type ListModelInput,
  type ListOption,
} from '../list-model';
import { seeded } from './helpers';

interface It {
  readonly id: string;
  readonly label: string;
  readonly group?: string;
  readonly off?: boolean;
}

const base = (items: readonly It[], query = ''): ListModelInput<It> => ({
  items,
  query,
  getItemId: (i) => i.id,
  getItemLabel: (i) => i.label,
});

const labels = (flat: readonly ListOption<It>[]): string[] => flat.map((o) => o.label);

/** A flat list whose disabled pattern is given by a string: 'E' enabled, 'D' disabled. */
const flatOf = (pattern: string): ListOption<It>[] =>
  [...pattern].map((c, i) => ({
    item: { id: `${i}`, label: `${c}${i}` },
    id: `${i}`,
    label: `${c}${i}`,
    sourceIndex: i,
    disabled: c === 'D',
  }));

describe('INV-10: toggleId selection-order rule', () => {
  it.each([
    { prev: [], id: 'A', next: ['A'], why: 'select into empty appends' },
    { prev: ['C', 'A'], id: 'B', next: ['C', 'A', 'B'], why: 'select appends at the end' },
    { prev: ['C', 'A', 'B'], id: 'A', next: ['C', 'B'], why: 'deselect removes in place' },
    { prev: ['A'], id: 'A', next: [], why: 'deselect last leaves []' },
    { prev: ['A', 'X', 'A'], id: 'A', next: ['X'], why: 'deselect removes every copy' },
    { prev: ['STALE', 'A'], id: 'B', next: ['STALE', 'A', 'B'], why: 'stale ids kept in place' },
    { prev: ['STALE', 'A'], id: 'A', next: ['STALE'], why: 'stale ids survive a deselect' },
    { prev: ['A'], id: '', next: ['A', ''], why: "'' is an ordinary id" },
  ])('$why', ({ prev, id, next }) => {
    const frozen = Object.freeze([...prev]);
    const result = toggleId(frozen, id);
    expect(result).toEqual(next);
    expect(result).not.toBe(frozen);
    expect(frozen).toEqual(prev);
  });

  it('seeded generated table: new array, append on select, subsequence on deselect, input untouched', () => {
    const rand = seeded(0x5f15);
    const pool = ['A', 'B', 'C', 'D', 'STALE', '', 'x y', '#'];
    for (let run = 0; run < 500; run += 1) {
      const len = Math.floor(rand() * 7);
      const prev = Object.freeze(
        Array.from({ length: len }, () => pool[Math.floor(rand() * pool.length)] as string)
      );
      const snapshot = [...prev];
      const id = pool[Math.floor(rand() * pool.length)] as string;
      const result = toggleId(prev, id);

      expect(result).not.toBe(prev);
      expect([...prev]).toEqual(snapshot);
      if (snapshot.includes(id)) {
        expect(result).toEqual(snapshot.filter((x) => x !== id));
        expect(result).not.toContain(id);
      } else {
        expect(result).toEqual([...snapshot, id]);
        expect(result.filter((x) => x === id)).toHaveLength(1);
      }
    }
  });
});

describe('INV-19: filter rule', () => {
  const items: readonly It[] = [
    { id: '1', label: 'France' },
    { id: '2', label: 'French Guiana' },
    { id: '3', label: 'St. Lucia' },
    { id: '4', label: 'Congo (DRC)' },
    { id: '5', label: 'Back\\slash' },
    { id: '6', label: 'Wild*card [x]' },
    { id: '7', label: 'Spain' },
  ];

  it('empty query keeps every item in source order and never calls filterItem', () => {
    const filterItem = vi.fn(() => false);
    const model = buildListModel({ ...base(items), filterItem });
    expect(model.flat.map((o) => o.id)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    expect(filterItem).not.toHaveBeenCalled();
  });

  it.each([
    { query: 'fr', expected: ['France', 'French Guiana'] },
    { query: 'FR', expected: ['France', 'French Guiana'] },
    { query: ' fr', expected: [] },
    { query: ' ', expected: ['French Guiana', 'St. Lucia', 'Congo (DRC)', 'Wild*card [x]'] },
    { query: '.', expected: ['St. Lucia'] },
    { query: '(', expected: ['Congo (DRC)'] },
    { query: '\\', expected: ['Back\\slash'] },
    { query: '*', expected: ['Wild*card [x]'] },
    { query: '[', expected: ['Wild*card [x]'] },
    { query: 'zzz', expected: [] },
  ])('default match for $query is literal, untrimmed, case-insensitive', ({ query, expected }) => {
    expect(labels(buildListModel(base(items, query)).flat)).toEqual(expected);
  });

  it('a regex-metacharacter query never throws', () => {
    for (const query of ['(', '[', '*', '+?', '\\', '(?<', ')']) {
      expect(() => buildListModel(base(items, query))).not.toThrow();
    }
  });

  it('filterItem receives the query exactly as typed and replaces the default rule', () => {
    const filterItem = vi.fn((item: It, query: string) => item.id === query.trim());
    const model = buildListModel({ ...base(items, '  7 '), filterItem });
    expect(filterItem).toHaveBeenCalledTimes(items.length);
    for (const call of filterItem.mock.calls) expect(call[1]).toBe('  7 ');
    expect(labels(model.flat)).toEqual(['Spain']);
  });

  it('failure: a throwing filterItem propagates its own error (INV-15)', () => {
    const boom = new Error('consumer filter failed');
    expect(() =>
      buildListModel({
        ...base(items, 'a'),
        filterItem: () => {
          throw boom;
        },
      })
    ).toThrow(boom);
  });

  it('seeded property: output ⊆ input, relative order kept, input not mutated, pure', () => {
    const rand = seeded(19);
    const alphabet = 'abAB .(*';
    for (let run = 0; run < 300; run += 1) {
      const n = Math.floor(rand() * 30);
      const list: It[] = Array.from({ length: n }, (_, i) => ({
        id: `${i}`,
        label: Array.from(
          { length: Math.floor(rand() * 6) },
          () => alphabet[Math.floor(rand() * alphabet.length)]
        ).join(''),
      }));
      const frozen = Object.freeze(list.map((x) => Object.freeze({ ...x })));
      const query = Array.from(
        { length: Math.floor(rand() * 3) },
        () => alphabet[Math.floor(rand() * alphabet.length)]
      ).join('');
      const a = buildListModel(base(frozen, query));
      const b = buildListModel(base(frozen, query));
      expect(a).toEqual(b);
      expect(a).not.toBe(b);
      const indices = a.flat.map((o) => o.sourceIndex);
      expect([...indices].sort((x, y) => x - y)).toEqual(indices);
      for (const o of a.flat) {
        expect(frozen[o.sourceIndex]).toBe(o.item);
        expect(o.label.toLowerCase().includes(query.toLowerCase())).toBe(true);
      }
      const dropped = frozen.filter((_, i) => !indices.includes(i));
      for (const d of dropped)
        expect(d.label.toLowerCase().includes(query.toLowerCase())).toBe(false);
    }
  });
});

describe('INV-21: grouping order', () => {
  const items: readonly It[] = [
    { id: 'a1', label: 'A one', group: 'A' },
    { id: 'b1', label: 'B one', group: 'B' },
    { id: 'a2', label: 'A two', group: 'A' },
    { id: 'c1', label: 'C one', group: 'C' },
  ];
  const grouped = (query = ''): ListModelInput<It> => ({
    ...base(items, query),
    getItemGroup: (i) => i.group ?? '',
  });

  it('groups follow first-surviving-item order; items keep source order; flat is groups concatenated', () => {
    const model = buildListModel(grouped());
    expect(model.groups.map((g) => g.key)).toEqual(['A', 'B', 'C']);
    expect(model.groups.map((g) => g.options.map((o) => o.id))).toEqual([
      ['a1', 'a2'],
      ['b1'],
      ['c1'],
    ]);
    expect(model.flat.map((o) => o.id)).toEqual(['a1', 'a2', 'b1', 'c1']);
  });

  it('a group with no surviving items is not produced, and order follows the survivors', () => {
    const model = buildListModel(grouped('two'));
    expect(model.groups.map((g) => g.key)).toEqual(['A']);
    const model2 = buildListModel(grouped('o')); // all contain "o"
    expect(model2.groups.map((g) => g.key)).toEqual(['A', 'B', 'C']);
    const model3 = buildListModel(grouped('b one'));
    expect(model3.groups.map((g) => g.key)).toEqual(['B']);
  });

  it('without getItemGroup there is one ungrouped run, or none when empty', () => {
    expect(buildListModel(base(items)).groups.map((g) => g.key)).toEqual([null]);
    expect(buildListModel(base(items, 'zzz')).groups).toEqual([]);
    expect(buildListModel(base([])).groups).toEqual([]);
  });
});

describe('INV-22 / INV-26 / INV-27: enabled-index navigation', () => {
  it('firstEnabledIndex skips disabled options and is -1 when none is enabled', () => {
    expect(firstEnabledIndex(flatOf('DEDED'))).toBe(1);
    expect(firstEnabledIndex(flatOf('E'))).toBe(0);
    expect(firstEnabledIndex(flatOf('DDD'))).toBe(-1);
    expect(firstEnabledIndex(flatOf(''))).toBe(-1);
  });

  it('down and up wrap at both ends', () => {
    const flat = flatOf('EEE');
    expect(stepEnabledIndex(flat, 0, 1)).toBe(1);
    expect(stepEnabledIndex(flat, 2, 1)).toBe(0);
    expect(stepEnabledIndex(flat, 0, -1)).toBe(2);
    expect(stepEnabledIndex(flat, 1, -1)).toBe(0);
  });

  it('[D, E1, D, E2, D]: steps land only on enabled options and wrap', () => {
    const flat = flatOf('DEDED');
    expect(stepEnabledIndex(flat, 1, 1)).toBe(3);
    expect(stepEnabledIndex(flat, 3, 1)).toBe(1);
    expect(stepEnabledIndex(flat, 1, -1)).toBe(3);
    expect(stepEnabledIndex(flat, 3, -1)).toBe(1);
  });

  it('boundary: a single enabled option stays put; from -1 starts at the first/last slot', () => {
    expect(stepEnabledIndex(flatOf('DED'), 1, 1)).toBe(1);
    expect(stepEnabledIndex(flatOf('DED'), 1, -1)).toBe(1);
    expect(stepEnabledIndex(flatOf('EEE'), -1, 1)).toBe(0);
    expect(stepEnabledIndex(flatOf('EEE'), -1, -1)).toBe(2);
  });

  it('failure: no enabled option (or an empty list) yields -1', () => {
    expect(stepEnabledIndex(flatOf('DDD'), -1, 1)).toBe(-1);
    expect(stepEnabledIndex(flatOf('DDD'), 0, -1)).toBe(-1);
    expect(stepEnabledIndex(flatOf(''), -1, 1)).toBe(-1);
  });

  it('isItemDisabled marks options without removing them', () => {
    const model = buildListModel({
      ...base([
        { id: '1', label: 'on' },
        { id: '2', label: 'off', off: true },
      ]),
      isItemDisabled: (i) => i.off === true,
    });
    expect(model.flat.map((o) => [o.id, o.disabled])).toEqual([
      ['1', false],
      ['2', true],
    ]);
  });
});

describe('INV-15 / INV-34: totality and one linear pass', () => {
  it('ids and labels of any shape build without throwing; DOM-facing sourceIndex is positional', () => {
    const odd: It[] = ['', 'a b', 'q"uote', '#h', 'c:o', '🙂', 'x'.repeat(10_000)].map((s) => ({
      id: s,
      label: s,
    }));
    odd.push({ id: '', label: 'duplicate empty id' });
    const model = buildListModel(base(odd));
    expect(model.flat.map((o) => o.sourceIndex)).toEqual(odd.map((_, i) => i));
  });

  it('at 1,000 items each accessor runs once per item per build', () => {
    const many: It[] = Array.from({ length: 1000 }, (_, i) => ({ id: `${i}`, label: `Item ${i}` }));
    const getItemLabel = vi.fn((i: It) => i.label);
    const getItemId = vi.fn((i: It) => i.id);
    const filterItem = vi.fn((i: It, query: string) => i.label.includes(query));
    buildListModel({ items: many, query: '99', getItemId, getItemLabel, filterItem });
    expect(filterItem).toHaveBeenCalledTimes(1000);
    expect(getItemLabel).toHaveBeenCalledTimes(1000);
    expect(getItemId.mock.calls.length).toBeLessThanOrEqual(1000);
  });
});
