/**
 * 005 SF-10 · Chromium verification: real typing at the caret (INV-19), native
 * caret keys, Tab and Enter (INV-31), Escape inside a Radix Dialog (INV-21), axe parity
 * between modes (INV-29) and real keyboard entry of precision-hostile text (INV-4).
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { useState } from 'react';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../ui/dialog';
import { StrictHarness } from './amount-exact.sf10-harness';
import { createHandle, type AmountFieldOptions, type HarnessHandle } from './amount-exact.sf10-kit';

afterEach(() => cleanup());

const EXACT: AmountFieldOptions = {
  label: 'Amount',
  formatOnBlur: false,
  decimals: 18,
  allowGrouping: true,
};

function mount(
  options: AmountFieldOptions = EXACT,
  defaultValues: Record<string, unknown> = { amount: '' }
): { input: HTMLInputElement; handle: HarnessHandle } {
  const handle = createHandle();
  render(
    <>
      <button type="button">Before</button>
      <StrictHarness handle={handle} options={options} defaultValues={defaultValues} />
      <button type="button">After</button>
    </>
  );
  return { input: screen.getByRole('textbox') as HTMLInputElement, handle };
}

describe('INV-19: typing mid-string keeps the caret where the user put it', () => {
  it('caret after "12,3" in 12,345.67: typing 9 advances it by one, text and value follow', async () => {
    const { input, handle } = mount(EXACT, { amount: '' });
    await userEvent.click(input);
    await userEvent.keyboard('12,345.67');
    expect(input.value).toBe('12,345.67');
    input.setSelectionRange(4, 4);
    await userEvent.keyboard('9');
    expect(input.value).toBe('12,3945.67');
    expect(input.selectionStart).toBe(5);
    expect(input.selectionEnd).toBe(5);
    expect(handle.api?.getValues('amount')).toBe('12,3945.67'); // invalid grouping: raw text
    input.setSelectionRange(5, 5);
    await userEvent.keyboard('{Backspace}');
    expect(input.value).toBe('12,345.67');
    expect(input.selectionStart).toBe(4);
    expect(handle.api?.getValues('amount')).toBe('12345.67');
  });

  it('each real keystroke is one write; the text is never filtered', async () => {
    const { input, handle } = mount({ ...EXACT, allowGrouping: false });
    await userEvent.click(input);
    await userEvent.keyboard('1,0e+5 ');
    expect(input.value).toBe('1,0e+5 ');
    expect(handle.changeWrites).toEqual(['1', '1,', '1,0', '1,0e', '1,0e+', '1,0e+5', '1,0e+5 ']);
  });
});

describe('INV-4: precision-hostile text typed with a real keyboard stays byte-equal after blur', () => {
  it.each([
    '12,345,678,901,234,567.123456789012345678',
    '9007199254740993',
    '0.1234567890123456789',
    '1..2',
    '-.5',
  ])('%s', async (text) => {
    const { input } = mount();
    await userEvent.click(input);
    await userEvent.keyboard(text);
    await userEvent.click(screen.getByRole('button', { name: 'After' }));
    expect(input.value).toBe(text);
  });
});

describe('INV-31: the exact field is fully keyboard operable', () => {
  it('Tab enters and leaves; Shift+Tab goes back', async () => {
    const { input } = mount();
    screen.getByRole('button', { name: 'Before' }).focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(input);
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Submit' }));
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(input);
  });

  it('Home, End, ArrowLeft, ArrowRight move the caret natively; value untouched', async () => {
    const { input, handle } = mount(EXACT, { amount: '' });
    await userEvent.click(input);
    await userEvent.keyboard('1234.5');
    const writes = handle.changeWrites.length;
    await userEvent.keyboard('{Home}');
    expect(input.selectionStart).toBe(0);
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(input.selectionStart).toBe(2);
    await userEvent.keyboard('{End}');
    expect(input.selectionStart).toBe(6);
    await userEvent.keyboard('{ArrowLeft}');
    expect(input.selectionStart).toBe(5);
    await userEvent.keyboard('{ArrowUp}{ArrowDown}');
    expect(input.value).toBe('1234.5');
    expect(handle.changeWrites.length).toBe(writes);
  });

  it('Enter in the field submits the form natively with the normalized value', async () => {
    const { input, handle } = mount();
    await userEvent.click(input);
    await userEvent.keyboard('1,234.5{Enter}');
    await act(async () => undefined);
    await expect.poll(() => handle.validCalls.length).toBe(1);
    expect(handle.validCalls[0]?.amount).toBe('1234.5');
  });

  it('failure case: Enter with invalid text submits nothing and focuses the field', async () => {
    const { input, handle } = mount();
    await userEvent.click(input);
    await userEvent.keyboard('1,00{Enter}');
    await expect.poll(() => handle.invalidCalls.length).toBe(1);
    expect(handle.validCalls).toHaveLength(0);
    expect(document.activeElement).toBe(input);
  });
});

function DialogHost({
  options,
  defaultValue,
}: {
  options: AmountFieldOptions;
  defaultValue: string;
}): React.ReactElement {
  const [open, setOpen] = useState(true);
  return (
    <>
      <p data-testid="dialog-state">{open ? 'open' : 'closed'}</p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Send</DialogTitle>
          <DialogDescription>Enter an amount</DialogDescription>
          <StrictHarness
            handle={createHandle()}
            options={options}
            defaultValues={{ amount: defaultValue }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

describe('INV-21: Escape inside a Radix Dialog behaves as in default mode', () => {
  async function escapeOnce(
    options: AmountFieldOptions
  ): Promise<{ dialog: string; text: string }> {
    render(<DialogHost options={options} defaultValue="12.5" />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await userEvent.click(input);
    await userEvent.keyboard('{Escape}');
    const result = {
      dialog: screen.getByTestId('dialog-state').textContent ?? '',
      text: input.isConnected ? input.value : '(unmounted)',
    };
    cleanup();
    return result;
  }

  it('first Escape on a non-empty field: same dialog outcome in both modes', async () => {
    const exact = await escapeOnce(EXACT);
    const plain = await escapeOnce({ label: 'Amount', decimals: 2 });
    // Radix handles Escape at the document in the capture phase, before either input's
    // preventDefault, so the dialog closes in both modes (Code OQ2). INV-21's "does not
    // close the dialog" clause holds for neither mode; parity is the contract pinned here.
    expect(exact).toEqual({ dialog: 'closed', text: '(unmounted)' });
    expect(plain).toEqual(exact);
  });
});

describe('INV-29: axe finds nothing in exact mode that default mode does not', () => {
  async function violations(options: AmountFieldOptions, invalid: boolean): Promise<string[]> {
    const { input } = mount(options);
    if (invalid) {
      await userEvent.click(input);
      await userEvent.keyboard('1');
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
      await userEvent.clear(input);
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
      await expect.poll(() => screen.queryByRole('alert')).not.toBeNull();
    }
    const results = await axe.run(document.body, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    });
    cleanup();
    return results.violations.map((v) => v.id).sort();
  }

  it.each([
    ['clean', false],
    ['error', true],
  ])('%s state, with helper text and required', async (_l, invalid) => {
    const shared = {
      label: 'Amount',
      helperText: 'Use , for thousands',
      validation: { required: true },
    };
    const exact = await violations(
      { ...shared, formatOnBlur: false, allowGrouping: true },
      invalid
    );
    const plain = await violations(shared, invalid);
    expect(exact).toEqual(plain);
    expect(exact).toEqual([]);
  });
});
