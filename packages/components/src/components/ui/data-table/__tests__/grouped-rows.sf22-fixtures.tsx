/**
 * 005 SF-22 · DataTable grouped rows — shared fixtures for the jsdom and Chromium suites.
 *
 * `KeyRow` mirrors the example app's "Keys by role" demo: roles cycle through the input
 * (so grouping has to gather them), a few rows have no role, and labels / dates are
 * deterministic. `mulberry32` gives the property tests a seeded, repeatable generator.
 */
import type { ReactNode } from 'react';

import type { DataTableColumn, DataTableGrouping, DataTableProps } from '../types';

export interface KeyRow {
  readonly id: string;
  readonly role?: string;
  readonly label: string;
  /** Days since a fixed epoch; sortable and deterministic. */
  readonly added: number;
}

export const KEY_ROLES = ['Admin', 'Minter', 'Pauser'] as const;

/** `n % 3` cycles Admin / Minter / Pauser; indices in `withoutRole` get no role. */
export function keyRows(count: number, withoutRole: readonly number[] = []): KeyRow[] {
  return Array.from({ length: count }, (_, n) => ({
    id: `key-${String(n)}`,
    role: withoutRole.includes(n) ? undefined : KEY_ROLES[n % KEY_ROLES.length],
    label: `Signer ${String(n + 1).padStart(3, '0')}`,
    added: (n * 37) % 300,
  }));
}

/** The paginated demo's rows: Admin 4, Minter 5, Pauser 3 (input already group-ordered). */
export function paginatedKeyRows(): KeyRow[] {
  return keyRows(12).map((row, n) => ({
    ...row,
    role: n < 4 ? 'Admin' : n < 9 ? 'Minter' : 'Pauser',
  }));
}

/** Row key: the stable `id`. */
export function getKeyRowKey(row: KeyRow): string {
  return row.id;
}

/** Label / Added (sortable) and Account columns; `cellSpy` sees every Label `cell` call. */
export function keyColumns(cellSpy?: (row: KeyRow) => void): DataTableColumn<KeyRow>[] {
  return [
    {
      id: 'label',
      header: 'Label',
      sortable: true,
      getSortValue: (row) => row.label,
      cell: (row): ReactNode => {
        cellSpy?.(row);
        return row.label;
      },
    },
    {
      id: 'added',
      header: 'Added',
      sortable: true,
      getSortValue: (row) => row.added,
      cell: (row) => String(row.added),
    },
    {
      id: 'account',
      header: 'Account',
      cell: (row) => `0x${row.id}`,
    },
  ];
}

/** Groups by `role`; extra fields (renderer, label) merge in. */
export function byRole(extra?: Partial<DataTableGrouping<KeyRow>>): DataTableGrouping<KeyRow> {
  return { getGroupKey: (row) => row.role, ...extra };
}

/** Seeded PRNG (mulberry32) so property cases are repeatable and reportable by seed. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** React `useId` output differs between independent roots; normalize before comparing HTML. */
export function normalizeIds(html: string): string {
  return html.replace(/«[^»]*»|:r[0-9a-z]+:|_r_[0-9a-z]+_/g, 'ID');
}

const noop = (): void => undefined;

export type DefaultPathCase = {
  readonly name: string;
  readonly props: DataTableProps<KeyRow>;
};

/**
 * INV-5 matrix: {plain, virtualized, client pager, server pager, infinite} × {selection off/on}
 * × {empty / non-empty}. Used both to capture the pre-SF-22 baseline (from the parent of the
 * SF-22 code commit) and to compare the current default path against it.
 */
export function defaultPathMatrix(): DefaultPathCase[] {
  const loads: { name: string; extra: Record<string, unknown> }[] = [
    { name: 'plain', extra: {} },
    { name: 'virtualized', extra: { virtualized: true } },
    {
      name: 'client pager',
      extra: { pagination: { kind: 'client', pageIndex: 1, pageSize: 7, onPageChange: noop } },
    },
    {
      name: 'server pager',
      extra: {
        pagination: {
          kind: 'server',
          pageIndex: 0,
          pageSize: 10,
          totalCount: 30,
          onPageChange: noop,
        },
      },
    },
    { name: 'infinite', extra: { infiniteScroll: { hasMore: true, onLoadMore: noop } } },
  ];
  const cases: DefaultPathCase[] = [];
  for (const load of loads) {
    for (const withSelection of [false, true]) {
      for (const empty of [false, true]) {
        const props = {
          caption: 'Keys',
          columns: keyColumns(),
          rows: empty ? [] : keyRows(30, [4, 17]),
          getRowKey: getKeyRowKey,
          ...(withSelection
            ? {
                selection: {
                  selectedKeys: new Set(['key-1', 'key-4']),
                  onSelectionChange: noop,
                },
              }
            : {}),
          ...load.extra,
        } as DataTableProps<KeyRow>;
        cases.push({
          name: `${load.name} · selection ${withSelection ? 'on' : 'off'} · ${empty ? 'empty' : 'rows'}`,
          props,
        });
      }
    }
  }
  return cases;
}
