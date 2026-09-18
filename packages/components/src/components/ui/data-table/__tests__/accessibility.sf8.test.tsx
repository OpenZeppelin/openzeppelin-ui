/**
 * SF-8 · Accessibility mirror — INV-207 … INV-212.
 * Keyboard and axe proof also run in Chromium.
 */
import './sf4-jsdom-setup';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataTable } from '../data-table';
import { captionTableProps, TOKEN_ROWS } from './sf2-fixtures';

describe('INV-207 / INV-210 / INV-212: selection preserves native table semantics', () => {
  it('adds checkbox semantics without promoting the table to a grid', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          selection: { selectedKeys: new Set(['a']), onSelectionChange: vi.fn() },
        })}
      />
    );
    expect(screen.getByRole('table', { name: 'Tokenization requests' })).toBeTruthy();
    expect(screen.queryByRole('grid')).toBeNull();
    expect(container.querySelector('[aria-multiselectable]')).toBeNull();
    expect(container.querySelector('[aria-selected]')).toBeNull();
    expect(container.querySelectorAll('[data-slot="data-table-row"][role]')).toHaveLength(0);
  });

  it('keeps one scoped selection header and unchanged row counts', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          virtualized: true,
          selection: { selectedKeys: new Set(), onSelectionChange: vi.fn() },
        })}
      />
    );
    expect(
      container.querySelector('th[data-column-id="__data-table-select"][scope="col"]')
    ).not.toBeNull();
    expect(container.querySelectorAll('thead tr')).toHaveLength(1);
    expect(container.querySelector('table')?.getAttribute('aria-rowcount')).toBe(
      String(TOKEN_ROWS.length + 1)
    );
  });
});

describe('INV-208 / INV-209: each selection surface has a distinct accessible state and name', () => {
  it('exposes distinct column, header-control, and row-control names', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: TOKEN_ROWS.slice(0, 1),
          selection: {
            selectedKeys: new Set(),
            onSelectionChange: vi.fn(),
            columnHeaderLabel: 'Account selection',
            selectAllLabel: 'Select all accounts',
            getCheckboxLabel: (row) => `Select account ${row.label}`,
          },
        })}
      />
    );
    expect(container.querySelector('th[aria-label="Account selection"]')).not.toBeNull();
    expect(screen.getByRole('checkbox', { name: 'Select all accounts' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Select account Alpha' })).toBeTruthy();
  });

  it('announces unchecked, mixed, and checked states without color-only ambiguity', () => {
    const { getByRole } = render(
      <DataTable
        {...captionTableProps({
          selection: { selectedKeys: new Set(['a']), onSelectionChange: vi.fn() },
        })}
      />
    );
    const header = getByRole('checkbox', { name: 'Select all' });
    const checkedRow = getByRole('checkbox', { name: 'Select a' });
    const uncheckedRow = getByRole('checkbox', { name: 'Select b' });
    expect(header.getAttribute('aria-checked')).toBe('mixed');
    expect(header.querySelector('[data-slot="checkbox-indeterminate-icon"]')).not.toBeNull();
    expect(checkedRow.getAttribute('aria-checked')).toBe('true');
    expect(uncheckedRow.getAttribute('aria-checked')).toBe('false');
  });
});
