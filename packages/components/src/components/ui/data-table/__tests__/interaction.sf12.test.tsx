/**
 * SF-12 · Interaction — INV-312 … INV-315, INV-313 / INV-70.
 */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Component, type ReactNode } from 'react';

import { DataTable } from '../data-table';
import { getTokenRowKey, TOKEN_ROWS, tokenColumns } from './sf2-fixtures';

function amountButton(container: HTMLElement): HTMLButtonElement {
  return container.querySelector(
    '[data-slot="data-table-header-cell"][data-column-id="amount"] button'
  ) as HTMLButtonElement;
}

function firstLabel(container: HTMLElement): string | null | undefined {
  return container.querySelector('[data-slot="data-table-row"] [data-column-id="label"]')
    ?.textContent;
}

describe('INV-313: sort cycle payloads stay identical with a formatter present', () => {
  it('does not consult the formatter to compute nextSortState', () => {
    const onSortChange = vi.fn();
    const formatSortButtonName = vi.fn(({ columnName, direction }) => `${columnName}:${direction}`);
    const { container } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        onSortChange={onSortChange}
        formatSortButtonName={formatSortButtonName}
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
    expect(onSortChange).toHaveBeenCalledTimes(3);
  });
});

describe('INV-314 / INV-315: formatter info matches resolveColumnName and active direction', () => {
  it('passes headerLabel for ReactNode headers and none vs asc per column', () => {
    const formatSortButtonName = vi.fn(({ columnName, direction }) => `${columnName}:${direction}`);
    const columns = [
      {
        id: 'select',
        header: <input type="checkbox" aria-label="Select all" />,
        headerLabel: 'Select',
        sortable: true,
        cell: () => null,
      },
      ...tokenColumns().map((column) =>
        column.id === 'label' ? { ...column, sortable: true as const } : column
      ),
    ];
    const { rerender } = render(
      <DataTable
        caption="T"
        columns={columns}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        formatSortButtonName={formatSortButtonName}
      />
    );
    const names = formatSortButtonName.mock.calls.map((call) => call[0]);
    expect(names).toEqual(
      expect.arrayContaining([
        { columnName: 'Select', direction: 'none' },
        { columnName: 'Label', direction: 'none' },
        { columnName: 'Amount', direction: 'none' },
      ])
    );
    expect(formatSortButtonName).toHaveBeenCalledTimes(3);

    formatSortButtonName.mockClear();
    rerender(
      <DataTable
        caption="T"
        columns={columns}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        sort={{ columnId: 'amount', direction: 'asc' }}
        formatSortButtonName={formatSortButtonName}
      />
    );
    expect(formatSortButtonName.mock.calls.map((call) => call[0])).toEqual(
      expect.arrayContaining([
        { columnName: 'Select', direction: 'none' },
        { columnName: 'Label', direction: 'none' },
        { columnName: 'Amount', direction: 'asc' },
      ])
    );
  });
});

describe('INV-312: formatter throws propagate; blank returns do not throw', () => {
  class TestBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    public state = { failed: false };
    public static getDerivedStateFromError(): { failed: boolean } {
      return { failed: true };
    }
    public render(): ReactNode {
      return this.state.failed ? <div>fell</div> : this.props.children;
    }
  }

  it('lets a throwing formatter reach the nearest error boundary', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <TestBoundary>
        <DataTable
          caption="T"
          columns={tokenColumns()}
          rows={TOKEN_ROWS}
          getRowKey={getTokenRowKey}
          formatSortButtonName={() => {
            throw new Error('locale-bug');
          }}
        />
      </TestBoundary>
    );
    expect(container.textContent).toContain('fell');
  });

  it('still mounts when the formatter returns a blank string', () => {
    const { container } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        formatSortButtonName={() => ''}
      />
    );
    expect(container.querySelector('[data-slot="data-table"]')).not.toBeNull();
    expect(amountButton(container).getAttribute('aria-label')).toBe('Sort by Amount');
  });
});
