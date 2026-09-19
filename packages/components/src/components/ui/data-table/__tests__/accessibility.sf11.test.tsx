/**
 * SF-11 · Accessibility jsdom mirror — INV-258 … INV-260.
 * Keyboard completion, axe, and unmount rescue live in data-table.sf11.browser.test.tsx.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataTable } from '../data-table';
import { numberedTokenRows, tokenColumns } from './sf2-fixtures';

describe('INV-258 / INV-260 (jsdom): named numbers; ellipsis not a tab stop', () => {
  it('resolves 1-based number names and keeps ellipsis out of the button role', () => {
    render(
      <DataTable
        caption="Tokenization requests"
        columns={tokenColumns()}
        rows={numberedTokenRows(200)}
        getRowKey={(row) => row.id}
        pagination={{ kind: 'client', pageIndex: 10, pageSize: 10, onPageChange: vi.fn() }}
      />
    );
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '11' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '11' }).getAttribute('aria-current')).toBe('page');
    expect(screen.queryByRole('button', { name: '…' })).toBeNull();
    const ellipsis = document.querySelector('[data-slot="data-table-pagination-ellipsis"]');
    expect(ellipsis?.getAttribute('tabindex')).toBeNull();
  });

  it('exposes only Previous and Next as pager buttons when total is unknown', () => {
    render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={numberedTokenRows(10)}
        getRowKey={(row) => row.id}
        pagination={{ kind: 'server', pageIndex: 0, pageSize: 10, onPageChange: vi.fn() }}
      />
    );
    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    expect(nav.querySelectorAll('[data-slot="data-table-pagination-page"]').length).toBe(0);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy();
  });
});

describe('INV-259: aria-live remains only on status', () => {
  it('updates status text after a number click and never lives the table or pages group', () => {
    const onPageChange = vi.fn();
    const { container, rerender } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={numberedTokenRows(47)}
        getRowKey={(row) => row.id}
        pagination={{ kind: 'client', pageIndex: 0, pageSize: 10, onPageChange }}
      />
    );
    const status = container.querySelector('[data-slot="data-table-pagination-status"]');
    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect(
      container
        .querySelector('[data-slot="data-table-pagination-pages"]')
        ?.hasAttribute('aria-live')
    ).toBe(false);
    expect(container.querySelector('table')?.hasAttribute('aria-live')).toBe(false);
    fireEvent.click(
      container.querySelector(
        '[data-slot="data-table-pagination-page"][data-page-index="1"]'
      ) as HTMLButtonElement
    );
    rerender(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={numberedTokenRows(47)}
        getRowKey={(row) => row.id}
        pagination={{ kind: 'client', pageIndex: 1, pageSize: 10, onPageChange }}
      />
    );
    expect(container.querySelector('[data-slot="data-table-pagination-status"]')?.textContent).toBe(
      'Showing 11–20 of 47'
    );
  });
});
