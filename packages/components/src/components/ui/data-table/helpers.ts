import type {
  DataTableAlign,
  DataTableColumn,
  DataTablePagination,
  DataTablePaginationStatusInfo,
} from './types';

/**
 * True when `value` is a string with at least one non-whitespace character.
 * Used for INV-25 name fallback and INV-38 blank-name diagnostics.
 */
export function isNonblank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * True when `header` is a non-blank string, i.e. the `<th>` needs no `aria-label` (INV-31).
 */
export function headerNamesItself<Row>(column: DataTableColumn<Row>): boolean {
  return isNonblank(column.header);
}

/**
 * INV-25: non-blank string `header` → that string; else non-blank `headerLabel`; else `id`.
 */
export function resolveColumnName<Row>(column: DataTableColumn<Row>): string {
  if (isNonblank(column.header)) {
    return column.header;
  }
  if (isNonblank(column.headerLabel)) {
    return column.headerLabel;
  }
  return column.id;
}

/**
 * `'start' | 'end'` for the `data-align` attribute; omitted `align` is `'start'` (INV-32).
 */
export function resolveAlign(align: DataTableAlign | undefined): DataTableAlign {
  return align === 'end' ? 'end' : 'start';
}

/**
 * INV-3 / INV-32 / INV-59: `'end'` → `'text-end'`; anything else (incl. undefined) → `'text-start'`.
 * Never returns physical `text-left` / `text-right`.
 */
export function alignClass(align: DataTableAlign | undefined): 'text-start' | 'text-end' {
  return resolveAlign(align) === 'end' ? 'text-end' : 'text-start';
}

/** Integer `pageIndex >= 0`. Non-finite and fractional indexes are not pager-usable. */
export function isUsablePageIndex(pageIndex: number): boolean {
  return Number.isInteger(pageIndex) && pageIndex >= 0;
}

/** Finite `pageSize > 0` → `Math.floor(pageSize)`; else `1` (INV-100). */
export function resolvePageSize(pageSize: number): number {
  if (Number.isFinite(pageSize) && pageSize > 0) {
    return Math.floor(pageSize);
  }
  return 1;
}

/**
 * `totalCount <= 0` or non-finite → `1`; else
 * `ceil(totalCount / resolvePageSize(pageSize))` (INV-100).
 */
export function resolvePageCount(totalCount: number, pageSize: number): number {
  const effectiveTotal = Number.isFinite(totalCount) ? totalCount : 0;
  if (effectiveTotal <= 0) {
    return 1;
  }
  return Math.ceil(effectiveTotal / resolvePageSize(pageSize));
}

/**
 * Shallow window of `rows`. Never mutates. Non-integer / negative / non-finite
 * `pageIndex` yields `[]` so JS negative `slice` cannot pull a tail (INV-101).
 */
export function sliceClientPage<Row>(
  rows: readonly Row[],
  pageIndex: number,
  pageSize: number
): readonly Row[] {
  const size = resolvePageSize(pageSize);
  if (!isUsablePageIndex(pageIndex)) {
    return [];
  }
  const start = pageIndex * size;
  return rows.slice(start, start + size);
}

/**
 * Inclusive neighbour count around the current page. Kit constant, not a public
 * prop (INV-241 / INV-245).
 */
export const DATA_TABLE_PAGINATION_SIBLING_COUNT = 1;

/**
 * 0-based page token, or a gap marker. Never includes an index `>= pageCount`.
 * Folder-internal (INV-252).
 */
export type DataTablePageListItem =
  | { readonly kind: 'page'; readonly pageIndex: number }
  | { readonly kind: 'ellipsis'; readonly key: 'start' | 'end' };

/**
 * Finite `totalCount >= 0` on server, or any client pagination (INV-239).
 * `rowCount` is part of the Design signature; client kind is known even at 0.
 */
export function isTotalKnown(pagination: DataTablePagination, _rowCount: number): boolean {
  if (pagination.kind === 'client') {
    return true;
  }
  const totalCount = pagination.totalCount;
  return totalCount !== undefined && Number.isFinite(totalCount) && totalCount >= 0;
}

function resolveSiblingCount(siblingCount: number | undefined): number {
  if (siblingCount === undefined) {
    return DATA_TABLE_PAGINATION_SIBLING_COUNT;
  }
  if (Number.isInteger(siblingCount) && siblingCount >= 0) {
    return siblingCount;
  }
  return DATA_TABLE_PAGINATION_SIBLING_COUNT;
}

function clampPageIndex(pageIndex: number, last: number): number {
  if (!Number.isFinite(pageIndex)) {
    return 0;
  }
  const truncated = Math.trunc(pageIndex);
  if (truncated < 0) {
    return 0;
  }
  if (truncated > last) {
    return last;
  }
  return truncated;
}

/**
 * Bounded page list. `pageIndex` is 0-based. Returns `[]` when `pageCount <= 0`
 * (unknown-total caller convention). Does not throw. INV-240 / INV-241 / INV-242.
 */
export function buildPageItems(
  pageIndex: number,
  pageCount: number,
  siblingCount?: number
): readonly DataTablePageListItem[] {
  if (!Number.isFinite(pageCount) || pageCount <= 0) {
    return [];
  }
  const count = Math.floor(pageCount);
  if (count <= 0) {
    return [];
  }

  const siblings = resolveSiblingCount(siblingCount);
  if (count <= siblings * 2 + 5) {
    return Array.from({ length: count }, (_, index) => ({
      kind: 'page' as const,
      pageIndex: index,
    }));
  }

  const last = count - 1;
  const displayCurrent = clampPageIndex(pageIndex, last);
  const windowSize = siblings * 2 + 1;
  const items: DataTablePageListItem[] = [];

  if (displayCurrent < windowSize) {
    for (let index = 0; index < windowSize; index += 1) {
      items.push({ kind: 'page', pageIndex: index });
    }
    items.push({ kind: 'ellipsis', key: 'end' });
    items.push({ kind: 'page', pageIndex: last });
    return items;
  }

  if (displayCurrent > last - windowSize) {
    items.push({ kind: 'page', pageIndex: 0 });
    items.push({ kind: 'ellipsis', key: 'start' });
    for (let index = last - windowSize + 1; index <= last; index += 1) {
      items.push({ kind: 'page', pageIndex: index });
    }
    return items;
  }

  items.push({ kind: 'page', pageIndex: 0 });
  items.push({ kind: 'ellipsis', key: 'start' });
  for (let index = displayCurrent - siblings; index <= displayCurrent + siblings; index += 1) {
    items.push({ kind: 'page', pageIndex: index });
  }
  items.push({ kind: 'ellipsis', key: 'end' });
  items.push({ kind: 'page', pageIndex: last });
  return items;
}

/**
 * Dataset coordinates for pager copy (INV-103 / INV-243). Does not clamp `to`
 * when a lying `rowCountOnPage` would exceed `totalCount`.
 */
export function paginationStatusInfo(args: {
  pageIndex: number;
  pageSize: number;
  totalCount: number | null;
  rowCountOnPage: number;
  totalKnown?: boolean;
}): DataTablePaginationStatusInfo {
  const pageSize = resolvePageSize(args.pageSize);
  const inferredKnown =
    typeof args.totalCount === 'number' && Number.isFinite(args.totalCount) && args.totalCount >= 0;
  const totalKnown = args.totalKnown ?? inferredKnown;

  if (!totalKnown) {
    return {
      pageIndex: args.pageIndex,
      pageSize,
      totalCount: null,
      pageCount: null,
      from: 0,
      to: 0,
      rowCountOnPage: args.rowCountOnPage,
      totalKnown: false,
    };
  }

  const totalCount = args.totalCount ?? 0;
  const pageCount = resolvePageCount(totalCount, args.pageSize);
  const empty = totalCount === 0 || args.rowCountOnPage === 0;
  const start = Math.max(0, args.pageIndex) * pageSize;
  return {
    pageIndex: args.pageIndex,
    pageSize,
    totalCount,
    pageCount,
    from: empty ? 0 : start + 1,
    to: empty ? 0 : start + args.rowCountOnPage,
    rowCountOnPage: args.rowCountOnPage,
    totalKnown: true,
  };
}

/** Kit English status. INV-254 / INV-96. */
export function defaultPaginationStatus(info: DataTablePaginationStatusInfo): string {
  if (!info.totalKnown) {
    return `Page ${String(info.pageIndex + 1)}`;
  }
  if (info.totalCount === 0) {
    return 'No rows';
  }
  return `Showing ${String(info.from)}–${String(info.to)} of ${String(info.totalCount)}`;
}
