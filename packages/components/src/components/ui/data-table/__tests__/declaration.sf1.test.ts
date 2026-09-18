/**
 * @vitest-environment node
 *
 * SF-1 · Declaration-time behaviour — INV-4, INV-13, INV-16, INV-19.
 */
import { describe, expect, it, vi } from 'vitest';

import type { DataTableColumn } from '../types';

type Row = { id: string; amount: bigint; note?: string };

describe('INV-16: column callbacks are not invoked at declaration time', () => {
  it('does not call cell when a column object is constructed with satisfies', () => {
    const cell = vi.fn((_row: Row) => 'x');
    const column = {
      id: 'note',
      header: 'Note',
      cell,
    } satisfies DataTableColumn<Row>;

    expect(
      cell,
      'INV-16: exporting/constructing columns must not paint cells'
    ).not.toHaveBeenCalled();
    expect(column.id).toBe('note');
  });

  it('does not call getSortValue when a column object is constructed', () => {
    const getSortValue = vi.fn((row: Row) => row.amount);
    const column = {
      id: 'amount',
      header: 'Amount',
      align: 'end',
      cell: (row: Row) => String(row.amount),
      sortable: true,
      getSortValue,
    } satisfies DataTableColumn<Row>;

    expect(
      getSortValue,
      'INV-16: declaration must not extract sort keys for every row'
    ).not.toHaveBeenCalled();
    expect(column.sortable).toBe(true);
  });
});

describe('INV-13: duplicate ids are integrator input, not an SF-1 throw', () => {
  it('allows two column objects with the same id to exist as data', () => {
    const columns: DataTableColumn<Row>[] = [
      { id: 'dup', header: 'A', cell: () => 'a' },
      { id: 'dup', header: 'B', cell: () => 'b' },
    ];
    expect(columns).toHaveLength(2);
    expect(columns[0]?.id).toBe(columns[1]?.id);
  });
});

describe('INV-4: empty cell results are representable on the column contract', () => {
  it('accepts null, undefined, and empty string returns from cell', () => {
    const column: DataTableColumn<Row> = {
      id: 'note',
      header: 'Note',
      cell: (row) => row.note,
    };
    const empty: Row = { id: '1', amount: 0n };
    expect(column.cell(empty)).toBeUndefined();
    expect(column.cell({ ...empty, note: '' })).toBe('');
    const nullish: DataTableColumn<Row> = { id: 'n', header: 'N', cell: () => null };
    expect(nullish.cell(empty)).toBeNull();
  });
});

describe('INV-19: cells are a per-row function, not a prebuilt array', () => {
  it('stores cell as a function value on the column object', () => {
    const column: DataTableColumn<Row> = {
      id: 'id',
      header: 'Id',
      cell: (row) => row.id,
    };
    expect(typeof column.cell, 'INV-19: cell must be (row) => ReactNode').toBe('function');
    expect(column.cell({ id: 'r1', amount: 1n })).toBe('r1');
  });
});
