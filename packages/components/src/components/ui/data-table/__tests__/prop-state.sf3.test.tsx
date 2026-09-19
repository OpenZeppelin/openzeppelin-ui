/**
 * SF-3 · Prop / state contract — INV-66, INV-67, INV-69, INV-82 (instances).
 *
 * Negative arms use `@ts-expect-error` (two-way: unused directive is TS2578).
 * Package `tsc` excludes `*.test.ts`; two-way check is
 * `pnpm typecheck:data-table-tests` (`tsconfig.data-table-tests.json`).
 */
import { fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { logger } from '@openzeppelin/ui-utils';

import { DataTable } from '../data-table';
import type { DataTableProps, DataTableSortDirection, DataTableSortState } from '../types';
import { getTokenRowKey, TOKEN_ROWS, tokenColumns, type TokenRow } from './sf2-fixtures';

afterEach(() => {
  vi.restoreAllMocks();
});

const columns = tokenColumns();
const getRowKey = getTokenRowKey;

describe('INV-66 / INV-69: additive sort props; direction has no none', () => {
  it('accepts sort, defaultSort, onSortChange, and sort={null}', () => {
    const controlledNull = {
      caption: 'T',
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
      sort: null,
      defaultSort: { columnId: 'amount', direction: 'asc' },
      onSortChange: (_next: DataTableSortState | null) => undefined,
    } satisfies DataTableProps<TokenRow>;
    expect(controlledNull.sort).toBeNull();
    expectTypeOf<DataTableSortDirection>().toEqualTypeOf<'asc' | 'desc'>();
  });

  it('rejects leftover strategy keys including onSort without Change', () => {
    type Forbidden = Extract<
      keyof DataTableProps<TokenRow>,
      'onSort' | 'multiSort' | 'compare' | 'isLoading' | 'sorts'
    >;
    expectTypeOf<Forbidden>().toEqualTypeOf<never>();

    const withOnSort = {
      caption: 'T',
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
      // @ts-expect-error INV-66: onSort is not the callback name
      onSort: () => undefined,
    } satisfies DataTableProps<TokenRow>;
    expect(withOnSort).toBeDefined();
  });

  it('rejects direction none and an array of sorts', () => {
    const none = {
      caption: 'T',
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
      sort: {
        columnId: 'amount',
        // @ts-expect-error INV-69: cleared sort is null, not direction none
        direction: 'none',
      },
    } satisfies DataTableProps<TokenRow>;
    const multi = {
      caption: 'T',
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
      // @ts-expect-error INV-69: v1 is a single sort object
      sort: [{ columnId: 'amount', direction: 'asc' }],
    } satisfies DataTableProps<TokenRow>;
    expect(none).toBeDefined();
    expect(multi).toBeDefined();
  });

  it('ignores defaultSort when sort is passed (controlled)', () => {
    const { container } = render(
      <DataTable
        caption="T"
        columns={columns}
        rows={TOKEN_ROWS}
        getRowKey={getRowKey}
        sort={null}
        defaultSort={{ columnId: 'amount', direction: 'desc' }}
      />
    );
    expect(container.querySelector('[aria-sort]')).toBeNull();
    const first = container.querySelector('[data-slot="data-table-row"] [data-column-id="label"]');
    expect(first?.textContent).toBe('Alpha');
  });

  it('initializes uncontrolled state from defaultSort', () => {
    const { container } = render(
      <DataTable
        caption="T"
        columns={columns}
        rows={TOKEN_ROWS}
        getRowKey={getRowKey}
        defaultSort={{ columnId: 'amount', direction: 'desc' }}
      />
    );
    expect(container.querySelector('[data-column-id="amount"]')?.getAttribute('aria-sort')).toBe(
      'descending'
    );
  });
});

describe('INV-67: invalid effective sort is null for chrome and reorder', () => {
  it('logs once for an unknown column id and does not reorder', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const { container } = render(
      <DataTable
        caption="T"
        columns={columns}
        rows={TOKEN_ROWS}
        getRowKey={getRowKey}
        sort={{ columnId: 'nope', direction: 'asc' }}
      />
    );
    expect(container.querySelector('[aria-sort]')).toBeNull();
    expect(
      container.querySelector('[data-slot="data-table-row"] [data-column-id="label"]')?.textContent
    ).toBe('Alpha');
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        'DataTable',
        'DataTable: sort refers to unknown or unsortable column "nope".'
      );
    });
  });

  it('treats a sortable:false column id in sort as null', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const { container } = render(
      <DataTable
        caption="T"
        columns={columns}
        rows={TOKEN_ROWS}
        getRowKey={getRowKey}
        sort={{ columnId: 'status', direction: 'asc' }}
      />
    );
    expect(container.querySelector('[aria-sort]')).toBeNull();
    await waitFor(() => {
      expect(String(errorSpy.mock.calls[0]?.[1])).toMatch(/unknown or unsortable column "status"/);
    });
  });
});

describe('INV-82: instances do not share uncontrolled sort', () => {
  it('cycles one table without changing the other', () => {
    const { container } = render(
      <>
        <DataTable caption="One" columns={columns} rows={TOKEN_ROWS} getRowKey={getRowKey} />
        <DataTable caption="Two" columns={columns} rows={TOKEN_ROWS} getRowKey={getRowKey} />
      </>
    );
    const tables = container.querySelectorAll('[data-slot="data-table"]');
    const firstAmount = tables[0]?.querySelector(
      '[data-slot="data-table-header-cell"][data-column-id="amount"] button'
    );
    fireEvent.click(firstAmount!);
    expect(tables[0]?.querySelector('[data-column-id="amount"]')?.getAttribute('aria-sort')).toBe(
      'ascending'
    );
    expect(tables[1]?.querySelector('[aria-sort]')).toBeNull();
  });
});
