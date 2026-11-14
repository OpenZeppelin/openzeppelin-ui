/**
 * Grouped exact AmountField: `restrictInput` and `padDecimals` opt-ins. Both off keeps
 * SF-3 tip behaviour. With restrictInput, illegal inserts (letters, extra decimals, a
 * second separator, over-long fraction) are refused via the change-handler safety net;
 * pure deletions always apply; a whole paste is accepted or refused as one string.
 * With padDecimals, only the unfocused grouped display is padded; the form value stays
 * the plain unpadded text.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FieldValues, UseFormProps, UseFormReturn } from 'react-hook-form';

import type { AmountFieldOptions } from './amount-exact.sf10-kit';
import {
  DirectGroupedInput,
  GroupedHarness,
  type GroupedHarnessProps,
} from './amount-grouped.sf3-harness';
import {
  createDirectSpies,
  createGroupedHandle,
  takeCommaLeaks,
  type DirectSpies,
  type GroupedHandle,
} from './amount-grouped.sf3-kit';

const GROUPED: AmountFieldOptions = {
  label: 'Amount',
  formatOnBlur: false,
  decimals: 2,
  allowGrouping: true,
  groupedDisplay: true,
};
const RESTRICT: AmountFieldOptions = { ...GROUPED, restrictInput: true };
const PAD: AmountFieldOptions = { ...GROUPED, padDecimals: true };
const BOTH: AmountFieldOptions = { ...GROUPED, restrictInput: true, padDecimals: true };

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  expect(takeCommaLeaks()).toEqual([]);
  expect(consoleError.mock.calls).toEqual([]);
  vi.restoreAllMocks();
});

type MountProps = Partial<Omit<GroupedHarnessProps, 'handle'>>;

interface Mounted {
  readonly handle: GroupedHandle;
  readonly api: () => UseFormReturn<FieldValues>;
  readonly input: () => HTMLInputElement;
}

const seeded = (amount: unknown): UseFormProps<FieldValues> => ({ defaultValues: { amount } });

function mount(options: AmountFieldOptions, initial: MountProps = {}): Mounted {
  const handle = createGroupedHandle();
  render(
    <GroupedHarness
      handle={handle}
      options={options}
      formProps={initial.formProps ?? seeded('')}
      strict
      {...initial}
    />
  );
  return {
    handle,
    api: () => {
      if (!handle.api) throw new Error('form api missing');
      return handle.api;
    },
    input: () => screen.getByRole('textbox') as HTMLInputElement,
  };
}

interface DirectMounted {
  readonly spies: DirectSpies;
  readonly input: () => HTMLInputElement;
}

function mountDirect(
  initial: unknown,
  flags: { decimals?: number; restrictInput?: boolean; padDecimals?: boolean } = {}
): DirectMounted {
  const spies = createDirectSpies();
  render(
    <DirectGroupedInput
      spies={spies}
      initial={initial}
      decimals={flags.decimals ?? 2}
      restrictInput={flags.restrictInput}
      padDecimals={flags.padDecimals}
      strict
    />
  );
  return {
    spies,
    input: () => screen.getByRole('textbox') as HTMLInputElement,
  };
}

function focus(input: HTMLInputElement): void {
  fireEvent.focus(input);
}

function blurAway(input: HTMLInputElement): void {
  // Move focus so the blur handler ends the edit session (window-blur keeps focus).
  const elsewhere = screen.getByRole('button', { name: /Before|Elsewhere/ });
  fireEvent.blur(input, { relatedTarget: elsewhere });
  elsewhere.focus();
}

describe('both props off: tip behaviour unchanged', () => {
  it('happy: a letter stays and the form value keeps it (validation owns the error)', () => {
    const m = mount(GROUPED, { formProps: seeded('12') });
    focus(m.input());
    fireEvent.change(m.input(), { target: { value: '12a' } });
    expect(m.input().value).toBe('12a');
    expect(m.api().getValues('amount')).toBe('12a');
  });

  it('happy: unfocused 123000 shows 123,000 without padded decimals', () => {
    const m = mount(GROUPED, { formProps: seeded('123000') });
    expect(m.input().value).toBe('123,000');
    expect(m.api().getValues('amount')).toBe('123000');
  });

  it('boundary: omitting both flags matches an explicit false pair', () => {
    const omitted = mount(GROUPED, { formProps: seeded('123000') });
    const omittedText = omitted.input().value;
    const omittedValue = omitted.api().getValues('amount');
    cleanup();
    const explicit = mount(
      { ...GROUPED, restrictInput: false, padDecimals: false },
      { formProps: seeded('123000') }
    );
    expect(omittedText).toBe(explicit.input().value);
    expect(omittedValue).toBe(explicit.api().getValues('amount'));
    expect(explicit.input().value).toBe('123,000');
  });
});

describe('restrictInput: refuses illegal inserts, always accepts deletes', () => {
  it('happy: digits and a trailing/first decimal separator are accepted', () => {
    const m = mount(RESTRICT, { formProps: seeded('') });
    focus(m.input());
    fireEvent.change(m.input(), { target: { value: '12' } });
    expect(m.input().value).toBe('12');
    // Trailing point matches the amount grammar (`[0-9]*` after `.`), so it is allowed.
    fireEvent.change(m.input(), { target: { value: '12.' } });
    expect(m.input().value).toBe('12.');
    fireEvent.change(m.input(), { target: { value: '12.3' } });
    expect(m.input().value).toBe('12.3');
    expect(m.api().getValues('amount')).toBe('12.3');
  });

  it('failure: a letter leaves the text and form value unchanged', () => {
    const m = mount(RESTRICT, { formProps: seeded('12') });
    focus(m.input());
    const before = m.handle.changeWrites.length;
    fireEvent.change(m.input(), { target: { value: '12a' } });
    expect(m.input().value).toBe('12');
    expect(m.api().getValues('amount')).toBe('12');
    expect(m.handle.changeWrites.length).toBe(before);
  });

  it('failure: a third decimal digit is refused at decimals={2}', () => {
    const m = mount(RESTRICT, { formProps: seeded('1.23') });
    focus(m.input());
    fireEvent.change(m.input(), { target: { value: '1.234' } });
    expect(m.input().value).toBe('1.23');
    expect(m.api().getValues('amount')).toBe('1.23');
  });

  it('failure: a second decimal separator is refused', () => {
    const m = mount(RESTRICT, { formProps: seeded('1.2') });
    focus(m.input());
    fireEvent.change(m.input(), { target: { value: '1.2.3' } });
    expect(m.input().value).toBe('1.2');
  });

  it('happy: Backspace, Delete and selection-clear always apply', () => {
    const m = mount(RESTRICT, { formProps: seeded('12.34') });
    focus(m.input());
    fireEvent.change(m.input(), { target: { value: '12.3' } }); // Backspace
    expect(m.input().value).toBe('12.3');
    fireEvent.change(m.input(), { target: { value: '12.' } }); // another delete of a digit
    // "12." fails grammar — but a pure deletion of the last digit from "12.3" → "12." is
    // still a contiguous removal, so restrictInput must let it through.
    expect(m.input().value).toBe('12.');
    fireEvent.change(m.input(), { target: { value: '' } }); // clear all
    expect(m.input().value).toBe('');
    expect(m.api().getValues('amount')).toBe('');
  });

  it('happy: paste of a valid string is accepted whole', () => {
    const m = mount(RESTRICT, { formProps: seeded('') });
    focus(m.input());
    fireEvent.change(m.input(), { target: { value: '123000.5' } });
    expect(m.input().value).toBe('123000.5');
    expect(m.api().getValues('amount')).toBe('123000.5');
  });

  it('failure: paste of an invalid string is refused whole (no partial accept)', () => {
    const m = mount(RESTRICT, { formProps: seeded('100') });
    focus(m.input());
    fireEvent.change(m.input(), { target: { value: '100abc' } });
    expect(m.input().value).toBe('100');
    expect(m.api().getValues('amount')).toBe('100');
  });

  it('boundary: truthy non-boolean restrictInput stays off', () => {
    const m = mount(
      { ...GROUPED, restrictInput: 1 as unknown as boolean },
      { formProps: seeded('12') }
    );
    focus(m.input());
    fireEvent.change(m.input(), { target: { value: '12a' } });
    expect(m.input().value).toBe('12a');
  });
});

describe('padDecimals: pads only the unfocused grouped display', () => {
  it('happy: unfocused 123000 with decimals={2} shows 123,000.00; form value stays 123000', () => {
    const m = mount(PAD, { formProps: seeded('123000') });
    expect(m.input().value).toBe('123,000.00');
    expect(m.api().getValues('amount')).toBe('123000');
  });

  it('happy: focus shows the plain unpadded text; blur restores the padded grouped display', () => {
    const m = mount(PAD, { formProps: seeded('123000') });
    focus(m.input());
    expect(m.input().value).toBe('123000');
    expect(m.api().getValues('amount')).toBe('123000');
    blurAway(m.input());
    expect(m.input().value).toBe('123,000.00');
    expect(m.api().getValues('amount')).toBe('123000');
  });

  it('boundary: a partial fraction is padded only while unfocused', () => {
    const m = mount(PAD, { formProps: seeded('123000.5') });
    expect(m.input().value).toBe('123,000.50');
    focus(m.input());
    expect(m.input().value).toBe('123000.5');
  });

  it('failure: over-decimal value is not padded so the error stays visible', async () => {
    const m = mount(PAD, { formProps: seeded('123000.456') });
    expect(m.input().value).toBe('123,000.456');
    expect(m.api().getValues('amount')).toBe('123000.456');
    await act(async () => {
      await m.api().trigger('amount');
    });
    expect(m.api().formState.errors.amount).toBeDefined();
  });

  it('boundary: padDecimals never writes the form on focus or blur', () => {
    const d = mountDirect('123000', { padDecimals: true, decimals: 2 });
    const writesBefore = d.spies.onChange.length;
    focus(d.input());
    blurAway(d.input());
    expect(d.spies.onChange.length).toBe(writesBefore);
    expect(d.input().value).toBe('123,000.00');
  });
});

describe('both opt-ins together', () => {
  it('happy: restrict refuses a letter while padDecimals still pads on blur', () => {
    const m = mount(BOTH, { formProps: seeded('123000') });
    expect(m.input().value).toBe('123,000.00');
    focus(m.input());
    expect(m.input().value).toBe('123000');
    fireEvent.change(m.input(), { target: { value: '123000a' } });
    expect(m.input().value).toBe('123000');
    fireEvent.change(m.input(), { target: { value: '123000.5' } });
    expect(m.input().value).toBe('123000.5');
    blurAway(m.input());
    expect(m.input().value).toBe('123,000.50');
    expect(m.api().getValues('amount')).toBe('123000.5');
  });
});
