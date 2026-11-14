import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  groupAmountText,
  groupPaddedAmountText,
  isAllowedRestrictedAmountText,
  isGroupedAmountValue,
  toPlainOffset,
} from './utils/amountGrouping';
import {
  isEmptyAmountValue,
  toAmountDisplayText,
  toAmountFormValue,
} from './utils/decimalValidation';

import { Input } from '../ui/input';
import type { AmountFieldExactInputProps } from './AmountFieldExactInput';

/** Props for the grouped exact-entry input. Grouping is always on here, so the flag is not a prop. */
export type AmountFieldGroupedExactInputProps = Omit<
  AmountFieldExactInputProps,
  'allowGrouping'
> & {
  /** Field `decimals`; used by `restrictInput` and `padDecimals`. @default 2 */
  readonly decimals?: number;
  /**
   * Refuse inserts that break the amount grammar or exceed `decimals`. Deletes
   * (Backspace, Delete, selection-clear) always apply. Off by default.
   */
  readonly restrictInput?: boolean;
  /**
   * Pad the unfocused grouped display to `decimals` places (`123000` → `123,000.00`).
   * Focused editable text stays unpadded plain. Off by default.
   */
  readonly padDecimals?: boolean;
};

interface GroupedExactInputState {
  /**
   * The plain-side text. While the field is being edited it is exactly what the user
   * has; otherwise it is canonical (commas removed when valid).
   */
  readonly text: string;
  /** The last form value this input wrote or adopted; a mismatch means an outside write. */
  readonly seen: unknown;
  /** True between a focus event on the input and its next real blur. */
  readonly focused: boolean;
}

/** A selection to apply once the plain text has replaced the grouped text. */
interface PendingSelection {
  readonly el: HTMLInputElement;
  readonly start: number;
  readonly end: number;
}

/** Any non-primitive compares equal to any other: they all display as ''. */
const NON_PRIMITIVE = Symbol('non-primitive amount value');

/**
 * Comparison key for the resync. react-hook-form clones object values on every
 * change notification, so comparing references could adopt an equal object again.
 */
function resyncKey(value: unknown): unknown {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
    ? NON_PRIMITIVE
    : value;
}

/** Commas removed when `text` is a valid amount; `text` itself otherwise. */
function canonical(text: string): string {
  return toAmountFormValue(text, true);
}

/**
 * True when `next` is `prev` with one contiguous run of characters removed (Backspace,
 * Delete, or clearing a selection). Inserts and replacements that add characters are
 * not deletions, even when the result is shorter.
 */
function isPureDeletion(prev: string, next: string): boolean {
  if (next.length >= prev.length) return false;
  let left = 0;
  while (left < next.length && next[left] === prev[left]) left += 1;
  let right = 0;
  while (
    right < next.length - left &&
    next[next.length - 1 - right] === prev[prev.length - 1 - right]
  ) {
    right += 1;
  }
  return left + right === next.length;
}

/**
 * Internal exact-entry input for AmountField with `groupedDisplay` (and
 * `allowGrouping`).
 *
 * Shows the value with `,` thousands groups while it is not being edited and plain
 * while it is. The commas are display only: every edit writes the text with commas
 * removed when valid (raw text otherwise), exactly as the plain exact input does, and
 * invalid text is shown as given in both states.
 *
 * A validly grouped string written from outside (`defaultValues`, `reset`,
 * `setValue`) is stored plain by one extra write after commit. That is the only write
 * that is not a user edit or Escape, and it never happens on a read-only or disabled
 * field, which stays grouped on focus.
 *
 * Optional `restrictInput` refuses inserts that break the amount grammar or exceed
 * `decimals`, and always accepts deletes. Optional `padDecimals` pads the unfocused
 * grouped display to `decimals` places; focused editable text stays unpadded.
 *
 * Not exported from any barrel.
 */
export function AmountFieldGroupedExactInput({
  field,
  id,
  placeholder,
  className,
  accessibilityProps,
  readOnlyState,
  startAdornment,
  endAdornment,
  decimals = 2,
  restrictInput = false,
  padDecimals = false,
}: AmountFieldGroupedExactInputProps): React.ReactElement {
  const [state, setState] = useState<GroupedExactInputState>(() => ({
    text: canonical(toAmountDisplayText(field.value)),
    seen: field.value,
    focused: false,
  }));
  // Never read during render.
  const pendingSelection = useRef<PendingSelection | null>(null);
  // Last accepted selection; used only when an onChange refuses an insert after the
  // browser has already mutated the DOM.
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const isDisabled = !!readOnlyState.controlProps.disabled;
  const editable = !readOnlyState.isFocusableReadOnly && !isDisabled;

  // Settle local state in this render, so no stale frame commits. Only local state
  // changes; the form value is never written here. Converges: the next render compares equal.
  let current = state;
  if (!Object.is(resyncKey(field.value), resyncKey(current.seen))) {
    // An outside write. Focus is kept: a reset while focused shows the new value plain.
    current = {
      text: canonical(toAmountDisplayText(field.value)),
      seen: field.value,
      focused: current.focused,
    };
  }
  if (current.focused && isDisabled) {
    // A disabled control gets no blur event, so the edit session ends here.
    current = { text: canonical(current.text), seen: current.seen, focused: false };
  }
  if (current !== state) setState(current);

  const { text } = current;
  const showPlain = current.focused && editable;
  // Derived on every render and never stored, so it cannot drift from the text.
  const display = showPlain
    ? text
    : padDecimals
      ? groupPaddedAmountText(canonical(text), decimals)
      : groupAmountText(canonical(text));

  // Store a validly grouped outside value plain. There is deliberately no dependency
  // list: react-hook-form can re-apply `useForm({ values })` after this effect has run,
  // without the value this component sees changing, so the check has to run after
  // every commit. The written value has no comma, so it settles on the next commit.
  // Value and onChange come from the same render's `field`, so a `name` change can
  // never send one path's value to another.
  useEffect(() => {
    if (editable && isGroupedAmountValue(field.value)) {
      field.onChange(canonical(field.value));
    }
  });

  // Apply the selection recorded on focus, now that the plain text is in the DOM (a
  // selection set inside the focus handler would land on the grouped text). Applied
  // at most once, and only while the input still has focus, so it never pulls focus back.
  useLayoutEffect(() => {
    const pending = pendingSelection.current;
    if (pending === null) return;
    pendingSelection.current = null;
    if (pending.el.ownerDocument.activeElement === pending.el) {
      pending.el.setSelectionRange(pending.start, pending.end);
      selectionRef.current = { start: pending.start, end: pending.end };
    }
  });

  const rememberSelection = (el: HTMLInputElement): void => {
    if (el.selectionStart !== null && el.selectionEnd !== null) {
      selectionRef.current = { start: el.selectionStart, end: el.selectionEnd };
    }
  };

  // Focus swaps grouped for plain. Local state only: nothing is written or validated.
  const handleFocus = (event: React.FocusEvent<HTMLInputElement>): void => {
    const el = event.currentTarget;
    const { selectionStart, selectionEnd } = el;
    // Replacing the text would drop the browser's selection (Tab selects everything),
    // so map it onto the plain text. With no commas shown there is nothing to map.
    if (editable && display !== text && selectionStart !== null && selectionEnd !== null) {
      pendingSelection.current = {
        el,
        start: toPlainOffset(display, selectionStart),
        end: toPlainOffset(display, selectionEnd),
      };
    }
    setState((prev) => (prev.focused ? prev : { ...prev, focused: true }));
  };

  // Refuse illegal inserts before the DOM changes so the caret stays put. Deletes and
  // history undo/redo always pass; onChange is the safety net for anything else.
  const handleBeforeInput = (event: React.FormEvent<HTMLInputElement>): void => {
    if (!restrictInput || !editable) return;
    const native = event.nativeEvent as InputEvent;
    const inputType = native.inputType ?? '';
    if (
      inputType.startsWith('delete') ||
      inputType === 'historyUndo' ||
      inputType === 'historyRedo'
    ) {
      return;
    }
    if (native.data === null) return;
    const el = event.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const next = `${el.value.slice(0, start)}${native.data}${el.value.slice(end)}`;
    if (!isAllowedRestrictedAmountText(next, decimals)) {
      event.preventDefault();
    }
  };

  // Keep the whole edit and write exactly once. With restrictInput, pure deletions
  // always land; other edits must pass the grammar and decimals check.
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const nextText = event.target.value;
    if (
      restrictInput &&
      !isPureDeletion(text, nextText) &&
      !isAllowedRestrictedAmountText(nextText, decimals)
    ) {
      const el = event.target;
      el.value = display;
      const { start, end } = selectionRef.current;
      el.setSelectionRange(start, end);
      return;
    }
    const nextValue = canonical(nextText);
    // The user has moved on; a late selection would move their caret.
    pendingSelection.current = null;
    rememberSelection(event.target);
    setState((prev) => ({
      // An edit that arrives without focus (autofill, a drop) is not an edit session,
      // so its text is stored canonical like any other unfocused text.
      text: prev.focused ? nextText : nextValue,
      seen: nextValue,
      focused: prev.focused,
    }));
    field.onChange(nextValue);
  };

  // Blur marks the field touched and never writes the form value.
  const handleBlur = (event: React.FocusEvent<HTMLInputElement>): void => {
    const el = event.currentTarget;
    // When the window loses focus the input stays the active element. Regrouping
    // then would drop the user's selection, and a paste on return would append to the
    // amount instead of replacing it. So only a blur that moves focus ends the session.
    if (el.ownerDocument.activeElement !== el) {
      pendingSelection.current = null;
      setState((prev) => {
        const settled = canonical(prev.text);
        return !prev.focused && settled === prev.text
          ? prev
          : { text: settled, seen: prev.seen, focused: false };
      });
    }
    field.onBlur();
  };

  // Escape clears to '' (never reverts); on an empty field it blurs. Every other
  // key, arrows included, keeps the browser's text-editing behaviour.
  // In readonly mode Escape neither clears nor blurs, and is not preventDefault-ed.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Escape' || readOnlyState.isFocusableReadOnly) return;
    event.preventDefault();
    // A value that displays as '' (an unsupported type) still counts as non-empty.
    if (text !== '' || !isEmptyAmountValue(field.value)) {
      setState((prev) => ({ text: '', seen: '', focused: prev.focused }));
      field.onChange('');
    } else {
      event.currentTarget.blur();
    }
  };

  // Same attributes, in the same order, as the plain exact input, plus onFocus.
  return (
    <Input
      name={field.name}
      ref={field.ref}
      id={id}
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={display}
      className={className}
      data-slot="input"
      {...accessibilityProps}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBeforeInput={handleBeforeInput}
      onSelect={(event) => rememberSelection(event.currentTarget)}
      {...readOnlyState.controlProps}
      startAdornment={startAdornment}
      endAdornment={endAdornment}
    />
  );
}
