/**
 * SF-6 · Async / loading / error / empty — INV-168 … INV-170, SC-006.
 */
import './sf4-jsdom-setup';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DataTable } from '../data-table';
import {
  captionTableProps,
  getTokenRowKey,
  numberedTokenRows,
  TOKEN_ROWS,
  tokenColumns,
} from './sf2-fixtures';

const DATA_TABLE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('INV-168: busy means in-flight append — keep rows, no kit spinner', () => {
  it('keeps data rows visible and does not re-enter onLoadMore', () => {
    const onLoadMore = vi.fn();
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: TOKEN_ROWS,
          infiniteScroll: { hasMore: true, busy: true, onLoadMore },
        })}
      />
    );
    expect(container.querySelectorAll('[data-slot="data-table-row"]').length).toBe(
      TOKEN_ROWS.length
    );
    expect(container.querySelector('[data-slot="data-table-empty"]')).toBeNull();
    expect(container.textContent).not.toMatch(/Nothing to show/);
    expect(onLoadMore).not.toHaveBeenCalled();
  });
});

describe('INV-169: failed append is retry-by-intent; columns stay mounted', () => {
  it('keeps header column ids across a busy cycle and can fire again at end', async () => {
    const onLoadMore = vi.fn();
    const { container, rerender } = render(
      <DataTable
        caption="Retry"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        infiniteScroll={{ hasMore: true, busy: false, onLoadMore }}
      />
    );
    await waitFor(() => {
      expect(onLoadMore).toHaveBeenCalledTimes(1);
    });
    const headerIds = [...container.querySelectorAll('thead [data-column-id]')].map((node) =>
      node.getAttribute('data-column-id')
    );
    expect(headerIds).toEqual(['label', 'amount', 'status']);
    expect(container.querySelector('[data-slot="data-table-infinite-sentinel"]')).not.toBeNull();
    rerender(
      <DataTable
        caption="Retry"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        infiniteScroll={{ hasMore: true, busy: true, onLoadMore }}
      />
    );
    rerender(
      <DataTable
        caption="Retry"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        infiniteScroll={{ hasMore: true, busy: false, onLoadMore }}
      />
    );
    expect(
      [...container.querySelectorAll('thead [data-column-id]')].map((node) =>
        node.getAttribute('data-column-id')
      )
    ).toEqual(headerIds);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    await waitFor(() => {
      expect(
        onLoadMore,
        'INV-169: consumed generation reopens after failed busy cycle'
      ).toHaveBeenCalledTimes(2);
    });
  });
});

describe('INV-170 / SC-006: zero kit-level fetch', () => {
  it('never calls fetch when the sentinel is eligible', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const onLoadMore = vi.fn();
    render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(3),
          infiniteScroll: { hasMore: true, onLoadMore },
        })}
      />
    );
    await waitFor(() => {
      expect(onLoadMore).toHaveBeenCalledTimes(1);
    });
    expect(fetchSpy, 'INV-170: onLoadMore is intent only').not.toHaveBeenCalled();
    for (const file of [
      'data-table.tsx',
      'data-table-scroller.tsx',
      'virtualization.ts',
      'types.ts',
    ] as const) {
      const source = stripComments(readFileSync(join(DATA_TABLE_DIR, file), 'utf8'));
      expect(source).not.toMatch(/\bfetch\s*\(/);
      expect(source).not.toMatch(/useInfiniteQuery/);
      expect(source).not.toMatch(/@tanstack\/react-query/);
      expect(source).not.toMatch(/\bSWR\b/);
    }
  });
});
