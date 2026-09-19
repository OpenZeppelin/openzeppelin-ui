/**
 * SF-12 · Render contract — INV-299 … INV-304, INV-323, INV-86*.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataTable } from '../data-table';
import {
  captionTableProps,
  getTokenRowKey,
  numberedTokenRows,
  TOKEN_ROWS,
  tokenColumns,
} from './sf2-fixtures';

const SENTINEL = '[data-slot="data-table-infinite-sentinel"]';
const PAGER = '[data-slot="data-table-pagination"]';

function spanishName({
  columnName,
  direction,
}: {
  columnName: string;
  direction: 'none' | 'asc' | 'desc';
}): string {
  if (direction === 'none') {
    return `Ordenar por ${columnName}`;
  }
  if (direction === 'asc') {
    return `Ordenar por ${columnName}, ascendente`;
  }
  return `Ordenar por ${columnName}, descendente`;
}

describe('INV-299: legal load arms paint today’s chrome', () => {
  it('mounts pager only, sentinel only, or neither', () => {
    const pageOnly = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(25),
          pagination: {
            kind: 'client',
            pageIndex: 0,
            pageSize: 10,
            onPageChange: vi.fn(),
          },
        })}
      />
    );
    expect(pageOnly.container.querySelector(PAGER)).not.toBeNull();
    expect(pageOnly.container.querySelector(SENTINEL)).toBeNull();

    const infiniteOnly = render(
      <DataTable
        {...captionTableProps({
          infiniteScroll: { hasMore: true, onLoadMore: vi.fn() },
        })}
      />
    );
    expect(infiniteOnly.container.querySelector(PAGER)).toBeNull();
    expect(infiniteOnly.container.querySelector(SENTINEL)).not.toBeNull();

    const neither = render(<DataTable {...captionTableProps()} />);
    expect(neither.container.querySelector(PAGER)).toBeNull();
    expect(neither.container.querySelector(SENTINEL)).toBeNull();
  });
});

describe('INV-301 / INV-304 / INV-323: default English names; override used', () => {
  it('omitted formatter matches defaultSortButtonName for none / asc / desc', () => {
    const { rerender } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
      />
    );
    expect(screen.getByRole('button', { name: 'Sort by Amount' })).toBeTruthy();
    rerender(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        sort={{ columnId: 'amount', direction: 'asc' }}
      />
    );
    expect(screen.getByRole('button', { name: 'Sort by Amount, ascending' })).toBeTruthy();
    rerender(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        sort={{ columnId: 'amount', direction: 'desc' }}
      />
    );
    expect(screen.getByRole('button', { name: 'Sort by Amount, descending' })).toBeTruthy();
  });

  it('uses the formatter on both wrapping-string and sibling-icon branches', () => {
    const columns = [
      {
        id: 'select',
        header: <input type="checkbox" aria-label="Select all" />,
        headerLabel: 'Select',
        sortable: true,
        cell: () => null,
      },
      ...tokenColumns(),
    ];
    render(
      <DataTable
        caption="T"
        columns={columns}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        formatSortButtonName={spanishName}
      />
    );
    expect(screen.getByRole('button', { name: 'Ordenar por Amount' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ordenar por Select' })).toBeTruthy();
  });
});

describe('INV-302: formatter is not invoked for columns without a sort button', () => {
  it('calls once per sortable data column and never for the kit select column', () => {
    const formatSortButtonName = vi.fn(spanishName);
    const { container } = render(
      <DataTable
        {...captionTableProps({
          formatSortButtonName,
          selection: { selectedKeys: new Set(), onSelectionChange: vi.fn() },
        })}
      />
    );
    expect(formatSortButtonName).toHaveBeenCalledTimes(1);
    expect(formatSortButtonName.mock.calls[0]?.[0]).toEqual({
      columnName: 'Amount',
      direction: 'none',
    });
    const selectHeader = container.querySelector('[data-column-id="__data-table-select"]');
    expect(selectHeader?.querySelector('button[aria-label^="Ordenar"]')).toBeNull();
    expect(selectHeader?.querySelector('button[aria-label^="Sort by"]')).toBeNull();
  });
});

describe('INV-303: aria-sort is independent of the formatter', () => {
  it('keeps HTML ascending/descending tokens when the formatter returns Spanish or blank', () => {
    const { container, rerender } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        sort={{ columnId: 'amount', direction: 'asc' }}
      />
    );
    const amountTh = () =>
      container.querySelector('[data-slot="data-table-header-cell"][data-column-id="amount"]');
    expect(amountTh()?.getAttribute('aria-sort')).toBe('ascending');
    rerender(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        sort={{ columnId: 'amount', direction: 'asc' }}
        formatSortButtonName={spanishName}
      />
    );
    expect(amountTh()?.getAttribute('aria-sort')).toBe('ascending');
    rerender(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        sort={{ columnId: 'amount', direction: 'desc' }}
        formatSortButtonName={() => ''}
      />
    );
    expect(amountTh()?.getAttribute('aria-sort')).toBe('descending');
    expect(screen.getByRole('button', { name: 'Sort by Amount, descending' })).toBeTruthy();
  });
});
