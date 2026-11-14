/**
 * 007 SF-3 · AmountField with `groupedDisplay`: state and interaction (jsdom). The
 * display/value equation under random sequences (INV-5, with INV-4 and INV-16 checked
 * at every step), local state (INV-15), edits (INV-23), focus (INV-24), real and window
 * blur (INV-27, INV-28), values from outside (INV-29), Escape (INV-30) and cost per
 * event (INV-31). Each `describe` starts with the INV id it verifies. Real Tab, pointer,
 * selection and paste are in the Chromium suite.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FieldValues, Mode, UseFormProps, UseFormReturn } from 'react-hook-form';

import { isEmptyAmountValue, toAmountDisplayText } from '../utils/decimalValidation';
import {
  createRng,
  pick,
  SC003_INVALID_CASES,
  SC003_OVER_LIMIT_CASES,
  SC003_VALID_CASES,
  type AmountFieldOptions,
} from './amount-exact.sf10-kit';
import {
  DirectGroupedInput,
  GroupedHarness,
  type GroupedHarnessProps,
} from './amount-grouped.sf3-harness';
import {
  createDirectSpies,
  createGroupedHandle,
  REF_GROUPED,
  refCanonical,
  refGroup,
  refShownUnfocused,
  strip,
  takeCommaLeaks,
  type DirectSpies,
  type GroupedHandle,
} from './amount-grouped.sf3-kit';

// Seeded property loops and corpus sweeps: generous on a loaded machine, still bounded.
vi.setConfig({ testTimeout: 60_000 });

const GROUPED: AmountFieldOptions = {
  label: 'Amount',
  formatOnBlur: false,
  decimals: 18,
  allowGrouping: true,
  groupedDisplay: true,
};
const READONLY: AmountFieldOptions = { ...GROUPED, readOnly: true, readOnlyMode: 'readonly' };
const DISABLED: AmountFieldOptions = { ...GROUPED, readOnly: true };
const STRICT = [false, true] as const;

let consoleError: ReturnType<typeof vi.spyOn>;
let consoleWarn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  expect(takeCommaLeaks()).toEqual([]);
  // No "Maximum update depth", "flushSync", unknown-prop or act warning in any test.
  expect(consoleError.mock.calls).toEqual([]);
  expect(consoleWarn.mock.calls).toEqual([]);
  vi.restoreAllMocks();
});

type MountProps = Partial<Omit<GroupedHarnessProps, 'handle'>>;

interface Mounted {
  readonly handle: GroupedHandle;
  readonly api: () => UseFormReturn<FieldValues>;
  readonly input: () => HTMLInputElement;
  readonly set: (patch: MountProps) => void;
  readonly submit: () => Promise<void>;
}

async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function mount(initial: MountProps = {}): Mounted {
  const handle = createGroupedHandle();
  let props: MountProps = initial;
  const element = (): React.ReactElement => (
    <GroupedHarness handle={handle} options={GROUPED} {...props} />
  );
  const view = render(element());
  const input = (): HTMLInputElement => screen.getByRole('textbox') as HTMLInputElement;
  return {
    handle,
    api: () => {
      if (!handle.api) throw new Error('form api missing');
      return handle.api;
    },
    input,
    set: (patch) => {
      props = { ...props, ...patch };
      view.rerender(element());
    },
    submit: async () => {
      const form = input().form;
      if (!form) throw new Error('form missing');
      fireEvent.submit(form);
      await settle();
    },
  };
}

const seeded = (amount: unknown, mode: Mode = 'onSubmit'): UseFormProps<FieldValues> => ({
  defaultValues: { amount },
  mode,
});
const focus = (el: HTMLElement): void => act(() => el.focus());
const focusElsewhere = (): void => act(() => screen.getByRole('button', { name: 'After' }).focus());
const type = (input: HTMLInputElement, value: string): void => {
  fireEvent.change(input, { target: { value } });
};

function mountDirect(
  initial: unknown,
  props: { strict?: boolean; readOnly?: boolean; readOnlyMode?: 'readonly' | 'disabled' } = {}
): {
  spies: DirectSpies;
  input: () => HTMLInputElement;
  set: (patch: Partial<typeof props> & { inputKey?: number }) => void;
  elsewhere: () => void;
} {
  const spies = createDirectSpies();
  let current: typeof props & { inputKey?: number } = props;
  const element = (): React.ReactElement => (
    <DirectGroupedInput spies={spies} initial={initial} {...current} />
  );
  const view = render(element());
  return {
    spies,
    input: () => screen.getByRole('textbox') as HTMLInputElement,
    set: (patch) => {
      current = { ...current, ...patch };
      view.rerender(element());
    },
    elsewhere: () => act(() => screen.getByRole('button', { name: 'Elsewhere' }).focus()),
  };
}

// ---------------------------------------------------------------------------
// INV-5 model
// ---------------------------------------------------------------------------

const PLAIN_POOL = [
  '0',
  '999',
  '1000',
  '250000.00',
  '1234567.89',
  '-1234.5',
  '000123.450',
  '.5',
  '5.',
  '100000000000000000000',
];
const GROUPED_POOL = [
  '1,000',
  '250,000.00',
  '-12,345.678',
  '1,000.',
  '999,999,999,999,999,999.999999999999999999',
];
const INVALID_POOL = ['25,00,000', '1e18', ' 1,000 ', '1..2', '12abc', '-', '0,123', '1,000,'];
const OUTSIDE_POOL: readonly unknown[] = [
  ...PLAIN_POOL,
  ...GROUPED_POOL,
  ...INVALID_POOL,
  '',
  null,
  // `undefined` is left out: react-hook-form reads it as "use the default value", so the
  // field would be handed the default, not the value written. INV-4's table covers it as a seed.
  1234567.5,
  -1234,
  0,
  1e21,
  Number.NaN,
  123456789012345678901234567890n,
  0n,
];
const TYPED_POOL = [...PLAIN_POOL, ...GROUPED_POOL, ...INVALID_POOL, '', '1,2', '12,345,678'];

type Lock = 'editable' | 'readonly' | 'disabled';
const LOCK_OPTIONS: Record<Lock, AmountFieldOptions> = {
  editable: GROUPED,
  readonly: READONLY,
  disabled: DISABLED,
};

interface Model {
  values: Record<string, unknown>;
  name: 'amount' | 'other';
  text: string;
  /** The last value the field wrote or adopted. A value equal to it is not adopted again. */
  seen: unknown;
  focused: boolean;
  lock: Lock;
}

const STEPS = [
  'type',
  'type',
  'escape',
  'focus',
  'focus',
  'blur',
  'windowBlur',
  'setValue',
  'reset',
  'lock',
  'rerender',
  'remount',
  'rename',
] as const;
type Step = (typeof STEPS)[number];

const describeValue = (v: unknown): string =>
  typeof v === 'bigint' ? `${v}n` : typeof v === 'number' ? String(v) : JSON.stringify(v);

/** One random sequence against a fresh mount. Throws with the seed and the trace on a mismatch. */
function runSequence(seed: number, strict: boolean, steps: number): number {
  const rng = createRng(seed);
  const first = pick(rng, OUTSIDE_POOL);
  const second = pick(rng, OUTSIDE_POOL);
  const model: Model = {
    values: { amount: first, other: second },
    name: 'amount',
    text: refCanonical(toAmountDisplayText(first)),
    seen: first,
    focused: false,
    lock: rng() < 0.75 ? 'editable' : rng() < 0.5 ? 'readonly' : 'disabled',
  };
  const m = mount({
    options: LOCK_OPTIONS[model.lock],
    formProps: { defaultValues: { amount: first, other: second } },
    strict,
  });
  let fieldKey = 0;
  const trace: string[] = [
    `mount ${model.lock} ${describeValue(first)} / ${describeValue(second)}`,
  ];

  // Adoption is keyed on the value: one that equals the last value the field wrote or
  // adopted leaves the text in progress alone, whichever path it came from.
  const adopt = (force = false): void => {
    const value = model.values[model.name];
    if (!force && Object.is(value, model.seen)) return;
    model.text = refCanonical(toAmountDisplayText(value));
    model.seen = value;
  };
  const normalise = (): void => {
    const v = model.values[model.name];
    if (model.lock === 'editable' && typeof v === 'string' && REF_GROUPED.test(v)) {
      model.values[model.name] = strip(v);
      adopt();
    }
  };
  const check = (): void => {
    normalise();
    const input = m.input();
    const shown = input.value;
    const value: unknown = m.api().getValues(model.name);
    const expected = model.values[model.name];
    const showPlain = model.focused && model.lock === 'editable';
    const where = `seed ${seed}, strict ${strict}\n  ${trace.join('\n  ')}`;

    // The model and the form agree on the value (its type included).
    expect(
      Object.is(value, expected),
      `form value ${describeValue(value)} != model ${describeValue(expected)}\n${where}`
    ).toBe(true);
    // INV-4: one of two forms of the same text, never a third.
    expect(shown, `INV-4 shown form\n${where}`).toBe(
      showPlain ? model.text : refGroup(refCanonical(model.text))
    );
    // INV-5: the amount on screen and the form value are the same digits.
    const display = toAmountDisplayText(value);
    expect(refCanonical(shown), `INV-5 equation\n${where}`).toBe(refCanonical(display));
    if (model.lock === 'editable' && typeof value === 'string') {
      expect(value, `INV-5 (1) editable string value\n${where}`).toBe(refCanonical(shown));
    }
    if (model.lock !== 'editable') {
      expect(shown, `INV-5 (2) read-only or disabled\n${where}`).toBe(
        refGroup(refCanonical(display))
      );
    }
    if (typeof value === 'number' || typeof value === 'bigint') {
      expect(strip(shown), `INV-5 (3) number or bigint\n${where}`).toBe(display);
    }
    // The other path is never touched by this field.
    const otherName = model.name === 'amount' ? 'other' : 'amount';
    expect(
      Object.is(m.api().getValues(otherName), model.values[otherName]),
      `other path changed\n${where}`
    ).toBe(true);
    // INV-16: every write is a string that is not validly grouped.
    for (const write of m.handle.writes) {
      expect(
        typeof write.value === 'string' && !REF_GROUPED.test(write.value),
        `INV-16 write ${describeValue(write.value)}\n${where}`
      ).toBe(true);
    }
  };

  check();
  for (let i = 0; i < steps; i += 1) {
    const step: Step = pick(rng, STEPS);
    const input = m.input();
    switch (step) {
      case 'type': {
        if (model.lock !== 'editable') break;
        const text = pick(rng, TYPED_POOL);
        if (text === input.value) break; // no input event without a change
        trace.push(`${model.focused ? 'type' : 'input while unfocused'} ${JSON.stringify(text)}`);
        type(input, text);
        model.text = model.focused ? text : refCanonical(text);
        model.values[model.name] = refCanonical(text);
        model.seen = refCanonical(text);
        break;
      }
      case 'escape': {
        // Key events reach only a focused, enabled control.
        if (!model.focused || model.lock === 'disabled') break;
        trace.push('Escape');
        fireEvent.keyDown(input, { key: 'Escape' });
        if (model.lock === 'readonly') break;
        if (model.text !== '' || !isEmptyAmountValue(model.values[model.name])) {
          model.text = '';
          model.values[model.name] = '';
          model.seen = '';
        } else {
          model.focused = false;
        }
        break;
      }
      case 'focus': {
        if (model.lock === 'disabled') break;
        trace.push(rng() < 0.5 ? 'focus()' : 'focus() again');
        focus(input);
        model.focused = true;
        break;
      }
      case 'blur': {
        trace.push('real blur');
        focusElsewhere();
        if (model.focused) {
          model.focused = false;
          model.text = refCanonical(model.text);
        }
        break;
      }
      case 'windowBlur': {
        if (document.activeElement !== input) break;
        trace.push('window blur');
        fireEvent.blur(input);
        break;
      }
      case 'setValue':
      case 'reset': {
        const next = pick(rng, OUTSIDE_POOL);
        trace.push(`${step} ${describeValue(next)}`);
        model.values[model.name] = next;
        if (step === 'setValue') act(() => m.api().setValue(model.name, next));
        else act(() => m.api().reset({ ...model.values }));
        adopt();
        break;
      }
      case 'lock': {
        const next = pick(rng, ['editable', 'editable', 'readonly', 'disabled'] as const);
        if (next === model.lock) break;
        trace.push(`lock ${model.lock} -> ${next}`);
        model.lock = next;
        m.set({ options: LOCK_OPTIONS[next] });
        // A browser drops focus from a control that becomes disabled, with no blur
        // event; jsdom keeps it as the active element, so move focus away by hand.
        if (next === 'disabled' && document.activeElement === m.input()) focusElsewhere();
        if (next === 'disabled' && model.focused) {
          model.focused = false;
          model.text = refCanonical(model.text);
        }
        break;
      }
      case 'rerender': {
        trace.push('parent rerender');
        m.set({});
        break;
      }
      case 'remount': {
        trace.push('unmount and remount the field');
        fieldKey += 1;
        m.set({ fieldKey });
        model.focused = false;
        adopt(true);
        break;
      }
      case 'rename': {
        model.name = model.name === 'amount' ? 'other' : 'amount';
        trace.push(`name -> ${model.name}`);
        m.set({ name: model.name });
        adopt();
        break;
      }
    }
    check();
  }
  const writes = m.handle.writes.length;
  cleanup();
  return writes;
}

describe('INV-5: the amount on screen and the form value are the same digits at every commit', () => {
  it.each(STRICT)(
    'model-based (seeds 0x5f3c00 + n), StrictMode %s: 1,000 random sequences of 12 steps hold the equation after every step',
    (strict) => {
      let writes = 0;
      for (let n = 0; n < 1_000; n += 1) {
        writes += runSequence(0x5f3c00 + n + (strict ? 100_000 : 0), strict, 12);
      }
      // The sequences did reach the write paths.
      expect(writes).toBeGreaterThan(1_500);
    },
    240_000
  );

  it('named (the violation scenario): after a reset to 5000 the unfocused field shows 5,000, not the old text', () => {
    const m = mount({ formProps: seeded('50000') });
    expect(m.input().value).toBe('50,000');
    act(() => m.api().reset({ amount: '5000' }));
    expect(m.input().value).toBe('5,000');
    expect(m.api().getValues('amount')).toBe('5000');
  });

  it('no frame between a grouped value arriving and its normalising write shows a different number', async () => {
    const m = mount({ formProps: seeded(''), strict: true });
    m.handle.commits.length = 0;
    act(() => m.api().setValue('amount', '250,000.00'));
    await settle();
    expect(m.handle.commits.length).toBeGreaterThan(0);
    for (const commit of m.handle.commits) {
      expect(refCanonical(commit.text ?? '')).toBe(refCanonical(toAmountDisplayText(commit.value)));
      expect(commit.text).toBe('250,000.00');
    }
  });

  it('failure case: an invalid value keeps the equation character for character (value === shown)', () => {
    const m = mount({ formProps: seeded('') });
    focus(m.input());
    for (const text of SC003_INVALID_CASES) {
      type(m.input(), text);
      expect(m.api().getValues('amount')).toBe(m.input().value);
      focusElsewhere();
      expect(m.api().getValues('amount')).toBe(m.input().value);
      focus(m.input());
    }
  });
});

describe('INV-15: local state is consistent, and focused is never stuck on a control that cannot be focused', () => {
  it('typed commas, disabled while focused, re-enabled, focused again: the text is plain', () => {
    const m = mount({ formProps: seeded('') });
    focus(m.input());
    type(m.input(), '1,000');
    expect(m.input().value).toBe('1,000');
    m.set({ options: DISABLED });
    expect(m.input().disabled).toBe(true);
    expect(m.input().value).toBe('1,000'); // grouped form of 1000
    m.set({ options: GROUPED });
    // Not stuck in the plain form: an unfocused field shows grouped.
    expect(m.input().value).toBe('1,000');
    // A browser drops focus from a control that becomes disabled; jsdom keeps it as the
    // active element, so move focus away by hand. The Chromium suite does this for real.
    focusElsewhere();
    focus(m.input());
    expect(m.input().value).toBe('1000');
    expect(m.handle.changeWrites).toEqual(['1000']);
  });

  it('boundary: 250000.00 disabled while focused shows grouped again once re-enabled, without a click in and out', () => {
    const m = mount({ formProps: seeded('250000.00') });
    focus(m.input());
    expect(m.input().value).toBe('250000.00');
    m.set({ options: DISABLED });
    m.set({ options: GROUPED });
    expect(m.input().value).toBe('250,000.00');
    expect(m.handle.writes).toEqual([]);
  });

  it.each(STRICT)(
    'StrictMode %s: focus that arrives in a parent mount effect shows the plain text, with no warning',
    (strict) => {
      const m = mount({
        formProps: seeded('1234567.89'),
        strict,
        onMount: () => document.getElementById('amount')?.focus(),
      });
      expect(document.activeElement).toBe(m.input());
      expect(m.input().value).toBe('1234567.89');
      focusElsewhere();
      expect(m.input().value).toBe('1,234,567.89');
    }
  );

  it('focused does not survive a remount: the new input starts in the unfocused form', () => {
    const m = mount({ formProps: seeded('1234567.89') });
    focus(m.input());
    const old = m.input();
    m.set({ fieldKey: 1 });
    expect(m.input()).not.toBe(old);
    expect(m.input().value).toBe('1,234,567.89');
    focus(m.input());
    expect(m.input().value).toBe('1234567.89');
  });

  it('whenever the field is unfocused its text is canonical: the next focus never shows a typed comma', () => {
    for (const typed of ['1,000', '12,345,678.90', '-1,234', '999,999']) {
      const m = mount({ formProps: seeded('') });
      focus(m.input());
      type(m.input(), typed);
      focusElsewhere();
      focus(m.input());
      expect(m.input().value, typed).toBe(strip(typed));
      cleanup();
    }
  });

  it('failure case: an out-of-step focus flag changes only the shown form. No write follows and the equation holds', () => {
    // A focus event with no real focus (the DOM and the flag disagree).
    const d = mountDirect('1234567.89');
    fireEvent.focus(d.input());
    expect(d.input().value).toBe('1234567.89');
    expect(d.spies.onChange).toEqual([]);
    d.set({});
    expect(d.spies.onChange).toEqual([]);
    expect(strip(d.input().value)).toBe('1234567.89');
  });
});

describe('INV-23: each user edit is kept whole, written once, and never reformatted while focused', () => {
  const rows = [...SC003_VALID_CASES, ...SC003_OVER_LIMIT_CASES, ...SC003_INVALID_CASES];

  it('every corpus row, entered in one event: shown as entered, one write of its canonical form (spied field)', () => {
    const d = mountDirect('');
    focus(d.input());
    let calls = 0;
    for (const row of rows) {
      if (row === d.input().value) continue;
      type(d.input(), row);
      calls += 1;
      expect(d.input().value, row).toBe(row);
      expect(d.spies.onChange.length, row).toBe(calls);
      expect(d.spies.onChange.at(-1), row).toBe(refCanonical(row));
    }
    expect(calls).toBeGreaterThanOrEqual(70);
  });

  it('typed character by character: no comma is inserted or removed, one write per keystroke', () => {
    const d = mountDirect('');
    focus(d.input());
    const text = '12,345,678.901234567890';
    for (let i = 1; i <= text.length; i += 1) {
      type(d.input(), text.slice(0, i));
      expect(d.input().value).toBe(text.slice(0, i));
    }
    expect(d.spies.onChange).toHaveLength(text.length);
    expect(d.spies.onChange).toEqual(
      Array.from({ length: text.length }, (_, i) => refCanonical(text.slice(0, i + 1)))
    );
    // 1234 stays 1234 while focused.
    type(d.input(), '1234');
    expect(d.input().value).toBe('1234');
  });

  it('cut, delete and replace events are kept whole too', () => {
    const m = mount({ formProps: seeded('1234567.89') });
    focus(m.input());
    for (const [next, stored] of [
      ['1234567.8', '1234567.8'],
      ['34567.8', '34567.8'],
      ['', ''],
      ['-', '-'],
      ['-5', '-5'],
    ] as const) {
      type(m.input(), next);
      expect(m.input().value).toBe(next);
      expect(m.api().getValues('amount')).toBe(stored);
    }
    expect(m.handle.changeWrites).toHaveLength(5);
  });

  it('an IME-style composition is not interrupted: the text during composition is what the events gave', () => {
    const d = mountDirect('');
    focus(d.input());
    fireEvent.compositionStart(d.input());
    type(d.input(), '１');
    expect(d.input().value).toBe('１');
    type(d.input(), '１２３４');
    expect(d.input().value).toBe('１２３４');
    fireEvent.compositionEnd(d.input(), { data: '1234' });
    type(d.input(), '1234');
    expect(d.input().value).toBe('1234');
    expect(d.spies.onChange).toEqual(['１', '１２３４', '1234']);
  });

  it('boundary: an input event on the unfocused field keeps the digits (shown grouped, stored plain)', () => {
    const m = mount({ formProps: seeded('') });
    type(m.input(), '1234567.89');
    expect(m.input().value).toBe('1,234,567.89');
    expect(m.api().getValues('amount')).toBe('1234567.89');
    type(m.input(), '25,00,000');
    expect(m.input().value).toBe('25,00,000');
    expect(m.api().getValues('amount')).toBe('25,00,000');
    expect(m.handle.changeWrites).toHaveLength(2);
  });

  it('failure case: nothing is filtered. Text the grammar rejects is shown and stored as typed', () => {
    const m = mount({ formProps: seeded('') });
    focus(m.input());
    type(m.input(), '1,0e+5 x');
    expect(m.input().value).toBe('1,0e+5 x');
    expect(m.api().getValues('amount')).toBe('1,0e+5 x');
  });
});

describe('INV-24: focus swaps grouped for plain in the focus commit and touches nothing in the form', () => {
  const WAYS: Record<string, (m: Mounted) => Promise<void>> = {
    'element.focus()': async (m) => focus(m.input()),
    'react-hook-form setFocus': async (m) => {
      act(() => m.api().setFocus('amount'));
      await settle();
    },
    'a focus event': async (m) => {
      fireEvent.focus(m.input());
    },
  };

  it.each(Object.keys(WAYS))(
    '%s: the first commit after focus shows the plain text; form state is unchanged',
    async (way) => {
      for (const mode of ['onSubmit', 'onBlur', 'onChange', 'onTouched', 'all'] as const) {
        const validateAmount = vi.fn(() => true);
        const m = mount({
          options: { ...GROUPED, validateAmount },
          formProps: seeded('1234567.89', mode),
        });
        await settle();
        const before = {
          isDirty: m.api().formState.isDirty,
          touched: { ...m.api().formState.touchedFields },
          errors: { ...m.api().formState.errors },
          validations: validateAmount.mock.calls.length,
        };
        m.handle.commits.length = 0;
        await WAYS[way]?.(m);
        expect(m.input().value, mode).toBe('1234567.89');
        // Every frame committed from the focus on is the plain one: no grouped frame in between.
        expect(m.handle.commits.length, mode).toBeGreaterThanOrEqual(1);
        expect(new Set(m.handle.commits.map((c) => c.text)), mode).toEqual(new Set(['1234567.89']));
        await settle();
        expect(m.handle.writes, mode).toEqual([]);
        expect(m.api().formState.isDirty, mode).toBe(before.isDirty);
        expect(m.api().formState.touchedFields, mode).toEqual(before.touched);
        expect(m.api().formState.errors, mode).toEqual(before.errors);
        expect(validateAmount.mock.calls.length, mode).toBe(before.validations);
        cleanup();
      }
    }
  );

  it('focus-on-error after a failed submit lands on the field and shows the text as stored', async () => {
    const m = mount({ options: { ...GROUPED, max: '1000' }, formProps: seeded('1234567.89') });
    await m.submit();
    expect(document.activeElement).toBe(m.input());
    expect(m.input().value).toBe('1234567.89');
    expect(m.handle.writes).toEqual([]);
  });

  it('exact counts (spied field): focus calls neither field.onChange nor field.onBlur', () => {
    for (const strict of STRICT) {
      const d = mountDirect('1234567.89', { strict });
      focus(d.input());
      focus(d.input());
      expect(d.spies.onChange).toEqual([]);
      expect(d.spies.onBlur).toBe(0);
      cleanup();
    }
  });

  it('boundary: focus on a field with no commas shown, or on a read-only field, changes nothing visible', () => {
    const m = mount({ formProps: seeded('999') });
    focus(m.input());
    expect(m.input().value).toBe('999');
    cleanup();
    const ro = mount({ options: READONLY, formProps: seeded('1234567.89') });
    focus(ro.input());
    expect(ro.input().value).toBe('1,234,567.89');
    expect(ro.handle.writes).toEqual([]);
  });
});

describe('INV-27: a real blur marks the field touched, makes the local text canonical and shows the grouped form', () => {
  it.each(STRICT)(
    'StrictMode %s · exact counts (spied field): one field.onBlur, no field.onChange',
    (strict) => {
      const d = mountDirect('250000', { strict });
      focus(d.input());
      d.elsewhere();
      expect(d.spies.onBlur).toBe(1);
      expect(d.spies.onChange).toEqual([]);
      expect(d.input().value).toBe('250,000');
      focus(d.input());
      type(d.input(), '1,000');
      d.elsewhere();
      expect(d.spies.onBlur).toBe(2);
      expect(d.spies.onChange).toEqual(['1000']);
    }
  );

  it('value, isDirty and dirtyFields are unchanged; touchedFields becomes true', () => {
    const m = mount({ formProps: seeded('250000') });
    focus(m.input());
    expect(m.api().formState.touchedFields.amount).toBeUndefined();
    focusElsewhere();
    expect(m.api().formState.touchedFields.amount).toBe(true);
    expect(m.api().getValues('amount')).toBe('250000');
    expect(m.api().formState.isDirty).toBe(false);
    expect(m.api().formState.dirtyFields).toEqual({});
    expect(m.handle.writes).toEqual([]);
    expect(m.input().value).toBe('250,000');
  });

  it('typed 250000 shows 250,000 after blur; typed 1,000 shows 1,000 and 1000 on the next focus', () => {
    const m = mount({ formProps: seeded('') });
    focus(m.input());
    type(m.input(), '250000');
    focusElsewhere();
    expect(m.input().value).toBe('250,000');
    focus(m.input());
    type(m.input(), '1,000');
    focusElsewhere();
    expect(m.input().value).toBe('1,000');
    focus(m.input());
    expect(m.input().value).toBe('1000');
    expect(m.handle.changeWrites).toEqual(['250000', '1000']);
  });

  it('corpus: after a real blur every valid row shows its grouped form, by the reference', () => {
    const m = mount({ formProps: seeded('') });
    for (const row of [...SC003_VALID_CASES, ...SC003_OVER_LIMIT_CASES]) {
      focus(m.input());
      if (m.input().value !== row) type(m.input(), row);
      focusElsewhere();
      expect(m.input().value, row).toBe(refShownUnfocused(row));
      expect(m.api().getValues('amount'), row).toBe(strip(row));
    }
  });

  it('failure case: invalid text is left exactly as typed by a real blur', () => {
    const m = mount({ formProps: seeded('') });
    for (const row of SC003_INVALID_CASES) {
      focus(m.input());
      if (m.input().value !== row) type(m.input(), row);
      focusElsewhere();
      expect(m.input().value, row).toBe(row);
    }
  });
});

describe('INV-28: a window blur changes nothing but touched', () => {
  it.each(STRICT)(
    'StrictMode %s: text, selection and value are unchanged; field.onBlur is called; no write',
    (strict) => {
      const d = mountDirect('1234567.89', { strict });
      focus(d.input());
      d.input().setSelectionRange(0, 10);
      fireEvent.blur(d.input()); // the input is still the document's active element
      expect(document.activeElement).toBe(d.input());
      expect(d.input().value).toBe('1234567.89');
      expect(d.input().selectionStart).toBe(0);
      expect(d.input().selectionEnd).toBe(10);
      expect(d.spies.onBlur).toBe(1);
      expect(d.spies.onChange).toEqual([]);
      // Back from the other window: the next edit replaces what was selected.
      type(d.input(), '300000');
      expect(d.input().value).toBe('300000');
      expect(d.spies.onChange).toEqual(['300000']);
    }
  );

  it('typed commas survive a window blur (the edit session is not over)', () => {
    const m = mount({ formProps: seeded('') });
    focus(m.input());
    type(m.input(), '1,000');
    fireEvent.blur(m.input());
    expect(m.input().value).toBe('1,000');
    expect(m.api().formState.touchedFields.amount).toBe(true);
    expect(m.handle.changeWrites).toEqual(['1000']);
    focusElsewhere();
    expect(m.input().value).toBe('1,000');
    focus(m.input());
    expect(m.input().value).toBe('1000');
  });

  it('failure case: a blur that does move focus is not mistaken for a window blur', () => {
    const d = mountDirect('1234567.89');
    focus(d.input());
    d.elsewhere();
    expect(document.activeElement).not.toBe(d.input());
    expect(d.input().value).toBe('1,234,567.89');
  });
});

describe('INV-29: values from outside are adopted in the same render, in the form the focus state calls for', () => {
  const WRITES: Record<string, (m: Mounted, value: unknown) => void> = {
    setValue: (m, value) => act(() => m.api().setValue('amount', value)),
    reset: (m, value) => act(() => m.api().reset({ amount: value })),
  };

  it.each(Object.keys(WRITES))(
    '%s: the first committed frame shows the new value; no stale frame',
    (how) => {
      const cases: readonly (readonly [unknown, string])[] = [
        ['5000', '5,000'],
        ['', ''],
        ['25,00,000', '25,00,000'],
        [1234567.5, '1,234,567.5'],
        [null, ''],
        ['999', '999'],
      ];
      const m = mount({ formProps: seeded('50000') });
      for (const [value, shown] of cases) {
        m.handle.commits.length = 0;
        WRITES[how]?.(m, value);
        expect(m.input().value).toBe(shown);
        expect(new Set(m.handle.commits.map((c) => c.text))).toEqual(new Set([shown]));
        expect(m.handle.commits.length).toBeLessThanOrEqual(3);
      }
      expect(m.handle.writes).toEqual([]);
    }
  );

  it('reset while focused: the new value shows plain, the field stays focused, the next real blur groups it', async () => {
    const m = mount({ formProps: seeded('') });
    focus(m.input());
    type(m.input(), '500');
    act(() => m.api().reset({ amount: '5000000' }));
    expect(m.input().value).toBe('5000000');
    expect(document.activeElement).toBe(m.input());
    act(() => m.api().reset({ amount: '250,000.00' }));
    await settle();
    expect(m.input().value).toBe('250000.00');
    expect(document.activeElement).toBe(m.input());
    focusElsewhere();
    expect(m.input().value).toBe('250,000.00');
  });

  it('a value equal to the one the field wrote is not adopted: the text in progress survives parent rerenders', () => {
    const m = mount({ formProps: seeded('') });
    focus(m.input());
    type(m.input(), '1,000');
    for (let i = 0; i < 4; i += 1) m.set({});
    expect(m.input().value).toBe('1,000');
    act(() => m.api().setValue('amount', '1000'));
    expect(m.input().value).toBe('1,000');
    // A different value from outside does replace it.
    act(() => m.api().setValue('amount', '2000'));
    expect(m.input().value).toBe('2000');
  });

  it('a name change shows the new path’s value and never writes the old text to the new name', () => {
    const m = mount({
      formProps: { defaultValues: { amount: '', other: '7000000' } },
    });
    focus(m.input());
    type(m.input(), '1,234');
    m.set({ name: 'other' });
    expect(m.input().value).toBe('7000000');
    expect(m.api().getValues()).toEqual({ amount: '1234', other: '7000000' });
    expect(m.handle.writes).toEqual([{ name: 'amount', value: '1234' }]);
  });

  it('late defaultValues are adopted like any outside write', async () => {
    const m = mount({
      formProps: { defaultValues: async () => ({ amount: '1234567.89' }) },
    });
    expect(m.input().value).toBe('');
    await settle();
    expect(m.input().value).toBe('1,234,567.89');
    expect(m.handle.writes).toEqual([]);
    expect(m.api().formState.isDirty).toBe(false);
  });

  it('failure case: adoption converges for every value type, NaN and objects included', () => {
    for (const strict of STRICT) {
      const m = mount({ formProps: seeded(''), strict });
      for (const value of [Number.NaN, {}, [], { a: 1 }, Number.NaN, () => 1, Symbol('x'), true]) {
        m.handle.commits.length = 0;
        act(() => m.api().setValue('amount', value));
        m.set({});
        expect(m.handle.commits.length).toBeLessThanOrEqual(6);
        expect(typeof m.input().value).toBe('string');
      }
      expect(m.handle.writes).toEqual([]);
      cleanup();
    }
  });
});

describe('INV-30: Escape behaves as in the plain exact input', () => {
  const PLAIN_EXACT: AmountFieldOptions = { ...GROUPED, groupedDisplay: false };

  it.each([
    ['a typed value', '', '1,000'],
    ['a seeded value', '250000.00', null],
    ['an invalid value', '25,00,000', null],
  ])(
    'editable, %s: Escape clears the text, writes the empty string once and is prevented',
    (_l, seed, typed) => {
      const m = mount({ formProps: seeded(seed) });
      focus(m.input());
      if (typed !== null) type(m.input(), typed);
      const writes = m.handle.changeWrites.length;
      expect(fireEvent.keyDown(m.input(), { key: 'Escape' })).toBe(false); // preventDefault
      expect(m.input().value).toBe('');
      expect(m.api().getValues('amount')).toBe('');
      expect(m.handle.changeWrites.slice(writes)).toEqual(['']);
      expect(document.activeElement).toBe(m.input());
    }
  );

  it('editable and empty: Escape blurs the input, which is a real blur (touched, one field.onBlur, no write)', () => {
    const d = mountDirect('');
    focus(d.input());
    fireEvent.keyDown(d.input(), { key: 'Escape' });
    expect(document.activeElement).not.toBe(d.input());
    expect(d.spies.onBlur).toBe(1);
    expect(d.spies.onChange).toEqual([]);
  });

  it('boundary: a value that displays as empty but is not empty (an object) is cleared, not blurred', () => {
    const d = mountDirect({ any: 'object' });
    focus(d.input());
    fireEvent.keyDown(d.input(), { key: 'Escape' });
    expect(d.spies.onChange).toEqual(['']);
    expect(document.activeElement).toBe(d.input());
  });

  it('parity: the same key sequence gives the same writes and texts as the plain exact input', () => {
    const run = (options: AmountFieldOptions): unknown => {
      const m = mount({ options, formProps: seeded('') });
      focus(m.input());
      const texts: string[] = [];
      for (const key of ['Escape']) fireEvent.keyDown(m.input(), { key });
      focus(m.input());
      type(m.input(), '1234.5');
      for (const key of [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Home',
        'End',
        'PageUp',
        'Enter',
      ]) {
        const notPrevented = fireEvent.keyDown(m.input(), { key });
        texts.push(`${key}:${m.input().value}:${notPrevented}`);
      }
      fireEvent.keyDown(m.input(), { key: 'Escape' });
      texts.push(`Escape:${m.input().value}`);
      const result = {
        texts,
        writes: [...m.handle.changeWrites],
        value: m.api().getValues('amount'),
      };
      cleanup();
      return result;
    };
    const grouped = run(GROUPED);
    expect(grouped).toEqual(run(PLAIN_EXACT));
    expect(grouped).toMatchObject({ writes: ['1234.5', ''], value: '' });
  });

  it('failure case: in focusable read-only mode Escape neither clears, blurs nor prevents default', () => {
    const d = mountDirect('1234567.89', { readOnly: true, readOnlyMode: 'readonly' });
    focus(d.input());
    expect(fireEvent.keyDown(d.input(), { key: 'Escape' })).toBe(true);
    expect(d.input().value).toBe('1,234,567.89');
    expect(document.activeElement).toBe(d.input());
    expect(d.spies.onChange).toEqual([]);
    expect(d.spies.onBlur).toBe(0);
  });
});

describe('INV-31: no extra cost per keystroke, focus or blur', () => {
  it('commits per event: a keystroke at most 2, focus 1, blur 1, parent rerender 1 (not StrictMode)', () => {
    const m = mount({ formProps: seeded('1234567.89') });
    const commitsDuring = (action: () => void): number => {
      m.handle.commits.length = 0;
      action();
      return m.handle.commits.length;
    };
    expect(commitsDuring(() => focus(m.input()))).toBe(1);
    for (const text of ['1234567.8', '1234567', '1,234,567', '']) {
      const commits = commitsDuring(() => type(m.input(), text));
      expect(commits, text).toBeGreaterThanOrEqual(1);
      expect(commits, text).toBeLessThanOrEqual(2);
    }
    type(m.input(), '5000');
    // First blur also flips `touched` in the form, which is its own commit.
    expect(commitsDuring(() => focusElsewhere())).toBeLessThanOrEqual(2);
    expect(commitsDuring(() => focus(m.input()))).toBe(1);
    expect(commitsDuring(() => focusElsewhere())).toBe(1);
    expect(commitsDuring(() => m.set({}))).toBe(1);
  });

  it('parity: the grouped input commits no more often per keystroke than the plain exact input', () => {
    const trace = (options: AmountFieldOptions): number[] => {
      const m = mount({ options, formProps: seeded('') });
      focus(m.input());
      const counts: number[] = [];
      for (const text of ['1', '12', '1,2', '1,234', '1,234.5', '']) {
        m.handle.commits.length = 0;
        type(m.input(), text);
        counts.push(m.handle.commits.length);
      }
      cleanup();
      return counts;
    };
    expect(trace(GROUPED)).toEqual(trace({ ...GROUPED, groupedDisplay: false }));
  });

  it('a grouped value from outside costs a bounded number of commits and settles', async () => {
    for (const strict of STRICT) {
      const m = mount({ formProps: seeded(''), strict });
      m.handle.commits.length = 0;
      act(() => m.api().setValue('amount', '250,000.00'));
      await settle();
      const commits = m.handle.commits.length;
      expect(commits).toBeLessThanOrEqual(6);
      m.set({});
      m.set({});
      expect(m.handle.commits.length).toBe(commits + 2);
      cleanup();
    }
  });

  it('render-time state updates settle in at most one extra render (spied field, not StrictMode)', () => {
    const d = mountDirect('1234567.89');
    const rendersDuring = (action: () => void): number => {
      const before = d.spies.renders;
      action();
      return d.spies.renders - before;
    };
    // The wrapper renders once per outside write; the input settles inside that pass.
    expect(rendersDuring(() => act(() => d.spies.setOutside?.('5000')))).toBe(1);
    expect(d.input().value).toBe('5,000');
    focus(d.input());
    expect(rendersDuring(() => d.set({ readOnly: true }))).toBe(1);
    expect(d.input().value).toBe('5,000');
    expect(rendersDuring(() => d.set({ readOnly: false }))).toBe(1);
  });

  it('100 mount and unmount cycles under StrictMode, including unmount while focused with a pending selection, log nothing', () => {
    for (let i = 0; i < 100; i += 1) {
      const d = mountDirect(i % 2 === 0 ? '1,234,567.89' : '1234567.89', { strict: true });
      if (i % 3 !== 0) {
        d.input().setSelectionRange(2, 7);
        // The focus event records a selection; unmounting right away leaves it pending.
        fireEvent.focus(d.input());
      }
      if (i % 5 === 0) focus(d.input());
      cleanup();
    }
    expect(document.querySelectorAll('input')).toHaveLength(0);
  });
});
