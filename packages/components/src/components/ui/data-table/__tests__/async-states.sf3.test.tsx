/**
 * SF-3 · Async / loading / error / empty — INV-83, INV-84, INV-85.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { logger } from '@openzeppelin/ui-utils';

import { DataTable } from '../data-table';
import { getTokenRowKey, TOKEN_ROWS, tokenColumns, type TokenRow } from './sf2-fixtures';

const DATA_TABLE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('INV-83: sort never fetches', () => {
  it('does not call fetch on sort activation', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { container } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        onSortChange={() => undefined}
      />
    );
    fireEvent.click(
      container.querySelector('[data-column-id="amount"] button') as HTMLButtonElement
    );
    expect(fetchSpy, 'INV-83: onSortChange is not a loader').not.toHaveBeenCalled();
  });

  it('imports no query libraries from product sources', () => {
    for (const name of ['data-table.tsx', 'sort.ts', 'types.ts']) {
      const source = readFileSync(join(DATA_TABLE_DIR, name), 'utf8');
      expect(source).not.toMatch(/@tanstack\/react-query/);
      expect(source).not.toMatch(/\bfetch\s*\(/);
    }
  });
});

describe('INV-84: intent-only sort paints and notifies without reordering', () => {
  it('keeps the rows reference order and logs when onSortChange is also missing', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const columns = tokenColumns().map((column) =>
      column.id === 'amount' ? { ...column, getSortValue: undefined } : column
    );
    const { container } = render(
      <DataTable caption="T" columns={columns} rows={TOKEN_ROWS} getRowKey={getTokenRowKey} />
    );
    fireEvent.click(
      container.querySelector('[data-column-id="amount"] button') as HTMLButtonElement
    );
    expect(container.querySelector('[data-column-id="amount"]')?.getAttribute('aria-sort')).toBe(
      'ascending'
    );
    expect(
      [...container.querySelectorAll('[data-slot="data-table-row"] [data-column-id="label"]')].map(
        (cell) => cell.textContent
      )
    ).toEqual(['Alpha', 'Beta', 'Gamma']);
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        'DataTable',
        'DataTable: column "amount" is sortable without getSortValue and without onSortChange — sort will not change row order.'
      );
    });
  });

  it('fires onSortChange and still does not reorder', () => {
    const onSortChange = vi.fn();
    const columns = tokenColumns().map((column) =>
      column.id === 'amount' ? { ...column, getSortValue: undefined } : column
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
    fireEvent.click(
      container.querySelector('[data-column-id="amount"] button') as HTMLButtonElement
    );
    expect(onSortChange).toHaveBeenCalledWith({ columnId: 'amount', direction: 'asc' });
    expect(
      container.querySelector('[data-slot="data-table-row"] [data-column-id="label"]')?.textContent
    ).toBe('Alpha');
  });
});

describe('INV-85: switching to an intent-only column drops the client-sorted snapshot', () => {
  it('restores integrator rows order when Time becomes the active sort', () => {
    const columns = [
      ...tokenColumns(),
      {
        id: 'time',
        header: 'Time',
        sortable: true,
        cell: (row: TokenRow) => row.id,
      },
    ];
    const { container } = render(
      <DataTable caption="T" columns={columns} rows={TOKEN_ROWS} getRowKey={getTokenRowKey} />
    );
    fireEvent.click(
      container.querySelector('[data-column-id="amount"] button') as HTMLButtonElement
    );
    fireEvent.click(
      container.querySelector('[data-column-id="amount"] button') as HTMLButtonElement
    );
    expect(
      container.querySelector('[data-slot="data-table-row"] [data-column-id="label"]')?.textContent
    ).toBe('Gamma');
    fireEvent.click(container.querySelector('[data-column-id="time"] button') as HTMLButtonElement);
    expect(
      [...container.querySelectorAll('[data-slot="data-table-row"] [data-column-id="label"]')].map(
        (cell) => cell.textContent
      ),
      'INV-85: no hidden snapshot of the amount-sorted copy'
    ).toEqual(['Alpha', 'Beta', 'Gamma']);
  });
});
