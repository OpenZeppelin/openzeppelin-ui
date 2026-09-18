/**
 * SF-2 · Accessibility jsdom mirror — INV-56 (browser suite is the High-stakes proof).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Checkbox } from '../../checkbox';
import { DataTable } from '../data-table';
import { getTokenRowKey, TOKEN_ROWS, tokenColumns } from './sf2-fixtures';

describe('INV-56 (jsdom): named table, columnheaders, no grid', () => {
  it('exposes table / columnheader / cell roles for a mixed caption table', () => {
    const columns = [
      {
        id: 'select',
        header: <Checkbox aria-label="Select all" />,
        headerLabel: 'Select',
        cell: () => <Checkbox aria-label="Select row" />,
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
    expect(screen.getByRole('columnheader', { name: 'Select' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Amount' })).toBeTruthy();
    expect(screen.getAllByRole('columnheader')).toHaveLength(columns.length);
    expect(screen.getAllByRole('row').length).toBe(TOKEN_ROWS.length + 1);
    expect(screen.getAllByRole('cell').length).toBe(TOKEN_ROWS.length * columns.length);
  });

  it('keeps a named table with one body cell in the empty branch', () => {
    render(
      <DataTable
        caption="Tokenization requests"
        columns={tokenColumns()}
        rows={[]}
        getRowKey={getTokenRowKey}
      />
    );
    expect(screen.getByRole('table', { name: 'Tokenization requests' })).toBeTruthy();
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getAllByRole('cell')).toHaveLength(1);
  });
});
