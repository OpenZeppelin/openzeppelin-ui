/**
 * SF-2 · Performance / scalability / stability — INV-48 … INV-53.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Component, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';

import { logger } from '@openzeppelin/ui-utils';

import { DataTable } from '../data-table';
import {
  captionTableProps,
  getTokenRowKey,
  TOKEN_ROWS,
  tokenColumns,
  type TokenRow,
} from './sf2-fixtures';

const SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'data-table.tsx'),
  'utf8'
);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('INV-40 / INV-44 / INV-50 / INV-51: source contract', () => {
  it('does not use state, memo, callbacks, or focus management', () => {
    expect(SOURCE, 'INV-82: useState allowed for uncontrolled sort').toMatch(/\buseState\b/);
    expect(SOURCE).not.toMatch(/\buseReducer\b/);
    expect(SOURCE).not.toMatch(/\buseContext\b/);
    expect(SOURCE).not.toMatch(/\buseId\b/);
    expect(SOURCE).not.toMatch(/\buseMemo\b/);
    expect(SOURCE).not.toMatch(/\buseCallback\b/);
    expect(SOURCE).not.toMatch(/\bmemo\(/);
    expect(SOURCE).not.toMatch(/\bforwardRef\b/);
    expect(SOURCE, 'INV-44: no .focus(').not.toMatch(/\.focus\(/);
    expect(SOURCE).not.toMatch(/\bautoFocus\b/);
    expect(SOURCE).not.toMatch(/\bonKeyDown\b/);
    expect(SOURCE, 'INV-75: onClick is allowed on the sort button').toMatch(/\bonClick\b/);
    expect(SOURCE, 'INV-41: no index keys').not.toMatch(/key=\{index\}/);
    expect(SOURCE).not.toMatch(/key=\{i\}/);
    expect(SOURCE, 'INV-51: no try around cell').not.toMatch(/try\s*\{/);
  });
});

describe('INV-48: cell once per mounted intersection; getRowKey once per row', () => {
  it('calls spies 0 times when rows are empty', () => {
    const cell = vi.fn((row: TokenRow) => row.label);
    const getRowKey = vi.fn((row: TokenRow) => row.id);
    const columns = tokenColumns({ cell });
    render(<DataTable caption="T" columns={columns} rows={[]} getRowKey={getRowKey} />);
    expect(cell, 'INV-48: empty rows skip cell').not.toHaveBeenCalled();
    expect(getRowKey, 'INV-48: empty rows skip getRowKey').not.toHaveBeenCalled();
  });

  it('calls cell rows×columns times and getRowKey once per row', () => {
    const cellFns = tokenColumns().map((column) => ({
      ...column,
      cell: vi.fn((row: TokenRow) => String(column.cell(row))),
    }));
    const getRowKey = vi.fn((row: TokenRow) => row.id);
    render(<DataTable caption="T" columns={cellFns} rows={TOKEN_ROWS} getRowKey={getRowKey} />);
    for (const column of cellFns) {
      expect(column.cell).toHaveBeenCalledTimes(TOKEN_ROWS.length);
      for (const row of TOKEN_ROWS) {
        expect(column.cell).toHaveBeenCalledWith(row);
      }
    }
    expect(getRowKey).toHaveBeenCalledTimes(TOKEN_ROWS.length);
  });
});

describe('INV-49: linear render; rows passed through by reference', () => {
  it('does not scan or copy rows in the render source', () => {
    expect(SOURCE).not.toMatch(/\bfindIndex\b/);
    expect(SOURCE).not.toMatch(/\bindexOf\b/);
    expect(SOURCE).not.toMatch(/\[\.\.\.rows/);
    expect(SOURCE).not.toMatch(/rows\.slice/);
    expect(SOURCE).not.toMatch(/rows\.sort/);
    expect(SOURCE).not.toMatch(/rows\.filter/);
  });

  it('renders 10k × 10 cells inside the scale timeout', { timeout: 60_000 }, () => {
    const rows = Array.from({ length: 10_000 }, (_, i) => ({ id: String(i) }));
    const columns = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`,
      header: `C${i}`,
      cell: (row: { id: string }) => row.id,
    }));
    const { container } = render(
      <DataTable caption="Scale" columns={columns} rows={rows} getRowKey={(row) => row.id} />
    );
    expect(
      container.querySelectorAll('[data-slot="data-table-cell"]').length,
      'INV-49: unvirtualized SF-2 mounts every intersection'
    ).toBe(100_000);
  });
});

describe('INV-50: SSR-safe; no document during render', () => {
  it('renderToString succeeds for all three name branches without reading document', () => {
    const getElementById = vi.spyOn(document, 'getElementById');
    const caption = renderToString(
      <DataTable {...captionTableProps({ rows: TOKEN_ROWS.slice(0, 1) })} />
    );
    const labelled = renderToString(
      <DataTable
        aria-label="Holders"
        columns={tokenColumns()}
        rows={TOKEN_ROWS.slice(0, 1)}
        getRowKey={getTokenRowKey}
      />
    );
    const labelledBy = renderToString(
      <DataTable
        aria-labelledby="holders-heading"
        columns={tokenColumns()}
        rows={[]}
        getRowKey={getTokenRowKey}
      />
    );
    expect(caption).toContain('data-slot="data-table-table"');
    expect(labelled).toContain('aria-label="Holders"');
    expect(labelledBy).toContain('aria-labelledby="holders-heading"');
    expect(getElementById, 'INV-50: document is not read during render').not.toHaveBeenCalled();
  });

  it('mount/unmount 100 times without kit addEventListener calls', () => {
    const add = vi.spyOn(window, 'addEventListener');
    for (let i = 0; i < 100; i += 1) {
      const { unmount } = render(<DataTable {...captionTableProps()} />);
      unmount();
    }
    const kitCalls = add.mock.calls.filter((call) => String(call[0]).includes('DataTable'));
    expect(kitCalls.length).toBe(0);
  });
});

describe('INV-51: throwing cell surfaces to the integrator boundary', () => {
  class TestBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    public state = { failed: false };
    public static getDerivedStateFromError(): { failed: boolean } {
      return { failed: true };
    }
    public render(): ReactNode {
      return this.state.failed ? <div>fell</div> : this.props.children;
    }
  }

  it('does not swallow a cell throw and leaves a sibling table intact', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const boom = {
      id: 'boom',
      header: 'Boom',
      cell: (row: TokenRow) => {
        if (row.id === 'b') {
          throw new Error('cell-bug');
        }
        return row.label;
      },
    };
    const { container } = render(
      <>
        <TestBoundary>
          <DataTable
            caption="Broken"
            columns={[boom]}
            rows={TOKEN_ROWS}
            getRowKey={getTokenRowKey}
          />
        </TestBoundary>
        <DataTable {...captionTableProps({ rows: TOKEN_ROWS.slice(0, 1) })} />
      </>
    );
    expect(container.textContent).toContain('fell');
    expect(container.querySelector('[data-slot="data-table-caption"]')?.textContent).not.toBe(
      'Broken'
    );
    expect(container.textContent).toContain('Tokenization requests');
  });
});

describe('INV-53: diagnostics are deduped per mount', () => {
  it('logs a blank caption once across five rerenders', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <DataTable
        caption="  "
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
      />
    );
    for (let i = 0; i < 5; i += 1) {
      rerender(
        <DataTable
          caption="  "
          columns={tokenColumns()}
          rows={TOKEN_ROWS}
          getRowKey={getTokenRowKey}
        />
      );
    }
    const { waitFor } = await import('@testing-library/react');
    await waitFor(() => {
      expect(errorSpy.mock.calls.filter((call) => call[0] === 'DataTable')).toHaveLength(1);
    });
  });
});
