/**
 * SF-13 · Performance / module graph — INV-348 … INV-351, INV-338, INV-361, INV-362.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';

import { DataTable } from '../data-table';
import { captionTableProps, numberedTokenRows, type TokenRow } from './sf2-fixtures';

import './sf4-jsdom-setup';

const DATA_TABLE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const TABLE_SOURCE = readFileSync(join(DATA_TABLE_DIR, 'data-table.tsx'), 'utf8');
const SCROLLER_SOURCE = readFileSync(join(DATA_TABLE_DIR, 'data-table-scroller.tsx'), 'utf8');
const CHROME_SOURCE = readFileSync(join(DATA_TABLE_DIR, 'chrome.ts'), 'utf8');

describe('INV-348: framed virtualization stays O(visible)', () => {
  it('mounts one toolbar, one nav, and ≪ 10k data rows', { timeout: 30_000 }, () => {
    const getRowClassName = vi.fn((_row: TokenRow) => 'hover:bg-muted/30');
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(10_000),
          toolbar: <div>Filters</div>,
          getRowClassName,
          virtualized: true,
          pagination: {
            kind: 'client',
            pageIndex: 0,
            pageSize: 10_000,
            onPageChange: vi.fn(),
            placement: 'inside',
          },
        })}
      />
    );
    expect(container.querySelectorAll('[data-slot="data-table-toolbar"]').length).toBe(1);
    expect(container.querySelectorAll('[data-slot="data-table-pagination"]').length).toBe(1);
    const mounted = container.querySelectorAll('[data-slot="data-table-row"]').length;
    expect(mounted).toBeGreaterThan(0);
    expect(mounted).toBeLessThan(80);
    const paintedKeys = new Set(getRowClassName.mock.calls.map((call) => call[0]?.id));
    expect(paintedKeys.size).toBeGreaterThan(0);
    expect(
      paintedKeys.size,
      'INV-348: callback identities stay in the painted window, not 10k'
    ).toBeLessThan(80);
    expect(getRowClassName.mock.calls.length).toBeLessThan(80);
  });
});

describe('INV-349: scrollRef and maxHeight stay on the scroller', () => {
  it('does not turn the frame into the virtualizer scrollport', () => {
    const scrollRef = createRef<HTMLDivElement | null>();
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(200),
          toolbar: <div>Filters</div>,
          virtualized: { maxHeight: 240 },
          scrollRef,
          pagination: {
            kind: 'client',
            pageIndex: 0,
            pageSize: 200,
            onPageChange: vi.fn(),
            placement: 'inside',
          },
        })}
      />
    );
    expect(scrollRef.current?.getAttribute('data-slot')).toBe('data-table');
    expect(scrollRef.current?.style.maxHeight).toBe('240px');
    expect(
      container.querySelector('[data-slot="data-table-frame"]')?.getAttribute('style')
    ).toBeNull();
  });
});

describe('INV-350: composition adds no extra observer construction in source', () => {
  it('keeps ResizeObserver / IntersectionObserver in the scroller only', () => {
    expect(TABLE_SOURCE).not.toMatch(/ResizeObserver|IntersectionObserver/);
    expect(SCROLLER_SOURCE).toMatch(/ResizeObserver/);
    expect(SCROLLER_SOURCE).toMatch(/IntersectionObserver/);
  });

  it('survives 100 framed+sticky+virt mount/unmount cycles', () => {
    for (let index = 0; index < 100; index += 1) {
      const view = render(
        <DataTable
          {...captionTableProps({
            rows: numberedTokenRows(40),
            toolbar: <div>Filters</div>,
            virtualized: true,
            pagination: {
              kind: 'client',
              pageIndex: 0,
              pageSize: 40,
              onPageChange: vi.fn(),
              placement: 'inside',
            },
          })}
        />
      );
      view.unmount();
    }
  });
});

describe('INV-338 / INV-351: no composition state and no table-fixed injection', () => {
  it('pins framed to a derived boolean and keeps table-fixed out of select injection', () => {
    expect(TABLE_SOURCE).toMatch(/const framed = toolbar != null \|\| paginationInside/);
    expect(TABLE_SOURCE).not.toMatch(/useState\([^)]*framed/);
    expect(TABLE_SOURCE).not.toMatch(/table-fixed/);
  });
});

describe('INV-361 / INV-362: closed-list tokens and no new production files', () => {
  it('names frame and in-frame pager chrome in chrome.ts', () => {
    expect(CHROME_SOURCE).toMatch(/export const DATA_TABLE_FRAME_CHROME/);
    expect(CHROME_SOURCE).toMatch(/export const DATA_TABLE_PAGINATION_INSIDE_CHROME/);
    expect(CHROME_SOURCE).toMatch(/export const DATA_TABLE_PAGINATION_HIDDEN_STATUS_CHROME/);
    expect(TABLE_SOURCE).not.toMatch(/border-t px-4 py-3/);
  });

  it('adds no production module and no Role Manager import', () => {
    const production = readdirSync(DATA_TABLE_DIR).filter(
      (name) => !name.startsWith('__') && !name.startsWith('.')
    );
    expect(production.sort()).toEqual(
      [
        'chrome.ts',
        'data-table-scroller.tsx',
        'data-table.tsx',
        'helpers.ts',
        'index.ts',
        'pagination-controls.tsx',
        'selection.ts',
        'sort.ts',
        'types.ts',
        'virtualization.ts',
      ].sort()
    );
    expect(TABLE_SOURCE).not.toMatch(/role-manager|AccountsFilterBar|ChangesFilterBar/i);
  });
});
