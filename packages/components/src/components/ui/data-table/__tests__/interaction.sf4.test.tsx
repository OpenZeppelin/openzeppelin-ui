/**
 * SF-4 · Interaction & transition — INV-130 … INV-133.
 */
import './sf4-jsdom-setup';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';

import { DataTable } from '../data-table';
import type { DataTableVirtualizationHandle } from '../types';
import { getTokenRowKey, numberedTokenRows, tokenColumns, type TokenRow } from './sf2-fixtures';

const DATA_TABLE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const actionColumns = [
  {
    id: 'act',
    header: 'Act',
    cell: (row: TokenRow) => (
      <button type="button" data-row={row.id}>
        Open
      </button>
    ),
  },
];

describe('INV-130: native focus survives within the overscan window', () => {
  it('keeps the focused row mounted after a small scroll', async () => {
    const rows = numberedTokenRows(200);
    const { container } = render(
      <DataTable
        caption="Focus overscan"
        columns={actionColumns}
        rows={rows}
        getRowKey={getTokenRowKey}
        virtualized={{ maxHeight: 120, overscan: 1, estimateSize: 36 }}
      />
    );
    const firstButton = container.querySelector('button[data-row]') as HTMLButtonElement | null;
    expect(firstButton).not.toBeNull();
    const focusedKey = firstButton?.getAttribute('data-row');
    firstButton?.focus();
    const wrap = container.querySelector('[data-slot="data-table"]') as HTMLElement;
    wrap.scrollTop = 40;
    fireEvent.scroll(wrap);
    await waitFor(() => {
      expect(
        container.querySelector(`[data-slot="data-table-row"][data-row-key="${focusedKey ?? ''}"]`),
        'INV-130: ordinary overscan keeps nearby focus in the DOM'
      ).not.toBeNull();
    });
    const mountedRows = [
      ...container.querySelectorAll<HTMLElement>('[data-slot="data-table-row"]'),
    ];
    const mountedIndices = mountedRows.map((row) => Number(row.dataset.index));
    expect(mountedRows.length).toBeLessThan(rows.length);
    expect(
      mountedIndices.every((index, position) => {
        const previous = mountedIndices[position - 1];
        return previous === undefined || index === previous + 1;
      })
    ).toBe(true);
    expect(
      container.querySelectorAll('[data-slot="data-table-spacer"]').length
    ).toBeLessThanOrEqual(2);
    expect(
      container.querySelector('[data-slot="data-table-row"]')?.getAttribute('tabindex')
    ).toBeNull();
  });

  it('does not call .focus in table/scroller product sources', () => {
    const table = stripComments(readFileSync(join(DATA_TABLE_DIR, 'data-table.tsx'), 'utf8'));
    const scroller = stripComments(
      readFileSync(join(DATA_TABLE_DIR, 'data-table-scroller.tsx'), 'utf8')
    );
    expect(table).not.toMatch(/\.focus\(/);
    expect(scroller).not.toMatch(/\.focus\(/);
    const pager = stripComments(
      readFileSync(join(DATA_TABLE_DIR, 'pagination-controls.tsx'), 'utf8')
    );
    expect(pager).toMatch(/\.focus\(/);
  });
});

describe('INV-131: imperative scroll targets bodyRows identity', () => {
  it('does not emit sort or page callbacks when scrollToRowKey runs', async () => {
    const onSortChange = vi.fn();
    const onPageChange = vi.fn();
    const ref = createRef<DataTableVirtualizationHandle | null>();
    const rows = numberedTokenRows(80);
    render(
      <DataTable
        caption="Scroll"
        columns={tokenColumns()}
        rows={rows}
        getRowKey={getTokenRowKey}
        onSortChange={onSortChange}
        pagination={{
          kind: 'client',
          pageIndex: 0,
          pageSize: 80,
          onPageChange,
        }}
        virtualized={{ maxHeight: 160, overscan: 2, estimateSize: 36 }}
        virtualizationRef={ref}
      />
    );
    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });
    expect(() => ref.current?.scrollToRowKey('r40', 'start')).not.toThrow();
    expect(onSortChange, 'INV-131: scroll is not a sort intent').not.toHaveBeenCalled();
    expect(onPageChange, 'INV-131: scroll is not a page intent').not.toHaveBeenCalled();
  });
});

describe('INV-132: useVirtualizer lives only in the scroller child', () => {
  it('keeps the hook out of data-table.tsx', () => {
    const table = stripComments(readFileSync(join(DATA_TABLE_DIR, 'data-table.tsx'), 'utf8'));
    const scroller = stripComments(
      readFileSync(join(DATA_TABLE_DIR, 'data-table-scroller.tsx'), 'utf8')
    );
    expect(table).not.toMatch(/useVirtualizer/);
    expect(scroller).toMatch(/useVirtualizer/);
  });
});

describe('INV-133: getScrollElement is the kit wrapper', () => {
  it('keeps the pager as a sibling outside the overflow host', () => {
    const { container } = render(
      <DataTable
        caption="Root"
        columns={tokenColumns()}
        rows={numberedTokenRows(40)}
        getRowKey={getTokenRowKey}
        pagination={{
          kind: 'client',
          pageIndex: 0,
          pageSize: 20,
          onPageChange: vi.fn(),
        }}
        virtualized
      />
    );
    const wrap = container.querySelector('[data-slot="data-table"]');
    const root = container.querySelector('[data-slot="data-table-root"]');
    const nav = container.querySelector('[data-slot="data-table-pagination"]');
    expect(root?.contains(wrap)).toBe(true);
    expect(wrap?.contains(nav)).toBe(false);
    expect(nav?.closest('[data-slot="data-table"]')).toBeNull();
  });
});
