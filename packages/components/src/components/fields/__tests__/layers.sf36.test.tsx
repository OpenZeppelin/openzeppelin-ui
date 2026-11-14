/**
 * 005 SF-36 · Layer order and message scope.
 *
 * INV-10: required → built-in rules → the field's validator prop → the custom check; the first
 * failure wins and the check isn't called after an earlier failure. Driven generically from the
 * pre-SF-36 fixture: every corpus value that failed at 33ae72814 must fail with the same text
 * when a check is added, without calling it; every non-empty value that passed must now reach
 * the check. INV-11 (validator-prop quirks), INV-12 (exact strings), INV-13 (message scope),
 * INV-14 (field wording, AddressField's name-resolution gate) and scenarios 1–3 follow.
 */
import { readFileSync } from 'fs';
import path from 'path';
import { isDeepStrictEqual } from 'util';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { useForm } from 'react-hook-form';

import type { FieldValidation } from '@openzeppelin/ui-types';

import { AddressField } from '../AddressField';
import { AmountField } from '../AmountField';
import { ArrayField } from '../ArrayField';
import { BigIntField } from '../BigIntField';
import { FileUploadField } from '../FileUploadField';
import { NameResolverProvider } from '../name-resolution';
import { NumberField } from '../NumberField';
import { TextField } from '../TextField';
import { CUSTOM_CHECK_FALLBACK_MESSAGE } from '../utils';
import {
  FIELDS,
  mountField,
  NO_OPTION_VALIDATIONS,
  valueLabel,
  verdictOf,
  type FieldRenderProps,
  type FieldSpec,
  type Outcome,
} from './fieldValidation.sf36-kit';

type Baseline = Record<string, { verdicts: Record<string, Record<string, Outcome>> }>;
const BASELINE = JSON.parse(
  readFileSync(path.resolve(__dirname, 'fieldValidation.sf36-baseline.33ae72814.json'), 'utf-8')
) as Baseline;

const spec = (key: string): FieldSpec => FIELDS.find((f) => f.key === key) as FieldSpec;
const adHoc = (key: string, el: FieldSpec['el']): FieldSpec => ({
  key,
  el,
  empties: [],
  valid: undefined,
  others: [],
  readOnlyVariants: [],
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('SF-36 INV-10 — first failure wins; the check runs last and only after every layer passed', () => {
  for (const f of FIELDS) {
    it(`${f.key}: every pre-SF-36 failure keeps its text with a check added; every non-empty pass reaches the check`, async () => {
      const values = [f.valid, ...f.empties, ...(f.fallthroughs ?? []), ...f.others];
      const problems: string[] = [];
      for (const [vKey, base] of Object.entries(NO_OPTION_VALIDATIONS)) {
        for (const value of values) {
          const before = BASELINE[f.key].verdicts[vKey][valueLabel(value)].verdict;
          const check = vi.fn((_v: unknown) => 'Check');
          const m = mountField(f, { value, validation: { ...(base ?? {}), validate: check } });
          check.mockClear(); // count this validation only (MapField's effect runs on mount)
          const after = await m.verdict();
          m.unmount();
          const where = `${vKey} ${valueLabel(value)}`;
          const isEmpty = f.empties.some((e) => isDeepStrictEqual(e, value));
          if (typeof before === 'string') {
            if (after !== before) problems.push(`${where}: '${before}' became '${String(after)}'`);
            if (check.mock.calls.length > 0) problems.push(`${where}: check ran after '${before}'`);
          } else if (!isEmpty) {
            if (after !== 'Check') problems.push(`${where}: passed without the check`);
            if (check.mock.calls.length === 0) problems.push(`${where}: check not called`);
          }
        }
      }
      expect(problems).toEqual([]);
    }, 60_000);
  }
});

describe('SF-36 INV-11 — validator-prop quirks are kept; the check runs after them', () => {
  // `'14'` makes the kit's validator props return `false` (PROP_FALSE).
  const QUIRK_PASSES: Array<[string, unknown]> = [
    ['AmountField', '14'],
    ['NumberField', '14'],
    ['BigIntField', '14'],
    ['EnumField(variants)', { tag: '14' }],
    ['SelectField', '14'],
    ['SelectGroupedField', '14'],
    ['RadioField', '14'],
  ];
  for (const [key, value] of QUIRK_PASSES) {
    it(`${key}: validator false still passes with no check, and the check decides when set`, async () => {
      expect(await verdictOf(spec(key), value, {})).toBe(true);
      expect(await verdictOf(spec(key), value, { validate: () => 'Check' })).toBe('Check');
    });
  }

  it('BooleanField: a validateBoolean returning false passes today; the check decides', async () => {
    const { BooleanField } = await import('../BooleanField');
    const f = adHoc('Boolean', (p) => <BooleanField {...p} validateBoolean={() => false} />);
    expect(await verdictOf(f, true, {})).toBe(true);
    expect(await verdictOf(f, true, { validate: () => 'Check' })).toBe('Check');
  });

  it("exact AmountField: validateAmount false fails closed with 'Enter a valid amount'; the check isn't called", async () => {
    const check = vi.fn(() => 'Check');
    expect(await verdictOf(spec('AmountFieldExact'), '14', { validate: check })).toBe(
      'Enter a valid amount'
    );
    expect(check).not.toHaveBeenCalled();
  });

  it("multi-select: validateSelection false fails closed with 'Invalid selection'; the check isn't called", async () => {
    const check = vi.fn(() => 'Check');
    expect(await verdictOf(spec('SearchableMultiSelectField'), ['it'], { validate: check })).toBe(
      'Invalid selection'
    );
    expect(check).not.toHaveBeenCalled();
  });
});

describe('SF-36 INV-12 — exact values reach the check unrounded', () => {
  it('exact AmountField: an 18-decimal string arrives as the same string', async () => {
    const exact = '1000000000000000000.000000000000000001';
    const check = vi.fn((_v: unknown) => true);
    const f = adHoc('Exact18', (p) => <AmountField {...p} formatOnBlur={false} decimals={18} />);
    expect(await verdictOf(f, exact, { validate: check })).toBe(true);
    expect(check).toHaveBeenCalledWith(exact);
    expect(check.mock.calls[0][0]).toBe(exact);
  });

  it("exact AmountField: '0.1' stays '0.1'; NumberField '12.50' stays '12.50'; BigIntField 5 stays a number", async () => {
    for (const [key, value] of [
      ['AmountFieldExact', '0.1'],
      ['NumberField', '12.50'],
      ['BigIntField', 5],
    ] as const) {
      const check = vi.fn((_v: unknown) => true);
      await verdictOf(spec(key), value, { validate: check });
      expect(check.mock.calls[0][0], key).toBe(value);
    }
  });
});

describe('SF-36 INV-13 — a message applies only to a rule the consumer set', () => {
  it('BigIntField: messages.pattern alone keeps the injected integer wording; with pattern set, it applies', async () => {
    const f = adHoc('BigInt', (p) => <BigIntField {...p} />);
    expect(await verdictOf(f, '1.5', { messages: { pattern: 'X' } })).toBe(
      'Value must be a valid integer (no decimals)'
    );
    expect(await verdictOf(f, 'abc', { messages: { pattern: 'X' } })).toBe(
      'Value does not match the required pattern'
    );
    expect(await verdictOf(f, '1.5', { pattern: /^\d+$/, messages: { pattern: 'X' } })).toBe('X');
  });

  it('NumberField: prop bounds keep their wording; the same bound on validation takes the message', async () => {
    const withProps = adHoc('Number', (p) => <NumberField {...p} min={5} max={50} />);
    const messages = { min: 'X-min', max: 'X-max' };
    expect(await verdictOf(withProps, '3', { messages })).toBe('Minimum value is 5');
    expect(await verdictOf(withProps, '60', { messages })).toBe('Maximum value is 50');
    const plain = adHoc('Number', (p) => <NumberField {...p} />);
    expect(await verdictOf(plain, '3', { min: 5, messages })).toBe('X-min');
    expect(await verdictOf(plain, '60', { max: 50, messages })).toBe('X-max');
  });

  it('NumberField: minLength / maxLength / pattern never fire (Drift D2), so their messages never show', async () => {
    const plain = adHoc('Number', (p) => <NumberField {...p} />);
    const v: FieldValidation = {
      minLength: 5,
      maxLength: 1,
      pattern: '^9$',
      messages: { minLength: 'ML', maxLength: 'XL', pattern: 'P' },
    };
    expect(await verdictOf(plain, '12', v)).toBe(true);
  });

  for (const mode of ['default', 'exact'] as const) {
    it(`AmountField (${mode}): min/max props keep their wording whatever messages.min/max say (OQ-3)`, async () => {
      const f =
        mode === 'default'
          ? adHoc('Amount', (p) => <AmountField {...p} min={1} max={10} />)
          : adHoc('AmountExact', (p) => (
              <AmountField {...p} formatOnBlur={false} decimals={2} min="1" max="10" />
            ));
      const v: FieldValidation = { min: 1, max: 10, messages: { min: 'X-min', max: 'X-max' } };
      const low = await verdictOf(f, '0.5', v);
      const high = await verdictOf(f, '11', v);
      const lowDefault = await verdictOf(f, '0.5', {});
      const highDefault = await verdictOf(f, '11', {});
      expect(typeof lowDefault).toBe('string');
      if (mode === 'default') {
        expect(low).toBe(lowDefault);
        expect(high).toBe(highDefault);
      } else {
        // Exact mode reads messages.min / messages.max for its own min / max props.
        expect(low).toBe('X-min');
        expect(high).toBe('X-max');
      }
    });
  }

  it('ArrayField minItems / maxItems keep their wording (RHF holds the text; see the INV-24 pin for the screen)', async () => {
    const f = adHoc('Array', (p) => (
      <ArrayField {...p} elementType="text" minItems={2} maxItems={3} />
    ));
    const v: FieldValidation = { min: 1, max: 1, messages: { min: 'X-min', max: 'X-max' } };
    expect(await verdictOf(f, ['x'], v)).toBe('Minimum 2 items required');
    expect(await verdictOf(f, ['a', 'b', 'c', 'd'], v)).toBe('Maximum 3 items allowed');
  });

  it('FileUploadField maxSize keeps its wording', async () => {
    const f = adHoc('File', (p) => <FileUploadField {...p} maxSize={1024 * 1024} />);
    const big = { name: 'big.bin', size: 5 * 1024 * 1024 };
    expect(
      await verdictOf(f, big, { max: 1, messages: { max: 'X-max', maxLength: 'X-len' } })
    ).toBe('File size must be less than 1.00 MB');
  });
});

describe('SF-36 INV-14 — field wording is untouched by messages; the name-resolution gate stays first', () => {
  const ALL6 = {
    required: 'M-required',
    min: 'M-min',
    max: 'M-max',
    minLength: 'M-minLength',
    maxLength: 'M-maxLength',
    pattern: 'M-pattern',
  };
  const CASES: Array<[string, unknown, string]> = [
    ['NumberField', '-', 'Please enter a complete number'],
    ['NumberField', '1.', 'Please enter a complete decimal number'],
    ['NumberField', 'abc', 'Invalid number'],
    ['BigIntField', '-', 'Please enter a complete number'],
    ['AddressField', '0xnope', 'Invalid address format for the selected chain'],
    [
      'EnumField(no variants)',
      'nope',
      'Invalid JSON format. Please enter valid JSON like {"tag":"VariantName"}',
    ],
    [
      'EnumField(no variants)',
      '{"x":1}',
      'JSON must have a "tag" property specifying the enum variant',
    ],
    ['AmountFieldExact', '1.2.3', 'Only one decimal point is allowed'],
    ['AmountFieldExact', '1.1234567', 'Use at most 6 decimal places'],
    ['AmountFieldExact', '14', 'Enter a valid amount'],
    [
      'MapField',
      [
        { key: 'k', value: 'v' },
        { key: 'k', value: 'w' },
      ],
      'Duplicate keys are not allowed',
    ],
    ['MapField', [{ key: 'k', value: '' }], 'All key-value pairs must be completed'],
  ];
  for (const [key, value, text] of CASES) {
    it(`${key} ${valueLabel(value)}: '${text}' with every message key set`, async () => {
      expect(await verdictOf(spec(key), value, { messages: ALL6 })).toBe(text);
      expect(await verdictOf(spec(key), value, { required: true, messages: ALL6 })).toBe(text);
    });
  }

  it('UrlField keeps its invalid-URL text with every message key set', async () => {
    const plain = await verdictOf(spec('UrlField'), 'not a url', {});
    expect(typeof plain).toBe('string');
    expect(await verdictOf(spec('UrlField'), 'not a url', { messages: ALL6 })).toBe(plain);
  });

  it('AddressField: while a name is resolving the gate wins and the check is not called; after resolution the check gets the stored value', async () => {
    vi.useFakeTimers();
    const pending: Array<(v: unknown) => void> = [];
    const resolveName = vi.fn(
      () =>
        new Promise((resolve) => {
          pending.push(resolve);
        })
    );
    const check = vi.fn((_v: unknown) => 'Check');
    let api: ReturnType<typeof useForm<{ to: string }>> | null = null;
    function Root(): React.ReactElement {
      const form = useForm<{ to: string }>({ defaultValues: { to: '' }, mode: 'onChange' });
      api = form;
      return (
        <NameResolverProvider resolveName={resolveName as never}>
          <AddressField<{ to: string }>
            id="to"
            name="to"
            label="To"
            control={form.control}
            addressing={{ isValidAddress: (a) => /^0x[0-9a-fA-F]{40}$/.test(a) }}
            validation={{ validate: check, messages: { required: 'R' } }}
          />
        </NameResolverProvider>
      );
    }
    render(<Root />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'alice.eth' } });
    let ok: boolean | undefined;
    await act(async () => {
      ok = await api!.trigger('to');
    });
    expect(ok).toBe(false);
    expect(check).not.toHaveBeenCalled();
    expect(api!.getFieldState('to').error?.message).not.toBe('Check');

    const hex = `0x${'a1'.repeat(20)}`;
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    await act(async () => {
      pending[0]?.({
        ok: true,
        value: { name: 'alice.eth', address: hex, provenance: { label: 'ENS', external: false } },
      });
    });
    await act(async () => {
      ok = await api!.trigger('to');
    });
    expect(check).toHaveBeenCalled();
    const stored = api!.getValues('to');
    expect(check.mock.calls.at(-1)?.[0]).toBe(stored);
    expect(api!.getFieldState('to').error?.message).toBe('Check');
  });
});

describe('SF-36 scenarios 1–3 — each failure shows exactly one message, from the first failing layer', () => {
  it('scenario 1: a text field shows the custom message for required, maximum length and pattern', async () => {
    const f = adHoc('Text', (p: FieldRenderProps) => <TextField {...p} />);
    const v: FieldValidation = {
      required: true,
      maxLength: 5,
      pattern: '^[a-z]+$',
      messages: {
        required: 'Enter a name',
        maxLength: 'Five letters max',
        pattern: 'Letters only',
      },
    };
    expect(await verdictOf(f, '', v)).toBe('Enter a name');
    expect(await verdictOf(f, 'abcdefg', v)).toBe('Five letters max');
    expect(await verdictOf(f, 'ab1', v)).toBe('Letters only');
    expect(await verdictOf(f, 'abc', v)).toBe(true);
  });

  it('scenario 2: a built-in failure shows its message; the check message shows when only the check fails; a pass submits', async () => {
    const f = adHoc('Text', (p: FieldRenderProps) => <TextField {...p} />);
    const v: FieldValidation = {
      maxLength: 5,
      messages: { maxLength: 'Too long' },
      validate: (val) => (val === 'admin' ? 'Reserved' : true),
    };
    expect(await verdictOf(f, 'administrator', v)).toBe('Too long');
    const m = mountField(f, { value: 'admin', validation: v });
    expect(await m.verdict()).toBe('Reserved');
    expect((await m.submit()).valid).toBe(0);
    m.unmount();
    const ok = mountField(f, { value: 'alice', validation: v });
    expect((await ok.submit()).valid).toBe(1);
    ok.unmount();
  });

  it('scenario 3: exact AmountField steps through required → grammar → decimals → bounds → validateAmount → check', async () => {
    const check = vi.fn((val: unknown) => (val === '5' ? 'No fives' : true));
    const f = adHoc('Exact', (p) => (
      <AmountField
        {...p}
        formatOnBlur={false}
        decimals={2}
        min="1"
        max="10"
        validateAmount={(s) => (s === '7' ? 'No sevens' : true)}
      />
    ));
    const v: FieldValidation = {
      required: true,
      messages: { required: 'Enter an amount' },
      validate: check,
    };
    expect(await verdictOf(f, '', v)).toBe('Enter an amount');
    expect(await verdictOf(f, '1.2.3', v)).toBe('Only one decimal point is allowed');
    expect(await verdictOf(f, '1.234', v)).toBe('Use at most 2 decimal places');
    expect(await verdictOf(f, '0.5', v)).toBe(await verdictOf(f, '0.5', {}));
    expect(await verdictOf(f, '7', v)).toBe('No sevens');
    expect(check).not.toHaveBeenCalled();
    expect(await verdictOf(f, '5', v)).toBe('No fives');
    expect(check).toHaveBeenLastCalledWith('5');
    expect(await verdictOf(f, '2.50', v)).toBe(true);
  });

  it('scenario 3: default AmountField steps through required → bounds → validateAmount → check', async () => {
    const check = vi.fn((val: unknown) => (val === '5' ? 'No fives' : true));
    const f = adHoc('Amount', (p) => (
      <AmountField {...p} min={1} max={10} validateAmount={(n) => (n === 7 ? 'No sevens' : true)} />
    ));
    const v: FieldValidation = {
      required: true,
      messages: { required: 'Enter an amount' },
      validate: check,
    };
    expect(await verdictOf(f, '', v)).toBe('Enter an amount');
    expect(await verdictOf(f, '0.5', v)).toBe(await verdictOf(f, '0.5', {}));
    expect(await verdictOf(f, '7', v)).toBe('No sevens');
    expect(check).not.toHaveBeenCalled();
    expect(await verdictOf(f, '5', v)).toBe('No fives');
    expect(await verdictOf(f, '2.5', v)).toBe(true);
  });

  it('scenario 3: multi-select steps through required → validateSelection → check, on the id list', async () => {
    const check = vi.fn((ids: unknown) =>
      Array.isArray(ids) && ids.includes('fr') ? 'No France' : true
    );
    const v: FieldValidation = {
      required: true,
      messages: { required: 'Pick one' },
      validate: check,
    };
    const f = spec('SearchableMultiSelectField');
    expect(await verdictOf(f, [], v)).toBe('Pick one');
    expect(await verdictOf(f, ['de'], v)).toBe('Prop says no');
    expect(await verdictOf(f, ['it'], v)).toBe('Invalid selection');
    expect(check).not.toHaveBeenCalled();
    expect(await verdictOf(f, ['ca', 'fr'], v)).toBe('No France');
    expect(check).toHaveBeenLastCalledWith(['ca', 'fr']);
    expect(await verdictOf(f, ['ca'], v)).toBe(true);
  });

  it('a check returning false shows the fallback text, never an empty error', async () => {
    expect(await verdictOf(spec('TextField'), 'hello', { validate: () => false })).toBe(
      CUSTOM_CHECK_FALLBACK_MESSAGE
    );
  });
});
