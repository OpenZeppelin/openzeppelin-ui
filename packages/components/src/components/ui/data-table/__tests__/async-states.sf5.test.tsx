/**
 * SF-5 · Async / loading / error / empty — INV-111, INV-112, SC-006.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { DataTable } from '../data-table';
import type { DataTableProps } from '../types';
import {
  captionTableProps,
  numberedTokenRows,
  TOKEN_ROWS,
  tokenColumns,
  untypedDataTableProps,
  type TokenRow,
} from './sf2-fixtures';

const SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'data-table.tsx'),
  'utf8'
);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('INV-111: pagination does not add a third body state', () => {
  it.each([
    {
      name: 'client busy with rows',
      rows: numberedTokenRows(4),
      pagination: {
        kind: 'client' as const,
        pageIndex: 0,
        pageSize: 10,
        busy: true,
        onPageChange: vi.fn(),
      },
      expectEmpty: false,
      expectRows: 4,
    },
    {
      name: 'client idle empty page',
      rows: numberedTokenRows(3),
      pagination: {
        kind: 'client' as const,
        pageIndex: 1,
        pageSize: 10,
        busy: false,
        onPageChange: vi.fn(),
      },
      expectEmpty: true,
      expectRows: 0,
    },
    {
      name: 'server busy empty (integrator cleared rows)',
      rows: [] as TokenRow[],
      pagination: {
        kind: 'server' as const,
        pageIndex: 1,
        pageSize: 10,
        totalCount: 40,
        busy: true,
        onPageChange: vi.fn(),
      },
      expectEmpty: true,
      expectRows: 0,
    },
    {
      name: 'server idle with page rows',
      rows: TOKEN_ROWS,
      pagination: {
        kind: 'server' as const,
        pageIndex: 2,
        pageSize: 10,
        totalCount: 100,
        busy: false,
        onPageChange: vi.fn(),
      },
      expectEmpty: false,
      expectRows: TOKEN_ROWS.length,
    },
  ])('$name', ({ rows, pagination, expectEmpty, expectRows }) => {
    const { container } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={rows}
        getRowKey={(row) => row.id}
        pagination={pagination}
      />
    );
    expect(Boolean(container.querySelector('[data-slot="data-table-empty"]'))).toBe(expectEmpty);
    expect(container.querySelectorAll('[data-slot="data-table-row"]').length).toBe(expectRows);
  });

  it('does not import skeleton, spinner, or alert into data-table.tsx', () => {
    expect(SOURCE).not.toMatch(/\bSkeleton\b/);
    expect(SOURCE).not.toMatch(/\bSpinner\b/);
    expect(SOURCE).not.toMatch(/\bAlert\b/);
  });
});

describe('INV-112: typed XOR; runtime pager-wins', () => {
  it('still rejects top-level onReachEnd / hasMore / infinite aliases', () => {
    type Forbidden = Extract<keyof DataTableProps<TokenRow>, 'onReachEnd' | 'hasMore' | 'infinite'>;
    expectTypeOf<Forbidden>().toEqualTypeOf<never>();
  });

  it('allows infiniteScroll on DataTableProps (rewritten from “prop absent”)', () => {
    type Present = Extract<keyof DataTableProps<TokenRow>, 'infiniteScroll'>;
    expectTypeOf<Present>().toEqualTypeOf<'infiniteScroll'>();
  });

  it('ignores infinite when pagination is also set: pager mounts, sentinel absent, onLoadMore never fires', () => {
    const onLoadMore = vi.fn();
    const onPageChange = vi.fn();
    const { container } = render(
      <DataTable
        {...untypedDataTableProps({
          ...captionTableProps({ rows: numberedTokenRows(25) }),
          pagination: {
            kind: 'client',
            pageIndex: 0,
            pageSize: 10,
            onPageChange,
          },
          infiniteScroll: { hasMore: true, onLoadMore, busy: true },
        })}
      />
    );
    expect(container.querySelector('[data-slot="data-table-pagination-next"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="data-table-infinite-sentinel"]')).toBeNull();
    expect(container.querySelector('table')?.getAttribute('aria-rowcount')).not.toBe('-1');
    expect(
      onLoadMore,
      'INV-112 / INV-149: both props set must not merge append into the page window'
    ).not.toHaveBeenCalled();
  });
});

describe('SC-006 / INV-102: the kit never fetches', () => {
  it('does not call fetch when Next is activated', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(25),
          pagination: {
            kind: 'server',
            pageIndex: 0,
            pageSize: 10,
            totalCount: 25,
            onPageChange: vi.fn(),
          },
        })}
      />
    );
    fireEvent.click(
      container.querySelector('[data-slot="data-table-pagination-next"]') as HTMLButtonElement
    );
    expect(fetchSpy, 'INV-102: onPageChange is the only page-intent seam').not.toHaveBeenCalled();
    expect(SOURCE).not.toMatch(/\bfetch\s*\(/);
  });
});
