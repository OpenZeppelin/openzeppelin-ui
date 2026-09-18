/**
 * SF-5 · Browser verification — INV-113 (and overflow/tab-order pieces of INV-94 / INV-109).
 * Opt-in via `pnpm test:browser`. GitHub CI runs that script after jsdom `pnpm test`.
 */
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { useState, type ReactElement } from 'react';

import { Checkbox } from '../../checkbox';
import { DataTable } from '../data-table';
import { numberedTokenRows, tokenColumns, type TokenRow } from './sf2-fixtures';

function injectContractStyles(): void {
  if (document.getElementById('sf5-contract-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'sf5-contract-styles';
  style.textContent = `
    .text-start { text-align: start; }
    .text-end { text-align: end; }
    .overflow-x-auto { overflow-x: auto; }
    .caption-top { caption-side: top; }
  `;
  document.head.appendChild(style);
}

async function axeViolations(
  container: HTMLElement,
  options?: { disableHeadingOrder?: boolean }
): Promise<axe.Result[]> {
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    rules: options?.disableHeadingOrder ? { 'heading-order': { enabled: false } } : undefined,
  });
  return results.violations;
}

function ClientPager({
  rows,
  pageSize = 10,
  initialPage = 0,
  busy = false,
}: {
  rows: readonly TokenRow[];
  pageSize?: number;
  initialPage?: number;
  busy?: boolean;
}): ReactElement {
  const [pageIndex, setPageIndex] = useState(initialPage);
  return (
    <DataTable
      caption="Tokenization requests"
      columns={tokenColumns()}
      rows={rows}
      getRowKey={(row) => row.id}
      pagination={{
        kind: 'client',
        pageIndex,
        pageSize,
        busy,
        onPageChange: setPageIndex,
      }}
    />
  );
}

describe('INV-113 (browser): pager is keyboard-complete; paging does not drop table semantics', () => {
  it('names the nav and buttons; kit order is table then pager', async () => {
    injectContractStyles();
    render(<ClientPager rows={numberedTokenRows(25)} initialPage={0} />);
    expect(screen.getByRole('table', { name: 'Tokenization requests' })).toBeTruthy();
    expect(screen.queryByRole('grid')).toBeNull();
    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    expect(screen.getByRole('button', { name: 'Previous' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy();
    expect(nav.textContent).toContain('Showing 1–10 of 25');
    const table = screen.getByRole('table', { name: 'Tokenization requests' });
    expect(
      Boolean(table.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING),
      'INV-113: kit order is table then pager'
    ).toBe(true);
  });

  it('completes a page change with Tab then Enter on Next', async () => {
    injectContractStyles();
    render(<ClientPager rows={numberedTokenRows(25)} />);
    const next = screen.getByRole('button', { name: 'Next' });
    next.focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByText('Showing 11–20 of 25')).toBeTruthy();
    expect(screen.getByRole('table', { name: 'Tokenization requests' })).toBeTruthy();
    expect(screen.getAllByRole('columnheader').length).toBe(tokenColumns().length);
  });

  it('skips the status node in sequential tab order', async () => {
    injectContractStyles();
    render(
      <DataTable
        caption="T"
        columns={[
          {
            id: 'act',
            header: 'Act',
            cell: (row: TokenRow) => (
              <button type="button" data-row={row.id}>
                Open
              </button>
            ),
          },
        ]}
        rows={numberedTokenRows(25)}
        getRowKey={(row) => row.id}
        pagination={{ kind: 'client', pageIndex: 1, pageSize: 1, onPageChange: () => undefined }}
      />
    );
    await userEvent.tab();
    expect((document.activeElement as HTMLElement | null)?.getAttribute('data-row')).toBe('r1');
    await userEvent.tab();
    expect(document.activeElement?.getAttribute('data-slot')).toBe(
      'data-table-pagination-previous'
    );
    await userEvent.tab();
    expect(
      document.activeElement?.getAttribute('data-slot'),
      'INV-95* / INV-258: numbers sit between Previous and Next; status is not a tab stop'
    ).toBe('data-table-pagination-page');
    expect(document.activeElement?.getAttribute('data-slot')).not.toBe(
      'data-table-pagination-status'
    );
  });

  it('keeps overflow-x on the table wrapper, not the nav', () => {
    injectContractStyles();
    const { container } = render(<ClientPager rows={numberedTokenRows(5)} />);
    const scroller = container.querySelector('[data-slot="data-table"]');
    const nav = container.querySelector('[data-slot="data-table-pagination"]');
    expect(scroller && getComputedStyle(scroller).overflowX).toBe('auto');
    expect(nav && getComputedStyle(nav).overflowX).not.toBe('auto');
  });
});

describe('INV-60 / INV-113 (browser): axe WCAG 2.1 A/AA on paginated renders', () => {
  it('reports zero violations for middle page, busy, empty dataset, OOR page, and composed cells', async () => {
    injectContractStyles();
    const middle = render(<ClientPager rows={numberedTokenRows(25)} initialPage={1} />);
    expect(await axeViolations(middle.container), 'INV-113 middle page').toEqual([]);
    middle.unmount();

    const busy = render(<ClientPager rows={numberedTokenRows(10)} busy />);
    expect(await axeViolations(busy.container), 'INV-113 busy').toEqual([]);
    busy.unmount();

    const empty = render(<ClientPager rows={[]} />);
    expect(
      await axeViolations(empty.container, { disableHeadingOrder: true }),
      'INV-113 empty dataset'
    ).toEqual([]);
    empty.unmount();

    const oor = render(<ClientPager rows={numberedTokenRows(3)} initialPage={4} />);
    expect(
      await axeViolations(oor.container, { disableHeadingOrder: true }),
      'INV-113 OOR empty page'
    ).toEqual([]);
    oor.unmount();

    const composed = render(
      <DataTable
        caption="Holders"
        columns={[
          {
            id: 'select',
            header: <Checkbox aria-label="Select all" />,
            headerLabel: 'Select',
            cell: (row: TokenRow) => <Checkbox aria-label={`Select ${row.label}`} />,
          },
          ...tokenColumns(),
        ]}
        rows={numberedTokenRows(12)}
        getRowKey={(row) => row.id}
        pagination={{ kind: 'client', pageIndex: 0, pageSize: 10, onPageChange: () => undefined }}
      />
    );
    expect(await axeViolations(composed.container), 'INV-113 composed cells').toEqual([]);
  });
});
