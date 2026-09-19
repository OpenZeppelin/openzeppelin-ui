import type {
  DataTableColumn,
  DataTableSortDirection,
  DataTableSortState,
  DataTableSortValue,
} from './types';

/** Closed tag order for mixed non-missing kinds (INV-93). */
const SORT_KIND_RANK = {
  boolean: 0,
  number: 1,
  bigint: 2,
  date: 3,
  string: 4,
} as const;

type SortKind = keyof typeof SORT_KIND_RANK;

/** INV-11: affordance and chrome gate on the boolean, not on `getSortValue`. */
export function isColumnSortable<Row>(column: DataTableColumn<Row>): boolean {
  return column.sortable === true;
}

/**
 * INV-70: `null` / other column → asc; same column asc → desc; same column desc → clear.
 */
export function nextSortState(
  current: DataTableSortState | null,
  columnId: string
): DataTableSortState | null {
  if (current == null || current.columnId !== columnId) {
    return { columnId, direction: 'asc' };
  }
  if (current.direction === 'asc') {
    return { columnId, direction: 'desc' };
  }
  return null;
}

/**
 * INV-67: unknown or unsortable `columnId` paints and reorders as if sort were `null`.
 * Duplicate ids: first match in `columns` wins.
 */
export function resolveEffectiveSort<Row>(
  sort: DataTableSortState | null,
  columns: readonly DataTableColumn<Row>[]
): DataTableSortState | null {
  if (sort == null) {
    return null;
  }
  const column = columns.find((candidate) => candidate.id === sort.columnId);
  if (column == null || !isColumnSortable(column)) {
    return null;
  }
  return sort;
}

function isMissingSortValue(value: DataTableSortValue): boolean {
  if (value == null) {
    return true;
  }
  if (typeof value === 'number' && Number.isNaN(value)) {
    return true;
  }
  if (value instanceof Date && Number.isNaN(value.getTime())) {
    return true;
  }
  return false;
}

function isPresentSortValue(
  value: DataTableSortValue
): value is string | number | bigint | boolean | Date {
  return !isMissingSortValue(value);
}

function sortKindOf(value: string | number | bigint | boolean | Date): SortKind {
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  if (typeof value === 'number') {
    return 'number';
  }
  if (typeof value === 'bigint') {
    return 'bigint';
  }
  if (typeof value === 'string') {
    return 'string';
  }
  return 'date';
}

function comparePresentAsc(a: string | number | bigint | boolean | Date, b: typeof a): number {
  const kindA = sortKindOf(a);
  const kindB = sortKindOf(b);
  if (kindA !== kindB) {
    return SORT_KIND_RANK[kindA] - SORT_KIND_RANK[kindB];
  }
  switch (kindA) {
    case 'string':
      return (a as string).localeCompare(b as string);
    case 'boolean':
      return Number(a) - Number(b);
    case 'date':
      return (a as Date).getTime() - (b as Date).getTime();
    case 'number':
    case 'bigint': {
      if (a < b) {
        return -1;
      }
      if (a > b) {
        return 1;
      }
      return 0;
    }
  }
}

function withDirection(result: number, direction: DataTableSortDirection): number {
  if (result === 0 || direction === 'asc') {
    return result;
  }
  return -result;
}

/**
 * INV-91 / INV-92 / INV-93: missing always last; same kind natural; mixed kinds by tag order.
 * Never throws.
 */
export function compareSortValues(
  a: DataTableSortValue,
  b: DataTableSortValue,
  direction: DataTableSortDirection
): number {
  const aPresent = isPresentSortValue(a);
  const bPresent = isPresentSortValue(b);
  if (!aPresent && !bPresent) {
    return 0;
  }
  if (!aPresent) {
    return 1;
  }
  if (!bPresent) {
    return -1;
  }
  return withDirection(comparePresentAsc(a, b), direction);
}

/**
 * INV-68 / INV-76 / INV-77 / INV-79: identity reference unless sortable + getter;
 * Schwartzian decorate (one getter call per row) then stable sort.
 */
export function applyClientSort<Row>(
  rows: readonly Row[],
  columns: readonly DataTableColumn<Row>[],
  sort: DataTableSortState | null
): readonly Row[] {
  const effective = resolveEffectiveSort(sort, columns);
  if (effective == null) {
    return rows;
  }
  const column = columns.find((candidate) => candidate.id === effective.columnId);
  const getSortValue = column?.getSortValue;
  if (getSortValue == null) {
    return rows;
  }

  const decorated = rows.map((row, index) => ({
    row,
    index,
    value: getSortValue(row),
  }));
  decorated.sort((left, right) => {
    const byValue = compareSortValues(left.value, right.value, effective.direction);
    if (byValue !== 0) {
      return byValue;
    }
    return left.index - right.index;
  });
  return decorated.map((entry) => entry.row);
}
