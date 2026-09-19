/**
 * SF-12 · Accessibility jsdom — INV-323, INV-324, INV-325, INV-86*.
 * Keyboard + axe live in data-table.sf12.browser.test.tsx.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DataTable } from '../data-table';
import { getTokenRowKey, TOKEN_ROWS, tokenColumns } from './sf2-fixtures';

describe('INV-325: no live region for sort-name changes', () => {
  it('does not add aria-live on wrapper, table, headers, or sort buttons', () => {
    const { container, rerender } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        formatSortButtonName={({ columnName, direction }) => `${columnName}:${direction}`}
      />
    );
    const liveInTableChrome = () =>
      [
        ...container.querySelectorAll(
          '[data-slot="data-table"], table, [data-slot="data-table-header-cell"], [data-slot="data-table-header-cell"] button'
        ),
      ].filter((node) => node.hasAttribute('aria-live'));
    expect(liveInTableChrome()).toEqual([]);
    rerender(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        sort={{ columnId: 'amount', direction: 'asc' }}
        formatSortButtonName={({ columnName, direction }) => `${columnName}:${direction}`}
      />
    );
    expect(liveInTableChrome()).toEqual([]);
    expect(screen.getByRole('button', { name: 'Amount:asc' })).toBeTruthy();
  });
});

describe('INV-324 (jsdom): direction is in the accessible name, not colour-only', () => {
  it('keeps a non-empty aria-label after a blank formatter fallback', () => {
    const { container } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        formatSortButtonName={() => '  '}
      />
    );
    const button = container.querySelector('[data-column-id="amount"] button');
    expect(button?.getAttribute('aria-label')).toBe('Sort by Amount');
    expect(
      container.querySelector('[data-column-id="amount"] button svg')?.getAttribute('aria-hidden')
    ).toBe('true');
  });
});
