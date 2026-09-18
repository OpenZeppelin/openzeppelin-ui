/**
 * SF-8 · Render contract — INV-176 … INV-182, INV-203, INV-209, INV-210, INV-212.
 */
import './sf4-jsdom-setup';

import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Checkbox } from '../../checkbox';
import { DataTable } from '../data-table';
import { DATA_TABLE_SELECT_COLUMN_ID, type DataTableColumn } from '../types';
import {
  captionTableProps,
  numberedTokenRows,
  TOKEN_ROWS,
  tokenColumns,
  type TokenRow,
} from './sf2-fixtures';

const selection = (selectedKeys: ReadonlySet<string> = new Set()) => ({
  selectedKeys,
  onSelectionChange: vi.fn(),
});

describe('INV-176 / INV-177 / INV-182: the selection column is opt-in, leading, and additive', () => {
  it('omits every kit-selection marker while preserving an app-owned select column', () => {
    const columns: DataTableColumn<TokenRow>[] = [
      {
        id: 'select',
        header: <Checkbox aria-label="Custom select all" />,
        headerLabel: 'Custom select',
        cell: (row) => <Checkbox aria-label={`Custom select ${row.id}`} />,
      },
      ...tokenColumns(),
    ];
    const { container } = render(<DataTable {...captionTableProps({ columns })} />);

    expect(container.querySelector(`[data-column-id="${DATA_TABLE_SELECT_COLUMN_ID}"]`)).toBeNull();
    expect(container.querySelectorAll('[data-selected], [data-state="selected"]')).toHaveLength(0);
    expect(container.querySelector('[data-column-id="select"]')).not.toBeNull();
  });

  it('prepends one kit header and one kit cell per data row without mutating columns', () => {
    const columns = tokenColumns();
    const snapshot = [...columns];
    const { container } = render(
      <DataTable {...captionTableProps({ columns, selection: selection() })} />
    );
    const firstHeader = container.querySelector('thead th');
    expect(firstHeader?.getAttribute('data-column-id')).toBe(DATA_TABLE_SELECT_COLUMN_ID);
    for (const row of container.querySelectorAll('[data-slot="data-table-row"]')) {
      expect(row.querySelector('td')?.getAttribute('data-column-id')).toBe(
        DATA_TABLE_SELECT_COLUMN_ID
      );
    }
    expect(columns).toEqual(snapshot);
    expect(container.querySelectorAll('thead th')).toHaveLength(columns.length + 1);
  });
});

describe('INV-178 / INV-203 / INV-210: header semantics and empty span remain valid', () => {
  it('separates the column name from the select-all control name', () => {
    const { container, getByRole } = render(
      <DataTable {...captionTableProps({ selection: selection() })} />
    );
    const header = container.querySelector(`th[data-column-id="${DATA_TABLE_SELECT_COLUMN_ID}"]`);
    expect(header?.getAttribute('scope')).toBe('col');
    expect(header?.getAttribute('aria-label')).toBe('Select');
    expect(getByRole('checkbox', { name: 'Select all' })).toBeTruthy();
    expect(header?.textContent).toBe('');
  });

  it('keeps an empty header unchecked, disabled, inert, and adds one to colSpan', () => {
    const onSelectionChange = vi.fn();
    const { container, getByRole } = render(
      <DataTable
        {...captionTableProps({
          rows: [],
          selection: { selectedKeys: new Set(['off-window']), onSelectionChange },
        })}
      />
    );
    const headerCheckbox = getByRole('checkbox', { name: 'Select all' });
    expect(headerCheckbox.hasAttribute('disabled')).toBe(true);
    expect(headerCheckbox.getAttribute('data-state')).toBe('unchecked');
    expect(
      container.querySelector('[data-slot="data-table-empty"] td')?.getAttribute('colspan')
    ).toBe(String(tokenColumns().length + 1));
    headerCheckbox.click();
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});

describe('INV-179 / INV-180 / INV-212: only selected data rows expose styling state', () => {
  it('marks selected identities and omits false state and aria-selected elsewhere', () => {
    const { container } = render(
      <DataTable {...captionTableProps({ selection: selection(new Set(['b'])) })} />
    );
    const selected = container.querySelector('[data-row-key="b"]');
    const unselected = container.querySelector('[data-row-key="a"]');
    expect(selected?.getAttribute('data-selected')).toBe('true');
    expect(selected?.getAttribute('data-state')).toBe('selected');
    expect(selected?.hasAttribute('aria-selected')).toBe(false);
    expect(unselected?.hasAttribute('data-selected')).toBe(false);
    expect(unselected?.hasAttribute('data-state')).toBe(false);
  });

  it('keeps virtual spacers and the infinite sentinel free of selection chrome and controls', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(80),
          virtualized: { maxHeight: 120, estimateSize: 36, overscan: 1 },
          infiniteScroll: { hasMore: true, busy: true, onLoadMore: vi.fn() },
          selection: selection(new Set(['r0'])),
        })}
      />
    );
    for (const chrome of container.querySelectorAll(
      '[data-slot="data-table-spacer"], [data-slot="data-table-infinite-sentinel"]'
    )) {
      expect(chrome.hasAttribute('data-selected')).toBe(false);
      expect(chrome.hasAttribute('data-state')).toBe(false);
      expect(chrome.querySelector('[data-slot="checkbox"]')).toBeNull();
    }
  });

  it('keeps empty chrome free of row checkboxes and selection attributes', () => {
    const { container } = render(
      <DataTable {...captionTableProps({ rows: [], selection: selection() })} />
    );
    const empty = container.querySelector('[data-slot="data-table-empty"]');
    expect(empty?.querySelector('[data-slot="checkbox"]')).toBeNull();
    expect(empty?.hasAttribute('data-selected')).toBe(false);
    expect(empty?.hasAttribute('data-state')).toBe(false);
  });
});

describe('INV-181 / INV-209: mixed and checked Checkbox states have distinct glyphs', () => {
  it('uses Radix state classes to show minus and hide check for mixed state', () => {
    const { getByRole } = render(
      <DataTable {...captionTableProps({ selection: selection(new Set(['a'])) })} />
    );
    const header = getByRole('checkbox', { name: 'Select all' });
    expect(header.getAttribute('aria-checked')).toBe('mixed');
    expect(
      header.querySelector('[data-slot="checkbox-indeterminate-icon"]')?.getAttribute('class')
    ).toContain('group-data-[state=indeterminate]:block');
    expect(
      header.querySelector('[data-slot="checkbox-indicator-icon"]')?.getAttribute('class')
    ).toContain('group-data-[state=indeterminate]:hidden');
  });

  it('uses the same glyph pair without mirrored React state for checked rows', () => {
    const { getByRole } = render(
      <DataTable
        {...captionTableProps({
          rows: TOKEN_ROWS.slice(0, 1),
          selection: selection(new Set(['a'])),
        })}
      />
    );
    const rowCheckbox = getByRole('checkbox', { name: 'Select a' });
    expect(rowCheckbox.getAttribute('data-state')).toBe('checked');
    expect(rowCheckbox.querySelector('[data-slot="checkbox-indicator-icon"]')).not.toBeNull();
    expect(
      rowCheckbox.querySelector('[data-slot="checkbox-indeterminate-icon"]')?.getAttribute('class')
    ).toContain('hidden');
  });
});
