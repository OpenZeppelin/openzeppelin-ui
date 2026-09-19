/**
 * SF-10 · Chromium layout and interaction proof — INV-277 … INV-295, US-6.
 */
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { act, createRef, useState, type ReactElement } from 'react';

import { DataTable } from '../data-table';
import type {
  DataTableLoadStrategy,
  DataTableSortState,
  DataTableVirtualizationHandle,
} from '../types';
import { numberedTokenRows, tokenColumns } from './sf2-fixtures';

function injectStickyStyles(): void {
  if (document.getElementById('sf10-sticky-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'sf10-sticky-styles';
  style.textContent = `
    .overflow-auto { overflow: auto; }
    .overflow-x-auto { overflow-x: auto; }
    .sticky { position: sticky; }
    .top-0 { top: 0; }
    .z-20 { z-index: 20; }
    [data-slot="data-table-header-cell"].sticky {
      background-color: color-mix(in oklab, rgb(230, 232, 235) 50%, white);
    }
    .p-4 { padding: 16px; }
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
    .not-sr-only {
      position: static;
      width: auto;
      height: auto;
      padding: 12px;
      margin: 0;
      overflow: visible;
      clip: auto;
      white-space: normal;
    }
    [data-slot="data-table-table"] { border-collapse: collapse; width: 100%; }
    [data-slot="data-table-row"] { height: 40px; }
  `;
  document.head.appendChild(style);
}

function getWrapper(container: HTMLElement): HTMLElement {
  const wrapper = container.querySelector<HTMLElement>('[data-slot="data-table"]');
  expect(wrapper, 'SF-10 browser fixture must mount the table scroll wrapper').not.toBeNull();
  return wrapper!;
}

function getHeaderCells(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('[data-slot="data-table-header-cell"]')];
}

async function waitForVirtualLayout(container: HTMLElement): Promise<HTMLElement> {
  const wrapper = getWrapper(container);
  await expect.poll(() => wrapper.scrollHeight > wrapper.clientHeight).toBe(true);
  await expect
    .poll(() => container.querySelectorAll('[data-slot="data-table-row"]').length)
    .toBeGreaterThan(0);
  return wrapper;
}

const strategyCases: {
  name: string;
  props: DataTableLoadStrategy;
}[] = [
  { name: 'virtualized', props: {} },
  {
    name: 'paginated + virtualized',
    props: {
      pagination: {
        kind: 'client',
        pageIndex: 0,
        pageSize: 100,
        onPageChange: () => undefined,
      },
    },
  },
  {
    name: 'infinite + virtualized',
    props: {
      infiniteScroll: {
        hasMore: true,
        busy: true,
        onLoadMore: () => undefined,
      },
    },
  },
];

describe('INV-282 / INV-286 / INV-287 / SC-009: sticky geometry is real browser behavior', () => {
  it.each(strategyCases)(
    '$name keeps row zero clear, then docks every header cell after wrapper scroll',
    async ({ props }) => {
      injectStickyStyles();
      const virtualizationRef = createRef<DataTableVirtualizationHandle | null>();
      const columns =
        props.infiniteScroll == null
          ? tokenColumns()
          : tokenColumns().map(
              ({ sortable: _sortable, getSortValue: _getSortValue, ...column }) => column
            );
      const { container } = render(
        <DataTable
          caption="Sticky geometry"
          columns={columns}
          rows={numberedTokenRows(120)}
          getRowKey={(row) => row.id}
          virtualized={{ maxHeight: 160, estimateSize: 40, overscan: 1 }}
          virtualizationRef={virtualizationRef}
          {...props}
        />
      );
      const wrapper = await waitForVirtualLayout(container);

      act(() => {
        wrapper.scrollTop = 0;
        wrapper.dispatchEvent(new Event('scroll'));
      });
      const headerCells = getHeaderCells(container);
      const firstRow = container.querySelector<HTMLElement>('[data-slot="data-table-row"]');
      const headerBottom = Math.max(
        ...headerCells.map((cell) => cell.getBoundingClientRect().bottom)
      );
      expect(
        headerBottom - firstRow!.getBoundingClientRect().top,
        'INV-286: header must not cover the first painted row at scrollTop=0'
      ).toBeLessThanOrEqual(1);

      act(() => {
        wrapper.scrollTop = 400;
        wrapper.dispatchEvent(new Event('scroll'));
      });
      await expect
        .poll(() =>
          [...container.querySelectorAll<HTMLElement>('[data-slot="data-table-row"]')].some(
            (row) => Number(row.dataset.index) > 5
          )
        )
        .toBe(true);
      const wrapperTop = wrapper.getBoundingClientRect().top;
      for (const cell of headerCells) {
        expect(
          Math.abs(cell.getBoundingClientRect().top - wrapperTop),
          'INV-287: sticky header cell must dock at the wrapper top'
        ).toBeLessThanOrEqual(1);
        expect(getComputedStyle(cell).position).toBe('sticky');
        expect(getComputedStyle(cell).display).toBe('table-cell');
        expect(
          getComputedStyle(cell).backgroundColor,
          'INV-266: sticky cell fill stays opaque (muted/50 over card)'
        ).not.toMatch(/transparent|^rgba?\(\s*0,\s*0,\s*0,\s*0(?:\s*,\s*0)?\s*\)$/);
      }

      await expect.poll(() => virtualizationRef.current).not.toBeNull();
      act(() => {
        virtualizationRef.current?.scrollToRowKey('r80', 'start');
      });
      await expect.poll(() => container.querySelector('[data-row-key="r80"]')).not.toBeNull();
      const target = container.querySelector<HTMLElement>('[data-row-key="r80"]')!;
      expect(
        target.getBoundingClientRect().top -
          Math.max(...headerCells.map((cell) => cell.getBoundingClientRect().bottom)),
        'INV-282: scrollPaddingStart must keep scrollToRowKey below the stuck header'
      ).toBeGreaterThanOrEqual(-1);
    }
  );

  it('moves the header away after scroll when stickyHeader is false', async () => {
    injectStickyStyles();
    const { container } = render(
      <DataTable
        caption="Scrolling header"
        columns={tokenColumns()}
        rows={numberedTokenRows(120)}
        getRowKey={(row) => row.id}
        stickyHeader={false}
        virtualized={{ maxHeight: 160, estimateSize: 40, overscan: 1 }}
      />
    );
    const wrapper = await waitForVirtualLayout(container);
    const header = getHeaderCells(container)[0]!;
    const initialTop = header.getBoundingClientRect().top;

    act(() => {
      wrapper.scrollTop = 400;
      wrapper.dispatchEvent(new Event('scroll'));
    });
    await expect
      .poll(() => Math.abs(header.getBoundingClientRect().top - initialTop))
      .toBeGreaterThan(100);
    expect(header.getBoundingClientRect().top).toBeLessThan(
      wrapper.getBoundingClientRect().top - 1
    );
    expect(getComputedStyle(header).position).toBe('static');
  });

  it('lets a visible caption scroll away before top-0 cells dock', async () => {
    injectStickyStyles();
    const { container } = render(
      <DataTable
        caption="Visible sticky caption"
        captionClassName="not-sr-only"
        columns={tokenColumns()}
        rows={numberedTokenRows(120)}
        getRowKey={(row) => row.id}
        virtualized={{ maxHeight: 160, estimateSize: 40, overscan: 1 }}
      />
    );
    const wrapper = await waitForVirtualLayout(container);
    const caption = container.querySelector<HTMLElement>('[data-slot="data-table-caption"]')!;
    act(() => {
      wrapper.scrollTop = 400;
      wrapper.dispatchEvent(new Event('scroll'));
    });
    await expect
      .poll(() => caption.getBoundingClientRect().bottom < wrapper.getBoundingClientRect().top)
      .toBe(true);
    expect(
      Math.abs(
        getHeaderCells(container)[0]!.getBoundingClientRect().top -
          wrapper.getBoundingClientRect().top
      )
    ).toBeLessThanOrEqual(1);
  });
});

function ControlledStickyTable({
  onSortChange,
}: {
  onSortChange: (sort: DataTableSortState | null) => void;
}): ReactElement {
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(new Set());
  return (
    <DataTable
      caption="Operable sticky header"
      columns={tokenColumns()}
      rows={numberedTokenRows(120)}
      getRowKey={(row) => row.id}
      virtualized={{ maxHeight: 160, estimateSize: 40, overscan: 1 }}
      selection={{ selectedKeys, onSelectionChange: setSelectedKeys }}
      onSortChange={onSortChange}
    />
  );
}

describe('INV-277 / INV-278 / INV-280 / INV-294: stuck controls remain operable', () => {
  it('keeps select-all hit-testing, keyboard focus, and sort activation above body paint', async () => {
    injectStickyStyles();
    const onSortChange = vi.fn();
    const { container } = render(<ControlledStickyTable onSortChange={onSortChange} />);
    const wrapper = await waitForVirtualLayout(container);
    act(() => {
      wrapper.scrollTop = 400;
      wrapper.dispatchEvent(new Event('scroll'));
    });

    const selectAll = screen.getByRole('checkbox', { name: 'Select all' });
    selectAll.focus();
    await expect.poll(() => document.activeElement).toBe(selectAll);
    const box = selectAll.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    expect(hit?.closest('[data-slot="data-table-header-cell"]')).toBe(
      selectAll.closest('[data-slot="data-table-header-cell"]')
    );

    await userEvent.keyboard(' ');
    await expect.poll(() => selectAll.getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(selectAll);

    const sort = screen.getByRole('button', { name: 'Sort by Amount' });
    await userEvent.click(sort);
    expect(onSortChange).toHaveBeenCalledWith({ columnId: 'amount', direction: 'asc' });
  });
});

describe('INV-271 / INV-291 / INV-293 / INV-295: sticky remains accessible table chrome', () => {
  it('keeps one named native table, table-cell headers, and zero WCAG A/AA violations', async () => {
    injectStickyStyles();
    const { container } = render(
      <DataTable
        caption="Accessible sticky table"
        columns={tokenColumns()}
        rows={numberedTokenRows(40)}
        getRowKey={(row) => row.id}
        virtualized
        selection={{ selectedKeys: new Set(['r0']), onSelectionChange: () => undefined }}
      />
    );
    expect(screen.getAllByRole('table', { name: 'Accessible sticky table' })).toHaveLength(1);
    expect(screen.queryByRole('grid')).toBeNull();
    expect(container.querySelector('[aria-live]')).toBeNull();
    expect(screen.getAllByRole('columnheader')).toHaveLength(tokenColumns().length + 1);
    for (const header of getHeaderCells(container)) {
      expect(getComputedStyle(header).display).toBe('table-cell');
    }
    const results = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    });
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
});
