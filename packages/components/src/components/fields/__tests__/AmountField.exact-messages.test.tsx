/**
 * AmountField exact mode and `validation.messages` (jsdom): `format`, `decimals`, `min` and
 * `max` word the exact-mode errors, through a real react-hook-form form.
 *
 * Each `describe` names one property; every case runs on both exact inputs (the plain one
 * and the grouped display), because they share one validate closure. Values are typed and
 * blurred, then submitted, and the test reads what a user would see: the `{id}-error`
 * element, the input's ARIA wiring, and whether the submit went through.
 *
 * Focus order and axe live in `AmountField.exact-messages.browser.test.tsx`.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FieldValues } from 'react-hook-form';

import type { FieldValidation, FieldValidationMessages } from '@openzeppelin/ui-types';

import { AmountField } from '../AmountField';
import { AmountHarness } from './amount-exact.sf10-harness';
import {
  createHandle,
  createRng,
  pick,
  randomGroupedText,
  randomHostileString,
  randomNearMiss,
  randomPlainText,
  typeBypass,
  type AmountFieldOptions,
  type ExactFieldOptions,
  type HarnessHandle,
} from './amount-exact.sf10-kit';
import { BASELINE_ISSUE_TEXTS } from './decimalValidation.exact-messages-baseline';
import { NO_OPTION_VALIDATIONS, verdictOf, type FieldSpec } from './fieldValidation.sf36-kit';

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  consoleError.mockRestore();
});

// ---------------------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------------------

const MESSAGES = {
  format: 'Enter an amount like 1,234.56',
  decimals: 'Cents only: two decimal places',
  min: 'The minimum transfer is 10',
  max: 'The maximum transfer is 1,000',
} as const satisfies FieldValidationMessages;

const ALL8: Required<FieldValidationMessages> = {
  required: 'M-required',
  min: 'M-min',
  max: 'M-max',
  minLength: 'M-minLength',
  maxLength: 'M-maxLength',
  pattern: 'M-pattern',
  format: 'M-format',
  decimals: 'M-decimals',
};

/** The two exact inputs. Grouped display needs `allowGrouping`. */
const INPUTS: ReadonlyArray<[string, Partial<ExactFieldOptions>]> = [
  ['plain exact input', {}],
  ['grouped exact input', { allowGrouping: true, groupedDisplay: true }],
];

const exact = (over: Partial<ExactFieldOptions> = {}): ExactFieldOptions => ({
  label: 'Amount',
  formatOnBlur: false,
  decimals: 2,
  ...over,
});

interface Entered {
  readonly input: HTMLInputElement;
  readonly handle: HarnessHandle;
  /** Text of `#amount-error`, or `null` when no error element is rendered. */
  readonly errorText: () => string | null;
  readonly errorEl: () => HTMLElement | null;
  readonly submit: () => Promise<void>;
  readonly rerender: (options: AmountFieldOptions) => void;
}

function mount(options: AmountFieldOptions, defaultValues: FieldValues = { amount: '' }): Entered {
  const handle = createHandle();
  const r = render(
    <AmountHarness handle={handle} options={options} defaultValues={defaultValues} />
  );
  const submit = async (): Promise<void> => {
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    });
  };
  return {
    input: screen.getByRole('textbox') as HTMLInputElement,
    handle,
    errorEl: () => document.getElementById('amount-error'),
    errorText: () => document.getElementById('amount-error')?.textContent ?? null,
    submit,
    rerender: (next) => {
      r.rerender(<AmountHarness handle={handle} options={next} defaultValues={defaultValues} />);
    },
  };
}

function typeAndBlur(input: HTMLInputElement, text: string): void {
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
  fireEvent.blur(input);
}

/** Type `text`, blur, submit; return the shown error (or `null`) and how the submit went. */
async function enter(
  options: AmountFieldOptions,
  text: string
): Promise<{ shown: string | null; valid: number; invalid: number; field: Entered }> {
  const field = mount(options);
  typeAndBlur(field.input, text);
  await field.submit();
  return {
    shown: field.errorText(),
    valid: field.handle.validCalls.length,
    invalid: field.handle.invalidCalls.length,
    field,
  };
}

/** Mount with a value written from outside, submit, return the shown error. */
async function submitValue(options: AmountFieldOptions, value: unknown): Promise<string | null> {
  const field = mount(options, { amount: value });
  await field.submit();
  return field.errorText();
}

// ---------------------------------------------------------------------------------------
// The consumer's text for each key
// ---------------------------------------------------------------------------------------

for (const [inputName, inputProps] of INPUTS) {
  const field = (over: Partial<ExactFieldOptions> = {}): ExactFieldOptions =>
    exact({
      min: '10',
      max: '1000',
      validation: { messages: { ...MESSAGES } },
      ...inputProps,
      ...over,
    });

  describe(`${inputName}: each exact-mode failure shows the consumer's text for its key`, () => {
    it('guard: this pass renders the input it names (grouped text only on the grouped input)', () => {
      const f = mount(field());
      typeAndBlur(f.input, '5000');
      expect(f.input.value).toBe(inputName === 'grouped exact input' ? '5,000' : '5000');
    });

    it.each<[string, string, keyof typeof MESSAGES]>([
      ['malformed text', '1.2.3', 'format'],
      ['too many decimals', '12.345', 'decimals'],
      ['below the min prop', '5', 'min'],
      ['above the max prop', '5000', 'max'],
    ])('%s (%j) → messages.%s, and the submit is blocked', async (_name, text, key) => {
      const { shown, valid, invalid } = await enter(field(), text);
      expect(shown).toBe(MESSAGES[key]);
      expect(valid).toBe(0);
      expect(invalid).toBe(1);
    });

    it('happy path: a valid value clears the error and submits the plain string', async () => {
      const f = mount(field());
      typeAndBlur(f.input, '1.2.3');
      await f.submit();
      expect(f.errorText()).toBe(MESSAGES.format);
      typeAndBlur(f.input, '250.50');
      await f.submit();
      expect(f.errorText()).toBeNull();
      expect(f.handle.validCalls).toEqual([{ amount: '250.50' }]);
    });

    it.each(['-', '.', '1e3', '1,00', 'abc', '   ', '+1'])(
      'grammar failure %j shows messages.format',
      async (text) => {
        expect((await enter(field({ allowGrouping: true }), text)).shown).toBe(MESSAGES.format);
      }
    );

    it('boundary: values on the inclusive bounds pass with every message set', async () => {
      for (const text of ['10', '10.00', '1000', '1000.00']) {
        const { shown, valid } = await enter(field(), text);
        expect(shown, text).toBeNull();
        expect(valid, text).toBe(1);
        cleanup();
      }
    });

    it('the text is shown verbatim: markup stays text, no trim, no interpolation', async () => {
      const raw = '  <b>x</b> {min}  ';
      const { field: f } = await enter(
        field({ validation: { messages: { format: raw } } }),
        '1.2.3'
      );
      expect(f.errorEl()?.textContent).toBe(raw);
      expect(f.errorEl()?.querySelector('b')).toBeNull();
    });

    it('the error is announced and referenced like a default one', async () => {
      const { field: f } = await enter(field(), '12.345');
      const alert = screen.getByRole('alert');
      expect(alert.id).toBe('amount-error');
      expect(alert.textContent).toBe(MESSAGES.decimals);
      expect(f.input.getAttribute('aria-invalid')).toBe('true');
      expect(f.input.getAttribute('aria-errormessage')).toBe('amount-error');
      const tokens = (f.input.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
      expect(tokens).toContain('amount-error');
      for (const token of tokens) expect(document.getElementById(token), token).not.toBeNull();
      expect(tokens.map((t) => document.getElementById(t)?.textContent)).toContain(
        MESSAGES.decimals
      );
    });
  });

  // -------------------------------------------------------------------------------------
  // Activation follows the props
  // -------------------------------------------------------------------------------------

  describe(`${inputName}: min / max messages follow the props, never validation.min / validation.max`, () => {
    const withValidation = (validation: FieldValidation, over: Partial<ExactFieldOptions> = {}) =>
      exact({ ...inputProps, validation, ...over });

    it('no min prop: validation.min sets no bound, so 0.5 passes', async () => {
      const { shown, valid } = await enter(
        withValidation({ min: 1, max: 2, messages: { min: 'X', max: 'Y' } }),
        '0.5'
      );
      expect(shown).toBeNull();
      expect(valid).toBe(1);
      cleanup();
      const above = await enter(withValidation({ max: 2, messages: { max: 'Y' } }), '50');
      expect(above.shown).toBeNull();
    });

    it('no min prop: a failure for another step never shows messages.min', async () => {
      const { shown } = await enter(
        withValidation({ min: 1, messages: { min: 'X' } }, { decimals: 0 }),
        '0.5'
      );
      expect(shown).toBe('Use at most 0 decimal places');
    });

    it.each<[string, Partial<ExactFieldOptions>, string, 'X' | 'Y']>([
      ["min='10'", { min: '10' }, '5', 'X'],
      ['min={0}', { min: 0 }, '-1', 'X'],
      ["min='0'", { min: '0' }, '-0.01', 'X'],
      ['max={0}', { max: 0 }, '1', 'Y'],
      ["max='1000'", { max: '1000' }, '1000.01', 'Y'],
    ])('%s activates its message (0 counts as set)', async (_name, bounds, text, expected) => {
      const { shown } = await enter(
        withValidation({ messages: { min: 'X', max: 'Y' } }, bounds),
        text
      );
      expect(shown).toBe(expected);
    });

    it('a min prop with no matching message keeps the default bound text', async () => {
      const { shown } = await enter(
        withValidation({ messages: { max: 'Y' } }, { min: '10', max: '1000' }),
        '5'
      );
      expect(shown).toBe('Value must be at least 10');
    });
  });

  // -------------------------------------------------------------------------------------
  // Unusable messages
  // -------------------------------------------------------------------------------------

  describe(`${inputName}: messages that are not non-empty strings are ignored`, () => {
    const DEFAULTS: ReadonlyArray<[string, string]> = [
      ['1.2.3', BASELINE_ISSUE_TEXTS['multiple-points']],
      ['12.345', 'Use at most 2 decimal places'],
      ['5', 'Value must be at least 10'],
      ['5000', 'Value must be at most 1000'],
    ];
    const odd = (messages: unknown): ExactFieldOptions =>
      exact({
        min: '10',
        max: '1000',
        ...inputProps,
        validation: typeBypass<FieldValidation>({ messages }),
      });

    it.each<[string, unknown]>([
      ['wrong types', { format: 42, decimals: '', min: null, max: {} }],
      ['booleans and symbols', { format: true, decimals: Symbol('d'), min: [], max: () => 'M' }],
      ["messages: 'x'", 'x'],
      ['messages: []', []],
      ['messages: null', null],
      ['messages: 5', 5],
      ['a Proxy whose every read is undefined', new Proxy({}, { get: () => undefined })],
    ])('%s → the default texts, nothing throws', async (_name, messages) => {
      for (const [text, expected] of DEFAULTS) {
        expect((await enter(odd(messages), text)).shown, text).toBe(expected);
        cleanup();
      }
    });

    it('boundary: a whitespace-only message is usable and shown', async () => {
      const { field: f } = await enter(odd({ format: '  ' }), '1.2.3');
      expect(f.errorEl()?.textContent).toBe('  ');
    });
  });

  // -------------------------------------------------------------------------------------
  // One key, one step
  // -------------------------------------------------------------------------------------

  describe(`${inputName}: one key replaces one step`, () => {
    const distinct = (over: Partial<ExactFieldOptions> = {}): ExactFieldOptions =>
      exact({
        min: '10',
        max: '1000',
        ...inputProps,
        validation: { messages: { format: 'F', decimals: 'D', min: 'MN', max: 'MX' } },
        ...over,
      });

    it.each<[string, string]>([
      ['1.2.3', 'F'],
      ['12.345', 'D'],
      ['1.2.345', 'F'],
      ['5.123', 'D'],
      ['5', 'MN'],
      ['5000', 'MX'],
      ['-5000.5', 'MN'],
    ])('%j → %j (first failing step wins)', async (text, expected) => {
      expect((await enter(distinct(), text)).shown).toBe(expected);
    });

    it('a whitespace-only value is malformed text: format, never required', async () => {
      const options = distinct({
        validation: { required: true, messages: { required: 'R', format: 'F' } },
      });
      expect((await enter(options, '   ')).shown).toBe('F');
    });

    it('an empty required value shows required (custom or default), never a format / bound text', async () => {
      const custom = distinct({ validation: { required: true, messages: { ...ALL8 } } });
      expect(await submitValue(custom, '')).toBe('M-required');
      cleanup();
      const plain = distinct({
        validation: { required: true, messages: { format: 'F', min: 'MN' } },
      });
      expect(await submitValue(plain, '')).toBe('This field is required');
    });

    it('an outside grouped value on the plain input is a grammar failure, so format applies', async () => {
      if (inputName !== 'plain exact input') return; // the grouped input stores it plain
      expect(await submitValue(distinct({ allowGrouping: true }), '1,000')).toBe('F');
    });
  });

  // -------------------------------------------------------------------------------------
  // Misconfigured limits
  // -------------------------------------------------------------------------------------

  describe(`${inputName}: a misconfigured limit keeps its own text`, () => {
    const broken = (over: Partial<ExactFieldOptions>): ExactFieldOptions =>
      exact({ ...inputProps, validation: { messages: { ...ALL8 } }, ...over });

    it.each<[string, Partial<ExactFieldOptions>, string[]]>([
      ['decimals={-1}', { decimals: -1 }, ['5', '1.234', '0']],
      ['decimals={1.5}', { decimals: 1.5 }, ['5']],
      ["min='abc'", { min: 'abc' }, ['5', '5000']],
      ["min='1,000'", { min: '1,000' }, ['5', '5000']],
      ['max={NaN}', { max: NaN }, ['5', '5000']],
      ['max={Infinity}', { max: Infinity }, ['5']],
    ])(
      '%s with every message set → "Amount limit is misconfigured", submit blocked',
      async (_n, over, texts) => {
        for (const text of texts) {
          const { shown, valid } = await enter(broken(over), text);
          expect(shown, text).toBe('Amount limit is misconfigured');
          expect(valid, text).toBe(0);
          cleanup();
        }
      }
    );
  });

  // -------------------------------------------------------------------------------------
  // Never-replaced texts
  // -------------------------------------------------------------------------------------

  describe(`${inputName}: texts outside the four keys are never replaced`, () => {
    const all = (over: Partial<ExactFieldOptions> = {}, validation: FieldValidation = {}) =>
      exact({
        min: '1',
        max: '1000',
        ...inputProps,
        validation: { ...validation, messages: { ...ALL8 } },
        ...over,
      });

    it('an unsupported value type shows the generic text', async () => {
      expect(await submitValue(all(), {})).toBe('Enter a valid amount');
    });

    it("validateAmount's text is shown; false shows the generic text", async () => {
      expect((await enter(all({ validateAmount: () => 'Exceeds your balance' }), '50')).shown).toBe(
        'Exceeds your balance'
      );
      cleanup();
      expect((await enter(all({ validateAmount: () => false }), '50')).shown).toBe(
        'Enter a valid amount'
      );
    });

    it("validation.validate's text is shown; a throwing check shows the fallback", async () => {
      expect((await enter(all({}, { validate: () => 'Check failed' }), '50')).shown).toBe(
        'Check failed'
      );
      cleanup();
      const throwing = all(
        {},
        {
          validate: () => {
            throw new Error('boom');
          },
        }
      );
      expect((await enter(throwing, '50')).shown).toBe('This field is invalid');
    });

    it('the custom check never runs for a value that failed an earlier step', async () => {
      const validate = vi.fn(() => 'Check failed');
      for (const text of ['1.2.3', '12.345', '0.5', '5000']) {
        await enter(all({}, { validate }), text);
        cleanup();
      }
      expect(validate).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------------------
  // Changes take effect at the next validation
  // -------------------------------------------------------------------------------------

  describe(`${inputName}: changed messages or bounds apply at the next validation, without remount`, () => {
    it('a new messages.format replaces the old one', async () => {
      const options = (format: string): ExactFieldOptions =>
        exact({ ...inputProps, validation: { messages: { format } } });
      const f = mount(options('A'));
      typeAndBlur(f.input, '1.2.3');
      await f.submit();
      expect(f.errorText()).toBe('A');
      f.rerender(options('B'));
      await f.submit();
      expect(f.errorText()).toBe('B');
    });

    it('removing the min prop deactivates messages.min and the bound', async () => {
      const validation: FieldValidation = { min: 1, messages: { min: 'X' } };
      const f = mount(exact({ ...inputProps, min: '10', validation }));
      typeAndBlur(f.input, '5');
      await f.submit();
      expect(f.errorText()).toBe('X');
      f.rerender(exact({ ...inputProps, validation }));
      await f.submit();
      expect(f.errorText()).toBeNull();
      expect(f.handle.validCalls).toEqual([{ amount: '5' }]);
    });

    it('adding a message to a mounted field applies it', async () => {
      const f = mount(exact({ ...inputProps, max: '1000' }));
      typeAndBlur(f.input, '5000');
      await f.submit();
      expect(f.errorText()).toBe('Value must be at most 1000');
      f.rerender(exact({ ...inputProps, max: '1000', validation: { messages: { max: 'MX' } } }));
      await f.submit();
      expect(f.errorText()).toBe('MX');
    });
  });
}

// ---------------------------------------------------------------------------------------
// Verdicts: messages never change which values pass
// ---------------------------------------------------------------------------------------

describe('messages never change which values pass (both exact inputs)', () => {
  const specFor = (name: string, extra: Partial<ExactFieldOptions>): FieldSpec => ({
    key: name,
    el: (p) => (
      <AmountField {...p} formatOnBlur={false} decimals={2} min="10" max="1000" {...extra} />
    ),
    empties: [],
    valid: '10',
    others: [],
    readOnlyVariants: [],
  });
  const SPECS: FieldSpec[] = [
    specFor('plain', { allowGrouping: true }),
    specFor('grouped', { allowGrouping: true, groupedDisplay: true }),
    specFor('plain, no grouping, validateAmount', {
      validateAmount: (v) => (v.includes('7') ? 'No sevens' : true),
    }),
  ];
  const VALIDATIONS = ['none', 'required', 'rules', 'optionalRules'] as const;

  function randomText(rng: () => number): string {
    const kind = Math.floor(rng() * 5);
    if (kind === 0) return randomHostileString(rng, 10);
    if (kind === 1) return randomPlainText(rng, 5, 4);
    if (kind === 2) return randomGroupedText(rng, 2, 3);
    if (kind === 3) return randomNearMiss(rng);
    return pick(rng, ['', '   ', '5', '9.99', '10', '1000', '1000.01', '12.345', '1.2.3', '-1']);
  }

  for (const spec of SPECS) {
    it(`${spec.key} (seed 0x5f4a10): 120 random values × 4 validation configs, same verdict with all eight messages`, async () => {
      const rng = createRng(0x5f4a10);
      const problems: string[] = [];
      for (let i = 0; i < 120; i += 1) {
        const value = randomText(rng);
        const vKey = pick(rng, VALIDATIONS);
        const baseValidation = NO_OPTION_VALIDATIONS[vKey];
        const withMessages: FieldValidation = { ...(baseValidation ?? {}), messages: { ...ALL8 } };
        const without = await verdictOf(spec, value, baseValidation);
        const withMsg = await verdictOf(spec, value, withMessages);
        if ((without === true) !== (withMsg === true)) {
          problems.push(
            `${vKey} ${JSON.stringify(value)}: ${String(without)} → ${String(withMsg)}`
          );
        }
      }
      expect(problems).toEqual([]);
    }, 60_000);
  }
});

// ---------------------------------------------------------------------------------------
// Default mode is untouched
// ---------------------------------------------------------------------------------------

describe('default mode ignores format, decimals, min and max messages', () => {
  const defaultField = (validation: FieldValidation): AmountFieldOptions => ({
    label: 'Amount',
    min: 1,
    max: 10,
    validation,
  });
  const MESSAGES_FOUR: FieldValidationMessages = { min: 'X', max: 'Y', format: 'F', decimals: 'D' };

  it.each<[string, string]>([
    ['0.5', 'Value must be at least 1'],
    ['11', 'Value must be at most 10'],
  ])('value %j keeps %j with the min / max props set', async (value, text) => {
    expect(await submitValue(defaultField({ messages: MESSAGES_FOUR }), value)).toBe(text);
  });

  it('validation.min / validation.max with messages still keep the default wording', async () => {
    expect(
      await submitValue(defaultField({ min: 1, max: 10, messages: MESSAGES_FOUR }), '0.5')
    ).toBe('Value must be at least 1');
  });

  it('happy path: a valid value passes, and the messages are never shown', async () => {
    const f = mount(defaultField({ messages: MESSAGES_FOUR }), { amount: '5' });
    await f.submit();
    expect(f.errorText()).toBeNull();
    expect(f.handle.validCalls).toHaveLength(1);
  });

  it('messages.required still applies in default mode, as before', async () => {
    expect(
      await submitValue(
        defaultField({ required: true, messages: { required: 'R', ...MESSAGES_FOUR } }),
        ''
      )
    ).toBe('R');
  });
});
