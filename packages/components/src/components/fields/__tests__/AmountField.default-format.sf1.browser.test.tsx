/**
 * 006 SF-1 · Chromium checks for default-mode exact formatting: real typing and Tab blur
 * (INV-11, INV-19), real arrow keys keep focus (INV-12, INV-19), axe finds nothing new
 * after a formatting write (INV-19), and the Intl oracle agrees in Chromium's ICU (INV-4).
 */
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import { formatAmountText } from '../utils/decimalValidation';
import { StrictHarness } from './amount-exact.sf10-harness';
import {
  createHandle,
  createRng,
  randomPlainText,
  typeBypass,
  type AmountFieldOptions,
  type HarnessHandle,
} from './amount-exact.sf10-kit';

afterEach(() => cleanup());

function mount(options: AmountFieldOptions): { input: HTMLInputElement; handle: HarnessHandle } {
  const handle = createHandle();
  render(
    <>
      <button type="button">Before</button>
      <StrictHarness handle={handle} options={options} />
      <button type="button">After</button>
    </>
  );
  return { input: screen.getByRole('textbox') as HTMLInputElement, handle };
}

describe('INV-11 / INV-19: real typing then Tab writes the exact text; focus goes where Tab sends it', () => {
  it('0.1 at 18 decimals → 0.100000000000000000, shown and stored; focus on the next control', async () => {
    const { input, handle } = mount({ label: 'Amount', decimals: 18 });
    await userEvent.click(input);
    await userEvent.keyboard('0.1');
    await userEvent.tab();
    expect(input.value).toBe('0.100000000000000000');
    expect(handle.api?.getValues('amount')).toBe('0.100000000000000000');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Submit' }));
  });

  it('123456789012345678.5 at 2 decimals keeps every integer digit (scenario 2)', async () => {
    const { input } = mount({ label: 'Amount', decimals: 2 });
    await userEvent.click(input);
    await userEvent.keyboard('123456789012345678.5');
    await userEvent.tab();
    expect(input.value).toBe('123456789012345678.50');
  });
});

describe('INV-12 / INV-19: real arrow keys step exactly and keep focus', () => {
  it('10 ArrowUp at step 0.01 and 18 decimals: focus stays, value 0.100000000000000000', async () => {
    const { input } = mount({ label: 'Amount', decimals: 18 });
    await userEvent.click(input);
    for (let i = 0; i < 10; i += 1) await userEvent.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('0.100000000000000000');
  });

  it('read-only mode: ArrowUp leaves the value alone', async () => {
    const handle = createHandle();
    render(
      <StrictHarness
        handle={handle}
        options={{ label: 'Amount', decimals: 2, readOnly: true, readOnlyMode: 'readonly' }}
        defaultValues={{ amount: '1.5' }}
      />
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowUp}');
    await userEvent.tab();
    expect(input.value).toBe('1.5');
    expect(handle.api?.getValues('amount')).toBe('1.5');
  });
});

describe('INV-19: axe finds nothing after a formatting write that it did not find before', () => {
  async function violationIds(): Promise<string[]> {
    const results = await axe.run(document.body, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    });
    return results.violations.map((v) => v.id).sort();
  }

  it('required field with helper text: before typing, after the blur write, after arrow writes', async () => {
    const { input } = mount({
      label: 'Amount',
      decimals: 18,
      helperText: 'Up to 18 decimals',
      validation: { required: true },
    });
    const before = await violationIds();
    await userEvent.click(input);
    await userEvent.keyboard('1.239');
    await userEvent.tab();
    const afterBlur = await violationIds();
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    const afterArrows = await violationIds();
    expect(before).toEqual([]);
    expect(afterBlur).toEqual(before);
    expect(afterArrows).toEqual(before);
  });
});

describe("INV-4: the Intl halfExpand oracle agrees in Chromium's ICU", () => {
  it('seed 6411: 2,000 plain texts × 8 decimals', () => {
    type OracleOptions = Intl.NumberFormatOptions & { roundingMode: 'halfExpand' };
    const rng = createRng(6411);
    const failures: string[] = [];
    for (const d of [0, 1, 2, 6, 7, 18, 30, 100]) {
      const options: OracleOptions = {
        useGrouping: false,
        minimumFractionDigits: d,
        maximumFractionDigits: d,
        roundingMode: 'halfExpand',
      };
      const nf = new Intl.NumberFormat('en-US', options);
      for (let i = 0; i < 2_000; i += 1) {
        const text = randomPlainText(rng, 40, 32);
        const raw = nf.format(typeBypass<number>(text));
        const expected = /^-0(\.0*)?$/.test(raw) ? raw.slice(1) : raw;
        const out = formatAmountText(text, d);
        if (out !== expected) failures.push(`${text}@${d}: ${out} vs ${expected}`);
      }
    }
    expect(failures.slice(0, 5)).toEqual([]);
  });
});
