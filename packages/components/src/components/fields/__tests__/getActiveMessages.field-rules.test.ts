/**
 * `getActiveMessages(validation, fieldRules?)`: the `format` and `decimals` keys and the
 * optional `fieldRules` argument.
 *
 * - With one argument the result is what it was before the two keys existed, so `format` and
 *   `decimals` never come back, whatever `messages` holds.
 * - With `fieldRules`, a key is kept exactly when its boolean says the field enforces the rule
 *   (or, when the key is absent, `validation` sets the rule) and its text is a non-empty
 *   string. The old guards still hold.
 * - `validateField` never reads the two keys.
 * - Nothing here throws, mutates its input, or reuses an object across calls.
 * - The signature is checked at compile time (`expectTypeOf`, `@ts-expect-error`).
 */
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { FieldValidation, FieldValidationMessages } from '@openzeppelin/ui-types';

import * as packageEntry from '../../../index';
import { getActiveMessages, validateField } from '../utils';
import * as fieldUtils from '../utils/validation';

type Key = keyof FieldValidationMessages;
const KEYS: readonly Key[] = [
  'required',
  'min',
  'max',
  'minLength',
  'maxLength',
  'pattern',
  'format',
  'decimals',
];
const RULE_KEYS: readonly Key[] = KEYS.filter((k) => k !== 'format' && k !== 'decimals');

/** A validation that sets the rule behind `key`, or doesn't. `format` / `decimals` have none. */
function withRule(key: Key, set: boolean): FieldValidation {
  if (!set) return key === 'required' ? { required: false } : {};
  switch (key) {
    case 'required':
      return { required: true };
    case 'pattern':
      return { pattern: '^a$' };
    case 'format':
    case 'decimals':
      throw new Error(`${key} has no FieldValidation rule`);
    default:
      return { [key]: 3 };
  }
}

const ALL8: Required<FieldValidationMessages> = {
  required: 'R',
  min: 'MN',
  max: 'MX',
  minLength: 'ML',
  maxLength: 'XL',
  pattern: 'P',
  format: 'F',
  decimals: 'D',
};

const EVERY_RULE: FieldValidation = {
  required: true,
  min: 0,
  max: 1,
  minLength: 1,
  maxLength: 2,
  pattern: /x/,
};

describe('with one argument, getActiveMessages is unchanged and never returns format or decimals', () => {
  it('format and decimals next to set rules: only the set rules come back', () => {
    expect(
      getActiveMessages({
        required: true,
        min: 1,
        messages: { format: 'F', decimals: 'D', required: 'R', min: 'M' },
      })
    ).toEqual({ required: 'R', min: 'M' });
  });

  it('every rule set and all eight messages: the six rule keys, no format / decimals', () => {
    const active = getActiveMessages({ ...EVERY_RULE, messages: { ...ALL8 } });
    const { format: _f, decimals: _d, ...six } = ALL8;
    expect(active).toEqual(six);
    expect('format' in active).toBe(false);
    expect('decimals' in active).toBe(false);
  });

  it('boundary: only format and decimals in messages → {}', () => {
    expect(getActiveMessages({ messages: { format: 'F', decimals: 'D' } })).toEqual({});
    expect(getActiveMessages({ required: true, messages: { format: 'F' } })).toEqual({});
  });

  it('the result keeps the old key order for the six keys', () => {
    expect(Object.keys(getActiveMessages({ ...EVERY_RULE, messages: { ...ALL8 } }))).toEqual([
      'required',
      'min',
      'max',
      'minLength',
      'maxLength',
      'pattern',
    ]);
  });
});

describe('with fieldRules, a key is kept exactly when the field enforces it and the text is usable', () => {
  const TEXTS: Array<[string, unknown, boolean]> = [
    ['missing', undefined, false],
    ['empty string', '', false],
    ['whitespace', '  ', true],
    ['text', 'Text', true],
    ['number', 42, false],
    ['null', null, false],
  ];
  const FIELD_RULES: Array<[string, boolean | undefined]> = [
    ['absent', undefined],
    ['false', false],
    ['true', true],
  ];

  for (const key of KEYS) {
    const ruleStates = RULE_KEYS.includes(key) ? [false, true] : [false];
    for (const ruleSet of ruleStates) {
      for (const [ruleName, fieldRule] of FIELD_RULES) {
        for (const [textName, text, usable] of TEXTS) {
          const enforced = fieldRule ?? ruleSet;
          const kept = enforced && usable;
          it(`${key}: rule ${ruleSet ? 'set' : 'unset'}, fieldRules ${ruleName}, message ${textName} → ${kept ? 'kept' : 'dropped'}`, () => {
            const validation = {
              ...withRule(key, ruleSet),
              messages: text === undefined ? {} : { [key]: text },
            } as FieldValidation;
            const fieldRules = fieldRule === undefined ? {} : { [key]: fieldRule };
            const active = getActiveMessages(validation, fieldRules);
            expect(active).toEqual(kept ? { [key]: text } : {});
          });
        }
      }
    }
  }

  it("failure-side: min: false wins over validation.min (no fall-through on 'false')", () => {
    expect(
      getActiveMessages({ min: 1, max: 5, messages: { min: 'X', max: 'Y' } }, { min: false })
    ).toEqual({ max: 'Y' });
  });

  it('a key fieldRules leaves out still follows validation', () => {
    expect(
      getActiveMessages(
        { required: true, minLength: 2, messages: { ...ALL8 } },
        { format: true, min: true }
      )
    ).toEqual({ required: 'R', minLength: 'ML', format: 'F', min: 'MN' });
  });

  it('the exact-mode shape: all eight messages, no validation rules, format / decimals / min / max named', () => {
    expect(
      getActiveMessages(
        { messages: { ...ALL8 } },
        { format: true, decimals: true, min: true, max: false }
      )
    ).toEqual({ format: 'F', decimals: 'D', min: 'MN' });
  });

  it('a non-boolean fieldRules value from an untyped caller falls back to validation', () => {
    const untyped = { min: 1, format: 'yes', max: 0 } as unknown as Partial<Record<Key, boolean>>;
    expect(getActiveMessages({ min: 2, messages: { ...ALL8 } }, untyped)).toEqual({ min: 'MN' });
  });

  it.each([
    ['undefined', undefined],
    ['no messages', { required: true }],
    ['messages: null', { required: true, messages: null }],
    ['messages: []', { required: true, messages: [] }],
    ["messages: 'x'", { required: true, messages: 'x' }],
    ['messages: 5', { required: true, messages: 5 }],
  ])('returns {} for %s even when fieldRules turns every key on', (_name, validation) => {
    const allOn = Object.fromEntries(KEYS.map((k) => [k, true])) as Record<Key, boolean>;
    expect(getActiveMessages(validation as FieldValidation, allOn)).toEqual({});
  });

  it('never copies keys other than the eight', () => {
    const validation = {
      messages: { format: 'F', extra: 'E', validate: 'V', conditions: 'C' },
    } as unknown as FieldValidation;
    const anyRules = { format: true, extra: true } as unknown as Partial<Record<Key, boolean>>;
    expect(getActiveMessages(validation, anyRules)).toEqual({ format: 'F' });
  });

  it('does not throw on, or mutate, frozen inputs; returns a fresh object each call', () => {
    const validation: FieldValidation = Object.freeze({
      min: 1,
      messages: Object.freeze({ min: 'X', format: 'F' }),
    });
    const fieldRules = Object.freeze({ min: false, format: true });
    const snapshot = JSON.stringify([validation, fieldRules]);
    const a = getActiveMessages(validation, fieldRules);
    const b = getActiveMessages(validation, fieldRules);
    expect(a).toEqual({ format: 'F' });
    expect(a).not.toBe(b);
    expect(a).not.toBe(validation.messages);
    expect(JSON.stringify([validation, fieldRules])).toBe(snapshot);
  });

  it('never throws for odd messages, including a Proxy whose every read is undefined', () => {
    const allOn = Object.fromEntries(KEYS.map((k) => [k, true])) as Record<Key, boolean>;
    const odd: unknown[] = [
      new Proxy({}, { get: () => undefined }),
      Object.create(null),
      new Map([['format', 'F']]),
      { format: Symbol('f'), decimals: () => 'D', min: {}, max: true },
    ];
    for (const messages of odd) {
      expect(() =>
        getActiveMessages({ messages } as unknown as FieldValidation, allOn)
      ).not.toThrow();
      expect(getActiveMessages({ messages } as unknown as FieldValidation, allOn)).toEqual({});
    }
  });
});

describe('validateField and the other one-argument callers ignore format and decimals', () => {
  const VALUES: unknown[] = ['', 'abc', '1.2.3', '12.345', 'x'.repeat(30), 5, null, undefined];
  const VALIDATIONS: FieldValidation[] = [
    {},
    { required: true },
    { required: true, minLength: 2, maxLength: 5, pattern: '^[a-z]+$' },
  ];

  it('no value returns F or D, with the messages passed in validation or as the third argument', () => {
    const problems: string[] = [];
    for (const v of VALIDATIONS) {
      for (const value of VALUES) {
        const inValidation = validateField(value, {
          ...v,
          messages: { format: 'F', decimals: 'D' },
        });
        const asArgument = validateField(value, v, { format: 'F', decimals: 'D' });
        const plain = validateField(value, v);
        for (const got of [inValidation, asArgument]) {
          if (got === 'F' || got === 'D' || got !== plain) {
            problems.push(
              `${JSON.stringify(v)} ${String(value)}: ${String(plain)} → ${String(got)}`
            );
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

describe('getActiveMessages public surface', () => {
  it('no new export name: the module exports what it did at 271efee34; the rule table stays private', () => {
    expect(Object.keys(fieldUtils).sort()).toEqual(
      [
        'CUSTOM_CHECK_FALLBACK_MESSAGE',
        'REQUIRED_MESSAGE',
        'createValidationResult',
        'formatValidationError',
        'getActiveMessages',
        'getErrorMessage',
        'getRequiredMessage',
        'getValidationStateClasses',
        'handleValidationError',
        'hasFieldError',
        'isDuplicateMapKey',
        'runCustomCheck',
        'validateField',
        'validateMapEntries',
      ].sort()
    );
    expect('RULE_IS_SET' in packageEntry).toBe(false);
    expect('MESSAGE_KEYS' in packageEntry).toBe(false);
    expect(packageEntry.getActiveMessages).toBe(getActiveMessages);
  });

  it('compile time: fieldRules is optional and takes only the eight keys, as booleans', () => {
    expectTypeOf(getActiveMessages).parameter(0).toEqualTypeOf<FieldValidation | undefined>();
    expectTypeOf(getActiveMessages)
      .parameter(1)
      .toEqualTypeOf<Readonly<Partial<Record<Key, boolean>>> | undefined>();
    expectTypeOf(getActiveMessages).returns.toEqualTypeOf<FieldValidationMessages>();
    getActiveMessages(undefined);
    getActiveMessages({}, { format: true, decimals: false });
    // @ts-expect-error a key outside FieldValidationMessages is rejected
    getActiveMessages({}, { amount: true });
    // @ts-expect-error a non-boolean rule is rejected
    getActiveMessages({}, { min: 1 });
  });
});
