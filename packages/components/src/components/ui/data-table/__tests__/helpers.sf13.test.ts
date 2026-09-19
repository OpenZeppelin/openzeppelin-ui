/**
 * SF-13 · Helpers pin — INV-360.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { isTotalKnown } from '../helpers';
import type { DataTablePagination } from '../types';

const DATA_TABLE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const HELPERS_SOURCE = readFileSync(join(DATA_TABLE_DIR, 'helpers.ts'), 'utf8');
const TABLE_SOURCE = readFileSync(join(DATA_TABLE_DIR, 'data-table.tsx'), 'utf8');

describe('INV-360: unknown-total helpers stay the SF-11 pin', () => {
  it('does not fork an omitted-total logger predicate in helpers.ts', () => {
    expect(HELPERS_SOURCE).toMatch(/export function isTotalKnown/);
    expect(HELPERS_SOURCE).not.toMatch(/logOnce|page:totalCount-omitted/);
    expect(TABLE_SOURCE).toMatch(/isTotalKnown\(pagination/);
    expect(TABLE_SOURCE).not.toMatch(/page:totalCount-omitted/);
  });

  it('still treats omitted server totals as unknown', () => {
    const pagination: DataTablePagination = {
      kind: 'server',
      pageIndex: 0,
      pageSize: 10,
      onPageChange: () => undefined,
    };
    expect(isTotalKnown(pagination, 10)).toBe(false);
  });
});
