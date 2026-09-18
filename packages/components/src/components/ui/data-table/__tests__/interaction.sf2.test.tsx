/**
 * SF-2 · Interaction & transition — INV-44 … INV-47.
 */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '../../button';
import { Checkbox } from '../../checkbox';
import { DataTable } from '../data-table';
import {
  captionTableProps,
  getTokenRowKey,
  TOKEN_ROWS,
  tokenColumns,
  type TokenRow,
} from './sf2-fixtures';

describe('INV-44: kit manages no focus and attaches no handlers to structure', () => {
  it('adds no tabindex on skeleton and leaves document.activeElement on body after mount', () => {
    const columns = [
      {
        id: 'select',
        header: <Checkbox aria-label="Select all" />,
        headerLabel: 'Select',
        cell: () => <Button type="button">Act</Button>,
      },
      ...tokenColumns(),
    ];
    const { container } = render(<DataTable {...captionTableProps({ columns })} />);
    const skeleton = container.querySelector('[data-slot="data-table"]');
    expect(skeleton?.querySelectorAll('[tabindex]').length, 'INV-44: no kit tabindex').toBe(0);
    expect(document.activeElement).toBe(document.body);
  });
});

describe('INV-45: focus survives row updates through stable keys', () => {
  it('keeps focus on a cell button when rows reorder', () => {
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
    ];
    const rows: TokenRow[] = [...TOKEN_ROWS];
    const { container, rerender } = render(
      <DataTable caption="T" columns={columns} rows={rows} getRowKey={getTokenRowKey} />
    );
    const button = container.querySelector('button[data-row="b"]');
    expect(button).toBeInstanceOf(HTMLButtonElement);
    (button as HTMLButtonElement).focus();
    expect(document.activeElement).toBe(button);
    const rowNode = (button as HTMLButtonElement).closest('tr');
    rerender(
      <DataTable
        caption="T"
        columns={columns}
        rows={[rows[2]!, rows[1]!, rows[0]!]}
        getRowKey={getTokenRowKey}
      />
    );
    expect(document.activeElement, 'INV-45: focus stays on the same control').toBe(button);
    expect((document.activeElement as HTMLElement | null)?.closest('tr')).toBe(rowNode);
  });

  it('keeps focus on a header widget when rows become empty then populated', () => {
    const columns = [
      {
        id: 'select',
        header: <input aria-label="Filter" />,
        headerLabel: 'Filter',
        cell: () => null,
      },
    ];
    const { container, rerender } = render(
      <DataTable caption="T" columns={columns} rows={TOKEN_ROWS} getRowKey={getTokenRowKey} />
    );
    const input = container.querySelector('input[aria-label="Filter"]');
    (input as HTMLInputElement).focus();
    rerender(<DataTable caption="T" columns={columns} rows={[]} getRowKey={getTokenRowKey} />);
    rerender(
      <DataTable caption="T" columns={columns} rows={TOKEN_ROWS} getRowKey={getTokenRowKey} />
    );
    expect(document.activeElement).toBe(input);
  });
});

describe('INV-46: column set changes re-key cells by id', () => {
  it('moves existing cells and paints new columns without stale content', () => {
    const colA = { id: 'a', header: 'A', cell: () => 'from-A' };
    const colB = { id: 'b', header: 'B', cell: () => 'from-B' };
    const colC = { id: 'c', header: 'C', cell: () => 'from-C' };
    const { container, rerender } = render(
      <DataTable
        caption="T"
        columns={[colA, colB]}
        rows={[{ id: '1' }]}
        getRowKey={(row) => row.id}
      />
    );
    const bCell = container.querySelector('[data-slot="data-table-cell"][data-column-id="b"]');
    expect(bCell?.textContent).toBe('from-B');

    rerender(
      <DataTable
        caption="T"
        columns={[colB, colA]}
        rows={[{ id: '1' }]}
        getRowKey={(row) => row.id}
      />
    );
    const cellsAfterReorder = container.querySelectorAll('[data-slot="data-table-cell"]');
    expect(cellsAfterReorder[0]?.getAttribute('data-column-id')).toBe('b');
    expect(cellsAfterReorder[0]?.textContent).toBe('from-B');
    expect(cellsAfterReorder[0]).toBe(bCell);
    expect(cellsAfterReorder[1]?.getAttribute('data-column-id')).toBe('a');

    rerender(
      <DataTable
        caption="T"
        columns={[colA, colC]}
        rows={[{ id: '1' }]}
        getRowKey={(row) => row.id}
      />
    );
    const cellsAfterReplace = container.querySelectorAll('[data-slot="data-table-cell"]');
    expect(cellsAfterReplace[0]?.getAttribute('data-column-id')).toBe('a');
    expect(cellsAfterReplace[1]?.getAttribute('data-column-id')).toBe('c');
    expect(cellsAfterReplace[1]?.textContent).toBe('from-C');
    expect(container.querySelector('[data-column-id="b"]')).toBeNull();
  });
});

describe('INV-47: integrator widget events fire once and bubble', () => {
  it('delivers a cell checkbox click once and still bubbles', () => {
    const onChecked = vi.fn();
    const onBubble = vi.fn();
    const columns = [
      {
        id: 'select',
        header: 'Select',
        cell: () => <Checkbox aria-label="Select row" onCheckedChange={onChecked} />,
      },
    ];
    const { container } = render(
      <div onClick={onBubble}>
        <DataTable
          caption="T"
          columns={columns}
          rows={TOKEN_ROWS.slice(0, 1)}
          getRowKey={getTokenRowKey}
        />
      </div>
    );
    const checkbox = container.querySelector('[data-slot="checkbox"]');
    expect(checkbox).not.toBeNull();
    fireEvent.click(checkbox!);
    expect(onChecked, 'INV-47: cell handler fires exactly once').toHaveBeenCalledTimes(1);
    expect(onBubble, 'INV-47: kit does not stopPropagation').toHaveBeenCalled();
  });

  it('delivers an emptyState button click once', () => {
    const onClick = vi.fn();
    const { getByRole } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={[]}
        getRowKey={getTokenRowKey}
        emptyState={
          <Button type="button" onClick={onClick}>
            Add account
          </Button>
        }
      />
    );
    fireEvent.click(getByRole('button', { name: 'Add account' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
