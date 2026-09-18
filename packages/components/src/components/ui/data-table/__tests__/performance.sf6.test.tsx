/**
 * SF-6 · Performance / scalability / stability — INV-164 … INV-167.
 */
import './sf4-jsdom-setup';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Component, type ReactNode } from 'react';

import { DataTable } from '../data-table';
import {
  captionTableProps,
  getTokenRowKey,
  numberedTokenRows,
  tokenColumns,
  type TokenRow,
} from './sf2-fixtures';

const DATA_TABLE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const TABLE_SOURCE = readFileSync(join(DATA_TABLE_DIR, 'data-table.tsx'), 'utf8');
const SCROLLER_SOURCE = readFileSync(join(DATA_TABLE_DIR, 'data-table-scroller.tsx'), 'utf8');

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('INV-164: growing feeds stay windowed', () => {
  it('mounts ≪ 10k data rows plus at most one sentinel', { timeout: 30_000 }, () => {
    const rows = numberedTokenRows(10_000);
    const { container } = render(
      <DataTable
        caption="Feed scale"
        columns={tokenColumns()}
        rows={rows}
        getRowKey={getTokenRowKey}
        virtualized
        infiniteScroll={{ hasMore: true, onLoadMore: vi.fn() }}
      />
    );
    const mounted = container.querySelectorAll('[data-slot="data-table-row"]').length;
    expect(mounted, 'INV-164: windowed mount, not O(N)').toBeLessThan(80);
    expect(mounted).toBeGreaterThan(0);
    expect(
      container.querySelectorAll('[data-slot="data-table-infinite-sentinel"]').length
    ).toBeLessThanOrEqual(1);
    expect(
      container.querySelectorAll('[data-slot="data-table-spacer"]').length
    ).toBeLessThanOrEqual(2);
  });

  it('does not clone rows in the paint path', () => {
    expect(stripComments(TABLE_SOURCE)).not.toMatch(/\[\.\.\.rows\]/);
    expect(stripComments(SCROLLER_SOURCE)).not.toMatch(/\[\.\.\.bodyRows\]/);
  });
});

describe('INV-165: observer disconnects; cell never runs for the sentinel', () => {
  it('disconnects IntersectionObserver on unmount', () => {
    const disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        public observe(): void {}
        public unobserve(): void {}
        public disconnect(): void {
          disconnect();
        }
      }
    );
    const { unmount } = render(
      <DataTable
        {...captionTableProps({
          infiniteScroll: { hasMore: true, busy: true, onLoadMore: vi.fn() },
        })}
      />
    );
    unmount();
    expect(disconnect, 'INV-165: leftover observers must not keep fetching').toHaveBeenCalled();
  });

  it('does not invoke column.cell for the sentinel index', () => {
    const cell = vi.fn((row: TokenRow) => row.label);
    const columns = tokenColumns({ cell });
    const rows = numberedTokenRows(4);
    render(
      <DataTable
        caption="Spy"
        columns={columns}
        rows={rows}
        getRowKey={getTokenRowKey}
        virtualized={{ maxHeight: 384, overscan: 8 }}
        infiniteScroll={{ hasMore: true, busy: true, onLoadMore: vi.fn() }}
      />
    );
    expect(cell.mock.calls.length).toBeGreaterThan(0);
    expect(
      cell.mock.calls.every(
        ([row]) => row !== undefined && rows.some((candidate) => candidate === row)
      ),
      'INV-165: cell is never invoked for a synthetic sentinel row'
    ).toBe(true);
    expect(new Set(cell.mock.calls.map(([row]) => row.id)).size).toBe(rows.length);
  });

  it('does not call onLoadMore after unmount even if a stale IO callback runs', async () => {
    const callbacks: IntersectionObserverCallback[] = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        public constructor(callback: IntersectionObserverCallback) {
          callbacks.push(callback);
        }
        public observe(): void {}
        public unobserve(): void {}
        public disconnect(): void {}
      }
    );
    const onLoadMore = vi.fn();
    const { unmount } = render(
      <DataTable
        {...captionTableProps({
          infiniteScroll: { hasMore: true, busy: true, onLoadMore },
        })}
      />
    );
    expect(onLoadMore).not.toHaveBeenCalled();
    unmount();
    const entry = { isIntersecting: true } as IntersectionObserverEntry;
    for (const callback of callbacks) {
      callback([entry], {} as IntersectionObserver);
    }
    await waitFor(() => {
      expect(onLoadMore).not.toHaveBeenCalled();
    });
  });
});

describe('INV-166: TanStack pin; chat follow APIs absent', () => {
  it('does not mention followOnAppend or Virtuoso followOutput in product sources', () => {
    expect(stripComments(SCROLLER_SOURCE)).not.toMatch(/followOnAppend/);
    expect(stripComments(SCROLLER_SOURCE)).not.toMatch(/anchorTo/);
    expect(stripComments(TABLE_SOURCE)).not.toMatch(/react-virtuoso/);
  });
});

describe('INV-167: onLoadMore throws propagate; kit paths do not throw', () => {
  class TestBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    public state = { failed: false };
    public static getDerivedStateFromError(): { failed: boolean } {
      return { failed: true };
    }
    public render(): ReactNode {
      return this.state.failed ? <div>fell</div> : this.props.children;
    }
  }

  it('does not wrap tryRequestMore in try/catch', () => {
    expect(stripComments(SCROLLER_SOURCE)).not.toMatch(/try\s*\{/);
    expect(stripComments(TABLE_SOURCE)).not.toMatch(/try\s*\{/);
  });

  it('lets a throwing onLoadMore reach an error boundary from the post-commit path', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onLoadMore = () => {
      throw new Error('load-bug');
    };
    const { container } = render(
      <TestBoundary>
        <DataTable
          {...captionTableProps({
            rows: numberedTokenRows(2),
            infiniteScroll: { hasMore: true, onLoadMore },
          })}
        />
      </TestBoundary>
    );
    await waitFor(() => {
      expect(container.textContent).toContain('fell');
    });
  });

  it('does not throw when pagination ∩ infinite', () => {
    expect(() =>
      render(
        <DataTable
          {...captionTableProps({
            pagination: {
              kind: 'client',
              pageIndex: 0,
              pageSize: 10,
              onPageChange: vi.fn(),
            },
            infiniteScroll: { hasMore: true, onLoadMore: vi.fn() },
          })}
        />
      )
    ).not.toThrow();
  });
});
