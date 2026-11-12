import React, { useState } from 'react';

import type { AccessibilityProps } from './utils/accessibility';
import {
  isEmptyAmountValue,
  toAmountDisplayText,
  toAmountFormValue,
} from './utils/decimalValidation';

import { Input } from '../ui/input';

/**
 * The parts of react-hook-form's `field` the exact input uses. `Controller`'s
 * `ControllerRenderProps` is assignable to it.
 */
export interface AmountFieldExactInputField {
  readonly name: string;
  readonly value: unknown;
  readonly onChange: (value: string) => void;
  readonly onBlur: () => void;
  readonly ref: React.Ref<HTMLInputElement>;
}

/** Props for the exact-entry input. Everything shared with default mode comes from AmountField. */
export interface AmountFieldExactInputProps {
  readonly field: AmountFieldExactInputField;
  readonly id: string;
  readonly placeholder?: string;
  /** Effective grouping flag, already reduced to a boolean by AmountField (INV-7). */
  readonly allowGrouping: boolean;
  /** Validation and symbol padding classes, computed by AmountField (INV-3). */
  readonly className: string;
  /** `getAccessibilityProps` output, computed by AmountField (INV-3, INV-29). */
  readonly accessibilityProps: AccessibilityProps;
}

interface ExactInputState {
  /** What the input shows. Only user edits, Escape and outside writes change it. */
  readonly text: string;
  /** The last form value this input wrote or adopted; a mismatch means an outside write. */
  readonly seen: unknown;
}

/** Any non-primitive compares equal to any other: they all display as '' (A-5). */
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

function stateFromValue(value: unknown): ExactInputState {
  return { text: toAmountDisplayText(value), seen: value };
}

/**
 * Internal exact-entry input for AmountField (`formatOnBlur={false}`).
 *
 * Owns the display text so it is never rewritten: no keystroke filter, nothing on blur,
 * no formatting. Each edit writes `toAmountFormValue(text)` (commas removed from valid
 * text, raw text otherwise). A value written from outside (`reset`, `setValue`, late
 * `defaultValues`, a `name` change) is adopted during render, so no stale frame commits,
 * and adopting never writes back. No effects, timers or listeners (INV-26).
 *
 * Not exported from any barrel.
 */
export function AmountFieldExactInput({
  field,
  id,
  placeholder,
  allowGrouping,
  className,
  accessibilityProps,
}: AmountFieldExactInputProps): React.ReactElement {
  const [state, setState] = useState<ExactInputState>(() => stateFromValue(field.value));

  // INV-5 / INV-22: adopt an outside write in this render. Only local state changes;
  // field.onChange is never called here (INV-18). Converges: the next render compares equal.
  let { text } = state;
  if (!Object.is(resyncKey(field.value), resyncKey(state.seen))) {
    const adopted = stateFromValue(field.value);
    setState(adopted);
    text = adopted.text;
  }

  // INV-4 / INV-19: keep the whole edit and write exactly once. No filter, no early return.
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const nextText = event.target.value;
    const nextValue = toAmountFormValue(nextText, allowGrouping);
    setState({ text: nextText, seen: nextValue });
    field.onChange(nextValue);
  };

  // INV-20: blur only marks the field touched.
  const handleBlur = (): void => {
    field.onBlur();
  };

  // INV-21: Escape clears to '' (never reverts); on an empty field it blurs. Every other
  // key, arrows included, keeps the browser's text-editing behaviour.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    // A-4: a value that displays as '' (an unsupported type) still counts as non-empty.
    if (text !== '' || !isEmptyAmountValue(field.value)) {
      setState({ text: '', seen: '' });
      field.onChange('');
    } else {
      event.currentTarget.blur();
    }
  };

  // Same attributes, in the same order, as the default-mode input (INV-3).
  return (
    <Input
      name={field.name}
      ref={field.ref}
      id={id}
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={text}
      className={className}
      data-slot="input"
      {...accessibilityProps}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
}
