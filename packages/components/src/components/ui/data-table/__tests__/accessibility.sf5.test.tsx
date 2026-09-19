/**
 * SF-5 · Accessibility jsdom mirror — INV-113.
 * Keyboard completion, computed overflow, and axe live in data-table.sf5.browser.test.tsx.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataTable } from '../data-table';
import { numberedTokenRows, tokenColumns } from './sf2-fixtures';

describe('INV-113 (jsdom): pager is a named navigation; table semantics survive paging', () => {
  it('resolves navigation and labelled buttons after the named table', () => {
    render(
      <DataTable
        caption="Tokenization requests"
        columns={tokenColumns()}
        rows={numberedTokenRows(25)}
        getRowKey={(row) => row.id}
        pagination={{
          kind: 'client',
          pageIndex: 1,
          pageSize: 10,
          onPageChange: vi.fn(),
        }}
      />
    );
    expect(screen.getByRole('table', { name: 'Tokenization requests' })).toBeTruthy();
    expect(screen.queryByRole('grid')).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy();
    expect(screen.getByText('Showing 11–20 of 25')).toBeTruthy();
    expect(screen.getAllByRole('columnheader').length).toBe(tokenColumns().length);
    const table = screen.getByRole('table', { name: 'Tokenization requests' });
    expect(table.getAttribute('aria-invalid')).toBeNull();
    expect(
      screen.getByRole('navigation', { name: 'Pagination' }).getAttribute('aria-invalid')
    ).toBeNull();
  });

  it('does not mark OOR chrome as aria-invalid', () => {
    const { container } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={numberedTokenRows(3)}
        getRowKey={(row) => row.id}
        pagination={{ kind: 'client', pageIndex: 4, pageSize: 10, onPageChange: vi.fn() }}
      />
    );
    expect(
      container.querySelector('[data-slot="data-table-pagination"]')?.hasAttribute('aria-invalid')
    ).toBe(false);
    expect(container.querySelector('table')?.hasAttribute('aria-invalid')).toBe(false);
  });
});
