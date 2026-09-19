/**
 * SF-3 · Pure sort helpers — INV-67, INV-68, INV-70, INV-76, INV-77, INV-79,
 * INV-80, INV-85, INV-91, INV-92, INV-93.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

import {
  applyClientSort,
  compareSortValues,
  isColumnSortable,
  nextSortState,
  resolveEffectiveSort,
} from '../sort';
import type { DataTableColumn, DataTableSortState } from '../types';
import { TOKEN_ROWS, tokenColumns, type TokenRow } from './sf2-fixtures';

const SORT_SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'sort.ts'),
  'utf8'
);

function ids(rows: readonly TokenRow[]): string[] {
  return rows.map((row) => row.id);
}

describe('INV-61: isColumnSortable is true iff sortable === true', () => {
  it('ignores getSortValue when sortable is omitted or false', () => {
    expect(isColumnSortable({ id: 'a', header: 'A', cell: () => null })).toBe(false);
    expect(
      isColumnSortable({
        id: 'a',
        header: 'A',
        cell: () => null,
        sortable: false,
        getSortValue: () => 1,
      })
    ).toBe(false);
    expect(isColumnSortable({ id: 'a', header: 'A', cell: () => null, sortable: true })).toBe(true);
  });
});

describe('INV-70: nextSortState cycle', () => {
  it.each([
    { current: null, columnId: 'amount', expected: { columnId: 'amount', direction: 'asc' } },
    {
      current: { columnId: 'label', direction: 'desc' as const },
      columnId: 'amount',
      expected: { columnId: 'amount', direction: 'asc' },
    },
    {
      current: { columnId: 'amount', direction: 'asc' as const },
      columnId: 'amount',
      expected: { columnId: 'amount', direction: 'desc' },
    },
    {
      current: { columnId: 'amount', direction: 'desc' as const },
      columnId: 'amount',
      expected: null,
    },
  ] satisfies {
    current: DataTableSortState | null;
    columnId: string;
    expected: DataTableSortState | null;
  }[])('maps $current + $columnId', ({ current, columnId, expected }) => {
    expect(nextSortState(current, columnId)).toEqual(expected);
  });

  it('never returns desc as the first state for a new column', () => {
    expect(nextSortState(null, 'x')?.direction).toBe('asc');
    expect(nextSortState({ columnId: 'y', direction: 'desc' }, 'x')?.direction).toBe('asc');
  });
});

describe('INV-67: resolveEffectiveSort fails closed', () => {
  it('returns null for unknown and unsortable ids; first duplicate wins', () => {
    const columns = tokenColumns();
    expect(resolveEffectiveSort(null, columns)).toBeNull();
    expect(resolveEffectiveSort({ columnId: 'nope', direction: 'asc' }, columns)).toBeNull();
    expect(resolveEffectiveSort({ columnId: 'label', direction: 'asc' }, columns)).toBeNull();
    const dup: DataTableColumn<TokenRow>[] = [
      {
        id: 'amount',
        header: 'First',
        sortable: true,
        getSortValue: (row) => row.amount,
        cell: () => '1',
      },
      { id: 'amount', header: 'Second', sortable: false, cell: () => '2' },
    ];
    const sort = { columnId: 'amount', direction: 'asc' as const };
    expect(resolveEffectiveSort(sort, dup)).toEqual(sort);
  });
});

describe('INV-91 / INV-92 / INV-93: compareSortValues', () => {
  it('keeps missing values last in both directions', () => {
    expect(compareSortValues(1, null, 'asc')).toBeLessThan(0);
    expect(compareSortValues(null, 1, 'asc')).toBeGreaterThan(0);
    expect(compareSortValues(1, null, 'desc')).toBeLessThan(0);
    expect(compareSortValues(null, 1, 'desc')).toBeGreaterThan(0);
    expect(compareSortValues(null, undefined, 'asc')).toBe(0);
    expect(compareSortValues(Number.NaN, 1, 'asc')).toBeGreaterThan(0);
    expect(compareSortValues(new Date(Number.NaN), 1, 'desc')).toBeGreaterThan(0);
  });

  it('treats empty string as present, not missing', () => {
    expect(compareSortValues('', null, 'asc')).toBeLessThan(0);
    expect(compareSortValues('', 'a', 'asc')).toBe(''.localeCompare('a'));
  });

  it('orders same-kind values naturally', () => {
    expect(compareSortValues('a', 'b', 'asc')).toBe('a'.localeCompare('b'));
    expect(compareSortValues(1, 2, 'asc')).toBeLessThan(0);
    expect(compareSortValues(2, 1, 'desc')).toBeLessThan(0);
    expect(compareSortValues(9n, 10n, 'asc')).toBeLessThan(0);
    expect(compareSortValues(false, true, 'asc')).toBeLessThan(0);
    expect(compareSortValues(new Date(1), new Date(2), 'asc')).toBeLessThan(0);
  });

  it('orders mixed non-missing kinds by boolean < number < bigint < Date < string and never throws', () => {
    const mixed = [true, 1, 1n, new Date(0), '1'] as const;
    const ranked = [...mixed].sort((a, b) => compareSortValues(a, b, 'asc'));
    expect(ranked).toEqual([true, 1, 1n, new Date(0), '1']);
    const desc = [...mixed].sort((a, b) => compareSortValues(a, b, 'desc'));
    expect(desc).toEqual(['1', new Date(0), 1n, 1, true]);
    expect(() => compareSortValues(true, 'x', 'asc')).not.toThrow();
  });
});

describe('INV-68 / INV-76 / INV-77 / INV-79 / INV-85: applyClientSort', () => {
  it('returns the original rows reference when the client-sort gate fails', () => {
    const rows = [...TOKEN_ROWS];
    const columns = tokenColumns();
    expect(applyClientSort(rows, columns, null)).toBe(rows);
    expect(
      applyClientSort(rows, columns, { columnId: 'label', direction: 'asc' }),
      'INV-68: unsortable id is identity'
    ).toBe(rows);
    const intentOnly = columns.map((column) =>
      column.id === 'amount' ? { ...column, getSortValue: undefined } : column
    );
    expect(
      applyClientSort(rows, intentOnly, { columnId: 'amount', direction: 'asc' }),
      'INV-68: intent-only is identity'
    ).toBe(rows);
  });

  it('copies on the gated path, does not mutate rows, and calls getSortValue once per row', () => {
    const rows = [...TOKEN_ROWS];
    const snapshot = rows.map((row) => row.id);
    const getSortValue = vi.fn((row: TokenRow) => row.amount);
    const columns = tokenColumns().map((column) =>
      column.id === 'amount' ? { ...column, getSortValue } : column
    );
    const sorted = applyClientSort(rows, columns, { columnId: 'amount', direction: 'desc' });
    expect(sorted, 'INV-79: gated path returns a new array').not.toBe(rows);
    expect(ids(sorted)).toEqual(['c', 'b', 'a']);
    expect(ids(rows), 'INV-68: integrator rows are not mutated').toEqual(snapshot);
    expect(getSortValue, 'INV-76: Schwartzian — one getter call per row').toHaveBeenCalledTimes(
      rows.length
    );
  });

  it('keeps original relative order among equal keys in both directions', () => {
    const rows: TokenRow[] = [
      { id: 'a', label: 'A', amount: 5n, status: 'x' },
      { id: 'b', label: 'B', amount: 5n, status: 'y' },
      { id: 'c', label: 'C', amount: 5n, status: 'z' },
    ];
    const columns = tokenColumns();
    expect(ids(applyClientSort(rows, columns, { columnId: 'amount', direction: 'asc' }))).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(ids(applyClientSort(rows, columns, { columnId: 'amount', direction: 'desc' }))).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('places missing amounts last in both directions', () => {
    const rows: TokenRow[] = [
      { id: 'a', label: 'A', amount: 2n, status: 'x' },
      { id: 'm', label: 'M', amount: 0n, status: 'x' },
      { id: 'b', label: 'B', amount: 1n, status: 'x' },
    ];
    const columns = tokenColumns().map((column) =>
      column.id === 'amount'
        ? { ...column, getSortValue: (row: TokenRow) => (row.id === 'm' ? null : row.amount) }
        : column
    );
    expect(ids(applyClientSort(rows, columns, { columnId: 'amount', direction: 'asc' }))).toEqual([
      'b',
      'a',
      'm',
    ]);
    expect(ids(applyClientSort(rows, columns, { columnId: 'amount', direction: 'desc' }))).toEqual([
      'a',
      'b',
      'm',
    ]);
  });

  it('does not retain a previous client-sorted copy when the active column has no getter', () => {
    const rows = [...TOKEN_ROWS];
    const columns = [
      ...tokenColumns(),
      {
        id: 'time',
        header: 'Time',
        sortable: true,
        cell: (row: TokenRow) => row.id,
      },
    ];
    const byAmount = applyClientSort(rows, columns, { columnId: 'amount', direction: 'desc' });
    expect(ids(byAmount)).toEqual(['c', 'b', 'a']);
    expect(
      applyClientSort(rows, columns, { columnId: 'time', direction: 'asc' }),
      'INV-85: intent-only returns the integrator rows reference, not the last sorted copy'
    ).toBe(rows);
  });

  it('propagates a throwing getSortValue (no try/catch in sort.ts)', () => {
    expect(SORT_SOURCE, 'INV-80: sort.ts must not catch getter throws').not.toMatch(/try\s*\{/);
    const columns = tokenColumns().map((column) =>
      column.id === 'amount'
        ? {
            ...column,
            getSortValue: (row: TokenRow) => {
              if (row.id === 'b') {
                throw new Error('getter-bug');
              }
              return row.amount;
            },
          }
        : column
    );
    expect(() =>
      applyClientSort(TOKEN_ROWS, columns, { columnId: 'amount', direction: 'asc' })
    ).toThrow('getter-bug');
  });

  it('sorts 10_000 rows inside the suite timeout', { timeout: 60_000 }, () => {
    const rows = Array.from({ length: 10_000 }, (_, i) => ({
      id: String(i),
      label: 'x',
      amount: BigInt(10_000 - i),
      status: 's',
    }));
    const sorted = applyClientSort(rows, tokenColumns(), { columnId: 'amount', direction: 'asc' });
    expect(sorted[0]?.id).toBe('9999');
    expect(sorted[sorted.length - 1]?.id).toBe('0');
    expect(sorted).not.toBe(rows);
  });
});
