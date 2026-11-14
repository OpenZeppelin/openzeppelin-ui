/**
 * DataTable section rows: heading look and the `groupRowClassName` hook (Chromium).
 * Covers the virtualized path and computed styles that jsdom cannot see.
 */
import { render } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';

import { DataTable } from '../data-table';
import type { DataTableGrouping, DataTableProps } from '../types';
import {
  byRole,
  getKeyRowKey,
  keyColumns,
  keyRows,
  type KeyRow,
} from './grouped-rows.sf22-fixtures';

/** The browser config does not load the kit stylesheet; inject the few rules these checks read. */
function injectStyles(): void {
  if (document.getElementById('group-row-style-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'group-row-style-styles';
  style.textContent = `
    .overflow-auto { overflow: auto; }
    .bg-muted\\/60 { background-color: rgb(240, 240, 240); }
    .bg-brand { background-color: rgb(10, 20, 30); }
    [data-slot="data-table-table"] { border-collapse: collapse; width: 100%; }
    [data-slot="data-table-row"], [data-slot="data-table-group-row"] { height: 40px; }
    .text-xs { font-size: 12px; }
    .font-semibold { font-weight: 600; }
  `;
  document.head.appendChild(style);
}

function props(
  grouping: DataTableGrouping<KeyRow>,
  extra: Partial<Pick<DataTableProps<KeyRow>, 'rows' | 'virtualized'>> = {}
): DataTableProps<KeyRow> {
  return {
    caption: 'Keys',
    columns: keyColumns(),
    rows: keyRows(300).map((row, n) => ({ ...row, role: `G${String(Math.floor(n / 30))}` })),
    getRowKey: getKeyRowKey,
    grouping,
    ...extra,
  };
}

function mountedSections(container: HTMLElement): HTMLTableRowElement[] {
  return [
    ...container.querySelectorAll<HTMLTableRowElement>('tr[data-slot="data-table-group-row"]'),
  ];
}

describe('virtualized path', () => {
  it('puts groupRowClassName on every mounted section row, and only a window is mounted', () => {
    injectStyles();
    const { container } = render(
      <DataTable
        {...props(byRole({ groupRowClassName: 'bg-brand' }), { virtualized: { maxHeight: 400 } })}
      />
    );
    const sections = mountedSections(container);
    expect(sections.length).toBeGreaterThan(0);
    expect(sections.length).toBeLessThan(10);
    for (const tr of sections) {
      expect(tr.classList.contains('bg-brand')).toBe(true);
      expect(tr.classList.contains('bg-muted/60')).toBe(false);
      expect(tr.classList.contains('border-b')).toBe(true);
      expect(getComputedStyle(tr).backgroundColor).toBe('rgb(10, 20, 30)');
    }
  });

  it('paints the default look on the virtualized path without a consumer class', () => {
    injectStyles();
    const { container } = render(
      <DataTable {...props(byRole(), { virtualized: { maxHeight: 400 } })} />
    );
    for (const tr of mountedSections(container)) {
      expect(tr.classList.contains('bg-muted/60')).toBe(true);
    }
  });
});

describe('computed styles', () => {
  it('section row fill and type differ from a data row; display stays table-row', () => {
    injectStyles();
    const { container } = render(
      <DataTable
        {...props(byRole(), {
          rows: keyRows(12).map((r, n) => ({ ...r, role: n < 6 ? 'A' : 'B' })),
        })}
      />
    );
    const tr = mountedSections(container)[0]!;
    const th = tr.querySelector('th')!;
    const dataRow = container.querySelector<HTMLElement>('tr[data-slot="data-table-row"]')!;
    expect(getComputedStyle(tr).backgroundColor).not.toBe(
      getComputedStyle(dataRow).backgroundColor
    );
    expect(getComputedStyle(th).fontSize).toBe('12px');
    expect(getComputedStyle(th).fontWeight).toBe('600');
    expect(getComputedStyle(tr).display).toBe('table-row');
    expect(getComputedStyle(th).display).toBe('table-cell');
    expect(getComputedStyle(tr).position).toBe('static');
  });

  it('a consumer fill wins over the default in computed style', () => {
    injectStyles();
    const { container } = render(
      <DataTable {...props(byRole({ groupRowClassName: 'bg-brand' }), { rows: keyRows(6) })} />
    );
    for (const tr of mountedSections(container)) {
      expect(getComputedStyle(tr).backgroundColor).toBe('rgb(10, 20, 30)');
    }
  });

  it('axe finds no wcag2a/aa violation in the grouped table with the custom class', async () => {
    injectStyles();
    const { container } = render(
      <DataTable {...props(byRole({ groupRowClassName: 'bg-brand' }), { rows: keyRows(9) })} />
    );
    const results = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
