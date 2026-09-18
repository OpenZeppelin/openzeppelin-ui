/**
 * SF-4 · Render contract — INV-114 … INV-122, INV-78 windowing.
 */
import './sf4-jsdom-setup';

import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataTable } from '../data-table';
import { applyClientSort } from '../sort';
import {
  captionTableProps,
  getTokenRowKey,
  numberedTokenRows,
  TOKEN_ROWS,
  tokenColumns,
  type TokenRow,
} from './sf2-fixtures';

const SLOT = {
  wrap: '[data-slot="data-table"]',
  table: '[data-slot="data-table-table"]',
  caption: '[data-slot="data-table-caption"]',
  row: '[data-slot="data-table-row"]',
  spacer: '[data-slot="data-table-spacer"]',
  empty: '[data-slot="data-table-empty"]',
} as const;

function dataRows(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll(SLOT.row)] as HTMLElement[];
}

describe('INV-114: unvirtualized instances keep the P1 ARIA and overflow surface', () => {
  it('omits rowcount, rowindex, spacers, and kit maxHeight when virtualized is omitted or false', () => {
    const columns = tokenColumns();
    const omitted = render(
      <DataTable caption="P1" columns={columns} rows={TOKEN_ROWS} getRowKey={getTokenRowKey} />
    );
    const virt = render(
      <DataTable
        caption="P2"
        columns={columns}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        virtualized
      />
    );

    const p1Wrap = omitted.container.querySelector(SLOT.wrap);
    expect(omitted.container.querySelector('[aria-rowcount]')).toBeNull();
    expect(omitted.container.querySelector('[aria-rowindex]')).toBeNull();
    expect(omitted.container.querySelector(SLOT.spacer)).toBeNull();
    expect(p1Wrap?.className).toMatch(/\boverflow-x-auto\b/);
    expect(p1Wrap?.className).not.toMatch(/\boverflow-auto\b/);
    expect((p1Wrap as HTMLElement | null)?.style.maxHeight).toBe('');
    expect(dataRows(omitted.container).map((row) => row.getAttribute('data-row-key'))).toEqual(
      TOKEN_ROWS.map((row) => row.id)
    );

    expect(virt.container.querySelector('table')?.getAttribute('aria-rowcount')).toBe(
      String(1 + TOKEN_ROWS.length)
    );
    expect(virt.container.querySelector('thead tr')?.getAttribute('aria-rowindex')).toBe('1');
    expect(virt.container.querySelectorAll('[data-column-id="amount"]').length).toBeGreaterThan(0);
    expect(omitted.container.querySelectorAll('[data-column-id="label"]').length).toBeGreaterThan(
      0
    );
  });

  it('treats virtualized={false} as the P1 path', () => {
    const { container } = render(<DataTable {...captionTableProps({ virtualized: false })} />);
    expect(container.querySelector('[aria-rowcount]')).toBeNull();
    expect(container.querySelector(SLOT.spacer)).toBeNull();
  });
});

describe('INV-116: active markup is SF-2 skeleton plus APG indices', () => {
  it('sets wrapper overflow-auto + maxHeight, caption first, and identity attrs on real rows', () => {
    const { container } = render(
      <DataTable {...captionTableProps({ rows: numberedTokenRows(40), virtualized: true })} />
    );
    const wrap = container.querySelector(SLOT.wrap) as HTMLElement;
    const table = container.querySelector(SLOT.table);
    expect(wrap.className).toMatch(/\boverflow-auto\b/);
    expect(wrap.style.maxHeight).toBe('384px');
    expect(table?.firstElementChild?.getAttribute('data-slot')).toBe('data-table-caption');
    expect(table?.getAttribute('aria-rowcount')).toBe('41');
    expect(container.querySelector('thead')).not.toBeNull();

    for (const row of dataRows(container)) {
      expect(row.tagName).toBe('TR');
      expect(row.getAttribute('data-row-key')).toBeTruthy();
      expect(row.getAttribute('data-index')).toBeTruthy();
      const index = Number(row.getAttribute('data-index'));
      expect(row.getAttribute('aria-rowindex')).toBe(String(index + 2));
      expect(row.querySelector('th[scope="col"]')).toBeNull();
    }
    expect(container.querySelectorAll('th[scope="col"]').length).toBe(tokenColumns().length);
  });
});

describe('INV-117: spacer rows are hidden, unindexed, height-on-td, omitted at 0px', () => {
  it('never puts aria-rowindex or data-table-row on a spacer, and height lives on td', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(80),
          virtualized: { maxHeight: 120, overscan: 1, estimateSize: 36 },
        })}
      />
    );
    const spacers = [...container.querySelectorAll(SLOT.spacer)];
    for (const spacer of spacers) {
      expect(spacer.tagName).toBe('TR');
      expect(spacer.getAttribute('aria-hidden')).toBe('true');
      expect(spacer.hasAttribute('aria-rowindex')).toBe(false);
      expect(spacer.getAttribute('data-slot')).toBe('data-table-spacer');
      expect(spacer.getAttribute('data-spacer')).toMatch(/^(top|bottom)$/);
      const td = spacer.querySelector('td');
      expect(td).not.toBeNull();
      expect(td?.getAttribute('colspan')).toBe(String(tokenColumns().length));
      expect(td?.style.height).toMatch(/px$/);
      expect((spacer as HTMLElement).style.height).toBe('');
    }
  });

  it('uses colspan 1 when there are no columns', () => {
    const { container } = render(
      <DataTable
        caption="Empty columns"
        columns={[]}
        rows={numberedTokenRows(40)}
        getRowKey={getTokenRowKey}
        virtualized={{ maxHeight: 120, overscan: 0, estimateSize: 36 }}
      />
    );
    const spacerTd = container.querySelector(`${SLOT.spacer} td`);
    if (spacerTd != null) {
      expect(spacerTd.getAttribute('colspan')).toBe('1');
    }
  });
});

describe('INV-118: real rows have no kit transform; only spacer td and wrapper bind styles', () => {
  it('leaves transform off data rows and cells', () => {
    const { container } = render(
      <DataTable {...captionTableProps({ rows: numberedTokenRows(40), virtualized: true })} />
    );
    for (const row of dataRows(container)) {
      expect(row.style.transform, 'INV-118: no translateY on real rows').toBe('');
      expect(row.getAttribute('style') ?? '').not.toMatch(/translate/i);
      for (const cell of row.querySelectorAll('[data-slot="data-table-cell"]')) {
        expect((cell as HTMLElement).style.transform).toBe('');
      }
    }
    const table = container.querySelector('table') as HTMLElement;
    expect(table.style.transform).toBe('');
    const classTokens = [
      table.className,
      container.querySelector('thead')?.className ?? '',
      container.querySelector('tbody')?.className ?? '',
    ].join(' ');
    for (const forbidden of ['flex', 'grid', 'contents']) {
      expect(classTokens.split(/\s+/)).not.toContain(forbidden);
    }
  });
});

describe('INV-119 / INV-78: the virtualizer windows bodyRows, never unsliced rows', () => {
  it('does not re-sort a client page window; aria-rowcount is page-local', () => {
    const columns = tokenColumns();
    const rows = numberedTokenRows(10_000);
    const { container } = render(
      <DataTable
        caption="Paged virt"
        columns={columns}
        rows={rows}
        getRowKey={getTokenRowKey}
        defaultSort={{ columnId: 'amount', direction: 'desc' }}
        pagination={{
          kind: 'client',
          pageIndex: 0,
          pageSize: 200,
          onPageChange: vi.fn(),
        }}
        virtualized
      />
    );
    expect(container.querySelector('table')?.getAttribute('aria-rowcount')).toBe('201');
    expect(dataRows(container).length).toBeLessThan(80);
    const expected = applyClientSort(rows, columns, {
      columnId: 'amount',
      direction: 'desc',
    }).slice(0, 200);
    const mountedKeys = dataRows(container).map((row) => row.getAttribute('data-row-key'));
    for (const key of mountedKeys) {
      expect(
        expected.some((row) => row.id === key),
        `INV-78 / INV-119: ${key} must be in the sorted page, not a resorted subset of unsliced rows`
      ).toBe(true);
    }
    expect(mountedKeys[0], 'INV-78: first mounted key follows displayRows then slice').toBe(
      expected[0]?.id
    );
    expect(mountedKeys[0]).not.toBe('r199');
  });

  it('windows a server page against rows.length, not totalCount', () => {
    const page = numberedTokenRows(100);
    const { container } = render(
      <DataTable
        caption="Server virt"
        columns={tokenColumns()}
        rows={page}
        getRowKey={getTokenRowKey}
        pagination={{
          kind: 'server',
          pageIndex: 3,
          pageSize: 100,
          totalCount: 50_000,
          onPageChange: vi.fn(),
        }}
        virtualized
      />
    );
    expect(container.querySelector('table')?.getAttribute('aria-rowcount')).toBe('101');
    expect(container.querySelector('table')?.getAttribute('aria-rowcount')).not.toBe('50001');
    expect(dataRows(container).length).toBeLessThan(80);
  });
});

describe('INV-120: React keys follow getRowKey', () => {
  it('keeps data-row-key equal to getRowKey after a client sort', () => {
    const rows: TokenRow[] = [
      { id: 'z', label: 'Zed', amount: 1n, status: 'Active' },
      { id: 'a', label: 'Aye', amount: 9n, status: 'Active' },
    ];
    const { container } = render(
      <DataTable
        caption="Keys"
        columns={tokenColumns()}
        rows={rows}
        getRowKey={getTokenRowKey}
        defaultSort={{ columnId: 'amount', direction: 'desc' }}
        virtualized
      />
    );
    const keys = dataRows(container).map((row) => row.getAttribute('data-row-key'));
    expect(keys[0]).toBe('a');
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('INV-121: no grid roles or column-virtualization ARIA', () => {
  it('omits role and aria-colcount on the kit skeleton', () => {
    const { container } = render(
      <DataTable {...captionTableProps({ rows: numberedTokenRows(40), virtualized: true })} />
    );
    const table = container.querySelector(SLOT.table);
    expect(table?.querySelectorAll('[role]').length).toBe(0);
    expect(container.querySelector('[aria-colcount]')).toBeNull();
    expect(container.querySelector('[aria-colindex]')).toBeNull();
    expect(container.querySelector('[role="grid"]')).toBeNull();
  });
});

describe('INV-122: empty + virtualized is an ARIA and geometry no-op', () => {
  it('matches unvirtualized empty DOM for ARIA and wrapper overflow', () => {
    const virt = render(<DataTable {...captionTableProps({ rows: [], virtualized: true })} />);
    const plain = render(<DataTable {...captionTableProps({ rows: [] })} />);
    expect(virt.container.querySelector(SLOT.empty)).not.toBeNull();
    expect(virt.container.querySelector(SLOT.spacer)).toBeNull();
    expect(virt.container.querySelector('[aria-rowcount]')).toBeNull();
    expect(virt.container.querySelector('[aria-rowindex]')).toBeNull();
    const wrap = virt.container.querySelector(SLOT.wrap) as HTMLElement;
    expect(wrap.className).toMatch(/\boverflow-x-auto\b/);
    expect(wrap.className).not.toMatch(/\boverflow-auto\b/);
    expect(wrap.style.maxHeight).toBe('');
    expect(plain.container.querySelector(SLOT.empty)).not.toBeNull();
  });
});
