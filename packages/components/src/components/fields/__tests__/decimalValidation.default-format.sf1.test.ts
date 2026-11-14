/**
 * 006 SF-1 · default-mode formatting helpers (pure): `formatAmountText` and
 * `stepAmountText`. Each `describe` starts with the INV id it verifies (the SF-1
 * invariants, not 005's), so a failure names the property that broke.
 *
 * Property tests are seeded (mulberry32, seed in the test title) and report the first
 * failing cases. Three references, written separately from decimalValidation.ts:
 * - the `Intl.NumberFormat` `halfExpand` oracle (INV-4),
 * - digit-string rounding and addition from the kit (`refRoundHalfAway`, `refAddDecimal`),
 *   which use neither BigInt nor Number, so a bug shared with Intl would still show,
 * - `refCompare` (BigInt scaling, also from the kit) for the closeness bound.
 */
import { describe, expect, it } from 'vitest';

import {
  formatAmountText,
  numberToDecimalString,
  PLAIN_AMOUNT_PATTERN,
  stepAmountText,
  type AmountStepOptions,
} from '../utils/decimalValidation';
import {
  createRng,
  pick,
  randInt,
  randomPlainText,
  refAddDecimal,
  refCompare,
  refRoundHalfAway,
  typeBypass,
} from './amount-exact.sf10-kit';

const PLAIN = PLAIN_AMOUNT_PATTERN;
const DS = [0, 1, 2, 6, 7, 18, 30, 100] as const;

/** CANON(d): `-`? integer without a redundant leading zero, then exactly d fraction digits. */
function canon(d: number): RegExp {
  return d === 0 ? /^-?(0|[1-9][0-9]*)$/ : new RegExp(`^-?(0|[1-9][0-9]*)\\.[0-9]{${d}}$`);
}
const NEGATIVE_ZERO = /^-0(\.0*)?$/;

// `roundingMode` is not in the ES2020 lib typings; this local type is test-only.
type OracleOptions = Intl.NumberFormatOptions & { roundingMode: 'halfExpand' };
const oracleFormatters = new Map<number, Intl.NumberFormat>();
/** ORACLE(t, d): Intl halfExpand on the string (exact decimal), negative zero dropped. */
function oracle(text: string, d: number): string {
  let formatter = oracleFormatters.get(d);
  if (!formatter) {
    const options: OracleOptions = {
      useGrouping: false,
      minimumFractionDigits: d,
      maximumFractionDigits: d,
      roundingMode: 'halfExpand',
    };
    formatter = new Intl.NumberFormat('en-US', options);
    oracleFormatters.set(d, formatter);
  }
  // `format` takes a decimal string exactly (Intl.NumberFormat v3); the typings say number.
  const out = formatter.format(typeBypass<number>(text));
  return NEGATIVE_ZERO.test(out) ? out.slice(1) : out;
}

function digits(rng: () => number, count: number): string {
  let out = '';
  for (let i = 0; i < count; i += 1) out += String(randInt(rng, 0, 9));
  return out;
}

/**
 * One generated plain text aimed at a rounding edge for a pivot `d` (≤ 30): uniform plain
 * texts, exact ties, near ties either side, carry chains (all nines) up to 40 long, and
 * 30+ integer digits.
 */
function roundingText(rng: () => number): string {
  const sign = rng() < 0.3 ? '-' : '';
  const d = pick(rng, [0, 1, 2, 6, 7, 18, 30]);
  const kind = randInt(rng, 0, 5);
  const int = digits(rng, randInt(rng, 0, 40));
  if (kind === 0) return randomPlainText(rng, 40, 32);
  if (kind === 1) return `${sign}${int || '0'}.${digits(rng, d)}5${'0'.repeat(randInt(rng, 0, 3))}`;
  if (kind === 2) return `${sign}${int}.${digits(rng, d)}4${'9'.repeat(randInt(rng, 1, 12))}`;
  if (kind === 3) return `${sign}${int}.${digits(rng, d)}5${'0'.repeat(randInt(rng, 0, 8))}1`;
  if (kind === 4) {
    const chain = '9'.repeat(randInt(rng, 1, 40));
    return `${sign}${chain}.${'9'.repeat(d)}${randInt(rng, 5, 9)}${digits(rng, randInt(rng, 0, 3))}`;
  }
  return `${sign}${digits(rng, randInt(rng, 30, 45))}.${digits(rng, randInt(rng, 0, 32))}`;
}

function report(failures: string[]): string {
  return `${failures.length} failing case(s), first: ${failures.slice(0, 5).join(' | ')}`;
}

/** Absolute value of a plain text. */
function abs(plain: string): string {
  return plain.startsWith('-') ? plain.slice(1) : plain;
}
function negate(plain: string): string {
  return plain.startsWith('-') ? plain.slice(1) : `-${plain}`;
}
/** 5·10^-(d+1) as plain text: half of the last kept place. */
function halfUlp(d: number): string {
  return d === 0 ? '0.5' : `0.${'0'.repeat(d)}5`;
}

// ---------------------------------------------------------------------------

describe('INV-3: every result has one canonical grammar and is never a negative zero', () => {
  it('seed 6301: 12,000 plain texts × 8 decimals, fmt results match CANON(d)', () => {
    const rng = createRng(6301);
    const failures: string[] = [];
    for (let i = 0; i < 12_000; i += 1) {
      const text = randomPlainText(rng, 40, 30);
      for (const d of DS) {
        const out = formatAmountText(text, d);
        if (out === null || !canon(d).test(out) || NEGATIVE_ZERO.test(out) || /[eE,+\s]/.test(out))
          failures.push(`${text}@${d}→${out}`);
      }
    }
    expect(failures, report(failures)).toEqual([]);
  });

  it.each([
    ['-0', 2, '0.00'],
    ['-0.001', 2, '0.00'],
    ['-0.004', 2, '0.00'],
    ['-0.005', 2, '-0.01'],
    ['-.5', 0, '-1'],
    ['5.', 0, '5'],
    ['-0', 0, '0'],
    ['-.4', 0, '0'],
    ['-0.', 18, '0.000000000000000000'],
    ['000', 0, '0'],
    ['-000.000', 1, '0.0'],
  ])('fixed row: fmt(%j, %i) = %j', (text, d, expected) => {
    expect(formatAmountText(text, d)).toBe(expected);
  });

  it('failure case: a canonical-looking negative zero is never emitted, even from a step', () => {
    const out = stepAmountText('-0.01', { direction: 1, step: 0.01, decimals: 2 });
    expect(out).toBe('0.00');
    expect(out).not.toMatch(NEGATIVE_ZERO);
  });
});

describe('INV-4: formatting is exact; every digit kept, ties round half away from zero', () => {
  it('seed 6401: 15,000 edge-aimed texts × 8 decimals (120,000 cases) equal the Intl halfExpand oracle', () => {
    const rng = createRng(6401);
    const failures: string[] = [];
    let cases = 0;
    for (let i = 0; i < 15_000; i += 1) {
      const text = roundingText(rng);
      for (const d of DS) {
        cases += 1;
        const out = formatAmountText(text, d);
        const expected = oracle(text, d);
        if (out !== expected) failures.push(`${text}@${d}: got ${out}, oracle ${expected}`);
      }
    }
    expect(cases).toBeGreaterThanOrEqual(100_000);
    expect(failures, report(failures)).toEqual([]);
  });

  it('seed 6402: second, independent check on 5,000 × 8: digit-string rounding and |fmt − t| ≤ ½·10^−d', () => {
    const rng = createRng(6402);
    const failures: string[] = [];
    for (let i = 0; i < 5_000; i += 1) {
      const text = roundingText(rng);
      for (const d of DS) {
        const out = formatAmountText(text, d);
        if (out === null) {
          failures.push(`${text}@${d}: null`);
          continue;
        }
        if (out !== refRoundHalfAway(text, d)) failures.push(`${text}@${d}: ${out} vs ref`);
        const diff = abs(refAddDecimal(out, negate(text)));
        const bound = refCompare(diff, halfUlp(d));
        if (bound > 0) failures.push(`${text}@${d}: off by ${diff}`);
        // A tie (exactly half) must move away from zero: |out| > |t|.
        if (bound === 0 && refCompare(abs(out), abs(text)) <= 0 && refCompare(diff, '0') !== 0)
          failures.push(`${text}@${d}: tie rounded toward zero`);
      }
    }
    expect(failures, report(failures)).toEqual([]);
  });

  const uint256Max =
    '115792089237316195423570985008687907853269984665640564039457584007913129639935';
  it.each([
    ['0.1', 18, '0.100000000000000000'],
    ['123456789012345678.5', 2, '123456789012345678.50'],
    ['9007199254740993', 18, '9007199254740993.000000000000000000'],
    [uint256Max, 18, `${uint256Max}.000000000000000000`],
    ['1.005', 2, '1.01'],
    ['2.675', 2, '2.68'],
    ['1.239', 2, '1.24'],
    ['1.234', 2, '1.23'],
    ['9.995', 2, '10.00'],
    ['-0.995', 2, '-1.00'],
    [`${'9'.repeat(40)}.5`, 0, `1${'0'.repeat(40)}`],
    ['0.30000000000000004', 18, '0.300000000000000040'],
    ['007.5', 2, '7.50'],
    ['.5', 0, '1'],
    ['0.0000001', 7, '0.0000001'],
    ['0.00000005', 7, '0.0000001'],
    ['0.00000004999', 7, '0.0000000'],
  ])('named row: fmt(%j, %i) = %j', (text, d, expected) => {
    expect(formatAmountText(text, d)).toBe(expected);
  });

  it('boundary: d = 100 pads to exactly 100 digits; a 101st digit decides the rounding', () => {
    expect(formatAmountText('1', 100)).toBe(`1.${'0'.repeat(100)}`);
    expect(formatAmountText(`0.${'0'.repeat(99)}15`, 100)).toBe(`0.${'0'.repeat(99)}2`);
    expect(formatAmountText(`0.${'0'.repeat(99)}14`, 100)).toBe(`0.${'0'.repeat(99)}1`);
  });

  it('failure case: the float result the old code produced is not what fmt gives', () => {
    // The 005 path was parseFloat(t).toFixed(d). Pin that these differ, so the oracle above
    // is testing exactness and not agreeing with a float by luck.
    expect(parseFloat('0.1').toFixed(18)).toBe('0.100000000000000006');
    expect(formatAmountText('0.1', 18)).not.toBe(parseFloat('0.1').toFixed(18));
    expect(parseFloat('1.005').toFixed(2)).toBe('1.00');
    expect(formatAmountText('1.005', 2)).toBe('1.01');
  });
});

describe('INV-5: formatAmountText is total; null for exactly the inputs it cannot format', () => {
  const NON_PLAIN = [
    '',
    '-',
    '.',
    '-.',
    '+1',
    ' 1.5',
    '1.5 ',
    '1e-7',
    '1E3',
    '1,000',
    '12abc',
    '1..2',
    '١٢',
    '0x10',
    'Infinity',
    'NaN',
    '--1',
    '1-',
    '１２',
    '−1',
  ];
  const UNUSABLE_D = [Number.NaN, Infinity, -Infinity, -1, 2.5, 101, 1e9, 0.1, -0.5];

  it.each(NON_PLAIN)('non-plain %j → null at every usable decimals', (text) => {
    for (const d of DS) expect(formatAmountText(text, d)).toBeNull();
  });

  it.each(UNUSABLE_D)('unusable decimals %d → null for a plain text', (d) => {
    expect(formatAmountText('1.5', d)).toBeNull();
    expect(formatAmountText('0', d)).toBeNull();
  });

  it.each([
    [-0, '2'],
    [0, '2'],
    [100, `1.${'5'.padEnd(100, '0')}`],
  ])('boundary: decimals %d is usable', (d, expected) => {
    expect(formatAmountText('1.5', d)).toBe(expected);
  });

  it('seed 6501: 30,000 random strings over a mixed alphabet never throw; null iff not PLAIN', () => {
    const rng = createRng(6501);
    const alphabet = [...'0123456789-.,e+ ', 'E', 'a', 'x', '١', '−', '\t'];
    const failures: string[] = [];
    for (let i = 0; i < 30_000; i += 1) {
      let text = '';
      const len = randInt(rng, 0, 12);
      for (let j = 0; j < len; j += 1) text += pick(rng, alphabet);
      const d = pick(rng, DS);
      let out: string | null;
      try {
        out = formatAmountText(text, d);
      } catch (error) {
        failures.push(`${JSON.stringify(text)}@${d} threw ${String(error)}`);
        continue;
      }
      if ((out === null) !== !PLAIN.test(text))
        failures.push(`${JSON.stringify(text)}@${d}→${out}`);
    }
    expect(failures, report(failures)).toEqual([]);
  });
});

describe('INV-6: formatting is idempotent; canonical text is a fixed point', () => {
  it('seed 6601: fmt(fmt(t, d), d) = fmt(t, d) over 10,000 texts × 8 decimals', () => {
    const rng = createRng(6601);
    const failures: string[] = [];
    for (let i = 0; i < 10_000; i += 1) {
      const text = roundingText(rng);
      for (const d of DS) {
        const once = formatAmountText(text, d);
        if (once === null || formatAmountText(once, d) !== once) failures.push(`${text}@${d}`);
      }
    }
    expect(failures, report(failures)).toEqual([]);
  });

  it('seed 6602: 10,000 generated canonical texts are returned unchanged', () => {
    const rng = createRng(6602);
    const failures: string[] = [];
    for (let i = 0; i < 10_000; i += 1) {
      const d = pick(rng, DS);
      const int = rng() < 0.2 ? '0' : `${randInt(rng, 1, 9)}${digits(rng, randInt(rng, 0, 35))}`;
      const c = d === 0 ? int : `${int}.${digits(rng, d)}`;
      const signed = rng() < 0.4 && !NEGATIVE_ZERO.test(`-${c}`) ? `-${c}` : c;
      if (formatAmountText(signed, d) !== signed) failures.push(`${signed}@${d}`);
    }
    expect(failures, report(failures)).toEqual([]);
  });

  it('failure case: a rounding at one d then another is not the same as rounding once (no promise across d)', () => {
    // INV-6 is per d. Pin the double-rounding shape the invariant names so a reader sees why.
    expect(formatAmountText(formatAmountText('1.45', 1) ?? '', 0)).toBe('2');
    expect(formatAmountText('1.45', 0)).toBe('1');
  });
});

describe('INV-13: of the texts the keystroke filter accepts, blur leaves alone exactly "", -, ., -.', () => {
  const FILTER = /^-?\d*\.?\d*$/;
  const ALPHABET = ['-', '.', '0', '1', '9'];

  function allStrings(maxLen: number): string[] {
    let level = [''];
    const out = [''];
    for (let len = 1; len <= maxLen; len += 1) {
      const next: string[] = [];
      for (const prefix of level) for (const ch of ALPHABET) next.push(prefix + ch);
      out.push(...next);
      level = next;
    }
    return out;
  }

  it('every filter-accepted string up to length 5 over {-, ., 0, 1, 9}, at every usable d', () => {
    const accepted = allStrings(5).filter((s) => s === '' || FILTER.test(s));
    expect(accepted.length).toBeGreaterThan(500);
    const incomplete = new Set(['', '-', '.', '-.']);
    const failures: string[] = [];
    for (const text of accepted) {
      for (const d of DS) {
        const isNull = formatAmountText(text, d) === null;
        if (isNull !== incomplete.has(text)) failures.push(`${JSON.stringify(text)}@${d}`);
      }
    }
    expect(failures, report(failures)).toEqual([]);
  });

  it('boundary: half-typed amounts 5. and .5 and -.5 are formatted, not skipped', () => {
    expect(formatAmountText('5.', 2)).toBe('5.00');
    expect(formatAmountText('.5', 2)).toBe('0.50');
    expect(formatAmountText('-.5', 2)).toBe('-0.50');
  });
});

// ---------------------------------------------------------------------------
// stepAmountText
// ---------------------------------------------------------------------------

const step = (value: unknown, over: Partial<AmountStepOptions> = {}): string | null =>
  stepAmountText(value, { direction: 1, step: 0.01, decimals: 2, ...over });

/** Step values whose shortest decimal text is known: [number, text]. */
const STEPS: ReadonlyArray<readonly [number, string]> = [
  [0.01, '0.01'],
  [1, '1'],
  [0.5, '0.5'],
  [2.5, '2.5'],
  [0.001, '0.001'],
  [100, '100'],
  [12345.678, '12345.678'],
  [1e-7, '0.0000001'],
  [0.1, '0.1'],
  [3, '3'],
  [1e21, '1000000000000000000000'],
];

describe('INV-7: arrow stepping is exact; a step round trip returns to the start', () => {
  it('step texts are read through numberToDecimalString as expected (test premise)', () => {
    for (const [n, text] of STEPS) expect(numberToDecimalString(n)).toBe(text);
  });

  it('seed 6701: 8,000 (base, step, d) triples equal round(base ± step) by digit-string arithmetic', () => {
    const rng = createRng(6701);
    const failures: string[] = [];
    for (let i = 0; i < 8_000; i += 1) {
      const base = randomPlainText(rng, 30, 20);
      const [n, s] = pick(rng, STEPS);
      const d = pick(rng, DS);
      const direction = rng() < 0.5 ? 1 : -1;
      const out = stepAmountText(base, { direction, step: n, decimals: d });
      const expected = refRoundHalfAway(refAddDecimal(base, direction === 1 ? s : negate(s)), d);
      if (out !== expected)
        failures.push(`${base} ${direction > 0 ? '+' : '-'} ${s} @${d}: ${out} vs ${expected}`);
      else if (!canon(d).test(out) || NEGATIVE_ZERO.test(out))
        failures.push(`${out} not canonical`);
    }
    expect(failures, report(failures)).toEqual([]);
  });

  it('seed 6702: with no rounding (base and step ≤ d digits), up then down returns fmt(base) and the difference is exactly step', () => {
    const rng = createRng(6702);
    const failures: string[] = [];
    for (let i = 0; i < 8_000; i += 1) {
      const [n, s] = pick(rng, STEPS);
      const minD = s.includes('.') ? s.length - s.indexOf('.') - 1 : 0;
      const d = pick(
        rng,
        DS.filter((x) => x >= minD)
      );
      const sign = rng() < 0.4 ? '-' : '';
      const base = `${sign}${digits(rng, randInt(rng, 1, 30))}${d > 0 ? `.${digits(rng, randInt(rng, 0, Math.min(d, 20)))}` : ''}`;
      const start = formatAmountText(base, d);
      const up = stepAmountText(base, { direction: 1, step: n, decimals: d });
      const back = stepAmountText(up, { direction: -1, step: n, decimals: d });
      if (start === null || up === null) {
        failures.push(`${base}@${d}: null`);
        continue;
      }
      if (back !== start) failures.push(`${base} +${s} -${s} @${d}: ${back} vs ${start}`);
      if (refCompare(refAddDecimal(up, negate(start)), s) !== 0)
        failures.push(`${base}@${d}: up-start ≠ ${s}`);
    }
    expect(failures, report(failures)).toEqual([]);
  });

  it.each([
    ['9007199254740993', 1, 1, 0, '9007199254740994'],
    ['0.00', -1, 0.01, 2, '-0.01'],
    ['-0.01', 1, 0.01, 2, '0.00'],
    ['0.1', 1, 0.01, 18, '0.110000000000000000'],
    ['0', 1, 1e-7, 7, '0.0000001'],
    ['0.10', 1, 0.01, 2, '0.11'],
    ['123456789012345678901234', 1, 1, 0, '123456789012345678901235'],
    ['0.2', 1, 0.1, 18, '0.300000000000000000'],
  ] as const)('named row: %s %s× step %d at %i → %s', (base, direction, n, d, expected) => {
    expect(stepAmountText(base, { direction, step: n, decimals: d })).toBe(expected);
  });

  it('boundary: 50 successive ArrowUp from 0 at step 0.01 end at exactly 0.50; 20 at d 18 at exactly 0.2', () => {
    let value: string | null = '';
    for (let i = 0; i < 50; i += 1) value = step(value);
    expect(value).toBe('0.50');
    let v18: string | null = '';
    for (let i = 0; i < 20; i += 1) v18 = step(v18, { decimals: 18 });
    expect(v18).toBe('0.200000000000000000');
  });

  it('failure case: unusable decimals writes nothing', () => {
    for (const d of [Number.NaN, -1, 1.5, 101]) expect(step('1', { decimals: d })).toBeNull();
  });
});

describe('INV-8: the step base is read exactly; only a plain or empty-looking base is stepped', () => {
  it.each<[string, unknown, string | null]>([
    ['undefined', undefined, '0.01'],
    ['null', null, '0.01'],
    ["''", '', '0.01'],
    ["'-'", '-', '0.01'],
    ["'.'", '.', '0.01'],
    ["'-.'", '-.', '0.01'],
    ["'1.5'", '1.5', '1.51'],
    ["'007.'", '007.', '7.01'],
    ['1.5 (number)', 1.5, '1.51'],
    ['1e21 (number)', 1e21, '1000000000000000000000.01'],
    ['2n**70n', 2n ** 70n, '1180591620717411303424.01'],
    ['NaN', Number.NaN, null],
    ['Infinity', Infinity, null],
    ['-Infinity', -Infinity, null],
    ["'1,000'", '1,000', null],
    ["'12abc'", '12abc', null],
    ["'1e3'", '1e3', null],
    ["' 1'", ' 1', null],
    ['{}', {}, '0.01'],
    ['Symbol()', Symbol('x'), '0.01'],
  ])('base %s → %s', (_label, value, expected) => {
    expect(step(value)).toBe(expected);
  });

  it('boundary: a bigint base keeps every digit at 0 decimals', () => {
    expect(step(2n ** 70n, { step: 1, decimals: 0 })).toBe((2n ** 70n + 1n).toString());
  });
});

describe('INV-9: step and bounds never produce NaN, Infinity or a float-clamped value', () => {
  it.each([Number.NaN, Infinity, -Infinity])('step %d → null', (n) => {
    expect(step('1', { step: n })).toBeNull();
  });

  it.each<[string, Partial<AmountStepOptions>, string | null]>([
    ['step 0', { step: 0 }, '1.00'],
    ['negative step', { step: -0.01 }, '0.99'],
    ['step 1e-7 at 7', { step: 1e-7, decimals: 7 }, '1.0000001'],
    ['step 1e21 at 0', { step: 1e21, decimals: 0 }, '1000000000000000000001'],
    ['min NaN ignored', { min: Number.NaN }, '1.01'],
    ['max NaN ignored', { max: Number.NaN }, '1.01'],
    ['max -Infinity ignored', { max: -Infinity }, '1.01'],
    ['min Infinity ignored', { min: Infinity }, '1.01'],
    ['max 0 clamps', { max: 0 }, '0.00'],
    ['min 2 clamps', { min: 2 }, '2.00'],
    ['min > max: max wins', { min: 5, max: 3 }, '3.00'],
    ['max 1.005 at 2 rounds past the bound (D-9, accepted)', { max: 1.005 }, '1.01'],
    ['max 2^53+2 above the value: no clamp', { max: 2 ** 53 + 2 }, '1.01'],
  ])('%s', (_label, over, expected) => {
    expect(step('1', over)).toBe(expected);
  });

  it('boundary: a bound above 2^53 clamps to its own exact text, not a float neighbour', () => {
    const big = 2 ** 53 + 2; // 9007199254740994
    expect(step('9007199254740999', { step: 1, decimals: 0, max: big })).toBe('9007199254740994');
    expect(step('9007199254740990', { step: 1, decimals: 0, min: big })).toBe('9007199254740994');
  });

  it('failure case: no result is ever NaN, Infinity or exponent form', () => {
    const values: unknown[] = ['1', '', 1e21, Number.NaN, '-0.5'];
    const opts: Array<Partial<AmountStepOptions>> = [
      { step: Number.NaN },
      { min: Number.NaN, max: -Infinity },
      { step: 1e21, decimals: 0 },
      { step: 1e-7, decimals: 100 },
    ];
    for (const v of values) {
      for (const o of opts) {
        const out = step(v, o);
        if (out !== null) expect(out).not.toMatch(/NaN|Infinity|e/i);
      }
    }
  });
});

describe('INV-18: bounded cost', () => {
  /** Best of `runs` timings, so one scheduler stall under a parallel suite does not fail it. */
  function minMs(fn: () => unknown, runs = 5): number {
    let best = Infinity;
    for (let i = 0; i < runs; i += 1) {
      const t0 = performance.now();
      fn();
      best = Math.min(best, performance.now() - t0);
    }
    return best;
  }

  it('plain, all-nines carry and near misses: 10k→100k growth ~linear', () => {
    const sizes = [10, 1_000, 10_000, 100_000] as const;
    const bySize: Record<number, Record<string, number>> = {};
    for (const n of sizes) {
      const plain = `${'7'.repeat(Math.max(1, n - 3))}.25`;
      const nines = `${'9'.repeat(Math.max(1, n - 3))}.95`;
      const nearMiss = `${'1'.repeat(n)}x`;
      const dots = '.'.repeat(n);
      expect(formatAmountText(plain, 1)).not.toBeNull();
      expect(formatAmountText(nines, 1)).toBe(`1${'0'.repeat(Math.max(1, n - 3))}.0`);
      expect(formatAmountText(nearMiss, 2)).toBeNull();
      expect(formatAmountText(dots, 2)).toBeNull();
      expect(stepAmountText(plain, { direction: 1, step: 0.01, decimals: 2 })).not.toBeNull();
      bySize[n] = {
        plain: minMs(() => formatAmountText(plain, 1)),
        nines: minMs(() => formatAmountText(nines, 1)),
        nearMiss: minMs(() => formatAmountText(nearMiss, 2)),
        dots: minMs(() => formatAmountText(dots, 2)),
        step: minMs(() => stepAmountText(plain, { direction: 1, step: 0.01, decimals: 2 })),
      };
    }
    // 10× input ⇒ ~10× time if linear, ~100× if quadratic. Cap at 50 (half of quadratic)
    // so parallel-suite / CI timer noise does not flake while still catching O(n²).
    for (const name of Object.keys(bySize[10_000] ?? {})) {
      const t10k = bySize[10_000]?.[name] ?? Infinity;
      const t100k = bySize[100_000]?.[name] ?? Infinity;
      expect(t100k / Math.max(t10k, 0.1), `${name} 10k→100k growth`).toBeLessThan(50);
    }
    // Absolute wall-clock is local-only; shared CI runners are too noisy for ms budgets.
    if (!process.env.CI) {
      for (const n of sizes) {
        for (const [name, ms] of Object.entries(bySize[n] ?? {})) {
          expect(ms, `${name} @ ${n}`).toBeLessThan(250);
        }
      }
    }
  });

  it('boundary: padding is capped at decimals 100, so a blur allocates at most input + 101 characters', () => {
    const out = formatAmountText('1', 100);
    expect(out?.length).toBe(102);
    expect(formatAmountText('1', 101)).toBeNull();
  });

  it('purity: the same input gives the same output across calls (no module state)', () => {
    const a = [
      formatAmountText('1.005', 2),
      stepAmountText('1', { direction: 1, step: 1, decimals: 0 }),
    ];
    formatAmountText('9'.repeat(1000), 100);
    const b = [
      formatAmountText('1.005', 2),
      stepAmountText('1', { direction: 1, step: 1, decimals: 0 }),
    ];
    expect(b).toEqual(a);
  });
});
