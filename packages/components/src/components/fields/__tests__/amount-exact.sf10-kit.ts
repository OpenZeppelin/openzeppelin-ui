/**
 * 005 SF-10 test kit (no JSX): seeded generators, an independent exact-decimal
 * reference, a vendored copy of viem's `parseUnits`, the SC-003 corpus (re-exported from
 * `amount-exact.sf10-corpus.ts`) and the harness handle. 006 SF-1 adds digit-string
 * rounding and addition references. Test fixture only; never exported from the package.
 * Kept free of `vitest` imports so the package `typecheck` compiles it.
 */
import type { ComponentProps } from 'react';
import type { FieldErrors, FieldValues, UseFormReturn } from 'react-hook-form';

import type { AmountField } from '../AmountField';

// ---------------------------------------------------------------------------
// Seeded randomness (no fast-check dependency: Invariants OQ4, decided at Tests)
// ---------------------------------------------------------------------------

/** mulberry32: small, fast, deterministic. Every property test logs its seed on failure. */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform integer in [lo, hi]. */
export function randInt(rng: () => number, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/** Uniform pick from a non-empty list. */
export function pick<T>(rng: () => number, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick() from an empty list');
  return items[Math.floor(rng() * items.length)] as T;
}

function digits(rng: () => number, count: number, firstNonZero = false): string {
  let out = '';
  for (let i = 0; i < count; i += 1) {
    out += String(i === 0 && firstNonZero ? randInt(rng, 1, 9) : randInt(rng, 0, 9));
  }
  return out;
}

/** The INV-9 alphabet: `[0-9.,\-eE+ ]`, plus Arabic-Indic and full-width digits and U+2212. */
export const HOSTILE_ALPHABET = [
  ...'0123456789'.split(''),
  '.',
  ',',
  '-',
  'e',
  'E',
  '+',
  ' ',
  '١',
  '１',
  '−',
] as const;

/** Uniform random string over the hostile alphabet, length 0..maxLen. */
export function randomHostileString(rng: () => number, maxLen = 14): string {
  const len = randInt(rng, 0, maxLen);
  let out = '';
  for (let i = 0; i < len; i += 1) out += pick(rng, HOSTILE_ALPHABET);
  return out;
}

/** A random string in PLAIN: optional `-`, digits with leading zeros allowed, optional fraction. */
export function randomPlainText(rng: () => number, maxInt = 30, maxFrac = 30): string {
  const sign = rng() < 0.25 ? '-' : '';
  const shape = randInt(rng, 0, 3);
  const intPart = digits(rng, randInt(rng, 1, maxInt));
  const fracPart = digits(rng, randInt(rng, 0, maxFrac));
  if (shape === 0) return `${sign}${intPart}`;
  if (shape === 1) return `${sign}${intPart}.${fracPart}`;
  if (shape === 2) return `${sign}.${fracPart === '' ? '5' : fracPart}`;
  return `${sign}${intPart}.`;
}

/** A random string in GROUPED: first group 1–3 digits (no leading 0), then ≥1 groups of 3. */
export function randomGroupedText(rng: () => number, maxGroups = 9, maxFrac = 30): string {
  const sign = rng() < 0.25 ? '-' : '';
  let out = sign + digits(rng, randInt(rng, 1, 3), true);
  const groups = randInt(rng, 1, maxGroups);
  for (let i = 0; i < groups; i += 1) out += `,${digits(rng, 3)}`;
  const frac = randInt(rng, -1, maxFrac);
  if (frac >= 0) out += `.${digits(rng, frac)}`;
  return out;
}

/**
 * Near-miss texts: a valid grouped or plain text with one character inserted, removed
 * or replaced from the hostile alphabet. Exercises the closure boundary (INV-10).
 */
export function randomNearMiss(rng: () => number): string {
  const base = rng() < 0.5 ? randomGroupedText(rng, 4, 6) : randomPlainText(rng, 8, 6);
  const at = randInt(rng, 0, base.length);
  const ch = pick(rng, HOSTILE_ALPHABET);
  const op = randInt(rng, 0, 2);
  if (op === 0) return base.slice(0, at) + ch + base.slice(at);
  if (op === 1) return base.slice(0, at) + base.slice(at + 1);
  return base.slice(0, at) + ch + base.slice(at + 1);
}

/** Any finite double, drawn from random bits so subnormals and huge exponents appear. */
export function randomFiniteDouble(rng: () => number): number {
  const view = new DataView(new ArrayBuffer(8));
  for (;;) {
    view.setUint32(0, Math.floor(rng() * 2 ** 32));
    view.setUint32(4, Math.floor(rng() * 2 ** 32));
    const n = view.getFloat64(0);
    if (Number.isFinite(n)) return n;
  }
}

// ---------------------------------------------------------------------------
// Independent exact-decimal reference (written separately from decimalValidation.ts)
// ---------------------------------------------------------------------------

const REF_PLAIN = /^-?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)$/;

function refFractionLength(plain: string): number {
  const point = plain.indexOf('.');
  return point === -1 ? 0 : plain.length - point - 1;
}

/** `plain` × 10^scale as a BigInt, by padding the fraction. Requires fraction length ≤ scale. */
export function refScaled(plain: string, scale: number): bigint {
  if (!REF_PLAIN.test(plain)) throw new Error(`refScaled: not plain: ${plain}`);
  const negative = plain.startsWith('-');
  const body = negative ? plain.slice(1) : plain;
  const [intPart = '', fracPart = ''] = body.split('.');
  if (fracPart.length > scale) throw new Error('refScaled: fraction longer than scale');
  const magnitude = BigInt(`${intPart === '' ? '0' : intPart}${fracPart.padEnd(scale, '0')}`);
  return negative ? -magnitude : magnitude;
}

/** Sign of `a - b`, by scaling both to a common fraction length and comparing BigInts. */
export function refCompare(a: string, b: string): -1 | 0 | 1 {
  const scale = Math.max(refFractionLength(a), refFractionLength(b));
  const x = refScaled(a, scale);
  const y = refScaled(b, scale);
  return x < y ? -1 : x > y ? 1 : 0;
}

/** The INV-17 reference conversion: `int(s) · 10^decimals + frac(s)` padded to `decimals`. */
export function refParseUnits(plain: string, decimals: number): bigint {
  return refScaled(plain, decimals);
}

// ---------------------------------------------------------------------------
// 006 SF-1: independent digit-string arithmetic (no BigInt, no Number), so a bug shared
// with decimalValidation.ts's scaled-bigint code or with Intl would still show.
// ---------------------------------------------------------------------------

/** Digit-string increment by one unit in the last place: '199' → '200', '99' → '100'. */
function refIncrementDigits(digitsIn: string): string {
  const out = digitsIn.split('');
  let i = out.length - 1;
  while (i >= 0 && out[i] === '9') {
    out[i] = '0';
    i -= 1;
  }
  if (i < 0) return `1${out.join('')}`;
  out[i] = String(Number(out[i]) + 1);
  return out.join('');
}

function refStripLeadingZeros(digitsIn: string): string {
  const trimmed = digitsIn.replace(/^0+/, '');
  return trimmed === '' ? '0' : trimmed;
}

/**
 * Reference for the default formatter: `plain` rounded half away from zero to `decimals`
 * fraction digits (padded when shorter), in canonical form, zero unsigned. Digit-string
 * arithmetic only.
 */
export function refRoundHalfAway(plain: string, decimals: number): string {
  if (!REF_PLAIN.test(plain)) throw new Error(`refRoundHalfAway: not plain: ${plain}`);
  const negative = plain.startsWith('-');
  const body = negative ? plain.slice(1) : plain;
  const [intPart = '', fracPart = ''] = body.split('.');
  const kept = `${intPart}${fracPart.slice(0, decimals).padEnd(decimals, '0')}` || '0';
  const roundsUp = fracPart.length > decimals && Number(fracPart[decimals]) >= 5;
  const units = refStripLeadingZeros(roundsUp ? refIncrementDigits(kept) : kept);
  const padded = units.padStart(decimals + 1, '0');
  const point = padded.length - decimals;
  const magnitude = decimals === 0 ? padded : `${padded.slice(0, point)}.${padded.slice(point)}`;
  const isZero = /^0*$/.test(units);
  return negative && !isZero ? `-${magnitude}` : magnitude;
}

function refAddMagnitudes(a: string, b: string): string {
  let out = '';
  let carry = 0;
  for (let i = a.length - 1; i >= 0; i -= 1) {
    const sum = Number(a[i]) + Number(b[i]) + carry;
    out = String(sum % 10) + out;
    carry = sum >= 10 ? 1 : 0;
  }
  return carry ? `1${out}` : out;
}

/** a - b for equal-length digit strings with a >= b. */
function refSubtractMagnitudes(a: string, b: string): string {
  let out = '';
  let borrow = 0;
  for (let i = a.length - 1; i >= 0; i -= 1) {
    let diff = Number(a[i]) - Number(b[i]) - borrow;
    borrow = diff < 0 ? 1 : 0;
    if (diff < 0) diff += 10;
    out = String(diff) + out;
  }
  return out;
}

/**
 * Exact decimal sum of two plain texts by digit-string arithmetic, as a plain text with
 * `max(fraction lengths)` fraction digits (no `.` when that is 0). Zero is unsigned.
 */
export function refAddDecimal(a: string, b: string): string {
  const scale = Math.max(refFractionLength(a), refFractionLength(b));
  const parts = (plain: string): { neg: boolean; units: string } => {
    if (!REF_PLAIN.test(plain)) throw new Error(`refAddDecimal: not plain: ${plain}`);
    const neg = plain.startsWith('-');
    const body = neg ? plain.slice(1) : plain;
    const [i = '', f = ''] = body.split('.');
    return { neg, units: refStripLeadingZeros(`${i}${f.padEnd(scale, '0')}`) };
  };
  const x = parts(a);
  const y = parts(b);
  const width = Math.max(x.units.length, y.units.length);
  const xu = x.units.padStart(width, '0');
  const yu = y.units.padStart(width, '0');
  let neg: boolean;
  let units: string;
  if (x.neg === y.neg) {
    neg = x.neg;
    units = refAddMagnitudes(xu, yu);
  } else if (xu >= yu) {
    neg = x.neg;
    units = refSubtractMagnitudes(xu, yu);
  } else {
    neg = y.neg;
    units = refSubtractMagnitudes(yu, xu);
  }
  units = refStripLeadingZeros(units);
  const padded = units.padStart(scale + 1, '0');
  const point = padded.length - scale;
  const magnitude = scale === 0 ? padded : `${padded.slice(0, point)}.${padded.slice(point)}`;
  return neg && units !== '0' ? `-${magnitude}` : magnitude;
}

// ---------------------------------------------------------------------------
// Vendored viem `parseUnits` (viem 2.43.5, utils/unit/parseUnits.js, MIT licence,
// Copyright (c) 2023-present weth, LLC). Verbatim logic; only types and the error
// class are adapted. The real package is cross-checked in the e2e spec, where the
// example app depends on viem.
// ---------------------------------------------------------------------------

/** Stand-in for viem's InvalidDecimalNumberError. */
export class VendoredInvalidDecimalNumberError extends Error {}

/** viem 2.43.5 `parseUnits`, verbatim logic. */
export function viemParseUnits(value: string, decimals: number): bigint {
  if (!/^(-?)([0-9]*)\.?([0-9]*)$/.test(value)) throw new VendoredInvalidDecimalNumberError(value);
  let [integer = '', fraction = '0'] = value.split('.');
  const negative = integer.startsWith('-');
  if (negative) integer = integer.slice(1);
  fraction = fraction.replace(/(0+)$/, '');
  if (decimals === 0) {
    if (Math.round(Number(`.${fraction}`)) === 1) integer = `${BigInt(integer) + 1n}`;
    fraction = '';
  } else if (fraction.length > decimals) {
    const [left, unit, right] = [
      fraction.slice(0, decimals - 1),
      fraction.slice(decimals - 1, decimals),
      fraction.slice(decimals),
    ];
    const rounded = Math.round(Number(`${unit}.${right}`));
    if (rounded > 9) fraction = `${BigInt(left) + BigInt(1)}0`.padStart(left.length + 1, '0');
    else fraction = `${left}${rounded}`;
    if (fraction.length > decimals) {
      fraction = fraction.slice(1);
      integer = `${BigInt(integer) + 1n}`;
    }
    fraction = fraction.slice(0, decimals);
  } else {
    fraction = fraction.padEnd(decimals, '0');
  }
  return BigInt(`${negative ? '-' : ''}${integer}${fraction}`);
}

// ---------------------------------------------------------------------------
// SC-003 corpus. The lists live in `amount-exact.sf10-corpus.ts`, which has no imports,
// so the example app's e2e specs can share them; 006 SF-1 extends them there.
// ---------------------------------------------------------------------------

export {
  DEFAULT_FORMAT_BOTH_MODES_CASES,
  DEFAULT_FORMAT_OVER_LIMIT_CASES,
  SC003_INVALID_CASES,
  SC003_OVER_LIMIT_CASES,
  SC003_VALID_CASES,
} from './amount-exact.sf10-corpus';

// ---------------------------------------------------------------------------
// Harness handle and option types
// ---------------------------------------------------------------------------

export type AmountFieldAnyProps = ComponentProps<typeof AmountField>;

/** Every AmountField prop except the form wiring, which the harness supplies. */
export type AmountFieldOptions = DistributiveOmit<AmountFieldAnyProps, 'control' | 'name' | 'id'>;

/** The exact-entry member of `AmountFieldOptions`. */
export type ExactFieldOptions = Extract<AmountFieldOptions, { formatOnBlur: false }>;
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export interface HarnessCommit {
  readonly text: string | null;
  readonly value: unknown;
}

export interface HarnessHandle {
  api: UseFormReturn<FieldValues> | null;
  readonly commits: HarnessCommit[];
  readonly onValid: (values: FieldValues) => void;
  readonly onInvalid: (errors: FieldErrors) => void;
  readonly validCalls: FieldValues[];
  readonly invalidCalls: FieldErrors[];
  /** Values passed through `field.onChange` (react-hook-form `watch` events of type 'change'). */
  readonly changeWrites: unknown[];
}

/** A fresh handle: the harness fills `api`, `commits` and `changeWrites`. */
export function createHandle(): HarnessHandle {
  const validCalls: FieldValues[] = [];
  const invalidCalls: FieldErrors[] = [];
  return {
    api: null,
    commits: [],
    validCalls,
    invalidCalls,
    changeWrites: [],
    onValid: (values) => {
      validCalls.push({ ...values });
    },
    onInvalid: (errors) => {
      invalidCalls.push(errors);
    },
  };
}

/** For INV-1 / INV-7 only: deliberately passes a value the prop types forbid. */
export function typeBypass<T>(value: unknown): T {
  return value as T;
}
