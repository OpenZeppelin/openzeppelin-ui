/**
 * 005 SF-36 · The shared helpers: `getActiveMessages` (INV-2), `getRequiredMessage` and the
 * constants (INV-3), `runCustomCheck` (INV-4, INV-22 at the helper level), `validateField`
 * against a frozen pre-SF-36 copy (INV-5), the stored-config round trip (INV-7), and the
 * public surface (Design § Public API).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { FieldValidation, FieldValidationMessages } from '@openzeppelin/ui-types';
import { logger } from '@openzeppelin/ui-utils';

import * as packageEntry from '../../../index';
import { validateMapStructure } from '../MapField';
import {
  CUSTOM_CHECK_FALLBACK_MESSAGE,
  getActiveMessages,
  getRequiredMessage,
  REQUIRED_MESSAGE,
  runCustomCheck,
  validateField,
} from '../utils';
import { validateExactAmount } from '../utils/decimalValidation';
import { baselineValidateField } from './validateField.sf36-baseline';

const KEYS = ['required', 'min', 'max', 'minLength', 'maxLength', 'pattern'] as const;
type Key = (typeof KEYS)[number];

/** A validation with exactly one rule set (or none). */
function withRule(key: Key, set: boolean): FieldValidation {
  if (!set) return key === 'required' ? { required: false } : {};
  switch (key) {
    case 'required':
      return { required: true };
    case 'pattern':
      return { pattern: '^a$' };
    default:
      return { [key]: 3 };
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SF-36 INV-2 — getActiveMessages returns exactly the messages that can apply', () => {
  const TEXTS: Array<[string, unknown, boolean]> = [
    ['missing', undefined, false],
    ['empty string', '', false],
    ['whitespace', '  ', true],
    ['text', 'Text', true],
    ['number', 42, false],
    ['null', null, false],
  ];

  for (const key of KEYS) {
    for (const ruleSet of [false, true]) {
      for (const [name, text, usable] of TEXTS) {
        it(`${key}: rule ${ruleSet ? 'set' : 'unset'}, message ${name} → ${ruleSet && usable ? 'kept' : 'dropped'}`, () => {
          const validation = {
            ...withRule(key, ruleSet),
            messages: text === undefined ? {} : { [key]: text },
          } as FieldValidation;
          const active = getActiveMessages(validation);
          if (ruleSet && usable) expect(active).toEqual({ [key]: text });
          else expect(active).toEqual({});
        });
      }
    }
  }

  it('keeps every set rule with a usable message, unchanged (no trim)', () => {
    const messages: FieldValidationMessages = {
      required: ' R ',
      min: 'mn',
      max: 'mx',
      minLength: 'ml',
      maxLength: 'xl',
      pattern: 'p',
    };
    const validation: FieldValidation = {
      required: true,
      min: 0, // 0 is a set rule: `!== undefined`
      max: 1,
      minLength: 1,
      maxLength: 2,
      pattern: /x/,
      messages,
    };
    expect(getActiveMessages(validation)).toEqual(messages);
  });

  it.each([
    ['undefined', undefined],
    ['no messages', { required: true }],
    ['messages: null', { required: true, messages: null }],
    ['messages: []', { required: true, messages: [] }],
    ["messages: 'x'", { required: true, messages: 'x' }],
    ['messages: 5', { required: true, messages: 5 }],
  ])('returns {} for %s (untyped stored configs, A2)', (_name, validation) => {
    expect(getActiveMessages(validation as FieldValidation)).toEqual({});
  });

  it('never copies keys other than the six', () => {
    const validation = {
      required: true,
      messages: { required: 'R', extra: 'E', validate: 'V' },
    } as unknown as FieldValidation;
    expect(getActiveMessages(validation)).toEqual({ required: 'R' });
  });

  it('does not throw on, or mutate, a frozen validation; returns a fresh object each call', () => {
    const validation: FieldValidation = Object.freeze({
      required: true,
      messages: Object.freeze({ required: 'R', min: 'unset rule' }),
    });
    const snapshot = JSON.stringify(validation);
    const a = getActiveMessages(validation);
    const b = getActiveMessages(validation);
    expect(a).toEqual({ required: 'R' });
    expect(a).not.toBe(b);
    expect(a).not.toBe(validation.messages);
    expect(JSON.stringify(validation)).toBe(snapshot);
    a.max = 'mutated';
    expect(getActiveMessages(validation)).toEqual({ required: 'R' });
  });
});

describe('SF-36 INV-3 — getRequiredMessage and the constants', () => {
  it('the constants keep their wording', () => {
    expect(REQUIRED_MESSAGE).toBe('This field is required');
    expect(CUSTOM_CHECK_FALLBACK_MESSAGE).toBe('This field is invalid');
  });

  it.each<[string, FieldValidation | undefined, string | undefined, string]>([
    ['undefined', undefined, undefined, 'This field is required'],
    ['required, no message', { required: true }, undefined, 'This field is required'],
    ['custom', { required: true, messages: { required: 'Enter X' } }, undefined, 'Enter X'],
    ['empty message', { required: true, messages: { required: '' } }, undefined, REQUIRED_MESSAGE],
    [
      'field default, no message',
      { required: true },
      'At least one item is required',
      'At least one item is required',
    ],
    [
      'custom beats field default',
      { required: true, messages: { required: 'Enter X' } },
      'At least one item is required',
      'Enter X',
    ],
    [
      'required: false',
      { required: false, messages: { required: 'Enter X' } },
      undefined,
      REQUIRED_MESSAGE,
    ],
    [
      'other keys never reach it',
      { required: true, min: 1, messages: { min: 'Min text', pattern: 'P' } },
      undefined,
      REQUIRED_MESSAGE,
    ],
  ])('%s', (_name, validation, fieldDefault, expected) => {
    const text =
      fieldDefault === undefined
        ? getRequiredMessage(validation)
        : getRequiredMessage(validation, fieldDefault);
    expect(text).toBe(expected);
    expect(text).not.toBe('');
  });
});

describe('SF-36 INV-4 — runCustomCheck maps every result to true or a non-empty string', () => {
  it('passes when there is no check, or the check is not a function (untyped config)', () => {
    expect(runCustomCheck('v')).toBe(true);
    expect(runCustomCheck('v', {})).toBe(true);
    expect(runCustomCheck('v', { validate: 'nope' } as unknown as FieldValidation)).toBe(true);
  });

  it('passes on exactly true; returns a non-empty string unchanged', () => {
    expect(runCustomCheck('v', { validate: () => true })).toBe(true);
    expect(runCustomCheck('v', { validate: () => '  Too big  ' })).toBe('  Too big  ');
  });

  it.each<[string, unknown]>([
    ['false', false],
    ["''", ''],
    ['undefined', undefined],
    ['null', null],
    ['0', 0],
    ['1', 1],
    ['an object', { ok: true }],
    ['a Promise (A3)', Promise.resolve(true)],
    ['a truthy non-true value', 'true'.length],
  ])('fails closed with the fallback text on %s', (_name, result) => {
    const out = runCustomCheck('v', { validate: () => result as boolean | string });
    expect(out).toBe(CUSTOM_CHECK_FALLBACK_MESSAGE);
  });

  it.each<[string, unknown]>([
    ['an Error', new Error('boom')],
    ['a string', 'boom'],
    ['undefined', undefined],
  ])(
    'a check that throws %s fails with the fallback and logs once, without the value',
    (_n, thrown) => {
      const log = vi.spyOn(logger, 'error').mockImplementation(() => {});
      const SECRET = 's3cret-sentinel';
      const out = runCustomCheck(SECRET, {
        validate: () => {
          throw thrown;
        },
      });
      expect(out).toBe(CUSTOM_CHECK_FALLBACK_MESSAGE);
      expect(log).toHaveBeenCalledTimes(1);
      expect(log.mock.calls[0][0]).toBe('FieldValidation');
      expect(log.mock.calls[0][1]).toBe('Custom validate check threw');
      expect(log.mock.calls[0][2]).toBe(thrown);
      expect(JSON.stringify(log.mock.calls[0].map(String))).not.toContain(SECRET);
    }
  );

  it('calls the check exactly once, with the value by reference as its only argument', () => {
    const value = ['a', 'b'];
    const check = vi.fn((_v: unknown) => true);
    runCustomCheck(value, { validate: check });
    expect(check).toHaveBeenCalledTimes(1);
    expect(check.mock.calls[0]).toHaveLength(1);
    expect(check.mock.calls[0][0]).toBe(value);
  });
});

describe('SF-36 INV-5 — validateField keeps pre-SF-36 results unless messages are active', () => {
  const VALUES: unknown[] = [undefined, null, '', 'abc', '1.5', '12', 'a', 5, -1, 0, NaN, true, {}];
  const VALIDATIONS: FieldValidation[] = [
    {},
    { required: true },
    { minLength: 2 },
    { maxLength: 2 },
    { pattern: '^\\d+$' },
    { pattern: /^[a-z]+$/ },
    { pattern: /^-?\d+$/ }, // the integer wording
    { min: 1 },
    { max: 10 },
    { min: 0, max: 0 },
    { required: true, minLength: 2, maxLength: 3, pattern: '^[a-z]+$', min: 1, max: 10 },
    { required: false, pattern: '^a$' },
  ];
  const ALL: FieldValidationMessages = {
    required: 'M-required',
    min: 'M-min',
    max: 'M-max',
    minLength: 'M-minLength',
    maxLength: 'M-maxLength',
    pattern: 'M-pattern',
  };

  it('no messages: identical to the frozen pre-SF-36 copy for every value × validation', () => {
    expect(validateField('x', undefined)).toBe(baselineValidateField('x', undefined));
    for (const validation of VALIDATIONS) {
      for (const value of VALUES) {
        expect(
          validateField(value, validation),
          `${String(value)} ${JSON.stringify(validation)}`
        ).toBe(baselineValidateField(value, validation));
      }
    }
  });

  it('keeps the integer and pattern wordings', () => {
    expect(validateField('1.5', { pattern: /^-?\d+$/ })).toBe(
      'Value must be a valid integer (no decimals)'
    );
    expect(validateField('abc', { pattern: /^-?\d+$/ })).toBe(
      'Value does not match the required pattern'
    );
  });

  it('all six messages: same pass/fail; each failure is the message for the rule that failed', () => {
    const ruleOf = (text: string): string => {
      if (text === 'This field is required') return 'required';
      if (text.startsWith('Minimum length')) return 'minLength';
      if (text.startsWith('Maximum length')) return 'maxLength';
      if (text.startsWith('Minimum value')) return 'min';
      if (text.startsWith('Maximum value')) return 'max';
      return 'pattern';
    };
    for (const validation of VALIDATIONS) {
      for (const value of VALUES) {
        const before = baselineValidateField(value, validation);
        const after = validateField(value, { ...validation, messages: ALL });
        const where = `${String(value)} ${JSON.stringify(validation)}`;
        expect(after === true, where).toBe(before === true);
        if (typeof before === 'string') {
          expect(after, where).toBe(ALL[ruleOf(before) as keyof FieldValidationMessages]);
        }
      }
    }
  });

  it('messages.pattern replaces both pattern texts', () => {
    const v: FieldValidation = { pattern: /^-?\d+$/, messages: { pattern: 'Digits only' } };
    expect(validateField('1.5', v)).toBe('Digits only');
    expect(validateField('abc', v)).toBe('Digits only');
  });

  it('an explicit third argument is used instead of the active messages', () => {
    const v: FieldValidation = { pattern: /^-?\d+$/, messages: { pattern: 'From validation' } };
    expect(validateField('1.5', v, {})).toBe('Value must be a valid integer (no decimals)');
    expect(validateField('1.5', { pattern: /^-?\d+$/ }, { pattern: 'Passed in' })).toBe(
      'Passed in'
    );
  });

  it('never calls validation.validate', () => {
    const check = vi.fn(() => 'Nope');
    for (const value of VALUES) validateField(value, { required: true, validate: check });
    expect(check).not.toHaveBeenCalled();
  });
});

describe('SF-36 — the internal required-message options keep their defaults', () => {
  it('validateMapStructure: default text, custom text at both required exits', () => {
    expect(validateMapStructure({ value: undefined, required: true })).toBe(REQUIRED_MESSAGE);
    expect(validateMapStructure({ value: [], required: true })).toBe(REQUIRED_MESSAGE);
    expect(validateMapStructure({ value: undefined, required: true, requiredMessage: 'R' })).toBe(
      'R'
    );
    expect(
      validateMapStructure({
        value: [{ key: '', value: '' }],
        required: true,
        requiredMessage: 'R',
      })
    ).toBe('R');
  });

  it('validateExactAmount: default text, custom requiredMessage', () => {
    expect(validateExactAmount('', { required: true })).toBe(REQUIRED_MESSAGE);
    expect(validateExactAmount('', { required: true, requiredMessage: 'Enter an amount' })).toBe(
      'Enter an amount'
    );
  });
});

describe('SF-36 INV-7 — stored configs keep messages and lose only the check', () => {
  it('a JSON round trip keeps messages and drops validate, as it drops a RegExp pattern', () => {
    const validation: FieldValidation = {
      required: true,
      maxLength: 5,
      pattern: /^[a-z]+$/,
      messages: { required: 'R', maxLength: 'Too long' },
      validate: () => 'Nope',
    };
    const stored = JSON.parse(JSON.stringify(validation)) as FieldValidation;
    expect(stored.messages).toEqual(validation.messages);
    expect('validate' in stored).toBe(false);
    expect(stored.pattern).toEqual({}); // as today: a RegExp doesn't survive JSON
    expect(getActiveMessages(stored)).toEqual({ required: 'R', maxLength: 'Too long' });
    expect(runCustomCheck('abc', stored)).toBe(true);
    expect(validateField('', stored)).toBe('R');
  });
});

describe('SF-36 — public surface', () => {
  it('the package root exports the five helpers', () => {
    expect(packageEntry.REQUIRED_MESSAGE).toBe(REQUIRED_MESSAGE);
    expect(packageEntry.CUSTOM_CHECK_FALLBACK_MESSAGE).toBe(CUSTOM_CHECK_FALLBACK_MESSAGE);
    expect(packageEntry.getActiveMessages).toBe(getActiveMessages);
    expect(packageEntry.getRequiredMessage).toBe(getRequiredMessage);
    expect(packageEntry.runCustomCheck).toBe(runCustomCheck);
  });
});
