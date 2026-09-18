/**
 * SF-8 · Interaction and strategy composition — INV-192 … INV-196, INV-198, INV-200, INV-202, INV-204.
 */
import './sf4-jsdom-setup';

import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataTable } from '../data-table';
import { captionTableProps, numberedTokenRows, tokenColumns, type TokenRow } from './sf2-fixtures';

describe('INV-192 / INV-183: row controls report immutable identity transitions', () => {
  it('adds only the clicked row key and remains controlled until the parent rerenders', () => {
    const selectedKeys = new Set(['off-window']);
    const onSelectionChange = vi.fn();
    const { getByRole } = render(
      <DataTable {...captionTableProps({ selection: { selectedKeys, onSelectionChange } })} />
    );
    const checkbox = getByRole('checkbox', { name: 'Select b' });

    fireEvent.click(checkbox);
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['off-window', 'b']));
    expect(onSelectionChange.mock.calls[0]?.[0]).not.toBe(selectedKeys);
    expect(selectedKeys).toEqual(new Set(['off-window']));
    expect(checkbox.getAttribute('data-state')).toBe('unchecked');
  });

  it('removes only a selected row key', () => {
    const onSelectionChange = vi.fn();
    const { getByRole } = render(
      <DataTable
        {...captionTableProps({
          selection: { selectedKeys: new Set(['off-window', 'b']), onSelectionChange },
        })}
      />
    );
    fireEvent.click(getByRole('checkbox', { name: 'Select b' }));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['off-window']));
  });

  it('does not select from row, composed-cell, or action clicks', () => {
    const onSelectionChange = vi.fn();
    const action = vi.fn();
    const columns = [
      {
        id: 'action',
        header: 'Action',
        cell: (row: TokenRow) => (
          <button type="button" onClick={action}>
            Edit {row.id}
          </button>
        ),
      },
      ...tokenColumns(),
    ];
    const { container, getByRole } = render(
      <DataTable
        {...captionTableProps({
          columns,
          selection: { selectedKeys: new Set(), onSelectionChange },
        })}
      />
    );
    fireEvent.click(container.querySelector('[data-row-key="a"]') as HTMLElement);
    fireEvent.click(getByRole('button', { name: 'Edit a' }));
    expect(action).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});

describe('INV-193 / INV-188: header actions union or subtract the applicable window', () => {
  it('unions every current row into none while preserving off-window keys', () => {
    const onSelectionChange = vi.fn();
    const { getByRole } = render(
      <DataTable
        {...captionTableProps({
          selection: { selectedKeys: new Set(['off-window']), onSelectionChange },
        })}
      />
    );
    fireEvent.click(getByRole('checkbox', { name: 'Select all' }));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['off-window', 'a', 'b', 'c']));
  });

  it('subtracts applicable keys from mixed instead of filling the remainder', () => {
    const onSelectionChange = vi.fn();
    const { getByRole } = render(
      <DataTable
        {...captionTableProps({
          selection: { selectedKeys: new Set(['off-window', 'a']), onSelectionChange },
        })}
      />
    );
    fireEvent.click(getByRole('checkbox', { name: 'Select all' }));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['off-window']));
  });

  it('subtracts a fully selected current page without clearing other pages', () => {
    const rows = numberedTokenRows(6);
    const onSelectionChange = vi.fn();
    const { getByRole } = render(
      <DataTable
        {...captionTableProps({
          rows,
          pagination: { kind: 'client', pageIndex: 1, pageSize: 2, onPageChange: vi.fn() },
          selection: {
            selectedKeys: new Set(['r0', 'r2', 'r3']),
            onSelectionChange,
          },
        })}
      />
    );
    fireEvent.click(getByRole('checkbox', { name: 'Select all' }));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['r0']));
  });
});

describe('INV-194 / INV-195 / INV-198: identity survives sort and stable columns', () => {
  it('keeps the synthetic header unsortable while sorting another column by row identity', () => {
    const selectedKeys = new Set(['c']);
    const columns = tokenColumns();
    const { container, getByRole } = render(
      <DataTable
        {...captionTableProps({ columns, selection: { selectedKeys, onSelectionChange: vi.fn() } })}
      />
    );
    const selectionHeader = container.querySelector('thead th');
    expect(selectionHeader?.querySelector('[aria-label^="Sort by"]')).toBeNull();

    fireEvent.click(getByRole('button', { name: 'Sort by Amount' }));
    fireEvent.click(getByRole('button', { name: /Sort by Amount, ascending/ }));
    const selectedRow = container.querySelector('[data-row-key="c"]');
    expect(selectedRow?.getAttribute('data-selected')).toBe('true');
    expect(selectedRow?.querySelector('[aria-label="Select c"]')?.getAttribute('data-state')).toBe(
      'checked'
    );
  });

  it('repaints from new selectedKeys while retaining the same integrator columns reference', () => {
    const columns = tokenColumns();
    const onSelectionChange = vi.fn();
    const { container, rerender } = render(
      <DataTable
        {...captionTableProps({
          columns,
          selection: { selectedKeys: new Set(['a']), onSelectionChange },
        })}
      />
    );
    rerender(
      <DataTable
        {...captionTableProps({
          columns,
          selection: { selectedKeys: new Set(['b']), onSelectionChange },
        })}
      />
    );
    expect(container.querySelector('[data-row-key="a"]')?.hasAttribute('data-selected')).toBe(
      false
    );
    expect(container.querySelector('[data-row-key="b"]')?.getAttribute('data-selected')).toBe(
      'true'
    );
  });
});

describe('INV-195 / INV-200: page and append composition preserve app-owned keys', () => {
  it('paints only matching identities on a server-held replacement page', () => {
    const selectedKeys = new Set(['r0', 'r4']);
    const onSelectionChange = vi.fn();
    const firstPage = numberedTokenRows(2);
    const secondPage = numberedTokenRows(6).slice(4, 6);
    const pagination = {
      kind: 'server' as const,
      pageIndex: 0,
      pageSize: 2,
      totalCount: 6,
      onPageChange: vi.fn(),
    };
    const { container, rerender } = render(
      <DataTable
        {...captionTableProps({
          rows: firstPage,
          pagination,
          selection: { selectedKeys, onSelectionChange },
        })}
      />
    );
    expect(container.querySelector('[data-row-key="r0"]')?.getAttribute('data-selected')).toBe(
      'true'
    );
    rerender(
      <DataTable
        {...captionTableProps({
          rows: secondPage,
          pagination: { ...pagination, pageIndex: 2 },
          selection: { selectedKeys, onSelectionChange },
        })}
      />
    );
    expect(container.querySelector('[data-row-key="r4"]')?.getAttribute('data-selected')).toBe(
      'true'
    );
    expect(selectedKeys).toEqual(new Set(['r0', 'r4']));
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('does not auto-select appended identities', () => {
    const selectedKeys = new Set(['r0']);
    const onSelectionChange = vi.fn();
    const infiniteScroll = { hasMore: true, busy: true, onLoadMore: vi.fn() };
    const { container, rerender } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(2),
          infiniteScroll,
          selection: { selectedKeys, onSelectionChange },
        })}
      />
    );
    rerender(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(4),
          infiniteScroll,
          selection: { selectedKeys, onSelectionChange },
        })}
      />
    );
    expect(container.querySelector('[data-row-key="r0"]')?.getAttribute('data-selected')).toBe(
      'true'
    );
    expect(container.querySelector('[data-row-key="r2"]')?.hasAttribute('data-selected')).toBe(
      false
    );
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});

describe('INV-202 / INV-204: selection is orthogonal to loading intents', () => {
  it('does not call page or load-more intents and keeps selected paint while busy', () => {
    const onPageChange = vi.fn();
    const onLoadMore = vi.fn();
    const onSelectionChange = vi.fn();
    const { container, getByRole } = render(
      <DataTable
        {...captionTableProps({
          pagination: {
            kind: 'server',
            pageIndex: 0,
            pageSize: 3,
            totalCount: 6,
            busy: true,
            onPageChange,
          },
          infiniteScroll: { hasMore: true, busy: true, onLoadMore },
          selection: { selectedKeys: new Set(['a']), onSelectionChange },
        })}
      />
    );
    expect(container.querySelector('[data-row-key="a"]')?.getAttribute('data-selected')).toBe(
      'true'
    );
    fireEvent.click(getByRole('checkbox', { name: 'Select b' }));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['a', 'b']));
    expect(onPageChange).not.toHaveBeenCalled();
    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
