/**
 * @vitest-environment node
 *
 * SF-8 · Package boundary — INV-182, INV-185, INV-190, INV-202.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { readDistArtifact } from '../../../../__tests__/distArtifact';
import * as UiBarrel from '../../index';
import * as DataTableFolder from '../index';
import {
  DATA_TABLE_SELECT_COLUMN_ID,
  type DataTableProps,
  type DataTableSelection,
} from '../types';

const DATA_TABLE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('INV-182 / INV-190: public selection surface is curated', () => {
  it('exports the reserved constant from both barrels with its stable value', () => {
    expect(DATA_TABLE_SELECT_COLUMN_ID).toBe('__data-table-select');
    expect(DataTableFolder.DATA_TABLE_SELECT_COLUMN_ID).toBe(DATA_TABLE_SELECT_COLUMN_ID);
    expect(UiBarrel.DATA_TABLE_SELECT_COLUMN_ID).toBe(DATA_TABLE_SELECT_COLUMN_ID);
  });

  it('keeps DOM-free selection helpers and tri-state runtime off both barrels', () => {
    for (const barrel of [DataTableFolder, UiBarrel]) {
      expect('applicableRowKeys' in barrel).toBe(false);
      expect('headerSelectionState' in barrel).toBe(false);
      expect('nextSetWithRowKey' in barrel).toBe(false);
      expect('nextSetFromHeaderAction' in barrel).toBe(false);
      expect('DataTableHeaderSelectionState' in barrel).toBe(false);
    }
  });

  it('publishes DataTableSelection as a type-only declaration', () => {
    expectTypeOf<DataTableSelection<{ id: string }>>().toMatchTypeOf<{
      readonly selectedKeys: ReadonlySet<string>;
      readonly onSelectionChange: (next: ReadonlySet<string>) => void;
      readonly selectAllLabel?: string;
      readonly getCheckboxLabel?: (row: { id: string }) => string;
      readonly columnHeaderLabel?: string;
    }>();
    expectTypeOf<
      Extract<keyof DataTableProps<{ id: string }>, 'selection'>
    >().toEqualTypeOf<'selection'>();
    const declarations = readDistArtifact('index.d.mts');
    expect(declarations).toMatch(/\bDataTableSelection\b/);
    expect(declarations).toMatch(/\bDATA_TABLE_SELECT_COLUMN_ID\b/);
    expect(declarations).not.toMatch(/export\s+.*\bheaderSelectionState\b/);
  });
});

describe('INV-202: selection adds no fetch or table-state dependency', () => {
  it('keeps selection sources free of network and table-controller imports', () => {
    const sources = ['selection.ts', 'types.ts', 'data-table.tsx', 'data-table-scroller.tsx']
      .map((fileName) => readFileSync(join(DATA_TABLE_DIR, fileName), 'utf8'))
      .join('\n');
    expect(sources).not.toMatch(/\bfetch\s*\(/);
    expect(sources).not.toMatch(/@tanstack\/react-query|@tanstack\/react-table|axios|graphql|swr/);
    expect(sources).not.toMatch(/\bselectAllMatching\b|\bselectedRowCache\b/);
  });
});
