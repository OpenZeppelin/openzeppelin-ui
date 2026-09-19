/**
 * SF-8 · Prop / state contract — INV-183 … INV-185, INV-189 … INV-191, INV-206, INV-39*.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { logger } from '@openzeppelin/ui-utils';

import { DataTable } from '../data-table';
import {
  DATA_TABLE_SELECT_COLUMN_ID,
  type DataTableProps,
  type DataTableSelection,
} from '../types';
import { captionTableProps, TOKEN_ROWS, tokenColumns, type TokenRow } from './sf2-fixtures';

const DATA_TABLE_SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'data-table.tsx'),
  'utf8'
).replace(/\/\*[\s\S]*?\*\//g, '');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('INV-183 / INV-185 / INV-39*: selection is nested and always controlled', () => {
  it('requires both selectedKeys and onSelectionChange in the nested value object', () => {
    expectTypeOf<DataTableSelection<TokenRow>>().toMatchTypeOf<{
      readonly selectedKeys: ReadonlySet<string>;
      readonly onSelectionChange: (next: ReadonlySet<string>) => void;
    }>();

    // @ts-expect-error INV-183: selectedKeys is required
    const missingKeys: DataTableSelection<TokenRow> = { onSelectionChange: () => undefined };
    // @ts-expect-error INV-183: callback is required
    const missingCallback: DataTableSelection<TokenRow> = { selectedKeys: new Set() };
    expect([missingKeys, missingCallback]).toHaveLength(2);
  });

  it('rejects top-level aliases while accepting the nested selection key', () => {
    const legal = {
      ...captionTableProps(),
      selection: { selectedKeys: new Set<string>(), onSelectionChange: () => undefined },
    } satisfies DataTableProps<TokenRow>;
    expect(legal.selection).toBeDefined();
    expectTypeOf<
      Extract<keyof DataTableProps<TokenRow>, 'selection'>
    >().toEqualTypeOf<'selection'>();
    expectTypeOf<
      Extract<keyof DataTableProps<TokenRow>, 'selectedIds' | 'onSelectionChange'>
    >().toEqualTypeOf<never>();

    const illegal = {
      ...captionTableProps(),
      // @ts-expect-error INV-39*: top-level selectedIds remains forbidden
      selectedIds: new Set(['a']),
    } satisfies DataTableProps<TokenRow>;
    expect(illegal.selectedIds).toEqual(new Set(['a']));
  });

  it('rejects unshipped selection modes', () => {
    const selection = {
      selectedKeys: new Set<string>(),
      onSelectionChange: () => undefined,
      // @ts-expect-error INV-185: single/exclude selection modes are outside v1
      mode: 'single',
    } satisfies DataTableSelection<TokenRow>;
    expect(selection.mode).toBe('single');
  });

  it('contains no selected-set React state or defaultSelectedKeys implementation', () => {
    expect(DATA_TABLE_SOURCE).not.toMatch(/useState\s*<[^>]*Set/);
    expect(DATA_TABLE_SOURCE).not.toMatch(/\bdefaultSelectedKeys\b/);
  });
});

describe('INV-189: integrator mistakes diagnose without dropping kit selection', () => {
  it('keeps the reserved column first and logs one collision diagnostic', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const columns = [
      {
        id: DATA_TABLE_SELECT_COLUMN_ID,
        header: 'Integrator collision',
        cell: () => 'custom',
      },
      ...tokenColumns(),
    ];
    const { container } = render(
      <DataTable
        {...captionTableProps({
          columns,
          selection: { selectedKeys: new Set(), onSelectionChange: vi.fn() },
        })}
      />
    );

    expect(
      [...container.querySelectorAll('thead th')]
        .slice(0, 2)
        .map((cell) => cell.getAttribute('data-column-id'))
    ).toEqual([DATA_TABLE_SELECT_COLUMN_ID, DATA_TABLE_SELECT_COLUMN_ID]);
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        'DataTable',
        `DataTable: column id "${DATA_TABLE_SELECT_COLUMN_ID}" is reserved while selection is enabled.`
      );
    });
  });

  it('fails closed for duplicate row keys by painting both rows selected', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const rows = [
      { ...TOKEN_ROWS[0]!, id: 'duplicate' },
      { ...TOKEN_ROWS[1]!, id: 'duplicate' },
    ];
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows,
          selection: { selectedKeys: new Set(['duplicate']), onSelectionChange: vi.fn() },
        })}
      />
    );
    expect(
      container.querySelectorAll('[data-slot="data-table-row"][data-selected="true"]')
    ).toHaveLength(2);
  });
});

describe('INV-191 / INV-206: labels default at the boundary and row changes do not prune keys', () => {
  it('uses frozen default labels and allows all three overrides', () => {
    const defaults = render(
      <DataTable
        {...captionTableProps({
          rows: TOKEN_ROWS.slice(0, 1),
          selection: { selectedKeys: new Set(), onSelectionChange: vi.fn() },
        })}
      />
    );
    expect(defaults.getByRole('checkbox', { name: 'Select all' })).toBeTruthy();
    expect(defaults.getByRole('checkbox', { name: 'Select a' })).toBeTruthy();
    expect(defaults.container.querySelector('th[aria-label="Select"]')).not.toBeNull();
    defaults.unmount();

    const custom = render(
      <DataTable
        {...captionTableProps({
          rows: TOKEN_ROWS.slice(0, 1),
          selection: {
            selectedKeys: new Set(),
            onSelectionChange: vi.fn(),
            selectAllLabel: 'Select all accounts',
            getCheckboxLabel: (row) => `Select account ${row.label}`,
            columnHeaderLabel: 'Account selection',
          },
        })}
      />
    );
    expect(custom.getByRole('checkbox', { name: 'Select all accounts' })).toBeTruthy();
    expect(custom.getByRole('checkbox', { name: 'Select account Alpha' })).toBeTruthy();
    expect(custom.container.querySelector('th[aria-label="Account selection"]')).not.toBeNull();
  });

  it('keeps an app-owned off-window key when rows change to a disjoint set', () => {
    const selectedKeys = new Set(['off-window']);
    const onSelectionChange = vi.fn();
    const { rerender } = render(
      <DataTable {...captionTableProps({ selection: { selectedKeys, onSelectionChange } })} />
    );
    rerender(
      <DataTable
        {...captionTableProps({
          rows: [{ id: 'new', label: 'New', amount: 1n, status: 'Active' }],
          selection: { selectedKeys, onSelectionChange },
        })}
      />
    );
    expect(selectedKeys).toEqual(new Set(['off-window']));
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});
