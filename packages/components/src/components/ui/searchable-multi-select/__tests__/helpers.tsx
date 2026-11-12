/* eslint-disable react-refresh/only-export-components -- test-only harness; Fast Refresh does not apply */
/**
 * SF-15 · Shared fixtures and DOM helpers for the SearchableMultiSelect suite.
 * artifacts/005-uikit-requests/sf-15-searchable-multi-select/03-invariants.md
 */
import * as React from 'react';

import { SearchableMultiSelect, type SearchableMultiSelectProps } from '../index';
import {
  SearchableSelectCore,
  type OptionState,
  type SearchableSelectCoreProps,
  type TriggerState,
} from '../searchable-select-core';

export interface Country {
  readonly code: string;
  readonly name: string;
}

/** Six countries, including the two "Georgia" entries (INV-14). */
export const COUNTRIES: readonly Country[] = [
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'GE', name: 'Georgia' },
  { code: 'US-GA', name: 'Georgia' },
  { code: 'DE', name: 'Germany' },
  { code: 'IT', name: 'Italy' },
];

export const countryId = (c: Country): string => c.code;
export const countryLabel = (c: Country): string => c.name;

/** Deterministic PRNG (mulberry32) for the seeded generated tables. No new dependency. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type ControlledProps = Partial<
  Omit<SearchableMultiSelectProps<Country>, 'selectedIds' | 'onSelectionChange'>
> & {
  readonly initial?: readonly string[];
  readonly onChange?: (ids: string[]) => void;
};

/** Stateful consumer: owns `selectedIds`, mirrors them into a readout. */
export function Controlled({
  initial = [],
  onChange,
  items = COUNTRIES,
  ...rest
}: ControlledProps): React.ReactElement {
  const [ids, setIds] = React.useState<readonly string[]>(initial);
  return (
    <>
      <span id="sms-label">Countries</span>
      <SearchableMultiSelect
        aria-labelledby="sms-label"
        items={items}
        getItemId={countryId}
        getItemLabel={countryLabel}
        selectedIds={ids}
        onSelectionChange={(next) => {
          onChange?.(next);
          setIds(next);
        }}
        {...rest}
      />
      <output data-testid="readout">{ids.join(',') || 'None'}</output>
    </>
  );
}

// ── DOM lookups. The trigger is aria-hidden by Radix while open, so use data-slot. ──

function bySlot<E extends Element>(slot: string, root: ParentNode = document): E | null {
  return root.querySelector<E>(`[data-slot="searchable-multi-select-${slot}"]`);
}

function must<E>(el: E | null, what: string): E {
  if (el === null) throw new Error(`expected ${what} in the DOM`);
  return el;
}

export const q = {
  trigger: (root?: ParentNode) =>
    must(bySlot<HTMLButtonElement>('trigger', root), 'trigger') as HTMLButtonElement,
  dialog: () => bySlot<HTMLElement>('content'),
  search: () => must(bySlot<HTMLInputElement>('search'), 'search box'),
  listbox: () => must(bySlot<HTMLElement>('listbox'), 'listbox'),
  status: () => must(bySlot<HTMLElement>('empty'), 'status region'),
  /** The filled selection row (text + Clear all). The empty reserved band is `band()`. */
  summary: () =>
    document.querySelector<HTMLElement>(
      '[data-slot="searchable-multi-select-summary"]:not([data-empty])'
    ),
  /** The empty, aria-hidden band that reserves the row's height at zero selected. */
  band: () =>
    document.querySelector<HTMLElement>(
      '[data-slot="searchable-multi-select-summary"][data-empty]'
    ),
  clear: () => bySlot<HTMLButtonElement>('clear'),
  options: () =>
    Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="searchable-multi-select-option"]')
    ),
  option: (label: string) => {
    const found = q.options().filter((o) => o.textContent === label);
    if (found.length !== 1) throw new Error(`expected one option "${label}", got ${found.length}`);
    return found[0] as HTMLElement;
  },
  active: () => document.querySelectorAll<HTMLElement>('[data-active]'),
  labels: () => q.options().map((o) => o.textContent),
  selectedFlags: () => q.options().map((o) => o.getAttribute('aria-selected')),
};

/** The active option, asserting the INV-26 pairing of `data-active` and `aria-activedescendant`. */
export function activeOptionLabel(): string | null {
  const actives = q.active();
  const ad = q.search().getAttribute('aria-activedescendant');
  if (actives.length > 1) throw new Error(`more than one [data-active]: ${actives.length}`);
  if (actives.length === 0) {
    if (ad !== null) throw new Error(`aria-activedescendant="${ad}" with no [data-active]`);
    return null;
  }
  const active = actives[0] as HTMLElement;
  if (ad !== active.id)
    throw new Error(`aria-activedescendant="${ad}" but [data-active] is #${active.id}`);
  return active.textContent;
}

/**
 * INV-3: every IDREF on a kit-owned element resolves to exactly one element.
 * Returns the dangling / ambiguous references (empty = all good).
 */
export function brokenIdRefs(): string[] {
  const owned = document.querySelectorAll<HTMLElement>(
    '[data-slot^="searchable-multi-select"], [data-slot^="searchable-multi-select"] [role="group"]'
  );
  const problems: string[] = [];
  for (const el of Array.from(owned)) {
    for (const attr of ['aria-controls', 'aria-activedescendant', 'aria-labelledby']) {
      const value = el.getAttribute(attr);
      if (value === null) continue;
      for (const ref of value.split(/\s+/).filter(Boolean)) {
        const hits = Array.from(document.querySelectorAll('[id]')).filter((n) => n.id === ref);
        if (hits.length !== 1) problems.push(`${attr}="${ref}" resolves to ${hits.length}`);
      }
    }
  }
  return problems;
}

/** INV-36 baseline: what Radix's modal layer may touch on the page. */
export function pageSnapshot(): {
  bodyAttrs: string;
  bodyStyle: string;
  ariaHidden: number;
  dataAriaHidden: number;
} {
  return {
    // An emptied `style=""` left behind is harmless; compare the declarations instead.
    bodyAttrs: document.body
      .getAttributeNames()
      .filter((n) => n !== 'style' || document.body.style.cssText !== '')
      .sort()
      .join(','),
    bodyStyle: document.body.style.cssText,
    ariaHidden: document.querySelectorAll('[aria-hidden="true"]').length,
    dataAriaHidden: document.querySelectorAll('[data-aria-hidden]').length,
  };
}

// ── Core harness (internal capabilities kept for SF-17) ──

export interface Net {
  readonly id: string;
  readonly name: string;
  readonly group?: string;
  readonly off?: boolean;
}

export type CoreHarnessProps = Partial<
  Omit<SearchableSelectCoreProps<Net>, 'isSelected' | 'onActivate' | 'renderTrigger'>
> & {
  readonly items: readonly Net[];
  readonly onActivate?: (item: Net) => void;
  readonly initial?: readonly string[];
  readonly renderTrigger?: (state: TriggerState) => React.ReactElement;
};

/** A ref-forwarding custom trigger (React 19 ref-as-prop), spreading Radix props (OQ-4). */
export function CustomTrigger({
  ref,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly ref?: React.Ref<HTMLButtonElement>;
}): React.ReactElement {
  return (
    <button ref={ref} type="button" data-testid="custom-trigger" {...props}>
      Pick network
    </button>
  );
}

/** Core in multi or single mode, with a local selection toggled on activate. */
export function CoreHarness({
  items,
  onActivate,
  initial = [],
  multiple = true,
  renderTrigger,
  ...rest
}: CoreHarnessProps): React.ReactElement {
  const [ids, setIds] = React.useState<readonly string[]>(initial);
  const selected = React.useMemo(() => new Set(ids), [ids]);
  return (
    <SearchableSelectCore<Net>
      items={items}
      getItemId={(n) => n.id}
      getItemLabel={(n) => n.name}
      isItemDisabled={(n) => n.off === true}
      multiple={multiple}
      isSelected={(n) => selected.has(n.id)}
      onActivate={(n) => {
        onActivate?.(n);
        setIds((prev) => (prev.includes(n.id) ? prev.filter((x) => x !== n.id) : [...prev, n.id]));
      }}
      renderTrigger={
        renderTrigger ??
        (({ triggerAria }) => <CustomTrigger aria-label="Network" {...triggerAria} />)
      }
      searchPlaceholder="Search networks"
      searchLabel="Search networks"
      emptyText="No networks"
      listName={{ 'aria-label': 'Networks' }}
      {...rest}
    />
  );
}

export type { OptionState };
