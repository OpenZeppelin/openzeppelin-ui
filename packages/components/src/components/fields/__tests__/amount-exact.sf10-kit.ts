/**
 * 005 SF-10 test kit (no JSX): seeded generators, an independent exact-decimal
 * reference, a vendored copy of viem's `parseUnits`, the SC-003 corpus and the harness
 * handle. Test fixture only; never exported from the package. Kept free of `vitest`
 * imports so the package `typecheck` compiles it.
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
// SC-003 precision-hostile corpus at decimals 18 (the e2e spec keeps its own copy).
// Every text is typed as-is into an exact field with grouping on.
// ---------------------------------------------------------------------------

export const SC003_VALID_CASES: readonly string[] = [
  '12,345,678,901,234,567.123456789012345678',
  '12345678901234567.123456789012345678',
  '9007199254740993',
  '9,007,199,254,740,993',
  '9007199254740992.000000000000000001',
  '18446744073709551616',
  '18,446,744,073,709,551,616',
  '115792089237316195423570985008687907853269984665640564039457584007913129639935',
  '115,792,089,237,316,195,423,570,985,008,687,907,853,269,984,665,640,564,039,457,584,007,913,129,639,935',
  '0.1',
  '0.100000000000000001',
  '0.123456789012345678',
  '0.000000000000000001',
  '.000000000000000001',
  '1.999999999999999999',
  '999999999999999999.999999999999999999',
  '999,999,999,999,999,999.999999999999999999',
  '1,000',
  '1,000.5',
  '1,000.',
  '1,000.000000000000000000',
  '1,234,567.89',
  '123,456,789,012,345,678,901,234,567,890',
  '100000000000000000000000000000000000000000',
  '0.30000000000000004',
  '4.35',
  '1.005',
  '2.675',
  '0.07',
  '-0',
  '-0.000000000000000001',
  '-12,345.678901234567890123',
  '-9007199254740993',
  '007',
  '000123.450',
  '5.',
  '.5',
  '-.5',
  '1.500',
  '0.000000000000000000',
  '123456789.123456789123456789',
  '3.141592653589793238',
  '2,718.281828459045235',
  '1,000,000,000,000,000,000,000',
  '340282366920938463463374607431768211455',
  '79228162514264337593543950335.000000000000000001',
  '12,345.6789012345678901',
  '1',
  '0',
  '10,000,000',
  '-1,000,000.000001',
  '42.000000000000000042',
];

/** Valid texts with more than 18 decimals: kept on screen, flagged, never submitted (decimals 18). */
export const SC003_OVER_LIMIT_CASES: readonly string[] = [
  '0.1234567890123456789',
  '1.2345678901234567890',
  '0.0000000000000000001',
  '1,000.0000000000000000000',
  '9007199254740993.0000000000000000001',
];

/** Texts that must be flagged and never submitted, in an exact field with grouping on. */
export const SC003_INVALID_CASES: readonly string[] = [
  '1e18',
  '1E18',
  '1..2',
  '1.2.3',
  '1,5',
  '1,00',
  '1234,567',
  ',123',
  '1,,000',
  '1,000,',
  '1,000.5,0',
  '0,123',
  ' 1,000 ',
  '-',
  '.',
  '-.',
  '+1',
  '1 000',
  '١٢',
  '１２',
  '−1',
  'NaN',
  'Infinity',
  'abc',
];

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
