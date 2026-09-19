/**
 * @vitest-environment node
 *
 * SF-1 · Async / empty absence — INV-23, INV-24.
 */
import { describe, expect, it } from 'vitest';

import type { DataTableColumn } from '../types';

type Row = { id: string; note?: string };

describe('INV-23: column type has no loading / error / empty-state fields', () => {
  it('rejects emptyCell, isLoading, and error on the column object', () => {
    const withEmptyCell = {
      id: 'note',
      header: 'Note',
      cell: (row: Row) => row.note,
      // @ts-expect-error INV-23: empty presentation is table-level, not a column field
      emptyCell: '—',
    } satisfies DataTableColumn<Row>;

    const withLoading = {
      id: 'note',
      header: 'Note',
      cell: (row: Row) => row.note,
      // @ts-expect-error INV-23: isLoading is not a column field (no kit fetch)
      isLoading: true,
    } satisfies DataTableColumn<Row>;

    const withError = {
      id: 'note',
      header: 'Note',
      cell: (row: Row) => row.note,
      // @ts-expect-error INV-23: error chrome is not a column field
      error: new Error('nope'),
    } satisfies DataTableColumn<Row>;

    expect(withEmptyCell.id).toBe('note');
    expect(withLoading.id).toBe('note');
    expect(withError.id).toBe('note');
  });
});

describe('INV-24: missing values fail closed via empty returns (not a column catch)', () => {
  it('type-checks a cell that returns empty instead of throwing for missing values', () => {
    const column: DataTableColumn<Row> = {
      id: 'note',
      header: 'Note',
      cell: (row) => row.note ?? null,
    };
    expect(column.cell({ id: '1' })).toBeNull();
  });
});
