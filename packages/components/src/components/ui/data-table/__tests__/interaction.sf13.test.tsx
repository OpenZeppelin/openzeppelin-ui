/**
 * SF-13 · Interaction — INV-341, INV-344 … INV-347, INV-346, INV-358.
 */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Component, useState, type ReactElement, type ReactNode } from 'react';

import { DataTable } from '../data-table';
import {
  captionTableProps,
  getTokenRowKey,
  numberedTokenRows,
  TOKEN_ROWS,
  tokenColumns,
} from './sf2-fixtures';

function amountButton(container: HTMLElement): HTMLButtonElement {
  return container.querySelector(
    '[data-slot="data-table-header-cell"][data-column-id="amount"] button'
  ) as HTMLButtonElement;
}

class TestBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  public state = { failed: false };
  public static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  public render(): ReactNode {
    return this.state.failed ? <div>fell</div> : this.props.children;
  }
}

function InsidePager({
  hideStatus = true,
  onPageChange,
}: {
  hideStatus?: boolean;
  onPageChange?: (next: number) => void;
}): ReactElement {
  const [pageIndex, setPageIndex] = useState(0);
  return (
    <DataTable
      caption="T"
      columns={tokenColumns()}
      rows={numberedTokenRows(47)}
      getRowKey={getTokenRowKey}
      pagination={{
        kind: 'client',
        pageIndex,
        pageSize: 10,
        hideStatus,
        placement: 'inside',
        onPageChange: (next) => {
          onPageChange?.(next);
          setPageIndex(next);
        },
      }}
    />
  );
}

describe('INV-344: inside + hideStatus keep the same page intents', () => {
  it('emits onPageChange from Next and from a numbered button', () => {
    const onPageChange = vi.fn();
    const { container } = render(<InsidePager hideStatus onPageChange={onPageChange} />);
    fireEvent.click(
      container.querySelector('[data-slot="data-table-pagination-next"]') as HTMLButtonElement
    );
    expect(onPageChange).toHaveBeenCalledWith(1);
    fireEvent.click(
      container.querySelector(
        '[data-slot="data-table-pagination-page"][data-page-index="2"]'
      ) as HTMLButtonElement
    );
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});

describe('INV-345: hideStatus applies justify-end before integrator className', () => {
  it('merges kit end alignment then pagination.className', () => {
    const hidden = render(
      <DataTable
        {...captionTableProps({
          pagination: {
            kind: 'client',
            pageIndex: 0,
            pageSize: 10,
            onPageChange: vi.fn(),
            hideStatus: true,
          },
        })}
      />
    );
    expect(
      hidden.container.querySelector('[data-slot="data-table-pagination"]')?.className
    ).toContain('justify-end');

    const extra = render(
      <DataTable
        {...captionTableProps({
          pagination: {
            kind: 'client',
            pageIndex: 0,
            pageSize: 10,
            onPageChange: vi.fn(),
            hideStatus: true,
            className: 'gap-8',
          },
        })}
      />
    );
    const className =
      extra.container.querySelector('[data-slot="data-table-pagination"]')?.className ?? '';
    expect(className).toContain('justify-end');
    expect(className).toContain('gap-8');
  });
});

describe('INV-346 / INV-358: row class is CSS-only; selection and sort survive', () => {
  it('still toggles a row checkbox and cycles sort under getRowClassName', () => {
    const onSelectionChange = vi.fn();
    const { container, getByRole } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        getRowClassName={() => 'hover:bg-muted/30'}
        selection={{ selectedKeys: new Set(), onSelectionChange }}
      />
    );
    const row = container.querySelector('[data-row-key="a"]');
    expect(row?.className).toContain('hover:bg-muted/30');
    fireEvent.click(getByRole('checkbox', { name: 'Select a' }));
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    const next = onSelectionChange.mock.calls[0]?.[0] as Set<string>;
    expect(next.has('a')).toBe(true);
    expect(row?.getAttribute('data-state')).toBeNull();

    fireEvent.click(amountButton(container));
    expect(
      container
        .querySelector('[data-slot="data-table-header-cell"][data-column-id="amount"]')
        ?.getAttribute('aria-sort')
    ).toBe('ascending');
  });

  it('keeps data-state=selected when a selected row has a custom hover class', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          getRowClassName: () => 'hover:bg-muted/30',
          selection: { selectedKeys: new Set(['a']), onSelectionChange: vi.fn() },
        })}
      />
    );
    const row = container.querySelector('[data-row-key="a"]');
    expect(row?.getAttribute('data-state')).toBe('selected');
    expect(row?.className).toContain('hover:bg-muted/30');
  });
});

describe('INV-341: getRowClassName throws propagate', () => {
  it('lets a throwing callback reach the nearest error boundary', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <TestBoundary>
        <DataTable
          {...captionTableProps({
            getRowClassName: () => {
              throw new Error('row-class-bug');
            },
          })}
        />
      </TestBoundary>
    );
    expect(container.textContent).toContain('fell');
  });

  it('keeps kit row chrome when the callback returns undefined', () => {
    const { container } = render(
      <DataTable {...captionTableProps({ getRowClassName: () => undefined })} />
    );
    expect(container.querySelector('[data-slot="data-table-row"]')?.className).toContain(
      'hover:bg-accent/50'
    );
  });
});

describe('INV-347 (jsdom geometry tokens): toolbar and in-frame pager are not sticky', () => {
  it('puts sticky tokens on header cells only', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          toolbar: <div>Filters</div>,
          pagination: {
            kind: 'client',
            pageIndex: 0,
            pageSize: 10,
            onPageChange: vi.fn(),
            placement: 'inside',
          },
        })}
      />
    );
    const header = container.querySelector('[data-slot="data-table-header-cell"]')?.className ?? '';
    expect(header).toContain('sticky');
    expect(header).toContain('top-0');
    expect(container.querySelector('[data-slot="data-table-toolbar"]')?.className).not.toContain(
      'sticky'
    );
    expect(container.querySelector('[data-slot="data-table-pagination"]')?.className).not.toContain(
      'sticky'
    );
  });
});
