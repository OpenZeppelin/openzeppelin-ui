/**
 * @vitest-environment jsdom
 *
 * Grouped DataTable: grouping is still derived on every render (SF-22 INV-17), but the
 * virtualizer's grouped `getItemKey` keeps its identity while the painted key sequence is
 * unchanged, and the dev diagnostics re-check the empty-header flag when sections change.
 */
import './sf4-jsdom-setup';

import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { logger } from '@openzeppelin/ui-utils';

import { DataTable } from '../data-table';
import type { DataTableProps } from '../types';
import {
  byRole,
  getKeyRowKey,
  keyColumns,
  keyRows,
  type KeyRow,
} from './grouped-rows.sf22-fixtures';

type GetItemKey = (index: number) => string | number | bigint;
const seenGetItemKey: GetItemKey[] = [];

vi.mock('@tanstack/react-virtual', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-virtual')>();
  return {
    ...actual,
    useVirtualizer: ((options: Parameters<typeof actual.useVirtualizer>[0]) => {
      if (options.getItemKey) seenGetItemKey.push(options.getItemKey as GetItemKey);
      return actual.useVirtualizer(options);
    }) as typeof actual.useVirtualizer,
  };
});

afterEach(() => {
  seenGetItemKey.length = 0;
  vi.restoreAllMocks();
});

const columns = keyColumns();

function props(extra: Partial<DataTableProps<KeyRow>> = {}): DataTableProps<KeyRow> {
  return {
    caption: 'Keys',
    columns,
    rows: keyRows(30),
    getRowKey: getKeyRowKey,
    grouping: byRole(),
    virtualized: true,
    ...extra,
  } as DataTableProps<KeyRow>;
}

const last = (): GetItemKey => seenGetItemKey[seenGetItemKey.length - 1] as GetItemKey;
/** The first paint keys, read now (the function reads the latest render's list). */
const keysOf = (getItemKey: GetItemKey): unknown[] =>
  Array.from({ length: 14 }, (_, i) => getItemKey(i));

describe('grouped getItemKey identity', () => {
  it('re-renders with the same rows and an inline grouping keep one getItemKey', () => {
    const rows = keyRows(30);
    const { rerender } = render(<DataTable {...props({ rows })} />);
    const first = last();
    for (let i = 0; i < 3; i += 1) {
      // A new grouping object and a new getGroupKey every render: still the same keys.
      rerender(<DataTable {...props({ rows, grouping: { getGroupKey: (r) => r.role } })} />);
    }
    expect(last()).toBe(first);
    expect(first(0)).toBe('__data-table-group:Admin');
  });

  it('a change to the painted keys gives a new getItemKey that returns the new keys', () => {
    const rows = keyRows(30);
    const { rerender } = render(<DataTable {...props({ rows })} />);
    const before = last();
    const keysBefore = keysOf(before);
    const moved = rows.map((row, n) => (n === 0 ? { ...row, role: 'Pauser' } : row));
    rerender(<DataTable {...props({ rows: moved })} />);
    expect(last()).not.toBe(before);
    expect(keysOf(last())).not.toEqual(keysBefore);
  });

  it('INV-17 kept: a group key changed in place (same rows array) re-keys on the next render', () => {
    const rows: Array<{ id: string; role?: string; label: string; added: number }> = keyRows(
      30
    ).map((row) => ({ ...row }));
    const getGroupKey = (row: KeyRow): string | undefined => row.role;
    const { rerender } = render(<DataTable {...props({ rows, grouping: { getGroupKey } })} />);
    const before = last();
    const keysBefore = keysOf(before);
    (rows[0] as { role?: string }).role = 'Pauser';
    rerender(<DataTable {...props({ rows, grouping: { getGroupKey } })} />);
    expect(last()).not.toBe(before);
    expect(keysOf(last())).not.toEqual(keysBefore);
  });
});

describe('empty-header diagnostic', () => {
  it('fires when a renderer that returns empty content arrives with unchanged sections', () => {
    const errors = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const rows = keyRows(30);
    const { rerender } = render(<DataTable {...props({ rows })} />);
    rerender(<DataTable {...props({ rows, grouping: byRole({ renderGroupHeader: () => '' }) })} />);
    const hits = errors.mock.calls.filter((c) =>
      String(c[1]).includes('renderGroupHeader returned empty content')
    );
    expect(hits).toHaveLength(1);
  });
});
