/**
 * 007 SF-3 test kit (no JSX): an independent reference grouper and canonical form, the
 * harness handle with a "no comma ever reaches the valid submit callback" recorder
 * (INV-20), and small DOM helpers. Test fixture only; never exported from the package.
 * Kept free of `vitest` imports so the package `typecheck` compiles it.
 *
 * The references are written separately from `utils/amountGrouping.ts` and
 * `utils/decimalValidation.ts` (own patterns, a right-to-left character walk), so a bug
 * in the kit's grouper or grammar is not shared with its oracle.
 */
import type { FieldErrors, FieldValues } from 'react-hook-form';

import type { HarnessHandle } from './amount-exact.sf10-kit';

/** Plain grammar, restated. */
export const REF_PLAIN = /^-?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)$/;
/** Grouped grammar, restated. */
export const REF_GROUPED = /^-?[1-9][0-9]{0,2}(?:,[0-9]{3})+(?:\.[0-9]*)?$/;

/** `s` with every `,` removed. */
export function strip(s: string): string {
  return s.split(',').join('');
}

/** Commas removed when `t` is a valid amount (plain or grouped); `t` itself otherwise. */
export function refCanonical(t: string): string {
  return REF_PLAIN.test(t) || REF_GROUPED.test(t) ? strip(t) : t;
}

/**
 * Reference grouper: walks the integer digits right to left and puts a `,` before
 * every third one. Leaves alone anything that is not plain, has fewer than four
 * integer digits or has a zero-led integer part.
 */
export function refGroup(t: string): string {
  if (!REF_PLAIN.test(t)) return t;
  const negative = t.charAt(0) === '-';
  const body = negative ? t.slice(1) : t;
  const dot = body.indexOf('.');
  const int = dot < 0 ? body : body.slice(0, dot);
  const rest = dot < 0 ? '' : body.slice(dot);
  if (int.length < 4 || int.charAt(0) === '0') return t;
  let out = '';
  let placed = 0;
  for (let i = int.length - 1; i >= 0; i -= 1) {
    out = int.charAt(i) + out;
    placed += 1;
    if (placed % 3 === 0 && i > 0) out = `,${out}`;
  }
  return `${negative ? '-' : ''}${out}${rest}`;
}

/** The grouped form of a corpus row's plain text, by the reference. */
export function refShownUnfocused(text: string): string {
  return refGroup(refCanonical(text));
}

/** One `field.onChange` call, as seen through react-hook-form's `watch`. */
export interface RecordedWrite {
  readonly name: string;
  readonly value: unknown;
}

export interface GroupedHandle extends HarnessHandle {
  /** Every `field.onChange` call with its field name, in order, from before the field mounts. */
  readonly writes: RecordedWrite[];
  /** Valid-submit payloads that carried a `,` in any string value. Must stay empty (INV-20). */
  readonly commaLeaks: FieldValues[];
}

const openHandles: GroupedHandle[] = [];

/** A fresh handle. Every handle is tracked so `takeCommaLeaks()` can check the whole test. */
export function createGroupedHandle(): GroupedHandle {
  const validCalls: FieldValues[] = [];
  const invalidCalls: FieldErrors[] = [];
  const commaLeaks: FieldValues[] = [];
  const handle: GroupedHandle = {
    api: null,
    commits: [],
    validCalls,
    invalidCalls,
    changeWrites: [],
    writes: [],
    commaLeaks,
    onValid: (values) => {
      const copy = { ...values };
      validCalls.push(copy);
      if (Object.values(copy).some((v) => typeof v === 'string' && v.includes(','))) {
        commaLeaks.push(copy);
      }
    },
    onInvalid: (errors) => {
      invalidCalls.push(errors);
    },
  };
  openHandles.push(handle);
  return handle;
}

/** Comma leaks of every handle created since the last call. Call it in `afterEach`. */
export function takeCommaLeaks(): FieldValues[] {
  const leaks = openHandles.flatMap((h) => h.commaLeaks);
  openHandles.length = 0;
  return leaks;
}

/** Values written to `name` (default: every name), in order. */
export function writesTo(handle: GroupedHandle, name = 'amount'): unknown[] {
  return handle.writes.filter((w) => w.name === name).map((w) => w.value);
}

/** Text of every `role="alert"` under `root`. */
export function alertTexts(root: ParentNode = document): string[] {
  return Array.from(root.querySelectorAll('[role="alert"]')).map((el) => el.textContent ?? '');
}

export const SEPARATOR_MESSAGE = 'Remove the , separators from this value';
export const GROUPING_OFF_MESSAGE = 'Grouping separators (,) are not allowed';

/** Spies and controls for `DirectGroupedInput`, which mounts the grouped input without a form. */
export interface DirectSpies {
  /** Every `field.onChange` argument, in call order. Exact: nothing is deduplicated. */
  readonly onChange: unknown[];
  /** Number of `field.onBlur` calls. */
  onBlur: number;
  /** `field.onChange` call count seen by a sibling's layout and passive effects, per commit. */
  readonly phases: { readonly phase: 'layout' | 'passive'; readonly writes: number }[];
  /** Number of renders of the wrapper (one per committed or strict-doubled render). */
  renders: number;
  /** Writes the value from outside, like `setValue` / `reset`. Set by the wrapper. */
  setOutside: ((value: unknown) => void) | null;
}

/** Fresh spies for one `DirectGroupedInput` mount. */
export function createDirectSpies(): DirectSpies {
  return { onChange: [], onBlur: 0, phases: [], renders: 0, setOutside: null };
}
