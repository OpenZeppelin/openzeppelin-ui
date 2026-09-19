/**
 * SF-11 · Pure page-window math — INV-236, INV-239–INV-243, INV-251, INV-254.
 */
import { describe, expect, it } from 'vitest';

import {
  buildPageItems,
  DATA_TABLE_PAGINATION_SIBLING_COUNT,
  defaultPaginationStatus,
  isTotalKnown,
  paginationStatusInfo,
  type DataTablePageListItem,
} from '../helpers';
import type { DataTablePagination } from '../types';

function pageIndexes(items: readonly DataTablePageListItem[]): number[] {
  return items.filter((item) => item.kind === 'page').map((item) => item.pageIndex);
}

function ellipsisKeys(items: readonly DataTablePageListItem[]): string[] {
  return items.filter((item) => item.kind === 'ellipsis').map((item) => item.key);
}

describe('INV-239: isTotalKnown is the single known-total predicate', () => {
  const onPageChange = (): void => undefined;

  it('treats client kind as known even when rowCount is 0', () => {
    const pagination: DataTablePagination = {
      kind: 'client',
      pageIndex: 0,
      pageSize: 10,
      onPageChange,
    };
    expect(isTotalKnown(pagination, 0), 'INV-239: empty client list is still known').toBe(true);
  });

  it('treats finite server totalCount >= 0 as known, including 0', () => {
    expect(
      isTotalKnown({ kind: 'server', pageIndex: 0, pageSize: 10, totalCount: 0, onPageChange }, 0)
    ).toBe(true);
    expect(
      isTotalKnown({ kind: 'server', pageIndex: 0, pageSize: 10, totalCount: 40, onPageChange }, 10)
    ).toBe(true);
  });

  it('treats omitted, NaN, infinities, and negative server totals as unknown', () => {
    expect(
      isTotalKnown({ kind: 'server', pageIndex: 0, pageSize: 10, onPageChange }, 10),
      'INV-239: omit is unknown'
    ).toBe(false);
    expect(
      isTotalKnown(
        { kind: 'server', pageIndex: 0, pageSize: 10, totalCount: Number.NaN, onPageChange },
        10
      )
    ).toBe(false);
    expect(
      isTotalKnown(
        {
          kind: 'server',
          pageIndex: 0,
          pageSize: 10,
          totalCount: Number.POSITIVE_INFINITY,
          onPageChange,
        },
        10
      )
    ).toBe(false);
    expect(
      isTotalKnown({ kind: 'server', pageIndex: 0, pageSize: 10, totalCount: -1, onPageChange }, 10)
    ).toBe(false);
  });
});

describe('INV-240 / INV-241 / INV-242 / INV-236: buildPageItems window', () => {
  it('returns [] when pageCount is not a positive finite integer', () => {
    expect(buildPageItems(0, 0)).toEqual([]);
    expect(buildPageItems(0, -3)).toEqual([]);
    expect(buildPageItems(0, Number.NaN)).toEqual([]);
    expect(() => buildPageItems(0, 0)).not.toThrow();
  });

  it('lists every page and no ellipsis when pageCount <= 7 at default sibling', () => {
    expect(DATA_TABLE_PAGINATION_SIBLING_COUNT).toBe(1);
    const items = buildPageItems(0, 7);
    expect(pageIndexes(items)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(ellipsisKeys(items), 'INV-234 / INV-241: compact lists have zero ellipsis').toEqual([]);
  });

  it('pins the four worked clustered shapes at siblingCount 1', () => {
    expect(buildPageItems(0, 20)).toEqual([
      { kind: 'page', pageIndex: 0 },
      { kind: 'page', pageIndex: 1 },
      { kind: 'page', pageIndex: 2 },
      { kind: 'ellipsis', key: 'end' },
      { kind: 'page', pageIndex: 19 },
    ]);
    expect(buildPageItems(10, 20)).toEqual([
      { kind: 'page', pageIndex: 0 },
      { kind: 'ellipsis', key: 'start' },
      { kind: 'page', pageIndex: 9 },
      { kind: 'page', pageIndex: 10 },
      { kind: 'page', pageIndex: 11 },
      { kind: 'ellipsis', key: 'end' },
      { kind: 'page', pageIndex: 19 },
    ]);
    expect(buildPageItems(19, 20)).toEqual([
      { kind: 'page', pageIndex: 0 },
      { kind: 'ellipsis', key: 'start' },
      { kind: 'page', pageIndex: 17 },
      { kind: 'page', pageIndex: 18 },
      { kind: 'page', pageIndex: 19 },
    ]);
  });

  it('never emits an index outside [0, pageCount) and includes an in-range current page', () => {
    for (let pageCount = 1; pageCount <= 50; pageCount += 1) {
      for (let pageIndex = -2; pageIndex <= pageCount + 2; pageIndex += 1) {
        const items = buildPageItems(pageIndex, pageCount);
        const indexes = pageIndexes(items);
        expect(new Set(indexes).size, 'INV-240: no duplicate page indexes').toBe(indexes.length);
        for (const index of indexes) {
          expect(Number.isInteger(index)).toBe(true);
          expect(index, 'INV-240: pageIndex stays in range').toBeGreaterThanOrEqual(0);
          expect(index).toBeLessThan(pageCount);
        }
        if (pageIndex >= 0 && pageIndex < pageCount) {
          expect(
            indexes.includes(pageIndex),
            `INV-236: current ${String(pageIndex)} of ${String(pageCount)} must stay in the window`
          ).toBe(true);
        } else {
          expect(
            indexes.includes(pageIndex),
            'INV-242: clustering must not add a button for an invalid pageIndex'
          ).toBe(false);
        }
      }
    }
  });

  it('clusters OOR pageIndex near the last page without emitting that invalid index', () => {
    const items = buildPageItems(99, 20);
    expect(pageIndexes(items).includes(99)).toBe(false);
    expect(pageIndexes(items)).toEqual([0, 17, 18, 19]);
  });

  it('caps clustered numeric buttons at 5 even for huge pageCount', () => {
    const items = buildPageItems(5000, 10_000);
    expect(
      pageIndexes(items).length,
      'INV-241 / INV-251: clustered cap is ≤ 5'
    ).toBeLessThanOrEqual(5);
    expect(ellipsisKeys(items).length).toBeLessThanOrEqual(2);
  });
});

describe('INV-243 / INV-254: unknown totals do not invent from/to/pageCount', () => {
  it('nulls dataset coordinates when totalKnown is false', () => {
    expect(
      paginationStatusInfo({
        pageIndex: 2,
        pageSize: 10,
        totalCount: null,
        rowCountOnPage: 10,
        totalKnown: false,
      })
    ).toMatchObject({
      totalKnown: false,
      totalCount: null,
      pageCount: null,
      from: 0,
      to: 0,
      pageIndex: 2,
    });
  });

  it('keeps known empty as pageCount 1, not null', () => {
    expect(
      paginationStatusInfo({ pageIndex: 0, pageSize: 10, totalCount: 0, rowCountOnPage: 0 })
    ).toMatchObject({ totalKnown: true, totalCount: 0, pageCount: 1, from: 0, to: 0 });
  });

  it('uses Page N / No rows / Showing copy', () => {
    expect(
      defaultPaginationStatus(
        paginationStatusInfo({
          pageIndex: 2,
          pageSize: 10,
          totalCount: null,
          rowCountOnPage: 0,
          totalKnown: false,
        })
      )
    ).toBe('Page 3');
    expect(
      defaultPaginationStatus(
        paginationStatusInfo({ pageIndex: 0, pageSize: 10, totalCount: 0, rowCountOnPage: 0 })
      )
    ).toBe('No rows');
    expect(
      defaultPaginationStatus(
        paginationStatusInfo({ pageIndex: 0, pageSize: 10, totalCount: 47, rowCountOnPage: 10 })
      )
    ).toBe('Showing 1–10 of 47');
  });
});
