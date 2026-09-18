/**
 * @vitest-environment node
 *
 * SF-3 · Package / source boundary — INV-81.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { PACKAGE_ROOT, readDistArtifact } from '../../../../__tests__/distArtifact';
import * as UiBarrel from '../../index';
import * as DataTableFolder from '../index';
import type { DataTableSortDirection, DataTableSortState } from '../types';

const DATA_TABLE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('INV-81: sort.ts is a test seam; public types are type-only', () => {
  it('keeps folder and UI barrel runtime values at DataTable only', () => {
    expect(Object.keys(DataTableFolder)).toEqual([
      'DataTable',
      'DATA_TABLE_DEFAULT_ESTIMATE_SIZE',
      'DATA_TABLE_DEFAULT_OVERSCAN',
      'DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT',
      'DATA_TABLE_SELECT_COLUMN_ID',
    ]);
    expect('nextSortState' in DataTableFolder).toBe(false);
    expect('applyClientSort' in DataTableFolder).toBe(false);
    expect('resolveEffectiveSort' in DataTableFolder).toBe(false);
    expect('DataTable' in UiBarrel).toBe(true);
    expect('nextSortState' in UiBarrel).toBe(false);
    expect('DataTableSortDirection' in UiBarrel).toBe(false);
    expect('DataTableSortState' in UiBarrel).toBe(false);
  });

  it('type-only exports the two new sort types', () => {
    expectTypeOf<DataTableSortDirection>().toEqualTypeOf<'asc' | 'desc'>();
    expectTypeOf<DataTableSortState>().toMatchTypeOf<{
      readonly columnId: string;
      readonly direction: DataTableSortDirection;
    }>();
  });

  it('does not import kit Button or TanStack from data-table.tsx', () => {
    const source = stripComments(readFileSync(join(DATA_TABLE_DIR, 'data-table.tsx'), 'utf8'));
    expect(source).toMatch(/from\s+['"]lucide-react['"]/);
    expect(source).toMatch(/from\s+['"]\.\/sort['"]/);
    expect(source).not.toMatch(/from\s+['"]\.\.\/button['"]/);
    expect(source).not.toMatch(/@tanstack\//);
    expect(source).not.toMatch(/@pierre\/trees/);
  });

  it('does not add a production dependency for sort', () => {
    const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies['lucide-react']).toBeDefined();
    expect(pkg.dependencies['@tanstack/react-table']).toBeUndefined();
  });

  it('publishes the sort types on the built main declarations', () => {
    const mainTypes = readDistArtifact('index.d.mts');
    expect(mainTypes).toMatch(/\bDataTableSortDirection\b/);
    expect(mainTypes).toMatch(/\bDataTableSortState\b/);
  });
});
