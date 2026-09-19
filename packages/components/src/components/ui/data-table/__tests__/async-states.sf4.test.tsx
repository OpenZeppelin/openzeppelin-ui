/**
 * SF-4 · Async / loading / error / empty — INV-142, INV-143, SC-006.
 */
import './sf4-jsdom-setup';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { DataTable } from '../data-table';
import type { DataTableProps } from '../types';
import {
  captionTableProps,
  getTokenRowKey,
  numberedTokenRows,
  tokenColumns,
  type TokenRow,
} from './sf2-fixtures';

const DATA_TABLE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('INV-142: virtualization never fetches or invents data rows', () => {
  it('does not call fetch when scrolling a virtualized table', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { container } = render(
      <DataTable {...captionTableProps({ rows: numberedTokenRows(80), virtualized: true })} />
    );
    const wrap = container.querySelector('[data-slot="data-table"]') as HTMLElement;
    wrap.scrollTop = 200;
    wrap.dispatchEvent(new Event('scroll'));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('keeps spacers free of data-row-key and omits fetch/query imports', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(80),
          virtualized: { maxHeight: 120, overscan: 1, estimateSize: 36 },
        })}
      />
    );
    for (const spacer of container.querySelectorAll('[data-slot="data-table-spacer"]')) {
      expect(spacer.hasAttribute('data-row-key')).toBe(false);
      expect(spacer.querySelector('[data-slot="data-table-cell"]')).toBeNull();
    }
    for (const file of [
      'data-table.tsx',
      'data-table-scroller.tsx',
      'virtualization.ts',
    ] as const) {
      const source = stripComments(readFileSync(join(DATA_TABLE_DIR, file), 'utf8'));
      expect(source).not.toMatch(/\bfetch\s*\(/);
      expect(source).not.toMatch(/axios/);
      expect(source).not.toMatch(/@tanstack\/react-query/);
      expect(source).not.toMatch(/\bSkeleton\b/);
    }
  });

  it('does not add a loading body prop', () => {
    type Forbidden = Extract<keyof DataTableProps<TokenRow>, 'isLoading' | 'loading'>;
    expectTypeOf<Forbidden>().toEqualTypeOf<never>();
  });
});

describe('INV-143: kit resolve/handle errors do not throw', () => {
  it('renders with invalid maxHeight without throwing', () => {
    expect(() =>
      render(
        <DataTable
          caption="T"
          columns={tokenColumns()}
          rows={numberedTokenRows(20)}
          getRowKey={getTokenRowKey}
          virtualized={{ maxHeight: Number.NaN }}
        />
      )
    ).not.toThrow();
  });
});
