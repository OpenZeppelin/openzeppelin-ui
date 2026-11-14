/**
 * 005 SF-10 · AmountField exact-mode interactions (jsdom, StrictMode): edits, blur,
 * Escape and arrows, the submit gate across react-hook-form modes, keyboard wiring.
 * Each `describe` starts with the INV id it verifies. Real caret, Tab order and Enter
 * submission are covered in the Chromium suite.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Mode } from 'react-hook-form';

import { AMOUNT_TEXT_ISSUE_MESSAGES } from '../utils/decimalValidation';
import { StrictHarness } from './amount-exact.sf10-harness';
import {
  createHandle,
  SC003_INVALID_CASES,
  SC003_OVER_LIMIT_CASES,
  SC003_VALID_CASES,
  type AmountFieldOptions,
  type ExactFieldOptions,
  type HarnessHandle,
} from './amount-exact.sf10-kit';

afterEach(() => cleanup());

const EXACT: ExactFieldOptions = { label: 'Amount', formatOnBlur: false, decimals: 18 };

function mount(
  options: AmountFieldOptions = EXACT,
  defaultValues: Record<string, unknown> = { amount: '' },
  mode: Mode = 'onSubmit'
): { input: HTMLInputElement; handle: HarnessHandle; form: HTMLFormElement } {
  const handle = createHandle();
  const { container } = render(
    <StrictHarness handle={handle} options={options} defaultValues={defaultValues} mode={mode} />
  );
  const form = container.querySelector('form');
  if (!form) throw new Error('harness form missing');
  return { input: screen.getByRole('textbox') as HTMLInputElement, handle, form };
}

describe('INV-19: each user edit is kept whole and produces exactly one write (parked a)', () => {
  it.each([
    ['keystroke-like growth', ['1', '12', '12,', '12,3', '12,34', '12,345', '12,345.', '12,345.6']],
    ['paste of exponent', ['1e18']],
    ['paste with spaces', [' 1,000 ']],
    ['paste grouped', ['12,345.678']],
    ['cut to empty', ['5', '']],
    ['delete in the middle', ['12,345.67', '12,35.67', '1235.67']],
  ])('%s: one write per event, argument = toAmountFormValue', (_l, texts) => {
    const { input, handle } = mount({ ...EXACT, allowGrouping: true });
    texts.forEach((text, i) => {
      fireEvent.change(input, { target: { value: text } });
      expect(input.value).toBe(text);
      expect(handle.changeWrites).toHaveLength(i + 1);
    });
    const expected = texts.map((t) =>
      /^-?[1-9][0-9]{0,2}(?:,[0-9]{3})+(?:\.[0-9]*)?$/.test(t) ? t.replace(/,/g, '') : t
    );
    expect(handle.changeWrites).toEqual(expected);
  });

  it('failure case: a comma paste with grouping off is shown and flagged, never dropped', async () => {
    const { input, handle } = mount(EXACT, { amount: '' }, 'onChange');
    fireEvent.change(input, { target: { value: '1,000' } });
    fireEvent.blur(input);
    await act(async () => undefined);
    expect(input.value).toBe('1,000');
    expect(handle.changeWrites).toEqual(['1,000']);
    expect(screen.getByRole('alert').textContent).toBe(
      AMOUNT_TEXT_ISSUE_MESSAGES['grouping-not-allowed']
    );
  });

  it('boundary: a same-value event writes nothing (React dedupes), the next edit writes once', () => {
    const { input, handle } = mount();
    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.change(input, { target: { value: '5' } });
    expect(handle.changeWrites).toEqual(['5']);
  });
});

describe('INV-20: blur marks the field touched and changes nothing else', () => {
  const cases = [...SC003_VALID_CASES, ...SC003_OVER_LIMIT_CASES, ...SC003_INVALID_CASES];
  it(`${cases.length} cases: text, value, writes and dirty state unchanged by blur; touched set`, async () => {
    for (const text of cases) {
      const { input, handle } = mount(
        { ...EXACT, allowGrouping: true },
        { amount: '' },
        'onTouched'
      );
      fireEvent.change(input, { target: { value: text } });
      const before = {
        text: input.value,
        value: handle.api?.getValues('amount'),
        writes: handle.changeWrites.length,
        dirty: handle.api?.formState.isDirty,
      };
      fireEvent.blur(input);
      await act(async () => undefined);
      expect(
        {
          text: input.value,
          value: handle.api?.getValues('amount'),
          writes: handle.changeWrites.length,
          dirty: handle.api?.formState.isDirty,
        },
        text
      ).toEqual(before);
      expect(handle.api?.formState.touchedFields.amount, text).toBe(true);
      const shouldError = !SC003_VALID_CASES.includes(text);
      expect(screen.queryByRole('alert') !== null, text).toBe(shouldError);
      cleanup();
    }
  });

  it('boundary: blur on "5." and ".5" does not tidy them', () => {
    const { input } = mount();
    for (const text of ['5.', '.5', '-0', '007']) {
      fireEvent.change(input, { target: { value: text } });
      fireEvent.blur(input);
      expect(input.value).toBe(text);
    }
  });
});

describe('INV-21: Escape clears and never reverts; arrow keys do nothing to the value', () => {
  it('Escape on 12.5 clears to "" (text and value), keeps focus; a second Escape blurs', () => {
    const { input, handle } = mount();
    input.focus();
    fireEvent.change(input, { target: { value: '12.5' } });
    const notPrevented = fireEvent.keyDown(input, { key: 'Escape' });
    expect(notPrevented).toBe(false);
    expect(input.value).toBe('');
    expect(handle.api?.getValues('amount')).toBe('');
    expect(handle.changeWrites).toEqual(['12.5', '']);
    expect(document.activeElement).toBe(input);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(document.activeElement).not.toBe(input);
    expect(handle.changeWrites).toEqual(['12.5', '']);
  });

  it('Escape clears a number default to the string "", never reverting to it', () => {
    const { input, handle } = mount(EXACT, { amount: 1000 });
    expect(input.value).toBe('1000');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input.value).toBe('');
    expect(handle.api?.getValues('amount')).toBe('');
    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input.value).toBe(''); // cleared, not back to 1000
  });

  it('A-4 boundary: an unsupported value that displays as "" is still cleared, not blurred', () => {
    const { input, handle } = mount(EXACT, { amount: { odd: true } });
    input.focus();
    expect(input.value).toBe('');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(handle.api?.getValues('amount')).toBe('');
    expect(document.activeElement).toBe(input);
  });

  it('Escape on an empty field writes nothing and blurs; value never becomes null', () => {
    for (const amount of ['', null, undefined]) {
      const { input, handle } = mount(EXACT, { amount });
      input.focus();
      expect(fireEvent.keyDown(input, { key: 'Escape' })).toBe(false);
      expect(handle.changeWrites).toEqual([]);
      expect(document.activeElement).not.toBe(input);
      cleanup();
    }
  });

  it.each(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'])(
    '%s: no write and not prevented (browser caret movement applies)',
    (key) => {
      const { input, handle } = mount(EXACT, { amount: '1.5' });
      expect(fireEvent.keyDown(input, { key })).toBe(true);
      expect(handle.changeWrites).toEqual([]);
      expect(input.value).toBe('1.5');
    }
  );

  it('failure contrast: default mode ArrowUp on 0.1 writes a float step', () => {
    const { input, handle } = mount({ label: 'Amount', decimals: 2 }, { amount: '0.1' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(handle.changeWrites).toEqual(['0.11']);
  });

  it.each(['Enter', 'Tab', 'Home', 'End', 'a', '1', ',', 'Backspace', 'Delete'])(
    'other key %s reaches the browser unprevented and writes nothing by itself',
    (key) => {
      const { input, handle } = mount(EXACT, { amount: '1.5' });
      expect(fireEvent.keyDown(input, { key })).toBe(true);
      expect(handle.changeWrites).toEqual([]);
    }
  );
});

describe('INV-23: submit never delivers an invalid exact-mode value', () => {
  const MODES: Mode[] = ['onSubmit', 'onBlur', 'onChange', 'onTouched', 'all'];
  const bad: Array<[string, ExactFieldOptions]> = [
    ...SC003_INVALID_CASES.map((t): [string, ExactFieldOptions] => [t, EXACT]),
    ...SC003_OVER_LIMIT_CASES.map((t): [string, ExactFieldOptions] => [t, EXACT]),
    ['11', { ...EXACT, max: '10' }],
    ['-1', { ...EXACT, min: 0 }],
    ['1', { ...EXACT, max: 'not-a-bound' }],
  ];

  async function submitBy(how: 'click' | 'requestSubmit', form: HTMLFormElement): Promise<void> {
    await act(async () => {
      if (how === 'click') fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
      else form.requestSubmit();
    });
  }

  it.each(MODES)(
    'mode %s: every malformed, over-limit and range case is blocked (click and requestSubmit)',
    async (mode) => {
      for (const how of ['click', 'requestSubmit'] as const) {
        for (const [text, options] of bad) {
          const { input, handle, form } = mount(
            { ...options, allowGrouping: true },
            { amount: '' },
            mode
          );
          fireEvent.change(input, { target: { value: text } });
          await submitBy(how, form);
          expect(handle.validCalls, `${mode} ${how} ${text}`).toHaveLength(0);
          expect(handle.invalidCalls.at(-1)?.amount?.message, text).toBeTruthy();
          cleanup();
        }
      }
    }
  );

  it.each(MODES)('mode %s: every valid SC-003 case submits text minus commas', async (mode) => {
    for (const text of SC003_VALID_CASES) {
      const { input, handle, form } = mount(
        { ...EXACT, allowGrouping: true },
        { amount: '' },
        mode
      );
      fireEvent.change(input, { target: { value: text } });
      await submitBy('requestSubmit', form);
      expect(handle.validCalls, `${mode} ${text}`).toHaveLength(1);
      expect(handle.validCalls[0]?.amount).toBe(text.replace(/,/g, ''));
      cleanup();
    }
  });

  it.each(MODES)(
    'mode %s: no stale validity — fix 1..2 to 1.2 then submit passes; 1.2 to 1.2. is blocked',
    async (mode) => {
      const { input, handle, form } = mount(EXACT, { amount: '' }, mode);
      fireEvent.change(input, { target: { value: '1..2' } });
      fireEvent.blur(input);
      await act(async () => undefined);
      fireEvent.change(input, { target: { value: '1.2' } });
      await submitBy('requestSubmit', form);
      expect(handle.validCalls.map((v) => v.amount)).toEqual(['1.2']);
      fireEvent.change(input, { target: { value: '1.2.' } });
      await submitBy('click', form);
      expect(handle.validCalls).toHaveLength(1);
    }
  );

  it('an outside write is validated at submit time, not from a cached result', async () => {
    const { input, handle, form } = mount(EXACT, { amount: '' }, 'onChange');
    fireEvent.change(input, { target: { value: '5' } });
    await act(async () => undefined);
    act(() => handle.api?.setValue('amount', '5..'));
    await submitBy('requestSubmit', form);
    expect(handle.validCalls).toHaveLength(0);
  });
});

describe('INV-31: keyboard wiring (jsdom part)', () => {
  it('tabIndex 0 from getAccessibilityProps; only Escape is prevented', () => {
    const { input } = mount();
    expect(input.tabIndex).toBe(0);
    const prevented = ['Escape', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', 'Tab'].filter(
      (key) => {
        fireEvent.change(input, { target: { value: '12.5' } });
        return !fireEvent.keyDown(input, { key });
      }
    );
    expect(prevented).toEqual(['Escape']);
  });
});
