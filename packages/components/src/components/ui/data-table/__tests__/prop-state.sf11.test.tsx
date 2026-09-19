/**
 * SF-11 · Prop / state contract — INV-244, INV-245.
 *
 * Negative arms use `@ts-expect-error` (two-way via typecheck:data-table-tests).
 */
import { render } from '@testing-library/react';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import { DataTable } from '../data-table';
import type {
  DataTableClientPagination,
  DataTableProps,
  DataTableServerPagination,
} from '../types';
import {
  captionTableProps,
  numberedTokenRows,
  TOKEN_ROWS,
  tokenColumns,
  type TokenRow,
} from './sf2-fixtures';

const onPageChange = (): void => undefined;

describe('INV-245: no public window knobs; numbered pager is not a third kind', () => {
  it('rejects siblingCount, client hasNextPage, and a mode key', () => {
    type Forbidden = Extract<
      keyof DataTableProps<TokenRow>,
      'siblingCount' | 'mode' | 'onPageSizeChange'
    >;
    expectTypeOf<Forbidden>().toEqualTypeOf<never>();

    const clientWindowKnob = {
      kind: 'client' as const,
      pageIndex: 0,
      pageSize: 10,
      onPageChange,
      // @ts-expect-error INV-245: siblingCount is kit-internal
      siblingCount: 2,
    } satisfies DataTableClientPagination;
    expect(clientWindowKnob).toBeDefined();

    const clientHasNext = {
      kind: 'client' as const,
      pageIndex: 0,
      pageSize: 10,
      onPageChange,
      // @ts-expect-error INV-245: hasNextPage is server-only
      hasNextPage: true,
    } satisfies DataTableClientPagination;
    expect(clientHasNext).toBeDefined();

    const modeProp = {
      caption: 'T',
      columns: tokenColumns(),
      rows: TOKEN_ROWS,
      getRowKey: (row: TokenRow) => row.id,
      // @ts-expect-error INV-245: no pagination mode enum
      mode: 'cursor',
    } satisfies DataTableProps<TokenRow>;
    expect(modeProp).toBeDefined();
  });

  it('allows optional hasNextPage only on server pagination', () => {
    const server: DataTableServerPagination = {
      kind: 'server',
      pageIndex: 0,
      pageSize: 10,
      onPageChange,
      hasNextPage: false,
    };
    expect(server.hasNextPage).toBe(false);
  });
});

describe('INV-244: hasNextPage is consulted only when total is unknown', () => {
  it('ignores hasNextPage: true on a known last page', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(10),
          pagination: {
            kind: 'server',
            pageIndex: 4,
            pageSize: 10,
            totalCount: 47,
            hasNextPage: true,
            onPageChange: vi.fn(),
          },
        })}
      />
    );
    expect(
      (container.querySelector('[data-slot="data-table-pagination-next"]') as HTMLButtonElement)
        .disabled,
      'INV-244: known last page wins over hasNextPage true'
    ).toBe(true);
  });

  it('leaves Next enabled when unknown total omits hasNextPage, including a full page of rows', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(10),
          pagination: { kind: 'server', pageIndex: 0, pageSize: 10, onPageChange: vi.fn() },
        })}
      />
    );
    expect(
      (container.querySelector('[data-slot="data-table-pagination-next"]') as HTMLButtonElement)
        .disabled,
      'INV-244: omit must not infer end-of-set from rows.length === pageSize'
    ).toBe(false);
  });

  it('disables Next when unknown total sets hasNextPage false', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(10),
          pagination: {
            kind: 'server',
            pageIndex: 0,
            pageSize: 10,
            hasNextPage: false,
            onPageChange: vi.fn(),
          },
        })}
      />
    );
    expect(
      (container.querySelector('[data-slot="data-table-pagination-next"]') as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });
});
