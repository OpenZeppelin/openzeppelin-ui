/**
 * SF-3 · Accessibility jsdom mirror — INV-86, INV-88.
 * Keyboard order, computed th display, and axe live in data-table.browser.test.tsx.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DataTable } from '../data-table';
import { getTokenRowKey, TOKEN_ROWS, tokenColumns } from './sf2-fixtures';

describe('INV-86 (jsdom): sort buttons are named; icons are presentational', () => {
  it('names the wrapping string button with the same directional label as sibling buttons', () => {
    const { container } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
      />
    );
    expect(screen.getByRole('button', { name: 'Sort by Amount' })).toBeTruthy();
    const icon = container.querySelector('[data-column-id="amount"] button svg');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });

  it('names the sibling icon button from headerLabel, not the checkbox', () => {
    const columns = [
      {
        id: 'select',
        header: <input type="checkbox" aria-label="Select all" />,
        headerLabel: 'Select',
        sortable: true,
        cell: () => null,
      },
    ];
    render(
      <DataTable caption="T" columns={columns} rows={TOKEN_ROWS} getRowKey={getTokenRowKey} />
    );
    expect(screen.getByRole('button', { name: /Sort by Select/i })).toBeTruthy();
  });
});

describe('INV-88 (jsdom): sortable headers remain columnheaders, not a grid', () => {
  it('keeps table semantics with a sortable mixed header set', () => {
    const columns = [
      {
        id: 'select',
        header: <input type="checkbox" aria-label="Select all" />,
        headerLabel: 'Select',
        sortable: true,
        cell: () => null,
      },
      ...tokenColumns(),
    ];
    render(
      <DataTable
        caption="Tokenization requests"
        columns={columns}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
      />
    );
    expect(screen.getByRole('table', { name: 'Tokenization requests' })).toBeTruthy();
    expect(screen.queryByRole('grid')).toBeNull();
    expect(screen.getAllByRole('columnheader')).toHaveLength(columns.length);
    expect(screen.getByRole('columnheader', { name: 'Amount' })).toBeTruthy();
  });
});
