/**
 * SF-5 · Interaction & transition — INV-104 … INV-107.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useState, type ReactElement } from 'react';

import { DataTable } from '../data-table';
import {
  captionTableProps,
  getTokenRowKey,
  numberedTokenRows,
  tokenColumns,
  type TokenRow,
} from './sf2-fixtures';

function ClientPager({
  rows = numberedTokenRows(25),
  pageSize = 10,
  initialPage = 0,
  onPageChange,
}: {
  rows?: TokenRow[];
  pageSize?: number;
  initialPage?: number;
  onPageChange?: (next: number) => void;
}): ReactElement {
  const [pageIndex, setPageIndex] = useState(initialPage);
  return (
    <DataTable
      caption="T"
      columns={tokenColumns()}
      rows={rows}
      getRowKey={getTokenRowKey}
      pagination={{
        kind: 'client',
        pageIndex,
        pageSize,
        onPageChange: (next) => {
          onPageChange?.(next);
          setPageIndex(next);
        },
      }}
    />
  );
}

describe('INV-104: Previous/Next emit one in-range neighbour and stay inert when disabled', () => {
  it('calls onPageChange once with i+1 from an enabled Next', () => {
    const onPageChange = vi.fn();
    const { container } = render(<ClientPager onPageChange={onPageChange} />);
    const next = container.querySelector(
      '[data-slot="data-table-pagination-next"]'
    ) as HTMLButtonElement;
    expect(next.disabled).toBe(false);
    fireEvent.click(next);
    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('does not call onPageChange from a disabled Next or Previous', () => {
    const onPageChange = vi.fn();
    const first = render(<ClientPager onPageChange={onPageChange} initialPage={0} />);
    const prev = first.container.querySelector(
      '[data-slot="data-table-pagination-previous"]'
    ) as HTMLButtonElement;
    expect(prev.disabled, 'INV-104: first page Previous is inert').toBe(true);
    fireEvent.click(prev);
    fireEvent.keyDown(prev, { key: 'Enter' });
    expect(onPageChange).not.toHaveBeenCalled();
    first.unmount();

    const last = render(<ClientPager onPageChange={onPageChange} initialPage={2} />);
    const next = last.container.querySelector(
      '[data-slot="data-table-pagination-next"]'
    ) as HTMLButtonElement;
    expect(next.disabled, 'INV-104: last page Next is inert').toBe(true);
    fireEvent.click(next);
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('disables both buttons when pageCount is 1', () => {
    const { container } = render(<ClientPager rows={numberedTokenRows(5)} pageSize={10} />);
    expect(
      (container.querySelector('[data-slot="data-table-pagination-previous"]') as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(
      (container.querySelector('[data-slot="data-table-pagination-next"]') as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });

  it('does not wrap onPageChange in try/catch (React 19 reports handler throws as unhandled)', () => {
    const dataTable = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'data-table.tsx'),
      'utf8'
    );
    const pager = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'pagination-controls.tsx'),
      'utf8'
    );
    expect(dataTable, 'INV-104: no try around page intent').not.toMatch(/try\s*\{/);
    expect(pager).not.toMatch(/try\s*\{/);
  });
});

describe('INV-105: busy locks the pager only', () => {
  it('keeps body rows, disables both buttons, and sets aria-busy', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(10),
          pagination: {
            kind: 'client',
            pageIndex: 0,
            pageSize: 10,
            busy: true,
            onPageChange: vi.fn(),
          },
        })}
      />
    );
    expect(container.querySelectorAll('[data-slot="data-table-row"]').length).toBe(10);
    expect(container.querySelector('[data-slot="data-table-empty"]')).toBeNull();
    expect(
      (container.querySelector('[data-slot="data-table-pagination-previous"]') as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(
      (container.querySelector('[data-slot="data-table-pagination-next"]') as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(
      container.querySelector('[data-slot="data-table-pagination"]')?.getAttribute('aria-busy')
    ).toBe('true');
  });

  it('still shows the empty row when busy and rows=[]', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: [],
          pagination: {
            kind: 'server',
            pageIndex: 0,
            pageSize: 10,
            totalCount: 40,
            busy: true,
            onPageChange: vi.fn(),
          },
        })}
      />
    );
    expect(container.querySelector('[data-slot="data-table-empty"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-slot="data-table-row"]').length).toBe(0);
  });
});

describe('INV-106: focus rescue stays in the nav; paging does not steal row focus', () => {
  it('moves focus from a now-disabled Next to the current page button', () => {
    const { container } = render(<ClientPager initialPage={1} />);
    const next = container.querySelector(
      '[data-slot="data-table-pagination-next"]'
    ) as HTMLButtonElement;
    next.focus();
    expect(document.activeElement).toBe(next);
    fireEvent.click(next);
    const current = container.querySelector(
      '[data-slot="data-table-pagination-page"][aria-current="page"]'
    );
    expect(next.disabled).toBe(true);
    expect(
      document.activeElement,
      'INV-106 / INV-249: rescue prefers the current page button when it is mounted and enabled'
    ).toBe(current);
  });

  it('does not move focus into the pager when a surviving cell widget stays focused', () => {
    const columns = [
      {
        id: 'act',
        header: 'Act',
        cell: (row: TokenRow) => (
          <button type="button" data-row={row.id}>
            Open {row.id}
          </button>
        ),
      },
    ];
    const rows = numberedTokenRows(25);
    const { container, rerender } = render(
      <DataTable
        caption="T"
        columns={columns}
        rows={rows}
        getRowKey={getTokenRowKey}
        pagination={{ kind: 'client', pageIndex: 0, pageSize: 10, onPageChange: vi.fn() }}
      />
    );
    const button = container.querySelector('button[data-row="r0"]') as HTMLButtonElement;
    button.focus();
    expect(document.activeElement).toBe(button);
    rerender(
      <DataTable
        caption="T"
        columns={columns}
        rows={rows}
        getRowKey={getTokenRowKey}
        pagination={{ kind: 'client', pageIndex: 1, pageSize: 10, onPageChange: vi.fn() }}
      />
    );
    expect(
      document.activeElement?.getAttribute('data-slot'),
      'INV-106: kit must not steal focus to the pager on a prop-driven page change'
    ).not.toBe('data-table-pagination-previous');
    expect(document.activeElement?.getAttribute('data-slot')).not.toBe(
      'data-table-pagination-next'
    );
    expect(document.activeElement?.getAttribute('data-slot')).not.toBe(
      'data-table-pagination-page'
    );
  });

  it('does not assign scrollLeft on the wrapper when the page changes', () => {
    const { container, rerender } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(25),
          pagination: { kind: 'client', pageIndex: 0, pageSize: 10, onPageChange: vi.fn() },
        })}
      />
    );
    const scroller = container.querySelector('[data-slot="data-table"]') as HTMLElement;
    scroller.scrollLeft = 40;
    rerender(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(25),
          pagination: { kind: 'client', pageIndex: 1, pageSize: 10, onPageChange: vi.fn() },
        })}
      />
    );
    expect(scroller.scrollLeft, 'INV-106: paging must not reset horizontal scroll').toBe(40);
  });
});

describe('INV-107: table node identity survives pageIndex / busy / status updates', () => {
  it('keeps the same table, caption, thead, and tbody nodes across page turns', () => {
    const rows = numberedTokenRows(25);
    const { container, rerender } = render(
      <DataTable
        {...captionTableProps({
          rows,
          pagination: { kind: 'client', pageIndex: 0, pageSize: 10, onPageChange: vi.fn() },
        })}
      />
    );
    const table = container.querySelector('[data-slot="data-table-table"]');
    const caption = container.querySelector('[data-slot="data-table-caption"]');
    const head = container.querySelector('[data-slot="data-table-head"]');
    const body = container.querySelector('[data-slot="data-table-body"]');
    const scroller = container.querySelector('[data-slot="data-table"]');
    rerender(
      <DataTable
        {...captionTableProps({
          rows,
          pagination: {
            kind: 'client',
            pageIndex: 1,
            pageSize: 10,
            onPageChange: vi.fn(),
            busy: true,
          },
        })}
      />
    );
    rerender(
      <DataTable
        {...captionTableProps({
          rows,
          pagination: { kind: 'client', pageIndex: 0, pageSize: 10, onPageChange: vi.fn() },
        })}
      />
    );
    expect(container.querySelector('[data-slot="data-table-table"]')).toBe(table);
    expect(container.querySelector('[data-slot="data-table-caption"]')).toBe(caption);
    expect(container.querySelector('[data-slot="data-table-head"]')).toBe(head);
    expect(container.querySelector('[data-slot="data-table-body"]')).toBe(body);
    expect(container.querySelector('[data-slot="data-table"]')).toBe(scroller);
  });

  it('keeps focus on a header widget across a client page change', () => {
    const columns = [
      {
        id: 'filter',
        header: <input aria-label="Filter" />,
        headerLabel: 'Filter',
        cell: () => null,
      },
    ];
    const rows = numberedTokenRows(25);
    const { container, rerender } = render(
      <DataTable
        caption="T"
        columns={columns}
        rows={rows}
        getRowKey={getTokenRowKey}
        pagination={{ kind: 'client', pageIndex: 0, pageSize: 10, onPageChange: vi.fn() }}
      />
    );
    const input = container.querySelector('input[aria-label="Filter"]') as HTMLInputElement;
    input.focus();
    rerender(
      <DataTable
        caption="T"
        columns={columns}
        rows={rows}
        getRowKey={getTokenRowKey}
        pagination={{ kind: 'client', pageIndex: 1, pageSize: 10, onPageChange: vi.fn() }}
      />
    );
    expect(document.activeElement).toBe(input);
  });
});

describe('non-integer pageIndex disables both pager buttons', () => {
  it('disables Previous and Next for pageIndex 1.5', () => {
    const onPageChange = vi.fn();
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(25),
          pagination: { kind: 'client', pageIndex: 1.5, pageSize: 10, onPageChange },
        })}
      />
    );
    expect(
      (container.querySelector('[data-slot="data-table-pagination-previous"]') as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(
      (container.querySelector('[data-slot="data-table-pagination-next"]') as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });
});
