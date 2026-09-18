/**
 * SF-8 · Chromium verification — INV-195 … INV-197, INV-207 … INV-211, SC-003, SC-004, SC-007.
 */
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { useState, type ReactElement } from 'react';

import { DataTable } from '../data-table';
import type { DataTableVirtualizationHandle } from '../types';
import { numberedTokenRows, tokenColumns, type TokenRow } from './sf2-fixtures';

const simpleColumns = [
  {
    id: 'label',
    header: 'Account',
    cell: (row: TokenRow) => row.label,
  },
];

function injectVirtualizationStyles(): void {
  if (document.getElementById('sf8-virtualization-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'sf8-virtualization-styles';
  style.textContent = '.overflow-auto { overflow: auto; }';
  document.head.appendChild(style);
}

function ControlledSelectionTable(): ReactElement {
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(new Set());
  return (
    <DataTable
      caption="Role Manager accounts"
      columns={simpleColumns}
      rows={numberedTokenRows(2)}
      getRowKey={(row) => row.id}
      selection={{
        selectedKeys,
        onSelectionChange: setSelectedKeys,
        selectAllLabel: 'Select all accounts',
        getCheckboxLabel: (row) => `Select account ${row.id}`,
      }}
    />
  );
}

describe('INV-207 … INV-210 / SC-003 (browser): selectable table is axe-clean and native', () => {
  it('exposes table and mixed checkbox semantics without grid or selected-row ARIA', async () => {
    const { container } = render(
      <DataTable
        caption="Accounts"
        columns={tokenColumns()}
        rows={numberedTokenRows(4)}
        getRowKey={(row) => row.id}
        selection={{ selectedKeys: new Set(['r1']), onSelectionChange: () => undefined }}
      />
    );
    expect(screen.getByRole('table', { name: 'Accounts' })).toBeTruthy();
    expect(screen.queryByRole('grid')).toBeNull();
    expect(screen.getByRole('checkbox', { name: 'Select all' }).getAttribute('aria-checked')).toBe(
      'mixed'
    );
    expect(container.querySelector('[aria-selected]')).toBeNull();
    const results = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    });
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
});

describe('INV-211 / INV-192 / INV-193 (browser): keyboard completes selection flows', () => {
  it('tabs through header and row checkboxes and toggles each with Space', async () => {
    render(<ControlledSelectionTable />);

    await userEvent.tab();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Select all accounts');
    await userEvent.keyboard(' ');
    await expect
      .poll(() =>
        screen.getByRole('checkbox', { name: 'Select account r0' }).getAttribute('aria-checked')
      )
      .toBe('true');

    await userEvent.tab();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Select account r0');
    await userEvent.keyboard(' ');
    await expect
      .poll(() =>
        screen.getByRole('checkbox', { name: 'Select account r0' }).getAttribute('aria-checked')
      )
      .toBe('false');
  });
});

describe('INV-196 / SC-004 (browser): append preserves focused checkbox identity', () => {
  it.each([
    { name: 'unvirtualized', virtualized: false },
    { name: 'virtualized', virtualized: true },
  ])('$name selection keeps focus on row r0 after append', async ({ virtualized }) => {
    const selectedKeys = new Set(['r0']);
    const selection = { selectedKeys, onSelectionChange: () => undefined };
    const infiniteScroll = { hasMore: true, busy: true, onLoadMore: () => undefined };
    const { rerender } = render(
      <DataTable
        caption="Accounts feed"
        columns={simpleColumns}
        rows={numberedTokenRows(8)}
        getRowKey={(row) => row.id}
        virtualized={virtualized}
        infiniteScroll={infiniteScroll}
        selection={selection}
      />
    );
    const checkbox = screen.getByRole('checkbox', { name: 'Select r0' });
    checkbox.focus();
    expect(document.activeElement).toBe(checkbox);

    rerender(
      <DataTable
        caption="Accounts feed"
        columns={simpleColumns}
        rows={numberedTokenRows(20)}
        getRowKey={(row) => row.id}
        virtualized={virtualized}
        infiniteScroll={infiniteScroll}
        selection={selection}
      />
    );
    await expect
      .poll(() =>
        document.activeElement
          ?.closest('[data-slot="data-table-row"]')
          ?.getAttribute('data-row-key')
      )
      .toBe('r0');
  });
});

describe('INV-195 / SC-007 (browser): virtual recycle paints selected identity, not slot', () => {
  it('scrolls to a selected offscreen key and paints only that row checked', async () => {
    injectVirtualizationStyles();
    const handle: { current: DataTableVirtualizationHandle | null } = { current: null };
    const { container } = render(
      <DataTable
        caption="Virtual accounts"
        columns={simpleColumns}
        rows={numberedTokenRows(100)}
        getRowKey={(row) => row.id}
        virtualized={{ maxHeight: 160, estimateSize: 40, overscan: 1 }}
        virtualizationRef={(next) => {
          handle.current = next;
        }}
        selection={{ selectedKeys: new Set(['r80']), onSelectionChange: () => undefined }}
      />
    );
    await expect.poll(() => handle.current).not.toBeNull();
    handle.current?.scrollToRowKey('r80', 'center');
    await expect
      .poll(() => container.querySelector('[data-row-key="r80"]')?.getAttribute('data-selected'))
      .toBe('true');
    expect(
      container
        .querySelector('[data-row-key="r80"] [data-slot="checkbox"]')
        ?.getAttribute('aria-checked')
    ).toBe('true');
  });
});
