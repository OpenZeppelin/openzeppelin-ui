export type DataTableHeaderSelectionState = 'none' | 'some' | 'all';

/** Returns the unique identities in the current body window, preserving row order. */
export function applicableRowKeys<Row>(
  bodyRows: readonly Row[],
  getRowKey: (row: Row) => string
): readonly string[] {
  const keys = new Set<string>();
  for (const row of bodyRows) {
    keys.add(getRowKey(row));
  }
  return [...keys];
}

/** Derives the header state from applicable row identities, never from set sizes. */
export function headerSelectionState(
  selectedKeys: ReadonlySet<string>,
  applicable: readonly string[]
): DataTableHeaderSelectionState {
  let selectedCount = 0;
  for (const key of applicable) {
    if (selectedKeys.has(key)) {
      selectedCount += 1;
    }
  }

  if (selectedCount === 0) {
    return 'none';
  }
  return selectedCount === applicable.length ? 'all' : 'some';
}

/** Returns a new selected-key set with one row identity updated. */
export function nextSetWithRowKey(
  selectedKeys: ReadonlySet<string>,
  key: string,
  selected: boolean
): Set<string> {
  const next = new Set(selectedKeys);
  if (selected) {
    next.add(key);
  } else {
    next.delete(key);
  }
  return next;
}

/** Applies the two-state header action while preserving off-window identities. */
export function nextSetFromHeaderAction(
  selectedKeys: ReadonlySet<string>,
  applicable: readonly string[],
  current: DataTableHeaderSelectionState
): Set<string> {
  const next = new Set(selectedKeys);
  for (const key of applicable) {
    if (current === 'none') {
      next.add(key);
    } else {
      next.delete(key);
    }
  }
  return next;
}
