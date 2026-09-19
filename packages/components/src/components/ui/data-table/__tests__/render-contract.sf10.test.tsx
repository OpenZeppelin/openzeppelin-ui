/**
 * SF-10 · Render contract — INV-262 … INV-274, INV-289, INV-296 … INV-298.
 */
import './sf4-jsdom-setup';

import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  DATA_TABLE_HEAD_CHROME,
  DATA_TABLE_HEADER_CELL_CHROME,
  DATA_TABLE_HEADER_CELL_STICKY_CHROME,
} from '../chrome';
import { DataTable } from '../data-table';
import { captionTableProps, numberedTokenRows, tokenColumns } from './sf2-fixtures';

const STICKY_TOKENS = [
  'sticky',
  'top-0',
  'z-20',
  'bg-[color-mix(in_oklab,var(--muted)_50%,var(--card))]',
] as const;

function classTokens(element: Element | null): Set<string> {
  return new Set((element?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean));
}

function expectStickyHeaderCell(element: Element): void {
  const actual = classTokens(element);
  for (const token of STICKY_TOKENS) {
    expect(actual.has(token), `INV-262: header cell is missing "${token}"`).toBe(true);
  }
  for (const token of DATA_TABLE_HEADER_CELL_CHROME.split(/\s+/)) {
    expect(actual.has(token), `INV-267: header cell lost base chrome "${token}"`).toBe(true);
  }
}

describe('INV-266 / INV-267 / INV-298: sticky chrome is closed and separate', () => {
  it('pins the sticky and SF-9 base constants without overflow ownership', () => {
    expect(DATA_TABLE_HEADER_CELL_STICKY_CHROME).toBe(
      'sticky top-0 z-20 bg-[color-mix(in_oklab,var(--muted)_50%,var(--card))]'
    );
    expect(DATA_TABLE_HEADER_CELL_CHROME).toBe(
      'p-4 font-medium text-muted-foreground align-middle'
    );
    expect(DATA_TABLE_HEADER_CELL_STICKY_CHROME).not.toContain('bg-muted/50');
    expect(DATA_TABLE_HEADER_CELL_STICKY_CHROME).not.toMatch(/(^|\s)bg-muted(\s|$)/);
    expect(DATA_TABLE_HEADER_CELL_STICKY_CHROME).not.toContain('overflow-hidden');
  });
});

describe('INV-262 / INV-264 / INV-272: sticky is default-on for every header cell', () => {
  it.each([
    { name: 'omitted', stickyHeader: undefined },
    { name: 'explicit true', stickyHeader: true },
  ])('$name resolves to sticky-on, including the select-all column', ({ stickyHeader }) => {
    const props =
      stickyHeader === undefined
        ? captionTableProps({
            selection: { selectedKeys: new Set(), onSelectionChange: vi.fn() },
          })
        : {
            ...captionTableProps({
              selection: { selectedKeys: new Set(), onSelectionChange: vi.fn() },
            }),
            stickyHeader,
          };
    const { container } = render(<DataTable {...props} />);
    const wrapper = container.querySelector('[data-slot="data-table"]');
    expect(wrapper?.getAttribute('data-sticky-header')).toBe('true');
    const headerCells = container.querySelectorAll('[data-slot="data-table-header-cell"]');
    expect(headerCells).toHaveLength(tokenColumns().length + 1);
    for (const cell of headerCells) {
      expectStickyHeaderCell(cell);
    }
  });

  it('keeps sticky chrome on the mounted header of an empty table', () => {
    const { container } = render(<DataTable {...captionTableProps({ rows: [] })} />);
    expect(container.querySelector('[data-slot="data-table-empty"]')).not.toBeNull();
    for (const cell of container.querySelectorAll('[data-slot="data-table-header-cell"]')) {
      expectStickyHeaderCell(cell);
    }
  });

  it('preserves sticky tokens when an unrelated headerClassName is merged', () => {
    const columns = tokenColumns().map((column) =>
      column.id === 'label' ? { ...column, headerClassName: 'header-sentinel' } : column
    );
    const { container } = render(<DataTable {...captionTableProps({ columns })} />);
    const cell = container.querySelector('[data-column-id="label"]');
    expect(classTokens(cell).has('header-sentinel')).toBe(true);
    expectStickyHeaderCell(cell!);
  });
});

describe('INV-263 / INV-268: opt-out restores the scrolling SF-9 header', () => {
  it('emits zero kit sticky positioning tokens and keeps the thead band', () => {
    const { container } = render(<DataTable {...captionTableProps()} stickyHeader={false} />);
    const wrapper = container.querySelector('[data-slot="data-table"]');
    expect(wrapper?.getAttribute('data-sticky-header')).toBe('false');
    const head = container.querySelector('[data-slot="data-table-head"]');
    expect(classTokens(head)).toEqual(new Set(DATA_TABLE_HEAD_CHROME.split(/\s+/)));
    for (const element of container.querySelectorAll('[data-slot]')) {
      const actual = classTokens(element);
      for (const token of ['sticky', 'top-0', 'z-20']) {
        expect(
          actual.has(token),
          `INV-263: opt-out leaked "${token}" onto ${element.getAttribute('data-slot')}`
        ).toBe(false);
      }
    }
  });
});

describe('INV-269 / INV-270 / INV-281 / INV-285 / INV-290: strategy boundaries stay put', () => {
  it('keeps one native table and does not force a vertical cap on P1', () => {
    const { container } = render(<DataTable {...captionTableProps()} />);
    const wrapper = container.querySelector<HTMLElement>('[data-slot="data-table"]');
    expect(container.querySelectorAll('table')).toHaveLength(1);
    expect(container.querySelectorAll('thead')).toHaveLength(1);
    expect(wrapper?.className).toContain('overflow-x-auto');
    expect(wrapper?.style.maxHeight).toBe('');
    expect(wrapper?.querySelector(':scope > table')).not.toBeNull();
  });

  it('keeps pager, spacers, and infinite sentinel outside the sticky exception', () => {
    const { container, getByRole } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(100),
          pagination: {
            kind: 'client',
            pageIndex: 0,
            pageSize: 80,
            onPageChange: vi.fn(),
          },
          virtualized: { maxHeight: 128, overscan: 1 },
        })}
      />
    );
    const wrapper = container.querySelector('[data-slot="data-table"]');
    const nav = getByRole('navigation', { name: 'Pagination' });
    expect(wrapper?.contains(nav)).toBe(false);
    expect(nav.hasAttribute('data-sticky-header')).toBe(false);
    expect(classTokens(nav).has('sticky')).toBe(false);
    for (const spacer of container.querySelectorAll('[data-slot="data-table-spacer"]')) {
      expect(classTokens(spacer).has('sticky')).toBe(false);
    }
  });

  it('does not apply sticky tokens to an infinite-scroll sentinel', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          infiniteScroll: { hasMore: true, busy: true, onLoadMore: vi.fn() },
        })}
      />
    );
    const sentinel = container.querySelector('[data-slot="data-table-infinite-sentinel"]');
    expect(sentinel).not.toBeNull();
    expect(classTokens(sentinel).has('sticky')).toBe(false);
  });
});
