/**
 * SF-4 · Performance / scalability / stability — INV-134 … INV-141.
 */
import './sf4-jsdom-setup';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Component, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';

import { DataTable } from '../data-table';
import {
  captionTableProps,
  getTokenRowKey,
  numberedTokenRows,
  TOKEN_ROWS,
  tokenColumns,
  type TokenRow,
} from './sf2-fixtures';

const DATA_TABLE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const TABLE_SOURCE = readFileSync(join(DATA_TABLE_DIR, 'data-table.tsx'), 'utf8');
const SCROLLER_SOURCE = readFileSync(join(DATA_TABLE_DIR, 'data-table-scroller.tsx'), 'utf8');

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('INV-134: 10k bodyRows stay O(viewport + overscan)', () => {
  it('mounts tens of data rows, not 10k', { timeout: 30_000 }, () => {
    const rows = numberedTokenRows(10_000);
    const { container } = render(
      <DataTable
        caption="Scale"
        columns={tokenColumns()}
        rows={rows}
        getRowKey={getTokenRowKey}
        virtualized
      />
    );
    const mounted = container.querySelectorAll('[data-slot="data-table-row"]').length;
    expect(mounted, 'INV-134 / SC-002: windowed mount count').toBeLessThan(80);
    expect(mounted).toBeGreaterThan(0);
    expect(
      container.querySelectorAll('[data-slot="data-table-spacer"]').length
    ).toBeLessThanOrEqual(2);
  });
});

describe('INV-135: cell runs only for the mounted window', () => {
  it('spies far fewer than bodyRows × columns when virtualized', () => {
    const cell = vi.fn((row: TokenRow) => row.label);
    const columns = [
      { id: 'label', header: 'Label', cell },
      { id: 'amount', header: 'Amount', cell: (row: TokenRow) => String(row.amount) },
      { id: 'status', header: 'Status', cell: (row: TokenRow) => row.status },
    ];
    const rows = numberedTokenRows(10_000);
    render(
      <DataTable
        caption="Spy"
        columns={columns}
        rows={rows}
        getRowKey={getTokenRowKey}
        virtualized
      />
    );
    expect(cell.mock.calls.length, 'INV-135: no 10k cell pre-pass').toBeLessThan(3000);
    expect(cell.mock.calls.length).toBeGreaterThan(0);
  });

  it('calls cell 20×3 when unvirtualized and 0 when empty', () => {
    const cell = vi.fn((row: TokenRow) => row.label);
    const columns = tokenColumns({ cell });
    const rows = numberedTokenRows(20);
    render(<DataTable caption="Full" columns={columns} rows={rows} getRowKey={getTokenRowKey} />);
    expect(cell).toHaveBeenCalledTimes(20);
    cell.mockClear();
    render(
      <DataTable
        caption="Empty"
        columns={columns}
        rows={[]}
        getRowKey={getTokenRowKey}
        virtualized
      />
    );
    expect(cell).not.toHaveBeenCalled();
  });
});

describe('INV-137: SSR and lifecycle', () => {
  it('renderToString succeeds for a virtualized table', () => {
    const html = renderToString(
      <DataTable {...captionTableProps({ rows: numberedTokenRows(100), virtualized: true })} />
    );
    expect(html).toContain('data-slot="data-table-table"');
    expect(html).toContain('aria-rowcount="101"');
  });

  it('mount/unmount 100 virtualized tables without throwing', () => {
    const rows = numberedTokenRows(40);
    for (let i = 0; i < 100; i += 1) {
      const { unmount } = render(
        <DataTable
          caption="Cycle"
          columns={tokenColumns()}
          rows={rows}
          getRowKey={getTokenRowKey}
          virtualized
        />
      );
      unmount();
    }
  });

  it('does not read navigator during data-table.tsx render', () => {
    expect(stripComments(TABLE_SOURCE)).not.toMatch(/navigator/);
    expect(stripComments(TABLE_SOURCE)).not.toMatch(/useVirtualizer/);
  });
});

describe('INV-138: Firefox skips measureElement', () => {
  it('gates the option and row ref on a module-scope Firefox sniff and never measures spacers', () => {
    const source = stripComments(SCROLLER_SOURCE);
    expect(source).toMatch(/\/firefox\/i/);
    expect(source).toMatch(/measureElement:\s*IS_FIREFOX\s*\?\s*undefined/);
    expect(source).toMatch(/ref=\{IS_FIREFOX\s*\?\s*undefined\s*:\s*virtualizer\.measureElement\}/);
    const spacerBlock = source.slice(
      source.indexOf('function SpacerRow'),
      source.indexOf('interface VirtualizedBodyRowsProps')
    );
    expect(spacerBlock).not.toMatch(/measureElement/);
  });
});

describe('same-count row replacement invalidates TanStack key measurements', () => {
  it('changes getItemKey identity with bodyRows, getRowKey, and sentinel mode', () => {
    const source = stripComments(SCROLLER_SOURCE);
    expect(source).toMatch(
      /const getItemKey = useCallback\([\s\S]*?\[bodyRows,\s*getRowKey,\s*infiniteHasMore\]\s*\)/
    );
  });
});

describe('INV-141: windowing indexes bodyRows without cloning', () => {
  it('passes the same row object identity into cell', () => {
    const rows = numberedTokenRows(80);
    const seen: TokenRow[] = [];
    const columns = [
      {
        id: 'label',
        header: 'Label',
        cell: (row: TokenRow) => {
          seen.push(row);
          return row.label;
        },
      },
    ];
    render(
      <DataTable
        caption="Identity"
        columns={columns}
        rows={rows}
        getRowKey={getTokenRowKey}
        virtualized
      />
    );
    expect(seen.length).toBeGreaterThan(0);
    expect(rows).toContain(seen[0]);
    expect(seen[0]).toBe(rows.find((row) => row.id === seen[0]?.id));
  });

  it('does not clone bodyRows in the scroller source', () => {
    const source = stripComments(SCROLLER_SOURCE);
    expect(source).not.toMatch(/\[\.\.\.bodyRows/);
    expect(source).not.toMatch(/bodyRows\.filter/);
    expect(source).not.toMatch(/bodyRows\.slice/);
  });
});

describe('INV-143: integrator throws propagate', () => {
  class TestBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    public state = { failed: false };
    public static getDerivedStateFromError(): { failed: boolean } {
      return { failed: true };
    }
    public render(): ReactNode {
      return this.state.failed ? <div>fell</div> : this.props.children;
    }
  }

  it('does not swallow a cell throw', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const boom = {
      id: 'boom',
      header: 'Boom',
      cell: (row: TokenRow) => {
        if (row.id === TOKEN_ROWS[0]?.id) {
          throw new Error('cell-bug');
        }
        return row.label;
      },
    };
    const { container } = render(
      <TestBoundary>
        <DataTable
          caption="Broken"
          columns={[boom]}
          rows={TOKEN_ROWS}
          getRowKey={getTokenRowKey}
          virtualized
        />
      </TestBoundary>
    );
    expect(container.textContent).toContain('fell');
  });

  it('does not wrap cell or estimateSize in try', () => {
    expect(stripComments(SCROLLER_SOURCE)).not.toMatch(/try\s*\{/);
    expect(stripComments(TABLE_SOURCE)).not.toMatch(/try\s*\{/);
  });
});
