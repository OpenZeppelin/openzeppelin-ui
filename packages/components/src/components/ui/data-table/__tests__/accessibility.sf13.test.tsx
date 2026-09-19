/**
 * SF-13 · Accessibility jsdom — INV-355, INV-356, INV-359.
 * Keyboard completion and axe live in data-table.sf13.browser.test.tsx.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataTable } from '../data-table';
import { DATA_TABLE_SELECT_COLUMN_ID } from '../types';
import { captionTableProps, numberedTokenRows } from './sf2-fixtures';

describe('INV-356: hideStatus keeps a polite live region and a named nav', () => {
  it('retains aria-live on status and Previous/Next when totals are omitted', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(10),
          pagination: {
            kind: 'server',
            pageIndex: 0,
            pageSize: 10,
            onPageChange: vi.fn(),
            hideStatus: true,
            placement: 'inside',
            paginationLabel: 'Role changes pagination',
          },
        })}
      />
    );
    const status = container.querySelector('[data-slot="data-table-pagination-status"]');
    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect(status?.getAttribute('aria-atomic')).toBe('true');
    expect(status?.getAttribute('tabindex')).toBe('-1');
    expect(screen.getByRole('navigation', { name: 'Role changes pagination' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy();
    expect(container.querySelectorAll('[data-slot="data-table-pagination-page"]').length).toBe(0);
  });
});

describe('INV-359: select names survive columnClassName', () => {
  it('keeps select-all name, row name, and scope=col', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          selection: {
            selectedKeys: new Set(),
            onSelectionChange: vi.fn(),
            columnClassName: 'w-10',
          },
        })}
      />
    );
    const header = container.querySelector(`th[data-column-id="${DATA_TABLE_SELECT_COLUMN_ID}"]`);
    expect(header?.getAttribute('scope')).toBe('col');
    expect(screen.getByRole('checkbox', { name: 'Select all' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Select a' })).toBeTruthy();
  });
});

describe('INV-355 (jsdom tokens): frame may clip; scroller must not', () => {
  it('forbids overflow-hidden on the scrollport and table internals', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          toolbar: <div>Filters</div>,
          pagination: {
            kind: 'client',
            pageIndex: 0,
            pageSize: 10,
            onPageChange: vi.fn(),
            placement: 'inside',
          },
        })}
      />
    );
    expect(container.querySelector('[data-slot="data-table-frame"]')?.className).toContain(
      'overflow-hidden'
    );
    expect(container.querySelector('[data-slot="data-table"]')?.className).not.toContain(
      'overflow-hidden'
    );
    expect(container.querySelector('table')?.className).not.toContain('overflow-hidden');
    expect(container.querySelector('thead')?.className).not.toContain('overflow-hidden');
    expect(
      container.querySelector('[data-slot="data-table-header-cell"]')?.className
    ).not.toContain('overflow-hidden');
  });
});
