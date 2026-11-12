/**
 * 005 SF-10 · exact-decimal helpers (pure). Each `describe` starts with the INV id it
 * verifies, so a failure names the property that broke. Property tests are seeded
 * (mulberry32); the seed is in each test title.
 */
import { describe, expect, it, vi } from 'vitest';

import {
  AMOUNT_GENERIC_MESSAGE,
  AMOUNT_MISCONFIGURED_MESSAGE,
  AMOUNT_REQUIRED_MESSAGE,
  AMOUNT_TEXT_ISSUE_MESSAGES,
  classifyAmountText,
  compareDecimalStrings,
  fractionDigits,
  GROUPED_AMOUNT_PATTERN,
  isEmptyAmountValue,
  isValidAmountText,
  numberToDecimalString,
  PLAIN_AMOUNT_PATTERN,
  toAmountDisplayText,
  toAmountFormValue,
  validateExactAmount,
  type AmountTextIssue,
  type ExactAmountValidationOptions,
} from '../utils/decimalValidation';
import {
  createRng,
  pick,
  randInt,
  randomFiniteDouble,
  randomGroupedText,
  randomHostileString,
  randomNearMiss,
  randomPlainText,
  refCompare,
  refParseUnits,
  typeBypass,
  viemParseUnits,
} from './amount-exact.sf10-kit';

const PLAIN = PLAIN_AMOUNT_PATTERN;
const OPTS: ExactAmountValidationOptions = { required: false, allowGrouping: false, decimals: 18 };
const opts = (over: Partial<ExactAmountValidationOptions> = {}): ExactAmountValidationOptions => ({
  ...OPTS,
  ...over,
});

/** A corpus mixing uniform hostile strings, valid plain/grouped texts and near misses. */
function corpus(seed: number, size: number): string[] {
  const rng = createRng(seed);
  const out: string[] = [];
  for (let i = 0; i < size; i += 1) {
    const kind = i % 4;
    if (kind === 0) out.push(randomHostileString(rng));
    else if (kind === 1) out.push(randomPlainText(rng, 12, 12));
    else if (kind === 2) out.push(randomGroupedText(rng, 5, 8));
    else out.push(randomNearMiss(rng));
  }
  return out;
}

describe('INV-9: normalization removes commas only, and only from valid text', () => {
  it.each([true, false])('seed 9001: 12,000 strings, allowGrouping=%s', (g) => {
    for (const t of corpus(9001 + Number(g), 12_000)) {
      const v = toAmountFormValue(t, g);
      if (t === '') expect(v).toBe('');
      else if (isValidAmountText(t, g)) expect(v, t).toBe(t.replace(/,/g, ''));
      else expect(v, t).toBe(t);
      if (!g) expect(v, t).toBe(t);
      // Only ',' may be removed: dropping commas from both sides gives the same string.
      expect(v.replace(/,/g, ''), t).toBe(t.replace(/,/g, ''));
    }
  });

  it('boundary: valid grouping-off text never contains a comma', () => {
    for (const t of corpus(9003, 4_000)) {
      if (isValidAmountText(t, false)) expect(t.includes(','), t).toBe(false);
    }
  });

  it('failure case: comma-decimal and malformed groups are kept raw, never stripped into a number', () => {
    for (const t of ['1,5', '0,123', '1234,567', ',123', '1,,000', '1,000,', '1,000.5,0']) {
      expect(toAmountFormValue(t, true), t).toBe(t);
      expect(toAmountFormValue(t, false), t).toBe(t);
    }
  });
});

describe('INV-10: closure, valid text ⇔ plain value', () => {
  it.each([true, false])('seed 1010: 12,000 strings, allowGrouping=%s', (g) => {
    for (const t of corpus(1010 + Number(g), 12_000)) {
      if (t === '') continue;
      expect(PLAIN.test(toAmountFormValue(t, g)), t).toBe(isValidAmountText(t, g));
    }
  });

  it('seed 1012: 200,000-sample re-run of the Design check (both grouping flags)', () => {
    const rng = createRng(1012);
    let validSeen = 0;
    for (let i = 0; i < 200_000; i += 1) {
      const t = i % 2 === 0 ? randomNearMiss(rng) : randomHostileString(rng, 10);
      const g = i % 3 !== 0;
      if (t === '') continue;
      const valid = isValidAmountText(t, g);
      if (valid) validSeen += 1;
      if (PLAIN.test(toAmountFormValue(t, g)) !== valid) {
        throw new Error(`closure broken for ${JSON.stringify(t)} g=${g}`);
      }
    }
    // The corpus must reach both sides of the boundary for the check to mean anything.
    expect(validSeen).toBeGreaterThan(10_000);
  });

  it.each([
    ['1,5'],
    ['0,123'],
    ['1234,567'],
    [',123'],
    ['1,,000'],
    ['1,000,'],
    ['-1,000.5'],
    ['1,000.'],
    ['1,000.5,0'],
  ])('edge table: %s', (t) => {
    for (const g of [true, false]) {
      expect(PLAIN.test(toAmountFormValue(t, g))).toBe(isValidAmountText(t, g));
    }
  });
});

describe('INV-11: the accepted languages are exactly as specified', () => {
  it.each(['0', '007', '.5', '5.', '-0', '-.5', '123.456', '-1', '1.', '00.00'])(
    'PLAIN accepts %j',
    (t) => {
      expect(PLAIN.test(t)).toBe(true);
      expect(isValidAmountText(t, false)).toBe(true);
      expect(isValidAmountText(t, true)).toBe(true);
    }
  );

  it.each([
    '',
    '-',
    '.',
    '-.',
    '+1',
    '1e18',
    '1E18',
    ' 1',
    '1 ',
    '1 0',
    '\t1',
    '1\n',
    '1.2.3',
    '1..2',
    '--1',
    '1-',
    '1-2',
    '1,000',
    ',',
    '١٢',
    '１２',
    '−1',
    '∞',
    'NaN',
    'Infinity',
    '0x10',
  ])('PLAIN rejects %j', (t) => {
    expect(PLAIN.test(t)).toBe(false);
    expect(isValidAmountText(t, false)).toBe(false);
  });

  it.each(['1,000', '12,345', '123,456,789', '-1,000', '1,000.', '1,000.5', '-9,999,999.123456'])(
    'GROUPED accepts %j only when grouping is on',
    (t) => {
      expect(GROUPED_AMOUNT_PATTERN.test(t)).toBe(true);
      expect(isValidAmountText(t, true)).toBe(true);
      expect(isValidAmountText(t, false)).toBe(false);
    }
  );

  it.each([
    '1234,567',
    '0,123',
    '01,000',
    '1,00',
    '1,0000',
    ',123',
    '1,,000',
    '1,000,',
    '1,000.5,0',
    '1,000.1,000',
    '1000',
    '+1,000',
    ' 1,000',
    '1,000 ',
    '1,١٢٣',
  ])('GROUPED rejects %j', (t) => {
    expect(GROUPED_AMOUNT_PATTERN.test(t)).toBe(false);
  });

  it('boundary: grouping on keeps ungrouped text valid and rejects mixed forms', () => {
    expect(isValidAmountText('1234567.5', true)).toBe(true);
    expect(isValidAmountText('1234,567', true)).toBe(false);
  });

  it('patterns carry no u / i flag (ASCII-only digits)', () => {
    expect(PLAIN.flags).toBe('');
    expect(GROUPED_AMOUNT_PATTERN.flags).toBe('');
  });

  it('seed 1111: differential vs vendored viem grammar, PLAIN = viem-accepted minus the digitless texts', () => {
    const digitless = new Set(['', '-', '.', '-.']);
    for (const t of corpus(1111, 20_000)) {
      let viemAccepts = true;
      try {
        viemParseUnits(t, 18);
      } catch {
        viemAccepts = false;
      }
      expect(PLAIN.test(t), t).toBe(viemAccepts && !digitless.has(t));
    }
  });
});

describe('INV-12: validateExactAmount is total, ordered, true or a non-empty message', () => {
  it('step 1 empty: required message or true for "", null, undefined', () => {
    for (const v of ['', null, undefined]) {
      expect(validateExactAmount(v, opts({ required: true }))).toBe(AMOUNT_REQUIRED_MESSAGE);
      expect(validateExactAmount(v, opts())).toBe(true);
    }
  });

  it('each step fails on its own input', () => {
    expect(validateExactAmount({}, opts())).toBe(AMOUNT_GENERIC_MESSAGE); // 2
    expect(validateExactAmount('1..2', opts())).toBe(AMOUNT_TEXT_ISSUE_MESSAGES['multiple-points']); // 3
    expect(validateExactAmount('1.234', opts({ decimals: 2 }))).toBe(
      'Use at most 2 decimal places'
    ); // 4
    expect(validateExactAmount('11', opts({ max: 10 }))).toBe('Value must be at most 10'); // 5
    expect(validateExactAmount('5', opts({ validateAmount: () => 'nope' }))).toBe('nope'); // 6
  });

  it('two failing steps: the earlier message wins', () => {
    // grammar beats decimals, bounds and validator
    const validator = vi.fn(() => 'validator');
    expect(
      validateExactAmount('1.2.345', opts({ decimals: 1, max: 0, validateAmount: validator }))
    ).toBe(AMOUNT_TEXT_ISSUE_MESSAGES['multiple-points']);
    // decimals beats bounds
    expect(validateExactAmount('99.999', opts({ decimals: 2, max: 1 }))).toBe(
      'Use at most 2 decimal places'
    );
    // bounds beat validator
    expect(validateExactAmount('-1', opts({ min: 0, validateAmount: validator }))).toBe(
      'Value must be at least 0'
    );
    // required beats everything for empty; type beats grammar for objects
    expect(validateExactAmount('', opts({ required: true, min: 'bad' }))).toBe(
      AMOUNT_REQUIRED_MESSAGE
    );
    expect(validateExactAmount([], opts({ decimals: -1 }))).toBe(AMOUNT_GENERIC_MESSAGE);
    expect(validator).not.toHaveBeenCalled();
  });

  it('drift: a malformed text under a misconfigured limit reports the grammar message (order kept)', () => {
    expect(validateExactAmount('1..2', opts({ decimals: Number.NaN }))).toBe(
      AMOUNT_TEXT_ISSUE_MESSAGES['multiple-points']
    );
    expect(validateExactAmount('1,5', opts({ max: '1,000' }))).toBe(
      AMOUNT_TEXT_ISSUE_MESSAGES['grouping-not-allowed']
    );
  });

  it('classifyAmountText precedence: incomplete → exponent → multiple-points → grouping → invalid', () => {
    const table: Array<[string, boolean, AmountTextIssue]> = [
      ['-', false, 'incomplete'],
      ['.', true, 'incomplete'],
      ['-.', false, 'incomplete'],
      ['1e18', false, 'exponent'],
      ['-1.5E-7', true, 'exponent'],
      ['1,000e3', false, 'exponent'], // exponent beats grouping
      ['1.2.3e5', false, 'exponent'], // exponent beats multiple-points
      ['1e', false, 'exponent'],
      ['1..2', false, 'multiple-points'],
      ['1,000.5.5', true, 'multiple-points'], // multiple-points beats grouping
      ['1,5', false, 'grouping-not-allowed'],
      ['1,5', true, 'grouping-malformed'],
      ['1,000', false, 'grouping-not-allowed'],
      ['1,000', true, 'grouping-unnormalized'], // only reachable via an outside write
      ['+1', false, 'invalid'],
      [' 1', true, 'invalid'],
      ['١', false, 'invalid'],
    ];
    for (const [text, g, issue] of table) expect(classifyAmountText(text, g), text).toBe(issue);
  });

  it('drift: exponent is number-shaped only; letters elsewhere are "invalid" (INV-30 specificity)', () => {
    for (const t of [
      'e',
      'e5',
      '.e5',
      'abc',
      'hello',
      'NaN',
      'Infinity',
      '1e5.5',
      '1ee5',
      '0x1e3',
    ]) {
      expect(classifyAmountText(t, true), t).toBe('invalid');
    }
  });

  it('seed 1212: classifyAmountText is total and deterministic over 20,000 strings', () => {
    const issues = new Set(Object.keys(AMOUNT_TEXT_ISSUE_MESSAGES));
    for (const t of corpus(1212, 20_000)) {
      const a = classifyAmountText(t, true);
      const b = classifyAmountText(t, false);
      expect(issues.has(a) && issues.has(b), t).toBe(true);
      expect(classifyAmountText(t, true)).toBe(a);
    }
  });

  it('seed 1213: fuzz over unknown values never throws and returns true | non-empty string', () => {
    const rng = createRng(1213);
    const values: unknown[] = [
      Number.NaN,
      Infinity,
      -Infinity,
      -0,
      0,
      0.1,
      1e21,
      5e-324,
      Number.MAX_VALUE,
      10n,
      -10n,
      true,
      false,
      {},
      [],
      ['1'],
      { toString: () => '1' },
      Symbol('x'),
      () => '1',
      new Date(0),
    ];
    for (let i = 0; i < 2_000; i += 1)
      values.push(randomHostileString(rng), randomFiniteDouble(rng));
    const optionSets: ExactAmountValidationOptions[] = [
      opts(),
      opts({ required: true, allowGrouping: true }),
      opts({ decimals: 0, min: '0', max: 1e21 }),
      opts({ decimals: Number.NaN }),
      opts({ min: 'x' }),
      opts({ validateAmount: (v) => v.length > 2 || 'short' }),
    ];
    for (const v of values) {
      for (const o of optionSets) {
        const r = validateExactAmount(v, o);
        expect(r === true || (typeof r === 'string' && r.length > 0)).toBe(true);
      }
    }
  });

  it('failure case: a throwing consumer validator propagates (as in default mode)', () => {
    const boom = new Error('consumer bug');
    expect(() =>
      validateExactAmount(
        '1',
        opts({
          validateAmount: () => {
            throw boom;
          },
        })
      )
    ).toThrow(boom);
  });
});

describe('INV-13: decimals are a limit counted as typed, never a rounding', () => {
  it('fractionDigits counts as typed', () => {
    expect(fractionDigits('1.500')).toBe(3);
    expect(fractionDigits('5.')).toBe(0);
    expect(fractionDigits('.5')).toBe(1);
    expect(fractionDigits('5')).toBe(0);
    expect(fractionDigits('-0.00')).toBe(2);
  });

  it.each([0, 2, 6, 7, 18, 30])('boundary table at decimals=%i', (d) => {
    const frac = (n: number, zeros = false): string =>
      n <= 0 ? '1' : `1.${(zeros ? '0' : '1').repeat(n)}`;
    for (const zeros of [false, true]) {
      if (d > 0) expect(validateExactAmount(frac(d - 1, zeros), opts({ decimals: d }))).toBe(true);
      expect(validateExactAmount(frac(d, zeros), opts({ decimals: d }))).toBe(true);
      const over = `1.${(zeros ? '0' : '1').repeat(d + 1)}`;
      expect(validateExactAmount(over, opts({ decimals: d }))).toBe(
        `Use at most ${d} decimal places`
      );
    }
  });

  it('boundary: decimals=0 accepts integers and "5." but not "5.0"', () => {
    expect(validateExactAmount('5', opts({ decimals: 0 }))).toBe(true);
    expect(validateExactAmount('5.', opts({ decimals: 0 }))).toBe(true);
    expect(validateExactAmount('5.0', opts({ decimals: 0 }))).toBe('Use at most 0 decimal places');
  });

  it('parked call (b): trailing zeros count, "1.500" fails at decimals 2', () => {
    expect(validateExactAmount('1.500', opts({ decimals: 2 }))).toBe(
      'Use at most 2 decimal places'
    );
  });

  it.each([-1, 1.5, Number.NaN, Infinity, -Infinity, 2 ** 53])(
    'failure case: decimals=%s fails closed for every non-empty plain value',
    (d) => {
      for (const v of ['0', '1', '1.5', '-3']) {
        expect(validateExactAmount(v, opts({ decimals: d }))).toBe(AMOUNT_MISCONFIGURED_MESSAGE);
      }
      expect(validateExactAmount('', opts({ decimals: d }))).toBe(true);
    }
  );
});

describe('INV-14: range checks are exact, inclusive, and fail closed on a bad bound', () => {
  it('seed 1414: compareDecimalStrings equals the BigInt reference on 12,000 pairs (80+ digits included)', () => {
    const rng = createRng(1414);
    for (let i = 0; i < 12_000; i += 1) {
      const long = i % 5 === 0;
      const a = randomPlainText(rng, long ? 90 : 6, long ? 90 : 6);
      // Near pairs share a prefix so the comparison reaches the deep digits.
      const b =
        i % 3 === 0
          ? a.slice(0, Math.max(1, a.length - 1)) + randInt(rng, 0, 9)
          : randomPlainText(rng, long ? 90 : 6, long ? 90 : 6);
      if (!PLAIN.test(b)) continue;
      expect(compareDecimalStrings(a, b), `${a} vs ${b}`).toBe(refCompare(a, b));
    }
  });

  it('seed 1415: order laws on 3,000 random triples', () => {
    const rng = createRng(1415);
    const gen = (): string => randomPlainText(rng, 3, 3);
    for (let i = 0; i < 3_000; i += 1) {
      const [a, b, c] = [gen(), gen(), gen()];
      expect(compareDecimalStrings(a, a)).toBe(0);
      expect(compareDecimalStrings(a, b)).toBe(-compareDecimalStrings(b, a) || 0);
      if (compareDecimalStrings(a, b) <= 0 && compareDecimalStrings(b, c) <= 0) {
        expect(compareDecimalStrings(a, c)).toBeLessThanOrEqual(0);
      }
    }
  });

  it('equal spellings compare equal', () => {
    const groups = [
      ['-0', '0', '0.000', '-.0', '.0', '0.', '000'],
      ['.5', '0.5', '0.50'],
      ['5.', '5', '5.000', '005'],
      ['007', '7'],
      ['1.50', '1.5'],
    ];
    for (const group of groups) {
      for (const a of group)
        for (const b of group) expect(compareDecimalStrings(a, b), `${a}=${b}`).toBe(0);
    }
  });

  it('seed 1416: numberToDecimalString round-trips 12,000 doubles plus edge values', () => {
    const rng = createRng(1416);
    const edges = [
      Number.MAX_VALUE,
      Number.MIN_VALUE,
      -Number.MAX_VALUE,
      2 ** 53 - 1,
      2 ** 53,
      2 ** 53 + 2,
      -(2 ** 53) - 2,
      1e21,
      1e-7,
      1.5e-300,
      2.2250738585072014e-308,
      0.1,
      -0.1,
      123.456,
    ];
    const values = [...edges];
    for (let i = 0; i < 12_000; i += 1) values.push(randomFiniteDouble(rng));
    for (const n of values) {
      const s = numberToDecimalString(n);
      expect(s, String(n)).not.toBeNull();
      expect(PLAIN.test(s ?? ''), `${n} → ${s}`).toBe(true);
      expect(Number(s), `${n} → ${s}`).toBe(n === 0 ? 0 : n);
    }
    expect(numberToDecimalString(-0)).toBe('0');
    expect(numberToDecimalString(1e21)).toBe('1000000000000000000000');
    expect(numberToDecimalString(1e-7)).toBe('0.0000001');
  });

  it('failure case: non-finite numbers do not convert', () => {
    expect(numberToDecimalString(Number.NaN)).toBeNull();
    expect(numberToDecimalString(Infinity)).toBeNull();
    expect(numberToDecimalString(-Infinity)).toBeNull();
  });

  it('bounds are inclusive; one step outside fails, with the decimal string in the message', () => {
    const o = opts({ decimals: 18, min: '0.000000000000000001', max: '9007199254740993' });
    expect(validateExactAmount('0.000000000000000001', o)).toBe(true);
    expect(validateExactAmount('9007199254740993', o)).toBe(true);
    expect(validateExactAmount('0', o)).toBe('Value must be at least 0.000000000000000001');
    expect(validateExactAmount('9007199254740993.000000000000000001', o)).toBe(
      'Value must be at most 9007199254740993'
    );
  });

  it('boundary: a string bound beyond 2^53 is exact (…993 vs …992 differ)', () => {
    expect(validateExactAmount('9007199254740993', opts({ max: '9007199254740992' }))).toBe(
      'Value must be at most 9007199254740992'
    );
    expect(validateExactAmount('9007199254740992', opts({ max: '9007199254740992' }))).toBe(true);
  });

  it('number bounds are converted exactly (max={1e21}, min={0.1})', () => {
    expect(validateExactAmount('1000000000000000000001', opts({ max: 1e21 }))).toBe(
      'Value must be at most 1000000000000000000000'
    );
    expect(validateExactAmount('0.1', opts({ min: 0.1 }))).toBe(true);
    expect(validateExactAmount('0.099999999999999999', opts({ min: 0.1 }))).toBe(
      'Value must be at least 0.1'
    );
  });

  it('boundary: min > max lets no non-empty value pass; negative under non-negative min is a range error', () => {
    for (const v of ['0', '5', '10', '-1', '100']) {
      expect(validateExactAmount(v, opts({ min: 10, max: 5 }))).not.toBe(true);
    }
    expect(validateExactAmount('-0.5', opts({ min: 0 }))).toBe('Value must be at least 0');
    expect(validateExactAmount('-0', opts({ min: 0 }))).toBe(true);
  });

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Infinity],
    ['-Infinity', -Infinity],
    ['comma string', '1,000'],
    ['whitespace string', ' 1'],
    ['exponent string', '1e3'],
    ['empty string', ''],
    ['bigint (type bypass)', 10n],
    ['object (type bypass)', {}],
  ])('failure case: bound %s fails closed', (_label, bound) => {
    const bad = typeBypass<number | string>(bound);
    for (const key of ['min', 'max'] as const) {
      for (const v of ['0', '1', '-1', '123.45']) {
        expect(validateExactAmount(v, opts({ [key]: bad }))).toBe(AMOUNT_MISCONFIGURED_MESSAGE);
      }
    }
  });
});

describe('INV-15: the consumer validator sees only valid, normalized strings; only true passes', () => {
  it('not called for any input failing steps 1–5; called once with the normalized string', () => {
    const spy = vi.fn((): boolean | string => true);
    const o = opts({ allowGrouping: true, decimals: 2, min: 0, max: 10_000, validateAmount: spy });
    for (const v of ['', null, undefined, {}, '1..2', '1,5', '1.234', '-1', '10001']) {
      validateExactAmount(v, o);
    }
    expect(spy).not.toHaveBeenCalled();
    // A user edit of `1,234.5` is stored as `1234.5`; a number default arrives converted.
    expect(validateExactAmount('1234.5', o)).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith('1234.5');
    validateExactAmount(12.5, o);
    expect(spy).toHaveBeenLastCalledWith('12.5');
    validateExactAmount(7n, o);
    expect(spy).toHaveBeenLastCalledWith('7');
  });

  it.each([
    ['true', true, true],
    ['message', 'too much', 'too much'],
    ['false', false, AMOUNT_GENERIC_MESSAGE],
    ['empty string', '', AMOUNT_GENERIC_MESSAGE],
    ['undefined', undefined, AMOUNT_GENERIC_MESSAGE],
    ['Promise', Promise.resolve(true), AMOUNT_GENERIC_MESSAGE],
    ['object', { ok: true }, AMOUNT_GENERIC_MESSAGE],
    ['1', 1, AMOUNT_GENERIC_MESSAGE],
  ])('result %s → %j', (_label, result, expected) => {
    const validateAmount = (): boolean | string => typeBypass<boolean | string>(result);
    expect(validateExactAmount('5', opts({ validateAmount }))).toBe(expected);
  });
});

describe('INV-16: outside values are displayed and validated the same way', () => {
  it.each<[string, unknown, string, true | string]>([
    ['string', '12.50', '12.50', true],
    ['grouped string', '1,000', '1,000', AMOUNT_TEXT_ISSUE_MESSAGES['grouping-not-allowed']],
    ['finite number', 0.1, '0.1', true],
    ['large number', 1e21, '1000000000000000000000', true],
    ['negative zero', -0, '0', true],
    ['NaN', Number.NaN, 'NaN', AMOUNT_GENERIC_MESSAGE],
    ['Infinity', Infinity, 'Infinity', AMOUNT_GENERIC_MESSAGE],
    ['bigint', 12345678901234567890n, '12345678901234567890', true],
    ['null', null, '', true],
    ['undefined', undefined, '', true],
    ['boolean', true, '', AMOUNT_GENERIC_MESSAGE],
    ['object', { a: 1 }, '', AMOUNT_GENERIC_MESSAGE],
    ['array', ['1'], '', AMOUNT_GENERIC_MESSAGE],
    ['symbol', Symbol('s'), '', AMOUNT_GENERIC_MESSAGE],
    ['function', () => 1, '', AMOUNT_GENERIC_MESSAGE],
  ])('%s: display and validation agree', (_label, value, display, verdict) => {
    expect(toAmountDisplayText(value)).toBe(display);
    expect(validateExactAmount(value, opts())).toBe(verdict);
  });

  it('failure case: an unsupported type never reads as empty, even when not required', () => {
    for (const v of [{}, [], true, Symbol('x'), Number.NaN]) {
      expect(isEmptyAmountValue(v)).toBe(false);
      expect(validateExactAmount(v, opts({ required: false }))).toBe(AMOUNT_GENERIC_MESSAGE);
    }
  });

  it('never calls toString on an object or String() on a symbol', () => {
    const toString = vi.fn(() => '999');
    expect(toAmountDisplayText({ toString })).toBe('');
    expect(toString).not.toHaveBeenCalled();
    expect(() => toAmountDisplayText(Symbol('boom'))).not.toThrow();
  });
});

describe('INV-17: a value that passes validation converts to exactly the amount on screen', () => {
  it('seed 1717: 6,000 random valid texts, decimals 0–30, random bounds', () => {
    const rng = createRng(1717);
    let passed = 0;
    for (let i = 0; i < 6_000; i += 1) {
      const g = rng() < 0.5;
      const text = g && rng() < 0.7 ? randomGroupedText(rng, 8, 30) : randomPlainText(rng, 30, 30);
      const decimals = randInt(rng, 0, 30);
      const bound = (): string | number | undefined =>
        pick(rng, [undefined, undefined, randomPlainText(rng, 25, 10), randInt(rng, -1e6, 1e6)]);
      const o = opts({ allowGrouping: g, decimals, min: bound(), max: bound() });
      if (!isValidAmountText(text, g)) continue;
      const value = toAmountFormValue(text, g);
      if (validateExactAmount(value, o) !== true) continue;
      passed += 1;
      expect(PLAIN.test(value)).toBe(true); // 1
      expect(fractionDigits(value)).toBeLessThanOrEqual(decimals); // 2
      // 3: bounds are small integers or plain strings, so String() is an exact reference here.
      const asDecimal = (b: string | number): string => (typeof b === 'number' ? String(b) : b);
      if (o.min !== undefined)
        expect(refCompare(value, asDecimal(o.min))).toBeGreaterThanOrEqual(0);
      if (o.max !== undefined) expect(refCompare(value, asDecimal(o.max))).toBeLessThanOrEqual(0);
      expect(value).toBe(text.replace(/,/g, '')); // 4
      // 5: viem (vendored) does not round and agrees with the independent reference.
      expect(viemParseUnits(value, decimals), `${value} @${decimals}`).toBe(
        refParseUnits(value, decimals)
      );
    }
    expect(passed).toBeGreaterThan(1_500);
  });

  it('failure case: viem rounds an over-limit value, which is why the decimals check must hold', () => {
    // Pins the hazard INV-13 protects against: viem silently rounds past `decimals`.
    expect(viemParseUnits('0.1234567890123456789', 18)).toBe(123456789012345679n);
    expect(validateExactAmount('0.1234567890123456789', opts({ decimals: 18 }))).toBe(
      'Use at most 18 decimal places'
    );
  });
});

describe('INV-25: validation and normalization run in linear time, no length cap', () => {
  const run = (text: string): void => {
    isValidAmountText(text, true);
    toAmountFormValue(text, true);
    classifyAmountText(text, true);
    fractionDigits(text);
    validateExactAmount(text, opts({ allowGrouping: true, min: '-1', max: text.slice(0, 50) }));
    if (PLAIN.test(text)) compareDecimalStrings(text, text);
  };
  const shapes: Record<string, (n: number) => string> = {
    'valid plain': (n) => `${'9'.repeat(n / 2)}.${'1'.repeat(n / 2)}`,
    'valid grouped': (n) => `1${',111'.repeat(Math.floor(n / 4))}`,
    'grouped near-miss + x': (n) => `1${',111'.repeat(Math.floor(n / 4))}x`,
    'zeros then 9s': (n) => `${'0'.repeat(n / 2)}.${'9'.repeat(n / 2)}`,
    'long zero tail': (n) => `1.${'0'.repeat(n)}`,
    'exponent near-miss': (n) => `${'1,'.repeat(n / 2)}e`,
    'dots and commas': (n) => '.,'.repeat(n / 2),
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

  it.each(Object.entries(shapes))('%s: 100k chars under 50 ms, growth ~linear', (_name, make) => {
    for (const n of [10, 1_000]) run(make(n)); // warm up
    const t10k = perCallMs(make(10_000));
    const t100k = perCallMs(make(100_000));
    expect(t100k).toBeLessThan(50);
    // Quadratic growth would give ~100×; allow noise up to 20×.
    expect(t100k / Math.max(t10k, 0.005)).toBeLessThan(20);
  });
});

describe('INV-30: every issue has its own non-empty message', () => {
  it('messages are distinct and non-empty, and distinct from required / generic / misconfigured', () => {
    const all = [
      ...Object.values(AMOUNT_TEXT_ISSUE_MESSAGES),
      AMOUNT_REQUIRED_MESSAGE,
      AMOUNT_GENERIC_MESSAGE,
      AMOUNT_MISCONFIGURED_MESSAGE,
    ];
    for (const m of all) expect(m.trim().length).toBeGreaterThan(0);
    expect(new Set(all).size).toBe(all.length);
  });

  it('the issue map covers exactly the seven issues (closed union, drift: grouping-unnormalized added)', () => {
    expect(Object.keys(AMOUNT_TEXT_ISSUE_MESSAGES).sort()).toEqual(
      [
        'exponent',
        'grouping-malformed',
        'grouping-not-allowed',
        'grouping-unnormalized',
        'incomplete',
        'invalid',
        'multiple-points',
      ].sort()
    );
  });
});
