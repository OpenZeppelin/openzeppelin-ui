/**
 * `validateExactAmount` as it was before `validation.messages` could word exact-mode errors
 * (code at 271efee34), copied so the replay tests compare the new function with what
 * consumers had, not with the new function's own defaults.
 *
 * The texts are written out as literals instead of importing the constants, so a changed
 * constant fails the replay too. The grammar and decimal helpers are imported: they are not
 * part of this change, and their own suites pin them.
 *
 * Test fixture only; never exported from the package. Kept free of `vitest` imports.
 */
import {
  classifyAmountText,
  compareDecimalStrings,
  fractionDigits,
  numberToDecimalString,
  PLAIN_AMOUNT_PATTERN,
  type AmountTextIssue,
} from '../utils/decimalValidation';

/** The seven grammar texts at 271efee34. */
export const BASELINE_ISSUE_TEXTS: Readonly<Record<AmountTextIssue, string>> = {
  incomplete: 'Please enter a complete number',
  exponent: 'Scientific notation is not supported',
  'multiple-points': 'Only one decimal point is allowed',
  'grouping-not-allowed': 'Grouping separators (,) are not allowed',
  'grouping-malformed': 'Use , only between groups of three digits, e.g. 1,234,567.89',
  'grouping-unnormalized': 'Remove the , separators from this value',
  invalid: 'Enter digits, an optional leading - and one . for decimals',
};

export const BASELINE_REQUIRED_TEXT = 'This field is required';
export const BASELINE_GENERIC_TEXT = 'Enter a valid amount';
export const BASELINE_MISCONFIGURED_TEXT = 'Amount limit is misconfigured';

/** The options the function took at 271efee34 (no message options besides `requiredMessage`). */
export interface BaselineExactOptions {
  readonly required: boolean;
  readonly allowGrouping: boolean;
  readonly decimals: number;
  readonly min?: number | string;
  readonly max?: number | string;
  readonly validateAmount?: (value: string) => boolean | string;
  readonly requiredMessage?: string;
}

type Coerced =
  | { readonly kind: 'empty' }
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'unsupported' };

function coerce(value: unknown): Coerced {
  if (value === undefined || value === null || value === '') return { kind: 'empty' };
  switch (typeof value) {
    case 'string':
      return { kind: 'text', text: value };
    case 'number': {
      const decimal = numberToDecimalString(value);
      return decimal === null ? { kind: 'unsupported' } : { kind: 'text', text: decimal };
    }
    case 'bigint':
      return { kind: 'text', text: value.toString() };
    default:
      return { kind: 'unsupported' };
  }
}

function boundToDecimalString(bound: unknown): string | null {
  if (typeof bound === 'number') return numberToDecimalString(bound);
  if (typeof bound === 'string' && PLAIN_AMOUNT_PATTERN.test(bound)) return bound;
  return null;
}

/** The 271efee34 rule, step for step. */
export function baselineValidateExactAmount(
  value: unknown,
  opts: BaselineExactOptions
): true | string {
  const coerced = coerce(value);
  if (coerced.kind === 'empty') {
    return opts.required ? (opts.requiredMessage ?? BASELINE_REQUIRED_TEXT) : true;
  }
  if (coerced.kind === 'unsupported') return BASELINE_GENERIC_TEXT;
  const amount = coerced.text;

  if (!PLAIN_AMOUNT_PATTERN.test(amount)) {
    return BASELINE_ISSUE_TEXTS[classifyAmountText(amount, opts.allowGrouping)];
  }

  const { decimals } = opts;
  if (!Number.isSafeInteger(decimals) || decimals < 0) return BASELINE_MISCONFIGURED_TEXT;
  if (fractionDigits(amount) > decimals) return `Use at most ${decimals} decimal places`;

  if (opts.min !== undefined) {
    const min = boundToDecimalString(opts.min);
    if (min === null) return BASELINE_MISCONFIGURED_TEXT;
    if (compareDecimalStrings(amount, min) < 0) return `Value must be at least ${min}`;
  }
  if (opts.max !== undefined) {
    const max = boundToDecimalString(opts.max);
    if (max === null) return BASELINE_MISCONFIGURED_TEXT;
    if (compareDecimalStrings(amount, max) > 0) return `Value must be at most ${max}`;
  }

  if (opts.validateAmount) {
    const result: unknown = opts.validateAmount(amount);
    if (result === true) return true;
    return typeof result === 'string' && result !== '' ? result : BASELINE_GENERIC_TEXT;
  }
  return true;
}
