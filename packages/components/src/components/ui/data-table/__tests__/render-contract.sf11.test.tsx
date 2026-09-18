/**
 * SF-11 · Render contract — INV-232 … INV-238, INV-255.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  DATA_TABLE_HEAD_CHROME,
  DATA_TABLE_PAGINATION_CHROME,
  DATA_TABLE_PAGINATION_PAGES_CHROME,
  DATA_TABLE_PAGINATION_ROOT_CHROME,
  DATA_TABLE_WRAPPER_CHROME,
} from '../chrome';
import { DataTable } from '../data-table';
import { captionTableProps, numberedTokenRows, TOKEN_ROWS } from './sf2-fixtures';

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

describe('INV-232: numbered controls exist iff totalKnown', () => {
  it('renders a bounded window for client and finite-total server pagination', () => {
    const client = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(200),
          pagination: { kind: 'client', pageIndex: 10, pageSize: 10, onPageChange: vi.fn() },
        })}
      />
    );
    expect(
      client.container.querySelectorAll('[data-slot="data-table-pagination-page"]').length
    ).toBe(5);
    expect(
      client.container.querySelectorAll('[data-slot="data-table-pagination-ellipsis"]').length
    ).toBe(2);
    client.unmount();

    const server = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(10),
          pagination: {
            kind: 'server',
            pageIndex: 10,
            pageSize: 10,
            totalCount: 200,
            onPageChange: vi.fn(),
          },
        })}
      />
    );
    expect(
      server.container.querySelectorAll('[data-slot="data-table-pagination-page"]').length
    ).toBe(5);
  });

  it('hides numbers and ellipsis when server total is omitted or invalid', () => {
    const omitted = render(
      <DataTable
        {...captionTableProps({
          pagination: { kind: 'server', pageIndex: 0, pageSize: 10, onPageChange: vi.fn() },
        })}
      />
    );
    expect(
      omitted.container.querySelectorAll('[data-slot="data-table-pagination-page"]').length
    ).toBe(0);
    expect(
      omitted.container.querySelectorAll('[data-slot="data-table-pagination-ellipsis"]').length
    ).toBe(0);
    expect(
      omitted.container.querySelector('[data-slot="data-table-pagination-previous"]')
    ).not.toBeNull();
    expect(
      omitted.container.querySelector('[data-slot="data-table-pagination-next"]')
    ).not.toBeNull();
    omitted.unmount();

    const invalid = render(
      <DataTable
        {...captionTableProps({
          pagination: {
            kind: 'server',
            pageIndex: 0,
            pageSize: 10,
            totalCount: Number.NaN,
            onPageChange: vi.fn(),
          },
        })}
      />
    );
    expect(
      invalid.container.querySelectorAll('[data-slot="data-table-pagination-page"]').length,
      'INV-232: invalid total must not fabricate page buttons'
    ).toBe(0);
  });
});

describe('INV-233 / INV-235: 1-based names, 0-based data-page-index, aria-current', () => {
  it('labels index 10 as 11 and marks only the matching current page', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(200),
          pagination: { kind: 'client', pageIndex: 10, pageSize: 10, onPageChange: vi.fn() },
        })}
      />
    );
    const current = container.querySelector(
      '[data-slot="data-table-pagination-page"][data-page-index="10"]'
    );
    expect(current?.textContent).toBe('11');
    expect(current?.getAttribute('aria-current')).toBe('page');
    expect((current as HTMLButtonElement | null)?.disabled).toBe(false);
    expect(screen.queryByRole('button', { name: '0' })).toBeNull();
    expect(
      container.querySelectorAll('[data-slot="data-table-pagination-page"][aria-current="page"]')
        .length
    ).toBe(1);
  });

  it('sets no aria-current when pageIndex is out of range', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(200),
          pagination: { kind: 'client', pageIndex: 99, pageSize: 10, onPageChange: vi.fn() },
        })}
      />
    );
    expect(
      container.querySelectorAll('[data-slot="data-table-pagination-page"][aria-current="page"]')
        .length,
      'INV-235: OOR must not paint aria-current on a clustered neighbour'
    ).toBe(0);
  });

  it('keeps the current number enabled on a one-page table', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          pagination: { kind: 'client', pageIndex: 0, pageSize: 10, onPageChange: vi.fn() },
        })}
      />
    );
    const current = container.querySelector(
      '[data-slot="data-table-pagination-page"][aria-current="page"]'
    ) as HTMLButtonElement;
    expect(current.textContent).toBe('1');
    expect(current.disabled, 'INV-235: current is not disabled except busy').toBe(false);
    expect(
      (container.querySelector('[data-slot="data-table-pagination-previous"]') as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(
      (container.querySelector('[data-slot="data-table-pagination-next"]') as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });
});

describe('INV-234: ellipsis is a hidden non-button gap', () => {
  it('mounts two aria-hidden spans for a clustered list and none for a compact list', () => {
    const clustered = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(200),
          pagination: { kind: 'client', pageIndex: 10, pageSize: 10, onPageChange: vi.fn() },
        })}
      />
    );
    const gaps = clustered.container.querySelectorAll(
      '[data-slot="data-table-pagination-ellipsis"]'
    );
    expect(gaps.length).toBe(2);
    for (const gap of gaps) {
      expect(gap.tagName).toBe('SPAN');
      expect(gap.getAttribute('aria-hidden')).toBe('true');
      expect(gap.textContent).toBe('…');
    }
    expect(() => screen.getByRole('button', { name: '…' })).toThrow();
    clustered.unmount();

    const compact = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(70),
          pagination: { kind: 'client', pageIndex: 0, pageSize: 10, onPageChange: vi.fn() },
        })}
      />
    );
    expect(
      compact.container.querySelectorAll('[data-slot="data-table-pagination-ellipsis"]').length
    ).toBe(0);
    expect(
      compact.container.querySelectorAll('[data-slot="data-table-pagination-page"]').length
    ).toBe(7);
  });
});

describe('INV-237 / INV-95*: status then pages group; never a grid', () => {
  it('orders nav children and keeps Prev/Next as the pages-group ends', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(200),
          pagination: { kind: 'client', pageIndex: 10, pageSize: 10, onPageChange: vi.fn() },
        })}
      />
    );
    const nav = container.querySelector('[data-slot="data-table-pagination"]');
    expect(
      [...((nav?.children ?? []) as HTMLElement[])].map((node) => node.getAttribute('data-slot'))
    ).toEqual(['data-table-pagination-status', 'data-table-pagination-pages']);
    const pages = container.querySelector('[data-slot="data-table-pagination-pages"]');
    expect(pages?.firstElementChild?.getAttribute('data-slot')).toBe(
      'data-table-pagination-previous'
    );
    expect(pages?.lastElementChild?.getAttribute('data-slot')).toBe('data-table-pagination-next');
    expect(container.querySelectorAll('[role="grid"]').length).toBe(0);
    expect(nav?.getAttribute('role')).toBeNull();
  });
});

describe('INV-238: pager chrome tokens; nav is not sticky or card-banded', () => {
  it('applies membership of the three pager tokens and keeps the nav outside the scroller', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          pagination: { kind: 'client', pageIndex: 0, pageSize: 10, onPageChange: vi.fn() },
        })}
      />
    );
    expectTokens(
      container.querySelector('[data-slot="data-table-root"]'),
      DATA_TABLE_PAGINATION_ROOT_CHROME,
      'INV-238: root'
    );
    const nav = container.querySelector('[data-slot="data-table-pagination"]');
    expectTokens(nav, DATA_TABLE_PAGINATION_CHROME, 'INV-238: nav');
    expectTokens(
      container.querySelector('[data-slot="data-table-pagination-pages"]'),
      DATA_TABLE_PAGINATION_PAGES_CHROME,
      'INV-238: pages'
    );
    expect(tokens(nav?.getAttribute('class') ?? '').has('sticky')).toBe(false);
    for (const token of tokens(DATA_TABLE_HEAD_CHROME)) {
      expect(tokens(nav?.getAttribute('class') ?? '').has(token)).toBe(false);
    }
    for (const token of tokens(DATA_TABLE_WRAPPER_CHROME)) {
      expect(tokens(nav?.getAttribute('class') ?? '').has(token)).toBe(false);
    }
    expect(nav?.closest('[data-slot="data-table"]')).toBeNull();
  });
});

describe('INV-255: client empty is a known one-page table', () => {
  it('shows one current page button, no ellipsis, disabled neighbours, and No rows', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: [],
          pagination: { kind: 'client', pageIndex: 0, pageSize: 10, onPageChange: vi.fn() },
        })}
      />
    );
    const pages = container.querySelectorAll('[data-slot="data-table-pagination-page"]');
    expect(pages.length).toBe(1);
    expect(pages[0]?.textContent).toBe('1');
    expect(pages[0]?.getAttribute('aria-current')).toBe('page');
    expect(container.querySelectorAll('[data-slot="data-table-pagination-ellipsis"]').length).toBe(
      0
    );
    expect(
      (container.querySelector('[data-slot="data-table-pagination-previous"]') as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(
      (container.querySelector('[data-slot="data-table-pagination-next"]') as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(container.querySelector('[data-slot="data-table-pagination-status"]')?.textContent).toBe(
      'No rows'
    );
    expect(container.querySelector('[data-slot="data-table-empty"]')).not.toBeNull();
    expect(TOKEN_ROWS.length).toBeGreaterThan(0);
  });
});
