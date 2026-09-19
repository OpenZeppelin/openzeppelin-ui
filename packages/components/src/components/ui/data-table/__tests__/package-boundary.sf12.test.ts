/**
 * @vitest-environment node
 *
 * SF-12 · Package / source boundary — INV-311, INV-52*, INV-326.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { PACKAGE_ROOT, readDistArtifact } from '../../../../__tests__/distArtifact';
import * as UiBarrel from '../../index';
import * as DataTableFolder from '../index';
import type { DataTableLoadStrategy, DataTableSortButtonNameInfo } from '../types';

const DATA_TABLE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('INV-311 / INV-52*: barrel exports the two new types only', () => {
  it('does not runtime-export defaultSortButtonName or DataTablePropsBase', () => {
    expect('defaultSortButtonName' in DataTableFolder).toBe(false);
    expect('DataTablePropsBase' in DataTableFolder).toBe(false);
    expect('defaultSortButtonName' in UiBarrel).toBe(false);
    expect(Object.keys(DataTableFolder)).toEqual([
      'DataTable',
      'DATA_TABLE_DEFAULT_ESTIMATE_SIZE',
      'DATA_TABLE_DEFAULT_OVERSCAN',
      'DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT',
      'DATA_TABLE_SELECT_COLUMN_ID',
    ]);
  });

  it('type-only exports DataTableLoadStrategy and DataTableSortButtonNameInfo', () => {
    expectTypeOf<DataTableSortButtonNameInfo>().toMatchTypeOf<{
      readonly columnName: string;
      readonly direction: 'asc' | 'desc' | 'none';
    }>();
    const pageArm = {
      pagination: {
        kind: 'client' as const,
        pageIndex: 0,
        pageSize: 10,
        onPageChange: () => undefined,
      },
    } satisfies DataTableLoadStrategy;
    expect(pageArm.pagination.kind).toBe('client');
  });

  it('publishes the two types on built declarations and omits the English builder', () => {
    const mainTypes = readDistArtifact('index.d.mts');
    expect(mainTypes).toMatch(/\bDataTableLoadStrategy\b/);
    expect(mainTypes).toMatch(/\bDataTableSortButtonNameInfo\b/);
    expect(mainTypes).not.toMatch(/export\s+.*\bdefaultSortButtonName\b/);
    const folderIndex = readFileSync(join(DATA_TABLE_DIR, 'index.ts'), 'utf8');
    expect(folderIndex).toMatch(/DataTableLoadStrategy/);
    expect(folderIndex).toMatch(/DataTableSortButtonNameInfo/);
    expect(folderIndex).not.toMatch(/defaultSortButtonName/);
    expect(folderIndex).not.toMatch(/DataTablePropsBase/);
  });
});

describe('INV-326: no i18n dependency and no data-table subpath', () => {
  it('adds no message-catalog package and keeps the main export only', () => {
    const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>;
      exports: Record<string, unknown>;
    };
    expect(pkg.dependencies.i18next).toBeUndefined();
    expect(pkg.dependencies['react-i18next']).toBeUndefined();
    expect(pkg.exports['./data-table']).toBeUndefined();
  });
});
