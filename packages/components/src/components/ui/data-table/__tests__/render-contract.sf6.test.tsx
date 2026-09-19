/**
 * SF-6 · Render contract — INV-149 … INV-153, INV-28*.
 */
import './sf4-jsdom-setup';

import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DataTable } from '../data-table';
import { DATA_TABLE_INFINITE_SENTINEL_KEY } from '../virtualization';
import {
  captionTableProps,
  getTokenRowKey,
  numberedTokenRows,
  TOKEN_ROWS,
  tokenColumns,
  untypedDataTableProps,
  type TokenRow,
} from './sf2-fixtures';

const SENTINEL = '[data-slot="data-table-infinite-sentinel"]';
const ROW = '[data-slot="data-table-row"]';
const EMPTY = '[data-slot="data-table-empty"]';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('INV-149: omitting infinite is today’s table; both props ignore infinite', () => {
  it('mounts no sentinel and never calls onLoadMore when infiniteScroll is omitted', () => {
    const { container } = render(<DataTable {...captionTableProps()} />);
    expect(container.querySelector(SENTINEL)).toBeNull();
    expect(container.querySelector('table')?.getAttribute('aria-rowcount')).toBeNull();
    expect(
      container.querySelector('[data-slot="data-table"]')?.getAttribute('aria-busy')
    ).toBeNull();
  });

  it('keeps the pager and drops the sentinel when both strategies are set', () => {
    const onLoadMore = vi.fn();
    const { container } = render(
      <DataTable
        {...untypedDataTableProps({
          ...captionTableProps({ rows: numberedTokenRows(25) }),
          pagination: {
            kind: 'client',
            pageIndex: 0,
            pageSize: 10,
            onPageChange: vi.fn(),
          },
          infiniteScroll: { hasMore: true, onLoadMore, busy: true },
        })}
      />
    );
    expect(container.querySelector('[data-slot="data-table-root"]')).not.toBeNull();
    expect(container.querySelector(SENTINEL)).toBeNull();
    expect(onLoadMore).not.toHaveBeenCalled();
    expect(container.querySelector('table')?.getAttribute('aria-rowcount')).not.toBe('-1');
  });

  it('mounts a sentinel on an unvirtualized feed (orthogonal to virtualized)', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          infiniteScroll: { hasMore: true, onLoadMore: vi.fn() },
        })}
      />
    );
    expect(container.querySelectorAll(SENTINEL).length).toBe(1);
  });
});

describe('INV-150: sentinel is a hidden non-data row while hasMore', () => {
  it('unmounts the sentinel when hasMore is false', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          infiniteScroll: { hasMore: false, onLoadMore: vi.fn() },
        })}
      />
    );
    expect(container.querySelector(SENTINEL)).toBeNull();
  });

  it('paints exactly one hidden sentinel that is not a data row and has no copy', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          columns: tokenColumns(),
          infiniteScroll: { hasMore: true, onLoadMore: vi.fn() },
        })}
      />
    );
    const sentinels = container.querySelectorAll(SENTINEL);
    expect(sentinels.length).toBe(1);
    const sentinel = sentinels[0] as HTMLTableRowElement;
    expect(sentinel.getAttribute('data-row-key')).toBe(DATA_TABLE_INFINITE_SENTINEL_KEY);
    expect(sentinel.getAttribute('aria-hidden')).toBe('true');
    expect(sentinel.hasAttribute('aria-rowindex')).toBe(false);
    expect(sentinel.hasAttribute('tabIndex')).toBe(false);
    expect(sentinel.getAttribute('data-slot')).not.toBe('data-table-row');
    expect(sentinel.querySelector(ROW)).toBeNull();
    expect(sentinel.textContent).toBe('');
    expect(sentinel.querySelector('td')?.getAttribute('colspan')).toBe(
      String(tokenColumns().length)
    );
    const tbody = container.querySelector('tbody');
    expect(tbody?.lastElementChild).toBe(sentinel);
  });

  it('still mounts the sentinel on an empty hasMore feed', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: [],
          infiniteScroll: { hasMore: true, onLoadMore: vi.fn() },
        })}
      />
    );
    expect(container.querySelectorAll(SENTINEL).length).toBe(1);
  });
});

describe('INV-151: virtualized hasMore uses count+1; empty+virtualized stays INV-115 inactive', () => {
  it('does not pass the sentinel index to the integrator estimator', () => {
    const estimateSize = vi.fn((index: number) => 36 + index);
    const rows = numberedTokenRows(4);
    const { container } = render(
      <DataTable
        caption="Virt feed"
        columns={tokenColumns()}
        rows={rows}
        getRowKey={getTokenRowKey}
        virtualized={{ estimateSize, maxHeight: 384, overscan: 8 }}
        infiniteScroll={{ hasMore: true, onLoadMore: vi.fn() }}
      />
    );
    expect(
      estimateSize.mock.calls.some(([index]) => index === rows.length),
      'INV-151: estimateSize for the sentinel index is always 1, never the integrator spy'
    ).toBe(false);
    expect(container.querySelector(SENTINEL)?.getAttribute('data-row-key')).toBe(
      DATA_TABLE_INFINITE_SENTINEL_KEY
    );
  });

  it('drops the sentinel from the virtualizer when hasMore is false (last key is data)', () => {
    const rows = numberedTokenRows(4);
    const { container } = render(
      <DataTable
        caption="Exhausted"
        columns={tokenColumns()}
        rows={rows}
        getRowKey={getTokenRowKey}
        virtualized
        infiniteScroll={{ hasMore: false, onLoadMore: vi.fn() }}
      />
    );
    expect(container.querySelector(SENTINEL)).toBeNull();
    const keys = [...container.querySelectorAll(ROW)].map((row) =>
      row.getAttribute('data-row-key')
    );
    expect(keys.at(-1)).toBe(rows.at(-1)?.id);
    expect(container.querySelector('table')?.getAttribute('aria-rowcount')).toBe(
      String(1 + rows.length)
    );
  });

  it('keeps virtualization inactive on empty+hasMore and still paints the tbody sentinel', () => {
    const { container } = render(
      <DataTable
        caption="First chunk"
        columns={tokenColumns()}
        rows={[]}
        getRowKey={getTokenRowKey}
        virtualized
        infiniteScroll={{ hasMore: true, onLoadMore: vi.fn() }}
      />
    );
    const wrap = container.querySelector('[data-slot="data-table"]') as HTMLElement;
    expect(wrap.style.maxHeight, 'INV-115: empty body does not activate the virtualizer').toBe('');
    expect(container.querySelector('[data-slot="data-table-spacer"]')).toBeNull();
    expect(container.querySelector(SENTINEL)).not.toBeNull();
  });
});

describe('INV-152: empty chrome is suppressed while the first chunk is unknown or in flight', () => {
  const customEmpty = <button type="button">Add account</button>;

  it.each([
    {
      name: 'non-empty rows keep data, never empty chrome',
      rows: TOKEN_ROWS,
      busy: true,
      hasMore: true,
      expectEmptySlot: false,
      expectCta: false,
      expectSentinel: true,
      expectDataRows: TOKEN_ROWS.length,
    },
    {
      name: 'empty + busy suppresses EmptyState even without hasMore',
      rows: [] as TokenRow[],
      busy: true,
      hasMore: false,
      expectEmptySlot: true,
      expectCta: false,
      expectSentinel: false,
      expectDataRows: 0,
    },
    {
      name: 'empty + hasMore + idle suppresses EmptyState and mounts sentinel',
      rows: [] as TokenRow[],
      busy: false,
      hasMore: true,
      expectEmptySlot: true,
      expectCta: false,
      expectSentinel: true,
      expectDataRows: 0,
    },
    {
      name: 'exhausted empty feed shows today’s empty chrome',
      rows: [] as TokenRow[],
      busy: false,
      hasMore: false,
      expectEmptySlot: true,
      expectCta: true,
      expectSentinel: false,
      expectDataRows: 0,
    },
  ])(
    '$name',
    ({ rows, busy, hasMore, expectEmptySlot, expectCta, expectSentinel, expectDataRows }) => {
      const { container } = render(
        <DataTable
          {...captionTableProps({
            rows,
            emptyState: customEmpty,
            infiniteScroll: { hasMore, busy, onLoadMore: vi.fn() },
          })}
        />
      );
      expect(Boolean(container.querySelector(EMPTY))).toBe(expectEmptySlot);
      expect(container.textContent?.includes('Add account') ?? false).toBe(expectCta);
      expect(Boolean(container.querySelector(SENTINEL))).toBe(expectSentinel);
      expect(container.querySelectorAll(ROW).length).toBe(expectDataRows);
      expect(container.querySelectorAll('[data-column-id="label"]').length).toBeGreaterThan(0);
    }
  );
});

describe('INV-153: infinite aria-busy lives on the scroll wrapper, never on a row', () => {
  it('sets aria-busy on data-table while infinite busy', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          infiniteScroll: { hasMore: true, busy: true, onLoadMore: vi.fn() },
        })}
      />
    );
    expect(container.querySelector('[data-slot="data-table"]')?.getAttribute('aria-busy')).toBe(
      'true'
    );
    expect(container.querySelector(`${SENTINEL}[aria-busy]`)).toBeNull();
    expect(container.querySelector(`${ROW}[aria-busy]`)).toBeNull();
  });

  it('ignores infiniteScroll.busy under pager-wins and follows pagination.busy on nav', () => {
    const { container } = render(
      <DataTable
        {...untypedDataTableProps({
          ...captionTableProps({ rows: numberedTokenRows(12) }),
          pagination: {
            kind: 'client',
            pageIndex: 0,
            pageSize: 10,
            busy: true,
            onPageChange: vi.fn(),
          },
          infiniteScroll: { hasMore: true, busy: true, onLoadMore: vi.fn() },
        })}
      />
    );
    expect(
      container.querySelector('[data-slot="data-table"]')?.getAttribute('aria-busy')
    ).toBeNull();
    expect(
      container.querySelector('[data-slot="data-table-pagination"]')?.getAttribute('aria-busy')
    ).toBe('true');
  });
});
