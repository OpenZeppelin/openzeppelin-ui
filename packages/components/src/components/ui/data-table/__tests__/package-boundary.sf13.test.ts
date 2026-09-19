/**
 * @vitest-environment node
 *
 * SF-13 · Package / source boundary — INV-339, INV-52*, INV-362.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { readDistArtifact } from '../../../../__tests__/distArtifact';
import * as UiBarrel from '../../index';
import * as DataTableFolder from '../index';
import type { DataTablePaginationPlacement, DataTableProps } from '../types';
import type { TokenRow } from './sf2-fixtures';

const DATA_TABLE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('INV-339 / INV-52*: barrel may type-export placement; chromeMode stays private', () => {
  it('does not runtime-export frame, chromeMode, or pager internals', () => {
    for (const barrel of [DataTableFolder, UiBarrel]) {
      expect('DataTableFrame' in barrel).toBe(false);
      expect('chromeMode' in barrel).toBe(false);
      expect('DATA_TABLE_FRAME_CHROME' in barrel).toBe(false);
      expect('DATA_TABLE_PAGINATION_INSIDE_CHROME' in barrel).toBe(false);
      expect('DataTablePaginationControls' in barrel).toBe(false);
    }
    expect(Object.keys(DataTableFolder)).toEqual([
      'DataTable',
      'DATA_TABLE_DEFAULT_ESTIMATE_SIZE',
      'DATA_TABLE_DEFAULT_OVERSCAN',
      'DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT',
      'DATA_TABLE_SELECT_COLUMN_ID',
    ]);
  });

  it('publishes DataTablePaginationPlacement on declarations', () => {
    expectTypeOf<DataTablePaginationPlacement>().toEqualTypeOf<'outside' | 'inside'>();
    expectTypeOf<
      Extract<keyof DataTableProps<TokenRow>, 'chromeMode' | 'rowVariant'>
    >().toEqualTypeOf<never>();
    const mainTypes = readDistArtifact('index.d.mts');
    expect(mainTypes).toMatch(/\bDataTablePaginationPlacement\b/);
    expect(mainTypes).not.toMatch(/export\s+.*\bchromeMode\b/);
    expect(mainTypes).not.toMatch(/export\s+.*\bDataTableFrame\b/);
    const folderIndex = readFileSync(join(DATA_TABLE_DIR, 'index.ts'), 'utf8');
    expect(folderIndex).toMatch(/DataTablePaginationPlacement/);
    expect(folderIndex).not.toMatch(/from\s+['"]\.\/chrome['"]/);
    expect(folderIndex).not.toMatch(/from\s+['"]\.\/pagination-controls['"]/);
  });
});

describe('INV-362: no Role Manager or filter-bar package', () => {
  it('keeps data-table sources free of app filter imports', () => {
    const sources = [
      'data-table.tsx',
      'data-table-scroller.tsx',
      'pagination-controls.tsx',
      'index.ts',
    ]
      .map((fileName) => readFileSync(join(DATA_TABLE_DIR, fileName), 'utf8'))
      .join('\n');
    expect(sources).not.toMatch(/AccountsFilterBar|ChangesFilterBar|role-manager/i);
  });
});
