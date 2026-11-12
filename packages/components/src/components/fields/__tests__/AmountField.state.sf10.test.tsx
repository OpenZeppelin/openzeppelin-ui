/**
 * 005 SF-10 · AmountField exact-mode state contract (jsdom, StrictMode): display ⇔ value,
 * value shapes, outside values, write discipline, resync, mode flips, stability and the
 * three value states. Each `describe` starts with the INV id it verifies.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Profiler } from 'react';

import {
  AMOUNT_GENERIC_MESSAGE,
  AMOUNT_REQUIRED_MESSAGE,
  AMOUNT_TEXT_ISSUE_MESSAGES,
  isValidAmountText,
  PLAIN_AMOUNT_PATTERN,
  toAmountDisplayText,
  toAmountFormValue,
} from '../utils/decimalValidation';
import { StrictHarness } from './amount-exact.sf10-harness';
import {
  createHandle,
  createRng,
  pick,
  randInt,
  randomGroupedText,
  randomHostileString,
  randomPlainText,
  refParseUnits,
  typeBypass,
  viemParseUnits,
  type AmountFieldOptions,
  type HarnessHandle,
} from './amount-exact.sf10-kit';

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  consoleError.mockRestore();
});

/**
 * Vitest serializes \`it.each\` rows, which BigInt cannot survive; rows carry a tagged
 * string and each test decodes it with \`unbig\`.
 */
const BIG_TAG = '__bigint__';
const big = (digits: string): string => `${BIG_TAG}${digits}`;
const unbig = (v: unknown): unknown =>
  typeof v === 'string' && v.startsWith(BIG_TAG) ? BigInt(v.slice(BIG_TAG.length)) : v;

const EXACT: AmountFieldOptions = { label: 'Amount', formatOnBlur: false, decimals: 18 };

function mount(
  options: AmountFieldOptions = EXACT,
  defaultValues: Record<string, unknown> = { amount: '' },
  mode: 'onSubmit' | 'onChange' | 'onBlur' | 'onTouched' | 'all' = 'onSubmit'
): {
  input: () => HTMLInputElement;
  handle: HarnessHandle;
  rerender: (next?: AmountFieldOptions, name?: string) => void;
  unmount: () => void;
} {
  const handle = createHandle();
  const utils = render(
    <StrictHarness handle={handle} options={options} defaultValues={defaultValues} mode={mode} />
  );
  return {
    input: () => screen.getByRole('textbox') as HTMLInputElement,
    handle,
    rerender: (next = options, name = 'amount') =>
      utils.rerender(
        <StrictHarness
          handle={handle}
          options={next}
          defaultValues={defaultValues}
          mode={mode}
          name={name}
        />
      ),
    unmount: utils.unmount,
  };
}

function type(input: HTMLInputElement, text: string): void {
  fireEvent.change(input, { target: { value: text } });
}

async function trigger(handle: HarnessHandle): Promise<boolean | undefined> {
  let ok: boolean | undefined;
  await act(async () => {
    ok = await handle.api?.trigger('amount');
  });
  return ok;
}

/** True when a committed (text, value) pair is coherent under either INV-5 clause. */
function coherent(text: string | null, value: unknown, g: boolean): boolean {
  if (text === null) return true;
  return (
    Object.is(toAmountFormValue(text, g), value) ||
    (text === '' && (value === '' || value === null || value === undefined)) ||
    text === toAmountDisplayText(value)
  );
}

describe('INV-5: display and value always agree (model-based)', () => {
  type Op =
    | { kind: 'type'; text: string }
    | { kind: 'escape' }
    | { kind: 'blur' }
    | { kind: 'setValue'; value: unknown }
    | { kind: 'reset'; value: unknown }
    | { kind: 'rerender' }
    | { kind: 'remount' };

  function randomValue(rng: () => number): unknown {
    return pick(rng, [
      () => randomPlainText(rng, 20, 20),
      () => randomGroupedText(rng, 4, 6),
      () => randomHostileString(rng, 8),
      () => '',
      () => null,
      () => randInt(rng, -1e6, 1e6) / 100,
      () => BigInt(randInt(rng, 0, 1e9)) * 10n ** 12n,
      () => Number.NaN,
      () => ({}),
    ])();
  }

  function randomOp(rng: () => number): Op {
    const r = rng();
    if (r < 0.35) {
      const text = pick(rng, [
        () => randomPlainText(rng, 20, 20),
        () => randomGroupedText(rng, 4, 6),
        () => randomHostileString(rng, 8),
        () => '',
      ])();
      return { kind: 'type', text };
    }
    if (r < 0.45) return { kind: 'escape' };
    if (r < 0.55) return { kind: 'blur' };
    if (r < 0.7) return { kind: 'setValue', value: randomValue(rng) };
    if (r < 0.8) return { kind: 'reset', value: randomValue(rng) };
    if (r < 0.9) return { kind: 'rerender' };
    return { kind: 'remount' };
  }

  const SEQUENCES = 2_000;
  it(`seed 5005: ${SEQUENCES} random sequences of 8 ops; clause (1) or (2) after each step and at every commit`, () => {
    const rng = createRng(5005);
    const sameKey = (a: unknown, b: unknown): boolean =>
      typeof a === 'object' && a !== null && typeof b === 'object' && b !== null
        ? true
        : Object.is(a, b);
    const isEmpty = (v: unknown): boolean => v === '' || v === null || v === undefined;
    for (let seq = 0; seq < SEQUENCES; seq += 1) {
      const g = rng() < 0.5;
      const options: AmountFieldOptions = { ...EXACT, allowGrouping: g };
      let handle = createHandle();
      const handles = [handle];
      let view = render(
        <StrictHarness handle={handle} options={options} defaultValues={{ amount: '' }} />
      );
      const model: { last: 'user' | 'outside' } = { last: 'outside' };
      const ops: Op[] = [];
      for (let step = 0; step < 8; step += 1) {
        const op = randomOp(rng);
        ops.push(op);
        const input = screen.getByRole('textbox') as HTMLInputElement;
        const before = handle.api?.getValues('amount');
        const prevText = input.value;
        if (op.kind === 'remount') {
          view.unmount();
          handle = createHandle();
          handles.push(handle);
          view = render(
            <StrictHarness handle={handle} options={options} defaultValues={{ amount: before }} />
          );
          model.last = 'outside';
        } else {
          const current = handle;
          act(() => {
            switch (op.kind) {
              case 'type':
                fireEvent.change(input, { target: { value: op.text } });
                if (op.text !== prevText) model.last = 'user';
                break;
              case 'escape':
                fireEvent.keyDown(input, { key: 'Escape' });
                if (prevText !== '' || !isEmpty(before)) model.last = 'user';
                break;
              case 'blur':
                fireEvent.blur(input);
                break;
              case 'setValue':
                current.api?.setValue('amount', op.value);
                if (!sameKey(op.value, before)) model.last = 'outside';
                break;
              case 'reset':
                current.api?.reset({ amount: op.value });
                if (!sameKey(op.value, before)) model.last = 'outside';
                break;
              case 'rerender':
                view.rerender(
                  <StrictHarness
                    handle={current}
                    options={{ ...options }}
                    defaultValues={{ amount: '' }}
                  />
                );
                break;
            }
          });
        }
        const text = (screen.getByRole('textbox') as HTMLInputElement).value;
        const value = handle.api?.getValues('amount');
        const context = `seq ${seq} step ${step} g=${g} ops=${JSON.stringify(
          ops,
          (_k, v: unknown) => (typeof v === 'bigint' ? `${v}n` : v)
        )}`;
        if (model.last === 'user') expect(value, context).toBe(toAmountFormValue(text, g));
        else expect(text, context).toBe(toAmountDisplayText(value));
      }
      for (const h of handles) {
        for (const c of h.commits) {
          if (!coherent(c.text, c.value, g)) {
            throw new Error(
              `seq ${seq}: incoherent commit text=${c.text} value=${String(c.value)}`
            );
          }
        }
      }
      cleanup();
    }
  }, 120_000);

  it('failure case: reset to 5 while 500 is on screen shows 5 in the first commit', () => {
    const { input, handle } = mount();
    type(input(), '500');
    handle.commits.length = 0;
    act(() => handle.api?.reset({ amount: '5' }));
    expect(handle.commits[0]?.text).toBe('5');
    expect(input().value).toBe('5');
  });

  it('boundary: remount rebuilds the text from the value; grouping commas may go, digits never', () => {
    const { input, handle, unmount } = mount({ ...EXACT, allowGrouping: true });
    type(input(), '1,234,567.89');
    const value = handle.api?.getValues('amount');
    expect(value).toBe('1234567.89');
    unmount();
    mount({ ...EXACT, allowGrouping: true }, { amount: value });
    expect(input().value).toBe('1234567.89');
  });

  it('boundary: invalid raw text survives a remount verbatim', () => {
    const { input, handle, unmount } = mount();
    type(input(), '1..2');
    const value = handle.api?.getValues('amount');
    unmount();
    mount(EXACT, { amount: value });
    expect(input().value).toBe('1..2');
  });
});

describe('INV-7: type-bypass props never weaken either mode', () => {
  it('default mode ignores allowGrouping: a comma is still blocked', () => {
    const { input, handle } = mount(
      typeBypass<AmountFieldOptions>({ label: 'Amount', allowGrouping: true }),
      { amount: '5' }
    );
    type(input(), '1,234');
    expect(input().value).toBe('5');
    expect(handle.api?.getValues('amount')).toBe('5');
  });

  it('exact mode ignores step: ArrowUp/ArrowDown write nothing', () => {
    const { input, handle } = mount(typeBypass<AmountFieldOptions>({ ...EXACT, step: 1 }), {
      amount: '1.5',
    });
    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(handle.changeWrites).toEqual([]);
    expect(handle.api?.getValues('amount')).toBe('1.5');
  });

  it.each([
    ['1 (truthy)', 1, true],
    ["'yes' (truthy)", 'yes', true],
    ['0', 0, false],
    ["'' (falsy)", '', false],
  ])('allowGrouping %s in exact mode is reduced to %s', (_l, flag, grouped) => {
    const { input, handle } = mount(
      typeBypass<AmountFieldOptions>({ ...EXACT, allowGrouping: flag })
    );
    type(input(), '1,000');
    expect(handle.api?.getValues('amount')).toBe(grouped ? '1000' : '1,000');
  });

  it('default mode with string min/max behaves as the baseline (unchanged, not made worse)', async () => {
    const { input, handle } = mount(
      typeBypass<AmountFieldOptions>({ label: 'Amount', min: '5', max: '10' })
    );
    type(input(), '3');
    expect(await trigger(handle)).toBe(false);
    type(input(), '7');
    expect(await trigger(handle)).toBe(true);
  });
});

describe('INV-8: exact-mode form values have one of three shapes, never a float (parked a, c)', () => {
  // Load-sensitive like the 48-combination render test: it has hit the 5 s default under the
  // parallel full suite.
  it('seed 8008: every write over 3,000 random edits is "", a PLAIN normalization, or the raw text', () => {
    const rng = createRng(8008);
    for (const g of [true, false]) {
      const { input, handle } = mount({ ...EXACT, allowGrouping: g });
      const typed: string[] = [];
      for (let i = 0; i < 1_500; i += 1) {
        const text = pick(rng, [
          () => randomPlainText(rng, 25, 25),
          () => randomGroupedText(rng, 5, 10),
          () => randomHostileString(rng, 10),
        ])();
        if (text === input().value) continue;
        typed.push(text);
        type(input(), text);
      }
      if (input().value !== '') typed.push('');
      fireEvent.keyDown(input(), { key: 'Escape' });
      expect(handle.changeWrites.length).toBe(typed.length);
      handle.changeWrites.forEach((w, i) => {
        const t = typed[i] ?? '';
        expect(typeof w).toBe('string');
        if (w === '') expect(t).toBe('');
        else if (PLAIN_AMOUNT_PATTERN.test(String(w))) {
          expect(isValidAmountText(t, g), t).toBe(true);
          expect(w).toBe(t.replace(/,/g, ''));
        } else expect(w).toBe(t);
      });
      cleanup();
    }
  }, 30_000);

  it.each([
    ['number', 5],
    ['bigint', big('12345678901234567890')],
  ])('parked call (c): a %s default stays that value and type until an edit', async (_l, raw) => {
    const value = unbig(raw);
    const { input, handle } = mount(EXACT, { amount: value });
    expect(handle.api?.getValues('amount')).toBe(value);
    fireEvent.focus(input());
    fireEvent.blur(input());
    expect(await trigger(handle)).toBe(true);
    expect(handle.api?.getValues('amount')).toBe(value);
    type(input(), `${input().value}1`);
    expect(handle.api?.getValues('amount')).toBe(`${String(value)}1`);
  });

  it('failure case: 12345678901234567890 typed reaches the form as that exact string', () => {
    const { input, handle } = mount();
    type(input(), '12345678901234567890');
    expect(handle.api?.getValues('amount')).toBe('12345678901234567890');
  });
});

describe('INV-16: outside values render and validate the same way (parked c)', () => {
  it.each<[string, unknown, string, boolean | string]>([
    ['string', '12.50', '12.50', true],
    ['number 0.1', 0.1, '0.1', true],
    ['number 1e21', 1e21, '1000000000000000000000', true],
    ['NaN', Number.NaN, 'NaN', AMOUNT_GENERIC_MESSAGE],
    ['Infinity', Infinity, 'Infinity', AMOUNT_GENERIC_MESSAGE],
    ['bigint', big('1000000000000000000000000000000'), '1000000000000000000000000000000', true],
    ['null', null, '', true],
    ['missing', undefined, '', true],
    ['boolean', true, '', AMOUNT_GENERIC_MESSAGE],
    ['object', { amount: 1 }, '', AMOUNT_GENERIC_MESSAGE],
    ['array', ['1'], '', AMOUNT_GENERIC_MESSAGE],
  ])('defaultValues %s (%j): text %j, verdict %j, submit gated', async (_l, raw, text, verdict) => {
    const value = unbig(raw);
    const { input, handle } = mount({ ...EXACT, decimals: 30 }, { amount: value });
    expect(input().value).toBe(text);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    });
    if (verdict === true) {
      expect(handle.validCalls).toHaveLength(1);
    } else {
      expect(handle.validCalls).toHaveLength(0);
      expect(screen.getByRole('alert').textContent).toBe(verdict);
    }
  });

  it('setValue of each odd type shows the same text as a default would', () => {
    const { input, handle } = mount();
    for (const [value, text] of [
      [0.1, '0.1'],
      [Number.NaN, 'NaN'],
      [{}, ''],
      [7n, '7'],
      ['x', 'x'],
    ] as const) {
      act(() => handle.api?.setValue('amount', value));
      expect(input().value).toBe(text);
    }
  });
});

describe('INV-17: a passing value converts to exactly the amount on screen (real component)', () => {
  it('seed 1777: 300 random valid texts, decimals 0–30, random bounds, driven through the field', async () => {
    const rng = createRng(1777);
    let passed = 0;
    for (let i = 0; i < 300; i += 1) {
      const g = rng() < 0.5;
      const text = g ? randomGroupedText(rng, 6, 20) : randomPlainText(rng, 25, 20);
      const decimals = randInt(rng, 0, 30);
      const min = rng() < 0.3 ? String(-randInt(rng, 0, 1e6)) : undefined;
      const max = rng() < 0.3 ? `${randInt(rng, 0, 1e9)}.${randInt(rng, 0, 99)}` : undefined;
      const { input, handle } = mount({
        ...EXACT,
        allowGrouping: g,
        decimals,
        ...(min === undefined ? {} : { min }),
        ...(max === undefined ? {} : { max }),
      });
      type(input(), text);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
      });
      const submitted = handle.validCalls[0]?.amount;
      if (submitted !== undefined) {
        passed += 1;
        expect(input().value).toBe(text);
        expect(submitted).toBe(text.replace(/,/g, ''));
        expect(viemParseUnits(String(submitted), decimals)).toBe(
          refParseUnits(String(submitted), decimals)
        );
      }
      cleanup();
    }
    expect(passed).toBeGreaterThan(30);
  }, 60_000);
});

describe('INV-18: the field writes the form value only on a user edit or Escape (parked c)', () => {
  it.each<[string, unknown]>([
    ['string', '12.5'],
    ['number', 5],
    ['bigint', big('5')],
    ['empty', ''],
    ['missing', undefined],
  ])(
    'default %s: no write and not dirty through mount, focus, blur, rerenders, reset, setValue, name change, flip, remount',
    (_l, raw) => {
      const value = unbig(raw);
      const defaults = { amount: value, other: '3' };
      const { input, handle, rerender } = mount(EXACT, defaults);
      const state = (): unknown => [
        handle.api?.formState.isDirty,
        handle.api?.formState.dirtyFields.amount,
      ];
      expect(state()).toEqual([false, undefined]);
      fireEvent.focus(input());
      fireEvent.blur(input());
      for (let i = 0; i < 5; i += 1) rerender({ ...EXACT });
      act(() => handle.api?.reset({ amount: value, other: '3' }));
      act(() => handle.api?.setValue('amount', '42'));
      rerender(EXACT, 'other');
      rerender(EXACT, 'amount');
      rerender({ label: 'Amount', decimals: 18 });
      rerender(EXACT);
      expect(handle.changeWrites).toEqual([]);
      expect(handle.api?.getValues('other')).toBe('3');
      type(input(), '7');
      expect(handle.changeWrites).toEqual(['7']);
    }
  );

  it('a number default stays a number on mount (no write-back)', () => {
    const { handle } = mount(EXACT, { amount: 5 });
    expect(typeof handle.api?.getValues('amount')).toBe('number');
    expect(handle.api?.formState.isDirty).toBe(false);
  });
});

describe('INV-22: outside writes are adopted in the same render, never echoed, and converge', () => {
  it('setValue and reset show the new text in the first commit after the write', () => {
    const { input, handle } = mount();
    type(input(), '500');
    for (const write of [
      () => handle.api?.setValue('amount', '42'),
      () => handle.api?.reset({ amount: '' }),
      () => handle.api?.setValue('amount', 7n),
    ]) {
      handle.commits.length = 0;
      act(() => {
        write();
      });
      expect(handle.commits.length).toBeGreaterThan(0);
      for (const c of handle.commits) expect(c.text).toBe(toAmountDisplayText(c.value));
    }
  });

  it("boundary: an equal outside write keeps the user's grouping; a different spelling is adopted", () => {
    const { input, handle } = mount({ ...EXACT, allowGrouping: true });
    type(input(), '1,000');
    act(() => handle.api?.setValue('amount', '1000'));
    expect(input().value).toBe('1,000');
    act(() => handle.api?.setValue('amount', '1000.0'));
    expect(input().value).toBe('1000.0');
  });

  it('user text survives any number of parent rerenders', () => {
    const { input, rerender } = mount({ ...EXACT, allowGrouping: true });
    type(input(), '12,345.60');
    for (let i = 0; i < 10; i += 1) rerender({ ...EXACT, allowGrouping: true });
    expect(input().value).toBe('12,345.60');
  });

  it.each<[string, unknown]>([
    ['{}', {}],
    ['NaN', Number.NaN],
    ['[]', []],
  ])('failure case: setValue(%s) converges within 3 commits, no render loop', (_l, value) => {
    const { handle } = mount();
    handle.commits.length = 0;
    act(() => handle.api?.setValue('amount', value));
    expect(handle.commits.length).toBeLessThanOrEqual(3);
    act(() => handle.api?.setValue('amount', value));
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("a name change shows the new path's value and never writes the old text to it", () => {
    const { input, handle, rerender } = mount(EXACT, { amount: '1', other: '2' });
    type(input(), '111');
    rerender(EXACT, 'other');
    expect(input().value).toBe('2');
    expect(handle.api?.getValues()).toEqual({ amount: '111', other: '2' });
  });
});

describe('INV-24: switching modes writes nothing and validates with the active mode', () => {
  it('default → exact keeps the formatted text and writes nothing; exact → default validates by default rules', async () => {
    const { input, handle, rerender } = mount({ label: 'Amount', decimals: 2 });
    type(input(), '1.5');
    fireEvent.blur(input());
    expect(input().value).toBe('1.50');
    const writes = handle.changeWrites.length;
    rerender(EXACT);
    expect(input().value).toBe('1.50');
    expect(handle.changeWrites.length).toBe(writes);
    type(input(), '1e5');
    rerender({ label: 'Amount', decimals: 2 });
    expect(handle.changeWrites.length).toBe(writes + 1);
    expect(await trigger(handle)).toBe(true); // default mode: parseFloat('1e5') passes, as today
    rerender(EXACT);
    expect(await trigger(handle)).toBe(false);
    expect(handle.api?.formState.errors.amount?.message).toBe(AMOUNT_TEXT_ISSUE_MESSAGES.exponent);
  });

  it('boundary: a value corrupted by default mode is shown as it is after the flip', () => {
    const { input, rerender } = mount({ label: 'Amount', decimals: 18 });
    type(input(), '0.1');
    fireEvent.blur(input());
    rerender(EXACT);
    expect(input().value).toBe('0.100000000000000006');
  });
});

describe('INV-26: no effects, timers or listeners; no extra writes or renders; always controlled', () => {
  it('each keystroke: one write and at most 2 commits', () => {
    const { input, handle } = mount();
    for (const text of ['1', '12', '12.', '12.5', '1,2']) {
      handle.commits.length = 0;
      const writes = handle.changeWrites.length;
      type(input(), text);
      expect(handle.changeWrites.length - writes).toBe(1);
      // StrictMode double-invokes render, not commits.
      expect(handle.commits.length).toBeLessThanOrEqual(2);
    }
  });

  it('setValue(undefined) then typing: still controlled, no warning, display as in default mode', () => {
    // react-hook-form's Controller hands back the default value when the stored value is
    // undefined, in both modes (finding outside SF-10, see 05-tests.md Dev Notes).
    const shown = (options: AmountFieldOptions): string => {
      const { input, handle } = mount(options, { amount: '5' });
      act(() => handle.api?.setValue('amount', undefined));
      const text = input().value;
      type(input(), '9');
      expect(input().value).toBe('9');
      cleanup();
      return text;
    };
    expect(shown(EXACT)).toBe(shown({ label: 'Amount', decimals: 18 }));
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('100 mount / type / reset / unmount cycles: no console errors, listeners balanced like default mode', () => {
    const count = (options: AmountFieldOptions): [number, number] => {
      const add = vi.spyOn(EventTarget.prototype, 'addEventListener');
      const remove = vi.spyOn(EventTarget.prototype, 'removeEventListener');
      for (let i = 0; i < 100; i += 1) {
        const { input, handle, unmount } = mount(options);
        type(input(), '1.5');
        act(() => handle.api?.reset({ amount: '' }));
        unmount();
      }
      const result: [number, number] = [add.mock.calls.length, remove.mock.calls.length];
      add.mockRestore();
      remove.mockRestore();
      return result;
    };
    const [exactAdds, exactRemoves] = count(EXACT);
    const [defaultAdds, defaultRemoves] = count({ label: 'Amount', decimals: 18 });
    expect(exactAdds - exactRemoves).toBeLessThanOrEqual(defaultAdds - defaultRemoves);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('no timers are scheduled by typing, blur or Escape', () => {
    const { input } = mount();
    const timeout = vi.spyOn(globalThis, 'setTimeout');
    const interval = vi.spyOn(globalThis, 'setInterval');
    type(input(), '1.5');
    fireEvent.blur(input());
    fireEvent.keyDown(input(), { key: 'Escape' });
    // react-hook-form and React may schedule their own work; the exact input adds none
    // beyond what default mode does for the same events.
    const exactTimers = timeout.mock.calls.length + interval.mock.calls.length;
    cleanup();
    timeout.mockClear();
    interval.mockClear();
    const plain = mount({ label: 'Amount', decimals: 18 });
    type(plain.input(), '1.5');
    fireEvent.blur(plain.input());
    fireEvent.keyDown(plain.input(), { key: 'Escape' });
    const defaultTimers = timeout.mock.calls.length + interval.mock.calls.length;
    timeout.mockRestore();
    interval.mockRestore();
    expect(exactTimers).toBeLessThanOrEqual(defaultTimers);
  });
});

describe('INV-28: empty, invalid and valid are distinct states; validation is synchronous', () => {
  const rows: Array<[string, boolean, string | null]> = [
    ['', true, AMOUNT_REQUIRED_MESSAGE],
    ['', false, null],
    [' ', true, AMOUNT_TEXT_ISSUE_MESSAGES.invalid],
    [' ', false, AMOUNT_TEXT_ISSUE_MESSAGES.invalid],
    ['-', true, AMOUNT_TEXT_ISSUE_MESSAGES.incomplete],
    ['-', false, AMOUNT_TEXT_ISSUE_MESSAGES.incomplete],
    ['1,000', true, AMOUNT_TEXT_ISSUE_MESSAGES['grouping-not-allowed']],
    ['1,000', false, AMOUNT_TEXT_ISSUE_MESSAGES['grouping-not-allowed']],
    ['12.5', true, null],
    ['12.5', false, null],
  ];
  it.each(rows)('text %j required=%s → %j after blur', async (text, required, message) => {
    const { input } = mount({ ...EXACT, validation: { required } }, { amount: 'x' }, 'onTouched');
    type(input(), text);
    fireEvent.blur(input());
    await act(async () => undefined);
    const alert = screen.queryByRole('alert');
    expect(alert?.textContent ?? null).toBe(message);
    expect(input().getAttribute('aria-invalid')).toBe(message === null ? 'false' : 'true');
    if (text !== '') expect(alert?.textContent).not.toBe(AMOUNT_REQUIRED_MESSAGE);
  });

  it('a Promise-returning consumer validator fails closed instead of pending', async () => {
    const { input, handle } = mount({
      ...EXACT,
      validateAmount: typeBypass<(v: string) => boolean>(async () => true),
    });
    type(input(), '1');
    expect(await trigger(handle)).toBe(false);
    expect(handle.api?.formState.errors.amount?.message).toBe(AMOUNT_GENERIC_MESSAGE);
  });
});

describe('INV-26/INV-18 profiler: StrictMode mount writes nothing', () => {
  it('mounting under StrictMode records commits but no change writes', () => {
    const onRender = vi.fn();
    const handle = createHandle();
    render(
      <Profiler id="outer" onRender={onRender}>
        <StrictHarness handle={handle} options={EXACT} defaultValues={{ amount: 5 }} />
      </Profiler>
    );
    expect(onRender).toHaveBeenCalled();
    expect(handle.changeWrites).toEqual([]);
    expect(screen.getByRole('textbox')).toBeTruthy();
  });
});
