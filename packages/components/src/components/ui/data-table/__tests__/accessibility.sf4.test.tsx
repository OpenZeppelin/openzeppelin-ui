/**
 * SF-4 · Accessibility jsdom mirror — INV-144 … INV-147.
 * Chromium axe, computed display, and keyboard live in data-table.sf4.browser.test.tsx.
 */
import './sf4-jsdom-setup';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataTable } from '../data-table';
import { numberedTokenRows, tokenColumns, type TokenRow } from './sf2-fixtures';

describe('INV-144 / INV-145 (jsdom): page-local rowcount; identity rowindex; all-or-nothing', () => {
  it('sets aria-rowcount to 1 + bodyRows.length on an unpaged virtualized table', () => {
    const { container } = render(
      <DataTable
        caption="Holders"
        columns={tokenColumns()}
        rows={numberedTokenRows(40)}
        getRowKey={(row) => row.id}
        virtualized
      />
    );
    expect(screen.getByRole('table', { name: 'Holders' })).toBeTruthy();
    expect(container.querySelector('table')?.getAttribute('aria-rowcount')).toBe('41');
    expect(container.querySelector('thead tr')?.getAttribute('aria-rowindex')).toBe('1');
    const bodyIndices = [...container.querySelectorAll('[data-slot="data-table-row"]')].map((row) =>
      Number(row.getAttribute('aria-rowindex'))
    );
    expect(bodyIndices.every((value) => Number.isInteger(value) && value >= 2)).toBe(true);
    for (const spacer of container.querySelectorAll('[data-slot="data-table-spacer"]')) {
      expect(spacer.hasAttribute('aria-rowindex')).toBe(false);
    }
  });

  it('omits every rowindex when virtualization is off', () => {
    const { container } = render(
      <DataTable
        caption="P1"
        columns={tokenColumns()}
        rows={numberedTokenRows(5)}
        getRowKey={(row) => row.id}
      />
    );
    expect(container.querySelectorAll('[aria-rowindex]').length).toBe(0);
    expect(container.querySelector('[aria-rowcount]')).toBeNull();
  });
});

describe('INV-146 (jsdom): named table and scope=col survive windowing', () => {
  it('keeps columnheaders associated after opt-in virtualization', () => {
    render(
      <DataTable
        caption="Tokenization requests"
        columns={tokenColumns()}
        rows={numberedTokenRows(40)}
        getRowKey={(row) => row.id}
        virtualized
      />
    );
    expect(screen.getByRole('table', { name: 'Tokenization requests' })).toBeTruthy();
    expect(screen.queryByRole('grid')).toBeNull();
    expect(screen.getAllByRole('columnheader').length).toBe(tokenColumns().length);
    expect(screen.getByRole('columnheader', { name: /Amount/ })).toBeTruthy();
  });
});

describe('INV-147 (jsdom): no roving tabindex or activedescendant', () => {
  it('leaves native tab order on mounted controls', () => {
    const columns = [
      {
        id: 'act',
        header: 'Act',
        cell: (row: TokenRow) => (
          <button type="button" data-row={row.id}>
            Open
          </button>
        ),
      },
    ];
    const { container } = render(
      <DataTable
        caption="Keys"
        columns={columns}
        rows={numberedTokenRows(40)}
        getRowKey={(row) => row.id}
        virtualized
        pagination={{
          kind: 'client',
          pageIndex: 0,
          pageSize: 40,
          onPageChange: vi.fn(),
        }}
      />
    );
    expect(container.querySelector('[aria-activedescendant]')).toBeNull();
    expect(container.querySelector('[data-slot="data-table-row"][tabindex]')).toBeNull();
    expect(container.querySelector('td[tabindex]')).toBeNull();
  });
});
