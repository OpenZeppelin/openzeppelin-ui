/**
 * 007 SF-3 · AmountField with `groupedDisplay`: what is mounted and what is shown
 * (jsdom). The mount condition (INV-1, INV-9), the single input and its attributes
 * (INV-3), the two display forms (INV-4), invalid text (INV-6), number and bigint
 * values (INV-7), accessible wiring (INV-34) and messages (INV-35). Each `describe`
 * starts with the INV id it verifies.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FieldValues, UseFormProps, UseFormReturn } from 'react-hook-form';

import { toAmountDisplayText } from '../utils/decimalValidation';
import {
  SC003_INVALID_CASES,
  SC003_VALID_CASES,
  typeBypass,
  type AmountFieldOptions,
} from './amount-exact.sf10-kit';
import { GroupedHarness, type GroupedHarnessProps } from './amount-grouped.sf3-harness';
import {
  alertTexts,
  createGroupedHandle,
  GROUPING_OFF_MESSAGE,
  REF_PLAIN,
  refGroup,
  refShownUnfocused,
  SEPARATOR_MESSAGE,
  strip,
  takeCommaLeaks,
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
const PLAIN_EXACT: AmountFieldOptions = { ...GROUPED, groupedDisplay: false };
const READONLY: AmountFieldOptions = { ...GROUPED, readOnly: true, readOnlyMode: 'readonly' };
const DISABLED: AmountFieldOptions = { ...GROUPED, readOnly: true };

let consoleError: ReturnType<typeof vi.spyOn>;
let consoleWarn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  expect(takeCommaLeaks()).toEqual([]);
  // No unknown-prop, controlled/uncontrolled or update-depth warning in any test.
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
    <GroupedHarness handle={handle} options={GROUPED} strict {...props} />
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

const seeded = (amount: unknown): UseFormProps<FieldValues> => ({ defaultValues: { amount } });
const focus = (el: HTMLElement): void => act(() => el.focus());
const focusElsewhere = (): void => act(() => screen.getByRole('button', { name: 'After' }).focus());

type InputKind = 'grouped' | 'plain exact' | 'default';

/**
 * Which input is mounted, read from behaviour only. Seed `1234567.5` at 2 decimals:
 * the grouped input shows commas while unfocused; the default input pads to 2 decimals
 * on blur; the plain exact input does neither.
 */
function mountedKind(options: AmountFieldOptions): InputKind {
  const m = mount({ options: { ...options, decimals: 2 }, formProps: seeded('1234567.5') });
  const input = m.input();
  if (input.value === '1,234,567.5') {
    focus(input);
    expect(input.value).toBe('1234567.5'); // the focus swap only the grouped input has
    focusElsewhere();
    expect(m.api().getValues('amount')).toBe('1234567.5');
    return 'grouped';
  }
  expect(input.value).toBe('1234567.5');
  focus(input);
  expect(input.value).toBe('1234567.5');
  focusElsewhere();
  return input.value === '1234567.50' ? 'default' : 'plain exact';
}

const attributesOf = (el: Element): Record<string, string> =>
  Object.fromEntries(Array.from(el.attributes, (a) => [a.name, a.value]));

describe('INV-1: the grouped input is mounted by one strict condition, and only by it', () => {
  const TRI = [undefined, false, true] as const;
  const table = TRI.flatMap((formatOnBlur) =>
    TRI.flatMap((allowGrouping) =>
      TRI.map((groupedDisplay) => ({ formatOnBlur, allowGrouping, groupedDisplay }))
    )
  );

  it.each(table)(
    'formatOnBlur=$formatOnBlur allowGrouping=$allowGrouping groupedDisplay=$groupedDisplay',
    (row) => {
      const options = typeBypass<AmountFieldOptions>({ label: 'Amount', ...row });
      const expected: InputKind =
        row.formatOnBlur !== false
          ? 'default'
          : row.allowGrouping === true && row.groupedDisplay === true
            ? 'grouped'
            : 'plain exact';
      expect(mountedKind(options)).toBe(expected);
    }
  );

  it('exactly one of the 27 combinations mounts the grouped input', () => {
    const grouped = table.filter((row) => {
      const kind = mountedKind(typeBypass<AmountFieldOptions>({ label: 'Amount', ...row }));
      cleanup();
      return kind === 'grouped';
    });
    expect(grouped).toEqual([{ formatOnBlur: false, allowGrouping: true, groupedDisplay: true }]);
  });

  it('groupedDisplay never reaches the DOM as an attribute, in any mode', () => {
    for (const options of [
      GROUPED,
      PLAIN_EXACT,
      typeBypass<AmountFieldOptions>({ label: 'Amount', groupedDisplay: true }),
    ]) {
      const m = mount({ options });
      const names = Array.from(document.querySelectorAll('*')).flatMap((el) =>
        Array.from(el.attributes, (a) => a.name.toLowerCase())
      );
      expect(names.filter((n) => n.includes('grouped'))).toEqual([]);
      expect(m.input()).toBeTruthy();
      cleanup();
    }
  });

  it('failure case: groupedDisplay without allowGrouping keeps the plain exact input, so a grouped seed is refused as on the 006 tip', async () => {
    const m = mount({
      options: { ...GROUPED, allowGrouping: false },
      formProps: seeded('250,000.00'),
    });
    await settle();
    expect(m.input().value).toBe('250,000.00');
    expect(m.handle.writes).toEqual([]);
    await m.submit();
    expect(m.handle.validCalls).toEqual([]);
    expect(alertTexts()).toEqual([GROUPING_OFF_MESSAGE]);
  });

  it('the input and the validation rule come from the same render after a flip', async () => {
    const m = mount({ options: PLAIN_EXACT, formProps: seeded('') });
    m.set({ options: GROUPED });
    focus(m.input());
    fireEvent.change(m.input(), { target: { value: '1,000' } });
    await m.submit();
    expect(m.handle.validCalls.map((v) => v.amount)).toEqual(['1000']);
    m.set({ options: { ...GROUPED, allowGrouping: false } });
    fireEvent.change(m.input(), { target: { value: '2,000' } });
    await m.submit();
    expect(m.handle.validCalls).toHaveLength(1);
    expect(alertTexts()).toEqual([GROUPING_OFF_MESSAGE]);
  });
});

describe('INV-9: type-bypass values fail closed', () => {
  it.each([
    ['the string "true"', 'true'],
    ['the string "false"', 'false'],
    ['1', 1],
    ['an object', {}],
    ['an array', []],
    ['null', null],
    ['a Boolean object', Object(true)],
    ['a function', () => true],
  ])(
    'groupedDisplay = %s mounts the plain exact input and writes nothing for a grouped seed',
    async (_l, value) => {
      const options = typeBypass<AmountFieldOptions>({ ...GROUPED, groupedDisplay: value });
      expect(mountedKind(options)).toBe('plain exact');
      cleanup();
      const m = mount({ options, formProps: seeded('250,000.00') });
      await settle();
      expect(m.handle.writes).toEqual([]);
      expect(m.api().getValues('amount')).toBe('250,000.00');
      expect(m.api().formState.isDirty).toBe(false);
    }
  );

  it('groupedDisplay: true in default mode mounts the default input, with or without allowGrouping', () => {
    for (const extra of [
      {},
      { allowGrouping: true },
      { formatOnBlur: true, allowGrouping: true },
    ]) {
      const options = typeBypass<AmountFieldOptions>({
        label: 'Amount',
        groupedDisplay: true,
        ...extra,
      });
      expect(mountedKind(options)).toBe('default');
      cleanup();
    }
  });

  it('boundary: a truthy non-boolean allowGrouping with groupedDisplay: true does mount the grouped input', () => {
    const options = typeBypass<AmountFieldOptions>({ ...GROUPED, allowGrouping: 'yes' });
    expect(mountedKind(options)).toBe('grouped');
  });
});

describe('INV-3: one input element, with the plain exact input’s attributes plus onFocus', () => {
  it.each([
    ['empty, editable', GROUPED, ''],
    ['with a value', GROUPED, '999'],
    [
      'required with helper text',
      { ...GROUPED, helperText: 'Help', validation: { required: true } },
      '',
    ],
    ['with a placeholder and symbol', { ...GROUPED, placeholder: '0.00', symbol: 'ETH' }, ''],
    ['focusable read-only', READONLY, '999'],
    ['disabled', DISABLED, '999'],
  ] as const)('%s: the attribute set equals the plain exact input’s', (_label, options, seed) => {
    const grouped = mount({ options: options as AmountFieldOptions, formProps: seeded(seed) });
    const got = attributesOf(grouped.input());
    // The input's surroundings: the symbol's wrapper and adornment slot when there is a
    // symbol, the bare input otherwise. Value-free, so only the markup is compared.
    const chrome = (input: HTMLInputElement): string => {
      const box = input.closest('div.relative')?.cloneNode(true) as HTMLElement | undefined;
      box?.querySelector('input')?.removeAttribute('value');
      return box?.outerHTML ?? '';
    };
    const groupedChrome = chrome(grouped.input());
    cleanup();
    const plain = mount({
      options: { ...(options as AmountFieldOptions), groupedDisplay: false } as AmountFieldOptions,
      formProps: seeded(seed),
    });
    expect(got).toEqual(attributesOf(plain.input()));
    expect(groupedChrome).toEqual(chrome(plain.input()));
    const symbol = 'symbol' in options ? options.symbol : undefined;
    expect(groupedChrome.includes('data-slot="input-end-adornment"')).toBe(Boolean(symbol));
    if (symbol) expect(groupedChrome).toContain(`<span id="amount-symbol">${symbol}</span>`);
    expect(got.type).toBe('text');
    expect(got.inputmode).toBe('decimal');
    expect(got['data-slot']).toBe('input');
    expect(got.name).toBe('amount');
    expect(got.id).toBe('amount');
  });

  it('it is the same DOM node through focus, typing, blur, reset and a read-only flip; never a second input', async () => {
    const m = mount({ formProps: seeded('250000.00') });
    const node = m.input();
    const same = (): void => {
      expect(document.querySelectorAll('input')).toHaveLength(1);
      expect(m.input()).toBe(node);
      expect(node.isConnected).toBe(true);
    };
    focus(node);
    same();
    fireEvent.change(node, { target: { value: '1,000' } });
    same();
    focusElsewhere();
    same();
    act(() => m.api().reset({ amount: '2,000,000' }));
    await settle();
    same();
    m.set({ options: READONLY });
    same();
    m.set({ options: GROUPED });
    same();
    focus(node);
    expect(document.activeElement).toBe(node);
  });

  it('react-hook-form reaches the node: setFocus and focus-on-error focus the mounted input', async () => {
    const m = mount({ formProps: seeded('1234567') });
    act(() => m.api().setFocus('amount'));
    await settle(); // react-hook-form focuses in a timeout
    expect(document.activeElement).toBe(m.input());
    expect(m.input().value).toBe('1234567');
    focusElsewhere();
    act(() => m.api().setValue('amount', '1e18'));
    await m.submit();
    expect(document.activeElement).toBe(m.input());
    expect(m.input().getAttribute('aria-invalid')).toBe('true');
  });

  it('the value is a string for the whole life of the input (controlled), whatever the form holds', async () => {
    const m = mount({ formProps: seeded(undefined) });
    for (const value of [null, undefined, 12, 12n, {}, Number.NaN, '', '1,000', Symbol.iterator]) {
      act(() => m.api().setValue('amount', value));
      await settle();
      expect(typeof m.input().value).toBe('string');
      expect(m.input().getAttribute('value')).not.toBeNull();
    }
  });
});

describe('INV-4: the shown text is one of two forms of the same text', () => {
  const TEXTS: readonly (readonly [unknown, string, string])[] = [
    // [form value, plain form, grouped form]
    ['250000.00', '250000.00', '250,000.00'],
    ['1234', '1234', '1,234'],
    ['999', '999', '999'],
    ['-1234567.5', '-1234567.5', '-1,234,567.5'],
    ['1000.', '1000.', '1,000.'],
    ['000123.450', '000123.450', '000123.450'],
    ['', '', ''],
    [null, '', ''],
    [undefined, '', ''],
  ];

  it.each(TEXTS)(
    'value %j: plain %j while focused and editable, grouped %j otherwise',
    (value, plain, grouped) => {
      const editable = mount({
        formProps: seeded(value),
        options: { ...GROUPED, placeholder: '0.00' },
      });
      expect(editable.input().value).toBe(grouped);
      focus(editable.input());
      expect(editable.input().value).toBe(plain);
      focusElsewhere();
      expect(editable.input().value).toBe(grouped);
      if (plain === '') expect(editable.input().placeholder).toBe('0.00');
      cleanup();

      const readOnly = mount({ formProps: seeded(value), options: READONLY });
      expect(readOnly.input().value).toBe(grouped);
      focus(readOnly.input());
      expect(document.activeElement).toBe(readOnly.input());
      expect(readOnly.input().value).toBe(grouped);
      cleanup();

      const disabled = mount({ formProps: seeded(value), options: DISABLED });
      expect(disabled.input().value).toBe(grouped);
    }
  );

  it('while focused the field shows no comma the user did not type, and every comma they did', () => {
    const m = mount({ formProps: seeded('') });
    focus(m.input());
    for (const typed of ['1', '12', '123', '1234', '12345', '1234567', '1,234,567', '1,2']) {
      fireEvent.change(m.input(), { target: { value: typed } });
      expect(m.input().value).toBe(typed);
    }
  });

  it('failure case: there is no third form. Typed commas are dropped at blur, and the next focus shows the plain text', () => {
    const m = mount({ formProps: seeded('') });
    focus(m.input());
    fireEvent.change(m.input(), { target: { value: '1,000' } });
    focusElsewhere();
    expect(m.input().value).toBe('1,000');
    focus(m.input());
    expect(m.input().value).toBe('1000');
  });
});

describe('INV-6: invalid text is shown as given, focused or not', () => {
  const INVALID = [...SC003_INVALID_CASES, '25,00,000', '12abc', '1,000e3', '١٢٣٤', '0,123,456'];

  it.each(INVALID.map((t) => [JSON.stringify(t), t] as const))('typed %s', async (_label, text) => {
    const m = mount({ formProps: seeded('') });
    focus(m.input());
    fireEvent.change(m.input(), { target: { value: text } });
    expect(m.input().value).toBe(text);
    focusElsewhere();
    expect(m.input().value).toBe(text);
    focus(m.input());
    expect(m.input().value).toBe(text);
    focusElsewhere();
    await settle();
    expect(m.handle.changeWrites).toEqual([text]);
    expect(m.api().getValues('amount')).toBe(text);
    await m.submit();
    expect(m.handle.validCalls).toEqual([]);
    expect(m.input().value).toBe(text);
  });

  it.each(INVALID.map((t) => [JSON.stringify(t), t] as const))(
    'seeded %s',
    async (_label, text) => {
      const m = mount({ formProps: seeded(text) });
      await settle();
      expect(m.input().value).toBe(text);
      focus(m.input());
      expect(m.input().value).toBe(text);
      focusElsewhere();
      expect(m.input().value).toBe(text);
      await m.submit();
      expect(m.handle.changeWrites).toEqual([]);
      expect(m.api().getValues('amount')).toBe(text);
      expect(m.handle.validCalls).toEqual([]);
      expect(alertTexts()).toHaveLength(1);
      expect(alertTexts()[0]).not.toBe(SEPARATOR_MESSAGE);
    }
  );

  it('a wrongly grouped seed shows the malformed-grouping message once validated, and is never regrouped', async () => {
    const m = mount({ formProps: seeded('25,00,000') });
    await m.submit();
    expect(alertTexts()).toEqual(['Use , only between groups of three digits, e.g. 1,234,567.89']);
    expect(m.input().value).toBe('25,00,000');
    expect(m.input().value).not.toBe('2,500,000');
  });
});

describe('INV-7: number and bigint values are shown exactly, grouped while unfocused, and never written', () => {
  const SEEDS: readonly (readonly [string, unknown])[] = [
    ['1234567.5', 1234567.5],
    ['-1234', -1234],
    ['1e21', 1e21],
    ['0.1', 0.1],
    ['a 30-digit bigint', 123456789012345678901234567890n],
    ['a negative bigint', -9007199254740993n],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['an object', {}],
    ['a symbol', Symbol.for('amount')],
    ['true', true],
  ];

  it.each(SEEDS)('%s', async (_label, seed) => {
    const m = mount({ formProps: seeded(seed) });
    await settle();
    const plain = toAmountDisplayText(seed);
    const grouped = REF_PLAIN.test(plain) ? refGroup(plain) : plain;
    expect(m.input().value).toBe(grouped);
    focus(m.input());
    expect(m.input().value).toBe(plain);
    focusElsewhere();
    expect(m.input().value).toBe(grouped);
    m.set({});
    await settle();
    expect(m.handle.writes).toEqual([]);
    expect(m.api().formState.isDirty).toBe(false);
    const stored: unknown = m.api().getValues('amount');
    expect(typeof stored).toBe(typeof seed);
    if (typeof seed !== 'object') expect(stored).toBe(seed);
  });

  it('named: the exact decimal text, with no float artefact and every digit of a large bigint', () => {
    const cases: readonly (readonly [unknown, string, string])[] = [
      [1234567.5, '1,234,567.5', '1234567.5'],
      [-1234, '-1,234', '-1234'],
      [1e21, '1,000,000,000,000,000,000,000', '1000000000000000000000'],
      [
        123456789012345678901234567890n,
        '123,456,789,012,345,678,901,234,567,890',
        '123456789012345678901234567890',
      ],
    ];
    for (const [seed, grouped, plain] of cases) {
      const m = mount({ formProps: seeded(seed) });
      expect(m.input().value).toBe(grouped);
      focus(m.input());
      expect(m.input().value).toBe(plain);
      cleanup();
    }
  });

  it('boundary: the first edit turns the value into a string, as in the plain exact input', () => {
    const m = mount({ formProps: seeded(1234567.5) });
    focus(m.input());
    fireEvent.change(m.input(), { target: { value: '1234567.55' } });
    expect(m.api().getValues('amount')).toBe('1234567.55');
    expect(m.handle.changeWrites).toEqual(['1234567.55']);
  });
});

describe('INV-34: the accessible name, role and wiring are the plain exact input’s, and the swap is silent', () => {
  const ARIA = [
    'aria-required',
    'aria-invalid',
    'aria-describedby',
    'aria-errormessage',
    'aria-readonly',
    'aria-disabled',
  ];
  const aria = (el: Element): Record<string, string | null> =>
    Object.fromEntries(ARIA.map((name) => [name, el.getAttribute(name)]));

  type Drive = (m: Mounted) => Promise<void>;
  const STATES: Record<string, { options: AmountFieldOptions; seed: string; drive: Drive }> = {
    pristine: { options: GROUPED, seed: '', drive: async () => undefined },
    'touched and valid': {
      options: { ...GROUPED, helperText: 'Help', validation: { required: true } },
      seed: '1234',
      drive: async (m) => {
        focus(m.input());
        focusElsewhere();
        await m.submit();
      },
    },
    'touched and invalid': {
      options: { ...GROUPED, helperText: 'Help', validation: { required: true } },
      seed: '',
      drive: async (m) => {
        focus(m.input());
        fireEvent.change(m.input(), { target: { value: '1e18' } });
        focusElsewhere();
        await m.submit();
        focusElsewhere();
      },
    },
    'read-only': {
      options: { ...READONLY, helperText: 'Help' },
      seed: '1234',
      drive: async () => undefined,
    },
  };

  it.each(Object.keys(STATES))(
    '%s: same ARIA attributes as the plain exact input, and every referenced id exists with text',
    async (name) => {
      const state = STATES[name];
      if (!state) throw new Error('unknown state');
      const grouped = mount({ options: state.options, formProps: seeded(state.seed) });
      await state.drive(grouped);
      const got = aria(grouped.input());
      const alerts = alertTexts();
      expect(screen.getByRole('textbox', { name: /Amount/ })).toBe(grouped.input());
      for (const attr of ['aria-describedby', 'aria-errormessage']) {
        for (const id of (grouped.input().getAttribute(attr) ?? '').split(' ').filter(Boolean)) {
          expect(document.getElementById(id)?.textContent?.trim(), `${attr} -> ${id}`).toBeTruthy();
        }
      }
      cleanup();
      const plain = mount({
        options: { ...state.options, groupedDisplay: false } as AmountFieldOptions,
        formProps: seeded(state.seed),
      });
      await state.drive(plain);
      expect(got).toEqual(aria(plain.input()));
      expect(alerts).toEqual(alertTexts());
    }
  );

  it('focus and blur alone add no alert or live region, change no ARIA attribute and validate nothing', async () => {
    for (const mode of ['onSubmit', 'onChange', 'all'] as const) {
      const m = mount({
        options: { ...GROUPED, validation: { required: true }, helperText: 'Help' },
        formProps: { defaultValues: { amount: '1234567.89' }, mode },
      });
      await settle();
      const live = (): number =>
        document.querySelectorAll('[role="alert"], [role="status"], [aria-live]').length;
      const before = { aria: aria(m.input()), live: live(), html: document.body.innerHTML };
      focus(m.input());
      await settle();
      expect(aria(m.input())).toEqual(before.aria);
      expect(live()).toBe(before.live);
      expect(m.input().value).toBe('1234567.89');
      // Nothing but the input's own value changed anywhere in the document.
      expect(document.body.innerHTML).toBe(
        before.html.replace('value="1,234,567.89"', 'value="1234567.89"')
      );
      fireEvent.blur(m.input()); // window blur: marks the field touched, as any blur does
      await settle();
      expect(aria(m.input())).toEqual(before.aria);
      expect(live()).toBe(before.live);
      cleanup();
    }
  });

  it('the accessible value is the plain text while focused and editable, the grouped text otherwise', () => {
    const m = mount({ formProps: seeded('1234567.89') });
    expect(screen.getByRole('textbox', { name: /Amount/ })).toHaveProperty('value', '1,234,567.89');
    focus(m.input());
    expect(screen.getByRole('textbox', { name: /Amount/ })).toHaveProperty('value', '1234567.89');
  });
});

describe('INV-35: messages describe what is on screen; the kit’s own commas never cause a comma message', () => {
  const corpus = Array.from(new Set(SC003_VALID_CASES.map(strip)));

  it('over the corpus, seeded plain and grouped, typed, blurred and submitted, neither comma message ever renders', async () => {
    const seen = new Set<string>();
    const observer = new MutationObserver(() => {
      for (const text of alertTexts()) seen.add(text);
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    for (const plain of corpus) {
      for (const seed of [plain, refGroup(plain), '']) {
        const m = mount({ formProps: { defaultValues: { amount: seed }, mode: 'all' } });
        await settle();
        if (seed === '') {
          focus(m.input());
          fireEvent.change(m.input(), { target: { value: plain } });
        }
        focus(m.input());
        focusElsewhere();
        await settle();
        expect(m.input().value, plain).toBe(refShownUnfocused(plain));
        await m.submit();
        for (const text of alertTexts()) seen.add(text);
        expect(
          m.handle.validCalls.map((v) => v.amount),
          plain
        ).toEqual([plain]);
        cleanup();
      }
    }
    observer.disconnect();
    expect([...seen]).toEqual([]);
  }, 60_000);

  it('a user who types 250000 and tabs out sees 250,000 and no message', async () => {
    const m = mount({ formProps: { defaultValues: { amount: '' }, mode: 'all' } });
    focus(m.input());
    fireEvent.change(m.input(), { target: { value: '250000' } });
    focusElsewhere();
    await settle();
    expect(m.input().value).toBe('250,000');
    expect(alertTexts()).toEqual([]);
    expect(m.input().getAttribute('aria-invalid')).not.toBe('true');
  });

  it('the one reachable case: a grouped value on a focusable read-only field shows the separator message, and the shown text has the separators', async () => {
    const m = mount({
      options: READONLY,
      formProps: { defaultValues: { amount: '250,000.00' }, mode: 'all' },
    });
    await m.submit();
    expect(alertTexts()).toEqual([SEPARATOR_MESSAGE]);
    expect(m.input().value).toBe('250,000.00');
  });

  it('failure case: the grouped input renders no message of its own. Invalid typed text gets the existing message for its issue', async () => {
    const cases: readonly (readonly [string, string])[] = [
      ['25,00,000', 'Use , only between groups of three digits, e.g. 1,234,567.89'],
      ['1e18', 'Scientific notation is not supported'],
      ['1..2', 'Only one decimal point is allowed'],
      ['-', 'Please enter a complete number'],
    ];
    for (const [typed, message] of cases) {
      const m = mount({ formProps: seeded('') });
      focus(m.input());
      fireEvent.change(m.input(), { target: { value: typed } });
      await m.submit();
      expect(alertTexts(), typed).toEqual([message]);
      cleanup();
    }
  });
});
