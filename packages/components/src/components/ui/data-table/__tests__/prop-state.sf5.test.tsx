/**
 * SF-5 · Prop / state contract — INV-99, INV-102, INV-53 pagination diagnostics.
 *
 * Negative arms use `@ts-expect-error` (two-way: unused directive is TS2578).
 * Package `tsc` excludes `*.test.ts`; two-way check is
 * `pnpm typecheck:data-table-tests` (`tsconfig.data-table-tests.json`).
 */
import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { logger } from '@openzeppelin/ui-utils';

import { DataTable } from '../data-table';
import type {
  DataTableClientPagination,
  DataTablePagination,
  DataTableProps,
  DataTableServerPagination,
} from '../types';
import {
  captionTableProps,
  getTokenRowKey,
  numberedTokenRows,
  TOKEN_ROWS,
  tokenColumns,
  type TokenRow,
} from './sf2-fixtures';

afterEach(() => {
  vi.restoreAllMocks();
});

const onPageChange = (): void => undefined;

describe('INV-99: pagination is optional, discriminated, and always controlled', () => {
  it('accepts omitted pagination and both kinds', () => {
    const omitted = {
      caption: 'T',
      columns: tokenColumns(),
      rows: TOKEN_ROWS,
      getRowKey: getTokenRowKey,
    } satisfies DataTableProps<TokenRow>;
    const client = {
      kind: 'client',
      pageIndex: 0,
      pageSize: 10,
      onPageChange,
    } satisfies DataTableClientPagination;
    const server = {
      kind: 'server',
      pageIndex: 0,
      pageSize: 10,
      totalCount: 100,
      onPageChange,
    } satisfies DataTableServerPagination;
    expect('pagination' in omitted).toBe(false);
    expect(client.kind).toBe('client');
    expect(server.kind).toBe('server');
    expectTypeOf<DataTablePagination>().toEqualTypeOf<
      DataTableClientPagination | DataTableServerPagination
    >();
  });

  it('rejects leftover strategy keys on DataTableProps', () => {
    type Forbidden = Extract<
      keyof DataTableProps<TokenRow>,
      'page' | 'pageSize' | 'onPageChange' | 'isLoading' | 'onPageSizeChange' | 'mode'
    >;
    expectTypeOf<Forbidden>().toEqualTypeOf<never>();

    const topLevelPage = {
      caption: 'T',
      columns: tokenColumns(),
      rows: TOKEN_ROWS,
      getRowKey: getTokenRowKey,
      // @ts-expect-error INV-99: page lives under pagination
      page: 0,
    } satisfies DataTableProps<TokenRow>;
    expect(topLevelPage).toBeDefined();
  });

  it('allows omitting totalCount on server and does not require it on client', () => {
    const clientWithTotal = {
      kind: 'client' as const,
      pageIndex: 0,
      pageSize: 10,
      onPageChange,
      // @ts-expect-error INV-99: client total is rows.length
      totalCount: 100,
    } satisfies DataTableClientPagination;
    expect(clientWithTotal).toBeDefined();

    const serverOmitsTotal = {
      kind: 'server' as const,
      pageIndex: 0,
      pageSize: 10,
      onPageChange,
    } satisfies DataTableServerPagination;
    expect(serverOmitsTotal).toBeDefined();
    expect('totalCount' in serverOmitsTotal).toBe(false);
  });
});

describe('INV-102: server kind never slices and never invents rows', () => {
  it('paints every given row when the page is longer than pageSize', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const rows = numberedTokenRows(15);
    const { container } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={rows}
        getRowKey={getTokenRowKey}
        pagination={{
          kind: 'server',
          pageIndex: 0,
          pageSize: 10,
          totalCount: 15,
          onPageChange: vi.fn(),
        }}
      />
    );
    expect(
      container.querySelectorAll('[data-slot="data-table-row"]').length,
      'INV-102: extra server rows are not trimmed'
    ).toBe(15);
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        'DataTable',
        'DataTable: server pagination received 15 rows for pageSize 10.'
      );
    });
  });

  it('treats invalid totalCount as unknown chrome while still painting rows', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const { container } = render(
      <DataTable
        {...captionTableProps({
          pagination: {
            kind: 'server',
            pageIndex: 0,
            pageSize: 10,
            totalCount: -1,
            onPageChange: vi.fn(),
          },
        })}
      />
    );
    expect(container.querySelectorAll('[data-slot="data-table-row"]').length).toBe(
      TOKEN_ROWS.length
    );
    expect(
      container.querySelector('[data-slot="data-table-pagination-status"]')?.textContent,
      'INV-102*: invalid total is unknown copy, not coerced No rows'
    ).toBe('Page 1');
    expect(container.querySelectorAll('[data-slot="data-table-pagination-page"]').length).toBe(0);
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        'DataTable',
        'DataTable: pagination.totalCount is invalid.'
      );
    });
    expect(
      errorSpy.mock.calls.some((call) => String(call[1]).includes('omitted')),
      'INV-256: invalid wins over omitted'
    ).toBe(false);
  });
});

describe('INV-53 / INV-100 / INV-101: pagination diagnostics fire once in dev', () => {
  it('logs invalid pageSize', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    render(
      <DataTable
        {...captionTableProps({
          pagination: { kind: 'client', pageIndex: 0, pageSize: 0, onPageChange: vi.fn() },
        })}
      />
    );
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        'DataTable',
        'DataTable: pagination.pageSize is invalid; using 1.'
      );
    });
  });

  it('logs client out-of-range pageIndex and does not log for empty pageIndex 0', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const empty = render(
      <DataTable
        {...captionTableProps({
          rows: [],
          pagination: { kind: 'client', pageIndex: 0, pageSize: 10, onPageChange: vi.fn() },
        })}
      />
    );
    await waitFor(() => {
      expect(empty.container.querySelector('[data-slot="data-table-empty"]')).not.toBeNull();
    });
    expect(
      errorSpy.mock.calls.some((call) => String(call[1]).includes('out of range')),
      'INV-101: empty dataset page 0 is not OOR'
    ).toBe(false);
    empty.unmount();
    errorSpy.mockClear();

    render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(3),
          pagination: { kind: 'client', pageIndex: 1, pageSize: 10, onPageChange: vi.fn() },
        })}
      />
    );
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        'DataTable',
        'DataTable: pagination.pageIndex 1 is out of range for pageCount 1.'
      );
    });
  });

  it('logs once when formatStatus returns an empty string', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    render(
      <DataTable
        {...captionTableProps({
          pagination: {
            kind: 'client',
            pageIndex: 0,
            pageSize: 10,
            onPageChange: vi.fn(),
            formatStatus: () => '',
          },
        })}
      />
    );
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        'DataTable',
        'DataTable: pagination.formatStatus returned an empty string.'
      );
    });
  });
});
