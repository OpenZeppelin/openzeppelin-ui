/**
 * SF-4 · Browser verification — INV-118, INV-134, INV-144, INV-146, INV-147, SC-002.
 * Opt-in via `pnpm test:browser`. GitHub CI runs that script after jsdom `pnpm test`.
 */
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createRef, StrictMode } from 'react';

import { Checkbox } from '../../checkbox';
import { OverflowMenu } from '../../overflow-menu';
import { DataTable } from '../data-table';
import type { DataTableLoadStrategy, DataTableVirtualizationHandle } from '../types';
import { numberedTokenRows, tokenColumns, type TokenRow } from './sf2-fixtures';

function injectContractStyles(): void {
  if (document.getElementById('sf4-contract-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'sf4-contract-styles';
  style.textContent = `
    .text-start { text-align: start; }
    .text-end { text-align: end; }
    .overflow-x-auto { overflow-x: auto; }
    .overflow-auto { overflow: auto; }
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

const mixedColumns = [
  {
    id: 'select',
    header: <Checkbox aria-label="Select all" />,
    headerLabel: 'Select',
    cell: (row: TokenRow) => <Checkbox aria-label={`Select ${row.label}`} />,
  },
  ...tokenColumns(),
];

describe('INV-134 / SC-002 (browser): 10k virtualized rows stay windowed and scroll to identity', () => {
  it('mounts < 80 data rows and scrollToRowKey reveals the mid-list label', async () => {
    injectContractStyles();
    const rows = numberedTokenRows(10_000);
    const ref = createRef<DataTableVirtualizationHandle | null>();
    const { container } = render(
      <DataTable
        caption="Scale"
        columns={tokenColumns()}
        rows={rows}
        getRowKey={(row) => row.id}
        virtualized
        virtualizationRef={ref}
      />
    );
    const mounted = container.querySelectorAll('[data-slot="data-table-row"]').length;
    expect(mounted, 'INV-134: Chromium mount bound with defaults').toBeLessThan(80);
    expect(mounted).toBeGreaterThan(0);
    expect(container.querySelector('table')?.getAttribute('aria-rowcount')).toBe('10001');

    await expect.poll(() => ref.current).not.toBeNull();
    ref.current?.scrollToRowKey('r5000', 'start');
    await expect
      .poll(() =>
        [...container.querySelectorAll('[data-slot="data-table-row"]')].some(
          (row) => row.getAttribute('data-row-key') === 'r5000'
        )
      )
      .toBe(true);
    expect(container.textContent).toContain('R5000');
    const target = container.querySelector('[data-row-key="r5000"]');
    expect(target?.querySelector('[data-column-id="label"]')?.textContent).toBe('R5000');
    expect(target?.querySelector('[data-column-id="amount"]')?.textContent).toBe('5000');
  });

  it('advances the mounted window after native scrolling under Strict Mode', async () => {
    injectContractStyles();
    const { container } = render(
      <StrictMode>
        <DataTable
          caption="Strict scale"
          columns={tokenColumns()}
          rows={numberedTokenRows(200)}
          getRowKey={(row) => row.id}
          virtualized
        />
      </StrictMode>
    );
    const wrap = container.querySelector('[data-slot="data-table"]') as HTMLElement;
    expect(wrap.clientHeight).toBeLessThan(wrap.scrollHeight);
    wrap.scrollTop = 1_000;
    wrap.dispatchEvent(new Event('scroll'));
    await expect
      .poll(() =>
        [...container.querySelectorAll('[data-slot="data-table-row"]')].some(
          (row) => Number(row.getAttribute('data-index')) > 20
        )
      )
      .toBe(true);
  });
});

describe('INV-130 / INV-134 (browser): focused row controls do not break later windows', () => {
  it.each([
    { name: 'virtualized', infinite: false },
    { name: 'infinite + virtualized', infinite: true },
  ])('$name: scrolls after a mounted row action takes focus', async ({ infinite }) => {
    injectContractStyles();
    const rows = numberedTokenRows(200);
    const { container } = render(
      <StrictMode>
        <DataTable
          caption="Action feed"
          columns={[
            ...tokenColumns(),
            {
              id: 'actions',
              header: 'Actions',
              cell: (row: TokenRow) => <button type="button">View {row.label}</button>,
            },
            {
              id: 'menu',
              header: 'Menu',
              cell: (row: TokenRow) => (
                <OverflowMenu
                  aria-label={`More actions for ${row.label}`}
                  items={[{ id: 'inspect', label: 'Inspect', onSelect: () => undefined }]}
                />
              ),
            },
          ]}
          rows={rows}
          getRowKey={(row) => row.id}
          virtualized
          // Boolean ternary widens `infiniteScroll` to `T | undefined`, which is not a
          // legal XOR arm (INV-306). Cast the spread to DataTableLoadStrategy — do not
          // widen DataTable's public props.
          {...((infinite
            ? {
                infiniteScroll: {
                  hasMore: true as const,
                  busy: true as const,
                  onLoadMore: () => undefined,
                },
              }
            : {}) as DataTableLoadStrategy)}
        />
      </StrictMode>
    );
    const wrap = container.querySelector('[data-slot="data-table"]') as HTMLElement;

    wrap.scrollTop = 1_000;
    wrap.dispatchEvent(new Event('scroll'));
    await expect
      .poll(() =>
        [...container.querySelectorAll('[data-slot="data-table-row"]')].some(
          (row) => Number(row.getAttribute('data-index')) > 20
        )
      )
      .toBe(true);

    const actionRow = container.querySelector('[data-slot="data-table-row"]');
    const action = actionRow?.querySelector('[data-column-id="actions"] button');
    expect(action).toBeInstanceOf(HTMLButtonElement);
    const measuredRowHeight =
      (action as HTMLButtonElement).closest('[data-slot="data-table-row"]')?.getBoundingClientRect()
        .height ?? 0;
    expect(measuredRowHeight).toBeGreaterThan(0);
    await userEvent.click(action as HTMLButtonElement);
    const menuTrigger = actionRow?.querySelector('[data-column-id="menu"] button');
    expect(menuTrigger).toBeInstanceOf(HTMLButtonElement);
    await userEvent.click(menuTrigger as HTMLButtonElement);
    expect(screen.getByRole('menuitem', { name: 'Inspect' })).toBeTruthy();
    expect(container.querySelector('[role="menuitem"]')).toBeNull();

    wrap.scrollTop = 4_000;
    wrap.dispatchEvent(new Event('scroll'));
    await expect
      .poll(() =>
        [...container.querySelectorAll('[data-slot="data-table-row"]')].some(
          (row) => Number(row.getAttribute('data-index')) > 80
        )
      )
      .toBe(true);
    const mountedIndices = [
      ...container.querySelectorAll<HTMLElement>('[data-slot="data-table-row"]'),
    ].map((row) => Number(row.dataset.index));
    expect(
      mountedIndices.every((index, position) => {
        const previous = mountedIndices[position - 1];
        return previous === undefined || index === previous + 1;
      })
    ).toBe(true);
    expect(wrap.scrollHeight).toBeGreaterThanOrEqual(measuredRowHeight * (rows.length - 2));
  });
});

describe('INV-118 (browser): computed display stays table-* on internals', () => {
  it('reports table / table-row / table-cell and no transform on data rows', () => {
    injectContractStyles();
    const { container } = render(
      <DataTable
        caption="Display"
        columns={tokenColumns()}
        rows={numberedTokenRows(40)}
        getRowKey={(row) => row.id}
        virtualized
      />
    );
    const table = container.querySelector('table');
    const row = container.querySelector('[data-slot="data-table-row"]');
    const cell = container.querySelector('[data-slot="data-table-cell"]');
    const th = container.querySelector('th');
    const wrap = container.querySelector('[data-slot="data-table"]');
    expect(table && getComputedStyle(table).display).toBe('table');
    expect(row && getComputedStyle(row).display).toBe('table-row');
    expect(cell && getComputedStyle(cell).display).toBe('table-cell');
    expect(th && getComputedStyle(th).display).toBe('table-cell');
    expect(row && getComputedStyle(row).transform).toBe('none');
    expect(wrap && getComputedStyle(wrap).overflow).toMatch(/auto/);
  });
});

describe('INV-144 / INV-146 (browser): named table survives windowing and paging', () => {
  it('keeps headers after scroll and uses page-local aria-rowcount', async () => {
    injectContractStyles();
    const ref = createRef<DataTableVirtualizationHandle | null>();
    render(
      <DataTable
        caption="Tokenization requests"
        columns={mixedColumns}
        rows={numberedTokenRows(400)}
        getRowKey={(row) => row.id}
        pagination={{
          kind: 'client',
          pageIndex: 0,
          pageSize: 200,
          onPageChange: () => undefined,
        }}
        virtualized
        virtualizationRef={ref}
      />
    );
    expect(screen.getByRole('table', { name: 'Tokenization requests' })).toBeTruthy();
    expect(screen.queryByRole('grid')).toBeNull();
    expect(screen.getByRole('table').getAttribute('aria-rowcount')).toBe('201');
    ref.current?.scrollToRowKey('r80', 'start');
    await expect
      .poll(() =>
        Boolean(document.querySelector('[data-slot="data-table-row"][data-row-key="r80"]'))
      )
      .toBe(true);
    expect(screen.getByRole('table', { name: 'Tokenization requests' })).toBeTruthy();
    expect(screen.getAllByRole('columnheader').length).toBe(mixedColumns.length);
  });
});

describe('INV-147 (browser): Tab visits mounted controls without a grid model', () => {
  it('tabs from a preceding control into the first mounted table control', async () => {
    injectContractStyles();
    render(
      <>
        <button type="button">Before</button>
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
          rows={numberedTokenRows(40)}
          getRowKey={(row) => row.id}
          virtualized
        />
      </>
    );
    screen.getByRole('button', { name: 'Before' }).focus();
    await userEvent.tab();
    expect((document.activeElement as HTMLElement | null)?.getAttribute('data-row')).toBe('r0');
  });
});

describe('INV-60 / INV-146 (browser): axe WCAG 2.1 A/AA on virtualized trees', () => {
  it('reports zero violations for virtualized, empty+virtualized, and virtualized+client page', async () => {
    injectContractStyles();
    const virt = render(
      <DataTable
        caption="Tokenization requests"
        columns={mixedColumns}
        rows={numberedTokenRows(40)}
        getRowKey={(row) => row.id}
        virtualized
      />
    );
    expect(await axeViolations(virt.container), 'INV-146 virtualized').toEqual([]);
    virt.unmount();

    const empty = render(
      <DataTable
        caption="Tokenization requests"
        columns={tokenColumns()}
        rows={[]}
        getRowKey={(row) => row.id}
        virtualized
      />
    );
    expect(
      await axeViolations(empty.container, { disableHeadingOrder: true }),
      'INV-146 empty+virtualized'
    ).toEqual([]);
    empty.unmount();

    const paged = render(
      <DataTable
        caption="Tokenization requests"
        columns={tokenColumns()}
        rows={numberedTokenRows(80)}
        getRowKey={(row) => row.id}
        pagination={{
          kind: 'client',
          pageIndex: 1,
          pageSize: 20,
          onPageChange: () => undefined,
        }}
        virtualized
      />
    );
    expect(await axeViolations(paged.container), 'INV-146 virtualized+client page').toEqual([]);
  });
});
