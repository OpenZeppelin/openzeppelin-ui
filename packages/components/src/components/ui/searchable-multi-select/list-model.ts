/**
 * Pure list model for the searchable select core. No React.
 *
 * Turns `items` + `query` into the rendered option groups and the flat
 * keyboard order, and provides the enabled-option navigation helpers.
 * Internal: not exported from the package barrel.
 */

/** One rendered option. */
export interface ListOption<T> {
  readonly item: T;
  /** `getItemId(item)`. */
  readonly id: string;
  /** `getItemLabel(item)`. */
  readonly label: string;
  /** Index in `items`. Drives the DOM id, so it is stable across filtering. */
  readonly sourceIndex: number;
  readonly disabled: boolean;
}

/** A run of options under one group key. */
export interface ListGroup<T> {
  /** `null` = ungrouped: no group element is rendered. */
  readonly key: string | null;
  readonly options: readonly ListOption<T>[];
}

/** The filtered, grouped list and its keyboard order. */
export interface ListModel<T> {
  readonly groups: readonly ListGroup<T>[];
  /** Groups concatenated: both DOM order and keyboard order. */
  readonly flat: readonly ListOption<T>[];
}

/** Input to {@link buildListModel}. */
export interface ListModelInput<T> {
  readonly items: readonly T[];
  readonly query: string;
  readonly getItemId: (item: T) => string;
  readonly getItemLabel: (item: T) => string;
  readonly filterItem?: (item: T, query: string) => boolean;
  readonly isItemDisabled?: (item: T) => boolean;
  readonly getItemGroup?: (item: T) => string;
}

/**
 * Default match: case-insensitive, literal substring of the label. The query is
 * never trimmed and never treated as a pattern.
 */
function defaultMatches(label: string, query: string): boolean {
  return label.toLowerCase().includes(query.toLowerCase());
}

/**
 * Filter, group and order `items` for the current query.
 *
 * - Empty query keeps every item and never calls `filterItem`.
 * - A non-empty query goes to `filterItem` exactly as typed, else the default match.
 * - Groups appear in the order of their first surviving item; items keep source
 *   order inside a group; empty groups are never produced.
 *
 * Pure: mutates nothing and returns a fresh model.
 */
export function buildListModel<T>(input: ListModelInput<T>): ListModel<T> {
  const { items, query, getItemId, getItemLabel, filterItem, isItemDisabled, getItemGroup } = input;

  const surviving: ListOption<T>[] = [];
  items.forEach((item, sourceIndex) => {
    const label = getItemLabel(item);
    if (query !== '') {
      const matches = filterItem ? filterItem(item, query) : defaultMatches(label, query);
      if (!matches) return;
    }
    surviving.push({
      item,
      id: getItemId(item),
      label,
      sourceIndex,
      disabled: isItemDisabled ? isItemDisabled(item) : false,
    });
  });

  if (!getItemGroup) {
    return {
      groups: surviving.length > 0 ? [{ key: null, options: surviving }] : [],
      flat: surviving,
    };
  }

  // Map keeps insertion order, so groups come out in first-surviving-item order.
  const byKey = new Map<string, ListOption<T>[]>();
  for (const option of surviving) {
    const key = getItemGroup(option.item);
    const bucket = byKey.get(key);
    if (bucket) bucket.push(option);
    else byKey.set(key, [option]);
  }

  const groups: ListGroup<T>[] = [];
  for (const [key, options] of byKey) groups.push({ key, options });
  return { groups, flat: groups.flatMap((group) => group.options) };
}

/** Index of the first enabled option in `flat`, or `-1` if none is enabled. */
export function firstEnabledIndex<T>(flat: readonly ListOption<T>[]): number {
  return flat.findIndex((option) => !option.disabled);
}

/**
 * The next (`step = 1`) or previous (`step = -1`) enabled index from `from`,
 * wrapping at both ends and skipping disabled options.
 *
 * Returns `-1` when no option is enabled, and `from` itself when it is the only
 * enabled option. A `from` of `-1` starts from the first (down) or last (up) slot.
 */
export function stepEnabledIndex<T>(
  flat: readonly ListOption<T>[],
  from: number,
  step: 1 | -1
): number {
  const length = flat.length;
  if (length === 0) return -1;
  const start = from < 0 ? (step === 1 ? -1 : length) : from;
  for (let offset = 1; offset <= length; offset += 1) {
    const index = (((start + step * offset) % length) + length) % length;
    if (!flat[index]?.disabled) return index;
  }
  return -1;
}

/**
 * The selection-order rule. Always returns a new array:
 * - `id` not in `prev` → appended at the end.
 * - `id` in `prev` → every copy removed; other ids keep their positions.
 *
 * Ids in `prev` that match no current item are kept untouched. `prev` is never mutated.
 */
export function toggleId(prev: readonly string[], id: string): string[] {
  return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
}
