/* eslint-disable react-refresh/only-export-components -- test-only harness; Fast Refresh does not apply */
/**
 * Chips mode test harness: consumers that apply, refuse or delay a removal, two instances
 * side by side, and DOM lookups scoped to one instance's root.
 */
import * as React from 'react';

import { SearchableMultiSelect, type SearchableMultiSelectProps } from '../index';
import { COUNTRIES, countryId, countryLabel, type Country } from './helpers';

export const CHIP_SLOT = '[data-slot="searchable-multi-select-chip"]';
export const REMOVE_SLOT = '[data-slot="searchable-multi-select-chip-remove"]';
export const LIST_SLOT = '[data-slot="searchable-multi-select-chips"]';
export const STATUS_SLOT = '[data-slot="searchable-multi-select-chips-status"]';
export const ROOT_SLOT = '[data-slot="searchable-multi-select"]';

function must<E>(el: E | null | undefined, what: string): E {
  if (el === null || el === undefined) throw new Error(`expected ${what} in the DOM`);
  return el;
}

/** Lookups inside one chips-mode root (default: the first on the page). */
export const chips = {
  root: (index = 0): HTMLElement =>
    must(document.querySelectorAll<HTMLElement>(ROOT_SLOT)[index], `chips root #${index}`),
  list: (root: ParentNode = chips.root()): HTMLUListElement | null =>
    root.querySelector<HTMLUListElement>(LIST_SLOT),
  labels: (root: ParentNode = chips.root()): string[] =>
    Array.from(root.querySelectorAll<HTMLElement>(CHIP_SLOT)).map((li) => li.textContent ?? ''),
  removes: (root: ParentNode = chips.root()): HTMLButtonElement[] =>
    Array.from(root.querySelectorAll<HTMLButtonElement>(REMOVE_SLOT)),
  remove: (label: string, root: ParentNode = chips.root()): HTMLButtonElement => {
    const found = chips
      .removes(root)
      .filter((b) => b.getAttribute('aria-label') === `Remove ${label}`);
    if (found.length !== 1) throw new Error(`expected one "Remove ${label}", got ${found.length}`);
    return found[0] as HTMLButtonElement;
  },
  status: (root: ParentNode = chips.root()): HTMLElement =>
    must(root.querySelector<HTMLElement>(STATUS_SLOT), 'chips status'),
  trigger: (root: ParentNode = chips.root()): HTMLButtonElement =>
    must(
      root.querySelector<HTMLButtonElement>('[data-slot="searchable-multi-select-trigger"]'),
      'trigger in chips root'
    ),
  focusedName: (): string | null =>
    document.activeElement?.getAttribute('aria-label') ??
    (document.activeElement === document.body ? '<body>' : (document.activeElement?.id ?? null)),
};

export type ChipsProps = Partial<
  Omit<SearchableMultiSelectProps<Country>, 'selectedIds' | 'onSelectionChange'>
>;

/** What a consumer does with an emitted selection. */
export type Policy = 'apply' | 'ignore' | 'ignore-once' | 'rerender-same' | 'defer';

export interface ConsumerHandle {
  /** Every array `onSelectionChange` received, in order. */
  readonly emits: string[][];
  /** For `defer`: applies the last held emit. */
  apply: () => void;
  /** Sets the selection from outside (a reset or an external update). */
  set: (ids: readonly string[]) => void;
  /** Re-renders with an equal but new `selectedIds` array and new `items` array. */
  churn: () => void;
}

/** A fresh handle; one per test. */
export function newConsumer(): ConsumerHandle {
  return { emits: [], apply: () => {}, set: () => {}, churn: () => {} };
}

/**
 * A consumer that owns `selectedIds` and applies, ignores, re-renders unchanged, or holds each
 * emit until `handle.apply()` (an async consumer).
 */
export function Consumer({
  handle,
  initial = [],
  policy = 'apply',
  items = COUNTRIES,
  labelId = 'chips-label',
  label = 'Countries',
  ...rest
}: ChipsProps & {
  readonly handle: ConsumerHandle;
  readonly initial?: readonly string[];
  readonly policy?: Policy;
  readonly labelId?: string;
  readonly label?: string;
}): React.ReactElement {
  const [ids, setIds] = React.useState<readonly string[]>(initial);
  const [list, setList] = React.useState<readonly Country[]>(items);
  const [, bump] = React.useReducer((n: number) => n + 1, 0);
  const held = React.useRef<string[] | null>(null);
  const ignoredOnce = React.useRef(false);
  handle.apply = () => {
    if (held.current) setIds(held.current);
    held.current = null;
  };
  handle.set = (next) => setIds(next);
  handle.churn = () => {
    setIds((prev) => [...prev]);
    setList((prev) => [...prev]);
  };
  return (
    <>
      <span id={labelId}>{label}</span>
      <SearchableMultiSelect
        aria-labelledby={labelId}
        items={list}
        getItemId={countryId}
        getItemLabel={countryLabel}
        selectedIds={ids}
        showSelected="chips"
        onSelectionChange={(next) => {
          handle.emits.push([...next]);
          if (policy === 'ignore-once' && !ignoredOnce.current) ignoredOnce.current = true;
          else if (policy === 'apply' || policy === 'ignore-once') setIds(next);
          else if (policy === 'rerender-same') bump();
          else if (policy === 'defer') held.current = next;
        }}
        {...rest}
      />
      <input aria-label={`After ${label}`} />
    </>
  );
}
