import type { ReactNode } from 'react';

import { isNonblank } from './helpers';
import { applyClientSort } from './sort';
import type {
  DataTableColumn,
  DataTableGroupHeaderInfo,
  DataTableGrouping,
  DataTableSortState,
} from './types';

/**
 * Grouped rows: pure grouping pipeline and the paint-item list.
 * Internal, not barrel-exported.
 */

/** Reserved React / virtual-item key prefix for keyed section rows. */
export const DATA_TABLE_GROUP_ITEM_KEY_PREFIX = '__data-table-group:';

/** Item key of the `key: null` section. Differs from every prefixed key. */
export const DATA_TABLE_UNGROUPED_ITEM_KEY = '__data-table-group-none';

/** Virtualizer estimate for a section row, in px. Measured afterwards except on Firefox. */
export const DATA_TABLE_GROUP_ROW_ESTIMATE_SIZE = 40;

/** The only kit-authored string grouping adds; overridable via `ungroupedLabel`. */
export const DATA_TABLE_DEFAULT_UNGROUPED_LABEL = 'Other';

/**
 * One painted body item. `bodyRows` stays data-only; this list exists only for
 * painting, virtual counts, item keys and ARIA indices. The `'group'`
 * branch carries no `Row`, so a section can never reach `cell`, selection or
 * `getRowClassName`.
 */
export type DataTableBodyItem<Row> =
  | {
      readonly kind: 'group';
      readonly itemKey: string;
      readonly info: DataTableGroupHeaderInfo<Row>;
    }
  | {
      readonly kind: 'row';
      /** `getRowKey(row)`, unchanged. */
      readonly itemKey: string;
      readonly row: Row;
      /** Index into `bodyRows`: what selection, `estimateSize(fn)` and `scrollToRowKey` use. */
      readonly bodyIndex: number;
    };

export interface DataTableRowGroup<Row> {
  readonly key: string | null;
  /** The group's rows in display order (sorted when client sort applies). */
  readonly rows: readonly Row[];
  /** Index of the group's first row in `displayRows`. */
  readonly start: number;
}

export interface GroupedDisplay<Row> {
  /** Flat, group-contiguous display order. Feeds the existing client page slice. */
  readonly displayRows: readonly Row[];
  /** Parallel to `displayRows`: index into `groups`. */
  readonly groupIndexByDisplayRow: readonly number[];
  /** Groups in paint order: first appearance in `rows`, `key: null` last. */
  readonly groups: readonly DataTableRowGroup<Row>[];
  /** True when partitioning moved a row (input was not contiguous by group). Ignores within-group sort. */
  readonly reordered: boolean;
  /** True when `getGroupKey` returned a non-string, non-nullish value at least once. */
  readonly invalidKeySeen: boolean;
}

/** A non-string, non-nullish value from an untyped `getGroupKey`. */
export function isInvalidGroupKey(raw: unknown): boolean {
  return raw != null && typeof raw !== 'string';
}

/**
 * A non-blank string is returned verbatim (no trim, no case folding);
 * everything else is `null`. Never throws and never stringifies objects.
 */
export function resolveGroupKey(raw: unknown): string | null {
  return isNonblank(raw) ? raw : null;
}

/**
 * Grouping steps:
 * 1. Partition `rows` by resolved key, groups in first-appearance order, the `null`
 *    group last, input order kept inside each group (stable).
 * 2. With `clientSort`, apply the shipped `applyClientSort` to each group, so sort
 *    stability, missing-last and one `getSortValue` call per row hold per group.
 * 3. Concatenate into `displayRows`.
 * `getGroupKey` is called exactly once per row. `rows` is never mutated.
 */
export function groupDisplayRows<Row>(args: {
  readonly rows: readonly Row[];
  readonly getGroupKey: (row: Row) => string | null | undefined;
  readonly columns: readonly DataTableColumn<Row>[];
  readonly sort: DataTableSortState | null;
  /** `false` for server pagination and active infinite feeds. */
  readonly clientSort: boolean;
}): GroupedDisplay<Row> {
  const { rows, getGroupKey, columns, sort, clientSort } = args;

  const keyedBuckets = new Map<string, Row[]>();
  const ungroupedBucket: Row[] = [];
  let invalidKeySeen = false;

  for (const row of rows) {
    const raw: unknown = getGroupKey(row);
    if (isInvalidGroupKey(raw)) {
      invalidKeySeen = true;
    }
    const key = resolveGroupKey(raw);
    if (key == null) {
      ungroupedBucket.push(row);
      continue;
    }
    const bucket = keyedBuckets.get(key);
    if (bucket == null) {
      keyedBuckets.set(key, [row]);
    } else {
      bucket.push(row);
    }
  }

  const partitions: { key: string | null; rows: readonly Row[] }[] = [];
  for (const [key, bucket] of keyedBuckets) {
    partitions.push({ key, rows: bucket });
  }
  if (ungroupedBucket.length > 0) {
    partitions.push({ key: null, rows: ungroupedBucket });
  }

  const displayRows: Row[] = [];
  const groupIndexByDisplayRow: number[] = [];
  const groups: DataTableRowGroup<Row>[] = [];
  let reordered = false;

  partitions.forEach((partition, groupIndex) => {
    const start = displayRows.length;
    // `reordered` compares the partition (pre-sort) order with the input.
    partition.rows.forEach((row, offset) => {
      if (rows[start + offset] !== row) {
        reordered = true;
      }
    });
    const groupRows = Object.freeze(
      clientSort ? [...applyClientSort(partition.rows, columns, sort)] : [...partition.rows]
    );
    for (const row of groupRows) {
      displayRows.push(row);
      groupIndexByDisplayRow.push(groupIndex);
    }
    groups.push({ key: partition.key, rows: groupRows, start });
  });

  return { displayRows, groupIndexByDisplayRow, groups, reordered, invalidKeySeen };
}

/**
 * Interleave one section item before each group's
 * run of rows inside the page window. `bodyRows` is `displayRows` sliced at
 * `pageStart` (0 when unpaged), so groups that do not overlap the window paint
 * nothing, a section never ends the list, and no group appears twice. A section
 * whose group starts before `pageStart` is `continued`.
 */
export function buildGroupedBodyItems<Row>(args: {
  readonly bodyRows: readonly Row[];
  readonly pageStart: number;
  readonly grouped: GroupedDisplay<Row>;
  readonly getRowKey: (row: Row) => string;
}): readonly DataTableBodyItem<Row>[] {
  const { bodyRows, pageStart, grouped, getRowKey } = args;
  const windowEnd = pageStart + bodyRows.length;
  const items: DataTableBodyItem<Row>[] = [];

  for (const group of grouped.groups) {
    const from = Math.max(group.start, pageStart);
    const to = Math.min(group.start + group.rows.length, windowEnd);
    if (from >= to) {
      continue;
    }
    items.push({
      kind: 'group',
      itemKey:
        group.key == null
          ? DATA_TABLE_UNGROUPED_ITEM_KEY
          : `${DATA_TABLE_GROUP_ITEM_KEY_PREFIX}${group.key}`,
      // Fresh per render and frozen so a renderer cannot mutate kit state.
      info: Object.freeze({
        key: group.key,
        rows: group.rows,
        continued: group.start < pageStart,
      }),
    });
    for (let displayIndex = from; displayIndex < to; displayIndex += 1) {
      const bodyIndex = displayIndex - pageStart;
      const row = bodyRows[bodyIndex];
      if (row === undefined) {
        continue;
      }
      items.push({ kind: 'row', itemKey: getRowKey(row), row, bodyIndex });
    }
  }

  return items;
}

/**
 * One string that changes exactly when the sequence of paint item keys changes, or `null`
 * when not grouped. Lets the scroller and the diagnostics keep a stable identity across
 * renders that regroup to the same result. O(items), far cheaper than the grouping itself.
 */
export function groupedItemKeySignature<Row>(
  items: readonly DataTableBodyItem<Row>[] | null
): string | null {
  if (items == null) return null;
  let signature = '';
  for (const item of items) signature += `${item.itemKey}\u0000`;
  return signature;
}

/**
 * Paint index of the data item whose row key is `key`. Section items are
 * never targets, so their reserved keys resolve to `null` (a no-op scroll).
 */
export function findPaintIndexByRowKey<Row>(
  items: readonly DataTableBodyItem<Row>[],
  key: string
): number | null {
  const index = items.findIndex((item) => item.kind === 'row' && item.itemKey === key);
  return index === -1 ? null : index;
}

/** Content React paints as nothing visible, which would leave an unnamed `rowheader`. */
export function isEmptyGroupHeaderContent(content: ReactNode): boolean {
  return (
    content == null ||
    typeof content === 'boolean' ||
    (typeof content === 'string' && !isNonblank(content))
  );
}

/** The key, else a non-blank `ungroupedLabel`, else `'Other'`. */
export function defaultGroupLabel(key: string | null, ungroupedLabel: string | undefined): string {
  if (key != null) {
    return key;
  }
  return isNonblank(ungroupedLabel) ? ungroupedLabel : DATA_TABLE_DEFAULT_UNGROUPED_LABEL;
}

/**
 * The section header cell's content. Calls `renderGroupHeader` once; falls
 * back to the default label when it is omitted or returns empty content.
 * `rendererReturnedEmpty` feeds the `group:empty-header` diagnostic.
 */
export function resolveGroupHeaderContent<Row>(
  info: DataTableGroupHeaderInfo<Row>,
  grouping: Pick<DataTableGrouping<Row>, 'renderGroupHeader' | 'ungroupedLabel'>
): { readonly content: ReactNode; readonly rendererReturnedEmpty: boolean } {
  const fallback = defaultGroupLabel(info.key, grouping.ungroupedLabel);
  if (grouping.renderGroupHeader == null) {
    return { content: fallback, rendererReturnedEmpty: false };
  }
  const rendered = grouping.renderGroupHeader(info);
  if (isEmptyGroupHeaderContent(rendered)) {
    return { content: fallback, rendererReturnedEmpty: true };
  }
  return { content: rendered, rendererReturnedEmpty: false };
}
