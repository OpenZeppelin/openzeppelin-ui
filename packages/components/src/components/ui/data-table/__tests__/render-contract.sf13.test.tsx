/**
 * SF-13 · Render contract — INV-327 … INV-336, INV-361, INV-363 … INV-367, INV-216*.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';

import {
  DATA_TABLE_FRAME_CHROME,
  DATA_TABLE_PAGINATION_INSIDE_CHROME,
  DATA_TABLE_WRAPPER_CHROME,
} from '../chrome';
import { DataTable } from '../data-table';
import { DATA_TABLE_SELECT_COLUMN_ID } from '../types';

import './sf4-jsdom-setup';

import {
  captionTableProps,
  numberedTokenRows,
  TOKEN_ROWS,
  tokenColumns,
  type TokenRow,
} from './sf2-fixtures';

const FRAME = '[data-slot="data-table-frame"]';
const TOOLBAR = '[data-slot="data-table-toolbar"]';
const SCROLLER = '[data-slot="data-table"]';
const ROOT = '[data-slot="data-table-root"]';
const PAGER = '[data-slot="data-table-pagination"]';
const ROW = '[data-slot="data-table-row"]';
const SPACER = '[data-slot="data-table-spacer"]';
const SENTINEL = '[data-slot="data-table-infinite-sentinel"]';
const EMPTY = '[data-slot="data-table-empty"]';

function tokens(value: string): Set<string> {
  return new Set(value.split(/\s+/).filter(Boolean));
}

function hasAll(className: string | null | undefined, required: string): boolean {
  const actual = tokens(className ?? '');
  return [...tokens(required)].every((token) => actual.has(token));
}

function serverPage(extra?: { placement?: 'inside' | 'outside'; hideStatus?: boolean }) {
  return {
    kind: 'server' as const,
    pageIndex: 0,
    pageSize: 10,
    onPageChange: vi.fn(),
    ...extra,
  };
}

describe('INV-327 / INV-367: omitting SF-13 fields keeps today’s unframed tree', () => {
  it('omits frame and toolbar on unpaged and default-paged mounts', () => {
    const unpaged = render(<DataTable {...captionTableProps()} />);
    expect(unpaged.container.querySelector(FRAME)).toBeNull();
    expect(unpaged.container.querySelector(TOOLBAR)).toBeNull();
    expect(
      hasAll(unpaged.container.querySelector(SCROLLER)?.className, DATA_TABLE_WRAPPER_CHROME)
    ).toBe(true);

    const paged = render(<DataTable {...captionTableProps({ pagination: serverPage() })} />);
    expect(paged.container.querySelector(FRAME)).toBeNull();
    expect(paged.container.querySelector(ROOT)).not.toBeNull();
    const nav = paged.container.querySelector(PAGER);
    expect(nav).not.toBeNull();
    expect(paged.container.querySelector(SCROLLER)?.contains(nav)).toBe(false);

    const nested = render(
      <DataTable {...captionTableProps({ className: 'rounded-none border-0' })} />
    );
    expect(nested.container.querySelector(FRAME)).toBeNull();
    expect(nested.container.querySelector(SCROLLER)?.className).toContain('rounded-none');
  });
});

describe('INV-328 / INV-363: framed iff toolbar != null or placement inside', () => {
  it('frames toolbar-only, inside-only, both, and empty fragment; not null', () => {
    const toolbarOnly = render(
      <DataTable {...captionTableProps({ toolbar: <div>Filters</div> })} />
    );
    expect(toolbarOnly.container.querySelector(FRAME)).not.toBeNull();
    expect(toolbarOnly.container.querySelector(TOOLBAR)?.textContent).toBe('Filters');
    expect(
      hasAll(toolbarOnly.container.querySelector(FRAME)?.className, DATA_TABLE_FRAME_CHROME)
    ).toBe(true);
    expect(
      hasAll(toolbarOnly.container.querySelector(SCROLLER)?.className, DATA_TABLE_WRAPPER_CHROME)
    ).toBe(false);

    const insideOnly = render(
      <DataTable {...captionTableProps({ pagination: serverPage({ placement: 'inside' }) })} />
    );
    expect(insideOnly.container.querySelector(FRAME)).not.toBeNull();
    expect(insideOnly.container.querySelector(TOOLBAR)).toBeNull();
    expect(insideOnly.container.querySelector(ROOT)).toBeNull();

    const both = render(
      <DataTable
        {...captionTableProps({
          toolbar: <div>Filters</div>,
          pagination: serverPage({ placement: 'inside' }),
        })}
      />
    );
    expect(both.container.querySelectorAll(FRAME).length).toBe(1);
    expect(both.container.querySelectorAll('[class*="rounded-xl"]').length).toBeGreaterThan(0);
    expect(both.container.querySelector(SCROLLER)?.className.includes('rounded-xl')).toBe(false);

    const nullToolbar = render(<DataTable {...captionTableProps({ toolbar: null })} />);
    expect(nullToolbar.container.querySelector(FRAME)).toBeNull();

    const fragment = render(<DataTable {...captionTableProps({ toolbar: <></> })} />);
    expect(fragment.container.querySelector(FRAME)).not.toBeNull();
    expect(fragment.container.querySelector(TOOLBAR)).not.toBeNull();
  });
});

describe('INV-329: toolbar sits in the frame above the header, outside table', () => {
  it('hosts integrator copy as a previous sibling of the scroller, not in caption or thead', () => {
    const { container } = render(
      <DataTable {...captionTableProps({ toolbar: <label htmlFor="q">Search accounts</label> })} />
    );
    const frame = container.querySelector(FRAME);
    const toolbar = container.querySelector(TOOLBAR);
    const scroller = container.querySelector(SCROLLER);
    expect(frame?.firstElementChild).toBe(toolbar);
    expect(toolbar?.nextElementSibling).toBe(scroller);
    expect(container.querySelector('table')?.contains(toolbar)).toBe(false);
    expect(toolbar?.className).not.toContain('border-b');
    expect(container.querySelector('[data-slot="data-table-caption"]')?.textContent).toBe(
      'Tokenization requests'
    );
  });
});

describe('INV-330 / INV-220*: inside pager is a frame footer, never tfoot or scroller child', () => {
  it('places nav last in the frame and keeps data-table-root absent', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          toolbar: <div>Filters</div>,
          pagination: serverPage({ placement: 'inside' }),
          virtualized: true,
        })}
      />
    );
    const frame = container.querySelector(FRAME);
    const nav = container.querySelector(PAGER);
    expect(frame?.lastElementChild).toBe(nav);
    expect(container.querySelector(SCROLLER)?.contains(nav)).toBe(false);
    expect(container.querySelector('tfoot')).toBeNull();
    expect(container.querySelector(ROOT)).toBeNull();
    expect(hasAll(nav?.className, DATA_TABLE_PAGINATION_INSIDE_CHROME)).toBe(true);
    expect(nav?.className).not.toContain('bg-muted/50');
    expect(nav?.className).not.toContain('sticky');
  });
});

describe('INV-331: outside pager stays a sibling of the visible card', () => {
  it('keeps root + gap when toolbar frames but placement stays outside', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          toolbar: <div>Filters</div>,
          pagination: serverPage({ placement: 'outside' }),
        })}
      />
    );
    expect(container.querySelector(ROOT)).not.toBeNull();
    expect(container.querySelector(ROOT)?.className).toContain('gap-3');
    expect(container.querySelector(FRAME)?.contains(container.querySelector(PAGER))).toBe(false);
  });
});

describe('INV-332 / INV-368 / INV-366: unpaged framed tables have no pager; sentinel stays in scroller', () => {
  it('omits nav with toolbar-only and keeps infinite sentinel under data-table', () => {
    const noPage = render(<DataTable {...captionTableProps({ toolbar: <div>Filters</div> })} />);
    expect(noPage.container.querySelector(PAGER)).toBeNull();
    expect(noPage.container.querySelector(ROOT)).toBeNull();

    const infinite = render(
      <DataTable
        {...captionTableProps({
          toolbar: <div>Filters</div>,
          infiniteScroll: { hasMore: true, onLoadMore: vi.fn() },
          virtualized: true,
        })}
      />
    );
    const sentinel = infinite.container.querySelector(SENTINEL);
    expect(sentinel).not.toBeNull();
    expect(infinite.container.querySelector(SCROLLER)?.contains(sentinel)).toBe(true);
    expect(infinite.container.querySelector(FRAME)?.contains(sentinel)).toBe(true);
    expect(infinite.container.querySelector(TOOLBAR)?.contains(sentinel)).toBe(false);
  });
});

describe('INV-333: className follows the visible card; scrollRef stays on the scroller', () => {
  it('routes framed className to the frame and unframed to data-table', () => {
    const scrollRef = createRef<HTMLDivElement | null>();
    const framed = render(
      <DataTable
        {...captionTableProps({
          toolbar: <div>Filters</div>,
          className: 'rounded-lg',
          scrollRef,
        })}
      />
    );
    expect(framed.container.querySelector(FRAME)?.className).toContain('rounded-lg');
    expect(framed.container.querySelector(SCROLLER)?.className).not.toContain('rounded-lg');
    expect(scrollRef.current?.getAttribute('data-slot')).toBe('data-table');

    const unframed = render(
      <DataTable {...captionTableProps({ className: 'rounded-none border-0' })} />
    );
    expect(unframed.container.querySelector(SCROLLER)?.className).toContain('border-0');
  });
});

describe('INV-334 / INV-216*: chromeMode is exclusive; scroller never overflow-hidden', () => {
  it('paints card chrome on unframed scrollers and plain overflow on framed ones', () => {
    const unframed = render(<DataTable {...captionTableProps()} />);
    const unframedClass = unframed.container.querySelector(SCROLLER)?.className ?? '';
    expect(hasAll(unframedClass, DATA_TABLE_WRAPPER_CHROME)).toBe(true);
    expect(unframedClass).toContain('overflow-x-auto');
    expect(unframedClass).not.toContain('overflow-hidden');

    const framed = render(
      <DataTable {...captionTableProps({ toolbar: <div>Filters</div>, virtualized: true })} />
    );
    const framedScroller = framed.container.querySelector(SCROLLER)?.className ?? '';
    expect(framedScroller).toContain('overflow-auto');
    expect(framedScroller).not.toContain('overflow-hidden');
    expect(framed.container.querySelector(FRAME)?.className).toContain('overflow-hidden');
  });
});

describe('INV-335 / INV-364 / INV-219*: getRowClassName merges on data rows only', () => {
  it('applies the class on virt and non-virt data rows, never spacers/sentinel/empty', () => {
    const getRowClassName = vi.fn((_row: TokenRow) => 'hover:bg-muted/30');
    const full = render(
      <DataTable {...captionTableProps({ getRowClassName, rows: TOKEN_ROWS })} />
    );
    const dataRow = full.container.querySelector(ROW);
    expect(dataRow?.className).toContain('hover:bg-muted/30');
    expect(dataRow?.className).toContain('data-[state=selected]:bg-accent/30');
    expect(
      dataRow?.className.includes('hover:bg-accent/50'),
      'INV-219: integrator hover must win the same-group utility via cn'
    ).toBe(false);
    expect(getRowClassName).toHaveBeenCalledTimes(TOKEN_ROWS.length);

    getRowClassName.mockClear();
    const virt = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(200),
          columns: tokenColumns().map(
            ({ sortable: _sortable, getSortValue: _getSortValue, ...column }) => column
          ),
          virtualized: true,
          infiniteScroll: { hasMore: true, onLoadMore: vi.fn() },
          getRowClassName,
        })}
      />
    );
    const painted = virt.container.querySelectorAll(ROW).length;
    expect(painted).toBeGreaterThan(0);
    expect(painted).toBeLessThan(200);
    const paintedKeys = new Set(
      getRowClassName.mock.calls.map((call) => call[0]?.id).filter(Boolean)
    );
    expect(paintedKeys.size).toBeGreaterThan(0);
    expect(
      paintedKeys.size,
      'INV-335: callback identities stay in the virtual window, not the full 200'
    ).toBeLessThan(80);
    expect(getRowClassName.mock.calls.length).toBeLessThan(80);
    for (const spacer of virt.container.querySelectorAll(SPACER)) {
      expect(spacer.className).not.toContain('hover:bg-muted/30');
    }
    expect(virt.container.querySelector(SENTINEL)?.className ?? '').not.toContain(
      'hover:bg-muted/30'
    );

    getRowClassName.mockClear();
    const empty = render(<DataTable {...captionTableProps({ rows: [], getRowClassName })} />);
    expect(empty.container.querySelector(EMPTY)).not.toBeNull();
    expect(getRowClassName).not.toHaveBeenCalled();
    expect(empty.container.querySelector(EMPTY)?.className).not.toContain('hover:bg-muted/30');
  });
});

describe('INV-336 / INV-351: injected select column default w-12 then columnClassName', () => {
  it('keeps the select column leading and does not inject table-fixed', () => {
    const defaultSelect = render(
      <DataTable
        {...captionTableProps({
          selection: { selectedKeys: new Set(), onSelectionChange: vi.fn() },
        })}
      />
    );
    const defaultHeader = defaultSelect.container.querySelector(
      `th[data-column-id="${DATA_TABLE_SELECT_COLUMN_ID}"]`
    );
    const defaultCell = defaultSelect.container.querySelector(
      `td[data-column-id="${DATA_TABLE_SELECT_COLUMN_ID}"]`
    );
    expect(defaultHeader?.className).toContain('w-12');
    expect(defaultCell?.className).toContain('w-12');
    expect(defaultSelect.container.querySelector('table')?.className).not.toContain('table-fixed');

    const override = render(
      <DataTable
        {...captionTableProps({
          selection: {
            selectedKeys: new Set(),
            onSelectionChange: vi.fn(),
            columnClassName: 'w-10',
          },
        })}
      />
    );
    expect(
      override.container.querySelector(`th[data-column-id="${DATA_TABLE_SELECT_COLUMN_ID}"]`)
        ?.className
    ).toContain('w-10');
    const headers = [...override.container.querySelectorAll('thead th')].map((node) =>
      node.getAttribute('data-column-id')
    );
    expect(headers[0]).toBe(DATA_TABLE_SELECT_COLUMN_ID);
    expect(headers[1]).toBe('label');
  });
});

describe('INV-365: sticky seam stays on the scroller when framed', () => {
  it('sets data-sticky-header on data-table, not the frame', () => {
    const { container } = render(
      <DataTable {...captionTableProps({ toolbar: <div>Filters</div> })} />
    );
    expect(container.querySelector(SCROLLER)?.getAttribute('data-sticky-header')).toBe('true');
    expect(container.querySelector(FRAME)?.hasAttribute('data-sticky-header')).toBe(false);
  });
});
