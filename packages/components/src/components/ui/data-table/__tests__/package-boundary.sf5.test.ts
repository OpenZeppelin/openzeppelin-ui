/**
 * @vitest-environment node
 *
 * SF-5 · Package / source boundary — INV-110.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { PACKAGE_ROOT, readDistArtifact } from '../../../../__tests__/distArtifact';
import * as UiBarrel from '../../index';
import * as DataTableFolder from '../index';
import type {
  DataTableClientPagination,
  DataTablePagination,
  DataTablePaginationStatusInfo,
  DataTableServerPagination,
} from '../types';

const DATA_TABLE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('INV-110: helpers and pager stay off the public barrel', () => {
  it('keeps folder and UI barrel runtime values at DataTable only', () => {
    expect(Object.keys(DataTableFolder)).toEqual([
      'DataTable',
      'DATA_TABLE_DEFAULT_ESTIMATE_SIZE',
      'DATA_TABLE_DEFAULT_OVERSCAN',
      'DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT',
      'DATA_TABLE_SELECT_COLUMN_ID',
    ]);
    expect('sliceClientPage' in DataTableFolder).toBe(false);
    expect('resolvePageSize' in DataTableFolder).toBe(false);
    expect('resolvePageCount' in DataTableFolder).toBe(false);
    expect('paginationStatusInfo' in DataTableFolder).toBe(false);
    expect('defaultPaginationStatus' in DataTableFolder).toBe(false);
    expect('DataTablePaginationControls' in DataTableFolder).toBe(false);
    expect('DataTable' in UiBarrel).toBe(true);
    expect('sliceClientPage' in UiBarrel).toBe(false);
    expect('DataTablePagination' in UiBarrel).toBe(false);
    expect('defaultPaginationStatus' in UiBarrel).toBe(false);
  });

  it('type-only exports the four pagination names', () => {
    expectTypeOf<DataTablePaginationStatusInfo>().toMatchTypeOf<{
      readonly pageIndex: number;
      readonly pageSize: number;
      readonly totalCount: number | null;
      readonly pageCount: number | null;
      readonly from: number;
      readonly to: number;
      readonly rowCountOnPage: number;
      readonly totalKnown: boolean;
    }>();
    expectTypeOf<DataTablePagination>().toEqualTypeOf<
      DataTableClientPagination | DataTableServerPagination
    >();
  });

  it('imports kit Button only from pagination-controls.tsx', () => {
    const pager = stripComments(
      readFileSync(join(DATA_TABLE_DIR, 'pagination-controls.tsx'), 'utf8')
    );
    const table = stripComments(readFileSync(join(DATA_TABLE_DIR, 'data-table.tsx'), 'utf8'));
    expect(pager).toMatch(/from\s+['"]\.\.\/button['"]/);
    expect(table).not.toMatch(/from\s+['"]\.\.\/button['"]/);
    expect(table).toMatch(/from\s+['"]\.\/pagination-controls['"]/);
    expect(pager).not.toMatch(/@tanstack\//);
    expect(pager).not.toMatch(/useDataTablePagination/);
  });

  it('does not add a production dependency or a pagination hook export', () => {
    const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>;
      exports: Record<string, unknown>;
    };
    expect(pkg.dependencies['@tanstack/react-table']).toBeUndefined();
    expect(pkg.exports['./data-table']).toBeUndefined();
    const folderIndex = readFileSync(join(DATA_TABLE_DIR, 'index.ts'), 'utf8');
    expect(folderIndex).not.toMatch(/from\s+['"]\.\/pagination-controls['"]/);
    expect(folderIndex).not.toMatch(/sliceClientPage/);
    expect(folderIndex).not.toMatch(/defaultPaginationStatus/);
  });

  it('publishes the pagination types on the built main declarations', () => {
    const mainTypes = readDistArtifact('index.d.mts');
    expect(mainTypes).toMatch(/\bDataTablePagination\b/);
    expect(mainTypes).toMatch(/\bDataTableClientPagination\b/);
    expect(mainTypes).toMatch(/\bDataTableServerPagination\b/);
    expect(mainTypes).toMatch(/\bDataTablePaginationStatusInfo\b/);
    expect(mainTypes).not.toMatch(/export\s+.*\bsliceClientPage\b/);
    expect(mainTypes).not.toMatch(/export\s+.*\bdefaultPaginationStatus\b/);
  });
});
