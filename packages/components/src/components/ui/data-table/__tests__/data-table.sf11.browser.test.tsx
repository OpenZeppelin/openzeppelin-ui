/**
 * SF-11 · Browser verification — INV-249, INV-258 … INV-261 (and axe INV-260).
 * Opt-in via `pnpm test:browser`.
 */
import { act, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { useState, type ReactElement } from 'react';

import { Checkbox } from '../../checkbox';
import { DataTable } from '../data-table';
import { numberedTokenRows, tokenColumns, type TokenRow } from './sf2-fixtures';

function injectContractStyles(): void {
  if (document.getElementById('sf11-contract-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'sf11-contract-styles';
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

function JumpHarness(): ReactElement {
  const [pageIndex, setPageIndex] = useState(0);
  const rows = numberedTokenRows(200);
  return (
    <>
      <button
        type="button"
        data-jump="middle"
        onClick={() => {
          setPageIndex(10);
        }}
      >
        Jump middle
      </button>
      <DataTable
        caption="Tokenization requests"
        columns={tokenColumns()}
        rows={rows}
        getRowKey={(row) => row.id}
        pagination={{ kind: 'client', pageIndex, pageSize: 10, onPageChange: setPageIndex }}
      />
    </>
  );
}

describe('INV-258 (browser): keyboard reaches page numbers; ellipsis is skipped', () => {
  it('tabs Previous → current page → later numbers, never the status or ellipsis', async () => {
    injectContractStyles();
    render(<ClientPager rows={numberedTokenRows(200)} initialPage={10} />);
    const previous = screen.getByRole('button', { name: 'Previous' });
    previous.focus();
    await userEvent.tab();
    expect(document.activeElement?.getAttribute('data-slot')).toBe('data-table-pagination-page');
    expect(document.activeElement?.getAttribute('data-page-index')).toBe('0');
    expect(document.activeElement?.getAttribute('data-slot')).not.toBe(
      'data-table-pagination-status'
    );
    expect(document.activeElement?.getAttribute('data-slot')).not.toBe(
      'data-table-pagination-ellipsis'
    );
  });

  it('activates a number with Enter and updates status', async () => {
    injectContractStyles();
    render(<ClientPager rows={numberedTokenRows(47)} />);
    const page2 = screen.getByRole('button', { name: '2' });
    page2.focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByText('Showing 11–20 of 47')).toBeTruthy();
    expect(screen.getByRole('button', { name: '2' }).getAttribute('aria-current')).toBe('page');
  });
});

describe('INV-249 / INV-261 (browser): unmount rescue stays in the nav', () => {
  it('rescues into the nav when the focused number unmounts after an external jump', async () => {
    injectContractStyles();
    const { container } = render(<JumpHarness />);
    const page3 = screen.getByRole('button', { name: '3' });
    await userEvent.click(page3);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '3' }));
    await act(async () => {
      screen.getByRole('button', { name: 'Jump middle' }).click();
    });
    expect(
      document.activeElement?.closest('[data-slot="data-table-pagination"]'),
      'INV-249: unmounted number must not dump focus to body or a row'
    ).not.toBeNull();
    expect(document.activeElement?.closest('[data-slot="data-table-table"]')).toBeNull();
    expect(container.querySelector('[data-slot="data-table"]')?.scrollTop).toBe(0);
  });
});

describe('INV-260 (browser): axe WCAG 2.1 A/AA on numbered pager trees', () => {
  it('reports zero violations for compact, clustered, unknown, busy, empty, OOR, and composed cells', async () => {
    injectContractStyles();
    const compact = render(<ClientPager rows={numberedTokenRows(70)} />);
    expect(await axeViolations(compact.container), 'INV-260 compact ≤7 pages').toEqual([]);
    compact.unmount();

    const clustered = render(<ClientPager rows={numberedTokenRows(200)} initialPage={10} />);
    expect(await axeViolations(clustered.container), 'INV-260 clustered ellipsis').toEqual([]);
    clustered.unmount();

    const unknown = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={numberedTokenRows(10)}
        getRowKey={(row) => row.id}
        pagination={{ kind: 'server', pageIndex: 0, pageSize: 10, onPageChange: () => undefined }}
      />
    );
    expect(await axeViolations(unknown.container), 'INV-260 unknown total').toEqual([]);
    unknown.unmount();

    const busy = render(<ClientPager rows={numberedTokenRows(200)} initialPage={10} busy />);
    expect(await axeViolations(busy.container), 'INV-260 busy').toEqual([]);
    busy.unmount();

    const empty = render(<ClientPager rows={[]} />);
    expect(
      await axeViolations(empty.container, { disableHeadingOrder: true }),
      'INV-260 client empty'
    ).toEqual([]);
    empty.unmount();

    const oor = render(<ClientPager rows={numberedTokenRows(200)} initialPage={99} />);
    expect(
      await axeViolations(oor.container, { disableHeadingOrder: true }),
      'INV-260 OOR'
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
    expect(await axeViolations(composed.container), 'INV-260 composed cells').toEqual([]);
  });
});
