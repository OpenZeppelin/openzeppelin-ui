/**
 * SF-9 · Render contract — INV-213 … INV-221, INV-227, INV-229.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  DATA_TABLE_CAPTION_CHROME,
  DATA_TABLE_CELL_CHROME,
  DATA_TABLE_HEAD_CHROME,
  DATA_TABLE_HEADER_CELL_CHROME,
  DATA_TABLE_ROW_CHROME,
  DATA_TABLE_WRAPPER_CHROME,
} from '../chrome';
import { DataTable } from '../data-table';

import './sf4-jsdom-setup';

import { captionTableProps, numberedTokenRows, TOKEN_ROWS, tokenColumns } from './sf2-fixtures';

const SLOT = {
  wrap: '[data-slot="data-table"]',
  caption: '[data-slot="data-table-caption"]',
  head: '[data-slot="data-table-head"]',
  headerCell: '[data-slot="data-table-header-cell"]',
  row: '[data-slot="data-table-row"]',
  cell: '[data-slot="data-table-cell"]',
  empty: '[data-slot="data-table-empty"]',
  spacer: '[data-slot="data-table-spacer"]',
  sentinel: '[data-slot="data-table-infinite-sentinel"]',
} as const;

function tokens(value: string): Set<string> {
  return new Set(value.split(/\s+/).filter(Boolean));
}

function expectTokens(element: Element | null, required: string, message: string): void {
  expect(element, `${message}: element must exist`).not.toBeNull();
  const actual = tokens(element?.getAttribute('class') ?? '');
  for (const token of tokens(required)) {
    expect(actual.has(token), `${message}: missing "${token}"`).toBe(true);
  }
}

describe('INV-213 / INV-214: Role Manager chrome is a closed internal token list', () => {
  it('pins every required token and excludes overflow ownership from chrome constants', () => {
    expect(tokens(DATA_TABLE_WRAPPER_CHROME)).toEqual(
      new Set(['rounded-xl', 'border', 'border-border', 'bg-card'])
    );
    expect(tokens(DATA_TABLE_CAPTION_CHROME)).toEqual(new Set(['sr-only']));
    expect(tokens(DATA_TABLE_HEAD_CHROME)).toEqual(new Set(['bg-muted/50', 'border-b']));
    expect(tokens(DATA_TABLE_HEADER_CELL_CHROME)).toEqual(
      new Set(['p-4', 'font-medium', 'text-muted-foreground', 'align-middle'])
    );
    expect(tokens(DATA_TABLE_CELL_CHROME)).toEqual(new Set(['p-4', 'align-middle']));
    expect(tokens(DATA_TABLE_ROW_CHROME)).toEqual(
      new Set([
        'border-b',
        'last:border-b-0',
        'transition-colors',
        'hover:bg-accent/50',
        'data-[state=selected]:bg-accent/30',
      ])
    );
    for (const chrome of [
      DATA_TABLE_WRAPPER_CHROME,
      DATA_TABLE_CAPTION_CHROME,
      DATA_TABLE_HEAD_CHROME,
      DATA_TABLE_HEADER_CELL_CHROME,
      DATA_TABLE_CELL_CHROME,
      DATA_TABLE_ROW_CHROME,
    ]) {
      expect(tokens(chrome).has('overflow-hidden'), 'INV-216: chrome must not own overflow').toBe(
        false
      );
    }
  });
});

describe('INV-215 … INV-219: default table paints chrome on semantic data nodes only', () => {
  it('renders hidden caption, card, header band, dense cells, divider, hover, and selected hook', () => {
    const { container, getByRole } = render(<DataTable {...captionTableProps()} />);

    expect(getByRole('table', { name: 'Tokenization requests' })).toBeTruthy();
    expectTokens(container.querySelector(SLOT.wrap), DATA_TABLE_WRAPPER_CHROME, 'INV-216 wrapper');
    expectTokens(
      container.querySelector(SLOT.caption),
      DATA_TABLE_CAPTION_CHROME,
      'INV-215 caption'
    );
    expect(container.querySelector(SLOT.caption)?.className).not.toContain('mb-2');
    expectTokens(container.querySelector(SLOT.head), DATA_TABLE_HEAD_CHROME, 'INV-217 thead');
    expectTokens(
      container.querySelector(SLOT.headerCell),
      DATA_TABLE_HEADER_CELL_CHROME,
      'INV-217 th'
    );
    expectTokens(container.querySelector(SLOT.cell), DATA_TABLE_CELL_CHROME, 'INV-217 td');
    expectTokens(container.querySelector(SLOT.row), DATA_TABLE_ROW_CHROME, 'INV-218 data row');
    expect(container.querySelector(SLOT.wrap)?.className).toContain('overflow-x-auto');
    expect(container.querySelector(SLOT.wrap)?.className).not.toContain('overflow-hidden');
  });

  it('keeps composed cell output as the direct td child without a kit density wrapper', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          columns: tokenColumns({ cell: (row) => <button type="button">Open {row.label}</button> }),
          rows: TOKEN_ROWS.slice(0, 1),
        })}
      />
    );
    const cell = container.querySelector(`${SLOT.cell}[data-column-id="label"]`);
    expect(cell?.children, 'INV-221: composed output is not wrapped').toHaveLength(1);
    expect(cell?.firstElementChild?.tagName).toBe('BUTTON');
  });

  it('allows not-sr-only to override the hidden-caption default on the caption alone', () => {
    const { container } = render(
      <DataTable {...captionTableProps({ captionClassName: 'not-sr-only caption-sentinel' })} />
    );
    const caption = container.querySelector(SLOT.caption);
    expect(caption?.className, 'INV-224: visible-caption escape hatch').toContain('not-sr-only');
    expect(tokens(caption?.className ?? '').has('sr-only')).toBe(false);
    expect(container.querySelector(SLOT.wrap)?.className).not.toContain('caption-sentinel');
  });
});

describe('INV-218 / INV-220 / INV-227 / INV-229: strategy states preserve chrome boundaries', () => {
  it('leaves the empty row unpainted while preserving wrapper and header chrome', () => {
    const { container } = render(<DataTable {...captionTableProps({ rows: [] })} />);
    expectTokens(container.querySelector(SLOT.wrap), DATA_TABLE_WRAPPER_CHROME, 'INV-229 wrapper');
    expectTokens(container.querySelector(SLOT.head), DATA_TABLE_HEAD_CHROME, 'INV-229 header');
    const empty = container.querySelector(SLOT.empty);
    expect(empty).not.toBeNull();
    expect(empty?.className).not.toContain('hover:bg-accent/50');
    expect(empty?.className).not.toContain('border-b');
  });

  it('keeps virtualized data dense but leaves spacer rows unpainted and shrink-wrapped', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(100),
          virtualized: { maxHeight: 128, overscan: 1 },
        })}
      />
    );
    const wrap = container.querySelector<HTMLElement>(SLOT.wrap);
    expect(wrap?.className).toContain('overflow-auto');
    expect(wrap?.className).not.toContain('overflow-hidden');
    expect(wrap?.style.maxHeight, 'INV-227: max-height cap').toBe('128px');
    expect(wrap?.style.height, 'INV-227: no fixed height').toBe('');
    expect(wrap?.style.minHeight, 'INV-227: no hollow minimum height').toBe('');
    expectTokens(container.querySelector(SLOT.row), DATA_TABLE_ROW_CHROME, 'INV-229 virtual row');
    for (const spacer of container.querySelectorAll(SLOT.spacer)) {
      expect(spacer.className).not.toContain('hover:bg-accent/50');
      expect(spacer.className).not.toContain('border-b');
    }
  });

  it('leaves the infinite sentinel unpainted while data rows keep the shared chrome', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          virtualized: { maxHeight: 384, overscan: 8 },
          infiniteScroll: { hasMore: true, onLoadMore: vi.fn() },
        })}
      />
    );
    expectTokens(container.querySelector(SLOT.row), DATA_TABLE_ROW_CHROME, 'INV-229 infinite row');
    const sentinel = container.querySelector(SLOT.sentinel);
    expect(
      sentinel,
      'INV-218: virtual infinite sentinel mounts in the initial window'
    ).not.toBeNull();
    expect(sentinel?.className).not.toContain('hover:bg-accent/50');
    expect(sentinel?.className).not.toContain('border-b');
  });

  it('keeps pagination navigation outside the bordered scroll wrapper', () => {
    const { container, getByRole } = render(
      <DataTable
        {...captionTableProps({
          pagination: {
            kind: 'client',
            pageIndex: 0,
            pageSize: 2,
            onPageChange: vi.fn(),
          },
        })}
      />
    );
    const wrap = container.querySelector(SLOT.wrap);
    const nav = getByRole('navigation', { name: 'Pagination' });
    expectTokens(wrap, DATA_TABLE_WRAPPER_CHROME, 'INV-220 paginated wrapper');
    expect(wrap?.contains(nav), 'INV-220: pager must remain a sibling').toBe(false);
  });
});
