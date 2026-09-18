/**
 * SF-5 · Pure page math — INV-100, INV-101, INV-103, INV-96 (default copy).
 */
import { describe, expect, it } from 'vitest';

import {
  defaultPaginationStatus,
  isUsablePageIndex,
  paginationStatusInfo,
  resolvePageCount,
  resolvePageSize,
  sliceClientPage,
} from '../helpers';
import { numberedTokenRows } from './sf2-fixtures';

describe('INV-100: resolvePageSize / resolvePageCount fail closed', () => {
  it.each([
    ['NaN', Number.NaN, 1],
    ['Infinity', Number.POSITIVE_INFINITY, 1],
    ['-Infinity', Number.NEGATIVE_INFINITY, 1],
    ['0', 0, 1],
    ['-5', -5, 1],
    ['10.9', 10.9, 10],
    ['1', 1, 1],
    ['10', 10, 10],
  ] as const)('pageSize %s → %s', (_label, pageSize, expected) => {
    expect(resolvePageSize(pageSize), 'INV-100: invalid size becomes 1; else floor').toBe(expected);
  });

  it('never throws on non-finite inputs', () => {
    expect(() => resolvePageSize(Number.NaN)).not.toThrow();
    expect(() => resolvePageCount(Number.NaN, 0)).not.toThrow();
  });

  it('pageCount is 1 when total is empty or invalid, else ceil(total / size)', () => {
    expect(resolvePageCount(0, 10), 'INV-100: empty dataset still has one page').toBe(1);
    expect(resolvePageCount(-4, 10)).toBe(1);
    expect(resolvePageCount(Number.NaN, 10)).toBe(1);
    expect(resolvePageCount(25, 10)).toBe(3);
    expect(resolvePageCount(10, 10)).toBe(1);
    expect(resolvePageCount(11, 10.9), 'INV-100: uses floored size').toBe(2);
  });
});

describe('isUsablePageIndex: pager treats fractional and non-finite indexes as unusable', () => {
  it.each([
    [0, true],
    [1, true],
    [1.5, false],
    [-1, false],
    [Number.NaN, false],
    [Number.POSITIVE_INFINITY, false],
  ] as const)('pageIndex %s → %s', (pageIndex, expected) => {
    expect(isUsablePageIndex(pageIndex)).toBe(expected);
  });
});

describe('INV-101: sliceClientPage is a shallow non-mutating window', () => {
  const rows = numberedTokenRows(25);

  it('returns the same element references for a mid-list window', () => {
    const windowed = sliceClientPage(rows, 1, 10);
    expect(windowed).toHaveLength(10);
    expect(windowed[0], 'INV-101: window[0] is rows[10]').toBe(rows[10]);
    expect(windowed[9]).toBe(rows[19]);
    expect(rows).toHaveLength(25);
    expect(rows[0]?.id).toBe('r0');
  });

  it('returns a short last page without padding', () => {
    const last = sliceClientPage(rows, 2, 10);
    expect(last).toHaveLength(5);
    expect(last[0]).toBe(rows[20]);
    expect(last[4]).toBe(rows[24]);
  });

  it('returns [] for negative, non-integer, and past-the-end indexes (no JS tail slice)', () => {
    expect(
      sliceClientPage(rows, -1, 10),
      'INV-101: negative index must not slice from end'
    ).toEqual([]);
    expect(sliceClientPage(rows, 1.5, 10)).toEqual([]);
    expect(sliceClientPage(rows, Number.NaN, 10)).toEqual([]);
    expect(sliceClientPage(rows, 3, 10), 'INV-101: start past length is empty').toEqual([]);
  });

  it('treats pageIndex 0 on an empty list as a genuine empty dataset, not a tail window', () => {
    const empty: typeof rows = [];
    expect(sliceClientPage(empty, 0, 10)).toEqual([]);
    expect(empty).toEqual([]);
  });

  it('does not sort or copy the source array object graph beyond slice', () => {
    const original = rows.map((row) => row.id);
    sliceClientPage(rows, 0, 10);
    expect(
      rows.map((row) => row.id),
      'INV-101: source order unchanged'
    ).toEqual(original);
  });
});

describe('INV-103: paginationStatusInfo uses dataset coordinates', () => {
  it('uses 0–0 when total or on-page count is 0', () => {
    expect(
      paginationStatusInfo({ pageIndex: 0, pageSize: 10, totalCount: 0, rowCountOnPage: 0 })
    ).toMatchObject({ from: 0, to: 0, pageCount: 1, pageSize: 10, totalCount: 0 });
    expect(
      paginationStatusInfo({ pageIndex: 4, pageSize: 10, totalCount: 47, rowCountOnPage: 0 }),
      'INV-103: empty overshoot page is 0–0, not No-rows coordinates'
    ).toMatchObject({ from: 0, to: 0, totalCount: 47, rowCountOnPage: 0, pageCount: 5 });
  });

  it('numbers the first full page and a short last page', () => {
    expect(
      paginationStatusInfo({ pageIndex: 0, pageSize: 10, totalCount: 47, rowCountOnPage: 10 })
    ).toMatchObject({ from: 1, to: 10, pageCount: 5 });
    expect(
      paginationStatusInfo({ pageIndex: 4, pageSize: 10, totalCount: 47, rowCountOnPage: 7 })
    ).toMatchObject({ from: 41, to: 47, pageCount: 5 });
  });

  it('does not clamp to when a lying rowCountOnPage overruns totalCount', () => {
    expect(
      paginationStatusInfo({ pageIndex: 0, pageSize: 10, totalCount: 5, rowCountOnPage: 10 }),
      'INV-103: formula is start + rowCountOnPage; no silent clamp'
    ).toMatchObject({ from: 1, to: 10, totalCount: 5 });
  });
});

describe('INV-96: defaultPaginationStatus copy', () => {
  it('says No rows only when totalCount is 0', () => {
    expect(
      defaultPaginationStatus(
        paginationStatusInfo({ pageIndex: 0, pageSize: 10, totalCount: 0, rowCountOnPage: 0 })
      )
    ).toBe('No rows');
  });

  it('shows 0–0 of N for an empty page that still has a dataset', () => {
    expect(
      defaultPaginationStatus(
        paginationStatusInfo({ pageIndex: 9, pageSize: 10, totalCount: 47, rowCountOnPage: 0 })
      ),
      'INV-103: empty page must not say No rows'
    ).toBe('Showing 0–0 of 47');
  });

  it('shows the inclusive window on a populated page', () => {
    expect(
      defaultPaginationStatus(
        paginationStatusInfo({ pageIndex: 0, pageSize: 10, totalCount: 47, rowCountOnPage: 10 })
      )
    ).toBe('Showing 1–10 of 47');
  });
});
