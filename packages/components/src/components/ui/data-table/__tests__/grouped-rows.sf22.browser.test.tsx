/**
 * 005 SF-22 · DataTable grouped rows — Chromium proof.
 *
 * Covers the clauses jsdom cannot: computed display and sticky-header z-order (INV-7), live
 * virtual offsets with sections measured at a height different from the estimate (INV-29),
 * scrollToRowKey landing (INV-23), end-of-feed under real measurement (INV-32), real focus
 * across re-orders (INV-24), Tab walk and axe parity (INV-36), and the timing tiers (INV-26).
 * `INV-N` is 005 SF-22's series; initiative 004 ids are written `004 INV-NN`.
 */
import { act, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createRef, useState, type ReactElement } from 'react';

import { DataTable } from '../data-table';
import type { DataTableGrouping, DataTableProps, DataTableVirtualizationHandle } from '../types';
import {
  byRole,
  getKeyRowKey,
  keyColumns,
  keyRows,
  type KeyRow,
} from './grouped-rows.sf22-fixtures';

const DATA_ROW_PX = 40;
/** Deliberately not the 40px kit estimate, so measurement has to correct every section. */
const SECTION_ROW_PX = 52;

/** The browser config does not load the kit stylesheet; inject what geometry needs. */
function injectStyles(): void {
  if (document.getElementById('sf22-005-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'sf22-005-styles';
  style.textContent = `
    .overflow-auto { overflow: auto; }
    .overflow-x-auto { overflow-x: auto; }
    .sticky { position: sticky; }
    .top-0 { top: 0; }
    .z-20 { z-index: 20; }
    .relative { position: relative; }
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0;
    }
    [data-slot="data-table-header-cell"] { background: #eee; }
    [data-slot="data-table-table"] { border-collapse: collapse; width: 100%; }
    [data-slot="data-table-row"] { height: ${String(DATA_ROW_PX)}px; }
    [data-slot="data-table-group-row"] { height: ${String(SECTION_ROW_PX)}px; }
    [data-slot="data-table-header-cell"] { height: 40px; }
  `;
  document.head.appendChild(style);
}

const noop = (): void => undefined;

async function frames(count = 2): Promise<void> {
  for (let n = 0; n < count; n += 1) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

function tenGroupRows(count: number): KeyRow[] {
  const perGroup = Math.ceil(count / 10);
  return keyRows(count).map((row, n) => ({ ...row, role: `G${String(Math.floor(n / perGroup))}` }));
}

function tableProps(extra: Readonly<Record<string, unknown>> = {}): DataTableProps<KeyRow> {
  return {
    caption: 'Keys',
    columns: keyColumns(),
    rows: keyRows(12, [5]),
    getRowKey: getKeyRowKey,
    grouping: byRole(),
    ...extra,
  } as DataTableProps<KeyRow>;
}

/** Sticky positioning lives on the header cells, not on `<thead>`. */
function headerCellRect(container: HTMLElement): DOMRect {
  return container
    .querySelector<HTMLElement>('th[data-slot="data-table-header-cell"]')!
    .getBoundingClientRect();
}

function wrapOf(container: HTMLElement): HTMLDivElement {
  return container.querySelector<HTMLDivElement>('div[data-slot="data-table"]')!;
}

/** Section + data rows, sorted by aria-rowindex, with their boxes. */
function mountedBoxes(
  container: HTMLElement
): { index: number; slot: string; top: number; bottom: number; key: string }[] {
  return [
    ...container.querySelectorAll<HTMLTableRowElement>(
      'tr[data-slot="data-table-row"], tr[data-slot="data-table-group-row"]'
    ),
  ]
    .map((tr) => {
      const rect = tr.getBoundingClientRect();
      return {
        index: Number(tr.getAttribute('aria-rowindex')),
        slot: tr.getAttribute('data-slot')!,
        top: rect.top,
        bottom: rect.bottom,
        key: tr.getAttribute('data-row-key') ?? `§${tr.getAttribute('data-group-key') ?? 'null'}`,
      };
    })
    .sort((a, b) => a.index - b.index);
}

async function scrollAndSettle(wrap: HTMLElement, top: number): Promise<void> {
  wrap.scrollTop = top;
  wrap.dispatchEvent(new Event('scroll'));
  // Measure → re-layout → re-measure: give TanStack a few frames to converge.
  await frames(4);
}

describe('INV-7 (browser): section rows keep table display; the sticky header paints over them', () => {
  it('computed display is table-row / table-cell', () => {
    injectStyles();
    const { container } = render(<DataTable {...tableProps()} />);
    const tr = container.querySelector<HTMLElement>('tr[data-slot="data-table-group-row"]')!;
    expect(getComputedStyle(tr).display).toBe('table-row');
    expect(getComputedStyle(tr.querySelector('th')!).display).toBe('table-cell');
    expect(getComputedStyle(tr).position).toBe('static');
    // The spanning cell covers the full table width (no ragged band).
    const table = container.querySelector('table')!.getBoundingClientRect();
    const th = tr.querySelector('th')!.getBoundingClientRect();
    expect(Math.abs(th.width - table.width)).toBeLessThanOrEqual(1);
  });

  it('a section scrolled under the sticky header is painted beneath it', async () => {
    injectStyles();
    const { container } = render(
      <DataTable
        {...tableProps({ rows: tenGroupRows(400), virtualized: true, stickyHeader: true })}
      />
    );
    const wrap = wrapOf(container);
    await frames();
    await scrollAndSettle(wrap, 400);
    const first = [
      ...container.querySelectorAll<HTMLElement>('tr[data-slot="data-table-group-row"]'),
    ].at(-1)!;
    const groupKey = first.getAttribute('data-group-key')!;
    const wrapTop = wrap.getBoundingClientRect().top;
    const sectionOffset = first.getBoundingClientRect().top - wrapTop + wrap.scrollTop;
    await scrollAndSettle(wrap, sectionOffset - 10);
    const section = container.querySelector<HTMLElement>(`tr[data-group-key="${groupKey}"]`)!;
    expect(section).not.toBeNull();
    const head = headerCellRect(container);
    const sectionRect = section.getBoundingClientRect();
    expect(sectionRect.top).toBeLessThan(head.bottom); // overlaps the header band
    const probe = document.elementFromPoint(head.left + 30, head.top + head.height / 2);
    expect(
      container.querySelector('thead')!.contains(probe),
      'INV-7: header paints over the section'
    ).toBe(true);
    expect(getComputedStyle(section).position).toBe('static');
  });
});

describe('INV-29 (browser): virtual offsets stay aligned with section rows included', () => {
  it.each([
    { name: 'top', at: 0 },
    { name: 'middle', at: 0.5 },
    { name: 'end', at: 1 },
  ])('scrolled to the $name: rows tile with no overlap or gap; spacer matches', async ({ at }) => {
    injectStyles();
    const rows = tenGroupRows(2000);
    const { container } = render(
      <DataTable {...tableProps({ rows, virtualized: { maxHeight: 480 } })} />
    );
    const wrap = wrapOf(container);
    await frames(3);
    // Converge: scrolling to the end can grow the measured total; repeat until stable.
    for (let pass = 0; pass < 6; pass += 1) {
      await scrollAndSettle(wrap, Math.round((wrap.scrollHeight - wrap.clientHeight) * at));
    }
    const boxes = mountedBoxes(container);
    expect(boxes.length).toBeGreaterThan(5);
    for (let n = 1; n < boxes.length; n += 1) {
      expect(boxes[n]!.index, 'INV-35: consecutive indices').toBe(boxes[n - 1]!.index + 1);
      const gap = boxes[n]!.top - boxes[n - 1]!.bottom;
      expect(Math.abs(gap), `INV-29: ${boxes[n - 1]!.key} → ${boxes[n]!.key}`).toBeLessThanOrEqual(
        1
      );
    }
    for (const box of boxes) {
      const height = box.bottom - box.top;
      expect(
        Math.abs(height - (box.slot === 'data-table-group-row' ? SECTION_ROW_PX : DATA_ROW_PX))
      ).toBeLessThanOrEqual(1);
    }
    const body = container.querySelector('tbody')!.getBoundingClientRect();
    const topSpacer = container.querySelector<HTMLElement>(
      'tr[data-slot="data-table-spacer"][data-spacer="top"], tr[data-spacer="top"]'
    );
    const spacerHeight = topSpacer ? topSpacer.getBoundingClientRect().height : 0;
    expect(Math.abs(boxes[0]!.top - body.top - spacerHeight)).toBeLessThanOrEqual(1);
    if (at === 1) {
      // The last item is the last data row, fully reachable, and the content ends with it.
      const last = boxes.at(-1)!;
      expect(last.key).toBe(rows.at(-1)!.id);
      expect(last.index).toBe(1 + rows.length + 10);
      const wrapRect = wrap.getBoundingClientRect();
      expect(last.bottom).toBeLessThanOrEqual(wrapRect.bottom + 1);
      expect(Math.abs(wrap.scrollTop + wrap.clientHeight - wrap.scrollHeight)).toBeLessThanOrEqual(
        1
      );
      expect(Math.abs(body.bottom - last.bottom)).toBeLessThanOrEqual(1);
    }
  });
});

describe('INV-23 (browser): scrollToRowKey lands on the data row, not N sections short', () => {
  it('last row of the last group and a mid-list row land in view; section keys do not scroll', async () => {
    injectStyles();
    const rows = tenGroupRows(2000);
    const ref = createRef<DataTableVirtualizationHandle | null>();
    const { container } = render(
      <DataTable
        {...tableProps({ rows, virtualized: { maxHeight: 480 }, virtualizationRef: ref })}
      />
    );
    const wrap = wrapOf(container);
    await expect.poll(() => ref.current).not.toBeNull();
    await frames(2);

    const before = wrap.scrollTop;
    act(() => ref.current!.scrollToRowKey('__data-table-group:G5'));
    act(() => ref.current!.scrollToRowKey('__data-table-group-none'));
    await frames(3);
    expect(wrap.scrollTop).toBe(before);

    for (const key of ['key-1999', 'key-1234', 'key-0']) {
      act(() => ref.current!.scrollToRowKey(key, 'center'));
      await expect
        .poll(() => container.querySelector(`tr[data-row-key="${key}"]`) != null, { timeout: 3000 })
        .toBe(true);
      await frames(4);
      act(() => ref.current!.scrollToRowKey(key, 'center'));
      await frames(4);
      const tr = container.querySelector<HTMLElement>(`tr[data-row-key="${key}"]`)!;
      const rect = tr.getBoundingClientRect();
      const view = wrap.getBoundingClientRect();
      const head = headerCellRect(container);
      expect(rect.top, key).toBeGreaterThanOrEqual(head.bottom - 1);
      expect(rect.bottom, key).toBeLessThanOrEqual(view.bottom + 1);
      if (key === 'key-1234') {
        // 'center' really centres the row (an off-by-sections bug misses by ≥ 52px each).
        const centre = (head.bottom + view.bottom) / 2;
        expect(Math.abs((rect.top + rect.bottom) / 2 - centre)).toBeLessThanOrEqual(SECTION_ROW_PX);
      }
    }
  });
});

describe('INV-32 (browser): end-of-feed fires when the last data row mounts, not before', () => {
  it('scrolling in 40px steps: onLoadMore first fires in the step that mounts the last data row', async () => {
    injectStyles();
    const rows = keyRows(90).map((row, n) => ({ ...row, role: KEY_ROLESOrder(n) }));
    const onLoadMore = vi.fn();
    const { container } = render(
      <DataTable
        {...tableProps({
          rows,
          virtualized: { maxHeight: 400, overscan: 2 },
          infiniteScroll: { hasMore: true, onLoadMore },
        })}
      />
    );
    const wrap = wrapOf(container);
    await frames(3);
    expect(onLoadMore).not.toHaveBeenCalled();
    const lastKey = rows.at(-1)!.id;
    let firedAtStep = -1;
    let lastMountedAtStep = -1;
    for (let step = 1; step < 200; step += 1) {
      await scrollAndSettle(wrap, step * 40);
      const lastMounted = container.querySelector(`tr[data-row-key="${lastKey}"]`) != null;
      if (lastMounted && lastMountedAtStep === -1) {
        lastMountedAtStep = step;
      }
      if (onLoadMore.mock.calls.length > 0 && firedAtStep === -1) {
        firedAtStep = step;
        expect(lastMounted, 'INV-32: fired before the last data row mounted').toBe(true);
      }
      if (firedAtStep !== -1 && lastMountedAtStep !== -1) {
        break;
      }
    }
    expect(firedAtStep).toBeGreaterThan(0);
    expect(firedAtStep).toBe(lastMountedAtStep);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});

/** Group-contiguous roles for the feed: 30 Admin, 30 Minter, 30 Pauser. */
function KEY_ROLESOrder(n: number): string {
  return n < 30 ? 'Admin' : n < 60 ? 'Minter' : 'Pauser';
}

describe('INV-24 (browser): real focus survives grouped re-orders', () => {
  function Harness({ grouped }: { grouped: boolean }): ReactElement {
    const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(() => new Set());
    return (
      <DataTable
        {...tableProps({
          rows: keyRows(9),
          grouping: grouped ? byRole() : undefined,
          selection: { selectedKeys, onSelectionChange: setSelectedKeys },
        })}
      />
    );
  }

  it.each([true, false])(
    'grouped=%s: sort cycle keeps focus on the row checkbox',
    async (grouped) => {
      injectStyles();
      render(<Harness grouped={grouped} />);
      const checkbox = screen.getByRole('checkbox', { name: 'Select key-4' });
      const sortButton = screen.getByRole('button', { name: /Sort by Added/ });
      for (let click = 0; click < 3; click += 1) {
        checkbox.focus();
        expect(document.activeElement).toBe(checkbox);
        // Activate the sort without moving focus (an app-driven sort, e.g. from a shortcut).
        act(() => sortButton.click());
        await frames(1);
        expect(
          screen.getByRole('checkbox', { name: 'Select key-4' }),
          `click ${String(click + 1)}`
        ).toBe(checkbox);
        expect(
          document.activeElement,
          `grouped=${String(grouped)} click ${String(click + 1)}`
        ).toBe(checkbox);
      }
    }
  );
});

describe('INV-36 (browser): no new tab stops, no new axe violations', () => {
  function TabHarness({
    grouping,
  }: {
    grouping: DataTableGrouping<KeyRow> | undefined;
  }): ReactElement {
    return (
      <>
        <input aria-label="Before" />
        <DataTable
          {...tableProps({
            rows: keyRows(6, [2]),
            grouping,
            selection: { selectedKeys: new Set<string>(), onSelectionChange: noop },
          })}
        />
        <button type="button">After</button>
      </>
    );
  }

  async function tabWalk(): Promise<string[]> {
    screen.getByRole('textbox', { name: 'Before' }).focus();
    const stops: string[] = [];
    for (let step = 0; step < 40; step += 1) {
      await userEvent.tab();
      const active = document.activeElement as HTMLElement | null;
      if (active == null || active.textContent === 'After') {
        break;
      }
      stops.push(active.getAttribute('aria-label') ?? active.textContent?.trim() ?? active.tagName);
    }
    return stops;
  }

  it('default renderer: the Tab walk equals the ungrouped table’s', async () => {
    injectStyles();
    const grouped = render(<TabHarness grouping={byRole()} />);
    const groupedStops = await tabWalk();
    grouped.unmount();
    const plain = render(<TabHarness grouping={undefined} />);
    const plainStops = await tabWalk();
    plain.unmount();
    expect(groupedStops.length).toBeGreaterThan(3);
    expect(groupedStops.sort()).toEqual(plainStops.sort());
  });

  it('integrator content in renderGroupHeader keeps its native order', async () => {
    injectStyles();
    render(
      <TabHarness
        grouping={byRole({
          renderGroupHeader: (info) => (
            <span>
              {info.key ?? 'No role'}{' '}
              <button type="button">{`Revoke ${info.key ?? 'none'}`}</button>
            </span>
          ),
        })}
      />
    );
    const stops = await tabWalk();
    const revokes = stops.filter((stop) => stop.startsWith('Revoke'));
    expect(revokes).toEqual(['Revoke Admin', 'Revoke Minter', 'Revoke Pauser', 'Revoke none']);
    // Admin's revoke comes right before Admin's first row checkbox.
    expect(stops[stops.indexOf('Revoke Admin') + 1]).toBe('Select key-0');
  });

  it('axe: grouped tables add no violation over the ungrouped baseline', async () => {
    injectStyles();
    const run = async (element: ReactElement) => {
      const { container, unmount } = render(element);
      await frames(2);
      const results = await axe.run(container, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'best-practice'] },
      });
      unmount();
      return results.violations.map((violation) => violation.id).sort();
    };
    const selection = { selectedKeys: new Set(['key-1']), onSelectionChange: noop };
    for (const extra of [
      { selection },
      { selection, virtualized: true, rows: keyRows(120, [10, 55, 100]) },
      {
        rows: keyRows(12),
        pagination: { kind: 'client', pageIndex: 1, pageSize: 5, onPageChange: noop },
      },
    ]) {
      const grouped = await run(<DataTable {...tableProps(extra)} />);
      const plain = await run(<DataTable {...tableProps({ ...extra, grouping: undefined })} />);
      expect(grouped).toEqual(plain);
      expect(grouped).not.toContain('th-has-data-cells');
      expect(grouped).not.toContain('empty-table-header');
    }
  });
});

describe('INV-26 (browser): grouped virtualization stays O(viewport); timing tiers', () => {
  function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)]!;
  }

  async function timeMountAndSort(
    rows: KeyRow[],
    grouped: boolean
  ): Promise<{ mount: number; sort: number; mounted: number; cells: number; headers: number }> {
    let cells = 0;
    let headers = 0;
    const columns = keyColumns(() => (cells += 1));
    const grouping = grouped
      ? byRole({ renderGroupHeader: (info) => ((headers += 1), info.key) })
      : undefined;
    const t0 = performance.now();
    const { container, unmount } = render(
      <DataTable {...tableProps({ rows, columns, grouping, virtualized: rows.length > 50 })} />
    );
    const mount = performance.now() - t0;
    const mounted = container.querySelectorAll(
      'tbody > tr[data-slot^="data-table-"]:not([data-slot="data-table-spacer"])'
    ).length;
    const button = screen.getByRole('button', { name: /Sort by Added/ });
    const t1 = performance.now();
    act(() => button.click());
    const sort = performance.now() - t1;
    unmount();
    return { mount, sort, mounted, cells, headers };
  }

  it('3 / 100 / 10k rows: mounted rows, cell and header calls bounded; timing recorded', async () => {
    injectStyles();
    const report: Record<string, unknown>[] = [];
    for (const size of [3, 100, 10_000]) {
      const rows = tenGroupRows(size);
      const grouped: number[][] = [];
      const plain: number[][] = [];
      let groupedSample = await timeMountAndSort(rows, true); // warm-up
      await timeMountAndSort(rows, false);
      for (let run = 0; run < 7; run += 1) {
        groupedSample = await timeMountAndSort(rows, true);
        const plainSample = await timeMountAndSort(rows, false);
        grouped.push([groupedSample.mount, groupedSample.sort]);
        plain.push([plainSample.mount, plainSample.sort]);
      }
      const row = {
        size,
        groupedMount: median(grouped.map((g) => g[0]!)),
        plainMount: median(plain.map((p) => p[0]!)),
        groupedSort: median(grouped.map((g) => g[1]!)),
        plainSort: median(plain.map((p) => p[1]!)),
        mounted: groupedSample.mounted,
        cells: groupedSample.cells,
        headers: groupedSample.headers,
      };
      report.push(row);
      if (size === 10_000) {
        expect(row.mounted, 'INV-26: O(viewport) mount').toBeLessThan(80);
        // cell runs for mounted data rows only (mount + one sort re-render ≈ 2 windows).
        expect(row.cells).toBeLessThan(200);
        expect(row.headers).toBeLessThan(40);
        // Guard against O(N²) regressions; the 1.5× calibration is recorded, not asserted.
        expect(row.groupedMount / row.plainMount).toBeLessThan(4);
        expect(row.groupedSort / row.plainSort).toBeLessThan(4);
      }
    }
    // Timing evidence for the stage artifact (INV-26, Invariants OQ3).
    console.info(`SF22-INV26 ${JSON.stringify(report)}`);
  });
});
