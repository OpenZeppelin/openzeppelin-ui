/**
 * SF-6 · Prop / state contract — INV-154 … INV-158, INV-112*.
 *
 * Negative arms use `@ts-expect-error` (two-way: unused directive is TS2578).
 */
import './sf4-jsdom-setup';

import { fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { logger } from '@openzeppelin/ui-utils';

import { DataTable } from '../data-table';
import type { DataTableInfiniteScroll, DataTableProps } from '../types';
import {
  captionTableProps,
  getTokenRowKey,
  numberedTokenRows,
  tokenColumns,
  untypedDataTableProps,
  type TokenRow,
} from './sf2-fixtures';

afterEach(() => {
  vi.restoreAllMocks();
});

function amountButton(container: HTMLElement): HTMLButtonElement {
  return container.querySelector('[data-column-id="amount"] button') as HTMLButtonElement;
}

function bodyLabels(container: HTMLElement): string[] {
  return [...container.querySelectorAll('[data-slot="data-table-row"]')].map(
    (row) => row.querySelector('[data-column-id="label"]')?.textContent ?? ''
  );
}

describe('INV-154: infiniteScroll is controlled intent with no feed/cursor/error slot', () => {
  it('requires hasMore + onLoadMore and accepts optional busy', () => {
    const config = {
      hasMore: true,
      onLoadMore: () => undefined,
      busy: false,
    } satisfies DataTableInfiniteScroll;
    expect(config.hasMore).toBe(true);
    type Present = Extract<keyof DataTableProps<TokenRow>, 'infiniteScroll'>;
    expectTypeOf<Present>().toEqualTypeOf<'infiniteScroll'>();
  });

  it('rejects totalCount, error, cursor callback args, and followOutput', () => {
    const total = {
      hasMore: true,
      onLoadMore: () => undefined,
      // @ts-expect-error INV-154: no infiniteScroll.totalCount
      totalCount: 500,
    } satisfies DataTableInfiniteScroll;
    const err = {
      hasMore: true,
      onLoadMore: () => undefined,
      // @ts-expect-error INV-154: no error slot
      error: 'failed',
    } satisfies DataTableInfiniteScroll;
    const follow = {
      hasMore: true,
      onLoadMore: () => undefined,
      // @ts-expect-error INV-154: no followOutput / chat stick-to-end
      followOutput: true,
    } satisfies DataTableInfiniteScroll;
    expect(total).toBeDefined();
    expect(err).toBeDefined();
    expect(follow).toBeDefined();
    expectTypeOf<DataTableInfiniteScroll['onLoadMore']>().toEqualTypeOf<() => void>();
  });
});

describe('INV-155: client sort of the growing buffer is skipped while infinite is active', () => {
  it('keeps integrator order and still fires onSortChange', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const onSortChange = vi.fn();
    const rows: TokenRow[] = [
      { id: 'c', label: 'Gamma', amount: 30n, status: 'Active' },
      { id: 'a', label: 'Alpha', amount: 10n, status: 'Active' },
      { id: 'b', label: 'Beta', amount: 20n, status: 'Active' },
    ];
    const { container, rerender } = render(
      <DataTable
        caption="Feed"
        columns={tokenColumns()}
        rows={rows}
        getRowKey={getTokenRowKey}
        onSortChange={onSortChange}
        infiniteScroll={{ hasMore: true, busy: true, onLoadMore: vi.fn() }}
      />
    );
    expect(bodyLabels(container)).toEqual(['Gamma', 'Alpha', 'Beta']);
    fireEvent.click(amountButton(container));
    expect(onSortChange).toHaveBeenCalled();
    expect(bodyLabels(container), 'INV-155: kit must not reorder a partial feed').toEqual([
      'Gamma',
      'Alpha',
      'Beta',
    ]);
    await waitFor(() => {
      const messages = errorSpy.mock.calls.map((call) => String(call[1]));
      expect(messages.filter((m) => m.includes('client sort is inert'))).toHaveLength(1);
    });
    rerender(
      <DataTable
        caption="Feed"
        columns={tokenColumns()}
        rows={rows}
        getRowKey={getTokenRowKey}
        onSortChange={onSortChange}
        infiniteScroll={{ hasMore: true, busy: true, onLoadMore: vi.fn() }}
      />
    );
    await waitFor(() => {
      const messages = errorSpy.mock.calls.map((call) => String(call[1]));
      expect(messages.filter((m) => m.includes('client sort is inert'))).toHaveLength(1);
    });
  });

  it('still sorts then slices under pager-wins client pagination', () => {
    const shuffled: TokenRow[] = [
      { id: 'c', label: 'Gamma', amount: 30n, status: 'Active' },
      { id: 'a', label: 'Alpha', amount: 10n, status: 'Active' },
      { id: 'b', label: 'Beta', amount: 20n, status: 'Active' },
    ];
    const { container } = render(
      <DataTable
        {...untypedDataTableProps({
          caption: 'Paged',
          columns: tokenColumns(),
          rows: shuffled,
          getRowKey: getTokenRowKey,
          defaultSort: { columnId: 'amount', direction: 'asc' },
          pagination: { kind: 'client', pageIndex: 0, pageSize: 1, onPageChange: vi.fn() },
          infiniteScroll: { hasMore: true, onLoadMore: vi.fn() },
        })}
      />
    );
    expect(bodyLabels(container)).toEqual(['Alpha']);
  });
});

describe('INV-156: bodyRows is the rows reference; append grows identity keys', () => {
  it('adds new data-row-key values when the app appends', () => {
    const onLoadMore = vi.fn();
    const { container, rerender } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(3),
          infiniteScroll: { hasMore: true, busy: true, onLoadMore },
        })}
      />
    );
    expect(
      [...container.querySelectorAll('[data-slot="data-table-row"]')].map((row) =>
        row.getAttribute('data-row-key')
      )
    ).toEqual(['r0', 'r1', 'r2']);
    rerender(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(5),
          infiniteScroll: { hasMore: true, busy: true, onLoadMore },
        })}
      />
    );
    expect(
      [...container.querySelectorAll('[data-slot="data-table-row"]')].map((row) =>
        row.getAttribute('data-row-key')
      )
    ).toEqual(['r0', 'r1', 'r2', 'r3', 'r4']);
  });
});

describe('INV-157: onLoadMore identity churn does not reset the generation guard', () => {
  it('does not storm when the parent passes a new inline callback', async () => {
    const first = vi.fn();
    const { rerender } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(3),
          virtualized: true,
          infiniteScroll: { hasMore: true, onLoadMore: first },
        })}
      />
    );
    await waitFor(() => {
      expect(first).toHaveBeenCalledTimes(1);
    });
    const second = vi.fn();
    rerender(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(3),
          virtualized: true,
          infiniteScroll: { hasMore: true, onLoadMore: second },
        })}
      />
    );
    await waitFor(() => {
      expect(first).toHaveBeenCalledTimes(1);
      expect(
        second,
        'INV-157: callback identity is not part of the generation key'
      ).not.toHaveBeenCalled();
    });
  });
});

describe('INV-158: integrator mistakes fail closed with a diagnostic, never throw', () => {
  it('logs pager-wins once in dev and does not throw', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const dual = untypedDataTableProps({
      ...captionTableProps({ rows: numberedTokenRows(12) }),
      pagination: {
        kind: 'client',
        pageIndex: 0,
        pageSize: 10,
        onPageChange: vi.fn(),
      },
      infiniteScroll: { hasMore: true, onLoadMore: vi.fn() },
    });
    const { rerender } = render(<DataTable {...dual} />);
    await waitFor(() => {
      const messages = errorSpy.mock.calls.map((call) => String(call[1]));
      expect(
        messages.filter((m) => m.includes('pagination and infiniteScroll cannot be combined'))
      ).toHaveLength(1);
    });
    rerender(<DataTable {...dual} />);
    await waitFor(() => {
      const messages = errorSpy.mock.calls.map((call) => String(call[1]));
      expect(
        messages.filter((m) => m.includes('pagination and infiniteScroll cannot be combined'))
      ).toHaveLength(1);
    });
  });
});
