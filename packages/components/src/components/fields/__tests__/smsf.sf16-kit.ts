/**
 * 005 SF-16 test kit: fixture data, harness handle and DOM lookups for the
 * SearchableMultiSelectField suite. Test fixture only; never exported from the package.
 * artifacts/005-uikit-requests/sf-16-searchable-multi-select-field/03-invariants.md
 */
import type { FieldValues, UseFormReturn } from 'react-hook-form';

export interface Country {
  readonly code: string;
  readonly name: string;
}

/** Item order is deliberately not alphabetical by code, so pick order ≠ item order is visible. */
export const COUNTRIES: readonly Country[] = [
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'BR', name: 'Brazil' },
  { code: 'JP', name: 'Japan' },
];

export const countryId = (c: Country): string => c.code;
export const countryLabel = (c: Country): string => c.name;

/** Field id and form name used by every harness. */
export const FIELD_ID = 'countries';
export const FIELD_NAME = 'countries';

/** What the harness records. One fresh handle per test (F.I.R.S.T. independence). */
export interface FieldHandle {
  api?: UseFormReturn<FieldValues>;
  /** Payloads `handleSubmit` delivered to the success handler, in order. */
  readonly submits: FieldValues[];
  /** Number of invalid submits. */
  invalids: number;
  /** Every native `submit` event on the form element (INV-19). */
  nativeSubmits: number;
}

/** A fresh, empty handle. */
export function newHandle(): FieldHandle {
  return { submits: [], invalids: 0, nativeSubmits: 0 };
}

/** The rendered form's API; throws if the harness has not rendered. */
export function api(handle: FieldHandle): UseFormReturn<FieldValues> {
  if (!handle.api) throw new Error('harness not rendered');
  return handle.api;
}

// ── DOM lookups. Radix hides the trigger from the a11y tree while open, so use ids / data-slot. ──

function must<E>(el: E | null, what: string): E {
  if (el === null) throw new Error(`expected ${what} in the DOM`);
  return el;
}

function bySlot<E extends Element>(slot: string): E | null {
  return document.querySelector<E>(`[data-slot="searchable-multi-select-${slot}"]`);
}

export const q = {
  trigger: (id = FIELD_ID): HTMLButtonElement =>
    must(document.getElementById(id) as HTMLButtonElement | null, `#${id}`),
  label: (id = FIELD_ID): HTMLLabelElement | null =>
    document.getElementById(`${id}-label`) as HTMLLabelElement | null,
  description: (id = FIELD_ID): HTMLElement | null => document.getElementById(`${id}-description`),
  error: (id = FIELD_ID): HTMLElement | null => document.getElementById(`${id}-error`),
  dialog: (): HTMLElement | null => bySlot<HTMLElement>('content'),
  search: (): HTMLInputElement | null => bySlot<HTMLInputElement>('search'),
  listbox: (): HTMLElement | null => bySlot<HTMLElement>('listbox'),
  clear: (): HTMLButtonElement | null => bySlot<HTMLButtonElement>('clear'),
  options: (): HTMLElement[] =>
    Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="searchable-multi-select-option"]')
    ),
  option: (label: string): HTMLElement => {
    const found = q.options().filter((o) => o.textContent === label);
    if (found.length !== 1) throw new Error(`expected one option "${label}", got ${found.length}`);
    return found[0] as HTMLElement;
  },
  /** Option label → aria-selected, in display order. */
  selected: (): Record<string, string | null> =>
    Object.fromEntries(q.options().map((o) => [o.textContent, o.getAttribute('aria-selected')])),
  triggerText: (id = FIELD_ID): string => (q.trigger(id).textContent ?? '').trim(),
};

/**
 * INV-3: every token in the trigger's aria-describedby names exactly one element with
 * non-empty text. Returns the problems (empty = all good).
 */
export function danglingDescribedBy(id = FIELD_ID): string[] {
  const value = q.trigger(id).getAttribute('aria-describedby');
  if (value === null) return [];
  const problems: string[] = [];
  for (const token of value.split(/\s+/).filter(Boolean)) {
    const hits = document.querySelectorAll(`[id="${token}"]`);
    if (hits.length !== 1) problems.push(`${token} resolves to ${hits.length}`);
    else if (!(hits[0]?.textContent ?? '').trim()) problems.push(`${token} has no text`);
  }
  return problems;
}

/** INV-23 baseline: what Radix's modal layer may touch on the page. */
export function pageSnapshot(): { bodyStyle: string; ariaHidden: number; dataAriaHidden: number } {
  return {
    bodyStyle: document.body.style.cssText,
    ariaHidden: document.querySelectorAll('[aria-hidden="true"]:not(svg)').length,
    dataAriaHidden: document.querySelectorAll('[data-aria-hidden]').length,
  };
}

/** Reference model of SF-15 `toggleId` (INV-8): append, remove every copy in place. */
export function modelToggle(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

/** Deterministic PRNG (mulberry32) for the seeded property test. No new dependency. */
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
