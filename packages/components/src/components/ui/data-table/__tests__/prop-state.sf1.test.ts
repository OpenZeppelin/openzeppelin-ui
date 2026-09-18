/**
 * SF-1 · Prop / state contract — INV-3, INV-6, INV-7, INV-8, INV-9, INV-10,
 * INV-11, INV-12, INV-14, INV-18.
 *
 * Negative arms use `@ts-expect-error` (two-way: unused directive is TS2578).
 * Package `tsc` excludes `*.test.ts`; two-way check is run with
 * `tsconfig.tests.json` in this folder (see 05-tests.md Test Notes).
 */
import { describe, expect, expectTypeOf, it } from 'vitest';
import { createElement } from 'react';

import type { DataTableAlign, DataTableColumn, DataTableSortValue } from '../types';

type TokenRow = { id: string; amount: bigint; label: string };

const required = {
  id: 'label',
  header: 'Label',
  cell: (row: TokenRow) => row.label,
} satisfies DataTableColumn<TokenRow>;

describe('INV-6: column identity is required id, never inferred', () => {
  it('requires id on DataTableColumn', () => {
    expectTypeOf<DataTableColumn<TokenRow>>().toHaveProperty('id');
    expectTypeOf(required.id).toEqualTypeOf<string>();
    expect(required.id).toBe('label');
  });

  it('rejects a column that only has header and cell', () => {
    // @ts-expect-error INV-6: id is required; identity is never inferred from header
    const missingId: DataTableColumn<TokenRow> = {
      header: 'Label',
      cell: (row: TokenRow) => row.label,
    };
    expect(missingId).toBeDefined();
  });

  it('rejects accessorKey as a substitute identity', () => {
    const withAccessor = {
      id: 'label',
      header: 'Label',
      cell: (row: TokenRow) => row.label,
      // @ts-expect-error INV-6 / INV-7: accessorKey is not on the v1 column type
      accessorKey: 'label',
    } satisfies DataTableColumn<TokenRow>;
    expect(withAccessor.id).toBe('label');
  });
});

describe('INV-7: required vs optional fields match Design', () => {
  it('accepts the three required fields alone', () => {
    expect(required.header).toBe('Label');
    expect(required.cell({ id: '1', amount: 1n, label: 'x' })).toBe('x');
  });

  it('accepts the documented optional fields', () => {
    const full: DataTableColumn<TokenRow> = {
      id: 'amount',
      header: 'Amount',
      headerLabel: 'Amount',
      align: 'end',
      cell: (row) => String(row.amount),
      sortable: true,
      getSortValue: (row) => row.amount,
      headerClassName: 'w-32',
      cellClassName: 'tabular-nums',
    };
    expect(full.headerClassName).toBe('w-32');
  });
});

describe('INV-8: Row is unconstrained', () => {
  it('type-checks columns against bigint fields and class instances', () => {
    class AmountRow {
      public constructor(
        public readonly id: string,
        public readonly amount: bigint
      ) {}
    }
    const column: DataTableColumn<AmountRow> = {
      id: 'amount',
      header: 'Amount',
      align: 'end',
      cell: (row) => String(row.amount),
      sortable: true,
      getSortValue: (row) => row.amount,
    };
    expect(column.getSortValue?.(new AmountRow('1', 10n))).toBe(10n);
  });

  it('type-checks a display column that never reads a data field', () => {
    const actions: DataTableColumn<TokenRow> = {
      id: 'actions',
      header: 'Actions',
      cell: () => '…',
    };
    expect(actions.cell({ id: '1', amount: 1n, label: 'x' })).toBe('…');
  });
});

describe('INV-9 / INV-18: no kit-owned selection, pin, resize, or table events on the column', () => {
  it('rejects selected / pin / resize / event fields', () => {
    const withSelected = {
      id: 'select',
      header: 'Select',
      cell: () => null,
      // @ts-expect-error INV-9: selected is not a column field
      selected: true,
    } satisfies DataTableColumn<TokenRow>;

    const withPin = {
      id: 'label',
      header: 'Label',
      cell: (row: TokenRow) => row.label,
      // @ts-expect-error INV-9: pin is out of v1
      pinned: 'left',
    } satisfies DataTableColumn<TokenRow>;

    const withOnSort = {
      id: 'label',
      header: 'Label',
      cell: (row: TokenRow) => row.label,
      // @ts-expect-error INV-18: onSort belongs on the table, not the column
      onSort: () => undefined,
    } satisfies DataTableColumn<TokenRow>;

    expect(withSelected.id).toBe('select');
    expect(withPin.id).toBe('label');
    expect(withOnSort.id).toBe('label');
  });
});

describe('INV-10: sortable true without getSortValue is valid', () => {
  it('accepts server/app-owned sort (intent only)', () => {
    const column: DataTableColumn<TokenRow> = {
      id: 'label',
      header: 'Label',
      sortable: true,
      cell: (row) => row.label,
    };
    expect(column.sortable).toBe(true);
    expect(column.getSortValue).toBeUndefined();
  });
});

describe('INV-11: getSortValue without sortable remains well-typed (inert at SF-3)', () => {
  it('accepts a getter when sortable is false or omitted', () => {
    const omitted: DataTableColumn<TokenRow> = {
      id: 'amount',
      header: 'Amount',
      cell: (row) => String(row.amount),
      getSortValue: (row) => row.amount,
    };
    const off: DataTableColumn<TokenRow> = {
      ...omitted,
      sortable: false,
    };
    expect(omitted.sortable).toBeUndefined();
    expect(off.sortable).toBe(false);
  });
});

describe('INV-12: DataTableSortValue is the comparable domain', () => {
  it('accepts string, number, bigint, boolean, Date, null, and undefined', () => {
    const values: DataTableSortValue[] = ['a', 1, 1n, true, new Date(0), null, undefined];
    expect(values).toHaveLength(7);
    expectTypeOf<bigint>().toMatchTypeOf<DataTableSortValue>();
  });

  it('rejects a React element as a sort value', () => {
    const column = {
      id: 'label',
      header: 'Label',
      sortable: true,
      cell: (row: TokenRow) => row.label,
      // @ts-expect-error INV-12: cell's ReactNode is never the sort key
      getSortValue: () => createElement('span'),
    } satisfies DataTableColumn<TokenRow>;
    expect(column.id).toBe('label');
  });
});

describe('INV-3: physical left/right/center are not DataTableAlign', () => {
  it('rejects left, right, and center', () => {
    // @ts-expect-error INV-3: physical left is not representable
    const left: DataTableAlign = 'left';
    // @ts-expect-error INV-3: physical right is not representable
    const right: DataTableAlign = 'right';
    // @ts-expect-error INV-3: center is not in v1
    const center: DataTableAlign = 'center';
    expect(left).toBe('left');
    expect(right).toBe('right');
    expect(center).toBe('center');
  });
});

describe('INV-14: className fields are layout hints, not resize', () => {
  it('rejects numeric width on the column type', () => {
    const withWidth = {
      id: 'select',
      header: 'Select',
      cell: () => null,
      headerClassName: 'w-12',
      // @ts-expect-error INV-14: width is not a resize API
      width: 48,
    } satisfies DataTableColumn<TokenRow>;
    expect(withWidth.headerClassName).toBe('w-12');
  });
});
