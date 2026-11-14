/**
 * 007 SF-3 · grouped-display helpers (pure): `groupAmountText`, `toPlainOffset`,
 * `isGroupedAmountValue`. Each `describe` starts with the INV id it verifies, so a failure
 * names the property that broke. Property tests are seeded (mulberry32); the seed is in
 * each test title. The oracle is the independent reference grouper in
 * `amount-grouped.sf3-kit.ts`.
 */
import { describe, expect, it, vi } from 'vitest';

import { groupAmountText, isGroupedAmountValue, toPlainOffset } from '../utils/amountGrouping';
import {
  GROUPED_AMOUNT_PATTERN,
  PLAIN_AMOUNT_PATTERN,
  toAmountFormValue,
} from '../utils/decimalValidation';
import {
  createRng,
  randomGroupedText,
  randomHostileString,
  randomNearMiss,
  randomPlainText,
  SC003_INVALID_CASES,
  SC003_OVER_LIMIT_CASES,
  SC003_VALID_CASES,
  viemParseUnits,
} from './amount-exact.sf10-kit';
import { REF_GROUPED, REF_PLAIN, refGroup, strip } from './amount-grouped.sf3-kit';

// Seeded property loops and corpus sweeps: generous on a loaded machine, still bounded.
vi.setConfig({ testTimeout: 60_000 });

/** Strings the grouper must leave alone and must not choke on. */
const ADVERSARIAL: readonly string[] = [
  '',
  '-',
  '.',
  '-.',
  '1e18',
  '1E18',
  '1,000',
  '1,000,000.50',
  '25,00,000',
  ' 1000 ',
  '1000 ',
  '\t1000',
  '１２３４',
  '١٢٣٤',
  '\ud800',
  '1000\udfff',
  '‮1000',
  '1000‏',
  '−1234',
  '+1234',
  '007',
  '0000',
  '000123.450',
  '-0001234',
  '.5',
  '-.5',
  '12abc',
  '1..2',
  '1234\n',
  '0x1234',
  'NaN',
  'Infinity',
];

function integerPart(plain: string): string {
  const body = plain.startsWith('-') ? plain.slice(1) : plain;
  const dot = body.indexOf('.');
  return dot < 0 ? body : body.slice(0, dot);
}

describe('INV-10: groupAmountText is total and leaves alone everything outside its domain', () => {
  it.each(ADVERSARIAL.map((t) => [JSON.stringify(t), t] as const))(
    'adversarial %s: returned unchanged',
    (_label, text) => {
      expect(groupAmountText(text)).toBe(text);
    }
  );

  it.each([
    ['fewer than four integer digits', '999', '999'],
    ['fewer than four integer digits, long fraction', '999.123456789', '999.123456789'],
    ['signed, three digits', '-999', '-999'],
    ['zero-led integer part', '0123456', '0123456'],
    ['zero-led with fraction', '000123.450', '000123.450'],
    ['no integer part', '.123456', '.123456'],
    ['boundary: exactly four digits is grouped', '1000', '1,000'],
  ])('%s: %s -> %s', (_label, input, expected) => {
    expect(groupAmountText(input)).toBe(expected);
  });

  it('fuzz (seed 0x5f3a10): 30,000 arbitrary strings never throw; identity whenever a guard applies', () => {
    const rng = createRng(0x5f3a10);
    for (let i = 0; i < 30_000; i += 1) {
      const kind = i % 3;
      const text =
        kind === 0
          ? randomHostileString(rng, 24)
          : kind === 1
            ? randomNearMiss(rng)
            : randomPlainText(rng, 8, 6);
      const out = groupAmountText(text);
      expect(typeof out).toBe('string');
      const guarded =
        !REF_PLAIN.test(text) || integerPart(text).length < 4 || integerPart(text).startsWith('0');
      if (guarded) expect(out, JSON.stringify(text)).toBe(text);
      else expect(out, JSON.stringify(text)).not.toBe(text);
    }
  });
});

describe('INV-11: grouping adds commas to the integer part and changes nothing else', () => {
  it.each([
    ['250000.00', '250,000.00'],
    ['-1234', '-1,234'],
    ['1000.', '1,000.'],
    ['1234567.89', '1,234,567.89'],
    ['-1234567', '-1,234,567'],
    ['12345', '12,345'],
    ['123456', '123,456'],
    ['1000000', '1,000,000'],
    ['1000.000000000000000000', '1,000.000000000000000000'],
    ['123456789012345678.123456789012345678', '123,456,789,012,345,678.123456789012345678'],
  ])('%s -> %s (sign, digits, point and trailing zeros kept)', (input, expected) => {
    expect(groupAmountText(input)).toBe(expected);
  });

  it('property (seed 0x5f3a11): 6,000 plain texts up to 200+200 digits keep every character and match the reference', () => {
    const rng = createRng(0x5f3a11);
    for (let i = 0; i < 6_000; i += 1) {
      const max = i % 10 === 0 ? 200 : 24;
      const t = randomPlainText(rng, max, max);
      const g = groupAmountText(t);
      expect(strip(g), t).toBe(t);
      expect(g, t).toBe(refGroup(t));
      if (g !== t) {
        expect(REF_GROUPED.test(g), g).toBe(true);
        expect(GROUPED_AMOUNT_PATTERN.test(g), g).toBe(true);
        const dot = g.indexOf('.');
        if (dot !== -1) expect(g.slice(dot).includes(','), g).toBe(false);
        expect(toAmountFormValue(g, true), g).toBe(t);
      }
      const decimals = 220;
      expect(viemParseUnits(strip(g), decimals), t).toBe(viemParseUnits(t, decimals));
    }
  });

  it('corpus: every valid and over-limit row, as plain text, groups to the reference and strips back', () => {
    const rows = [...SC003_VALID_CASES, ...SC003_OVER_LIMIT_CASES].map(strip);
    expect(rows.length).toBeGreaterThanOrEqual(50);
    for (const plain of rows) {
      const g = groupAmountText(plain);
      expect(g, plain).toBe(refGroup(plain));
      expect(strip(g), plain).toBe(plain);
      expect(viemParseUnits(strip(g), 30), plain).toBe(viemParseUnits(plain, 30));
    }
  });

  it('failure case: text that is not plain is never "repaired" (every invalid corpus row is returned as given)', () => {
    for (const row of SC003_INVALID_CASES) expect(groupAmountText(row), row).toBe(row);
  });
});

describe('INV-12: grouping and stripping are inverse on the grouped language; grouping is idempotent', () => {
  it('property (seed 0x5f3a12): group(strip(g)) === g for 6,000 grouped texts', () => {
    const rng = createRng(0x5f3a12);
    for (let i = 0; i < 6_000; i += 1) {
      const g = randomGroupedText(rng, i % 10 === 0 ? 60 : 9, 30);
      expect(GROUPED_AMOUNT_PATTERN.test(g), g).toBe(true);
      expect(groupAmountText(strip(g)), g).toBe(g);
    }
  });

  it.each(['1,000,000.50', '1,000.', '-12,345.678901234567890123', '1,000.000000000000000000'])(
    'a validly grouped seed %s is displayed exactly as written',
    (g) => {
      expect(groupAmountText(strip(g))).toBe(g);
    }
  );

  it('property (seed 0x5f3a13): group(group(t)) === group(t) for 20,000 arbitrary strings', () => {
    const rng = createRng(0x5f3a13);
    for (let i = 0; i < 20_000; i += 1) {
      const kind = i % 4;
      const t =
        kind === 0
          ? randomHostileString(rng, 20)
          : kind === 1
            ? randomNearMiss(rng)
            : kind === 2
              ? randomPlainText(rng, 20, 8)
              : randomGroupedText(rng, 5, 8);
      const once = groupAmountText(t);
      expect(groupAmountText(once), JSON.stringify(t)).toBe(once);
    }
  });

  it('boundary (seed 0x5f3a14): plain texts with 4+ integer digits and no leading zero map one-to-one onto the grouped grammar', () => {
    const rng = createRng(0x5f3a14);
    const seen = new Map<string, string>();
    for (let i = 0; i < 4_000; i += 1) {
      const t = randomPlainText(rng, 12, 4);
      const int = integerPart(t);
      if (int.length < 4 || int.startsWith('0')) continue;
      const g = groupAmountText(t);
      expect(REF_GROUPED.test(g), g).toBe(true);
      const earlier = seen.get(g);
      if (earlier !== undefined) expect(earlier).toBe(t);
      seen.set(g, t);
    }
    expect(seen.size).toBeGreaterThan(1_000);
  });
});

describe('INV-13: toPlainOffset is total, clamped, monotone and keeps the text left of the caret', () => {
  const NON_FINITE = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];

  it('named: 1,234,567.89 maps each caret to the same digits on the left', () => {
    const d = '1,234,567.89';
    expect([0, 1, 2, 3, 5, 6, 9, 10, 12].map((o) => toPlainOffset(d, o))).toEqual([
      0, 1, 1, 2, 4, 4, 7, 8, 10,
    ]);
  });

  it('property (seed 0x5f3a15): 3,000 grouped, plain and hostile texts, every offset from -2 to length + 2', () => {
    const rng = createRng(0x5f3a15);
    for (let i = 0; i < 3_000; i += 1) {
      const kind = i % 3;
      const d =
        kind === 0
          ? randomGroupedText(rng, 8, 10)
          : kind === 1
            ? randomPlainText(rng, 12, 6)
            : randomHostileString(rng, 20);
      const plain = strip(d);
      let previous = 0;
      for (let o = -2; o <= d.length + 2; o += 1) {
        const got = toPlainOffset(d, o);
        expect(Number.isInteger(got), `${d} @ ${o}`).toBe(true);
        expect(got, `${d} @ ${o}`).toBeGreaterThanOrEqual(0);
        expect(got, `${d} @ ${o}`).toBeLessThanOrEqual(plain.length);
        expect(got, `${d} @ ${o} monotone`).toBeGreaterThanOrEqual(previous);
        previous = got;
        if (o >= 0 && o <= d.length) {
          expect(strip(d.slice(0, o)), `${d} @ ${o}`).toBe(plain.slice(0, got));
        }
      }
      expect(toPlainOffset(d, 0)).toBe(0);
      expect(toPlainOffset(d, d.length)).toBe(plain.length);
    }
  });

  it('boundary: fractional offsets are floored and stay monotone', () => {
    const d = '1,234,567.89';
    expect(toPlainOffset(d, 0.9)).toBe(0);
    expect(toPlainOffset(d, 5.5)).toBe(toPlainOffset(d, 5));
    expect(toPlainOffset(d, 11.999)).toBe(toPlainOffset(d, 11));
    expect(toPlainOffset(d, 12.5)).toBe(10);
    let previous = 0;
    for (let o = -1; o <= 13; o += 0.25) {
      const got = toPlainOffset(d, o);
      expect(got).toBeGreaterThanOrEqual(previous);
      previous = got;
    }
  });

  it.each(['', '1,234,567.89', ',,,', '1000'])(
    'failure case: NaN and infinities on %j never throw and stay in range',
    (d) => {
      expect(toPlainOffset(d, Number.NaN)).toBe(0);
      expect(toPlainOffset(d, Number.NEGATIVE_INFINITY)).toBe(0);
      expect(toPlainOffset(d, Number.POSITIVE_INFINITY)).toBe(strip(d).length);
      expect(toPlainOffset(d, -0)).toBe(0);
      for (const o of NON_FINITE) {
        const got = toPlainOffset(d, o);
        expect(Number.isInteger(got)).toBe(true);
      }
    }
  );
});

describe('INV-14: isGroupedAmountValue is exactly "a string that matches the grouped grammar"', () => {
  it.each([
    '1,000',
    '250,000.00',
    '-12,345.678',
    '1,000.',
    '999,999,999,999,999,999.999999999999999999',
  ])('true for the validly grouped string %s', (v) => {
    expect(isGroupedAmountValue(v)).toBe(true);
  });

  it.each([
    ['plain text', '250000.00'],
    ['empty string', ''],
    ['wrongly grouped', '25,00,000'],
    ['zero-led group', '000,123'],
    ['zero first group', '0,123'],
    ['leading whitespace', ' 1,000'],
    ['trailing whitespace', '1,000 '],
    ['trailing newline', '1,000\n'],
    ['exponent', '1,000e3'],
    ['comma in the fraction', '1,000.5,0'],
    ['trailing comma', '1,000,'],
    ['full-width digits', '１,０００'],
  ])('false for %s', (_label, v) => {
    expect(isGroupedAmountValue(v)).toBe(false);
  });

  it('failure case: non-strings are false without being coerced or thrown on', () => {
    let coerced = 0;
    const hostile = {
      toString(): string {
        coerced += 1;
        throw new Error('toString must not be called');
      },
      valueOf(): string {
        coerced += 1;
        throw new Error('valueOf must not be called');
      },
      [Symbol.toPrimitive](): string {
        coerced += 1;
        throw new Error('toPrimitive must not be called');
      },
    };
    const looksGrouped = { toString: () => '1,000' };
    const values: unknown[] = [
      Object('1,000'),
      hostile,
      looksGrouped,
      Symbol('1,000'),
      1000,
      1_000_000,
      1000n,
      null,
      undefined,
      true,
      ['1,000'],
      Number.NaN,
      () => '1,000',
    ];
    for (const v of values) {
      expect(() => isGroupedAmountValue(v)).not.toThrow();
      expect(isGroupedAmountValue(v)).toBe(false);
    }
    expect(coerced).toBe(0);
  });

  it('property (seed 0x5f3a16): equals the grouped grammar for 30,000 arbitrary strings', () => {
    const rng = createRng(0x5f3a16);
    let trues = 0;
    for (let i = 0; i < 30_000; i += 1) {
      const kind = i % 4;
      const t =
        kind === 0
          ? randomHostileString(rng, 16)
          : kind === 1
            ? randomNearMiss(rng)
            : kind === 2
              ? randomPlainText(rng, 10, 6)
              : randomGroupedText(rng, 5, 6);
      const expected = REF_GROUPED.test(t);
      if (expected) trues += 1;
      expect(isGroupedAmountValue(t), JSON.stringify(t)).toBe(expected);
    }
    expect(trues).toBeGreaterThan(5_000);
  });
});

describe('INV-32: grouping, offset mapping and the grouped check are linear, with no length cap', () => {
  const run = (text: string): void => {
    const g = groupAmountText(text);
    toPlainOffset(g, g.length - 1);
    toPlainOffset(text, text.length);
    isGroupedAmountValue(text);
    isGroupedAmountValue(g);
  };
  const shapes: Record<string, (n: number) => string> = {
    'all digits': (n) => '9'.repeat(n),
    'signed digits with a long fraction': (n) => `-${'7'.repeat(n / 2)}.${'1'.repeat(n / 2)}`,
    'valid grouped': (n) => `1${',111'.repeat(Math.floor(n / 4))}`,
    'grouped near-miss + x': (n) => `1${',111'.repeat(Math.floor(n / 4))}x`,
    'digits then a long fraction': (n) => `1234.${'0'.repeat(n)}`,
    'zero-led digits': (n) => '0'.repeat(n),
    'commas only': (n) => ','.repeat(n),
  };

  function perCallMs(text: string): number {
    const reps = Math.max(1, Math.round(200_000 / text.length));
    const samples: number[] = [];
    for (let s = 0; s < 5; s += 1) {
      const start = performance.now();
      for (let r = 0; r < reps; r += 1) run(text);
      samples.push((performance.now() - start) / reps);
    }
    samples.sort((a, b) => a - b);
    return samples[2] ?? Infinity;
  }

  it.each(Object.entries(shapes))('%s: 10k→100k growth ~linear', (_name, make) => {
    for (const n of [10, 1_000]) run(make(n)); // warm up
    const t10k = perCallMs(make(10_000));
    const t100k = perCallMs(make(100_000));
    // 10× input ⇒ ~10× time if linear, ~100× if quadratic. Cap at 50 (half of quadratic)
    // so parallel-suite / CI timer noise does not flake while still catching O(n²).
    const growth = t100k / Math.max(t10k, 0.1);
    expect(growth).toBeLessThan(50);
    // Absolute wall-clock is local-only; shared CI runners are too noisy for ms budgets.
    if (!process.env.CI) expect(t100k).toBeLessThan(250);
  });

  it.each([1, 3, 4, 6, 7, 1_000, 99_999, 100_000])(
    'boundary: %i digits group to at most length + floor((length - 1) / 3) characters',
    (n) => {
      const t = '9'.repeat(n);
      const g = groupAmountText(t);
      expect(g.length).toBe(t.length + Math.floor((t.length - 1) / 3));
      expect(strip(g)).toBe(t);
    }
  );

  it('the patterns the helpers rely on have no nested quantifier over the same characters (no lookahead grouping regex in the file)', () => {
    expect(PLAIN_AMOUNT_PATTERN.source).not.toMatch(/\(\?=|\(\?!/);
    expect(GROUPED_AMOUNT_PATTERN.source).not.toMatch(/\(\?=|\(\?!/);
  });
});
