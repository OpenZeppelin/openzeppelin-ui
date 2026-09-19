/**
 * SF-12 · Performance / module graph — INV-316, INV-317, INV-318, INV-326.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataTable } from '../data-table';
import { captionTableProps, numberedTokenRows } from './sf2-fixtures';

const DATA_TABLE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const TABLE_SOURCE = readFileSync(join(DATA_TABLE_DIR, 'data-table.tsx'), 'utf8');
const SCROLLER_SOURCE = readFileSync(join(DATA_TABLE_DIR, 'data-table-scroller.tsx'), 'utf8');
const HELPERS_SOURCE = readFileSync(join(DATA_TABLE_DIR, 'helpers.ts'), 'utf8');

describe('INV-316: load XOR is type-only; pager-wins predicates stay bitwise identical', () => {
  it('pins infiniteIgnored / infiniteActive to != null / == null', () => {
    expect(TABLE_SOURCE).toMatch(
      /const infiniteIgnored = pagination != null && infiniteScroll != null/
    );
    expect(TABLE_SOURCE).toMatch(
      /const infiniteActive = infiniteScroll != null && pagination == null/
    );
    expect(TABLE_SOURCE).not.toMatch(/kind:\s*'page'\s*\|\s*'infinite'/);
  });
});

describe('INV-317: English builder is a pure helper off the body hot path', () => {
  it('does not reference defaultSortButtonName from the scroller or body map', () => {
    expect(HELPERS_SOURCE).toMatch(/export function defaultSortButtonName/);
    expect(SCROLLER_SOURCE).not.toMatch(/defaultSortButtonName/);
    expect(SCROLLER_SOURCE).not.toMatch(/formatSortButtonName/);
  });
});

describe('INV-318: omitting the formatter keeps Role Manager English names', () => {
  it('paints Sort by Amount on a page-only table without a formatter', () => {
    const { container } = render(
      <DataTable
        {...captionTableProps({
          rows: numberedTokenRows(12),
          pagination: {
            kind: 'client',
            pageIndex: 0,
            pageSize: 10,
            onPageChange: vi.fn(),
          },
        })}
      />
    );
    expect(
      container.querySelector('[data-column-id="amount"] button')?.getAttribute('aria-label')
    ).toBe('Sort by Amount');
  });
});

describe('INV-326: no new production modules or i18n package', () => {
  it('keeps implementation in the existing production files', () => {
    const production = readdirSync(DATA_TABLE_DIR).filter(
      (name) => !name.startsWith('__') && !name.startsWith('.')
    );
    expect(production.sort()).toEqual(
      [
        'chrome.ts',
        'data-table-scroller.tsx',
        'data-table.tsx',
        'helpers.ts',
        'index.ts',
        'pagination-controls.tsx',
        'selection.ts',
        'sort.ts',
        'types.ts',
        'virtualization.ts',
      ].sort()
    );
    expect(TABLE_SOURCE).not.toMatch(/from\s+['"]i18next['"]/);
    expect(TABLE_SOURCE).not.toMatch(/from\s+['"]react-i18next['"]/);
  });
});
