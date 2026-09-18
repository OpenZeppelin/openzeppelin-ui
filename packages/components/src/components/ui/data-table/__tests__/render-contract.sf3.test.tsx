/**
 * SF-3 · Render contract — INV-61 … INV-65, INV-87, INV-90 (class allow-list).
 */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataTable } from '../data-table';
import { applyClientSort } from '../sort';
import {
  captionTableProps,
  getTokenRowKey,
  TOKEN_ROWS,
  tokenColumns,
  type TokenRow,
} from './sf2-fixtures';

function amountTh(container: HTMLElement): HTMLElement {
  return container.querySelector(
    '[data-slot="data-table-header-cell"][data-column-id="amount"]'
  ) as HTMLElement;
}

function bodyIds(container: HTMLElement): string[] {
  return [...container.querySelectorAll('[data-slot="data-table-row"]')].map((row) => {
    const label = row.querySelector('[data-column-id="label"]');
    return label?.textContent ?? '';
  });
}

describe('INV-61: sort affordance exists iff sortable === true', () => {
  it.each([
    { sortable: undefined, hasGetter: false },
    { sortable: undefined, hasGetter: true },
    { sortable: false, hasGetter: false },
    { sortable: false, hasGetter: true },
    { sortable: true, hasGetter: false },
    { sortable: true, hasGetter: true },
  ] as const)('sortable=$sortable getter=$hasGetter', ({ sortable, hasGetter }) => {
    const getSortValue = vi.fn((row: TokenRow) => row.amount);
    const columns = tokenColumns().map((column) => {
      if (column.id !== 'amount') {
        return column;
      }
      return {
        ...column,
        sortable,
        getSortValue: hasGetter ? getSortValue : undefined,
      };
    });
    const { container } = render(
      <DataTable caption="T" columns={columns} rows={TOKEN_ROWS} getRowKey={getTokenRowKey} />
    );
    const buttons = container.querySelectorAll('th button');
    expect(buttons.length, 'INV-61: exactly one header button iff sortable === true').toBe(
      sortable === true ? 1 : 0
    );
    if (sortable !== true) {
      expect(getSortValue, 'INV-61: getter never runs without sortable').not.toHaveBeenCalled();
    }
  });
});

describe('INV-62: wrap string headers; sibling button for composed headers', () => {
  it('wraps a string header so the button name is the header text', () => {
    const { container } = render(<DataTable {...captionTableProps()} />);
    const th = amountTh(container);
    const button = th.querySelector('button');
    expect(button?.textContent).toContain('Amount');
    expect(button?.getAttribute('aria-label')).toBe('Sort by Amount');
    expect(button?.querySelectorAll('button').length, 'INV-62: no nested button').toBe(0);
    expect(th.getAttribute('data-column-id')).toBe('amount');
    expect(th.getAttribute('scope')).toBe('col');
  });

  it('keeps a composed header as a sibling of the sort button', () => {
    const columns = [
      {
        id: 'select',
        header: <input type="checkbox" aria-label="Select all" />,
        headerLabel: 'Select',
        sortable: true,
        cell: () => null,
      },
    ];
    const { container } = render(
      <DataTable caption="T" columns={columns} rows={TOKEN_ROWS} getRowKey={getTokenRowKey} />
    );
    const th = container.querySelector('[data-column-id="select"]');
    const checkbox = th?.querySelector('input[type="checkbox"]');
    const button = th?.querySelector('button');
    expect(checkbox).not.toBeNull();
    expect(button).not.toBeNull();
    expect(
      button?.contains(checkbox ?? null),
      'INV-62: checkbox is not inside the sort button'
    ).toBe(false);
    expect(Boolean(th?.contains(checkbox ?? null) && th?.contains(button ?? null))).toBe(true);
    expect(button?.getAttribute('aria-label')).toMatch(/Sort by Select/);
    expect(th?.textContent).not.toBe('Select');
  });
});

describe('INV-63: aria-sort only on the active sortable header', () => {
  it('omits aria-sort until a valid sort is active, then maps asc/desc, then clears', () => {
    const { container } = render(<DataTable {...captionTableProps()} />);
    expect(container.querySelectorAll('[aria-sort]').length).toBe(0);
    fireEvent.click(amountTh(container).querySelector('button')!);
    expect(amountTh(container).getAttribute('aria-sort')).toBe('ascending');
    expect(container.querySelectorAll('[aria-sort]').length).toBe(1);
    fireEvent.click(amountTh(container).querySelector('button')!);
    expect(amountTh(container).getAttribute('aria-sort')).toBe('descending');
    fireEvent.click(amountTh(container).querySelector('button')!);
    expect(container.querySelectorAll('[aria-sort]').length).toBe(0);
  });

  it('does not set aria-sort when sort points at an unsortable id', () => {
    const { container } = render(
      <DataTable {...captionTableProps({ sort: { columnId: 'label', direction: 'asc' } })} />
    );
    expect(container.querySelectorAll('[aria-sort]').length, 'INV-63 / INV-67').toBe(0);
  });
});

describe('INV-64: sorting does not change alignment or cell composition', () => {
  it('keeps data-align/text-end and passes the original row to cell', () => {
    const amountCell = vi.fn((row: TokenRow) => String(row.amount));
    const columns = tokenColumns({ amountCell });
    const { container } = render(
      <DataTable caption="T" columns={columns} rows={TOKEN_ROWS} getRowKey={getTokenRowKey} />
    );
    const th = amountTh(container);
    const alignBefore = th.getAttribute('data-align');
    expect(th.className).toMatch(/\btext-end\b/);
    fireEvent.click(th.querySelector('button')!);
    expect(amountTh(container).getAttribute('data-align')).toBe(alignBefore);
    expect(amountTh(container).className).toMatch(/\btext-end\b/);
    const amountCells = container.querySelectorAll(
      '[data-slot="data-table-cell"][data-column-id="amount"]'
    );
    expect(amountCells[0]?.childElementCount, 'INV-64: no kit sort widget in the body').toBe(0);
    for (const row of TOKEN_ROWS) {
      expect(amountCell).toHaveBeenCalledWith(row);
    }
  });
});

describe('INV-65 / INV-78: empty body and displayRows order', () => {
  it('keeps the empty row and enabled sort buttons when rows=[]', () => {
    const { container } = render(<DataTable {...captionTableProps({ rows: [] })} />);
    expect(container.querySelector('[data-slot="data-table-empty"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-slot="data-table-row"]').length).toBe(0);
    const button = amountTh(container).querySelector('button');
    expect(button?.hasAttribute('disabled')).toBe(false);
    fireEvent.click(button!);
    expect(container.querySelector('[data-slot="data-table-empty"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-slot="data-table-row"]').length).toBe(0);
  });

  it('paints body order equal to applyClientSort', () => {
    const columns = tokenColumns();
    const { container } = render(
      <DataTable
        caption="T"
        columns={columns}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        defaultSort={{ columnId: 'amount', direction: 'desc' }}
      />
    );
    const expected = applyClientSort(TOKEN_ROWS, columns, {
      columnId: 'amount',
      direction: 'desc',
    });
    expect(bodyIds(container)).toEqual(expected.map((row) => row.label));
  });
});

describe('INV-87 / INV-90: native button; th is not flex', () => {
  it('uses type=button without kit Button slot, and does not flex the th', () => {
    const { container } = render(<DataTable {...captionTableProps()} />);
    const th = amountTh(container);
    const button = th.querySelector('button');
    expect(button?.getAttribute('type')).toBe('button');
    expect(button?.getAttribute('data-slot')).not.toBe('button');
    expect(button?.className).toMatch(/\binline-flex\b/);
    const thClasses = th.className.split(/\s+/);
    for (const forbidden of ['flex', 'inline-flex', 'grid', 'contents']) {
      expect(thClasses, 'INV-90: packing classes stay off the th').not.toContain(forbidden);
    }
    expect(container.querySelectorAll('th button button').length).toBe(0);
  });
});
