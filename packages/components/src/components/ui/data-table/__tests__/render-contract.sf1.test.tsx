/**
 * SF-1 · Render contract (type + composition) — INV-1, INV-2, INV-3, INV-5.
 * SF-1 does not mount a table; these tests freeze the declaration meaning SF-2 paints.
 */
import { describe, expect, it } from 'vitest';
import { isValidElement } from 'react';

import { Badge } from '../../badge';
import { Checkbox } from '../../checkbox';
import type { DataTableAlign, DataTableColumn } from '../../index';

type TokenRow = { id: string; amount: bigint; status: string };

describe('INV-2: cell is integrator composition, not a kit cell-type variant', () => {
  it('accepts a column whose cell returns a kit Badge', () => {
    const column = {
      id: 'status',
      header: 'Status',
      cell: (row: TokenRow) => <Badge label={row.status} />,
    } satisfies DataTableColumn<TokenRow>;

    const node = column.cell({ id: '1', amount: 1n, status: 'Active' });
    expect(isValidElement(node), 'INV-2: cell must return the integrator Badge node').toBe(true);
    if (isValidElement(node)) {
      expect(node.type).toBe(Badge);
      expect(node.props).toMatchObject({ label: 'Active' });
    }
  });

  it('accepts mixed kit nodes without a columnType discriminant', () => {
    const column = {
      id: 'status',
      header: 'Status',
      cell: (row: TokenRow) => (
        <>
          <Badge label={row.status} />
          <span>-</span>
        </>
      ),
    } satisfies DataTableColumn<TokenRow>;

    expect('columnType' in column, 'INV-2: no closed cell-type enum on the column').toBe(false);
    expect(column.cell({ id: '1', amount: 1n, status: 'Active' })).toBeTruthy();
  });
});

describe('INV-5: header is the visible header node (not id)', () => {
  it('accepts a checkbox-only header so Role Manager select-all can live in header', () => {
    const column = {
      id: 'select',
      header: <Checkbox aria-label="Select all" />,
      headerLabel: 'Select',
      headerClassName: 'w-12',
      cell: () => <Checkbox aria-label="Select row" />,
    } satisfies DataTableColumn<TokenRow>;

    expect(column.header).not.toBe(column.id);
    expect(column.headerLabel).toBe('Select');
  });

  it('keeps a string header when sortable is reserved for SF-3', () => {
    const column = {
      id: 'amount',
      header: 'Amount',
      sortable: true,
      cell: (row: TokenRow) => String(row.amount),
    } satisfies DataTableColumn<TokenRow>;

    expect(column.header).toBe('Amount');
    expect(column.header).not.toBe(column.id);
  });
});

describe('INV-3: logical alignment is start | end; default is omit (start at renderer)', () => {
  it('accepts align end for numeric columns', () => {
    const align: DataTableAlign = 'end';
    const column = {
      id: 'amount',
      header: 'Amount',
      align,
      cell: (row: TokenRow) => String(row.amount),
    } satisfies DataTableColumn<TokenRow>;

    expect(column.align).toBe('end');
  });

  it('treats omitted align as valid (renderer default start)', () => {
    const column: DataTableColumn<TokenRow> = {
      id: 'status',
      header: 'Status',
      cell: (row) => row.status,
    };

    expect(column.align).toBeUndefined();
  });
});

describe('INV-1: declaration does not mount table chrome', () => {
  it('leaves the document without a table after constructing columns', () => {
    const columns: DataTableColumn<TokenRow>[] = [
      { id: 'status', header: 'Status', cell: (row) => row.status },
    ];
    expect(columns).toHaveLength(1);
    expect(document.querySelector('table')).toBeNull();
  });
});
