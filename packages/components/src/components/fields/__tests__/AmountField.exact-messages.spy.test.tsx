/**
 * @vitest-environment jsdom
 *
 * What AmountField's exact mode hands `validateExactAmount` (module spy; file-wide vi.mock,
 * so kept apart from the behaviour tests).
 *
 * A `min` / `max` message that is active without its prop can't be seen on screen: with no
 * bound, the bound step never fails. It would still be one refactor away from showing, so
 * this file pins the activation itself: `minMessage` / `maxMessage` reach the function only
 * when the matching prop is set, and they are read per validation run.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FieldValidation } from '@openzeppelin/ui-types';

import type { ExactAmountValidationOptions } from '../utils/decimalValidation';
import { AmountHarness } from './amount-exact.sf10-harness';
import { createHandle, type ExactFieldOptions } from './amount-exact.sf10-kit';

const calls: ExactAmountValidationOptions[] = [];

vi.mock('../utils/decimalValidation', async (importOriginal) => {
  const real = await importOriginal<typeof import('../utils/decimalValidation')>();
  return {
    ...real,
    validateExactAmount: (value: unknown, opts: ExactAmountValidationOptions) => {
      calls.push(opts);
      return real.validateExactAmount(value, opts);
    },
  };
});

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  calls.length = 0;
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  consoleError.mockRestore();
});

const ALL_FOUR: FieldValidation = {
  messages: { format: 'F', decimals: 'D', min: 'MN', max: 'MX' },
};

const exact = (over: Partial<ExactFieldOptions>): ExactFieldOptions => ({
  label: 'Amount',
  formatOnBlur: false,
  decimals: 2,
  validation: ALL_FOUR,
  ...over,
});

/** Mount, type `12`, submit; return the options of the last validation run. */
async function lastOptions(options: ExactFieldOptions): Promise<ExactAmountValidationOptions> {
  render(<AmountHarness handle={createHandle()} options={options} />);
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: '12' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  });
  const last = calls.at(-1);
  if (!last) throw new Error('validateExactAmount was never called');
  return last;
}

const messagesOf = (o: ExactAmountValidationOptions) => ({
  formatMessage: o.formatMessage,
  decimalsMessage: o.decimalsMessage,
  minMessage: o.minMessage,
  maxMessage: o.maxMessage,
});

describe('exact mode passes min / max messages only for the bounds its props set', () => {
  it('no min / max props: format and decimals pass, min and max do not, even with validation.min / max set', async () => {
    const o = await lastOptions(exact({ validation: { ...ALL_FOUR, min: 1, max: 100 } }));
    expect(messagesOf(o)).toEqual({
      formatMessage: 'F',
      decimalsMessage: 'D',
      minMessage: undefined,
      maxMessage: undefined,
    });
    expect(o.min).toBeUndefined();
    expect(o.max).toBeUndefined();
  });

  it.each<[string, Partial<ExactFieldOptions>, string | undefined, string | undefined]>([
    ["min='10' only", { min: '10' }, 'MN', undefined],
    ['max={1000} only', { max: 1000 }, undefined, 'MX'],
    ['min={0} and max={0}', { min: 0, max: 0 }, 'MN', 'MX'],
    ["a misconfigured min='abc' still counts as set", { min: 'abc' }, 'MN', undefined],
  ])('%s', async (_name, bounds, minMessage, maxMessage) => {
    const o = await lastOptions(exact(bounds));
    expect(o.minMessage).toBe(minMessage);
    expect(o.maxMessage).toBe(maxMessage);
  });

  it('no messages: all four options are undefined, and required keeps the default text', async () => {
    const o = await lastOptions(exact({ min: '10', max: '1000', validation: { required: true } }));
    expect(messagesOf(o)).toEqual({
      formatMessage: undefined,
      decimalsMessage: undefined,
      minMessage: undefined,
      maxMessage: undefined,
    });
    expect(o.requiredMessage).toBe('This field is required');
  });

  it('messages.required reaches requiredMessage only when validation.required is set', async () => {
    const off = await lastOptions(exact({ validation: { messages: { required: 'R' } } }));
    expect(off.requiredMessage).toBe('This field is required');
    cleanup();
    const on = await lastOptions(
      exact({ validation: { required: true, messages: { required: 'R' } } })
    );
    expect(on.requiredMessage).toBe('R');
  });

  it('the options are read per run: removing the min prop drops minMessage at the next validation', async () => {
    const handle = createHandle();
    const r = render(<AmountHarness handle={handle} options={exact({ min: '10' })} />);
    const submit = async (): Promise<void> => {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
      });
    };
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '5' } });
    await submit();
    expect(calls.at(-1)?.minMessage).toBe('MN');
    r.rerender(<AmountHarness handle={handle} options={exact({})} />);
    await submit();
    expect(calls.at(-1)?.minMessage).toBeUndefined();
  });
});
