/**
 * 006 SF-1 · default-mode AmountField writes (jsdom): blur and arrow keys write the
 * exact, rounded text through `formatAmountText` / `stepAmountText`, or nothing. Each
 * `describe` starts with the SF-1 INV id it verifies. The pure helpers are covered by
 * `decimalValidation.default-format.sf1.test.ts`; the restated 005 pins live in the
 * 005 SF-10 suites.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { Profiler } from 'react';
import { useForm, type FieldValues, type Mode, type UseFormReturn } from 'react-hook-form';

import { AmountField } from '../AmountField';
import { compareDecimalStrings, formatAmountText } from '../utils/decimalValidation';
import { StrictHarness } from './amount-exact.sf10-harness';
import {
  createHandle,
  DEFAULT_FORMAT_BOTH_MODES_CASES,
  DEFAULT_FORMAT_OVER_LIMIT_CASES,
  refRoundHalfAway,
  typeBypass,
  type AmountFieldOptions,
  type HarnessHandle,
} from './amount-exact.sf10-kit';
import { BaselineAmountField } from './AmountField.sf10-baseline';

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
  mode: Mode = 'onSubmit'
): { input: () => HTMLInputElement; handle: HarnessHandle } {
  const handle = createHandle();
  render(
    <StrictHarness handle={handle} options={options} defaultValues={defaultValues} mode={mode} />
  );
  return { input: () => screen.getByRole('textbox') as HTMLInputElement, handle };
}

function typeAndBlur(input: HTMLInputElement, text: string): void {
  fireEvent.change(input, { target: { value: text } });
  fireEvent.blur(input);
}

function fractionLength(plain: string): number {
  const point = plain.indexOf('.');
  return point === -1 ? 0 : plain.length - point - 1;
}

const values = (handle: HarnessHandle): unknown => handle.api?.getValues('amount');

// ---------------------------------------------------------------------------

describe('INV-17 / SC-003 (component): the default field equals fmt of the exact field', () => {
  // Scenario 4 of SF-1 at the component level, at both demo decimals (EVM 18, Stellar 7).
  // The e2e spec `amount-default-format.sf1.spec.ts` repeats it in the running app.
  it.each([18, 7])('decimals %i: every both-modes row, typed into each field and blurred', (d) => {
    const rows = DEFAULT_FORMAT_BOTH_MODES_CASES.filter((t) => fractionLength(t) <= d);
    expect(rows.length).toBeGreaterThanOrEqual(d === 18 ? 50 : 30);
    const exactSeen: Record<string, unknown> = {};
    const exact = mount({ label: 'Amount', decimals: d, formatOnBlur: false });
    for (const text of rows) {
      typeAndBlur(exact.input(), text);
      expect(exact.input().value, text).toBe(text);
      exactSeen[text] = values(exact.handle);
    }
    cleanup();

    const plain = mount({ label: 'Amount', decimals: d });
    const failures: string[] = [];
    for (const text of rows) {
      typeAndBlur(plain.input(), text);
      const shown = plain.input().value;
      const stored = values(plain.handle);
      const exactValue = exactSeen[text];
      if (shown !== formatAmountText(text, d)) failures.push(`${text}: shown ${shown}`);
      if (typeof stored !== 'string' || typeof exactValue !== 'string')
        failures.push(`${text}: non-string value`);
      else if (compareDecimalStrings(stored, exactValue) !== 0)
        failures.push(`${text}: ${stored} ≠ ${exactValue}`);
    }
    expect(failures).toEqual([]);
  });

  it('over-limit rows at 18: the default field rounds half away from zero (independent digit-string reference)', () => {
    expect(DEFAULT_FORMAT_OVER_LIMIT_CASES.length).toBeGreaterThanOrEqual(15);
    const { input, handle } = mount({ label: 'Amount', decimals: 18 });
    for (const text of DEFAULT_FORMAT_OVER_LIMIT_CASES) {
      typeAndBlur(input(), text);
      expect(input().value, text).toBe(refRoundHalfAway(text, 18));
      expect(values(handle), text).toBe(input().value);
    }
  });

  it('scenario 1: 0.1 at 18 decimals shows and stores 0.100000000000000000', () => {
    const { input, handle } = mount({ label: 'Amount', decimals: 18 });
    typeAndBlur(input(), '0.1');
    expect(input().value).toBe('0.100000000000000000');
    expect(values(handle)).toBe('0.100000000000000000');
  });

  it('scenario 2: 123456789012345678.5 at 2 decimals keeps every integer digit', () => {
    const { input, handle } = mount({ label: 'Amount', decimals: 2 });
    typeAndBlur(input(), '123456789012345678.5');
    expect(input().value).toBe('123456789012345678.50');
    typeAndBlur(input(), '123456789012345678.555');
    expect(values(handle)).toBe('123456789012345678.56');
  });

  it('failure case: a value submitted from the default field is never the float rewrite', async () => {
    const { input, handle } = mount({ label: 'Amount', decimals: 18 });
    typeAndBlur(input(), '9007199254740993.1');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    });
    expect(handle.validCalls.at(-1)?.amount).toBe('9007199254740993.100000000000000000');
    expect(handle.validCalls.at(-1)?.amount).not.toBe(parseFloat('9007199254740993.1').toFixed(18));
  });
});

describe('INV-2: what is shown is what is stored, as one string', () => {
  it('after every blur over the corpus at 18, and again after the next render', async () => {
    const { input, handle } = mount({ label: 'Amount', decimals: 18 });
    for (const text of [...DEFAULT_FORMAT_BOTH_MODES_CASES, ...DEFAULT_FORMAT_OVER_LIMIT_CASES]) {
      typeAndBlur(input(), text);
      const stored = values(handle);
      expect(typeof stored, text).toBe('string');
      expect(input().value, text).toBe(stored);
      await act(async () => undefined);
      expect(input().value, text).toBe(values(handle));
    }
  });

  it('after every arrow step', () => {
    const { input, handle } = mount({ label: 'Amount', decimals: 18, step: 0.01 });
    typeAndBlur(input(), '0.1');
    for (const key of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowDown']) {
      fireEvent.keyDown(input(), { key });
      expect(typeof values(handle)).toBe('string');
      expect(input().value).toBe(values(handle));
    }
    expect(input().value).toBe('0.090000000000000000');
  });
});

describe('INV-6: blurring twice never changes the value again', () => {
  it('1.239 at 2: 1.24 after the first blur and after the second, which still writes once (D-8)', () => {
    const { input, handle } = mount({ label: 'Amount', decimals: 2 });
    typeAndBlur(input(), '1.239');
    expect(input().value).toBe('1.24');
    const writes = handle.changeWrites.length;
    fireEvent.focus(input());
    fireEvent.blur(input());
    expect(input().value).toBe('1.24');
    expect(handle.changeWrites.slice(writes)).toEqual(['1.24']);
  });
});

// ---------------------------------------------------------------------------
// Ordering harness for INV-11: records each change write with the touched state at the
// moment of the write, so "write, then mark touched" is observable.
// ---------------------------------------------------------------------------

interface OrderLog {
  api: UseFormReturn<FieldValues> | null;
  readonly writes: Array<{ value: unknown; touchedAtWrite: boolean }>;
}

function OrderHarness({
  log,
  options,
  mode = 'onBlur',
  defaultValues = { amount: '' },
}: {
  log: OrderLog;
  options: AmountFieldOptions;
  mode?: Mode;
  defaultValues?: FieldValues;
}): React.ReactElement {
  const form = useForm<FieldValues>({ defaultValues, mode });
  log.api = form;
  void form.formState.touchedFields;
  React.useEffect(() => {
    const sub = form.watch((all, info) => {
      if (info.type === 'change' && info.name === 'amount')
        log.writes.push({
          value: all.amount,
          touchedAtWrite: form.getFieldState('amount').isTouched,
        });
    });
    return () => sub.unsubscribe();
  }, [form, log]);
  return (
    <form noValidate>
      <AmountField {...options} id="amount" name="amount" control={form.control} />
    </form>
  );
}

function mountOrder(
  options: AmountFieldOptions,
  defaultValues: FieldValues = { amount: '' }
): { input: HTMLInputElement; log: OrderLog } {
  const log: OrderLog = { api: null, writes: [] };
  render(<OrderHarness log={log} options={options} defaultValues={defaultValues} />);
  return { input: screen.getByRole('textbox') as HTMLInputElement, log };
}

describe('INV-11: blur writes the formatted text once, or nothing, and always marks touched', () => {
  it.each<[string, AmountFieldOptions, string, unknown[]]>([
    ['1.5 at 2', { label: 'Amount', decimals: 2 }, '1.5', ['1.50']],
    ['1.50 at 2 (unchanged, still written)', { label: 'Amount', decimals: 2 }, '1.50', ['1.50']],
    ["''", { label: 'Amount', decimals: 2 }, '', []],
    ['-', { label: 'Amount', decimals: 2 }, '-', []],
    ['.', { label: 'Amount', decimals: 2 }, '.', []],
    ['-.', { label: 'Amount', decimals: 2 }, '-.', []],
  ])('%s', (_label, options, text, expectedWrites) => {
    const { input, log } = mountOrder(options);
    if (text !== '') fireEvent.change(input, { target: { value: text } });
    log.writes.length = 0;
    expect(log.api?.getFieldState('amount').isTouched).toBe(false);
    const notPrevented = fireEvent.blur(input);
    expect(notPrevented).toBe(true);
    expect(log.writes.map((w) => w.value)).toEqual(expectedWrites);
    // The write happens before field.onBlur marks the field touched.
    for (const w of log.writes) expect(w.touchedAtWrite).toBe(false);
    expect(log.api?.getFieldState('amount').isTouched).toBe(true);
  });

  it.each([1.5, Number.NaN, -1, 101, Infinity])(
    'unusable decimals %d: no write, no throw, touched, and a required empty field shows its error',
    async (d) => {
      const { input, log } = mountOrder({
        label: 'Amount',
        decimals: d,
        validation: { required: true },
      });
      fireEvent.change(input, { target: { value: '1.5' } });
      log.writes.length = 0;
      expect(() => fireEvent.blur(input)).not.toThrow();
      expect(log.writes).toEqual([]);
      expect(input.value).toBe('1.5');
      expect(log.api?.getFieldState('amount').isTouched).toBe(true);
      cleanup();
      const empty = mountOrder({ label: 'Amount', decimals: d, validation: { required: true } });
      fireEvent.focus(empty.input);
      fireEvent.blur(empty.input);
      await act(async () => undefined);
      expect(screen.getByRole('alert').textContent).toBe('This field is required');
    }
  );

  it('read-only mode: 0.1 at 18 is not written on blur, and the field is still touched', () => {
    const { input, log } = mountOrder(
      { label: 'Amount', decimals: 18, readOnly: true, readOnlyMode: 'readonly' },
      { amount: '0.1' }
    );
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(log.writes).toEqual([]);
    expect(input.value).toBe('0.1');
    expect(log.api?.getFieldState('amount').isTouched).toBe(true);
  });
});

describe('INV-12: arrow keys step exactly when editable, and do nothing in read-only mode', () => {
  it('editable plain base: one exact write, default prevented', () => {
    const { input, log } = mountOrder(
      { label: 'Amount', decimals: 18, step: 0.01 },
      { amount: '0.1' }
    );
    const notPrevented = fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(notPrevented).toBe(false);
    expect(log.writes.map((w) => w.value)).toEqual(['0.110000000000000000']);
  });

  it("non-plain base '12abc' set from outside: no write, default still prevented (D-7)", () => {
    const { input, log } = mountOrder({ label: 'Amount', decimals: 2 });
    act(() => log.api?.setValue('amount', '12abc'));
    log.writes.length = 0;
    expect(fireEvent.keyDown(input, { key: 'ArrowUp' })).toBe(false);
    expect(fireEvent.keyDown(input, { key: 'ArrowDown' })).toBe(false);
    expect(log.writes).toEqual([]);
    expect(log.api?.getValues('amount')).toBe('12abc');
  });

  it('read-only mode: no write and not prevented', () => {
    const { input, log } = mountOrder(
      { label: 'Amount', decimals: 2, readOnly: true, readOnlyMode: 'readonly' },
      { amount: '1.00' }
    );
    expect(fireEvent.keyDown(input, { key: 'ArrowUp' })).toBe(true);
    expect(fireEvent.keyDown(input, { key: 'ArrowDown' })).toBe(true);
    expect(log.writes).toEqual([]);
  });

  it('other keys are not handled', () => {
    const { input, log } = mountOrder({ label: 'Amount', decimals: 2 }, { amount: '1.00' });
    for (const key of ['ArrowLeft', 'ArrowRight', 'Enter', 'Home', 'PageUp', 'a']) {
      expect(fireEvent.keyDown(input, { key }), key).toBe(true);
    }
    expect(log.writes).toEqual([]);
  });

  it('50 ArrowUp from empty at step 0.01 end at exactly 0.50; each starts from the last write', () => {
    const { input, log } = mountOrder({ label: 'Amount', decimals: 2, step: 0.01 });
    for (let i = 0; i < 50; i += 1) fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(log.writes).toHaveLength(50);
    expect(log.writes.at(-1)?.value).toBe('0.50');
    expect(log.writes[19]?.value).toBe('0.20');
  });

  it('3 ArrowUp from 9007199254740990 at step 1 and 0 decimals end at 9007199254740993', () => {
    const { input, log } = mountOrder(
      { label: 'Amount', decimals: 0, step: 1 },
      { amount: '9007199254740990' }
    );
    for (let i = 0; i < 3; i += 1) fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(log.writes.map((w) => w.value)).toEqual([
      '9007199254740991',
      '9007199254740992',
      '9007199254740993',
    ]);
  });

  it('failure case: step NaN, min NaN, max -Infinity never write NaN or Infinity', () => {
    const { input, log } = mountOrder(
      typeBypass<AmountFieldOptions>({ label: 'Amount', decimals: 2, step: Number.NaN }),
      { amount: '1' }
    );
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(log.writes).toEqual([]);
    cleanup();
    const bounded = mountOrder(
      { label: 'Amount', decimals: 2, min: Number.NaN, max: -Infinity },
      { amount: '1' }
    );
    fireEvent.keyDown(bounded.input, { key: 'ArrowUp' });
    expect(bounded.log.writes.map((w) => w.value)).toEqual(['1.01']);
  });
});

describe('INV-13: half-typed texts are left alone on blur, with the validator message as before', () => {
  it("'-' stays '-' and the required message shows", async () => {
    const { input, handle } = mount(
      { label: 'Amount', decimals: 2, validation: { required: true } },
      { amount: '' },
      'onBlur'
    );
    typeAndBlur(input(), '-');
    await act(async () => undefined);
    expect(input().value).toBe('-');
    expect(values(handle)).toBe('-');
    expect(screen.getByRole('alert').textContent).toBe('This field is required');
  });
});

describe('INV-14: values written from outside — plain is normalised, anything else left exactly', () => {
  async function setFocusBlur(
    handle: HarnessHandle,
    input: HTMLInputElement,
    v: unknown
  ): Promise<void> {
    await act(async () => {
      handle.api?.setValue('amount', v);
    });
    fireEvent.focus(input);
    fireEvent.blur(input);
    await act(async () => undefined);
  }

  it.each<[string, unknown, unknown]>([
    ["'007.' at 2", '007.', '7.00'],
    ['number 1.5', 1.5, '1.50'],
    ["'-0'", '-0', '0.00'],
  ])('plain %s → %j (a string)', async (_l, v, expected) => {
    const { input, handle } = mount({ label: 'Amount', decimals: 2 });
    await setFocusBlur(handle, input(), v);
    expect(values(handle)).toBe(expected);
    expect(input().value).toBe(expected);
  });

  it.each<[string, unknown]>([
    ["'1,000'", '1,000'],
    ["'12abc'", '12abc'],
    ["'1e3'", '1e3'],
    ["' 1.5'", ' 1.5'],
    ['number 1e21', 1e21],
    ['number NaN', Number.NaN],
  ])('non-plain %s keeps its exact value and JS type', async (_l, v) => {
    const { input, handle } = mount({ label: 'Amount', decimals: 2 });
    const writes = handle.changeWrites.length;
    await setFocusBlur(handle, input(), v);
    expect(Object.is(values(handle), v)).toBe(true);
    expect(handle.changeWrites.length).toBe(writes);
  });

  it.each<[string, unknown, string | null]>([
    ["'12abc' with max 5", '12abc', 'Value must be at most 5'],
    ["'1,000' with max 5 (parseFloat reads 1)", '1,000', null],
    ['number 1e21 with max 5', 1e21, 'Value must be at most 5'],
    ["' 1.5' with max 5", ' 1.5', null],
  ])('scenario 3: %s shows the default validator message as before', async (_l, v, message) => {
    const { input, handle } = mount(
      { label: 'Amount', decimals: 2, max: 5 },
      { amount: '' },
      'onBlur'
    );
    await setFocusBlur(handle, input(), v);
    expect(screen.queryByRole('alert')?.textContent ?? null).toBe(message);
    // Same verdict as validating the untouched value: blur did not change what is judged.
    let ok: boolean | undefined;
    await act(async () => {
      ok = await handle.api?.trigger('amount');
    });
    expect(ok).toBe(message === null);
  });
});

describe('INV-15: what SF-1 does not own behaves as in 005', () => {
  it('the keystroke filter still drops a non-matching edit', () => {
    const { input, handle } = mount({ label: 'Amount' }, { amount: '5' });
    for (const text of ['5,000', '5e3', ' 5', '5..0', '+5']) {
      fireEvent.change(input(), { target: { value: text } });
      expect(input().value, text).toBe('5');
    }
    expect(values(handle)).toBe('5');
  });

  it('Escape with a value writes null; Escape when empty blurs (no write, touched)', () => {
    const { input, log } = mountOrder({ label: 'Amount', decimals: 2 }, { amount: '1.50' });
    input.focus();
    expect(fireEvent.keyDown(input, { key: 'Escape' })).toBe(false);
    expect(log.writes.map((w) => w.value)).toEqual([null]);
    log.writes.length = 0;
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(log.writes).toEqual([]);
    expect(document.activeElement).not.toBe(input);
    expect(log.api?.getFieldState('amount').isTouched).toBe(true);
  });

  it('the validator verdict on each formatted value equals its verdict on the numerically equal 005 output', async () => {
    const configs: AmountFieldOptions[] = [
      { label: 'Amount', decimals: 2, min: 1, max: 1000 },
      { label: 'Amount', decimals: 2, validateAmount: (v) => (v > 4.3 ? 'Too big' : true) },
      { label: 'Amount', decimals: 2, validation: { required: true } },
    ];
    for (const options of configs) {
      for (const text of ['1.5', '4.35', '0.07', '1000.004', '1.005', '007', '-0', '0.5']) {
        const ours = formatAmountText(text, 2) ?? '';
        const old = parseFloat(text).toFixed(2);
        if (compareDecimalStrings(ours, old) !== 0) continue; // 005 output was not exact
        const verdict = async (v: string): Promise<boolean | undefined> => {
          const { handle } = mount(options, { amount: v });
          let ok: boolean | undefined;
          await act(async () => {
            ok = await handle.api?.trigger('amount');
          });
          cleanup();
          return ok;
        };
        expect(await verdict(ours), `${text}`).toBe(await verdict(old));
      }
    }
  });
});

describe('INV-18: no new runtime machinery; one write and the same commits per event as 005', () => {
  const source = readFileSync(path.resolve(__dirname, '../AmountField.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('AmountField.tsx has no effect, timer, listener, memo, ref or state hook (none at 005 either)', () => {
    expect(source).not.toMatch(
      /useEffect|useLayoutEffect|setTimeout|setInterval|requestAnimationFrame|addEventListener|useMemo|useRef|useState|useCallback/
    );
  });

  function commitTrace(Component: typeof AmountField | typeof BaselineAmountField): number[] {
    const counts: number[] = [];
    let commits = 0;
    function Form(): React.ReactElement {
      const form = useForm<FieldValues>({ defaultValues: { amount: '' }, mode: 'onChange' });
      return (
        <Profiler id="a" onRender={() => (commits += 1)}>
          <Component
            id="amount"
            name="amount"
            label="Amount"
            decimals={18}
            control={form.control}
          />
        </Profiler>
      );
    }
    render(<Form />);
    const input = screen.getByRole('textbox');
    const events: Array<() => void> = [
      () => fireEvent.change(input, { target: { value: '0.1' } }),
      () => fireEvent.blur(input),
      () => fireEvent.keyDown(input, { key: 'ArrowUp' }),
      () => fireEvent.keyDown(input, { key: 'ArrowDown' }),
      () => fireEvent.change(input, { target: { value: '123456789012345678.5' } }),
      () => fireEvent.blur(input),
      () => fireEvent.blur(input),
    ];
    for (const fire of events) {
      commits = 0;
      fire();
      counts.push(commits);
    }
    cleanup();
    return counts;
  }

  it('per-event commit counts equal the 005 baseline for the same script', () => {
    expect(commitTrace(AmountField)).toEqual(commitTrace(BaselineAmountField));
  });
});

describe('INV-19: writes change only the text — never focus, name, ARIA state or announcements', () => {
  function a11ySnapshot(input: HTMLInputElement): Record<string, string | null> {
    const out: Record<string, string | null> = { role: input.getAttribute('role') };
    for (const a of Array.from(input.attributes)) {
      if (a.name.startsWith('aria-') || a.name === 'id' || a.name === 'name') out[a.name] = a.value;
    }
    return out;
  }

  it('over the corpus at 18: only aria-invalid may change, and the textbox keeps its name', async () => {
    const { input, handle } = mount(
      { label: 'Amount', decimals: 18, helperText: 'Help', validation: { required: true } },
      { amount: '' },
      'onBlur'
    );
    for (const text of DEFAULT_FORMAT_BOTH_MODES_CASES) {
      fireEvent.change(input(), { target: { value: text } });
      const before = a11ySnapshot(input());
      fireEvent.blur(input());
      await act(async () => undefined);
      const after = a11ySnapshot(input());
      delete before['aria-invalid'];
      delete after['aria-invalid'];
      expect(after, text).toEqual(before);
      const named = screen.getByRole('textbox', { name: /amount/i }) as HTMLInputElement;
      expect(named.value).toBe(values(handle));
    }
    expect(document.querySelectorAll('[aria-live]').length).toBe(0);
  });

  it('focus stays on the input through 10 ArrowUp presses', () => {
    const { input } = mount({ label: 'Amount', decimals: 18 });
    input().focus();
    for (let i = 0; i < 10; i += 1) fireEvent.keyDown(input(), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(input());
    expect(input().value).toBe('0.100000000000000000');
  });
});
