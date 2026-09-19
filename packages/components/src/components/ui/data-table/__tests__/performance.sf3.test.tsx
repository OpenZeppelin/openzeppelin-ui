/**
 * SF-3 · Performance / scalability / stability — INV-76, INV-80, INV-81, INV-82.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Component, type ReactNode } from 'react';

import { DataTable } from '../data-table';
import { getTokenRowKey, TOKEN_ROWS, tokenColumns, type TokenRow } from './sf2-fixtures';

const DATA_TABLE_TSX = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'data-table.tsx'),
  'utf8'
);
const SORT_TS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'sort.ts'),
  'utf8'
);

describe('INV-76: getSortValue only while deriving client-sorted displayRows', () => {
  it('does not call the getter on construct or on the identity path', () => {
    const getSortValue = vi.fn((row: TokenRow) => row.amount);
    const columns = tokenColumns().map((column) =>
      column.id === 'amount' ? { ...column, sortable: false as const, getSortValue } : column
    );
    expect(getSortValue).not.toHaveBeenCalled();
    render(
      <DataTable caption="T" columns={columns} rows={TOKEN_ROWS} getRowKey={getTokenRowKey} />
    );
    expect(getSortValue, 'INV-76: identity / unsortable path is 0 calls').not.toHaveBeenCalled();
  });

  it('calls the getter once per row when the client-sort gate passes', () => {
    const getSortValue = vi.fn((row: TokenRow) => row.amount);
    const columns = tokenColumns().map((column) =>
      column.id === 'amount' ? { ...column, getSortValue } : column
    );
    render(
      <DataTable
        caption="T"
        columns={columns}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        defaultSort={{ columnId: 'amount', direction: 'asc' }}
      />
    );
    expect(getSortValue).toHaveBeenCalledTimes(TOKEN_ROWS.length);
  });
});

describe('INV-80: throwing getSortValue reaches the error boundary', () => {
  class TestBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    public state = { failed: false };
    public static getDerivedStateFromError(): { failed: boolean } {
      return { failed: true };
    }
    public render(): ReactNode {
      return this.state.failed ? <div>fell</div> : this.props.children;
    }
  }

  it('does not catch a getter throw; sibling table stays mounted', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const columns = tokenColumns().map((column) =>
      column.id === 'amount'
        ? {
            ...column,
            getSortValue: (row: TokenRow) => {
              if (row.id === 'b') {
                throw new Error('getter-bug');
              }
              return row.amount;
            },
          }
        : column
    );
    const { container } = render(
      <>
        <TestBoundary>
          <DataTable
            caption="Broken"
            columns={columns}
            rows={TOKEN_ROWS}
            getRowKey={getTokenRowKey}
            defaultSort={{ columnId: 'amount', direction: 'asc' }}
          />
        </TestBoundary>
        <DataTable
          caption="Sibling"
          columns={tokenColumns()}
          rows={TOKEN_ROWS.slice(0, 1)}
          getRowKey={getTokenRowKey}
        />
      </>
    );
    expect(container.textContent).toContain('fell');
    expect(container.textContent).toContain('Sibling');
  });
});

describe('INV-82: hook allow-list', () => {
  it('allows useState and still forbids memo / callback / forwardRef', () => {
    expect(DATA_TABLE_TSX).toMatch(/\buseState\b/);
    expect(DATA_TABLE_TSX).not.toMatch(/\buseMemo\b/);
    expect(DATA_TABLE_TSX).not.toMatch(/\buseCallback\b/);
    expect(DATA_TABLE_TSX).not.toMatch(/\bmemo\(/);
    expect(DATA_TABLE_TSX).not.toMatch(/\bforwardRef\b/);
    expect(DATA_TABLE_TSX, 'INV-80: no try on the sort path').not.toMatch(/try\s*\{/);
    expect(SORT_TS).not.toMatch(/try\s*\{/);
  });
});
