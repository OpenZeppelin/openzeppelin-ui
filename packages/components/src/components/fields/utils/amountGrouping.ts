/**
 * Display grouping for AmountField's exact-entry mode with `groupedDisplay`.
 *
 * Internal module: deliberately NOT re-exported from `utils/index.ts`, because
 * `fields/index.ts` re-exports `utils/*` and every helper here would become public
 * API.
 *
 * Nothing in this file converts text to a JS number or uses a locale API. Grouping
 * only inserts `,` characters, so every digit survives at any length.
 */
import {
  fractionDigits,
  GROUPED_AMOUNT_PATTERN,
  isValidAmountText,
  PLAIN_AMOUNT_PATTERN,
} from './decimalValidation';

const GROUP_SIZE = 3;

/**
 * Display form of a plain amount: `,` between groups of three integer digits
 * (`250000.00` → `250,000.00`). The sign, every digit, the fraction and a trailing
 * `.` are kept as given.
 *
 * Returns `text` unchanged when it is not a plain amount, when the integer part has
 * fewer than four digits, or when the integer part starts with `0` (`000123.450`:
 * the grouped grammar has no form for it).
 *
 * Total, never throws, and linear: one slice per group. Whenever the result differs
 * from `text` it matches the grouped grammar, and removing its commas gives `text`.
 */
export function groupAmountText(text: string): string {
  if (!PLAIN_AMOUNT_PATTERN.test(text)) return text;

  const intStart = text.startsWith('-') ? 1 : 0;
  const point = text.indexOf('.');
  const intEnd = point === -1 ? text.length : point;
  const intLength = intEnd - intStart;
  if (intLength <= GROUP_SIZE || text[intStart] === '0') return text;

  // The first group takes the 1 to 3 digits left over, and carries the sign.
  const firstGroupEnd = intStart + (intLength % GROUP_SIZE || GROUP_SIZE);
  const groups = [text.slice(0, firstGroupEnd)];
  for (let at = firstGroupEnd; at < intEnd; at += GROUP_SIZE) {
    groups.push(text.slice(at, at + GROUP_SIZE));
  }
  return groups.join(',') + text.slice(intEnd);
}

/**
 * Offset in the plain text for an offset in a displayed (possibly grouped) text: the
 * offset minus the commas before it, so the characters left of the caret are the
 * same in both texts.
 *
 * Total over `number`: the offset is clamped to `[0, displayed.length]`, a fractional
 * one is floored, and `NaN` maps to `0`.
 */
export function toPlainOffset(displayed: string, offset: number): number {
  // `!(offset > 0)` also catches NaN.
  if (!(offset > 0)) return 0;
  const end = offset >= displayed.length ? displayed.length : offset - (offset % 1);
  let commas = 0;
  for (let at = 0; at < end; at += 1) {
    if (displayed[at] === ',') commas += 1;
  }
  return end - commas;
}

/**
 * True for a string that matches the grouped grammar (`250,000.00`). These are the
 * only values the grouped input rewrites. Checks the type first and never coerces, so
 * a number, a bigint or an object is `false` without being converted.
 */
export function isGroupedAmountValue(value: unknown): value is string {
  return typeof value === 'string' && GROUPED_AMOUNT_PATTERN.test(value);
}

/**
 * Whether `text` is allowed under `restrictInput`: empty, or the same amount grammar
 * the field validates (plain or grouped), with no more fraction digits than `decimals`.
 * A misconfigured `decimals` only enforces the grammar, so the existing validation
 * message still owns the failure.
 */
export function isAllowedRestrictedAmountText(text: string, decimals: number): boolean {
  if (text === '') return true;
  if (!isValidAmountText(text, true)) return false;
  if (!Number.isSafeInteger(decimals) || decimals < 0) return true;
  return fractionDigits(text.replace(/,/g, '')) <= decimals;
}

/**
 * Unfocused display when `padDecimals` is on: pad the fraction of a plain amount to
 * `decimals` places, then group. Leaves the text alone (still grouped when it can be)
 * when it is not plain, when it already has more fraction digits than `decimals` so an
 * over-decimal error stays visible, or when `decimals` is unusable.
 */
export function groupPaddedAmountText(plain: string, decimals: number): string {
  if (!Number.isSafeInteger(decimals) || decimals < 0) return groupAmountText(plain);
  if (!PLAIN_AMOUNT_PATTERN.test(plain)) return plain;
  if (fractionDigits(plain) > decimals) return groupAmountText(plain);

  const point = plain.indexOf('.');
  let padded: string;
  if (decimals === 0) {
    // Strip a trailing empty fraction (`5.` → `5`); never invent a point.
    padded = point === -1 ? plain : plain.slice(0, point);
  } else if (point === -1) {
    padded = `${plain}.${'0'.repeat(decimals)}`;
  } else {
    const frac = plain.slice(point + 1);
    padded = `${plain.slice(0, point + 1)}${frac.padEnd(decimals, '0')}`;
  }
  return groupAmountText(padded);
}
