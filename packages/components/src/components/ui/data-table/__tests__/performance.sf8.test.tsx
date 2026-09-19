/**
 * SF-8 · Performance / scalability / stability — INV-184, INV-197 … INV-201.
 */
import './sf4-jsdom-setup';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataTable } from '../data-table';
import { numberedTokenRows, tokenColumns } from './sf2-fixtures';

const DATA_TABLE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const TABLE_SOURCE = readFileSync(join(DATA_TABLE_DIR, 'data-table.tsx'), 'utf8');
const SCROLLER_SOURCE = readFileSync(join(DATA_TABLE_DIR, 'data-table-scroller.tsx'), 'utf8');

describe('INV-197: virtualized select-all applies to all bodyRows, not mounted controls', () => {
  it(
    'reports all 10k unique identities while fewer than 80 rows are mounted',
    { timeout: 30_000 },
    () => {
      const onSelectionChange = vi.fn();
      const { container, getByRole } = render(
        <DataTable
          caption="Selectable scale table"
          columns={tokenColumns()}
          rows={numberedTokenRows(10_000)}
          getRowKey={(row) => row.id}
          virtualized
          selection={{ selectedKeys: new Set(), onSelectionChange }}
        />
      );
      const mountedRows = container.querySelectorAll('[data-slot="data-table-row"]').length;
      expect(mountedRows).toBeGreaterThan(0);
      expect(mountedRows, 'INV-197: selection must not defeat virtualization').toBeLessThan(80);

      fireEvent.click(getByRole('checkbox', { name: 'Select all' }));
      const next = onSelectionChange.mock.calls[0]?.[0] as ReadonlySet<string> | undefined;
      expect(next?.size, 'INV-197: header must include unmounted bodyRows').toBe(10_000);
      expect(next?.has('r9999')).toBe(true);
    }
  );
});

describe('INV-199: checkbox DOM cost remains proportional to mounted rows', () => {
  it('mounts exactly one row checkbox per visible data row plus one header checkbox', () => {
    const { container } = render(
      <DataTable
        caption="Selectable scale table"
        columns={tokenColumns()}
        rows={numberedTokenRows(10_000)}
        getRowKey={(row) => row.id}
        virtualized
        selection={{ selectedKeys: new Set(['r9999']), onSelectionChange: vi.fn() }}
      />
    );
    const mountedRows = container.querySelectorAll('[data-slot="data-table-row"]').length;
    expect(container.querySelectorAll('[data-slot="checkbox"]')).toHaveLength(mountedRows + 1);
    expect(container.querySelectorAll('[data-column-id="__data-table-select"]')).toHaveLength(
      mountedRows + 1
    );
  });
});

describe('INV-184 / INV-198 / INV-201: implementation remains identity-based and cache-free', () => {
  it('resolves the row object before using getRowKey in both paint paths', () => {
    expect(SCROLLER_SOURCE).toMatch(
      /const row = bodyRows\[item\.index\][\s\S]*const rowKey = getRowKey\(row\)[\s\S]*selectedKeys\?\.has\(rowKey\)/
    );
    expect(SCROLLER_SOURCE).toMatch(
      /bodyRows\.map\(\(row, index\)[\s\S]*const rowKey = getRowKey\(row\)[\s\S]*selectedKeys\?\.has\(rowKey\)/
    );
    expect(SCROLLER_SOURCE).not.toMatch(/selectedKeys\??\.has\(String\((?:item\.)?index\)\)/);
  });

  it('does not snapshot rows or derive selection by querying mounted DOM', () => {
    const selectionSources = `${TABLE_SOURCE}\n${SCROLLER_SOURCE}`;
    expect(selectionSources).not.toMatch(/structuredClone\s*\(/);
    expect(selectionSources).not.toMatch(/querySelectorAll\([^)]*checkbox/);
    expect(selectionSources).not.toMatch(/\[\.\.\.bodyRows\]/);
  });
});
