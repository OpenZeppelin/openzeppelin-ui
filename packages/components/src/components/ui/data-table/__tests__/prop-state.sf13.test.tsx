/**
 * SF-13 · Prop / state contract — INV-337 … INV-343, INV-14*, INV-39*, INV-52*.
 *
 * Negative arms use `@ts-expect-error` (two-way via typecheck:data-table-tests).
 */
import { render } from '@testing-library/react';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import { DataTable } from '../data-table';
import type { DataTablePaginationPlacement, DataTableProps, DataTableSelection } from '../types';
import { captionTableProps, TOKEN_ROWS, tokenColumns, type TokenRow } from './sf2-fixtures';

const columns = tokenColumns();
const getRowKey = (row: TokenRow) => row.id;

describe('INV-337 / INV-39*: six hooks are optional; chromeMode is not public', () => {
  it('accepts omit-all and each additive field', () => {
    const omitAll = {
      caption: 'T',
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
    } satisfies DataTableProps<TokenRow>;
    const withHooks = {
      caption: 'T',
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
      toolbar: <div>Filters</div>,
      getRowClassName: () => 'hover:bg-muted/30',
      selection: {
        selectedKeys: new Set<string>(),
        onSelectionChange: () => undefined,
        columnClassName: 'w-10',
      },
      pagination: {
        kind: 'client' as const,
        pageIndex: 0,
        pageSize: 10,
        onPageChange: () => undefined,
        placement: 'inside' as const,
        className: 'justify-end',
        hideStatus: true,
      },
    } satisfies DataTableProps<TokenRow>;
    expect(omitAll.caption).toBe('T');
    expect(withHooks.pagination.placement).toBe('inside');
    expectTypeOf<DataTablePaginationPlacement>().toEqualTypeOf<'outside' | 'inside'>();
    expectTypeOf<
      Extract<keyof DataTableProps<TokenRow>, 'toolbar' | 'getRowClassName' | 'chromeMode'>
    >().toEqualTypeOf<'toolbar' | 'getRowClassName'>();
  });

  it('rejects chromeMode, rowVariant, and a top-level placement alias', () => {
    const withChromeMode = {
      caption: 'T',
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
      // @ts-expect-error INV-339: chromeMode is internal
      chromeMode: 'plain',
    } satisfies DataTableProps<TokenRow>;
    const withRowVariant = {
      caption: 'T',
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
      // @ts-expect-error INV-339: no public rowVariant enum
      rowVariant: 'muted',
    } satisfies DataTableProps<TokenRow>;
    const withTopLevelPlacement = {
      caption: 'T',
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
      // @ts-expect-error INV-368: placement lives on pagination
      paginationPlacement: 'inside',
    } satisfies DataTableProps<TokenRow>;
    expect(withChromeMode).toBeDefined();
    expect(withRowVariant).toBeDefined();
    expect(withTopLevelPlacement).toBeDefined();
  });
});

describe('INV-343 / INV-14*: columnClassName is a string, not a width number', () => {
  it('rejects a numeric columnWidth on selection', () => {
    const selection = {
      selectedKeys: new Set<string>(),
      onSelectionChange: () => undefined,
      // @ts-expect-error INV-343: no numeric width API
      columnWidth: 48,
    } satisfies DataTableSelection<TokenRow>;
    expect(selection).toBeDefined();
  });
});

describe('INV-338: framed is derived per render with no leftover frame', () => {
  it('toggles the frame node when toolbar appears and disappears', () => {
    const { container, rerender } = render(<DataTable {...captionTableProps()} />);
    expect(container.querySelector('[data-slot="data-table-frame"]')).toBeNull();
    rerender(<DataTable {...captionTableProps({ toolbar: <div>Filters</div> })} />);
    expect(container.querySelector('[data-slot="data-table-frame"]')).not.toBeNull();
    rerender(<DataTable {...captionTableProps()} />);
    expect(container.querySelector('[data-slot="data-table-frame"]')).toBeNull();
  });
});

describe('INV-340: toolbar is opaque ReactNode', () => {
  it('renders a custom filter fixture without kit search markup', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          toolbar: (
            <form>
              <input aria-label="Search accounts" />
              <select aria-label="Status">
                <option>All</option>
              </select>
            </form>
          ),
        })}
      />
    );
    expect(container.querySelector('[data-slot="data-table-toolbar"] input')).not.toBeNull();
    expect(container.textContent).not.toMatch(/AccountsFilterBar/);
  });
});

describe('INV-342: hideStatus keeps the status node mounted', () => {
  it('contains sr-only status under a relative nav and keeps Previous/Next plus Page N copy', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          pagination: {
            kind: 'server',
            pageIndex: 2,
            pageSize: 10,
            onPageChange: vi.fn(),
            hideStatus: true,
            placement: 'inside',
          },
        })}
      />
    );
    const status = container.querySelector('[data-slot="data-table-pagination-status"]');
    const nav = container.querySelector('[data-slot="data-table-pagination"]');
    expect(status).not.toBeNull();
    expect(status?.className).toContain('sr-only');
    expect(status?.textContent).toBe('Page 3');
    expect(nav?.className).toContain('relative');
    expect(container.querySelector('[data-slot="data-table-pagination-previous"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="data-table-pagination-next"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-slot="data-table-pagination-page"]').length).toBe(0);
  });
});
