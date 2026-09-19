/**
 * SF-6 · Interaction & transition — INV-159 … INV-162.
 * INV-163 (focus identity after append) is Chromium-owned.
 */
import './sf4-jsdom-setup';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';

import { DataTable } from '../data-table';
import { captionTableProps, getTokenRowKey, numberedTokenRows, tokenColumns } from './sf2-fixtures';

const DATA_TABLE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const TABLE_SOURCE = stripComments(readFileSync(join(DATA_TABLE_DIR, 'data-table.tsx'), 'utf8'));
const SCROLLER_SOURCE = stripComments(
  readFileSync(join(DATA_TABLE_DIR, 'data-table-scroller.tsx'), 'utf8')
);
const VIRT_SOURCE = stripComments(readFileSync(join(DATA_TABLE_DIR, 'virtualization.ts'), 'utf8'));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function stubOverflow(wrap: HTMLElement, scrollHeight: number, clientHeight: number): void {
  Object.defineProperty(wrap, 'scrollHeight', { configurable: true, value: scrollHeight });
  Object.defineProperty(wrap, 'clientHeight', { configurable: true, value: clientHeight });
}

describe('INV-159: onLoadMore runs after commit, never during DataTable render', () => {
  it('does not call onLoadMore from data-table.tsx (prop pass-through only)', () => {
    expect(TABLE_SOURCE).not.toMatch(/onLoadMore\s*\(/);
    expect(TABLE_SOURCE).toMatch(/onLoadMore=\{infiniteActive \? infiniteScroll\.onLoadMore/);
  });

  it('does not fire onLoadMore from a sort-header click while busy', () => {
    const onLoadMore = vi.fn();
    const { container } = render(
      <DataTable
        caption="Feed"
        columns={tokenColumns()}
        rows={numberedTokenRows(3)}
        getRowKey={getTokenRowKey}
        infiniteScroll={{ hasMore: true, busy: true, onLoadMore }}
      />
    );
    fireEvent.click(
      container.querySelector('[data-column-id="amount"] button') as HTMLButtonElement
    );
    expect(onLoadMore).not.toHaveBeenCalled();
  });
});

describe('INV-160: at most one fire per (hasMore, length) generation', () => {
  it('fires once for a short first page and ignores extra scroll frames', async () => {
    const onLoadMore = vi.fn();
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(3),
          virtualized: true,
          infiniteScroll: { hasMore: true, onLoadMore },
        })}
      />
    );
    await waitFor(() => {
      expect(
        onLoadMore,
        'INV-160: short-page ε must not deadlock the first chunk'
      ).toHaveBeenCalledTimes(1);
    });
    const wrap = container.querySelector('[data-slot="data-table"]') as HTMLElement;
    wrap.dispatchEvent(new Event('scroll'));
    wrap.dispatchEvent(new Event('scroll'));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('fires once for a short page even under Strict Mode remount', async () => {
    const onLoadMore = vi.fn();
    render(
      <StrictMode>
        <DataTable
          {...captionTableProps({
            rows: numberedTokenRows(3),
            virtualized: true,
            infiniteScroll: { hasMore: true, onLoadMore },
          })}
        />
      </StrictMode>
    );
    await waitFor(() => {
      expect(onLoadMore).toHaveBeenCalledTimes(1);
    });
  });

  it('becomes eligible again after length changes', async () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(3),
          virtualized: true,
          infiniteScroll: { hasMore: true, onLoadMore },
        })}
      />
    );
    await waitFor(() => {
      expect(onLoadMore).toHaveBeenCalledTimes(1);
    });
    rerender(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(4),
          virtualized: true,
          infiniteScroll: { hasMore: true, onLoadMore },
        })}
      />
    );
    await waitFor(() => {
      expect(onLoadMore).toHaveBeenCalledTimes(2);
    });
  });
});

describe('INV-161: busy suppresses re-entry; busy-clear refills only while still at end', () => {
  it('does not fire while busy, then fires when busy clears on a short page', async () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(3),
          virtualized: true,
          infiniteScroll: { hasMore: true, busy: true, onLoadMore },
        })}
      />
    );
    expect(onLoadMore).not.toHaveBeenCalled();
    rerender(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(3),
          virtualized: true,
          infiniteScroll: { hasMore: true, busy: false, onLoadMore },
        })}
      />
    );
    await waitFor(() => {
      expect(
        onLoadMore,
        'INV-161: busy-clear on a short page must request more'
      ).toHaveBeenCalled();
    });
    expect(onLoadMore.mock.calls.length).toBe(1);
  });

  it('does not immediately re-fire after busy-clear when the user has left the end', () => {
    const onLoadMore = vi.fn();
    const { container, rerender } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(3),
          infiniteScroll: { hasMore: true, busy: true, onLoadMore },
        })}
      />
    );
    const wrap = container.querySelector('[data-slot="data-table"]') as HTMLElement;
    stubOverflow(wrap, 2000, 400);
    rerender(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(3),
          infiniteScroll: { hasMore: true, busy: false, onLoadMore },
        })}
      />
    );
    expect(
      onLoadMore,
      'INV-161: scrolled-away viewport must wait until the sentinel is at end again'
    ).not.toHaveBeenCalled();
  });
});

describe('INV-162: append never writes scrollTop, never .focus(), never row tabIndex', () => {
  it('keeps forbidden APIs out of product sources', () => {
    for (const source of [TABLE_SOURCE, SCROLLER_SOURCE, VIRT_SOURCE]) {
      expect(source).not.toMatch(/followOnAppend/);
      expect(source).not.toMatch(/anchorTo/);
      expect(source).not.toMatch(/followOutput/);
      expect(source).not.toMatch(/\.scrollTop\s*=/);
    }
    expect(SCROLLER_SOURCE).not.toMatch(/\.focus\s*\(/);
    expect(TABLE_SOURCE).not.toMatch(/\.focus\s*\(/);
  });

  it('does not set tabIndex on wrapper, rows, or sentinel', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          infiniteScroll: { hasMore: true, busy: true, onLoadMore: vi.fn() },
        })}
      />
    );
    expect(container.querySelector('[data-slot="data-table"]')?.hasAttribute('tabIndex')).toBe(
      false
    );
    for (const row of container.querySelectorAll('[data-slot="data-table-row"]')) {
      expect(row.hasAttribute('tabIndex')).toBe(false);
    }
    expect(
      container
        .querySelector('[data-slot="data-table-infinite-sentinel"]')
        ?.hasAttribute('tabIndex')
    ).toBe(false);
  });
});
