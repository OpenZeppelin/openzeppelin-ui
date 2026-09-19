/**
 * SF-10 · Interaction/state transitions — INV-272, INV-275, INV-279, INV-281.
 */
import './sf4-jsdom-setup';

import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataTable } from '../data-table';
import { captionTableProps, numberedTokenRows } from './sf2-fixtures';

describe('INV-272 / INV-275 / INV-279: sticky toggles are controlled and non-remounting', () => {
  it('changes only the resolved seam and header classes across false/true rerenders', () => {
    const initialProps = captionTableProps({
      rows: numberedTokenRows(80),
      virtualized: { maxHeight: 160, estimateSize: 40 },
    });
    const { container, rerender } = render(<DataTable {...initialProps} stickyHeader={false} />);
    const wrapper = container.querySelector('[data-slot="data-table"]');
    const table = container.querySelector('[data-slot="data-table-table"]');
    const head = container.querySelector('[data-slot="data-table-head"]');
    const body = container.querySelector('[data-slot="data-table-body"]');
    const headerCells = [...container.querySelectorAll('[data-slot="data-table-header-cell"]')];

    rerender(<DataTable {...initialProps} stickyHeader />);

    expect(container.querySelector('[data-slot="data-table"]')).toBe(wrapper);
    expect(container.querySelector('[data-slot="data-table-table"]')).toBe(table);
    expect(container.querySelector('[data-slot="data-table-head"]')).toBe(head);
    expect(container.querySelector('[data-slot="data-table-body"]')).toBe(body);
    expect(
      container.querySelector('[data-slot="data-table"]')?.getAttribute('data-sticky-header')
    ).toBe('true');
    expect([...container.querySelectorAll('[data-slot="data-table-header-cell"]')]).toEqual(
      headerCells
    );
    expect(headerCells.every((cell) => cell.classList.contains('sticky'))).toBe(true);

    rerender(<DataTable {...initialProps} stickyHeader={false} />);
    expect(container.querySelector('[data-slot="data-table"]')).toBe(wrapper);
    expect(container.querySelector('[data-slot="data-table-head"]')).toBe(head);
    expect(headerCells.every((cell) => !cell.classList.contains('sticky'))).toBe(true);
  });
});

describe('INV-281: pagination remains outside the sticky lifecycle', () => {
  it('does not remount the table host when controlled page props change', () => {
    const onPageChange = vi.fn();
    const rows = numberedTokenRows(20);
    const firstProps = captionTableProps({
      rows,
      pagination: { kind: 'client', pageIndex: 0, pageSize: 10, onPageChange },
    });
    const { container, rerender } = render(<DataTable {...firstProps} />);
    const wrapper = container.querySelector('[data-slot="data-table"]');
    const head = container.querySelector('[data-slot="data-table-head"]');

    rerender(
      <DataTable
        {...captionTableProps({
          rows,
          pagination: { kind: 'client', pageIndex: 1, pageSize: 10, onPageChange },
        })}
      />
    );

    expect(container.querySelector('[data-slot="data-table"]')).toBe(wrapper);
    expect(container.querySelector('[data-slot="data-table-head"]')).toBe(head);
    expect(wrapper?.contains(container.querySelector('[data-slot="data-table-pagination"]'))).toBe(
      false
    );
  });
});
