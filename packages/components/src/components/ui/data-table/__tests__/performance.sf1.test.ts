/**
 * @vitest-environment node
 *
 * SF-1 · Performance / scalability contract — INV-17, INV-19, INV-22.
 * Call-site O(visible) is SF-4; these tests freeze the function-per-row shape.
 */
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ReactNode } from 'react';

import type { DataTableColumn } from '../types';

type Row = { id: string };

describe('INV-17 / INV-19: composition is (row) => ReactNode, not an all-rows array', () => {
  it('types cell as a function of one row', () => {
    expectTypeOf<DataTableColumn<Row>['cell']>().toEqualTypeOf<(row: Row) => ReactNode>();
    const column: DataTableColumn<Row> = { id: 'id', header: 'Id', cell: (row) => row.id };
    expect(column.cell({ id: 'only-mounted' })).toBe('only-mounted');
  });

  it('rejects a prebuilt children cell array on the column type', () => {
    const withChildren = {
      id: 'id',
      header: 'Id',
      cell: (row: Row) => row.id,
      // @ts-expect-error INV-19: no all-rows ReactNode[] field
      children: ['a', 'b'],
    } satisfies DataTableColumn<Row>;
    expect(withChildren.cell({ id: 'x' })).toBe('x');
  });
});

describe('INV-22: id is the stability key; column fields are readonly', () => {
  it('exposes id as string and rejects field mutation at the type level', () => {
    const column: DataTableColumn<Row> = {
      id: 'status',
      header: 'Status',
      cell: (row) => row.id,
    };
    expectTypeOf(column.id).toEqualTypeOf<string>();
    expect(column.id).toBe('status');
    // @ts-expect-error INV-22: column fields are readonly — assignment is a type error, not a runtime throw
    column.id = 'other';
  });
});
