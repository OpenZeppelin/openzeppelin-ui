/**
 * `validateExactAmount`'s message options (`formatMessage`, `decimalsMessage`, `minMessage`,
 * `maxMessage`), at the unit level.
 *
 * Each `describe` names one property, so a failure says which one broke:
 * - without the options, every result is the pre-change function's, word for word;
 * - each option replaces the text of its own step and nothing else;
 * - no option changes which values pass;
 * - a misconfigured limit keeps its own text;
 * - the generic text, `validateAmount`'s text and the required text are never replaced.
 *
 * "Pre-change" is `decimalValidation.exact-messages-baseline.ts`, a copy of the function at
 * 271efee34 with its texts written as literals. Property tests are seeded (mulberry32); the
 * seed is in each title and every failure lists its inputs.
 */
import { describe, expect, it } from 'vitest';

import { validateExactAmount, type ExactAmountValidationOptions } from '../utils/decimalValidation';
import {
  createRng,
  pick,
  randomGroupedText,
  randomHostileString,
  randomNearMiss,
  randomPlainText,
} from './amount-exact.sf10-kit';
import {
  BASELINE_GENERIC_TEXT,
  BASELINE_ISSUE_TEXTS,
  BASELINE_MISCONFIGURED_TEXT,
  BASELINE_REQUIRED_TEXT,
  baselineValidateExactAmount,
  type BaselineExactOptions,
} from './decimalValidation.exact-messages-baseline';

// ---------------------------------------------------------------------------------------
// Shared generators
// ---------------------------------------------------------------------------------------

type MessageOption = 'formatMessage' | 'decimalsMessage' | 'minMessage' | 'maxMessage';
const MESSAGE_OPTIONS: readonly MessageOption[] = [
  'formatMessage',
  'decimalsMessage',
  'minMessage',
  'maxMessage',
];

/** The step whose text each option replaces. */
const STEP_OF_OPTION: Record<MessageOption, Step> = {
  formatMessage: 'format',
  decimalsMessage: 'decimals',
  minMessage: 'min',
  maxMessage: 'max',
};

type Step =
  | 'pass'
  | 'required'
  | 'generic'
  | 'format'
  | 'misconfigured'
  | 'decimals'
  | 'min'
  | 'max'
  | 'validateAmount';

const ISSUE_TEXTS = new Set(Object.values(BASELINE_ISSUE_TEXTS));
const VALIDATE_AMOUNT_TEXT = 'Prop says no';
const CUSTOM_REQUIRED_TEXT = 'Custom required';

/** Which step produced a pre-change result. The texts don't overlap, so this is total. */
function stepOf(result: true | string): Step {
  if (result === true) return 'pass';
  if (result === BASELINE_REQUIRED_TEXT || result === CUSTOM_REQUIRED_TEXT) return 'required';
  if (result === BASELINE_GENERIC_TEXT) return 'generic';
  if (result === BASELINE_MISCONFIGURED_TEXT) return 'misconfigured';
  if (ISSUE_TEXTS.has(result)) return 'format';
  if (/^Use at most \d+ decimal places$/.test(result)) return 'decimals';
  if (result.startsWith('Value must be at least ')) return 'min';
  if (result.startsWith('Value must be at most ')) return 'max';
  if (result === VALIDATE_AMOUNT_TEXT) return 'validateAmount';
  throw new Error(`stepOf: unknown text ${JSON.stringify(result)}`);
}

const SPECIAL_VALUES: readonly unknown[] = [
  '',
  null,
  undefined,
  '   ',
  '-',
  '.',
  '-.',
  {},
  [],
  true,
  5,
  1.5,
  -0,
  1e21,
  1e-7,
  NaN,
  Infinity,
  10n,
  -12345678901234567890n,
];

function randomValue(rng: () => number): unknown {
  const kind = Math.floor(rng() * 6);
  if (kind === 0) return randomHostileString(rng);
  if (kind === 1) return randomPlainText(rng, 6, 4);
  if (kind === 2) return randomGroupedText(rng, 3, 4);
  if (kind === 3) return randomNearMiss(rng);
  if (kind === 4) return pick(rng, SPECIAL_VALUES);
  // Values near the bounds below, so min / max fire often.
  return pick(rng, ['5', '9.99', '10', '10.00', '1000', '1000.01', '5000', '-5.5', '0', '0.5']);
}

const DECIMALS = [0, 2, 6, 18, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1] as const;
const BOUNDS: ReadonlyArray<number | string | undefined> = [
  undefined,
  undefined,
  0,
  '0',
  10,
  '10',
  '10.00',
  '-5.5',
  1000,
  '1000',
  1e21,
  1e-7,
  'abc',
  '1,000',
  ' 1',
  NaN,
  Infinity,
];
const VALIDATE_AMOUNTS: ReadonlyArray<BaselineExactOptions['validateAmount']> = [
  undefined,
  undefined,
  () => true,
  () => VALIDATE_AMOUNT_TEXT,
  () => false,
  () => '',
];

function randomOptions(rng: () => number): BaselineExactOptions {
  return {
    required: rng() < 0.5,
    allowGrouping: rng() < 0.5,
    decimals: pick(rng, DECIMALS),
    min: pick(rng, BOUNDS),
    max: pick(rng, BOUNDS),
    validateAmount: pick(rng, VALIDATE_AMOUNTS),
    requiredMessage: rng() < 0.3 ? CUSTOM_REQUIRED_TEXT : undefined,
  };
}

const describeCase = (value: unknown, opts: object): string =>
  `value=${typeof value === 'bigint' ? `${value}n` : (JSON.stringify(value) ?? String(value))} opts=${JSON.stringify(
    opts,
    (_k, v: unknown) =>
      typeof v === 'function' ? 'fn' : typeof v === 'number' && !Number.isFinite(v) ? String(v) : v
  )}`;

const ALL_MESSAGES = {
  formatMessage: 'F',
  decimalsMessage: 'D',
  minMessage: 'MN',
  maxMessage: 'MX',
} as const;

const base = (over: Partial<ExactAmountValidationOptions> = {}): ExactAmountValidationOptions => ({
  required: false,
  allowGrouping: false,
  decimals: 2,
  ...over,
});

// ---------------------------------------------------------------------------------------
// Without message options: the pre-change result, word for word
// ---------------------------------------------------------------------------------------

describe('without message options, every result is the pre-change text', () => {
  it.each<[string, string, boolean]>([
    ['-', 'Please enter a complete number', false],
    ['.', 'Please enter a complete number', false],
    ['-.', 'Please enter a complete number', false],
    ['1e18', 'Scientific notation is not supported', false],
    ['-1.5E-7', 'Scientific notation is not supported', true],
    ['1.2.3', 'Only one decimal point is allowed', false],
    ['1,000', 'Grouping separators (,) are not allowed', false],
    ['1,00', 'Use , only between groups of three digits, e.g. 1,234,567.89', true],
    ['1,000.5', 'Remove the , separators from this value', true],
    ['   ', 'Enter digits, an optional leading - and one . for decimals', false],
    ['+1', 'Enter digits, an optional leading - and one . for decimals', false],
    ['١٢', 'Enter digits, an optional leading - and one . for decimals', false],
  ])('grammar: %j shows %j (literal 006 wording)', (value, text, allowGrouping) => {
    expect(validateExactAmount(value, base({ allowGrouping }))).toBe(text);
  });

  it.each<[string, number, string]>([
    ['1.5', 0, 'Use at most 0 decimal places'],
    ['1.234', 2, 'Use at most 2 decimal places'],
    [`0.${'1'.repeat(19)}`, 18, 'Use at most 18 decimal places'],
    ['1.500', 2, 'Use at most 2 decimal places'],
  ])('decimals: %j with decimals=%d shows %j', (value, decimals, text) => {
    expect(validateExactAmount(value, base({ decimals }))).toBe(text);
  });

  it.each<[string, Partial<ExactAmountValidationOptions>, string]>([
    ['5', { min: 10 }, 'Value must be at least 10'],
    ['5', { min: '10.50' }, 'Value must be at least 10.50'],
    ['-6', { min: '-5.5' }, 'Value must be at least -5.5'],
    ['0', { min: 1e-7, decimals: 18 }, 'Value must be at least 0.0000001'],
    ['5000', { max: 1000 }, 'Value must be at most 1000'],
    ['1000.01', { max: '1000' }, 'Value must be at most 1000'],
    ['1000000000000000000001', { max: 1e21 }, 'Value must be at most 1000000000000000000000'],
  ])('bounds: %j with %j shows %j (bound as a decimal string)', (value, over, text) => {
    expect(validateExactAmount(value, base(over))).toBe(text);
  });

  it('boundary: a value on an inclusive bound passes', () => {
    expect(validateExactAmount('10', base({ min: '10', max: 10 }))).toBe(true);
    expect(validateExactAmount('10.00', base({ min: 10, max: '10' }))).toBe(true);
  });

  it('the required, generic and misconfigured texts keep their wording', () => {
    expect(validateExactAmount('', base({ required: true }))).toBe('This field is required');
    expect(validateExactAmount({}, base())).toBe('Enter a valid amount');
    expect(validateExactAmount('1', base({ decimals: -1 }))).toBe('Amount limit is misconfigured');
    expect(validateExactAmount('1', base({ min: 'abc' }))).toBe('Amount limit is misconfigured');
  });

  it('options set to undefined explicitly behave as absent', () => {
    const undefinedMessages = {
      formatMessage: undefined,
      decimalsMessage: undefined,
      minMessage: undefined,
      maxMessage: undefined,
    };
    for (const [value, over] of [
      ['1.2.3', {}],
      ['1.234', {}],
      ['5', { min: 10 }],
      ['5000', { max: 1000 }],
    ] as const) {
      expect(validateExactAmount(value, base({ ...over, ...undefinedMessages }))).toBe(
        validateExactAmount(value, base(over))
      );
    }
  });

  it('property (seed 0x5f4a01): 20k random values × options replay the pre-change function exactly', () => {
    const rng = createRng(0x5f4a01);
    const problems: string[] = [];
    for (let i = 0; i < 20_000 && problems.length < 5; i += 1) {
      const value = randomValue(rng);
      const opts = randomOptions(rng);
      const now = validateExactAmount(value, opts);
      const then = baselineValidateExactAmount(value, opts);
      if (now !== then)
        problems.push(`${describeCase(value, opts)}: ${String(then)} → ${String(now)}`);
    }
    expect(problems).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------
// One option, one step
// ---------------------------------------------------------------------------------------

describe('each message option replaces the text of its own step and nothing else', () => {
  const STEP_CORPUS: ReadonlyArray<[unknown, Partial<BaselineExactOptions>, Step]> = [
    ['', { required: true }, 'required'],
    ['', {}, 'pass'],
    [{}, {}, 'generic'],
    ['1.2.3', {}, 'format'],
    ['   ', { required: true }, 'format'],
    ['-', {}, 'format'],
    ['1,000', { allowGrouping: true }, 'format'],
    ['1.234', {}, 'decimals'],
    ['1.2.345', {}, 'format'],
    ['5', { min: '10' }, 'min'],
    ['5000', { max: '1000' }, 'max'],
    ['5', { min: 'abc' }, 'misconfigured'],
    ['1', { decimals: -1 }, 'misconfigured'],
    ['50', { validateAmount: () => VALIDATE_AMOUNT_TEXT }, 'validateAmount'],
    ['50', { validateAmount: () => false }, 'generic'],
    ['50', { min: '10', max: '1000' }, 'pass'],
  ];

  it('the step corpus hits every step (guards the corpus itself)', () => {
    const steps = new Set(
      STEP_CORPUS.map(([value, over]) => stepOf(baselineValidateExactAmount(value, base(over))))
    );
    expect([...steps].sort()).toEqual(
      [
        'decimals',
        'format',
        'generic',
        'max',
        'min',
        'misconfigured',
        'pass',
        'required',
        'validateAmount',
      ].sort()
    );
    for (const [value, over, step] of STEP_CORPUS) {
      expect(
        stepOf(baselineValidateExactAmount(value, base(over))),
        describeCase(value, over)
      ).toBe(step);
    }
  });

  for (const option of MESSAGE_OPTIONS) {
    it(`${option} alone: 'O' replaces only ${STEP_OF_OPTION[option]} failures; every other result is unchanged`, () => {
      for (const [value, over, step] of STEP_CORPUS) {
        const got = validateExactAmount(value, base({ ...over, [option]: 'O' }));
        const expected =
          step === STEP_OF_OPTION[option] ? 'O' : baselineValidateExactAmount(value, base(over));
        expect(got, describeCase(value, over)).toBe(expected);
      }
    });
  }

  it('all four set: each step shows its own text; the first failing step wins', () => {
    const expected: Record<Step, (pre: true | string) => true | string> = {
      pass: () => true,
      required: (pre) => pre,
      generic: (pre) => pre,
      misconfigured: (pre) => pre,
      validateAmount: (pre) => pre,
      format: () => 'F',
      decimals: () => 'D',
      min: () => 'MN',
      max: () => 'MX',
    };
    for (const [value, over, step] of STEP_CORPUS) {
      const pre = baselineValidateExactAmount(value, base(over));
      expect(
        validateExactAmount(value, base({ ...over, ...ALL_MESSAGES })),
        describeCase(value, over)
      ).toBe(expected[step](pre));
    }
  });

  it('failure-side: a whitespace-only value is a grammar failure, so it shows the format text, never the required text', () => {
    expect(
      validateExactAmount('   ', base({ required: true, ...ALL_MESSAGES, requiredMessage: 'R' }))
    ).toBe('F');
  });

  it('formatMessage covers all seven grammar kinds', () => {
    const KIND_VALUES: ReadonlyArray<[string, boolean]> = [
      ['-', false], // incomplete
      ['1e3', false], // exponent
      ['1.2.3', false], // multiple-points
      ['1,000', false], // grouping-not-allowed
      ['1,00', true], // grouping-malformed
      ['1,000', true], // grouping-unnormalized
      ['abc', false], // invalid
    ];
    const kinds = new Set(
      KIND_VALUES.map(([v, g]) => baselineValidateExactAmount(v, base({ allowGrouping: g })))
    );
    expect(kinds.size).toBe(7);
    for (const [value, allowGrouping] of KIND_VALUES) {
      expect(validateExactAmount(value, base({ allowGrouping, formatMessage: 'F' })), value).toBe(
        'F'
      );
    }
  });

  it('a message is returned verbatim: no trim, no interpolation, markup kept as text', () => {
    expect(validateExactAmount('1.2.3', base({ formatMessage: '  {min} <b>x</b>  ' }))).toBe(
      '  {min} <b>x</b>  '
    );
    expect(validateExactAmount('5', base({ min: '10', minMessage: 'At least {min}' }))).toBe(
      'At least {min}'
    );
  });

  it('property (seed 0x5f4a02): 20k random cases, each option alone, match the step rule', () => {
    const rng = createRng(0x5f4a02);
    const problems: string[] = [];
    for (let i = 0; i < 20_000 && problems.length < 5; i += 1) {
      const value = randomValue(rng);
      const opts = randomOptions(rng);
      const option = pick(rng, MESSAGE_OPTIONS);
      const pre = baselineValidateExactAmount(value, opts);
      const got = validateExactAmount(value, { ...opts, [option]: 'O' });
      const expected = stepOf(pre) === STEP_OF_OPTION[option] ? 'O' : pre;
      if (got !== expected) {
        problems.push(
          `${option} ${describeCase(value, opts)}: expected ${String(expected)}, got ${String(got)}`
        );
      }
    }
    expect(problems).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------
// Verdicts
// ---------------------------------------------------------------------------------------

describe('no message option changes which values pass', () => {
  const MESSAGE_TEXTS = ['F', 'Cents only', '  ', 'x'.repeat(500), '<b>x</b>', '0', 'true'];

  it('property (seed 0x5f4a03): 30k random values × options × message sets keep the verdict', () => {
    const rng = createRng(0x5f4a03);
    const problems: string[] = [];
    for (let i = 0; i < 30_000 && problems.length < 5; i += 1) {
      const value = randomValue(rng);
      const opts = randomOptions(rng);
      const messages: Partial<Record<MessageOption, string>> = {};
      for (const option of MESSAGE_OPTIONS) {
        if (rng() < 0.6) messages[option] = pick(rng, MESSAGE_TEXTS);
      }
      const without = validateExactAmount(value, opts);
      const withMessages = validateExactAmount(value, { ...opts, ...messages });
      if ((without === true) !== (withMessages === true)) {
        problems.push(
          `${describeCase(value, { ...opts, ...messages })}: ${String(without)} → ${String(withMessages)}`
        );
      }
    }
    expect(problems).toEqual([]);
  });

  it('boundary: a value on each inclusive bound still passes with every message set', () => {
    for (const value of ['10', '10.00', '1000', '1000.00']) {
      expect(
        validateExactAmount(value, base({ min: '10', max: 1000, ...ALL_MESSAGES })),
        value
      ).toBe(true);
    }
  });

  it('failure-side: a value just past each bound still fails with every message set', () => {
    expect(validateExactAmount('9.99', base({ min: '10', ...ALL_MESSAGES }))).toBe('MN');
    expect(validateExactAmount('1000.01', base({ max: 1000, ...ALL_MESSAGES }))).toBe('MX');
  });
});

// ---------------------------------------------------------------------------------------
// Misconfigured limits
// ---------------------------------------------------------------------------------------

describe('a misconfigured limit keeps its own text, never a custom one', () => {
  const GRAMMATICAL = ['5', '5000', '1.234', '0', '-1', '10'];

  it.each([-1, 1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'decimals=%s: every non-empty grammatical value shows the misconfigured text',
    (decimals) => {
      for (const value of GRAMMATICAL) {
        expect(
          validateExactAmount(value, base({ decimals, min: '10', max: '1000', ...ALL_MESSAGES })),
          value
        ).toBe('Amount limit is misconfigured');
      }
    }
  );

  it.each<number | string>(['abc', '1,000', ' 1', '', '1e3', NaN, Infinity, -Infinity])(
    'min=%j: below and above values both show the misconfigured text',
    (min) => {
      for (const value of ['5', '5000']) {
        expect(validateExactAmount(value, base({ min, ...ALL_MESSAGES })), value).toBe(
          'Amount limit is misconfigured'
        );
      }
    }
  );

  it.each<number | string>(['abc', '1,000', ' 1', '', '1e3', NaN, Infinity, -Infinity])(
    'max=%j: below and above values both show the misconfigured text',
    (max) => {
      for (const value of ['5', '5000']) {
        expect(validateExactAmount(value, base({ max, ...ALL_MESSAGES })), value).toBe(
          'Amount limit is misconfigured'
        );
      }
    }
  );

  it('boundary: grammar runs first, so malformed text with a broken limit shows the format text', () => {
    expect(validateExactAmount('1.2.3', base({ decimals: -1, ...ALL_MESSAGES }))).toBe('F');
  });

  it('boundary: a readable min with an unreadable max still reports the min failure first', () => {
    expect(validateExactAmount('5', base({ min: '10', max: 'abc', ...ALL_MESSAGES }))).toBe('MN');
    expect(validateExactAmount('50', base({ min: '10', max: 'abc', ...ALL_MESSAGES }))).toBe(
      'Amount limit is misconfigured'
    );
  });
});

// ---------------------------------------------------------------------------------------
// Never-replaced texts
// ---------------------------------------------------------------------------------------

describe('texts outside the four steps are never replaced', () => {
  const opts = (over: Partial<ExactAmountValidationOptions> = {}) =>
    base({ min: '1', max: '1000', ...ALL_MESSAGES, ...over });

  it.each<[string, unknown]>([
    ['an object', {}],
    ['an array', []],
    ['a boolean', true],
    ['a symbol', Symbol('s')],
    ['NaN', NaN],
    ['Infinity', Infinity],
  ])('an unsupported value (%s) shows the generic text', (_name, value) => {
    expect(validateExactAmount(value, opts())).toBe('Enter a valid amount');
  });

  it("validateAmount's own text is shown as returned", () => {
    expect(validateExactAmount('50', opts({ validateAmount: () => 'Exceeds your balance' }))).toBe(
      'Exceeds your balance'
    );
  });

  it.each<[string, () => boolean | string]>([
    ['false', () => false],
    ["''", () => ''],
  ])('validateAmount returning %s shows the generic text', (_name, validateAmount) => {
    expect(validateExactAmount('50', opts({ validateAmount }))).toBe('Enter a valid amount');
  });

  it('a throwing validateAmount still propagates', () => {
    expect(() =>
      validateExactAmount(
        '50',
        opts({
          validateAmount: () => {
            throw new RangeError('boom');
          },
        })
      )
    ).toThrow(RangeError);
  });

  it('the required text follows requiredMessage only, never a format / decimals / bound message', () => {
    expect(validateExactAmount('', opts({ required: true }))).toBe('This field is required');
    expect(validateExactAmount(null, opts({ required: true, requiredMessage: 'R' }))).toBe('R');
    expect(validateExactAmount(undefined, opts({ required: false }))).toBe(true);
  });
});
