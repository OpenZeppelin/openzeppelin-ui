/**
 * SF-5 · Performance / scalability / stability — INV-108 … INV-110.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

import { DataTable } from '../data-table';
import { sliceClientPage } from '../helpers';
import {
  captionTableProps,
  getTokenRowKey,
  numberedTokenRows,
  tokenColumns,
  type TokenRow,
} from './sf2-fixtures';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_TABLE_SOURCE = readFileSync(join(DIR, 'data-table.tsx'), 'utf8');
const SCROLLER_SOURCE = readFileSync(join(DIR, 'data-table-scroller.tsx'), 'utf8');
const HELPERS_SOURCE = readFileSync(join(DIR, 'helpers.ts'), 'utf8');
const PAGER_SOURCE = readFileSync(join(DIR, 'pagination-controls.tsx'), 'utf8');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('INV-108: client paging cost is the window, not the universe', () => {
  it('mounts pageSize data rows for a 10k client list', () => {
    const rows = numberedTokenRows(10_000);
    const cellFns = tokenColumns().map((column) => ({
      ...column,
      cell: vi.fn((row: TokenRow) => String(column.cell(row))),
    }));
    const getRowKey = vi.fn((row: TokenRow) => row.id);
    const { container } = render(
      <DataTable
        caption="Scale"
        columns={cellFns}
        rows={rows}
        getRowKey={getRowKey}
        pagination={{ kind: 'client', pageIndex: 0, pageSize: 10, onPageChange: vi.fn() }}
      />
    );
    expect(container.querySelectorAll('[data-slot="data-table-row"]').length).toBe(10);
    for (const column of cellFns) {
      expect(column.cell, 'INV-48*: cell once per bodyRows').toHaveBeenCalledTimes(10);
    }
    expect(getRowKey, 'INV-48*: getRowKey once per body row').toHaveBeenCalledTimes(10);
    expect(rows).toHaveLength(10_000);
  });

  it('keeps slice( only in sliceClientPage and does not copy rows in the table file', () => {
    expect(HELPERS_SOURCE).toMatch(/rows\.slice\(/);
    expect(DATA_TABLE_SOURCE).not.toMatch(/rows\.slice/);
    expect(DATA_TABLE_SOURCE).not.toMatch(/\[\.\.\.rows/);
    expect(HELPERS_SOURCE).not.toMatch(/\[\.\.\.rows/);
    expect(HELPERS_SOURCE).not.toMatch(/\.sort\(/);
    const sample = numberedTokenRows(3);
    const windowed = sliceClientPage(sample, 0, 1);
    expect(windowed[0]).toBe(sample[0]);
  });
});

describe('INV-109: focus rescue is commit-phase; SSR stays safe', () => {
  it('does not read document during pagination-controls render', () => {
    const jsx = PAGER_SOURCE.slice(PAGER_SOURCE.lastIndexOf('return ('));
    expect(jsx, 'INV-109: document.activeElement stays out of the JSX path').not.toMatch(
      /document\.activeElement/
    );
    expect(DATA_TABLE_SOURCE).not.toMatch(/document\.activeElement/);
    expect(PAGER_SOURCE).toMatch(/useLayoutEffect/);
    expect(PAGER_SOURCE).toMatch(/document\.activeElement/);
    expect(PAGER_SOURCE).not.toMatch(/\buseState\b/);
  });

  it('renderToString succeeds for a paginated table', () => {
    const html = renderToString(
      <DataTable
        {...captionTableProps({
          pagination: { kind: 'client', pageIndex: 0, pageSize: 10, onPageChange: () => undefined },
        })}
      />
    );
    expect(html).toContain('data-slot="data-table-pagination"');
    expect(html).toContain('Tokenization requests');
  });

  it('status is not a sequential tab stop until rescue', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          pagination: { kind: 'client', pageIndex: 0, pageSize: 10, onPageChange: vi.fn() },
        })}
      />
    );
    const status = container.querySelector('[data-slot="data-table-pagination-status"]');
    expect(status?.getAttribute('tabindex')).toBe('-1');
  });

  it('survives 100 mount/unmount cycles', () => {
    for (let index = 0; index < 100; index += 1) {
      const view = render(
        <DataTable
          caption="T"
          columns={tokenColumns()}
          rows={numberedTokenRows(3)}
          getRowKey={getTokenRowKey}
          pagination={{ kind: 'client', pageIndex: 0, pageSize: 2, onPageChange: vi.fn() }}
        />
      );
      view.unmount();
    }
    expect(true).toBe(true);
  });
});

describe('INV-110: a single unvirtualized bodyRows map lives in the scroller', () => {
  it('maps bodyRows exactly once on the P1 tbody path', () => {
    expect([...DATA_TABLE_SOURCE.matchAll(/bodyRows\.map/g)]).toHaveLength(0);
    expect(
      [...SCROLLER_SOURCE.matchAll(/bodyRows\.map/g)].length,
      'INV-97: exactly one unvirtualized body-row loop'
    ).toBe(1);
    expect(DATA_TABLE_SOURCE).not.toMatch(/from\s+['"]\.\.\/button['"]/);
    expect(DATA_TABLE_SOURCE).not.toMatch(/from\s+['"]@tanstack\/react-virtual['"]/);
    expect(SCROLLER_SOURCE).toMatch(/from\s+['"]@tanstack\/react-virtual['"]/);
  });
});
