import {
  DATA_TABLE_DEFAULT_ESTIMATE_SIZE,
  DATA_TABLE_DEFAULT_OVERSCAN,
  DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT,
  type DataTableVirtualization,
} from './types';

/**
 * Resolved window options. `active` is the only branch flag the scroller needs.
 * Test seam — not required on the public barrel (INV-148).
 */
export interface ResolvedDataTableVirtualization {
  readonly active: boolean;
  readonly estimateSize: number | ((index: number) => number);
  readonly overscan: number;
  readonly maxHeight: number;
}

function isOptedIn(virtualized: boolean | DataTableVirtualization | undefined): boolean {
  return virtualized === true || (typeof virtualized === 'object' && virtualized !== null);
}

function isInvalidMaxHeight(value: number): boolean {
  return !Number.isFinite(value) || value <= 0;
}

/** INV-125: non-finite or `<= 0` `maxHeight` is invalid. */
export function isInvalidVirtualizedMaxHeight(value: number | undefined): boolean {
  return value !== undefined && isInvalidMaxHeight(value);
}

/**
 * INV-115 / INV-122 / INV-123 / INV-125.
 * `virtualized={{}}` equals `true` (kit defaults). No N-row auto-threshold.
 */
export function resolveVirtualization(
  virtualized: boolean | DataTableVirtualization | undefined,
  bodyRowCount: number
): ResolvedDataTableVirtualization {
  const options: DataTableVirtualization =
    typeof virtualized === 'object' && virtualized !== null ? virtualized : {};

  const rawMaxHeight = options.maxHeight;
  const maxHeight = isInvalidVirtualizedMaxHeight(rawMaxHeight)
    ? DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT
    : (rawMaxHeight ?? DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT);

  return {
    active: isOptedIn(virtualized) && bodyRowCount > 0,
    estimateSize: options.estimateSize ?? DATA_TABLE_DEFAULT_ESTIMATE_SIZE,
    overscan: options.overscan ?? DATA_TABLE_DEFAULT_OVERSCAN,
    maxHeight,
  };
}

/** APG: total rows available including the header row. Caption is not a row. INV-144 */
export function ariaRowCount(bodyRowCount: number): number {
  return 1 + bodyRowCount;
}

/** 1-based. Header is 1; `bodyRows[i]` is `i + 2`. INV-145 */
export function ariaRowIndexForBodyRow(indexInBodyRows: number): number {
  return indexInBodyRows + 2;
}

/**
 * Spacer heights from TanStack items (Discussion #476). INV-117 / INV-139
 */
export function spacerHeights(args: {
  paddingStart: number;
  totalSize: number;
  firstStart: number | undefined;
  lastEnd: number | undefined;
}): { paddingTop: number; paddingBottom: number } {
  if (args.firstStart === undefined || args.lastEnd === undefined) {
    return { paddingTop: 0, paddingBottom: 0 };
  }
  return {
    paddingTop: Math.max(0, args.firstStart - args.paddingStart),
    paddingBottom: Math.max(0, args.totalSize - args.lastEnd),
  };
}

/** Linear identity lookup into `bodyRows`. INV-128 / INV-131 */
export function findBodyIndexByKey<Row>(
  bodyRows: readonly Row[],
  getRowKey: (row: Row) => string,
  key: string
): number | null {
  for (let index = 0; index < bodyRows.length; index += 1) {
    const row = bodyRows[index];
    if (row !== undefined && getRowKey(row) === key) {
      return index;
    }
  }
  return null;
}

/** Internal sentinel identity. Not a data row. Not barrel-exported. INV-150 / INV-175 */
export const DATA_TABLE_INFINITE_SENTINEL_KEY = '__data-table-infinite-sentinel';

/** Short-page / scrollport ε in CSS pixels. INV-160 */
export const DATA_TABLE_SHORT_PAGE_EPSILON_PX = 1;

export type DataTableAriaRowCount = number | undefined;

/**
 * `undefined` → omit the attribute (browser counts the DOM).
 * `-1` → unknown total (infinite `hasMore`).
 * `1 + bodyRowCount` → finite virtualized (header + body).
 * INV-171 / INV-144
 */
export function resolveAriaRowCount(args: {
  virtualizedActive: boolean;
  infiniteHasMore: boolean;
  bodyRowCount: number;
}): DataTableAriaRowCount {
  if (args.infiniteHasMore) {
    return -1;
  }
  if (args.virtualizedActive) {
    return ariaRowCount(args.bodyRowCount);
  }
  return undefined;
}

/**
 * INV-160 (1): last **data** index is in the virtual window.
 * Empty body uses the short-page clause, not this helper.
 */
export function shouldRequestMoreFromVirtualRange(args: {
  lastVirtualIndex: number | undefined;
  bodyRowCount: number;
}): boolean {
  if (args.bodyRowCount === 0) {
    return false;
  }
  if (args.lastVirtualIndex === undefined) {
    return false;
  }
  return args.lastVirtualIndex >= args.bodyRowCount - 1;
}

/** INV-160 (2): kit wrapper is a vertical scrollport. */
export function isVerticalScrollport(scrollHeight: number, clientHeight: number): boolean {
  return scrollHeight > clientHeight + DATA_TABLE_SHORT_PAGE_EPSILON_PX;
}

/** INV-160 (3): after paint, the wrapper does not overflow vertically. */
export function isShortPage(scrollHeight: number, clientHeight: number): boolean {
  return scrollHeight <= clientHeight + DATA_TABLE_SHORT_PAGE_EPSILON_PX;
}
