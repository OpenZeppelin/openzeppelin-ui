/**
 * SF-6 · Accessibility jsdom mirror — INV-171 … INV-175, INV-28*, INV-144*.
 * Chromium axe / display / SC-004 live in data-table.sf6.browser.test.tsx.
 */
import './sf4-jsdom-setup';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataTable } from '../data-table';
import { captionTableProps, getTokenRowKey, numberedTokenRows, tokenColumns } from './sf2-fixtures';

describe('INV-171 / INV-144: component aria-rowcount follows the mode table', () => {
  it('sets aria-rowcount -1 on unvirtualized hasMore', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(20),
          infiniteScroll: { hasMore: true, busy: true, onLoadMore: vi.fn() },
        })}
      />
    );
    expect(container.querySelector('table')?.getAttribute('aria-rowcount')).toBe('-1');
  });

  it('omits aria-rowcount on an exhausted unvirtualized feed', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(5),
          infiniteScroll: { hasMore: false, onLoadMore: vi.fn() },
        })}
      />
    );
    expect(container.querySelector('table')?.hasAttribute('aria-rowcount')).toBe(false);
  });

  it('uses 1+n on an exhausted virtualized feed', () => {
    const rows = numberedTokenRows(40);
    const { container } = render(
      <DataTable
        caption="Done"
        columns={tokenColumns()}
        rows={rows}
        getRowKey={getTokenRowKey}
        virtualized
        infiniteScroll={{ hasMore: false, onLoadMore: vi.fn() }}
      />
    );
    expect(container.querySelector('table')?.getAttribute('aria-rowcount')).toBe(
      String(1 + rows.length)
    );
  });

  it('keeps SF-4 finite page-local counts when infinite is omitted', () => {
    const { container } = render(
      <DataTable
        caption="Page"
        columns={tokenColumns()}
        rows={numberedTokenRows(10_000)}
        getRowKey={getTokenRowKey}
        virtualized
        pagination={{
          kind: 'client',
          pageIndex: 0,
          pageSize: 200,
          onPageChange: vi.fn(),
        }}
      />
    );
    expect(
      container.querySelector('table')?.getAttribute('aria-rowcount'),
      'INV-144: client page 200 → 201; do not weaken this lock'
    ).toBe('201');
  });

  it('does not use server totalCount for rowcount on a virtualized page', () => {
    const { container } = render(
      <DataTable
        caption="Server page"
        columns={tokenColumns()}
        rows={numberedTokenRows(100)}
        getRowKey={getTokenRowKey}
        virtualized
        pagination={{
          kind: 'server',
          pageIndex: 0,
          pageSize: 100,
          totalCount: 50_000,
          onPageChange: vi.fn(),
        }}
      />
    );
    expect(container.querySelector('table')?.getAttribute('aria-rowcount')).toBe('101');
  });
});

describe('INV-172 / INV-28: real rows get rowindex while hasMore; sentinel and spacers never do', () => {
  it('opts unvirtualized hasMore into header 1 + body i+2', () => {
    const rows = numberedTokenRows(3);
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows,
          infiniteScroll: { hasMore: true, busy: true, onLoadMore: vi.fn() },
        })}
      />
    );
    expect(container.querySelector('thead tr')?.getAttribute('aria-rowindex')).toBe('1');
    const body = [...container.querySelectorAll('[data-slot="data-table-row"]')];
    expect(body.map((row) => row.getAttribute('aria-rowindex'))).toEqual(['2', '3', '4']);
    expect(
      container
        .querySelector('[data-slot="data-table-infinite-sentinel"]')
        ?.hasAttribute('aria-rowindex')
    ).toBe(false);
  });

  it('omits every rowindex when unvirtualized hasMore is false', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(3),
          infiniteScroll: { hasMore: false, onLoadMore: vi.fn() },
        })}
      />
    );
    expect(container.querySelectorAll('[aria-rowindex]').length).toBe(0);
  });

  it('keeps identity indices on a virtualized window and never indexes spacers', () => {
    const { container } = render(
      <DataTable
        caption="Window"
        columns={tokenColumns()}
        rows={numberedTokenRows(80)}
        getRowKey={getTokenRowKey}
        virtualized={{ maxHeight: 120, overscan: 1, estimateSize: 36 }}
        infiniteScroll={{ hasMore: true, busy: true, onLoadMore: vi.fn() }}
      />
    );
    expect(container.querySelector('thead tr')?.getAttribute('aria-rowindex')).toBe('1');
    for (const spacer of container.querySelectorAll('[data-slot="data-table-spacer"]')) {
      expect(spacer.hasAttribute('aria-rowindex')).toBe(false);
    }
    const sentinel = container.querySelector('[data-slot="data-table-infinite-sentinel"]');
    if (sentinel) {
      expect(sentinel.hasAttribute('aria-rowindex')).toBe(false);
    }
  });
});

describe('INV-173: no setsize/posinset; pager totalCount stays status text', () => {
  it('does not put setsize or posinset on table rows', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          infiniteScroll: { hasMore: true, busy: true, onLoadMore: vi.fn() },
        })}
      />
    );
    expect(container.querySelector('[aria-setsize]')).toBeNull();
    expect(container.querySelector('[aria-posinset]')).toBeNull();
  });
});

describe('INV-174 (jsdom names, not High-stakes proof): named table survives infinite', () => {
  it('exposes a named table with columnheaders and no grid role', () => {
    render(
      <DataTable
        caption="Activity"
        columns={tokenColumns()}
        rows={numberedTokenRows(8)}
        getRowKey={getTokenRowKey}
        infiniteScroll={{ hasMore: true, busy: true, onLoadMore: vi.fn() }}
      />
    );
    expect(screen.getByRole('table', { name: 'Activity' })).toBeTruthy();
    expect(screen.queryByRole('grid')).toBeNull();
    expect(screen.getAllByRole('columnheader').length).toBe(tokenColumns().length);
  });
});

describe('INV-28 (jsdom): P1 without infinite still omits rowcount', () => {
  it('leaves the unvirtualized non-infinite skeleton unindexed', () => {
    const { container } = render(<DataTable {...captionTableProps()} />);
    expect(container.querySelector('[aria-rowcount]')).toBeNull();
    expect(container.querySelector('[aria-rowindex]')).toBeNull();
    expect(container.querySelectorAll('[role]').length).toBe(0);
  });
});
