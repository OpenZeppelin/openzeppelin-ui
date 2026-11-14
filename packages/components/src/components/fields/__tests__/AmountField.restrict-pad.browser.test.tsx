/**
 * Chromium checks for grouped exact `restrictInput` / `padDecimals`: real beforeinput
 * refusal keeps the caret put, deletes still apply, paste is all-or-nothing, and
 * padDecimals only changes the unfocused display.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { FieldValues, UseFormProps, UseFormReturn } from 'react-hook-form';

import type { AmountFieldOptions } from './amount-exact.sf10-kit';
import { GroupedHarness, type GroupedHarnessProps } from './amount-grouped.sf3-harness';
import { createGroupedHandle, takeCommaLeaks, type GroupedHandle } from './amount-grouped.sf3-kit';

const BOTH: AmountFieldOptions = {
  label: 'Amount',
  formatOnBlur: false,
  decimals: 2,
  allowGrouping: true,
  groupedDisplay: true,
  restrictInput: true,
  padDecimals: true,
};
const RESTRICT: AmountFieldOptions = { ...BOTH, padDecimals: false };

let consoleError: ReturnType<typeof vi.spyOn>;
const reactEnv = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  reactEnv.IS_REACT_ACT_ENVIRONMENT = false;
});

afterEach(() => {
  cleanup();
  expect(takeCommaLeaks()).toEqual([]);
  reactEnv.IS_REACT_ACT_ENVIRONMENT = true;
  expect(consoleError.mock.calls).toEqual([]);
  vi.restoreAllMocks();
});

type MountProps = Partial<Omit<GroupedHarnessProps, 'handle'>>;

interface Mounted {
  readonly handle: GroupedHandle;
  readonly api: () => UseFormReturn<FieldValues>;
  readonly input: HTMLInputElement;
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
    input: screen.getByRole('textbox') as HTMLInputElement,
  };
}

const commit = (): Promise<void> => Promise.resolve();

describe('restrictInput in Chromium', () => {
  it('refuses a letter keystroke and leaves the caret where it was', async () => {
    const m = mount(RESTRICT, { formProps: seeded('12') });
    await userEvent.click(m.input);
    await commit();
    m.input.setSelectionRange(2, 2);
    const caret = m.input.selectionStart;
    await userEvent.keyboard('a');
    expect(m.input.value).toBe('12');
    expect(m.input.selectionStart).toBe(caret);
    expect(m.api().getValues('amount')).toBe('12');
  });

  it('refuses a third decimal digit', async () => {
    const m = mount(RESTRICT, { formProps: seeded('1.23') });
    await userEvent.click(m.input);
    await commit();
    m.input.setSelectionRange(4, 4);
    await userEvent.keyboard('4');
    expect(m.input.value).toBe('1.23');
  });

  it('always accepts Backspace', async () => {
    const m = mount(RESTRICT, { formProps: seeded('12.34') });
    await userEvent.click(m.input);
    await commit();
    m.input.setSelectionRange(5, 5);
    await userEvent.keyboard('{Backspace}');
    expect(m.input.value).toBe('12.3');
    expect(m.api().getValues('amount')).toBe('12.3');
  });

  it('paste: valid string accepted, invalid string refused whole', async () => {
    const m = mount(RESTRICT, { formProps: seeded('') });
    await userEvent.click(m.input);
    await commit();
    // Real clipboard is shared across parallel browser files; insertText matches a paste.
    document.execCommand('insertText', false, '1230.5');
    await commit();
    expect(m.input.value).toBe('1230.5');
    m.input.setSelectionRange(0, m.input.value.length);
    document.execCommand('insertText', false, '12a34');
    await commit();
    expect(m.input.value).toBe('1230.5');
    expect(m.api().getValues('amount')).toBe('1230.5');
  });
});

describe('padDecimals in Chromium', () => {
  it('shows padded grouped text unfocused and plain unpadded while focused', async () => {
    const m = mount(BOTH, { formProps: seeded('123000') });
    expect(m.input.value).toBe('123,000.00');
    await userEvent.click(m.input);
    await commit();
    expect(m.input.value).toBe('123000');
    expect(m.api().getValues('amount')).toBe('123000');
    await userEvent.click(screen.getByRole('button', { name: 'After' }));
    await commit();
    expect(m.input.value).toBe('123,000.00');
    expect(m.api().getValues('amount')).toBe('123000');
  });
});
