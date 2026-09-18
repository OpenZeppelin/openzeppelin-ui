/**
 * SF-3 · Interaction & transition — INV-70 … INV-75.
 */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataTable } from '../data-table';
import { getTokenRowKey, TOKEN_ROWS, tokenColumns, type TokenRow } from './sf2-fixtures';

function amountButton(container: HTMLElement): HTMLButtonElement {
  return container.querySelector(
    '[data-slot="data-table-header-cell"][data-column-id="amount"] button'
  ) as HTMLButtonElement;
}

function firstLabel(container: HTMLElement): string | null | undefined {
  return container.querySelector('[data-slot="data-table-row"] [data-column-id="label"]')
    ?.textContent;
}

describe('INV-70 / INV-71: activate cycles and notifies', () => {
  it('uncontrolled: three clicks paint asc, desc, then given order, and call onSortChange each time', () => {
    const onSortChange = vi.fn();
    const { container } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        onSortChange={onSortChange}
      />
    );
    fireEvent.click(amountButton(container));
    expect(onSortChange).toHaveBeenLastCalledWith({ columnId: 'amount', direction: 'asc' });
    expect(firstLabel(container)).toBe('Alpha');
    fireEvent.click(amountButton(container));
    expect(onSortChange).toHaveBeenLastCalledWith({ columnId: 'amount', direction: 'desc' });
    expect(firstLabel(container)).toBe('Gamma');
    fireEvent.click(amountButton(container));
    expect(onSortChange).toHaveBeenLastCalledWith(null);
    expect(firstLabel(container)).toBe('Alpha');
    expect(onSortChange).toHaveBeenCalledTimes(3);
  });

  it('controlled without parent update: callback fires, paint stays', () => {
    const onSortChange = vi.fn();
    const { container } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        sort={null}
        onSortChange={onSortChange}
      />
    );
    fireEvent.click(amountButton(container));
    expect(onSortChange).toHaveBeenCalledWith({ columnId: 'amount', direction: 'asc' });
    expect(container.querySelector('[aria-sort]')).toBeNull();
    expect(firstLabel(container)).toBe('Alpha');
  });

  it('Space and Enter on the focused native button activate the same cycle', () => {
    const onSortChange = vi.fn();
    const { container } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        onSortChange={onSortChange}
      />
    );
    const button = amountButton(container);
    button.focus();
    fireEvent.keyDown(button, { key: ' ', code: 'Space' });
    fireEvent.click(button);
    expect(onSortChange).toHaveBeenCalledWith({ columnId: 'amount', direction: 'asc' });
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
    fireEvent.click(button);
    expect(onSortChange).toHaveBeenLastCalledWith({ columnId: 'amount', direction: 'desc' });
  });
});

describe('INV-72: unsortable headers have no activation path', () => {
  it('does not sort from unsortable header text or a body cell click', () => {
    const onSortChange = vi.fn();
    const cellClick = vi.fn();
    const columns = tokenColumns().map((column) =>
      column.id === 'status'
        ? {
            ...column,
            cell: (row: TokenRow) => (
              <button type="button" onClick={cellClick}>
                {row.status}
              </button>
            ),
          }
        : column
    );
    const { container } = render(
      <DataTable
        caption="T"
        columns={columns}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        onSortChange={onSortChange}
      />
    );
    const statusTh = container.querySelector('[data-column-id="status"]');
    fireEvent.click(statusTh!);
    expect(onSortChange).not.toHaveBeenCalled();
    expect(firstLabel(container)).toBe('Alpha');
    fireEvent.click(container.querySelector('td button')!);
    expect(cellClick).toHaveBeenCalledTimes(1);
    expect(onSortChange).not.toHaveBeenCalled();
  });
});

describe('INV-73: empty table still accepts sort activation', () => {
  it('fires onSortChange and keeps the empty row', () => {
    const onSortChange = vi.fn();
    const { container } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={[]}
        getRowKey={getTokenRowKey}
        onSortChange={onSortChange}
      />
    );
    fireEvent.click(amountButton(container));
    expect(onSortChange).toHaveBeenCalledWith({ columnId: 'amount', direction: 'asc' });
    expect(container.querySelector('[data-slot="data-table-empty"]')).not.toBeNull();
  });
});

describe('INV-74: composed header widgets do not activate sort', () => {
  it('clicks the header checkbox without cycling sort', () => {
    const onSortChange = vi.fn();
    const onChecked = vi.fn();
    const columns = [
      {
        id: 'select',
        header: <input type="checkbox" aria-label="Select all" onChange={onChecked} />,
        headerLabel: 'Select',
        sortable: true,
        cell: () => null,
      },
    ];
    const { container } = render(
      <DataTable
        caption="T"
        columns={columns}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        onSortChange={onSortChange}
      />
    );
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(onChecked).toHaveBeenCalledTimes(1);
    expect(onSortChange, 'INV-74: header widget must not run nextSortState').not.toHaveBeenCalled();
    fireEvent.click(container.querySelector('th button')!);
    expect(onSortChange).toHaveBeenCalledTimes(1);
  });
});

describe('INV-75: kit handlers live only on sort buttons; focus survives reorder', () => {
  it('adds no onclick attributes on skeleton cells', () => {
    const { container } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
      />
    );
    expect(container.querySelectorAll('th[onclick], td[onclick], tr[onclick]').length).toBe(0);
  });

  it('keeps focus on a cell control in row b after client sort', () => {
    const columns = [
      {
        id: 'act',
        header: 'Act',
        cell: (row: TokenRow) => (
          <button type="button" data-row={row.id}>
            Open {row.id}
          </button>
        ),
      },
      ...tokenColumns(),
    ];
    const { container } = render(
      <DataTable caption="T" columns={columns} rows={TOKEN_ROWS} getRowKey={getTokenRowKey} />
    );
    const button = container.querySelector('button[data-row="b"]') as HTMLButtonElement;
    button.focus();
    const rowNode = button.closest('tr');
    fireEvent.click(amountButton(container));
    expect(document.activeElement, 'INV-75: sort does not move focus').toBe(button);
    expect(document.activeElement?.closest('tr')).toBe(rowNode);
  });
});
