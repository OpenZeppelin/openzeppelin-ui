/**
 * SF-11 · Performance / scalability / stability — INV-251 … INV-253.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

import { DataTable } from '../data-table';
import { captionTableProps, numberedTokenRows } from './sf2-fixtures';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGER_SOURCE = readFileSync(join(DIR, 'pagination-controls.tsx'), 'utf8');

describe('INV-251: page-list cost is bounded', () => {
  it('mounts 10 data rows and ≤ 5 page buttons for 10k client rows at pageSize 10', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(10_000),
          pagination: { kind: 'client', pageIndex: 50, pageSize: 10, onPageChange: vi.fn() },
        })}
      />
    );
    expect(container.querySelectorAll('[data-slot="data-table-row"]').length).toBe(10);
    expect(
      container.querySelectorAll('[data-slot="data-table-pagination-page"]').length,
      'INV-251: must not mount one button per pageCount'
    ).toBeLessThanOrEqual(5);
  });
});

describe('INV-253: SSR / hydration; status is not a sequential tab stop', () => {
  it('does not read document during pagination-controls render', () => {
    const jsx = PAGER_SOURCE.slice(PAGER_SOURCE.lastIndexOf('return ('));
    expect(jsx, 'INV-253: document stays out of the JSX path').not.toMatch(/document\./);
  });

  it('renderToString succeeds for known-total and unknown-total paginated tables', () => {
    const known = renderToString(
      <DataTable
        {...captionTableProps({
          pagination: { kind: 'client', pageIndex: 0, pageSize: 10, onPageChange: () => undefined },
        })}
      />
    );
    const unknown = renderToString(
      <DataTable
        {...captionTableProps({
          pagination: {
            kind: 'server',
            pageIndex: 2,
            pageSize: 10,
            onPageChange: () => undefined,
          },
        })}
      />
    );
    expect(known).toContain('data-slot="data-table-pagination-page"');
    expect(unknown).not.toContain('data-slot="data-table-pagination-page"');
    expect(unknown).toContain('Page 3');
  });

  it('survives 100 mount/unmount cycles on both totalKnown branches', () => {
    for (let index = 0; index < 100; index += 1) {
      const known = render(
        <DataTable
          {...captionTableProps({
            rows: numberedTokenRows(200),
            pagination: { kind: 'client', pageIndex: 10, pageSize: 10, onPageChange: vi.fn() },
          })}
        />
      );
      known.unmount();
      const unknown = render(
        <DataTable
          {...captionTableProps({
            pagination: { kind: 'server', pageIndex: 0, pageSize: 10, onPageChange: vi.fn() },
          })}
        />
      );
      unknown.unmount();
    }
    expect(true).toBe(true);
  });
});
