/**
 * 005 SF-7 · DataTable `hideHeaderWhenEmpty` — Chromium proof.
 *
 * Covers the clauses jsdom cannot: computed layout (INV-5), real sequential Tab order (INV-22),
 * axe parity (INV-23), browser focus fixup (INV-14) and live virtual measurement (INV-17).
 * `INV-N` is 005 SF-7's series; initiative 004 ids are written `004 INV-NN`.
 */
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { act, createRef, useState, type ReactElement, type ReactNode } from 'react';

import { DataTable } from '../data-table';
import type { DataTableProps, DataTableVirtualizationHandle } from '../types';
import { numberedTokenRows, TOKEN_ROWS, tokenColumns, type TokenRow } from './sf2-fixtures';

/** The browser config does not load the kit stylesheet; inject the few utilities geometry needs. */
function injectStyles(): void {
  if (document.getElementById('sf7-005-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'sf7-005-styles';
  style.textContent = `
    .overflow-auto { overflow: auto; }
    .overflow-x-auto { overflow-x: auto; }
    .sticky { position: sticky; }
    .top-0 { top: 0; }
    .z-20 { z-index: 20; }
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0;
    }
    .not-sr-only {
      position: static; width: auto; height: auto; padding: 12px; margin: 0;
      overflow: visible; clip: auto; white-space: normal;
    }
    [data-slot="data-table-table"] { border-collapse: collapse; width: 100%; }
    [data-slot="data-table-row"] { height: 40px; }
    [data-slot="data-table-header-cell"] { height: 40px; }
  `;
  document.head.appendChild(style);
}

const noop = (): void => undefined;

function headOf(root: ParentNode): HTMLTableSectionElement {
  const head = root.querySelector<HTMLTableSectionElement>('thead[data-slot="data-table-head"]');
  expect(head, '004 INV-35: <thead> is always mounted').not.toBeNull();
  return head!;
}

function emptyRowOf(root: ParentNode): HTMLElement {
  const row = root.querySelector<HTMLElement>('tr[data-slot="data-table-empty"]');
  expect(row).not.toBeNull();
  return row!;
}

/** Untyped overrides: tests mix name branches and load strategies across one helper. */
type TableExtra = Readonly<Record<string, unknown>>;

function emptyTable(optIn: boolean, extra: TableExtra = {}): DataTableProps<TokenRow> {
  return {
    caption: 'Accounts',
    columns: tokenColumns(),
    rows: [],
    getRowKey: (row) => row.id,
    hideHeaderWhenEmpty: optIn,
    ...extra,
  } as DataTableProps<TokenRow>;
}

describe('INV-5 (browser): no orphaned header chrome is painted', () => {
  it('opt-in: thead is display:none with zero height; the empty row sits at the table top', () => {
    injectStyles();
    const { container } = render(<DataTable {...emptyTable(true, { stickyHeader: true })} />);
    const head = headOf(container);
    expect(head.hidden).toBe(true);
    expect(getComputedStyle(head).display).toBe('none');
    expect(head.getBoundingClientRect().height).toBe(0);
    const table = container.querySelector('table')!;
    expect(
      Math.abs(
        emptyRowOf(container).getBoundingClientRect().top - table.getBoundingClientRect().top
      )
    ).toBeLessThanOrEqual(1);
  });

  it('boundary — opt-in off: the header band is painted above the empty row', () => {
    injectStyles();
    const { container } = render(<DataTable {...emptyTable(false)} />);
    const head = headOf(container);
    expect(getComputedStyle(head).display).toBe('table-header-group');
    const headHeight = head.getBoundingClientRect().height;
    expect(headHeight).toBeGreaterThan(0);
    const table = container.querySelector('table')!;
    expect(
      emptyRowOf(container).getBoundingClientRect().top - table.getBoundingClientRect().top
    ).toBeGreaterThanOrEqual(headHeight - 1);
  });

  it('visible caption: the empty row starts right under the caption', () => {
    injectStyles();
    const { container } = render(
      <DataTable {...emptyTable(true, { captionClassName: 'not-sr-only' })} />
    );
    const caption = container.querySelector('caption')!;
    expect(
      Math.abs(
        emptyRowOf(container).getBoundingClientRect().top - caption.getBoundingClientRect().bottom
      )
    ).toBeLessThanOrEqual(1);
  });

  it('framed with a toolbar: nothing is painted between the scroller top and the empty row', () => {
    injectStyles();
    const { container } = render(
      <DataTable {...emptyTable(true, { toolbar: <input aria-label="Search accounts" /> })} />
    );
    const scroller = container.querySelector<HTMLElement>('[data-slot="data-table"]')!;
    expect(
      Math.abs(
        emptyRowOf(container).getBoundingClientRect().top - scroller.getBoundingClientRect().top
      )
    ).toBeLessThanOrEqual(1);
  });
});

function TabHarness(props: {
  optIn: boolean;
  rows: readonly TokenRow[];
  emptyState?: ReactNode;
}): ReactElement {
  return (
    <>
      <input aria-label="Before" />
      <DataTable
        caption="Accounts"
        columns={tokenColumns()}
        rows={props.rows}
        getRowKey={(row) => row.id}
        hideHeaderWhenEmpty={props.optIn}
        emptyState={props.emptyState}
        selection={{ selectedKeys: new Set<string>(), onSelectionChange: noop }}
        pagination={{
          kind: 'client',
          pageIndex: 0,
          pageSize: 10,
          onPageChange: noop,
          placement: 'inside',
        }}
      />
      <button type="button">After</button>
    </>
  );
}

/** Tab from "Before" until "After"; returns each stop's accessible-ish label and thead membership. */
async function tabWalk(container: HTMLElement): Promise<{ label: string; inHead: boolean }[]> {
  screen.getByRole('textbox', { name: 'Before' }).focus();
  const head = headOf(container);
  const stops: { label: string; inHead: boolean }[] = [];
  for (let step = 0; step < 30; step += 1) {
    await userEvent.tab();
    const active = document.activeElement as HTMLElement | null;
    if (active == null || active.textContent === 'After') {
      break;
    }
    stops.push({
      label: active.getAttribute('aria-label') ?? active.textContent?.trim() ?? active.tagName,
      inHead: head.contains(active),
    });
  }
  return stops;
}

describe('INV-22 (browser): sequential Tab never stops on a hidden header control', () => {
  it('hidden: Tab goes Before → empty-content action → pager → After', async () => {
    const { container } = render(
      <TabHarness optIn rows={[]} emptyState={<button type="button">Add account</button>} />
    );
    expect(headOf(container).hidden).toBe(true);
    const stops = await tabWalk(container);
    expect(stops.filter((stop) => stop.inHead)).toEqual([]);
    expect(stops[0]?.label).toBe('Add account');
    expect(stops.length).toBeGreaterThan(1);
  });

  it('hidden, no focusable empty content: Tab goes straight to the pager, skipping the header', async () => {
    const { container } = render(<TabHarness optIn rows={[]} />);
    const stops = await tabWalk(container);
    expect(stops.filter((stop) => stop.inHead)).toEqual([]);
    const pager = container.querySelector('nav')!;
    expect(stops.length).toBeGreaterThan(0);
    expect(pager.textContent).toContain(stops[0]!.label);
  });

  it('header visible again: the Tab order equals the opt-in-off order', async () => {
    const on = render(<TabHarness optIn rows={TOKEN_ROWS} />);
    const onStops = await tabWalk(on.container);
    on.unmount();
    const off = render(<TabHarness optIn={false} rows={TOKEN_ROWS} />);
    const offStops = await tabWalk(off.container);
    expect(onStops.some((stop) => stop.inHead)).toBe(true);
    expect(onStops).toEqual(offStops);
  });
});

describe('INV-23 (browser): axe reports no violations beyond the opt-in-off table', () => {
  const branches: {
    name: string;
    extra: TableExtra;
    external?: ReactNode;
  }[] = [
    { name: 'caption', extra: {} },
    { name: 'aria-label', extra: { caption: undefined, 'aria-label': 'Accounts' } },
    {
      name: 'aria-labelledby',
      extra: { caption: undefined, 'aria-labelledby': 'sf7-axe-heading' },
      external: <h2 id="sf7-axe-heading">Accounts</h2>,
    },
  ];

  it.each(branches)('$name + selection + inside pager', async (branch) => {
    const violationIds = async (optIn: boolean): Promise<string[]> => {
      const { container, unmount } = render(
        <>
          {branch.external}
          <DataTable
            {...emptyTable(optIn, {
              ...branch.extra,
              selection: { selectedKeys: new Set<string>(), onSelectionChange: noop },
              pagination: {
                kind: 'client',
                pageIndex: 0,
                pageSize: 10,
                onPageChange: noop,
                placement: 'inside',
              },
            })}
          />
        </>
      );
      const results = await axe.run(container, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
      });
      unmount();
      return results.violations.map((violation) => violation.id).sort();
    };
    const off = await violationIds(false);
    const on = await violationIds(true);
    expect(on.filter((id) => !off.includes(id))).toEqual([]);
    expect(on).toEqual([]);
  });
});

describe('INV-14 (browser): the kit never moves focus because the header hid', () => {
  it('a focused sort button that hides is left to the browser; the kit calls no focus()', async () => {
    let setRows: (rows: readonly TokenRow[]) => void = noop;
    function Harness(): ReactElement {
      const [rows, update] = useState<readonly TokenRow[]>(TOKEN_ROWS);
      setRows = update;
      return <DataTable {...emptyTable(true, { rows })} />;
    }
    const { container } = render(<Harness />);
    const sortButton = screen.getByRole('button', { name: /Sort by Amount/ });
    sortButton.focus();
    expect(document.activeElement).toBe(sortButton);

    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    expect(() => {
      act(() => {
        setRows([]);
      });
    }).not.toThrow();
    expect(headOf(container).hidden).toBe(true);
    // Chromium's focus fixup drops focus from a node that is no longer rendered.
    await expect.poll(() => document.activeElement).toBe(document.body);
    expect(focusSpy).not.toHaveBeenCalled();
    focusSpy.mockRestore();
  });
});

describe('INV-17 (browser): virtual padding is measured from the visible header on return', () => {
  it('[] → 500 rows with the opt-in: row 0 clears the header; scrollToRowKey stays below it', async () => {
    injectStyles();
    let setRows: (rows: readonly TokenRow[]) => void = noop;
    const virtualizationRef = createRef<DataTableVirtualizationHandle | null>();
    function Harness(): ReactElement {
      const [rows, update] = useState<readonly TokenRow[]>([]);
      setRows = update;
      return (
        <DataTable
          {...emptyTable(true, {
            rows,
            stickyHeader: true,
            virtualized: { maxHeight: 160, estimateSize: 40, overscan: 1 },
            virtualizationRef,
          })}
        />
      );
    }
    const { container } = render(<Harness />);
    expect(headOf(container).hidden).toBe(true);

    act(() => {
      setRows(numberedTokenRows(500));
    });
    expect(headOf(container).hidden).toBe(false);
    const wrapper = container.querySelector<HTMLElement>('[data-slot="data-table"]')!;
    await expect.poll(() => wrapper.scrollHeight > wrapper.clientHeight).toBe(true);
    await expect
      .poll(() => container.querySelectorAll('[data-slot="data-table-row"]').length)
      .toBeGreaterThan(0);

    const headerCells = [
      ...container.querySelectorAll<HTMLElement>('[data-slot="data-table-header-cell"]'),
    ];
    const headerBottom = (): number =>
      Math.max(...headerCells.map((cell) => cell.getBoundingClientRect().bottom));
    expect(headOf(container).getBoundingClientRect().height).toBeGreaterThan(0);
    const firstRow = container.querySelector<HTMLElement>('[data-slot="data-table-row"]')!;
    expect(
      headerBottom() - firstRow.getBoundingClientRect().top,
      '004 INV-286: header must not cover row 0'
    ).toBeLessThanOrEqual(1);

    await expect.poll(() => virtualizationRef.current).not.toBeNull();
    act(() => {
      virtualizationRef.current?.scrollToRowKey('r80', 'start');
    });
    await expect.poll(() => container.querySelector('[data-row-key="r80"]')).not.toBeNull();
    const target = container.querySelector<HTMLElement>('[data-row-key="r80"]')!;
    // 004 INV-282: paddingStart must reflect the visible header, not a 0 captured while hidden.
    await expect
      .poll(() => target.getBoundingClientRect().top - headerBottom())
      .toBeGreaterThanOrEqual(-1);
  });
});
