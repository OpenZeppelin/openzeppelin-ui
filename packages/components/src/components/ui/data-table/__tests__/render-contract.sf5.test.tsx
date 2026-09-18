/**
 * SF-5 · Render contract — INV-94 … INV-98.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataTable } from '../data-table';
import { applyClientSort } from '../sort';
import {
  captionTableProps,
  getTokenRowKey,
  numberedTokenRows,
  tokenColumns,
  type TokenRow,
} from './sf2-fixtures';

function bodyLabels(container: HTMLElement): string[] {
  return [...container.querySelectorAll('[data-slot="data-table-row"]')].map((row) => {
    return row.querySelector('[data-column-id="label"]')?.textContent ?? '';
  });
}

function clientPagination(
  pageIndex: number,
  pageSize: number,
  onPageChange: (next: number) => void = vi.fn()
) {
  return { kind: 'client' as const, pageIndex, pageSize, onPageChange };
}

describe('INV-94: unpaginated DOM stays the SF-2 wrapper; paginated DOM adds a sibling nav', () => {
  it('omits the root and pager when pagination is omitted or undefined', () => {
    const omitted = render(<DataTable {...captionTableProps()} />);
    expect(omitted.container.querySelector('[data-slot="data-table-root"]')).toBeNull();
    expect(omitted.container.querySelector('[data-slot="data-table-pagination"]')).toBeNull();
    expect(omitted.container.firstElementChild?.getAttribute('data-slot')).toBe('data-table');
    omitted.unmount();

    const undef = render(<DataTable {...captionTableProps({ pagination: undefined })} />);
    expect(undef.container.querySelector('[data-slot="data-table-root"]')).toBeNull();
    expect(undef.container.firstElementChild?.getAttribute('data-slot')).toBe('data-table');
  });

  it('wraps table then nav, keeps className on the scroller, and keeps the nav outside overflow', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          className: 'paged-scroller',
          pagination: clientPagination(0, 10),
        })}
      />
    );
    const root = container.querySelector('[data-slot="data-table-root"]');
    const scroller = container.querySelector('[data-slot="data-table"]');
    const nav = container.querySelector('[data-slot="data-table-pagination"]');
    expect(root?.firstElementChild).toBe(scroller);
    expect(root?.lastElementChild).toBe(nav);
    expect(
      nav?.closest('[data-slot="data-table"]'),
      'INV-94: nav is not inside the scroller'
    ).toBeNull();
    expect(scroller?.className).toMatch(/\bpaged-scroller\b/);
    expect(root?.className).not.toMatch(/\bpaged-scroller\b/);
    expect(nav?.className).not.toMatch(/\bpaged-scroller\b/);
  });
});

describe('INV-95: pager is a named nav of status then pages (Previous, numbers, Next)', () => {
  it('uses default names, button types, and no grid role', () => {
    const { container } = render(
      <DataTable {...captionTableProps({ pagination: clientPagination(0, 10) })} />
    );
    const nav = container.querySelector('[data-slot="data-table-pagination"]');
    expect(nav?.tagName).toBe('NAV');
    expect(nav?.getAttribute('aria-label')).toBe('Pagination');
    expect(nav?.hasAttribute('aria-busy')).toBe(false);
    const children = [...(nav?.children ?? [])];
    expect(
      children.map((node) => node.getAttribute('data-slot')),
      'INV-95*: DOM order is status then the pages group'
    ).toEqual(['data-table-pagination-status', 'data-table-pagination-pages']);
    const pages = children[1];
    const pageChildren = [...(pages?.children ?? [])];
    expect(pageChildren[0]?.getAttribute('data-slot')).toBe('data-table-pagination-previous');
    expect(pageChildren[pageChildren.length - 1]?.getAttribute('data-slot')).toBe(
      'data-table-pagination-next'
    );
    expect(pageChildren[0]?.getAttribute('type')).toBe('button');
    expect(pageChildren[pageChildren.length - 1]?.getAttribute('type')).toBe('button');
    expect(pageChildren[0]?.textContent).toBe('Previous');
    expect(pageChildren[pageChildren.length - 1]?.textContent).toBe('Next');
    expect(container.querySelectorAll('[role="grid"]').length).toBe(0);
  });

  it('overrides labels and sets aria-busy only when busy', () => {
    const idle = render(
      <DataTable
        {...captionTableProps({
          pagination: {
            ...clientPagination(0, 10),
            paginationLabel: 'Pages',
            previousLabel: 'Back',
            nextLabel: 'Forward',
          },
        })}
      />
    );
    expect(
      idle.container
        .querySelector('[data-slot="data-table-pagination"]')
        ?.getAttribute('aria-label')
    ).toBe('Pages');
    expect(
      idle.container.querySelector('[data-slot="data-table-pagination-previous"]')?.textContent
    ).toBe('Back');
    expect(
      idle.container.querySelector('[data-slot="data-table-pagination-next"]')?.textContent
    ).toBe('Forward');
    idle.unmount();

    const busy = render(
      <DataTable
        {...captionTableProps({
          pagination: { ...clientPagination(0, 10), busy: true },
        })}
      />
    );
    expect(
      busy.container.querySelector('[data-slot="data-table-pagination"]')?.getAttribute('aria-busy')
    ).toBe('true');
  });
});

describe('INV-96: status is a polite live region; table has no aria-live', () => {
  it('announces the default window and keeps live attributes off <table>', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(47),
          pagination: clientPagination(0, 10),
        })}
      />
    );
    const status = container.querySelector('[data-slot="data-table-pagination-status"]');
    expect(status?.tagName).toBe('P');
    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect(status?.getAttribute('aria-atomic')).toBe('true');
    expect(status?.textContent).toBe('Showing 1–10 of 47');
    expect(container.querySelector('table')?.hasAttribute('aria-live')).toBe(false);
  });

  it('uses a custom formatter, including an empty string that still mounts the paragraph', () => {
    const empty = render(
      <DataTable
        {...captionTableProps({
          pagination: {
            ...clientPagination(0, 10),
            formatStatus: () => '',
          },
        })}
      />
    );
    const status = empty.container.querySelector('[data-slot="data-table-pagination-status"]');
    expect(status).not.toBeNull();
    expect(status?.textContent).toBe('');
    empty.unmount();

    const custom = render(
      <DataTable
        {...captionTableProps({
          pagination: {
            ...clientPagination(0, 10),
            formatStatus: (info) => `p${String(info.pageIndex)}`,
          },
        })}
      />
    );
    expect(
      custom.container.querySelector('[data-slot="data-table-pagination-status"]')?.textContent
    ).toBe('p0');
  });
});

describe('INV-97: sort then page; server never reorders a subset (INV-78)', () => {
  it('client-paginates the sorted full list, not a sorted page of the unsorted list', () => {
    const shuffled: TokenRow[] = [
      { id: 'c', label: 'Gamma', amount: 30n, status: 'Active' },
      { id: 'a', label: 'Alpha', amount: 10n, status: 'Paused' },
      { id: 'b', label: 'Beta', amount: 20n, status: 'Active' },
    ];
    const columns = tokenColumns();
    const { container } = render(
      <DataTable
        caption="T"
        columns={columns}
        rows={shuffled}
        getRowKey={getTokenRowKey}
        defaultSort={{ columnId: 'amount', direction: 'asc' }}
        pagination={clientPagination(0, 1)}
      />
    );
    const sorted = applyClientSort(shuffled, columns, { columnId: 'amount', direction: 'asc' });
    expect(
      bodyLabels(container),
      'INV-97 / INV-78: first page is the first pageSize of displayRows'
    ).toEqual([sorted[0]!.label]);
    expect(bodyLabels(container)).toEqual(['Alpha']);
    expect(bodyLabels(container)).not.toEqual(['Gamma']);
  });

  it('server kind paints rows as given even when getSortValue exists', () => {
    const shuffled: TokenRow[] = [
      { id: 'c', label: 'Gamma', amount: 30n, status: 'Active' },
      { id: 'a', label: 'Alpha', amount: 10n, status: 'Paused' },
    ];
    const { container } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={shuffled}
        getRowKey={getTokenRowKey}
        defaultSort={{ columnId: 'amount', direction: 'asc' }}
        pagination={{
          kind: 'server',
          pageIndex: 0,
          pageSize: 10,
          totalCount: 2,
          onPageChange: vi.fn(),
        }}
      />
    );
    expect(bodyLabels(container), 'INV-97 / INV-102: server page is not applyClientSort').toEqual([
      'Gamma',
      'Alpha',
    ]);
  });
});

describe('INV-98: empty vs data is over bodyRows', () => {
  it('shows the empty row for a client page past the last page while the pager stays mounted', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(3),
          pagination: clientPagination(1, 10),
        })}
      />
    );
    expect(container.querySelector('[data-slot="data-table-empty"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-slot="data-table-row"]').length).toBe(0);
    expect(container.querySelector('[data-slot="data-table-pagination"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="data-table-pagination-status"]')?.textContent).toBe(
      'Showing 0–0 of 3'
    );
  });

  it('keeps the empty row for an unpaginated empty list and a paginated empty dataset', () => {
    const unpaged = render(<DataTable {...captionTableProps({ rows: [] })} />);
    expect(unpaged.container.querySelector('[data-slot="data-table-empty"]')).not.toBeNull();
    unpaged.unmount();

    const paged = render(
      <DataTable
        {...captionTableProps({
          rows: [],
          pagination: clientPagination(0, 10),
        })}
      />
    );
    expect(paged.container.querySelector('[data-slot="data-table-empty"]')).not.toBeNull();
    expect(paged.container.querySelector('[data-slot="data-table-pagination"]')).not.toBeNull();
    expect(
      paged.container.querySelector('[data-slot="data-table-pagination-status"]')?.textContent
    ).toBe('No rows');
  });
});
