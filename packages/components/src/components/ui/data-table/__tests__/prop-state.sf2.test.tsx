/**
 * SF-2 · Prop / state contract — INV-38 … INV-43.
 *
 * Negative arms use `@ts-expect-error` (two-way: unused directive is TS2578).
 * Package `tsc` excludes `*.test.ts`; two-way check is
 * `pnpm typecheck:data-table-tests` (`tsconfig.data-table-tests.json`).
 */
import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Component, type ReactNode } from 'react';

import { logger } from '@openzeppelin/ui-utils';

import { DataTable } from '../data-table';
import type { DataTableColumn, DataTableProps } from '../types';
import { getTokenRowKey, TOKEN_ROWS, tokenColumns, type TokenRow } from './sf2-fixtures';

const columns = tokenColumns();
const getRowKey = getTokenRowKey;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('INV-38: name is required and singular; blank names diagnose, never throw', () => {
  it('accepts each single name branch', () => {
    const captioned = {
      caption: 'T',
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
    } satisfies DataTableProps<TokenRow>;
    const labelled = {
      'aria-label': 'T',
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
    } satisfies DataTableProps<TokenRow>;
    const labelledBy = {
      'aria-labelledby': 'h',
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
    } satisfies DataTableProps<TokenRow>;
    expect(captioned.caption).toBe('T');
    expect(labelled['aria-label']).toBe('T');
    expect(labelledBy['aria-labelledby']).toBe('h');
  });

  it('rejects zero name branches', () => {
    // @ts-expect-error INV-38: accessible name is required
    const unnamed: DataTableProps<TokenRow> = {
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
    };
    expect(unnamed).toBeDefined();
  });

  it('rejects caption + aria-label', () => {
    const both = {
      caption: 'T',
      'aria-label': 'T',
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
      // @ts-expect-error INV-38: two name paths
    } satisfies DataTableProps<TokenRow>;
    expect(both).toBeDefined();
  });

  it('rejects caption + aria-labelledby', () => {
    const both = {
      caption: 'T',
      'aria-labelledby': 'h',
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
      // @ts-expect-error INV-38: two name paths
    } satisfies DataTableProps<TokenRow>;
    expect(both).toBeDefined();
  });

  it('rejects aria-label + aria-labelledby', () => {
    const both = {
      'aria-label': 'T',
      'aria-labelledby': 'h',
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
      // @ts-expect-error INV-38: two name paths
    } satisfies DataTableProps<TokenRow>;
    expect(both).toBeDefined();
  });

  it('rejects captionClassName with aria-label', () => {
    const mixed = {
      'aria-label': 'T',
      captionClassName: 'sr-only',
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
      // @ts-expect-error INV-38: captionClassName is caption-branch only
    } satisfies DataTableProps<TokenRow>;
    expect(mixed).toBeDefined();
  });

  it('logs once for a blank caption and still renders the skeleton', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const { container } = render(
      <DataTable caption="  " columns={columns} rows={TOKEN_ROWS} getRowKey={getRowKey} />
    );
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
    expect(errorSpy.mock.calls[0]?.[0]).toBe('DataTable');
    expect(String(errorSpy.mock.calls[0]?.[1])).toMatch(/accessible name required/);
    expect(container.querySelector('[data-slot="data-table-table"]')).not.toBeNull();
  });

  it('logs once for a blank aria-label', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    render(<DataTable aria-label="" columns={columns} rows={TOKEN_ROWS} getRowKey={getRowKey} />);
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('logs once for a dangling aria-labelledby', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    render(
      <DataTable aria-labelledby="nope" columns={columns} rows={TOKEN_ROWS} getRowKey={getRowKey} />
    );
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
    expect(String(errorSpy.mock.calls[0]?.[1])).toMatch(/does not match any element/);
  });
});

describe('INV-39 (restated): closed prop surface admits nested selection only', () => {
  it('accepts required fields, documented optionals, and nested selection', () => {
    const selectedKeys = new Set(['a']);
    const onSelectionChange = vi.fn();
    const full = {
      caption: 'T',
      captionClassName: 'sr-only',
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
      emptyState: 'slot',
      emptyTitle: 'None',
      emptyDescription: 'Empty',
      className: 'wrap',
      tableClassName: 'tbl',
      selection: { selectedKeys, onSelectionChange, columnClassName: 'w-12' },
      formatSortButtonName: ({ columnName, direction }) => `${columnName}:${direction}`,
      toolbar: 'filters',
      getRowClassName: () => 'hover:bg-muted/30',
    } satisfies DataTableProps<TokenRow>;
    expect(full.emptyTitle).toBe('None');
    expect(full.selection.selectedKeys).toBe(selectedKeys);
    expectTypeOf<
      Extract<
        keyof DataTableProps<TokenRow>,
        'formatSortButtonName' | 'toolbar' | 'getRowClassName'
      >
    >().toEqualTypeOf<'formatSortButtonName' | 'toolbar' | 'getRowClassName'>();
  });

  it('keeps top-level selection aliases and unrelated state keys out of DataTableProps', () => {
    type Forbidden = Extract<
      keyof DataTableProps<TokenRow>,
      | 'isLoading'
      | 'loading'
      | 'error'
      | 'onSort'
      | 'page'
      | 'pageSize'
      | 'onPageChange'
      | 'rowHeight'
      | 'selectedIds'
      | 'onSelectionChange'
      | 'rowClassName'
      | 'onRowClick'
      | 'ref'
    >;
    expectTypeOf<Forbidden>().toEqualTypeOf<never>();
    expectTypeOf<
      Extract<keyof DataTableProps<TokenRow>, 'stickyHeader'>
    >().toEqualTypeOf<'stickyHeader'>();
  });

  it('rejects isLoading on an object literal', () => {
    const withLoading = {
      caption: 'T',
      columns,
      rows: TOKEN_ROWS,
      getRowKey,
      // @ts-expect-error INV-39: isLoading is not on SF-2
      isLoading: true,
    } satisfies DataTableProps<TokenRow>;
    expect(withLoading).toBeDefined();
  });

  it('requires getRowKey, columns, and rows', () => {
    // @ts-expect-error INV-39: getRowKey is required
    const missingKey: DataTableProps<TokenRow> = {
      caption: 'T',
      columns,
      rows: TOKEN_ROWS,
    };
    // @ts-expect-error INV-39: columns is required
    const missingColumns: DataTableProps<TokenRow> = {
      caption: 'T',
      rows: TOKEN_ROWS,
      getRowKey,
    };
    // @ts-expect-error INV-39: rows is required
    const missingRows: DataTableProps<TokenRow> = {
      caption: 'T',
      columns,
      getRowKey,
    };
    expect(missingKey).toBeDefined();
    expect(missingColumns).toBeDefined();
    expect(missingRows).toBeDefined();
  });
});

describe('INV-40: stateless pure render of current props', () => {
  it('reflects in-place mutation of rows on rerender with the same array reference', () => {
    const rows: TokenRow[] = [{ id: 'a', label: 'Alpha', amount: 1n, status: 'Active' }];
    const { container, rerender } = render(
      <DataTable caption="T" columns={columns} rows={rows} getRowKey={getRowKey} />
    );
    expect(container.textContent).toContain('Alpha');
    rows[0] = { id: 'a', label: 'Mutated', amount: 1n, status: 'Active' };
    rerender(<DataTable caption="T" columns={columns} rows={rows} getRowKey={getRowKey} />);
    expect(container.textContent, 'INV-40: no stale memoized output').toContain('Mutated');
    expect(container.textContent).not.toContain('Alpha');
  });

  it('renders two instances independently', () => {
    const { container } = render(
      <>
        <DataTable
          caption="One"
          columns={columns}
          rows={TOKEN_ROWS.slice(0, 1)}
          getRowKey={getRowKey}
        />
        <DataTable
          caption="Two"
          columns={columns}
          rows={TOKEN_ROWS.slice(1, 2)}
          getRowKey={getRowKey}
        />
      </>
    );
    const captions = [...container.querySelectorAll('[data-slot="data-table-caption"]')].map(
      (el) => el.textContent
    );
    expect(captions).toEqual(['One', 'Two']);
    expect(container.textContent).toContain('Alpha');
    expect(container.textContent).toContain('Beta');
  });
});

describe('INV-41: unconstrained Row; getRowKey required; no index keys', () => {
  it('type-checks primitive, tuple, and id-less object rows', () => {
    const stringCols: DataTableColumn<string>[] = [{ id: 'v', header: 'V', cell: (row) => row }];
    const tupleCols: DataTableColumn<readonly [string, bigint]>[] = [
      { id: 'addr', header: 'Addr', cell: (row) => row[0] },
    ];
    const addressCols: DataTableColumn<{ address: string }>[] = [
      { id: 'a', header: 'A', cell: (row) => row.address },
    ];
    expectTypeOf(stringCols[0]!.cell).toEqualTypeOf<(row: string) => ReactNode>();
    expect(tupleCols[0]?.cell(['0x1', 1n])).toBe('0x1');
    expect(addressCols[0]?.cell({ address: '0x2' })).toBe('0x2');
  });

  it('rejects rows whose element type does not match columns', () => {
    const stringCols: DataTableColumn<string>[] = [{ id: 'v', header: 'V', cell: (row) => row }];
    const props = {
      caption: 'T',
      columns: stringCols,
      // @ts-expect-error INV-41: number[] is not string[]
      rows: [1, 2],
      getRowKey: (row: string) => row,
    } satisfies DataTableProps<string>;
    expect(props).toBeDefined();
  });
});

describe('INV-42: sort fields are inert when sortable !== true', () => {
  it('renders leftover getSortValue columns without chrome and never calls the getter', () => {
    const getSortValue = vi.fn((row: TokenRow) => row.amount);
    const withGetter = tokenColumns().map((column) =>
      column.id === 'amount'
        ? { ...column, sortable: false as const, getSortValue }
        : { ...column, sortable: undefined, getSortValue: undefined }
    );
    const withoutGetter = tokenColumns().map((column) => {
      const { sortable: _sortable, getSortValue: _getSortValue, ...rest } = column;
      return rest;
    });
    const a = render(
      <DataTable caption="T" columns={withGetter} rows={TOKEN_ROWS} getRowKey={getRowKey} />
    );
    const b = render(
      <DataTable caption="T" columns={withoutGetter} rows={TOKEN_ROWS} getRowKey={getRowKey} />
    );
    expect(a.container.querySelector('[aria-sort]')).toBeNull();
    expect(a.container.querySelector('th button')).toBeNull();
    expect(
      getSortValue,
      'INV-42: getSortValue is never invoked unless sortable === true'
    ).not.toHaveBeenCalled();
    expect(a.container.querySelector('[data-slot="data-table-table"]')?.innerHTML).toBe(
      b.container.querySelector('[data-slot="data-table-table"]')?.innerHTML
    );
    a.unmount();
    b.unmount();
  });
});

describe('INV-43: degenerate declarations render and do not throw', () => {
  class CatchBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
    public state: { error: Error | null } = { error: null };
    public static getDerivedStateFromError(error: Error): { error: Error } {
      return { error };
    }
    public render(): ReactNode {
      return this.state.error ? <div>boundary</div> : this.props.children;
    }
  }

  it('renders zero columns with empty rows and colSpan 1', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const { container } = render(
      <CatchBoundary>
        <DataTable caption="T" columns={[]} rows={[]} getRowKey={getRowKey} />
      </CatchBoundary>
    );
    expect(container.textContent).not.toBe('boundary');
    expect(
      container.querySelector('[data-slot="data-table-empty"] td')?.getAttribute('colspan')
    ).toBe('1');
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('DataTable', 'DataTable: received no columns.');
    });
  });

  it('renders zero columns with data rows as empty trs and never calls cell', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const cell = vi.fn(() => 'x');
    const emptyCols = render(
      <DataTable caption="T" columns={[]} rows={TOKEN_ROWS} getRowKey={getRowKey} />
    );
    expect(emptyCols.container.querySelectorAll('[data-slot="data-table-row"]').length).toBe(
      TOKEN_ROWS.length
    );
    expect(
      emptyCols.container.querySelectorAll('[data-slot="data-table-cell"]').length,
      'INV-43(a): non-empty rows with zero columns have zero tds'
    ).toBe(0);
    expect(cell).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('DataTable', 'DataTable: received no columns.');
    });
  });

  it('renders duplicate column ids and logs once per distinct duplicated id', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const dup = [
      { id: 'amount', header: 'A', cell: () => 'a' },
      { id: 'amount', header: 'B', cell: () => 'b' },
      { id: 'status', header: 'S', cell: () => 's' },
    ];
    const { container } = render(
      <DataTable caption="T" columns={dup} rows={TOKEN_ROWS.slice(0, 1)} getRowKey={getRowKey} />
    );
    expect(container.querySelector('[data-slot="data-table-table"]')).not.toBeNull();
    await waitFor(() => {
      const messages = errorSpy.mock.calls.map((call) => String(call[1]));
      expect(messages.filter((m) => m.includes('duplicate column id "amount"'))).toHaveLength(1);
    });
  });

  it('does not emit a kit diagnostic for duplicate getRowKey values', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const rows: TokenRow[] = [
      { id: 'same', label: 'A', amount: 1n, status: 'x' },
      { id: 'same', label: 'B', amount: 2n, status: 'y' },
    ];
    const { container } = render(
      <DataTable caption="T" columns={columns} rows={rows} getRowKey={getRowKey} />
    );
    await waitFor(() => {
      expect(container.querySelector('[data-slot="data-table-table"]')).not.toBeNull();
    });
    const kit = errorSpy.mock.calls.filter((call) => call[0] === 'DataTable');
    expect(kit, 'INV-43(c): duplicate row keys are React’s warning, not a kit log').toHaveLength(0);
  });
});
