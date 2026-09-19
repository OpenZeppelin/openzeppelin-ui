/**
 * SF-13 · Browser verification — INV-347, INV-349, INV-355, INV-357, INV-36*.
 * Opt-in via `pnpm test:browser`.
 */
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { act, createRef } from 'react';

import { DataTable } from '../data-table';
import type { DataTableVirtualizationHandle } from '../types';
import { numberedTokenRows, tokenColumns } from './sf2-fixtures';

function injectContractStyles(): void {
  if (document.getElementById('sf13-contract-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'sf13-contract-styles';
  style.textContent = `
    .overflow-auto { overflow: auto; }
    .overflow-x-auto { overflow-x: auto; }
    .overflow-hidden { overflow: hidden; }
    .relative { position: relative; }
    .sticky { position: sticky; }
    .top-0 { top: 0; }
    .z-20 { z-index: 20; }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }
    [data-slot="data-table-header-cell"].sticky {
      background-color: color-mix(in oklab, rgb(230, 232, 235) 50%, white);
    }
    [data-slot="data-table-table"] { border-collapse: collapse; width: 100%; }
    [data-slot="data-table-row"] { height: 40px; }
    .p-4 { padding: 16px; }
  `;
  document.head.appendChild(style);
}

async function axeViolations(container: HTMLElement): Promise<axe.Result[]> {
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
  });
  return results.violations;
}

function getScroller(container: HTMLElement): HTMLElement {
  const scroller = container.querySelector<HTMLElement>('[data-slot="data-table"]');
  expect(scroller, 'SF-13 browser fixture must mount the scroller').not.toBeNull();
  return scroller!;
}

async function waitForVirtualLayout(container: HTMLElement): Promise<HTMLElement> {
  const scroller = getScroller(container);
  await expect.poll(() => scroller.scrollHeight > scroller.clientHeight).toBe(true);
  await expect
    .poll(() => container.querySelectorAll('[data-slot="data-table-row"]').length)
    .toBeGreaterThan(0);
  return scroller;
}

describe('INV-347 / INV-349 / INV-355 / INV-36* (browser): framed sticky virt uses the scroller', () => {
  it('keeps header cells table-cell sticky on the scroller, not the frame', async () => {
    injectContractStyles();
    const virtualizationRef = createRef<DataTableVirtualizationHandle | null>();
    const { container } = render(
      <DataTable
        caption="Framed sticky"
        columns={tokenColumns()}
        rows={numberedTokenRows(120)}
        getRowKey={(row) => row.id}
        toolbar={<div>Search accounts</div>}
        virtualized={{ maxHeight: 160, estimateSize: 40, overscan: 1 }}
        virtualizationRef={virtualizationRef}
        pagination={{
          kind: 'client',
          pageIndex: 0,
          pageSize: 120,
          onPageChange: () => undefined,
          placement: 'inside',
        }}
      />
    );
    const scroller = await waitForVirtualLayout(container);
    const frame = container.querySelector<HTMLElement>('[data-slot="data-table-frame"]')!;
    const toolbar = container.querySelector<HTMLElement>('[data-slot="data-table-toolbar"]')!;
    const nav = container.querySelector<HTMLElement>('[data-slot="data-table-pagination"]')!;

    expect(getComputedStyle(frame).overflow).toBe('hidden');
    expect(getComputedStyle(scroller).overflow).not.toBe('hidden');
    expect(getComputedStyle(toolbar).position).not.toBe('sticky');
    expect(getComputedStyle(nav).position).not.toBe('sticky');

    act(() => {
      scroller.scrollTop = 0;
      scroller.dispatchEvent(new Event('scroll'));
    });
    const headerCells = [
      ...container.querySelectorAll<HTMLElement>('[data-slot="data-table-header-cell"]'),
    ];
    const firstRow = container.querySelector<HTMLElement>('[data-slot="data-table-row"]')!;
    const headerBottom = Math.max(
      ...headerCells.map((cell) => cell.getBoundingClientRect().bottom)
    );
    expect(
      headerBottom - firstRow.getBoundingClientRect().top,
      'INV-347: toolbar must not cover row 1 at scrollTop=0'
    ).toBeLessThanOrEqual(1);

    act(() => {
      scroller.scrollTop = 400;
      scroller.dispatchEvent(new Event('scroll'));
    });
    await expect
      .poll(() =>
        [...container.querySelectorAll<HTMLElement>('[data-slot="data-table-row"]')].some(
          (row) => Number(row.dataset.index) > 5
        )
      )
      .toBe(true);
    const scrollerTop = scroller.getBoundingClientRect().top;
    for (const cell of headerCells) {
      expect(getComputedStyle(cell).position).toBe('sticky');
      expect(getComputedStyle(cell).display).toBe('table-cell');
      expect(
        Math.abs(cell.getBoundingClientRect().top - scrollerTop),
        'INV-349: sticky docks to the scroller, not the frame'
      ).toBeLessThanOrEqual(1);
    }

    act(() => {
      frame.scrollTop = 400;
      frame.dispatchEvent(new Event('scroll'));
    });
    expect(scroller.scrollTop).toBeGreaterThan(0);
  });
});

describe('INV-357 / INV-356 (browser): framed keyboard flow and axe', () => {
  it('tabs through toolbar, sort, checkbox, and in-frame pager without trapping focus', async () => {
    injectContractStyles();
    const onPageChange = vi.fn();
    const { container } = render(
      <DataTable
        caption="Authorized accounts"
        columns={tokenColumns()}
        rows={numberedTokenRows(12)}
        getRowKey={(row) => row.id}
        toolbar={
          <button type="button" data-slot="filter-search">
            Search accounts
          </button>
        }
        selection={{ selectedKeys: new Set(), onSelectionChange: vi.fn() }}
        pagination={{
          kind: 'client',
          pageIndex: 0,
          pageSize: 10,
          onPageChange,
          placement: 'inside',
          hideStatus: true,
          paginationLabel: 'Authorized accounts pagination',
        }}
      />
    );

    const search = screen.getByRole('button', { name: 'Search accounts' });
    search.focus();
    expect(document.activeElement).toBe(search);

    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('checkbox', { name: 'Select all' }));
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Sort by Amount' }));

    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('checkbox', { name: 'Select r0' }));

    const currentPage = screen.getByRole('button', { name: '1' });
    currentPage.focus();
    expect(document.activeElement).toBe(currentPage);
    await userEvent.keyboard('{Enter}');
    expect(onPageChange, 'INV-344: current page is still a no-op').not.toHaveBeenCalled();
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '2' }));
    await userEvent.keyboard('{Enter}');
    expect(onPageChange).toHaveBeenCalledWith(1);

    expect(
      container.querySelector('[data-slot="data-table-pagination-status"]')?.className
    ).toContain('sr-only');
    const violations = await axeViolations(container);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
});

describe('INV-342 / INV-356 (browser): hidden pager status stays contained', () => {
  it('keeps a tall framed table from extending the document below a short layout', async () => {
    injectContractStyles();
    const host = document.createElement('div');
    const layoutHeight = Math.min(700, document.documentElement.clientHeight);
    host.style.height = `${String(layoutHeight)}px`;
    host.style.overflow = 'hidden';
    document.body.appendChild(host);
    const baselineScrollHeight = document.documentElement.scrollHeight;

    const rendered = render(
      <DataTable
        caption="Tall authorized accounts"
        columns={tokenColumns()}
        rows={numberedTokenRows(80)}
        getRowKey={(row) => row.id}
        toolbar={<div>Search accounts</div>}
        pagination={{
          kind: 'client',
          pageIndex: 0,
          pageSize: 80,
          onPageChange: () => undefined,
          placement: 'inside',
          hideStatus: true,
        }}
      />,
      { container: host }
    );

    try {
      const nav = host.querySelector<HTMLElement>('[data-slot="data-table-pagination"]')!;
      const status = host.querySelector<HTMLElement>('[data-slot="data-table-pagination-status"]')!;

      expect(getComputedStyle(nav).position).toBe('relative');
      expect(getComputedStyle(status).position).toBe('absolute');
      expect(status.offsetParent).toBe(nav);

      const navBox = nav.getBoundingClientRect();
      const statusBox = status.getBoundingClientRect();
      expect(statusBox.top).toBeGreaterThanOrEqual(navBox.top - 1);
      expect(statusBox.bottom).toBeLessThanOrEqual(navBox.bottom + 1);
      await expect.poll(() => document.documentElement.scrollHeight).toBe(baselineScrollHeight);
    } finally {
      rendered.unmount();
      host.remove();
    }
  });
});
