/**
 * SF-11 · Interaction & transition — INV-246 … INV-250.
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
  rows = numberedTokenRows(200),
  pageSize = 10,
  initialPage = 0,
  onPageChange,
  busy = false,
}: {
  rows?: TokenRow[];
  pageSize?: number;
  initialPage?: number;
  onPageChange?: (next: number) => void;
  busy?: boolean;
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
        busy,
        onPageChange: (next) => {
          onPageChange?.(next);
          setPageIndex(next);
        },
      }}
    />
  );
}

describe('INV-246: number activation emits the item index once; current is a no-op', () => {
  it('calls onPageChange(2) once for page 3 from page 0', () => {
    const onPageChange = vi.fn();
    const { container } = render(<ClientPager onPageChange={onPageChange} />);
    const page3 = container.querySelector(
      '[data-slot="data-table-pagination-page"][data-page-index="2"]'
    ) as HTMLButtonElement;
    fireEvent.click(page3);
    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('does not call onPageChange when the current page is activated', () => {
    const onPageChange = vi.fn();
    const { container } = render(<ClientPager onPageChange={onPageChange} />);
    const current = container.querySelector(
      '[data-slot="data-table-pagination-page"][aria-current="page"]'
    ) as HTMLButtonElement;
    fireEvent.click(current);
    expect(onPageChange, 'INV-246: re-clicking current must not refetch').not.toHaveBeenCalled();
  });

  it('does not call onPageChange from a page button while busy', () => {
    const onPageChange = vi.fn();
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(200),
          pagination: {
            kind: 'client',
            pageIndex: 0,
            pageSize: 10,
            busy: true,
            onPageChange,
          },
        })}
      />
    );
    fireEvent.click(
      container.querySelector(
        '[data-slot="data-table-pagination-page"][data-page-index="2"]'
      ) as HTMLButtonElement
    );
    expect(onPageChange).not.toHaveBeenCalled();
  });
});

describe('INV-247: Previous/Next neighbour intents; unknown Next uses hasNextPage', () => {
  it('disables Next on a known last page', () => {
    const onPageChange = vi.fn();
    const { container } = render(
      <ClientPager
        rows={numberedTokenRows(25)}
        pageSize={10}
        initialPage={2}
        onPageChange={onPageChange}
      />
    );
    const next = container.querySelector(
      '[data-slot="data-table-pagination-next"]'
    ) as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    fireEvent.click(next);
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('emits pageIndex + 1 from enabled Next when total is unknown', () => {
    const onPageChange = vi.fn();
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(10),
          pagination: { kind: 'server', pageIndex: 3, pageSize: 10, onPageChange },
        })}
      />
    );
    fireEvent.click(
      container.querySelector('[data-slot="data-table-pagination-next"]') as HTMLButtonElement
    );
    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('does not emit from Next when unknown total sets hasNextPage false', () => {
    const onPageChange = vi.fn();
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(10),
          pagination: {
            kind: 'server',
            pageIndex: 3,
            pageSize: 10,
            hasNextPage: false,
            onPageChange,
          },
        })}
      />
    );
    fireEvent.click(
      container.querySelector('[data-slot="data-table-pagination-next"]') as HTMLButtonElement
    );
    expect(onPageChange).not.toHaveBeenCalled();
  });
});

describe('INV-248: busy locks Previous, Next, and every page-number button', () => {
  it('disables the full button set without changing body rows', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(200),
          pagination: {
            kind: 'client',
            pageIndex: 10,
            pageSize: 10,
            busy: true,
            onPageChange: vi.fn(),
          },
        })}
      />
    );
    expect(container.querySelectorAll('[data-slot="data-table-row"]').length).toBe(10);
    expect(
      container.querySelector('[data-slot="data-table-pagination"]')?.getAttribute('aria-busy')
    ).toBe('true');
    expect(
      (container.querySelector('[data-slot="data-table-pagination-previous"]') as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(
      (container.querySelector('[data-slot="data-table-pagination-next"]') as HTMLButtonElement)
        .disabled
    ).toBe(true);
    for (const button of container.querySelectorAll('[data-slot="data-table-pagination-page"]')) {
      expect((button as HTMLButtonElement).disabled, 'INV-248: every number is locked').toBe(true);
    }
  });
});

describe('INV-249 / INV-261: focus rescue stays in the nav (jsdom disable path)', () => {
  it('does not move cell focus into a page-number button on a prop-driven page change', () => {
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
    const rows = numberedTokenRows(200);
    const { container, rerender } = render(
      <DataTable
        caption="T"
        columns={columns}
        rows={rows}
        getRowKey={getTokenRowKey}
        pagination={{ kind: 'client', pageIndex: 10, pageSize: 10, onPageChange: vi.fn() }}
      />
    );
    const button = container.querySelector('button[data-row="r100"]') as HTMLButtonElement;
    button.focus();
    rerender(
      <DataTable
        caption="T"
        columns={columns}
        rows={rows}
        getRowKey={getTokenRowKey}
        pagination={{ kind: 'client', pageIndex: 0, pageSize: 10, onPageChange: vi.fn() }}
      />
    );
    expect(document.activeElement?.closest('[data-slot="data-table-pagination"]')).toBeNull();
    expect(document.activeElement?.getAttribute('data-slot')).not.toBe(
      'data-table-pagination-page'
    );
  });

  it('keeps focus in the nav after Tab onto a number then an external pageIndex change', () => {
    const rows = numberedTokenRows(200);
    const shared = {
      caption: 'T',
      columns: tokenColumns(),
      rows,
      getRowKey: getTokenRowKey,
    };
    const { container, rerender } = render(
      <>
        <button type="button">Before</button>
        <DataTable
          {...shared}
          pagination={{ kind: 'client', pageIndex: 0, pageSize: 10, onPageChange: vi.fn() }}
        />
      </>
    );
    const before = container.querySelector('button') as HTMLButtonElement;
    before.focus();
    const pageTwo = container.querySelector(
      '[data-slot="data-table-pagination-page"][data-page-index="2"]'
    ) as HTMLButtonElement;
    expect(pageTwo).not.toBeNull();
    pageTwo.focus();
    expect(document.activeElement).toBe(pageTwo);

    rerender(
      <>
        <button type="button">Before</button>
        <DataTable
          {...shared}
          pagination={{ kind: 'client', pageIndex: 10, pageSize: 10, onPageChange: vi.fn() }}
        />
      </>
    );
    const nav = container.querySelector('[data-slot="data-table-pagination"]');
    expect(nav?.contains(document.activeElement), 'INV-249: focus must stay in the nav').toBe(true);
    expect(document.activeElement).not.toBe(document.body);
  });

  it('keeps focus in the nav when the focused last-page button disappears after rows shrink', () => {
    const renderTable = (rowCount: number): ReactElement => (
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={numberedTokenRows(rowCount)}
        getRowKey={getTokenRowKey}
        pagination={{ kind: 'client', pageIndex: 0, pageSize: 10, onPageChange: vi.fn() }}
      />
    );
    const { container, rerender } = render(renderTable(200));
    const lastPage = container.querySelector(
      '[data-slot="data-table-pagination-page"][data-page-index="19"]'
    ) as HTMLButtonElement;
    lastPage.focus();
    expect(document.activeElement).toBe(lastPage);

    rerender(renderTable(100));

    const nav = container.querySelector('[data-slot="data-table-pagination"]');
    expect(nav?.contains(document.activeElement), 'INV-249: focus must stay in the nav').toBe(true);
    expect(document.activeElement).not.toBe(document.body);
  });

  it('does not steal focus back to the pager after using it then clicking a row control', () => {
    function Harness(): ReactElement {
      const [pageIndex, setPageIndex] = useState(0);
      return (
        <DataTable
          caption="T"
          columns={[
            ...tokenColumns(),
            {
              id: 'act',
              header: 'Act',
              cell: (row: TokenRow) => (
                <button type="button" data-row={row.id}>
                  Open {row.id}
                </button>
              ),
            },
          ]}
          rows={numberedTokenRows(200)}
          getRowKey={getTokenRowKey}
          pagination={{ kind: 'client', pageIndex, pageSize: 10, onPageChange: setPageIndex }}
        />
      );
    }
    const { container } = render(<Harness />);
    fireEvent.click(
      container.querySelector(
        '[data-slot="data-table-pagination-page"][data-page-index="2"]'
      ) as HTMLButtonElement
    );
    const sortButton = container.querySelector(
      '[data-slot="data-table-header-cell"][data-column-id="amount"] button'
    ) as HTMLButtonElement;
    expect(sortButton).not.toBeNull();
    sortButton.focus();
    fireEvent.click(sortButton);
    expect(document.activeElement, 'INV-109: row/header control must keep focus').toBe(sortButton);
    expect(document.activeElement?.closest('[data-slot="data-table-pagination"]')).toBeNull();
  });

  it('disarms rescue when a pointer click leaves the nav with a null focus target', () => {
    const rows = numberedTokenRows(200);
    const renderTable = (busy: boolean): ReactElement => (
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={rows}
        getRowKey={getTokenRowKey}
        pagination={{ kind: 'client', pageIndex: 0, pageSize: 10, busy, onPageChange: vi.fn() }}
      />
    );
    const { container, rerender } = render(renderTable(false));
    const pageTwo = container.querySelector(
      '[data-slot="data-table-pagination-page"][data-page-index="2"]'
    ) as HTMLButtonElement;
    pageTwo.focus();
    rerender(renderTable(true));
    expect(document.activeElement?.closest('[data-slot="data-table-pagination"]')).not.toBeNull();

    const cell = container.querySelector('[data-slot="data-table-cell"]') as HTMLTableCellElement;
    fireEvent.pointerDown(cell);
    (document.activeElement as HTMLElement).blur();
    fireEvent.click(cell);
    rerender(renderTable(false));

    expect(
      document.activeElement?.closest('[data-slot="data-table-pagination"]'),
      'INV-249: non-focusable outside click must disarm rescue'
    ).toBeNull();
  });
});

describe('INV-250: table identity survives number-button page changes', () => {
  it('keeps the same table, caption, thead, and tbody nodes', () => {
    const onPageChange = vi.fn();
    const { container, rerender } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(200),
          pagination: { kind: 'client', pageIndex: 0, pageSize: 10, onPageChange },
        })}
      />
    );
    const table = container.querySelector('[data-slot="data-table-table"]');
    const caption = container.querySelector('[data-slot="data-table-caption"]');
    const head = container.querySelector('[data-slot="data-table-head"]');
    const body = container.querySelector('[data-slot="data-table-body"]');
    fireEvent.click(
      container.querySelector(
        '[data-slot="data-table-pagination-page"][data-page-index="2"]'
      ) as HTMLButtonElement
    );
    rerender(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(200),
          pagination: { kind: 'client', pageIndex: 2, pageSize: 10, onPageChange },
        })}
      />
    );
    rerender(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(200),
          pagination: { kind: 'client', pageIndex: 0, pageSize: 10, onPageChange },
        })}
      />
    );
    expect(container.querySelector('[data-slot="data-table-table"]')).toBe(table);
    expect(container.querySelector('[data-slot="data-table-caption"]')).toBe(caption);
    expect(container.querySelector('[data-slot="data-table-head"]')).toBe(head);
    expect(container.querySelector('[data-slot="data-table-body"]')).toBe(body);
  });
});

describe('INV-249 source: .focus( lives only on pager rescue targets', () => {
  it('does not call .focus( from data-table.tsx', () => {
    const dir = join(dirname(fileURLToPath(import.meta.url)), '..');
    const table = readFileSync(join(dir, 'data-table.tsx'), 'utf8');
    const pager = readFileSync(join(dir, 'pagination-controls.tsx'), 'utf8');
    expect(table).not.toMatch(/\.focus\(/);
    expect(pager).toMatch(/currentPageButton\.focus\(/);
    expect(pager).toMatch(/previousButton\?\.focus\(/);
    expect(pager).toMatch(/nextButton\?\.focus\(/);
    expect(pager).toMatch(/status\?\.focus\(/);
  });
});
