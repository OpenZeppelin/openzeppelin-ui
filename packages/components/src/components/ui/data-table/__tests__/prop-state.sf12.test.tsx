/**
 * SF-12 · Prop / state contract — INV-305 … INV-311, INV-39*, INV-112*.
 *
 * Negative arms use `@ts-expect-error` (two-way via typecheck:data-table-tests).
 */
import { describe, expect, expectTypeOf, it } from 'vitest';

import { DataTable } from '../data-table';
import type {
  DataTableColumn,
  DataTableLoadStrategy,
  DataTableProps,
  DataTableSortButtonNameInfo,
  DataTableSortDirection,
} from '../types';
import {
  captionTableProps,
  getTokenRowKey,
  TOKEN_ROWS,
  tokenColumns,
  type TokenRow,
} from './sf2-fixtures';

const columns = tokenColumns();
const getRowKey = getTokenRowKey;

const clientPage = {
  kind: 'client' as const,
  pageIndex: 0,
  pageSize: 10,
  onPageChange: () => undefined,
};

const infinite = {
  hasMore: true,
  onLoadMore: () => undefined,
};

describe('INV-305 / INV-112*: typed both-present is not DataTableProps', () => {
  it('rejects defined pagination ∩ infiniteScroll on an object literal', () => {
    const both = {
      caption: 'T',
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
      pagination: clientPage,
      infiniteScroll: infinite,
      // @ts-expect-error INV-305: typed XOR forbids both defined strategies
    } satisfies DataTableProps<TokenRow>;
    expect(both).toBeDefined();
  });

  it('rejects both-present on captionTableProps extras (fixture stays XOR)', () => {
    const extras = captionTableProps({
      pagination: clientPage,
      // @ts-expect-error INV-307: fixture extras are DataTableLoadStrategy
      infiniteScroll: infinite,
    });
    expect(extras).toBeDefined();
  });
});

describe('INV-306: page-only, infinite-only, and neither are assignable', () => {
  it('accepts each legal load arm including explicit undefined on the other key', () => {
    const neither = {
      caption: 'T',
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
    } satisfies DataTableProps<TokenRow>;
    const pageOnly = {
      caption: 'T',
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
      pagination: clientPage,
    } satisfies DataTableProps<TokenRow>;
    const infiniteOnly = {
      caption: 'T',
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
      infiniteScroll: infinite,
    } satisfies DataTableProps<TokenRow>;
    const pageUndefinedInfinite = {
      caption: 'T',
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
      pagination: clientPage,
      infiniteScroll: undefined,
    } satisfies DataTableProps<TokenRow>;
    const infiniteUndefinedPage = {
      caption: 'T',
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
      infiniteScroll: infinite,
      pagination: undefined,
    } satisfies DataTableProps<TokenRow>;
    expect(neither.caption).toBe('T');
    expect(pageOnly.pagination.kind).toBe('client');
    expect(infiniteOnly.infiniteScroll.hasMore).toBe(true);
    expect(pageUndefinedInfinite.infiniteScroll).toBeUndefined();
    expect(infiniteUndefinedPage.pagination).toBeUndefined();
    const neitherArm: DataTableLoadStrategy = {};
    const pageArm: DataTableLoadStrategy = { pagination: clientPage };
    const infiniteArm: DataTableLoadStrategy = { infiniteScroll: infinite };
    expect(neitherArm).toEqual({});
    expect(pageArm.pagination).toBeDefined();
    expect(infiniteArm.infiniteScroll).toBeDefined();
  });
});

describe('INV-307: DataTable stays typed on exclusive DataTableProps', () => {
  it('keeps Parameters<typeof DataTable>[0] on DataTableProps', () => {
    expectTypeOf<Parameters<typeof DataTable>[0]>().toEqualTypeOf<DataTableProps<unknown>>();
  });
});

describe('INV-308: keyof still exposes both load keys; aliases stay forbidden', () => {
  it('keeps pagination and infiniteScroll on keyof DataTableProps', () => {
    type LoadKeys = Extract<keyof DataTableProps<TokenRow>, 'pagination' | 'infiniteScroll'>;
    expectTypeOf<LoadKeys>().toEqualTypeOf<'pagination' | 'infiniteScroll'>();
  });

  it('still rejects top-level onReachEnd / hasMore / infinite aliases', () => {
    type Forbidden = Extract<keyof DataTableProps<TokenRow>, 'onReachEnd' | 'hasMore' | 'infinite'>;
    expectTypeOf<Forbidden>().toEqualTypeOf<never>();
  });
});

describe('INV-309 / INV-39*: formatter is table-wide info-object, optional', () => {
  it('accepts formatSortButtonName on DataTableProps and pins info keys', () => {
    const withFormatter = {
      caption: 'T',
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
      formatSortButtonName: (info: DataTableSortButtonNameInfo) => info.columnName,
    } satisfies DataTableProps<TokenRow>;
    expect(withFormatter.formatSortButtonName?.({ columnName: 'Amount', direction: 'none' })).toBe(
      'Amount'
    );
    expectTypeOf<DataTableSortButtonNameInfo>().toEqualTypeOf<{
      readonly columnName: string;
      readonly direction: DataTableSortDirection | 'none';
    }>();
  });

  it('rejects a per-column formatter field', () => {
    const column = {
      id: 'amount',
      header: 'Amount',
      cell: () => null,
      sortable: true,
      // @ts-expect-error INV-309: formatter is table-wide, not per column
      formatSortButtonName: () => 'x',
    } satisfies DataTableColumn<TokenRow>;
    expect(column).toBeDefined();
  });
});

describe('INV-310: none is formatter-only; DataTableSortDirection stays asc|desc', () => {
  it('does not add none to DataTableSortDirection', () => {
    expectTypeOf<DataTableSortDirection>().toEqualTypeOf<'asc' | 'desc'>();
    expectTypeOf<DataTableSortButtonNameInfo['direction']>().toEqualTypeOf<
      DataTableSortDirection | 'none'
    >();
  });
});
