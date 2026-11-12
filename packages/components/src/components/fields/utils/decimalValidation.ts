/**
 * AmountField's exact decimal helpers, for both modes: exact-entry validation
 * (`formatOnBlur={false}`) and default-mode blur formatting and arrow-key stepping.
 *
 * Internal module: deliberately NOT re-exported from `utils/index.ts`, because
 * `fields/index.ts` re-exports `utils/*` and every helper here would become public
 * API.
 *
 * Nothing in this file converts user text to a JS number. Values stay strings, and
 * comparisons work digit by digit, so no amount passes through a float.
 * Default-mode rounding and stepping use scaled `bigint` integers, which are exact.
 */

/**
 * Plain grammar: the same language as viem's `Value.from` input. Accepts `007`, `.5`,
 * `5.`, `-0`, `-.5`. No `u`/`i` flag, so `[0-9]` stays ASCII-only.
 */
export const PLAIN_AMOUNT_PATTERN = /^-?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)$/;

/**
 * Grouped grammar, used only when grouping is allowed: at least one `,`, a first group
 * of 1–3 digits not starting with `0`, later groups of exactly 3 digits, and an
 * optional fraction without commas. Linear, so no catastrophic backtracking.
 */
export const GROUPED_AMOUNT_PATTERN = /^-?[1-9][0-9]{0,2}(?:,[0-9]{3})+(?:\.[0-9]*)?$/;

/** Why a value is not a plain amount. Each kind has its own message. */
export type AmountTextIssue =
  | 'incomplete' // '-', '.', '-.'
  | 'exponent' // a number written with e / E
  | 'multiple-points' // more than one '.'
  | 'grouping-not-allowed' // contains ',' and grouping is off
  | 'grouping-malformed' // contains ',' and grouping is on, but the groups are wrong
  | 'grouping-unnormalized' // a validly grouped string written from outside the field
  | 'invalid'; // anything else: whitespace, '+', letters, non-ASCII digits…

/** Error message per issue. A `Record` keeps the map exhaustive at compile time. */
export const AMOUNT_TEXT_ISSUE_MESSAGES: Readonly<Record<AmountTextIssue, string>> = {
  incomplete: 'Please enter a complete number',
  exponent: 'Scientific notation is not supported',
  'multiple-points': 'Only one decimal point is allowed',
  'grouping-not-allowed': 'Grouping separators (,) are not allowed',
  'grouping-malformed': 'Use , only between groups of three digits, e.g. 1,234,567.89',
  'grouping-unnormalized': 'Remove the , separators from this value',
  invalid: 'Enter digits, an optional leading - and one . for decimals',
};

export const AMOUNT_REQUIRED_MESSAGE = 'This field is required';
/** Unknown value types and validator results other than `true` / a message. */
export const AMOUNT_GENERIC_MESSAGE = 'Enter a valid amount';
/** A `decimals`, `min` or `max` the field cannot use. Fails closed. */
export const AMOUNT_MISCONFIGURED_MESSAGE = 'Amount limit is misconfigured';

const INCOMPLETE_TEXTS: ReadonlySet<string> = new Set(['-', '.', '-.']);
/**
 * A number written in exponent form (`1e18`, `-1.5E-7`, `1,000e3`): at least one digit
 * before one e / E. The lookahead keeps it linear: a single anchored scan, no nested
 * or adjacent overlapping quantifiers.
 */
const EXPONENT_SHAPE = /^[-+]?(?=[0-9.,]*[0-9])[0-9.,]*[eE][-+]?[0-9]*$/;

/** True when `text` is a valid amount: plain, or grouped when grouping is on. */
export function isValidAmountText(text: string, allowGrouping: boolean): boolean {
  return PLAIN_AMOUNT_PATTERN.test(text) || (allowGrouping && GROUPED_AMOUNT_PATTERN.test(text));
}

/**
 * Form value for a display text: `''` for `''`, the text with commas removed when it
 * is valid, and the raw text otherwise. Only commas are ever removed, and only from
 * valid text, so `isValidAmountText(t) ⇔ PLAIN_AMOUNT_PATTERN.test(result)`.
 */
export function toAmountFormValue(text: string, allowGrouping: boolean): string {
  if (text === '') return '';
  return isValidAmountText(text, allowGrouping) ? text.replace(/,/g, '') : text;
}

/**
 * Classifies a non-empty value that fails `PLAIN_AMOUNT_PATTERN`. Total: returns one
 * issue for any string and never throws. Precedence: incomplete →
 * exponent → multiple-points → grouping → invalid.
 */
export function classifyAmountText(text: string, allowGrouping: boolean): AmountTextIssue {
  if (INCOMPLETE_TEXTS.has(text)) return 'incomplete';
  if (EXPONENT_SHAPE.test(text)) return 'exponent';
  if (text.indexOf('.') !== text.lastIndexOf('.')) return 'multiple-points';
  if (text.includes(',')) {
    if (!allowGrouping) return 'grouping-not-allowed';
    // Only reachable for a grouped string written from outside: a user edit of valid
    // grouped text is already stored without commas.
    return GROUPED_AMOUNT_PATTERN.test(text) ? 'grouping-unnormalized' : 'grouping-malformed';
  }
  return 'invalid';
}

/** Digits after the `.` of a plain amount, counted as typed: `1.500` → 3, `5.` → 0. */
export function fractionDigits(plain: string): number {
  const point = plain.indexOf('.');
  return point === -1 ? 0 : plain.length - point - 1;
}

/**
 * Exact decimal string for a finite JS number, expanding the exponent form `String(n)`
 * uses (`1e+21` → `'1000000000000000000000'`, `1e-7` → `'0.0000001'`). The result is
 * plain and reads back as exactly `n`. `-0` → `'0'`. Returns `null` for `NaN` / `±Infinity`.
 */
export function numberToDecimalString(n: number): string | null {
  if (!Number.isFinite(n)) return null;
  if (n === 0) return '0';
  const repr = String(n);
  const match = /^(-?)([0-9]+)(?:\.([0-9]+))?e([+-][0-9]+)$/.exec(repr);
  if (!match) return repr;
  const [, sign = '', intPart = '', fracPart = '', exponent = '0'] = match;
  const digits = intPart + fracPart;
  const pointAt = intPart.length + parseInt(exponent, 10);
  if (pointAt <= 0) return `${sign}0.${'0'.repeat(-pointAt)}${digits}`;
  if (pointAt >= digits.length) return `${sign}${digits}${'0'.repeat(pointAt - digits.length)}`;
  return `${sign}${digits.slice(0, pointAt)}.${digits.slice(pointAt)}`;
}

interface DecimalParts {
  /** -1, 0 or 1. Every spelling of zero (`-0`, `0.000`, `-.0`) is 0. */
  readonly sign: -1 | 0 | 1;
  /** Integer digits without leading zeros. */
  readonly int: string;
  /** Fraction digits without trailing zeros. */
  readonly frac: string;
}

function toDecimalParts(plain: string): DecimalParts {
  const negative = plain.startsWith('-');
  const body = negative ? plain.slice(1) : plain;
  const point = body.indexOf('.');
  const int = trimZeros(point === -1 ? body : body.slice(0, point), 'leading');
  const frac = trimZeros(point === -1 ? '' : body.slice(point + 1), 'trailing');
  const sign = int === '' && frac === '' ? 0 : negative ? -1 : 1;
  return { sign, int, frac };
}

/** Strips zeros from one end with a scan; an unanchored `/0+$/` is quadratic on long zero runs. */
function trimZeros(digits: string, end: 'leading' | 'trailing'): string {
  if (end === 'leading') {
    let start = 0;
    while (start < digits.length && digits[start] === '0') start += 1;
    return digits.slice(start);
  }
  let stop = digits.length;
  while (stop > 0 && digits[stop - 1] === '0') stop -= 1;
  return digits.slice(0, stop);
}

function compareDigits(a: string, b: string): -1 | 0 | 1 {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * Exact comparison of two plain decimal strings: the sign of `a - b`. Works on the
 * digits (integer length, then lexicographic order with zeros trimmed), so it never
 * goes through a float and stays linear in the input length.
 */
export function compareDecimalStrings(a: string, b: string): -1 | 0 | 1 {
  const x = toDecimalParts(a);
  const y = toDecimalParts(b);
  if (x.sign !== y.sign) return x.sign < y.sign ? -1 : 1;
  if (x.sign === 0) return 0;
  let magnitude: -1 | 0 | 1 =
    x.int.length !== y.int.length
      ? x.int.length < y.int.length
        ? -1
        : 1
      : compareDigits(x.int, y.int);
  // With trailing zeros trimmed, lexicographic order of fraction digits is numeric order.
  if (magnitude === 0) magnitude = compareDigits(x.frac, y.frac);
  return x.sign === 1 ? magnitude : magnitude === 0 ? 0 : magnitude === 1 ? -1 : 1;
}

/**
 * How exact mode reads a form value. Display and validation share this one switch,
 * so a value from outside is shown and judged the same way.
 */
type CoercedAmount =
  | { readonly kind: 'empty' }
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'unsupported'; readonly display: string };

function coerceAmountValue(value: unknown): CoercedAmount {
  if (value === undefined || value === null || value === '') return { kind: 'empty' };
  switch (typeof value) {
    case 'string':
      return { kind: 'text', text: value };
    case 'number': {
      const decimal = numberToDecimalString(value);
      return decimal === null
        ? { kind: 'unsupported', display: String(value) }
        : { kind: 'text', text: decimal };
    }
    case 'bigint':
      return { kind: 'text', text: value.toString() };
    default:
      // Never String() a symbol or toString() an object: show nothing, fail validation.
      return { kind: 'unsupported', display: '' };
  }
}

/** Display text for a value written from outside (`defaultValues`, `reset`, `setValue`). */
export function toAmountDisplayText(value: unknown): string {
  const coerced = coerceAmountValue(value);
  switch (coerced.kind) {
    case 'empty':
      return '';
    case 'text':
      return coerced.text;
    case 'unsupported':
      return coerced.display;
  }
}

/** True when the value is one exact mode treats as empty (`''`, `null`, `undefined`). */
export function isEmptyAmountValue(value: unknown): boolean {
  return coerceAmountValue(value).kind === 'empty';
}

/** Options for `validateExactAmount`, resolved by AmountField from its props. */
export interface ExactAmountValidationOptions {
  readonly required: boolean;
  readonly allowGrouping: boolean;
  readonly decimals: number;
  readonly min?: number | string;
  readonly max?: number | string;
  readonly validateAmount?: (value: string) => boolean | string;
  /** Text for an empty required value. Defaults to `AMOUNT_REQUIRED_MESSAGE`. */
  readonly requiredMessage?: string;
}

/** A bound as a plain decimal string, or `null` when it cannot be used. */
function boundToDecimalString(bound: unknown): string | null {
  if (typeof bound === 'number') return numberToDecimalString(bound);
  if (typeof bound === 'string' && PLAIN_AMOUNT_PATTERN.test(bound)) return bound;
  return null;
}

/**
 * The whole exact-mode rule. Returns `true` or a non-empty message, and never throws
 * (a throwing `validateAmount` propagates, as in default mode). First failure wins:
 * empty → value type → grammar → decimals → bounds → `validateAmount`.
 */
export function validateExactAmount(
  value: unknown,
  opts: ExactAmountValidationOptions
): true | string {
  // 1. Empty.
  const coerced = coerceAmountValue(value);
  if (coerced.kind === 'empty') {
    return opts.required ? (opts.requiredMessage ?? AMOUNT_REQUIRED_MESSAGE) : true;
  }

  // 2. Value type: unknown types never pass and never read as empty.
  if (coerced.kind === 'unsupported') return AMOUNT_GENERIC_MESSAGE;
  const amount = coerced.text;

  // 3. Grammar. The form value is plain whenever the on-screen text was valid.
  if (!PLAIN_AMOUNT_PATTERN.test(amount)) {
    return AMOUNT_TEXT_ISSUE_MESSAGES[classifyAmountText(amount, opts.allowGrouping)];
  }

  // 4. Decimals, counted as typed; a limit, never a rounding.
  const { decimals } = opts;
  if (!Number.isSafeInteger(decimals) || decimals < 0) return AMOUNT_MISCONFIGURED_MESSAGE;
  if (fractionDigits(amount) > decimals) return `Use at most ${decimals} decimal places`;

  // 5. Bounds: inclusive, exact, and fail closed on a bound that cannot be read.
  if (opts.min !== undefined) {
    const min = boundToDecimalString(opts.min);
    if (min === null) return AMOUNT_MISCONFIGURED_MESSAGE;
    if (compareDecimalStrings(amount, min) < 0) return `Value must be at least ${min}`;
  }
  if (opts.max !== undefined) {
    const max = boundToDecimalString(opts.max);
    if (max === null) return AMOUNT_MISCONFIGURED_MESSAGE;
    if (compareDecimalStrings(amount, max) > 0) return `Value must be at most ${max}`;
  }

  // 6. Consumer validator: only `true` passes, a non-empty string is the error.
  if (opts.validateAmount) {
    const result: unknown = opts.validateAmount(amount);
    if (result === true) return true;
    return typeof result === 'string' && result !== '' ? result : AMOUNT_GENERIC_MESSAGE;
  }
  return true;
}

// ---------------------------------------------------------------------------------------
// Default mode: exact blur formatting and arrow-key stepping.
// ---------------------------------------------------------------------------------------

/**
 * Largest `decimals` the default formatter pads to. It was the float formatter's own
 * limit, and it caps the padding a blur can allocate.
 */
const MAX_FORMAT_DECIMALS = 100;

/** An integer from 0 to 100. Anything else leaves the text unformatted. */
function isFormattableDecimals(decimals: number): boolean {
  return Number.isInteger(decimals) && decimals >= 0 && decimals <= MAX_FORMAT_DECIMALS;
}

interface PlainSplit {
  readonly negative: boolean;
  /** Integer digits as typed, possibly empty (`.5`). */
  readonly int: string;
  /** Fraction digits as typed, possibly empty (`5.`, `5`). */
  readonly frac: string;
}

/** Splits a string that passed `PLAIN_AMOUNT_PATTERN`. Keeps every digit as typed. */
function splitPlain(plain: string): PlainSplit {
  const negative = plain.startsWith('-');
  const body = negative ? plain.slice(1) : plain;
  const point = body.indexOf('.');
  return {
    negative,
    int: point === -1 ? body : body.slice(0, point),
    frac: point === -1 ? '' : body.slice(point + 1),
  };
}

/**
 * Plain text as an integer count of 10^-scale units. Precondition: `plain` passed
 * `PLAIN_AMOUNT_PATTERN` and `fractionDigits(plain) <= scale`, so nothing is dropped.
 */
function toScaled(plain: string, scale: number): bigint {
  const { negative, int, frac } = splitPlain(plain);
  const magnitude = BigInt(`${int}${frac.padEnd(scale, '0')}` || '0');
  return negative ? -magnitude : magnitude;
}

/**
 * Inverse of `toScaled`: `-`? integer part, then `.` and exactly `scale` digits (no `.`
 * when `scale` is 0). A `bigint` has no negative zero, so a zero result is unsigned.
 */
function fromScaled(scaled: bigint, scale: number): string {
  const sign = scaled < 0n ? '-' : '';
  const digits = (scaled < 0n ? -scaled : scaled).toString();
  if (scale === 0) return `${sign}${digits}`;
  const padded = digits.padStart(scale + 1, '0');
  const point = padded.length - scale;
  return `${sign}${padded.slice(0, point)}.${padded.slice(point)}`;
}

/**
 * Default-mode blur formatter. Gives plain text exactly `decimals` fraction digits:
 * leading integer zeros trimmed (one `0` kept), a short fraction padded with zeros, a
 * long one rounded half away from zero, with carry into the integer part (`9.995` at 2
 * → `10.00`). Every integer digit is kept, however many. A zero result is unsigned
 * (`-0.001` at 2 → `0.00`).
 *
 * Returns `null`, meaning "leave the text alone", when `text` is not plain (`''`, `-`,
 * `.`, `-.`, `1e-7`, `1,000`, ` 1.5`, `12abc`) or `decimals` is not an integer from 0
 * to 100. Never throws.
 */
export function formatAmountText(text: string, decimals: number): string | null {
  // Both gates run before any BigInt() call, so BigInt never sees bad input.
  if (!isFormattableDecimals(decimals) || !PLAIN_AMOUNT_PATTERN.test(text)) return null;
  const { negative, int, frac } = splitPlain(text);
  let magnitude = BigInt(`${int}${frac.slice(0, decimals).padEnd(decimals, '0')}` || '0');
  // The dropped part is at least one half exactly when its first digit is 5 or more,
  // so that one digit decides the rounding. charAt gives '' when nothing is dropped.
  if (frac.charAt(decimals) >= '5') magnitude += 1n;
  return fromScaled(negative ? -magnitude : magnitude, decimals);
}

/**
 * One default-mode arrow-key step. Every number comes straight from AmountField's
 * props and is read as its shortest round-trip decimal, never added as a float.
 */
export interface AmountStepOptions {
  /** +1 for ArrowUp, -1 for ArrowDown. */
  readonly direction: 1 | -1;
  /** AmountField `step`. */
  readonly step: number;
  /** AmountField `decimals`. Same usable range as `formatAmountText`. */
  readonly decimals: number;
  /** Inclusive lower bound. Ignored when `NaN` or infinite. */
  readonly min?: number;
  /** Inclusive upper bound, applied after `min`. Ignored when `NaN` or infinite. */
  readonly max?: number;
}

/**
 * Default-mode arrow-key step: `value ± step`, clamped to `min` then `max`, then
 * formatted by `formatAmountText`. All exact, at any magnitude.
 *
 * The base is the value's display text. An empty or incomplete one (`''`, `-`, `.`,
 * `-.`, and values that display as `''`) counts as `0`. Returns `null`, meaning "write
 * nothing", when the base is any other non-plain text (`1,000`, `12abc`, `NaN`), when
 * `step` is `NaN` or infinite, or when `decimals` is unusable. Never throws.
 */
export function stepAmountText(value: unknown, options: AmountStepOptions): string | null {
  const { direction, step, decimals, min, max } = options;
  if (!isFormattableDecimals(decimals)) return null;

  // A number base goes through numberToDecimalString, a bigint through toString.
  const displayed = toAmountDisplayText(value);
  const base = displayed === '' || INCOMPLETE_TEXTS.has(displayed) ? '0' : displayed;
  // Never step from a guessed prefix of text the formatter would leave alone.
  if (!PLAIN_AMOUNT_PATTERN.test(base)) return null;

  // A non-finite step writes nothing.
  const stepText = numberToDecimalString(step);
  if (stepText === null) return null;

  // Both operands at one scale, so the add is exact integer arithmetic.
  const scale = Math.max(fractionDigits(base), fractionDigits(stepText));
  let next = fromScaled(
    toScaled(base, scale) + BigInt(direction) * toScaled(stepText, scale),
    scale
  );

  // Min first, then max, so max wins when min > max. A non-finite bound is skipped.
  const lower = min === undefined ? null : numberToDecimalString(min);
  if (lower !== null && compareDecimalStrings(next, lower) < 0) next = lower;
  const upper = max === undefined ? null : numberToDecimalString(max);
  if (upper !== null && compareDecimalStrings(next, upper) > 0) next = upper;

  // Formatted after the clamp, as before.
  return formatAmountText(next, decimals);
}
