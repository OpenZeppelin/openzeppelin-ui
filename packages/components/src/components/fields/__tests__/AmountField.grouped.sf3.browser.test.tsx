/**
 * 007 SF-3 · Chromium verification of AmountField with `groupedDisplay`: what needs a
 * real browser. The focus swap in the focus dispatch (INV-24), the mapped selection
 * after Tab and `focus()` (INV-25), the mouse caret (INV-26), real and window blur
 * (INV-27, INV-28), keyboard operability (INV-36), read-only and disabled fields under
 * real input (INV-21), focus loss on disable (INV-15), real typing (INV-23), blur cost
 * with a very long text (INV-32) and axe parity with the plain exact input (INV-34).
 * Chromium only: Firefox and WebKit are out of scope for this sub-feature.
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { FieldValues, UseFormProps, UseFormReturn } from 'react-hook-form';

import { toPlainOffset } from '../utils/amountGrouping';
import type { AmountFieldOptions } from './amount-exact.sf10-kit';
import { GroupedHarness, type GroupedHarnessProps } from './amount-grouped.sf3-harness';
import {
  createGroupedHandle,
  strip,
  takeCommaLeaks,
  type GroupedHandle,
} from './amount-grouped.sf3-kit';

const GROUPED: AmountFieldOptions = {
  label: 'Amount',
  formatOnBlur: false,
  decimals: 18,
  allowGrouping: true,
  groupedDisplay: true,
};
const PLAIN_EXACT: AmountFieldOptions = { ...GROUPED, groupedDisplay: false };
const READONLY: AmountFieldOptions = { ...GROUPED, readOnly: true, readOnlyMode: 'readonly' };
const DISABLED: AmountFieldOptions = { ...GROUPED, readOnly: true };
const MOD = (k: string): string => `{ControlOrMeta>}${k}{/ControlOrMeta}`;

let consoleError: ReturnType<typeof vi.spyOn>;

const reactEnv = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  // Run React as an app does. With the act environment on, an update from a real
  // browser event is deferred until the next `act`, which would hide exactly what this
  // file checks: that the swap happens inside the focus dispatch. Testing Library turns
  // the flag back on for the duration of its own `render` / `act` calls.
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
  readonly set: (patch: MountProps) => void;
  readonly before: HTMLElement;
  readonly after: HTMLElement;
}

const seeded = (amount: unknown): UseFormProps<FieldValues> => ({ defaultValues: { amount } });

function mount(initial: MountProps = {}): Mounted {
  const handle = createGroupedHandle();
  let props: MountProps = initial;
  const element = (): React.ReactElement => (
    <GroupedHarness handle={handle} options={GROUPED} strict {...props} />
  );
  const view = render(element());
  return {
    handle,
    api: () => {
      if (!handle.api) throw new Error('form api missing');
      return handle.api;
    },
    input: screen.getByRole('textbox') as HTMLInputElement,
    set: (patch) => {
      props = { ...props, ...patch };
      view.rerender(element());
    },
    before: screen.getByRole('button', { name: 'Before' }),
    after: screen.getByRole('button', { name: 'After' }),
  };
}

/**
 * React commits a discrete event's update in a microtask. For a real key or pointer
 * event that is still inside the event's dispatch; for a scripted `focus()` it is as
 * soon as the calling script yields. One microtask is all a scripted focus may need.
 */
const commit = (): Promise<void> => Promise.resolve();

const selection = (input: HTMLInputElement): [number | null, number | null] => [
  input.selectionStart,
  input.selectionEnd,
];

/** Resolves with the input's value in the first animation frame after its next focus event. */
function firstFrameAfterFocus(input: HTMLInputElement): Promise<string> {
  return new Promise((resolve) => {
    input.addEventListener(
      'focus',
      () => {
        requestAnimationFrame(() => resolve(input.value));
      },
      { once: true }
    );
  });
}

describe('INV-24: focus swaps grouped for plain in the focus commit', () => {
  it('element.focus(): the text is plain one microtask after focus() returns, and in the first frame', async () => {
    const m = mount({ formProps: seeded('1234567.89') });
    expect(m.input.value).toBe('1,234,567.89');
    const frame = firstFrameAfterFocus(m.input);
    m.input.focus();
    await commit();
    expect(m.input.value).toBe('1234567.89'); // one microtask: no timer, no later task
    expect(await frame).toBe('1234567.89');
    expect(m.handle.writes).toEqual([]);
    expect(m.api().formState.isDirty).toBe(false);
    expect(m.api().formState.touchedFields).toEqual({});
  });

  it.each([
    [
      'Tab',
      async (m: Mounted) => {
        m.before.focus();
        await userEvent.tab();
      },
    ],
    ['a click', async (m: Mounted) => userEvent.click(m.input)],
    [
      'react-hook-form setFocus',
      async (m: Mounted) => {
        act(() => m.api().setFocus('amount'));
      },
    ],
  ] as const)(
    '%s: the first frame after the focus event shows the plain text',
    async (_label, go) => {
      const m = mount({ formProps: seeded('1234567.89') });
      const frame = firstFrameAfterFocus(m.input);
      await go(m);
      expect(await frame).toBe('1234567.89');
      expect(document.activeElement).toBe(m.input);
      expect(m.handle.writes).toEqual([]);
    }
  );

  it('a keystroke right after Tab is applied to the plain text, never to the grouped one', async () => {
    const m = mount({ formProps: seeded('250000') });
    m.before.focus();
    await userEvent.tab();
    await userEvent.keyboard('{End}1');
    expect(m.input.value).toBe('2500001');
    expect(m.api().getValues('amount')).toBe('2500001');
  });
});

describe('INV-25: after a keyboard or programmatic focus the selection is the browser’s own, mapped', () => {
  it('Tab into 1,234,567.89 selects the whole plain text (0 to 10); typing 5 replaces the amount', async () => {
    const m = mount({ formProps: seeded('1234567.89') });
    m.before.focus();
    await userEvent.tab();
    expect(m.input.value).toBe('1234567.89');
    expect(selection(m.input)).toEqual([0, 10]);
    await userEvent.keyboard('5');
    expect(m.input.value).toBe('5');
    expect(m.api().getValues('amount')).toBe('5');
  });

  it('Shift+Tab into the field selects the whole plain text too', async () => {
    const m = mount({ formProps: seeded('250000') });
    m.after.focus();
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(m.input);
    expect(m.input.value).toBe('250000');
    expect(selection(m.input)).toEqual([0, 6]);
    await userEvent.keyboard('300000');
    expect(m.input.value).toBe('300000');
  });

  it('element.focus() and setFocus on an unedited field leave the caret at the end of the plain text', async () => {
    const m = mount({ formProps: seeded('1234567.89') });
    m.input.focus();
    await commit();
    expect(selection(m.input)).toEqual([10, 10]);
    m.after.focus();
    await commit();
    const frame = firstFrameAfterFocus(m.input);
    act(() => m.api().setFocus('amount'));
    await frame;
    expect(selection(m.input)).toEqual([10, 10]);
  });

  it('a selection made on the grouped text by script maps onto the same digits', async () => {
    const m = mount({ formProps: seeded('1234567.89') });
    // '1,234,567.89': select "234,5" (offsets 2 to 7) before focusing.
    m.input.setSelectionRange(2, 7);
    m.input.focus();
    await commit();
    expect(selection(m.input)).toEqual([
      toPlainOffset('1,234,567.89', 2),
      toPlainOffset('1,234,567.89', 7),
    ]);
    expect(m.input.value.slice(1, 5)).toBe('2345');
    expect(selection(m.input)).toEqual([1, 5]);
  });

  it('the kit calls setSelectionRange once per swap, and not on mount, in read-only, or with no commas shown', async () => {
    const spy = vi.spyOn(HTMLInputElement.prototype, 'setSelectionRange');
    const m = mount({ formProps: seeded('1234567.89') });
    expect(spy).not.toHaveBeenCalled();
    m.before.focus();
    await userEvent.tab();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(0, 10);
    await userEvent.tab();
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    expect(spy).toHaveBeenCalledTimes(2);
    cleanup();
    spy.mockClear();

    const small = mount({ formProps: seeded('999') });
    small.before.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(small.input);
    expect(selection(small.input)).toEqual([0, 3]); // the browser's own selection
    expect(spy).not.toHaveBeenCalled();
    cleanup();

    const ro = mount({ options: READONLY, formProps: seeded('1234567.89') });
    ro.before.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(ro.input);
    expect(spy).not.toHaveBeenCalled();
  });

  it('failure case: focus followed at once by a scripted blur sets no selection and never pulls focus back', async () => {
    const spy = vi.spyOn(HTMLInputElement.prototype, 'setSelectionRange');
    const m = mount({ formProps: seeded('1234567.89') });
    m.input.addEventListener('focus', () => m.after.focus(), { once: true });
    m.input.focus();
    await commit();
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    expect(document.activeElement).toBe(m.after);
    expect(spy).not.toHaveBeenCalled();
    expect(m.input.value).toBe('1,234,567.89');
    expect(m.handle.writes).toEqual([]);
  });

  it('failure case: a pending selection is never applied after the user has typed', async () => {
    const spy = vi.spyOn(HTMLInputElement.prototype, 'setSelectionRange');
    const m = mount({ formProps: seeded('1234567.89') });
    m.before.focus();
    await userEvent.tab();
    await userEvent.keyboard('{End}7');
    expect(m.input.value).toBe('1234567.897');
    expect(selection(m.input)).toEqual([11, 11]);
    m.set({});
    m.set({});
    expect(spy).toHaveBeenCalledTimes(1);
    expect(selection(m.input)).toEqual([11, 11]);
  });
});

describe('INV-26: a mouse click puts the caret near the pointer, within the commas to its left', () => {
  /**
   * `o`: the offset a plain input holding the grouped text reports for a click at `x`.
   * `c`: where the grouped field's caret lands for a click at the same `x`.
   */
  async function clickBoth(
    text: string,
    fraction: number
  ): Promise<{ o: number; c: number; shown: string }> {
    const reference = mount({ options: PLAIN_EXACT, formProps: seeded(refGroupedText(text)) });
    const rect = reference.input.getBoundingClientRect();
    // A fresh object per click: the runner rescales the one it is given, in place.
    const at = (): { x: number; y: number } => ({
      x: Math.round(rect.width * fraction),
      y: Math.round(rect.height / 2),
    });
    await userEvent.click(reference.input, { position: at() });
    const o = reference.input.selectionStart ?? -1;
    expect(reference.input.value).toBe(refGroupedText(text));
    cleanup();

    const m = mount({ formProps: seeded(text) });
    expect(m.input.getBoundingClientRect().width).toBe(rect.width);
    await userEvent.click(m.input, { position: at() });
    expect(document.activeElement).toBe(m.input);
    expect(selection(m.input)[0]).toBe(selection(m.input)[1]); // collapsed
    const result = { o, c: m.input.selectionStart ?? -1, shown: m.input.value };
    expect(m.handle.writes).toEqual([]);
    expect(m.api().formState.isDirty).toBe(false);
    cleanup();
    return result;
  }

  const TEXTS = ['1234567.89', '999999999999999999.999999999999999999', '250000.00'];
  const refGroupedText = (plain: string): string => {
    const [int = '', frac] = plain.split('.');
    const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return frac === undefined ? grouped : `${grouped}.${frac}`;
  };

  it.each(TEXTS)(
    '%s: clicks across the text land inside the bound, and mid-text clicks are not sent to the end',
    async (text) => {
      const display = refGroupedText(text);
      // Where the text ends, as a fraction of the input's width (measured, not assumed).
      const probe = mount({ options: PLAIN_EXACT, formProps: seeded(display) });
      const canvas = document.createElement('canvas').getContext('2d');
      if (!canvas) throw new Error('no 2d context');
      const style = getComputedStyle(probe.input);
      canvas.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const textWidth = canvas.measureText(display).width;
      const inputRect = probe.input.getBoundingClientRect();
      const probeInnerWidth = probe.input.clientWidth;
      const padLeft =
        Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.borderLeftWidth);
      cleanup();

      // Click only where both texts are on screen: a long amount overflows the input.
      const span = Math.min(textWidth, probeInnerWidth - 2 * padLeft);
      const measured: { o: number; c: number }[] = [];
      for (const part of [0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9]) {
        const fraction = (padLeft + span * part) / inputRect.width;
        const { o, c, shown } = await clickBoth(text, fraction);
        expect(shown).toBe(text);
        measured.push({ o, c });
        expect(c, `part ${part}: o=${o}`).toBeGreaterThanOrEqual(toPlainOffset(display, o));
        expect(c, `part ${part}: o=${o}`).toBeLessThanOrEqual(Math.min(o, text.length));
        // The plain text is shorter, so a click near the end of the grouped text may be
        // past its last character. Up to 60% across it never is.
        if (part <= 0.6) {
          expect(c, `part ${part}: a mid-text click must not jump to the end`).toBeLessThan(
            text.length
          );
        }
        expect(c, `part ${part}: a mid-text click must not jump to the start`).toBeGreaterThan(0);
      }
      // The caret follows the pointer: further right never lands further left.
      for (let i = 1; i < measured.length; i += 1) {
        expect(measured[i]?.c).toBeGreaterThanOrEqual(measured[i - 1]?.c ?? 0);
      }
      expect(new Set(measured.map((p) => p.c)).size).toBeGreaterThanOrEqual(4);
    }
  );

  it('boundary: a click before the first character gives 0, a click past the last gives the text length', async () => {
    const m = mount({ formProps: seeded('1234567.89') });
    const rect = m.input.getBoundingClientRect();
    await userEvent.click(m.input, { position: { x: 1, y: Math.round(rect.height / 2) } });
    expect(m.input.value).toBe('1234567.89');
    expect(selection(m.input)).toEqual([0, 0]);
    m.after.focus();
    await commit();
    expect(m.input.value).toBe('1,234,567.89');
    await userEvent.click(m.input, {
      position: { x: m.input.clientWidth - 2, y: Math.round(rect.height / 2) },
    });
    expect(m.input.value).toBe('1234567.89');
    expect(selection(m.input)).toEqual([10, 10]);
  });

  it('the caret is where the browser put it for the pointer, not a remembered selection', async () => {
    const m = mount({ formProps: seeded('1234567.89') });
    // A stale selection on the grouped text; the click must win over it.
    m.input.setSelectionRange(0, 12);
    const rect = m.input.getBoundingClientRect();
    await userEvent.click(m.input, { position: { x: 1, y: Math.round(rect.height / 2) } });
    expect(selection(m.input)).toEqual([0, 0]);
  });

  it('failure case: the next keystroke after a mid-text click edits at the caret, not at the end', async () => {
    const { c } = await clickBoth('1234567.89', 0.05);
    const m = mount({ formProps: seeded('1234567.89') });
    const rect = m.input.getBoundingClientRect();
    await userEvent.click(m.input, {
      position: { x: Math.round(rect.width * 0.05), y: Math.round(rect.height / 2) },
    });
    const at = m.input.selectionStart ?? -1;
    expect(at).toBe(c);
    await userEvent.keyboard('0');
    expect(m.input.value).toBe(`${'1234567.89'.slice(0, at)}0${'1234567.89'.slice(at)}`);
    expect(m.input.selectionStart).toBe(at + 1);
  });
});

describe('INV-27: a real blur shows the grouped form and leaves the value alone', () => {
  it('type 250000, Tab: 250,000 on screen and 250000 in the form; Shift+Tab: 250000 selected; type 5: the amount is 5', async () => {
    const m = mount({ formProps: seeded('') });
    await userEvent.click(m.input);
    await userEvent.keyboard('250000');
    expect(m.input.value).toBe('250000');
    await userEvent.tab();
    expect(document.activeElement).toBe(m.after);
    expect(m.input.value).toBe('250,000');
    expect(m.api().getValues('amount')).toBe('250000');
    expect(m.api().formState.touchedFields.amount).toBe(true);
    await userEvent.tab({ shift: true });
    expect(m.input.value).toBe('250000');
    expect(selection(m.input)).toEqual([0, 6]);
    await userEvent.keyboard('5');
    expect(m.input.value).toBe('5');
    expect(m.handle.changeWrites).toEqual(['2', '25', '250', '2500', '25000', '250000', '5']);
  });

  it('typed 1,000 stays 1,000 after blur and is 1000 on the next focus; invalid text is left as typed', async () => {
    const m = mount({ formProps: seeded('') });
    await userEvent.click(m.input);
    await userEvent.keyboard('1,000');
    await userEvent.tab();
    expect(m.input.value).toBe('1,000');
    await userEvent.tab({ shift: true });
    expect(m.input.value).toBe('1000');
    await userEvent.keyboard('25,00,000');
    await userEvent.tab();
    expect(m.input.value).toBe('25,00,000');
    expect(m.api().getValues('amount')).toBe('25,00,000');
  });
});

describe('INV-28: a window blur changes nothing but touched', () => {
  /** What the browser sends the field when the window loses focus: blur with the field still active. */
  function windowBlur(input: HTMLInputElement): void {
    input.dispatchEvent(new FocusEvent('blur'));
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  }

  it('text and selection are kept, and the next keystroke replaces what was selected', async () => {
    const m = mount({ formProps: seeded('250000') });
    m.before.focus();
    await userEvent.tab();
    expect(selection(m.input)).toEqual([0, 6]);
    act(() => windowBlur(m.input));
    expect(document.activeElement).toBe(m.input);
    expect(m.input.value).toBe('250000');
    expect(selection(m.input)).toEqual([0, 6]);
    expect(m.api().formState.touchedFields.amount).toBe(true);
    expect(m.handle.writes).toEqual([]);
    // Back in the window: typing (or a paste) replaces the selection, it does not append.
    await userEvent.keyboard('300000');
    expect(m.input.value).toBe('300000');
    expect(m.api().getValues('amount')).toBe('300000');
  });

  it('text inserted after a window blur, as a paste is, replaces the selected amount', async () => {
    const m = mount({ formProps: seeded('') });
    await userEvent.click(m.input);
    await userEvent.keyboard('250000');
    await userEvent.keyboard(MOD('a'));
    expect(selection(m.input)).toEqual([0, 6]);
    act(() => windowBlur(m.input));
    expect(m.input.value).toBe('250000');
    expect(selection(m.input)).toEqual([0, 6]);
    // The browser's own insert-at-selection, which is what a paste does. The system
    // clipboard is not used: test files running in parallel share it.
    document.execCommand('insertText', false, '300000');
    await commit();
    // Replaced, not appended: never 250000300000.
    expect(m.input.value).toBe('300000');
    expect(m.api().getValues('amount')).toBe('300000');
  });

  it('failure case: a blur that moves focus does regroup', async () => {
    const m = mount({ formProps: seeded('250000') });
    await userEvent.click(m.input);
    await userEvent.click(m.after);
    expect(m.input.value).toBe('250,000');
  });
});

describe('INV-36: the field is fully operable from the keyboard and traps nothing', () => {
  it('Tab walks Before, the field, After, Submit, and back; the field never pulls focus back', async () => {
    const m = mount({ formProps: seeded('1234567.89') });
    m.before.focus();
    const order: (string | null)[] = [];
    for (let i = 0; i < 3; i += 1) {
      await userEvent.tab();
      order.push(document.activeElement?.textContent || document.activeElement?.id || null);
    }
    expect(order).toEqual(['amount', 'After', 'Submit']);
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    expect(document.activeElement?.textContent).toBe('Submit');
    await userEvent.tab({ shift: true });
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(m.input);
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(m.before);
    expect(m.input.value).toBe('1,234,567.89');
  });

  it('Home, End, arrows and Shift+arrow work on the plain text while focused; none of them writes', async () => {
    const m = mount({ formProps: seeded('1234567.89') });
    m.before.focus();
    await userEvent.tab();
    await userEvent.keyboard('{Home}');
    expect(selection(m.input)).toEqual([0, 0]);
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(selection(m.input)).toEqual([2, 2]);
    await userEvent.keyboard('{End}{ArrowLeft}');
    expect(selection(m.input)).toEqual([9, 9]);
    await userEvent.keyboard('{Shift>}{ArrowLeft}{ArrowLeft}{/Shift}');
    expect(selection(m.input)).toEqual([7, 9]);
    await userEvent.keyboard('{ArrowUp}{ArrowDown}');
    expect(m.input.value).toBe('1234567.89');
    expect(m.handle.writes).toEqual([]);
  });

  it('Enter submits the form natively with the plain value', async () => {
    const m = mount({ formProps: seeded('') });
    await userEvent.click(m.input);
    await userEvent.keyboard('1,234,567.5{Enter}');
    await expect.poll(() => m.handle.validCalls.length).toBe(1);
    expect(m.handle.validCalls[0]?.amount).toBe('1234567.5');
  });

  it('Escape clears a non-empty field and blurs an empty one, which then shows the unfocused form', async () => {
    const m = mount({ formProps: seeded('1234567.89') });
    await userEvent.click(m.input);
    await userEvent.keyboard('{Escape}');
    expect(m.input.value).toBe('');
    expect(document.activeElement).toBe(m.input);
    expect(m.api().getValues('amount')).toBe('');
    await userEvent.keyboard('{Escape}');
    expect(document.activeElement).not.toBe(m.input);
    expect(m.api().formState.touchedFields.amount).toBe(true);
  });

  it('a read-only grouped field stays in the tab order, selects natively and copies the grouped text', async () => {
    const m = mount({ options: READONLY, formProps: seeded('1250000.50') });
    m.before.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(m.input);
    expect(m.input.value).toBe('1,250,000.50');
    expect(selection(m.input)).toEqual([0, 12]);
    expect(m.input.value.slice(0, 12)).toBe('1,250,000.50');
    await userEvent.tab();
    expect(document.activeElement).toBe(m.after);
  });
});

describe('INV-21: read-only and disabled fields take no input and are never written', () => {
  it.each([
    ['focusable read-only, plain seed', READONLY, '1250000.50', '1,250,000.50'],
    ['focusable read-only, grouped seed', READONLY, '250,000.00', '250,000.00'],
    ['disabled, plain seed', DISABLED, '1250000.50', '1,250,000.50'],
    ['disabled, grouped seed', DISABLED, '250,000.00', '250,000.00'],
  ])(
    '%s: click, type, paste and Escape leave the text and the form untouched',
    async (label, options, seed, shown) => {
      const m = mount({ options, formProps: seeded(seed) });
      await userEvent.click(m.input, { force: true }).catch(() => undefined);
      await userEvent.keyboard('9{Backspace}{Delete}');
      await userEvent.keyboard(MOD('a'));
      await userEvent.keyboard(MOD('v'));
      await userEvent.keyboard('{Escape}');
      expect(m.input.value).toBe(shown);
      expect(m.api().getValues('amount')).toBe(seed);
      expect(m.handle.writes).toEqual([]);
      expect(m.api().formState.isDirty).toBe(false);
      expect(document.activeElement === m.input).toBe(label.startsWith('focusable'));
    }
  );

  it('Tab skips a disabled grouped field', async () => {
    const m = mount({ options: DISABLED, formProps: seeded('1250000.50') });
    m.before.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(m.after);
    expect(m.input.value).toBe('1,250,000.50');
  });

  it('sensitivity: the same keys do edit an editable grouped field', async () => {
    const m = mount({ formProps: seeded('1250000.50') });
    await userEvent.click(m.input);
    await userEvent.keyboard('{End}9');
    expect(m.api().getValues('amount')).toBe('1250000.509');
  });
});

describe('INV-15: a field disabled while focused does not stay in the plain form', () => {
  it('disabled while focused, then re-enabled: the field shows grouped, takes no stray keys, and the next Tab in shows plain', async () => {
    const m = mount({ formProps: seeded('') });
    await userEvent.click(m.input);
    await userEvent.keyboard('1,000');
    expect(m.input.value).toBe('1,000');
    m.set({ options: DISABLED });
    expect(m.input.disabled).toBe(true);
    expect(m.input.value).toBe('1,000'); // the grouped form of 1000
    m.set({ options: GROUPED });
    expect(m.input.disabled).toBe(false);
    expect(m.input.value).toBe('1,000');
    // The field looks unfocused, so a key pressed now must not land in its grouped text.
    await userEvent.keyboard('5');
    expect(m.input.value).toBe('1,000');
    expect(m.api().getValues('amount')).toBe('1000');
    m.before.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(m.input);
    expect(m.input.value).toBe('1000');
    expect(selection(m.input)).toEqual([0, 4]);
    expect(m.handle.changeWrites).toEqual(['1', '1,', '1,0', '1,00', '1000']);
  });
});

describe('INV-23: real typing is kept whole and the caret stays where the user put it', () => {
  it('typing mid-string in a focused field advances the caret by one and inserts no comma', async () => {
    const m = mount({ formProps: seeded('') });
    await userEvent.click(m.input);
    await userEvent.keyboard('12345.67');
    expect(m.input.value).toBe('12345.67');
    m.input.setSelectionRange(3, 3);
    await userEvent.keyboard('9');
    expect(m.input.value).toBe('123945.67');
    expect(selection(m.input)).toEqual([4, 4]);
    await userEvent.keyboard('{Backspace}');
    expect(m.input.value).toBe('12345.67');
    expect(selection(m.input)).toEqual([3, 3]);
    expect(m.api().getValues('amount')).toBe('12345.67');
  });

  it('each real keystroke is one write; typed commas are kept on screen while focused', async () => {
    const m = mount({ formProps: seeded('') });
    await userEvent.click(m.input);
    await userEvent.keyboard('1,234,5');
    expect(m.input.value).toBe('1,234,5');
    expect(m.handle.changeWrites).toEqual(['1', '1,', '1,2', '1,23', '1234', '1,234,', '1,234,5']);
  });

  it.each([
    '12,345,678,901,234,567.123456789012345678',
    '9007199254740993',
    '0.1234567890123456789',
    '-.5',
  ])(
    'precision-hostile %s typed with a real keyboard: plain in the form, grouped by the reference after blur',
    async (text) => {
      const m = mount({ formProps: seeded('') });
      await userEvent.click(m.input);
      await userEvent.keyboard(text);
      expect(m.input.value).toBe(text);
      await userEvent.tab();
      const plain = strip(text);
      expect(m.api().getValues('amount')).toBe(plain);
      expect(strip(m.input.value)).toBe(plain);
      await userEvent.tab({ shift: true });
      expect(m.input.value).toBe(plain);
    }
  );
});

describe('INV-32: blur of a field holding a very long text stays within a frame of scripting', () => {
  it('100,000 digits: focus, blur and refocus each take well under 100 ms, and every digit survives', async () => {
    const digits = '7'.repeat(100_000);
    const m = mount({ formProps: seeded(digits) });
    const timed = async (action: () => void): Promise<number> => {
      const start = performance.now();
      action();
      await commit();
      return performance.now() - start;
    };
    const focusMs = await timed(() => m.input.focus());
    expect(m.input.value).toBe(digits);
    const blurMs = await timed(() => m.after.focus());
    expect(m.input.value.length).toBe(100_000 + 33_333);
    expect(strip(m.input.value)).toBe(digits);
    const refocusMs = await timed(() => m.input.focus());
    expect(m.input.value).toBe(digits);
    expect(m.input.maxLength).toBe(-1);
    for (const ms of [focusMs, blurMs, refocusMs]) expect(ms).toBeLessThan(100);
  });
});

describe('INV-34: axe reports nothing the plain exact input does not have', () => {
  async function violations(
    options: AmountFieldOptions,
    drive?: (m: Mounted) => Promise<void>
  ): Promise<string[]> {
    const m = mount({
      options: { ...options, helperText: 'Up to 18 decimals', validation: { required: true } },
      formProps: seeded('1234567.89'),
    });
    await drive?.(m);
    const form = m.input.form;
    if (!form) throw new Error('form missing');
    const results = await axe.run(form);
    cleanup();
    return results.violations.map((v) => v.id).sort();
  }

  const invalid = async (m: Mounted): Promise<void> => {
    await userEvent.click(m.input);
    await userEvent.keyboard('{End}e5{Enter}');
    await expect.poll(() => document.querySelectorAll('[role="alert"]').length).toBe(1);
  };
  const focused = async (m: Mounted): Promise<void> => userEvent.click(m.input);

  it.each([
    ['pristine and unfocused', GROUPED, PLAIN_EXACT, undefined],
    ['focused', GROUPED, PLAIN_EXACT, focused],
    ['invalid after submit', GROUPED, PLAIN_EXACT, invalid],
    [
      'focusable read-only',
      READONLY,
      { ...READONLY, groupedDisplay: false } as AmountFieldOptions,
      undefined,
    ],
    ['disabled', DISABLED, { ...DISABLED, groupedDisplay: false } as AmountFieldOptions, undefined],
  ] as const)(
    '%s: the same violation kinds as the plain exact input',
    async (_label, grouped, plain, drive) => {
      const got = await violations(grouped, drive);
      expect(got).toEqual(await violations(plain, drive));
    }
  );

  it('the swap is silent: focus and blur add no alert or live region', async () => {
    const m = mount({ formProps: seeded('1234567.89') });
    const live = (): number =>
      document.querySelectorAll('[role="alert"], [role="status"], [aria-live]').length;
    const before = live();
    await userEvent.click(m.input);
    expect(live()).toBe(before);
    await userEvent.tab();
    expect(live()).toBe(before);
    expect(m.input.getAttribute('aria-invalid')).not.toBe('true');
  });
});
