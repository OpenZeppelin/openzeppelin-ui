/**
 * SF-2 · Render contract — INV-28 … INV-37.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Checkbox } from '../../checkbox';
import { DataTable } from '../data-table';
import {
  captionTableProps,
  getTokenRowKey,
  TOKEN_ROWS,
  tokenColumns,
  type TokenRow,
} from './sf2-fixtures';

const SLOT = {
  wrap: '[data-slot="data-table"]',
  table: '[data-slot="data-table-table"]',
  caption: '[data-slot="data-table-caption"]',
  head: '[data-slot="data-table-head"]',
  body: '[data-slot="data-table-body"]',
  headerCell: '[data-slot="data-table-header-cell"]',
  row: '[data-slot="data-table-row"]',
  cell: '[data-slot="data-table-cell"]',
  empty: '[data-slot="data-table-empty"]',
} as const;

describe('INV-28: native table skeleton, data-slot contract, no ARIA roles', () => {
  it('emits the fixed skeleton in order for a caption table', () => {
    const { container } = render(<DataTable {...captionTableProps()} />);
    const wrap = container.querySelector(SLOT.wrap);
    const table = wrap?.querySelector(SLOT.table);
    expect(wrap, 'INV-28: wrapper data-slot must exist').not.toBeNull();
    expect(table, 'INV-28: table data-slot must exist').not.toBeNull();
    expect(table?.firstElementChild?.getAttribute('data-slot')).toBe('data-table-caption');
    expect(table?.querySelector(SLOT.head)).not.toBeNull();
    expect(table?.querySelector(SLOT.body)).not.toBeNull();
    expect(container.querySelectorAll('[role]').length, 'INV-28: no role attributes').toBe(0);
    expect(container.querySelector('[aria-live]')).toBeNull();
    expect(container.querySelector('[aria-rowcount]')).toBeNull();
    expect(container.querySelector('[aria-rowindex]')).toBeNull();
  });

  it('does not pin decorative Tailwind padding (px-3 is guidance, not contract)', () => {
    const { container } = render(<DataTable {...captionTableProps()} />);
    const th = container.querySelector(SLOT.headerCell);
    expect(th, 'INV-28: header cells exist regardless of padding class').not.toBeNull();
    expect(th?.hasAttribute('data-slot')).toBe(true);
  });
});

describe('INV-29: exactly one accessible-name path', () => {
  it('caption branch: caption is first child; no aria-label or aria-labelledby', () => {
    const { container } = render(<DataTable {...captionTableProps()} />);
    const table = container.querySelector(SLOT.table);
    expect(table?.firstElementChild?.tagName).toBe('CAPTION');
    expect(table?.hasAttribute('aria-label')).toBe(false);
    expect(table?.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('aria-label branch: label present, no caption, no labelledby', () => {
    const { container } = render(
      <DataTable
        aria-label="Holders"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
      />
    );
    const table = container.querySelector(SLOT.table);
    expect(table?.getAttribute('aria-label')).toBe('Holders');
    expect(table?.querySelector(SLOT.caption)).toBeNull();
    expect(table?.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('aria-labelledby branch: id present, no caption, no aria-label', () => {
    const { container } = render(
      <>
        <h2 id="holders-heading">Holders</h2>
        <DataTable
          aria-labelledby="holders-heading"
          columns={tokenColumns()}
          rows={TOKEN_ROWS}
          getRowKey={getTokenRowKey}
        />
      </>
    );
    const table = container.querySelector(SLOT.table);
    expect(table?.getAttribute('aria-labelledby')).toBe('holders-heading');
    expect(table?.querySelector(SLOT.caption)).toBeNull();
    expect(table?.hasAttribute('aria-label')).toBe(false);
  });
});

describe('INV-30: scope=col on every th; no id/headers association attrs', () => {
  it('associates columns with scope only', () => {
    const columns = tokenColumns();
    const { container } = render(<DataTable {...captionTableProps({ columns })} />);
    const ths = container.querySelectorAll('thead th[scope="col"]');
    expect(ths.length, 'INV-30: one scoped th per column').toBe(columns.length);
    expect(container.querySelectorAll('thead td').length).toBe(0);
    for (const cell of container.querySelectorAll('th, td')) {
      expect(cell.hasAttribute('id'), 'INV-30: no id association').toBe(false);
      expect(cell.hasAttribute('headers'), 'INV-30: no headers association').toBe(false);
    }
    expect(container.querySelectorAll('tbody td').length).toBeGreaterThan(0);
    expect(container.querySelector('tbody th')).toBeNull();
  });
});

describe('INV-31: header content is bare; aria-label only when header does not name itself', () => {
  it('unsortable string header has no aria-label and no wrapper around the text', () => {
    const { container } = render(<DataTable {...captionTableProps()} />);
    const labelTh = container.querySelector(`${SLOT.headerCell}[data-column-id="label"]`);
    expect(labelTh?.getAttribute('aria-label')).toBeNull();
    expect(
      labelTh?.childElementCount,
      'INV-31: no kit wrapper around unsortable string header'
    ).toBe(0);
    expect(labelTh?.textContent).toBe('Label');
  });

  it('composed header gets aria-label from headerLabel and keeps the inner control name', () => {
    const columns = [
      {
        id: 'select',
        header: <Checkbox aria-label="Select all" />,
        headerLabel: 'Select',
        cell: () => <Checkbox aria-label="Select row" />,
      },
      ...tokenColumns(),
    ];
    const { container } = render(<DataTable {...captionTableProps({ columns })} />);
    const th = container.querySelector(`${SLOT.headerCell}[data-column-id="select"]`);
    expect(th?.getAttribute('aria-label')).toBe('Select');
    expect(th?.querySelector('[data-slot="checkbox"]')).not.toBeNull();
    expect(th?.querySelector('[aria-label="Select all"]')).not.toBeNull();
  });
});

describe('INV-32: one alignment token per column on th and every td', () => {
  it('emits matching data-align and logical text class for mixed columns', () => {
    const { container } = render(<DataTable {...captionTableProps()} />);
    for (const column of tokenColumns()) {
      const expected = column.align === 'end' ? 'end' : 'start';
      const th = container.querySelector(`${SLOT.headerCell}[data-column-id="${column.id}"]`);
      const tds = container.querySelectorAll(`${SLOT.cell}[data-column-id="${column.id}"]`);
      expect(th?.getAttribute('data-align'), `INV-32: header ${column.id}`).toBe(expected);
      expect(th?.className).toContain(expected === 'end' ? 'text-end' : 'text-start');
      expect(tds.length).toBe(TOKEN_ROWS.length);
      for (const td of tds) {
        expect(td.getAttribute('data-align'), `INV-32: cell ${column.id}`).toBe(
          th?.getAttribute('data-align')
        );
        expect(td.className).toContain(expected === 'end' ? 'text-end' : 'text-start');
      }
    }
  });
});

describe('INV-33: row × column completeness', () => {
  it.each([
    [1, 1],
    [2, 3],
    [50, 8],
  ] as const)(
    'renders %s rows × %s columns in order with aligned indexes',
    (rowCount, colCount) => {
      const rows = Array.from({ length: rowCount }, (_, i) => ({ id: `r${i}` }));
      const columns = Array.from({ length: colCount }, (_, i) => ({
        id: `c${i}`,
        header: `C${i}`,
        cell: (row: { id: string }) => `${row.id}:${i}`,
      }));
      const { container } = render(
        <DataTable caption="Grid" columns={columns} rows={rows} getRowKey={(row) => row.id} />
      );
      const trs = container.querySelectorAll(SLOT.row);
      expect(trs.length, 'INV-33: one data row per rows entry').toBe(rowCount);
      expect(container.querySelector(SLOT.empty)).toBeNull();
      trs.forEach((tr, r) => {
        const cells = tr.querySelectorAll(SLOT.cell);
        expect(cells.length).toBe(colCount);
        cells.forEach((td, c) => {
          expect(td.getAttribute('data-column-id')).toBe(columns[c]?.id);
          const th = container.querySelectorAll(SLOT.headerCell)[c];
          expect(th?.getAttribute('data-column-id')).toBe(td.getAttribute('data-column-id'));
          expect(td.textContent).toBe(`${rows[r]?.id}:${c}`);
        });
      });
    }
  );

  it('keeps an empty td when cell returns null, undefined, or empty string', () => {
    const columns = [
      { id: 'n', header: 'N', cell: () => null },
      { id: 'u', header: 'U', cell: () => undefined },
      { id: 'e', header: 'E', cell: () => '' },
    ];
    const { container } = render(
      <DataTable caption="Sparse" columns={columns} rows={[{ id: '1' }]} getRowKey={(r) => r.id} />
    );
    const cells = container.querySelectorAll(`${SLOT.row} ${SLOT.cell}`);
    expect(cells.length, 'INV-33: sparse returns still emit every cell').toBe(3);
    for (const cell of cells) {
      expect(cell.textContent).toBe('');
    }
  });
});

describe('INV-34: empty branch is one full-width row; table stays named and headed', () => {
  it('shows a single empty row with colSpan = columns.length', () => {
    const { container } = render(<DataTable {...captionTableProps({ rows: [] })} />);
    expect(container.querySelectorAll(SLOT.empty).length).toBe(1);
    expect(container.querySelector(SLOT.row)).toBeNull();
    const td = container.querySelector(`${SLOT.empty} td`);
    expect(td?.getAttribute('colspan')).toBe('3');
    expect(td?.hasAttribute('aria-hidden')).toBe(false);
    expect(container.querySelector(SLOT.caption)?.textContent).toBe('Tokenization requests');
    expect(container.querySelectorAll('thead th[scope="col"]').length).toBe(3);
  });

  it('floors colSpan at 1 when there are zero columns', () => {
    const { container } = render(
      <DataTable caption="Empty" columns={[]} rows={[]} getRowKey={(row: TokenRow) => row.id} />
    );
    expect(container.querySelector(`${SLOT.empty} td`)?.getAttribute('colspan')).toBe('1');
  });
});

describe('INV-35: skeleton node identity survives rows and column updates', () => {
  it('keeps wrapper/table/caption/thead/tbody identity across empty and populated renders', () => {
    const { container, rerender } = render(<DataTable {...captionTableProps({ rows: [] })} />);
    const nodes = {
      wrap: container.querySelector(SLOT.wrap),
      table: container.querySelector(SLOT.table),
      caption: container.querySelector(SLOT.caption),
      head: container.querySelector(SLOT.head),
      body: container.querySelector(SLOT.body),
    };
    rerender(<DataTable {...captionTableProps({ rows: TOKEN_ROWS })} />);
    rerender(<DataTable {...captionTableProps({ rows: [] })} />);
    rerender(
      <DataTable
        {...captionTableProps({
          rows: Array.from({ length: 5 }, (_, i) => ({
            id: `x${i}`,
            label: `L${i}`,
            amount: BigInt(i),
            status: 'Active',
          })),
        })}
      />
    );
    expect(container.querySelector(SLOT.wrap)).toBe(nodes.wrap);
    expect(container.querySelector(SLOT.table)).toBe(nodes.table);
    expect(container.querySelector(SLOT.caption)).toBe(nodes.caption);
    expect(container.querySelector(SLOT.head)).toBe(nodes.head);
    expect(container.querySelector(SLOT.body)).toBe(nodes.body);
  });

  it('keeps header cells whose id persists across a column reorder', () => {
    const first = tokenColumns();
    const { container, rerender } = render(
      <DataTable {...captionTableProps({ columns: first })} />
    );
    const amountTh = container.querySelector(`${SLOT.headerCell}[data-column-id="amount"]`);
    rerender(<DataTable {...captionTableProps({ columns: [first[1]!, first[0]!, first[2]!] })} />);
    expect(container.querySelector(`${SLOT.headerCell}[data-column-id="amount"]`)).toBe(amountTh);
  });
});

describe('INV-36: table internals keep table display; only wrapper overflows', () => {
  it('allows the narrow sticky exception on default header cells only', () => {
    const { container } = render(<DataTable {...captionTableProps()} />);
    const wrap = container.querySelector(SLOT.wrap);
    const internals = container.querySelectorAll(
      `${SLOT.table}, ${SLOT.caption}, ${SLOT.head}, ${SLOT.body}, ${SLOT.row}, ${SLOT.headerCell}, ${SLOT.cell}`
    );
    const forbidden = /^(block|flex|grid|contents|absolute|fixed|relative|translate-|transform)/;
    const stickyTokens = new Set(['sticky', 'top-0', 'z-20', 'bg-muted']);
    for (const el of internals) {
      expect(el.hasAttribute('style'), 'INV-36: no inline style on table internals').toBe(false);
      for (const token of el.className.split(/\s+/)) {
        expect(token, `INV-36: kit class ${token} on ${el.tagName}`).not.toMatch(forbidden);
        if (stickyTokens.has(token)) {
          expect(
            el.matches(SLOT.headerCell) && wrap?.getAttribute('data-sticky-header') === 'true',
            `INV-36: "${token}" is allowed only on a sticky-on header cell`
          ).toBe(true);
        }
        if (/^(left|right)-/.test(token)) {
          expect.unreachable(`INV-36: pinned-column token "${token}" is out of scope`);
        }
      }
    }
    expect(wrap?.className).toContain('overflow-x-auto');
  });

  it('emits no kit sticky, inset, or stacking tokens when opted out', () => {
    const { container } = render(<DataTable {...captionTableProps()} stickyHeader={false} />);
    expect(container.querySelector(SLOT.wrap)?.getAttribute('data-sticky-header')).toBe('false');
    for (const el of container.querySelectorAll(
      `${SLOT.table}, ${SLOT.caption}, ${SLOT.head}, ${SLOT.body}, ${SLOT.row}, ${SLOT.headerCell}, ${SLOT.cell}`
    )) {
      const classTokens = new Set(el.className.split(/\s+/));
      expect(
        [...classTokens].filter((token) => ['sticky', 'top-0', 'z-20'].includes(token)),
        `INV-36 / INV-263: opt-out leaked sticky positioning onto ${el.tagName}`
      ).toEqual([]);
    }
  });
});

describe('INV-37: each class prop lands on exactly one element; data-align survives merge', () => {
  it('places sentinel classes on the documented targets only', () => {
    const columns = tokenColumns().map((column) =>
      column.id === 'amount'
        ? { ...column, headerClassName: 'hdr-sentinel', cellClassName: 'cell-sentinel' }
        : column
    );
    const { container } = render(
      <DataTable
        {...captionTableProps({
          columns,
          className: 'wrap-sentinel',
          tableClassName: 'table-sentinel',
          captionClassName: 'caption-sentinel',
        })}
      />
    );
    expect(container.querySelector(SLOT.wrap)?.className).toContain('wrap-sentinel');
    expect(container.querySelector(SLOT.table)?.className).toContain('table-sentinel');
    expect(container.querySelector(SLOT.caption)?.className).toContain('caption-sentinel');
    expect(
      container.querySelector(`${SLOT.headerCell}[data-column-id="amount"]`)?.className
    ).toContain('hdr-sentinel');
    const amountCells = container.querySelectorAll(`${SLOT.cell}[data-column-id="amount"]`);
    expect(amountCells.length).toBe(TOKEN_ROWS.length);
    for (const cell of amountCells) {
      expect(cell.className).toContain('cell-sentinel');
    }
    expect(
      container.querySelector(`${SLOT.headerCell}[data-column-id="label"]`)?.className
    ).not.toContain('hdr-sentinel');
  });

  it('keeps data-align when cellClassName wins the text-align utility', () => {
    const columns = tokenColumns().map((column) =>
      column.id === 'amount' ? { ...column, cellClassName: 'text-right' } : column
    );
    const { container } = render(<DataTable {...captionTableProps({ columns })} />);
    const td = container.querySelector(`${SLOT.cell}[data-column-id="amount"]`);
    expect(td?.getAttribute('data-align'), 'INV-37: data-align survives tailwind-merge').toBe(
      'end'
    );
  });
});
