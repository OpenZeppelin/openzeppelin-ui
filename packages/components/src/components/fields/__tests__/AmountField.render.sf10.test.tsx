/**
 * 005 SF-10 · AmountField render contract (jsdom): mode switch, default-mode parity with
 * the pre-SF-10 baseline, shared chrome, verbatim text, a11y wiring and error text.
 * Each `describe` starts with the INV id it verifies.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { useForm, type FieldValues, type UseFormReturn } from 'react-hook-form';

import { AmountField } from '../AmountField';
import {
  AMOUNT_TEXT_ISSUE_MESSAGES,
  formatAmountText,
  stepAmountText,
} from '../utils/decimalValidation';
import { AmountHarness, StrictHarness } from './amount-exact.sf10-harness';
import {
  createHandle,
  SC003_INVALID_CASES,
  SC003_OVER_LIMIT_CASES,
  SC003_VALID_CASES,
  typeBypass,
  type AmountFieldOptions,
  type HarnessHandle,
} from './amount-exact.sf10-kit';
import { BaselineAmountField, type BaselineAmountFieldProps } from './AmountField.sf10-baseline';

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  consoleError.mockRestore();
});

function mount(
  options: AmountFieldOptions,
  defaultValues: FieldValues = { amount: '' },
  mode: 'onSubmit' | 'onChange' = 'onSubmit'
): { input: HTMLInputElement; handle: HarnessHandle; container: HTMLElement } {
  const handle = createHandle();
  const { container } = render(
    <StrictHarness handle={handle} options={options} defaultValues={defaultValues} mode={mode} />
  );
  return { input: screen.getByRole('textbox') as HTMLInputElement, handle, container };
}

async function submit(): Promise<void> {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  });
}

function typeAndBlur(input: HTMLInputElement, text: string): void {
  fireEvent.change(input, { target: { value: text } });
  fireEvent.blur(input);
}

const EXACT: AmountFieldOptions = { label: 'Amount', formatOnBlur: false, decimals: 18 };

describe('INV-1: exact mode is selected by strict formatOnBlur === false only', () => {
  const cases: Array<[string, unknown, string]> = [
    ['omitted', '__omit__', '1.50'],
    ['undefined', undefined, '1.50'],
    ['true', true, '1.50'],
    ['false', false, '1.5'],
    ['0 (bypass)', 0, '1.50'],
    ['null (bypass)', null, '1.50'],
    ["'false' (bypass)", 'false', '1.50'],
  ];
  it.each(cases)('formatOnBlur %s (raw %j) → blur shows %s', (_label, flag, expected) => {
    const options: AmountFieldOptions =
      flag === '__omit__'
        ? { label: 'Amount', decimals: 2 }
        : typeBypass<AmountFieldOptions>({ label: 'Amount', decimals: 2, formatOnBlur: flag });
    const { input, handle } = mount(options);
    typeAndBlur(input, '1.5');
    expect(input.value).toBe(expected);
    expect(handle.api?.getValues('amount')).toBe(expected);
  });

  it('input and rule come from the same mode: a bypassed flag keeps default validation too', async () => {
    // Default validation passes `1e5` (parseFloat); exact validation flags it.
    const bypass = mount(typeBypass<AmountFieldOptions>({ label: 'Amount', formatOnBlur: 0 }), {
      amount: '1e5',
    });
    let ok: boolean | undefined;
    await act(async () => {
      ok = await bypass.handle.api?.trigger('amount');
    });
    expect(ok).toBe(true);
    cleanup();
    const exact = mount(EXACT, { amount: '1e5' });
    await act(async () => {
      ok = await exact.handle.api?.trigger('amount');
    });
    expect(ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// INV-2: default mode vs the pre-SF-10 baseline, byte for byte and event for event
// ---------------------------------------------------------------------------

type AnyAmountComponent = (props: BaselineAmountFieldProps<FieldValues>) => React.ReactElement;

function ParityForm({
  Component,
  props,
  defaultValues,
  apiRef,
  onValid,
}: {
  Component: AnyAmountComponent;
  props: Omit<BaselineAmountFieldProps<FieldValues>, 'control' | 'name' | 'id'>;
  defaultValues: FieldValues;
  apiRef: { current: UseFormReturn<FieldValues> | null };
  onValid: (v: FieldValues) => void;
}): React.ReactElement {
  const form = useForm<FieldValues>({ defaultValues, mode: 'onChange' });
  apiRef.current = form;
  return (
    <form onSubmit={form.handleSubmit(onValid)} noValidate>
      <Component {...props} id="amount" name="amount" control={form.control} />
      <button type="submit">Submit</button>
    </form>
  );
}

type Step =
  | { kind: 'change'; text: string }
  | { kind: 'blur' }
  | { kind: 'key'; key: string }
  | { kind: 'submit' };

const CURRENT: AnyAmountComponent = (props) => <AmountField {...props} />;
const CURRENT_EXPLICIT_TRUE: AnyAmountComponent = (props) => (
  <AmountField {...props} formatOnBlur />
);
const BASELINE: AnyAmountComponent = (props) => <BaselineAmountField {...props} />;

async function trace(
  Component: AnyAmountComponent,
  props: Omit<BaselineAmountFieldProps<FieldValues>, 'control' | 'name' | 'id'>,
  steps: Step[],
  defaultValues: FieldValues = { amount: '' }
): Promise<Array<{ html: string; value: unknown; prevented?: boolean; valid: number }>> {
  const apiRef: { current: UseFormReturn<FieldValues> | null } = { current: null };
  const onValid = vi.fn();
  const { container } = render(
    <ParityForm
      Component={Component}
      props={props}
      defaultValues={defaultValues}
      apiRef={apiRef}
      onValid={onValid}
    />
  );
  const input = screen.getByRole('textbox') as HTMLInputElement;
  const out: Array<{ html: string; value: unknown; prevented?: boolean; valid: number }> = [
    { html: container.innerHTML, value: apiRef.current?.getValues('amount'), valid: 0 },
  ];
  for (const step of steps) {
    let prevented: boolean | undefined;
    if (step.kind === 'change') fireEvent.change(input, { target: { value: step.text } });
    if (step.kind === 'blur') fireEvent.blur(input);
    if (step.kind === 'key') {
      input.focus();
      prevented = !fireEvent.keyDown(input, { key: step.key });
    }
    if (step.kind === 'submit') await submit();
    await act(async () => undefined);
    out.push({
      html: container.innerHTML,
      value: apiRef.current?.getValues('amount'),
      prevented,
      valid: onValid.mock.calls.length,
    });
  }
  cleanup();
  return out;
}

type TraceStep = { html: string; value: unknown; prevented?: boolean; valid: number };

/** The trace step with its value, and the matching `value="..."` attribute, swapped. */
function withValue(step: TraceStep, value: unknown): TraceStep {
  const html =
    typeof step.value === 'string' && typeof value === 'string'
      ? step.html.split(`value="${step.value}"`).join(`value="${value}"`)
      : step.html;
  return { ...step, html, value };
}

/**
 * 006 SF-1 INV-16: the expected default-mode trace, built from the baseline trace. A blur
 * or arrow step whose baseline write equals the exact helper's result (with the field in
 * the same state) keeps the baseline step; otherwise the step expects the helper's
 * result. Other steps keep the baseline, carrying a diverged value forward when the step
 * did not write.
 */
function restateTrace(
  baseline: TraceStep[],
  steps: Step[],
  props: Omit<BaselineAmountFieldProps<FieldValues>, 'control' | 'name' | 'id'>
): { expected: TraceStep[]; baselineSteps: number; helperSteps: number } {
  const decimals = props.decimals ?? 2;
  const expected: TraceStep[] = [baseline[0] as TraceStep];
  let baselineSteps = 1;
  let helperSteps = 0;
  steps.forEach((step, index) => {
    const prev = expected[index] as TraceStep;
    const inSync = Object.is(prev.value, (baseline[index] as TraceStep).value);
    const base = baseline[index + 1] as TraceStep;
    let exact: unknown = undefined;
    if (step.kind === 'blur') {
      const text = prev.value === null || prev.value === undefined ? '' : String(prev.value);
      exact = formatAmountText(text, decimals) ?? prev.value;
    } else if (step.kind === 'key' && (step.key === 'ArrowUp' || step.key === 'ArrowDown')) {
      exact =
        stepAmountText(prev.value, {
          direction: step.key === 'ArrowUp' ? 1 : -1,
          step: props.step ?? 0.01,
          decimals,
          min: props.min,
          max: props.max,
        }) ?? prev.value;
    }
    const isWrite = step.kind === 'blur' || (step.kind === 'key' && step.key !== 'Escape');
    if (isWrite && !(inSync && Object.is(base.value, exact))) {
      expected.push(withValue(base, exact));
      helperSteps += 1;
    } else if (!isWrite && !inSync && Object.is(base.value, (baseline[index] as TraceStep).value)) {
      expected.push(withValue(base, prev.value)); // diverged, and this step wrote nothing
      baselineSteps += 1;
    } else {
      expected.push(base);
      baselineSteps += 1;
    }
  });
  return { expected, baselineSteps, helperSteps };
}

describe('INV-2: default mode is unchanged, line for line (restated by 006 SF-1 INV-16)', () => {
  const propMatrix: Array<Omit<BaselineAmountFieldProps<FieldValues>, 'control' | 'name' | 'id'>> =
    [];
  for (const symbolPosition of ['prefix', 'suffix'] as const) {
    for (const symbol of ['', 'ETH']) {
      for (const helperText of [undefined, 'Help text']) {
        for (const required of [false, true]) {
          for (const width of ['full', 'half', 'third'] as const) {
            propMatrix.push({
              label: 'Amount',
              placeholder: '0.00',
              symbol,
              symbolPosition,
              helperText,
              width,
              decimals: 18,
              validation: { required },
            });
          }
        }
      }
    }
  }

  const script: Step[] = [
    { kind: 'submit' },
    { kind: 'change', text: '1.5' },
    { kind: 'blur' },
    { kind: 'change', text: '1,234' }, // filtered by the default keystroke rule
    { kind: 'change', text: 'abc' },
    { kind: 'change', text: '0.1' },
    { kind: 'blur' }, // 0.100000000000000006 at decimals 18
    { kind: 'key', key: 'ArrowUp' },
    { kind: 'key', key: 'ArrowDown' },
    { kind: 'key', key: 'Escape' }, // clears to null
    { kind: 'key', key: 'Escape' }, // blurs
    { kind: 'submit' },
  ];

  // 006 SF-1 restated this test (SF-1 INV-16) rather than deleting it: blur and arrow writes
  // are now exact, so a step equals the baseline wherever the baseline's float write was
  // already exact, and otherwise equals `formatAmountText` / `stepAmountText` of the same
  // input, with the rest of the DOM unchanged.
  // ~0.9 s alone, but it has hit the 5 s default under the parallel full suite, and a timed-out
  // loop keeps running and empties the DOM under the next test.
  it(`${propMatrix.length} prop combinations: DOM and value trace equal the baseline at every step, or the exact write where the baseline was inexact`, async () => {
    const paths = { baseline: 0, helper: 0 };
    for (const props of propMatrix) {
      const baseline = await trace(BASELINE, props, script);
      const { expected, baselineSteps, helperSteps } = restateTrace(baseline, script, props);
      paths.baseline += baselineSteps;
      paths.helper += helperSteps;
      expect(await trace(CURRENT, props, script), JSON.stringify(props)).toEqual(expected);
      expect(await trace(CURRENT_EXPLICIT_TRUE, props, script)).toEqual(expected);
    }
    // A parity run that silently compares nothing fails: both paths must be taken, and the
    // helper path only at the three float-inexact steps (blur 0.1, ArrowUp, ArrowDown at 18).
    expect(paths.helper).toBe(propMatrix.length * 3);
    expect(paths.baseline).toBe(propMatrix.length * (script.length + 1 - 3));
  }, 30_000);

  it('min / max / step / validateAmount traces equal the baseline (stepping, range and validator messages)', async () => {
    const variants: Array<Omit<BaselineAmountFieldProps<FieldValues>, 'control' | 'name' | 'id'>> =
      [
        { label: 'Amount', min: 1, max: 2, step: 0.5 },
        { label: 'Amount', min: 0, max: 10, validateAmount: (v) => (v > 5 ? 'Too big' : true) },
        { label: 'Amount', validateAmount: () => false }, // non-string result passes, as today
        { label: 'Amount', decimals: 0, step: 3 },
      ];
    const steps: Step[] = [
      { kind: 'change', text: '1.75' },
      { kind: 'blur' },
      { kind: 'key', key: 'ArrowUp' },
      { kind: 'key', key: 'ArrowUp' },
      { kind: 'key', key: 'ArrowDown' },
      { kind: 'submit' },
      { kind: 'change', text: '7' },
      { kind: 'submit' },
      { kind: 'change', text: '-3' },
      { kind: 'blur' },
      { kind: 'submit' },
      { kind: 'change', text: '50' },
      { kind: 'submit' },
    ];
    for (const props of variants) {
      expect(await trace(CURRENT, props, steps)).toEqual(await trace(BASELINE, props, steps));
    }
  });

  it('number and odd defaults render and validate as the baseline', async () => {
    for (const amount of [5, 0, '12.3', null, undefined, Number.NaN]) {
      const props = { label: 'Amount', decimals: 2, validation: { required: true } };
      const steps: Step[] = [{ kind: 'blur' }, { kind: 'submit' }, { kind: 'key', key: 'Escape' }];
      expect(await trace(CURRENT, props, steps, { amount })).toEqual(
        await trace(BASELINE, props, steps, { amount })
      );
    }
  });

  // 006 SF-1 restated this pin (SF-1 INV-16): 005 characterized the float artefact
  // 0.100000000000000006; the default field now blurs to the exact text.
  it('characterization: 0.1 at decimals 18 blurs to 0.100000000000000000 (006 SF-1; was 0.100000000000000006)', () => {
    const { input, handle } = mount({ label: 'Amount', decimals: 18 });
    typeAndBlur(input, '0.1');
    expect(input.value).toBe('0.100000000000000000');
    expect(handle.api?.getValues('amount')).toBe('0.100000000000000000');
  });

  it('failure case: default mode still drops a comma keystroke (value unchanged)', () => {
    const { input, handle } = mount({ label: 'Amount' }, { amount: '5' });
    fireEvent.change(input, { target: { value: '5,000' } });
    expect(input.value).toBe('5');
    expect(handle.api?.getValues('amount')).toBe('5');
  });
});

describe('INV-3: exact mode shares chrome and input attributes; only value and handlers differ', () => {
  type Shared = {
    label: string;
    placeholder?: string;
    helperText?: string;
    symbol?: string;
    symbolPosition?: 'prefix' | 'suffix';
    width?: 'full' | 'half' | 'third';
    validation?: { required?: boolean };
  };
  const common: Shared[] = [
    { label: 'Amount', placeholder: '0.00', symbol: 'ETH', symbolPosition: 'prefix' },
    { label: 'Amount', helperText: 'Help', symbol: 'ETH', validation: { required: true } },
    { label: 'Amount', width: 'half' },
  ];

  it.each(common.map((c, i) => [i, c] as const))(
    'props set %i: DOM equal across modes when clean and after a failed submit',
    async (_i, props) => {
      const capture = async (exact: boolean): Promise<string[]> => {
        const options: AmountFieldOptions = exact ? { ...props, formatOnBlur: false } : props;
        const handle = createHandle();
        const { container } = render(
          <AmountHarness handle={handle} options={options} defaultValues={{ amount: '' }} />
        );
        const clean = container.innerHTML;
        await submit();
        const afterSubmit = container.innerHTML;
        cleanup();
        return [clean, afterSubmit];
      };
      expect(await capture(true)).toEqual(await capture(false));
    }
  );

  it('no formatonblur / allowgrouping attribute and no React warning', () => {
    const { container } = mount({ ...EXACT, allowGrouping: true });
    const html = container.innerHTML.toLowerCase();
    expect(html).not.toContain('formatonblur');
    expect(html).not.toContain('allowgrouping');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('input attributes: id, name, type, inputMode, data-slot, placeholder', () => {
    const { input } = mount({ ...EXACT, placeholder: '0.00' });
    expect(input.id).toBe('amount');
    expect(input.name).toBe('amount');
    expect(input.type).toBe('text');
    expect(input.inputMode).toBe('decimal');
    expect(input.dataset.slot).toBe('input');
    expect(input.placeholder).toBe('0.00');
    // INV-25: no length cap, so a long paste is never cut off silently.
    expect(input.hasAttribute('maxlength')).toBe(false);
  });

  it('field.ref reaches the exact input: focus-on-first-error lands on it', async () => {
    const { input } = mount({ ...EXACT, validation: { required: true } });
    expect(document.activeElement).not.toBe(input);
    await submit();
    expect(document.activeElement).toBe(input);
  });

  it('setFocus behaves as in default mode (jsdom: neither mode moves focus through setFocus)', () => {
    const focused = (options: AmountFieldOptions): boolean => {
      const { input, handle } = mount(options);
      act(() => handle.api?.setFocus('amount'));
      const result = document.activeElement === input;
      cleanup();
      return result;
    };
    expect(focused(EXACT)).toBe(focused({ label: 'Amount' }));
  });
});

const BLUR_ONLY_CASES = [
  ...SC003_VALID_CASES,
  ...SC003_OVER_LIMIT_CASES,
  ...SC003_INVALID_CASES,
  '1,000 ',
  '12,345.60',
  '0.123456789012345678901',
];

describe('INV-4: the display text is exactly what the user produced (parked call a)', () => {
  it(`${BLUR_ONLY_CASES.length} precision-hostile and malformed texts survive type + blur byte for byte`, () => {
    expect(BLUR_ONLY_CASES.length).toBeGreaterThanOrEqual(50);
    for (const g of [true, false]) {
      const { input } = mount({ ...EXACT, allowGrouping: g });
      for (const text of BLUR_ONLY_CASES) {
        fireEvent.change(input, { target: { value: text } });
        fireEvent.blur(input);
        expect(input.value, `${text} g=${g}`).toBe(text);
      }
      cleanup();
    }
  });

  it('text survives an error appearing, a failed submit and a parent rerender', async () => {
    const handle = createHandle();
    const options: AmountFieldOptions = { ...EXACT, decimals: 2 };
    const { rerender } = render(<StrictHarness handle={handle} options={options} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    typeAndBlur(input, '0.123456789012345678901');
    await submit();
    expect(screen.getByRole('alert').textContent).toBe('Use at most 2 decimal places');
    rerender(<StrictHarness handle={handle} options={{ ...options }} />);
    expect(input.value).toBe('0.123456789012345678901');
  });

  it('boundary: the empty string stays empty', () => {
    const { input } = mount(EXACT, { amount: '5' });
    typeAndBlur(input, '');
    expect(input.value).toBe('');
  });
});

describe('INV-29: exact mode inherits the default accessibility wiring', () => {
  function describedTargets(input: HTMLInputElement): Array<string | null> {
    const ids = (input.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
    return ids.map((id) => document.getElementById(id)?.textContent?.trim() || null);
  }

  it('textbox named by its label, no spinbutton or aria-value*', () => {
    mount({ ...EXACT, label: 'Transfer amount' });
    const input = screen.getByRole('textbox', { name: /transfer amount/i });
    expect(screen.queryByRole('spinbutton')).toBeNull();
    for (const attr of ['aria-valuenow', 'aria-valuemin', 'aria-valuemax']) {
      expect(input.hasAttribute(attr)).toBe(false);
    }
  });

  it('clean, helper-only, error and error+helper states: every describedby id resolves to text', async () => {
    for (const helperText of [undefined, 'Use , for thousands']) {
      const { input } = mount({ ...EXACT, helperText, validation: { required: true } });
      expect(input.getAttribute('aria-describedby')).toBe(helperText ? 'amount-description' : null);
      for (const t of describedTargets(input)) expect(t).not.toBeNull();
      typeAndBlur(input, '1..2');
      await submit();
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-errormessage')).toBe('amount-error');
      expect(describedTargets(input)).toEqual(
        helperText
          ? [AMOUNT_TEXT_ISSUE_MESSAGES['multiple-points'], helperText]
          : [AMOUNT_TEXT_ISSUE_MESSAGES['multiple-points']]
      );
      cleanup();
    }
  });

  it('required: aria-required and required set, label shows *', () => {
    const { input } = mount({ ...EXACT, validation: { required: true } });
    expect(input.getAttribute('aria-required')).toBe('true');
    expect(input.required).toBe(true);
    expect(screen.getByText('*')).toBeTruthy();
  });

  it('a11y attribute set equals default mode in the error state', async () => {
    const attrs = async (options: AmountFieldOptions): Promise<Record<string, string>> => {
      const { input } = mount(options);
      await submit();
      const out: Record<string, string> = {};
      for (const a of Array.from(input.attributes)) if (a.name !== 'value') out[a.name] = a.value;
      cleanup();
      return out;
    };
    const props = { label: 'Amount', helperText: 'h', validation: { required: true } };
    expect(await attrs({ ...props, formatOnBlur: false })).toEqual(await attrs(props));
  });
});

describe('INV-30: every error is stated in text, specific to its cause', () => {
  const cases: Array<[string, AmountFieldOptions, string, string]> = [
    ['incomplete', EXACT, '-', AMOUNT_TEXT_ISSUE_MESSAGES.incomplete],
    ['exponent', EXACT, '1e18', AMOUNT_TEXT_ISSUE_MESSAGES.exponent],
    ['multiple points', EXACT, '1..2', AMOUNT_TEXT_ISSUE_MESSAGES['multiple-points']],
    ['grouping off', EXACT, '1,000', AMOUNT_TEXT_ISSUE_MESSAGES['grouping-not-allowed']],
    [
      'grouping malformed',
      { ...EXACT, allowGrouping: true },
      '1,00',
      AMOUNT_TEXT_ISSUE_MESSAGES['grouping-malformed'],
    ],
    ['invalid', EXACT, '+1', AMOUNT_TEXT_ISSUE_MESSAGES.invalid],
    ['decimals', EXACT, '0.1234567890123456789', 'Use at most 18 decimal places'],
    ['min', { ...EXACT, min: '0.5' }, '0.4', 'Value must be at least 0.5'],
    [
      'max 1e21',
      { ...EXACT, max: 1e21 },
      '1000000000000000000001',
      'Value must be at most 1000000000000000000000',
    ],
    ['misconfigured', { ...EXACT, max: 'oops' }, '1', 'Amount limit is misconfigured'],
    [
      'consumer',
      { ...EXACT, validateAmount: () => 'Insufficient balance' },
      '1',
      'Insufficient balance',
    ],
  ];

  it.each(cases)(
    '%s: alert text after blur, referenced by aria-errormessage',
    async (_n, options, text, message) => {
      const { input } = mount(options, { amount: '' }, 'onChange');
      typeAndBlur(input, text);
      await act(async () => undefined);
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toBe(message);
      expect(input.getAttribute('aria-errormessage')).toBe(alert.id);
      expect(input.value).toBe(text); // the text is never changed to clear the error
    }
  );

  it('drift: an outside-written grouped string with grouping on gets its own message', async () => {
    const { input, handle } = mount({ ...EXACT, allowGrouping: true }, { amount: '' }, 'onChange');
    await act(async () => {
      handle.api?.setValue('amount', '1,000', { shouldTouch: true });
    });
    expect(input.value).toBe('1,000');
    await submit();
    expect(screen.getByRole('alert').textContent).toBe(
      AMOUNT_TEXT_ISSUE_MESSAGES['grouping-unnormalized']
    );
  });
});
