/**
 * 007 SF-3 · AmountField with `groupedDisplay`: who writes the form value, and when
 * (jsdom). The writers (INV-17), the normalising write for a validly grouped value from
 * outside (INV-18, INV-19), the submit gate (INV-20), read-only and disabled fields
 * (INV-21) and runtime flips (INV-22). Each `describe` starts with the INV id it
 * verifies.
 *
 * Two harnesses: `GroupedHarness` is the real field in a react-hook-form form;
 * `DirectGroupedInput` mounts the input alone with a spied `field`, so `field.onChange`
 * calls are counted exactly. Every test also checks that no valid submit carried a comma.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FieldValues, Mode, UseFormProps, UseFormReturn } from 'react-hook-form';

import { PLAIN_AMOUNT_PATTERN } from '../utils/decimalValidation';
import {
  createRng,
  randomGroupedText,
  SC003_VALID_CASES,
  viemParseUnits,
  type AmountFieldOptions,
} from './amount-exact.sf10-kit';
import {
  DirectGroupedInput,
  GroupedHarness,
  SecondWriter,
  type GroupedHarnessProps,
} from './amount-grouped.sf3-harness';
import {
  alertTexts,
  createDirectSpies,
  createGroupedHandle,
  GROUPING_OFF_MESSAGE,
  REF_GROUPED,
  refGroup,
  SEPARATOR_MESSAGE,
  strip,
  takeCommaLeaks,
  writesTo,
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
const MODES: readonly Mode[] = ['onSubmit', 'onBlur', 'onChange', 'onTouched', 'all'];
const STRICT = [false, true] as const;

let consoleError: ReturnType<typeof vi.spyOn>;
let consoleWarn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  // INV-20, in every test of this file: no valid submit ever carried a comma.
  expect(takeCommaLeaks()).toEqual([]);
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

/** Lets react-hook-form's async validation and any async `defaultValues` settle. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function mount(initial: MountProps = {}): Mounted {
  const handle = createGroupedHandle();
  let props: MountProps = { options: GROUPED, ...initial };
  const element = (): React.ReactElement => (
    <GroupedHarness handle={handle} options={GROUPED} {...props} />
  );
  const view = render(element());
  const api = (): UseFormReturn<FieldValues> => {
    if (!handle.api) throw new Error('form api missing');
    return handle.api;
  };
  const input = (): HTMLInputElement => screen.getByRole('textbox') as HTMLInputElement;
  return {
    handle,
    api,
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

const focusElsewhere = (): void => act(() => screen.getByRole('button', { name: 'After' }).focus());
const focus = (el: HTMLElement): void => act(() => el.focus());

function mountDirect(
  initial: unknown,
  props: { strict?: boolean; readOnly?: boolean; readOnlyMode?: 'readonly' | 'disabled' } = {}
): {
  spies: DirectSpies;
  input: () => HTMLInputElement;
  set: (patch: Partial<typeof props> & { inputKey?: number }) => void;
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
  };
}

/** Seeds that must never be written by the kit. */
const UNWRITTEN_SEEDS: readonly (readonly [string, unknown])[] = [
  ['a plain string', '250000.00'],
  ['an empty string', ''],
  ['a wrongly grouped string', '25,00,000'],
  ['an exponent', '1e18'],
  ['a grouped string with whitespace', ' 1,000 '],
  ['a zero-led grouped string', '000,123'],
  ['a number', 1234567.5],
  ['a bigint', 123456789012345678901234567890n],
  ['NaN', Number.NaN],
  ['null', null],
  ['undefined', undefined],
  ['an object', { toString: () => '1,000' }],
];

describe('INV-17: the form value has three writers and no others', () => {
  describe.each(STRICT)('StrictMode %s', (strict) => {
    it.each(UNWRITTEN_SEEDS)(
      '%s gets zero writes through mount, focus, window blur, real blur, rerender and remount, in every mode',
      async (_label, seed) => {
        for (const mode of MODES) {
          const m = mount({ formProps: seeded(seed, mode), strict });
          await settle();
          focus(m.input());
          fireEvent.blur(m.input()); // window blur: the input stays the active element
          focusElsewhere();
          focus(m.input());
          m.set({});
          m.set({ fieldKey: 1 });
          focus(m.input());
          focusElsewhere();
          await settle();
          expect(m.handle.writes, mode).toEqual([]);
          expect(m.api().formState.isDirty, mode).toBe(false);
          expect(m.api().formState.dirtyFields.amount, mode).toBeUndefined();
          const stored: unknown = m.api().getValues('amount');
          expect(typeof stored, mode).toBe(typeof seed);
          if (typeof seed !== 'object' || seed === null) expect(stored, mode).toBe(seed);
          cleanup();
        }
      }
    );

    it.each(UNWRITTEN_SEEDS)(
      'exact count: %s causes zero field.onChange calls (spied field)',
      (_label, seed) => {
        const d = mountDirect(seed, { strict });
        focus(d.input());
        fireEvent.blur(d.input());
        act(() => screen.getByRole('button', { name: 'Elsewhere' }).focus());
        d.set({});
        d.set({ inputKey: 1 });
        expect(d.spies.onChange).toEqual([]);
      }
    );

    it('the three writers each write exactly once: an edit, Escape, and a grouped value from outside', () => {
      const d = mountDirect('', { strict });
      focus(d.input());
      fireEvent.change(d.input(), { target: { value: '1,000' } });
      expect(d.spies.onChange).toEqual(['1000']);
      fireEvent.keyDown(d.input(), { key: 'Escape' });
      expect(d.spies.onChange).toEqual(['1000', '']);
      act(() => d.spies.setOutside?.('2,000'));
      expect(new Set(d.spies.onChange.slice(2))).toEqual(new Set(['2000']));
      const after = d.spies.onChange.length;
      // Nothing else writes: focus, both blurs, selection keys, a parent rerender.
      fireEvent.blur(d.input());
      for (const key of ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', 'Tab']) {
        fireEvent.keyDown(d.input(), { key });
      }
      fireEvent.select(d.input());
      act(() => screen.getByRole('button', { name: 'Elsewhere' }).focus());
      focus(d.input());
      d.set({});
      expect(d.spies.onChange.length).toBe(after);
    });
  });

  it('failure case: a blur never writes, even when the typed text differs from the stored text', () => {
    const m = mount({ formProps: seeded(1234567.5) });
    focus(m.input());
    focusElsewhere();
    // A number default stays a number, so the form stays pristine and `watch` stays quiet.
    expect(m.api().getValues('amount')).toBe(1234567.5);
    expect(m.handle.writes).toEqual([]);
    expect(m.api().formState.isDirty).toBe(false);
    expect(m.api().formState.touchedFields.amount).toBe(true);
  });
});

describe('INV-18: the normalising write removes commas from the current value and does nothing else', () => {
  it('property (seed 0x5f3b18): for 400 grouped seeds the only written value is the seed without commas (spied field)', () => {
    const rng = createRng(0x5f3b18);
    for (let i = 0; i < 400; i += 1) {
      const seed = randomGroupedText(rng, i % 20 === 0 ? 40 : 6, 20);
      const d = mountDirect(seed, { strict: i % 2 === 0 });
      expect(new Set(d.spies.onChange), seed).toEqual(new Set([strip(seed)]));
      const written = d.spies.onChange[0] as string;
      expect(PLAIN_AMOUNT_PATTERN.test(written), seed).toBe(true);
      expect(viemParseUnits(written, 20)).toBe(viemParseUnits(strip(seed), 20));
      expect(d.spies.onBlur).toBe(0);
      expect(d.input().value, seed).toBe(seed);
      cleanup();
    }
  });

  it('it runs in a passive effect: a layout effect of the same commit still sees zero writes', () => {
    for (const strict of STRICT) {
      const d = mountDirect('250,000.00', { strict });
      const firstLayout = d.spies.phases.find((p) => p.phase === 'layout');
      const firstPassive = d.spies.phases.find((p) => p.phase === 'passive');
      expect(firstLayout?.writes, `strict ${strict}`).toBe(0);
      expect(firstPassive?.writes, `strict ${strict}`).toBeGreaterThanOrEqual(1);
      // And for a value that arrives later.
      d.spies.phases.length = 0;
      const before = d.spies.onChange.length;
      act(() => d.spies.setOutside?.('1,000'));
      expect(d.spies.phases.find((p) => p.phase === 'layout')?.writes).toBe(before);
      expect(d.spies.onChange.length).toBeGreaterThan(before);
      cleanup();
    }
  });

  const ARRIVALS: Record<string, (seed: string) => MountProps> = {
    defaultValues: (seed) => ({ formProps: { defaultValues: { amount: seed } } }),
    'useForm({ values })': (seed) => ({ formProps: { values: { amount: seed } } }),
    'async defaultValues': (seed) => ({
      formProps: { defaultValues: async () => ({ amount: seed }) },
    }),
    'reset in a parent mount effect': (seed) => ({
      formProps: { defaultValues: { amount: '' } },
      onMount: (api) => api.reset({ amount: seed }),
    }),
  };

  describe.each(STRICT)('StrictMode %s', (strict) => {
    it.each(Object.keys(ARRIVALS))(
      '%s: stored plain, dirty, watchers notified, not touched, shown text unchanged',
      async (path) => {
        const seed = '250,000.00';
        const m = mount({ ...ARRIVALS[path]?.(seed), strict });
        await settle();
        const writes = writesTo(m.handle);
        expect(new Set(writes)).toEqual(new Set(['250000.00']));
        expect(writes.length).toBeGreaterThanOrEqual(1);
        expect(writes.length).toBeLessThanOrEqual(3);
        expect(m.api().getValues('amount')).toBe('250000.00');
        expect(m.api().formState.isDirty).toBe(true);
        expect(m.api().formState.dirtyFields.amount).toBe(true);
        expect(m.api().formState.touchedFields.amount).toBeUndefined();
        expect(m.input().value).toBe(seed);
        expect(alertTexts()).toEqual([]);

        // setValue, then a second reset: each answered with the stripped value of that write.
        m.handle.writes.length = 0;
        act(() => m.api().setValue('amount', '1,000'));
        await settle();
        expect(new Set(writesTo(m.handle))).toEqual(new Set(['1000']));
        expect(m.api().getValues('amount')).toBe('1000');
        m.handle.writes.length = 0;
        act(() => m.api().reset({ amount: '2,000.50' }));
        await settle();
        expect(new Set(writesTo(m.handle))).toEqual(new Set(['2000.50']));
        expect(m.api().getValues('amount')).toBe('2000.50');
        expect(m.input().value).toBe('2,000.50');
        expect(m.api().formState.touchedFields.amount).toBeUndefined();
      }
    );

    it('a name change never sends one path’s value to another', async () => {
      const m = mount({
        formProps: { defaultValues: { amount: '1,000', other: '5000', third: '7,000,000' } },
        name: 'other',
        strict,
      });
      await settle();
      expect(m.handle.writes).toEqual([]);
      m.set({ name: 'amount' });
      await settle();
      expect(new Set(writesTo(m.handle, 'amount'))).toEqual(new Set(['1000']));
      expect(writesTo(m.handle, 'other')).toEqual([]);
      m.set({ name: 'third' });
      await settle();
      expect(new Set(writesTo(m.handle, 'third'))).toEqual(new Set(['7000000']));
      m.set({ name: 'other' });
      await settle();
      expect(writesTo(m.handle, 'other')).toEqual([]);
      expect(m.api().getValues()).toEqual({ amount: '1000', other: '5000', third: '7000000' });
      expect(m.input().value).toBe('5,000');
    });
  });

  it.each(['onChange', 'all'] as const)(
    'mode %s: a grouped seed over max shows the max message at once on an untouched field, never a comma message',
    async (mode) => {
      const m = mount({
        options: { ...GROUPED, max: 100 },
        formProps: seeded('250,000.00', mode),
      });
      await settle();
      expect(m.api().getValues('amount')).toBe('250000.00');
      expect(m.api().formState.touchedFields.amount).toBeUndefined();
      expect(alertTexts()).toEqual(['Value must be at most 100']);
      expect(document.body.textContent).not.toContain(SEPARATOR_MESSAGE);
      expect(document.body.textContent).not.toContain(GROUPING_OFF_MESSAGE);
    }
  );

  it.each(['onSubmit', 'onBlur', 'onTouched'] as const)(
    'boundary, mode %s: the same seed is normalised but nothing is validated at mount',
    async (mode) => {
      const m = mount({
        options: { ...GROUPED, max: 100 },
        formProps: seeded('250,000.00', mode),
      });
      await settle();
      expect(m.api().getValues('amount')).toBe('250000.00');
      expect(alertTexts()).toEqual([]);
    }
  );
});

describe('INV-19: the normalising write converges, is bounded, is invisible and never follows a user edit', () => {
  it.each(STRICT)(
    'StrictMode %s: measured field.onChange calls per grouped value are between 1 and 3, all with the same string',
    (strict) => {
      const d = mountDirect('250,000.00', { strict });
      const mountCalls = [...d.spies.onChange];
      expect(mountCalls.length).toBeGreaterThanOrEqual(1);
      expect(mountCalls.length).toBeLessThanOrEqual(3);
      expect(new Set(mountCalls)).toEqual(new Set(['250000.00']));

      // Converges: more commits with a plain value cause no further write.
      for (let i = 0; i < 5; i += 1) d.set({});
      focus(d.input());
      act(() => screen.getByRole('button', { name: 'Elsewhere' }).focus());
      expect(d.spies.onChange.length).toBe(mountCalls.length);

      // A new grouped value from outside is answered again, within the same bound.
      act(() => d.spies.setOutside?.('1,000'));
      const second = d.spies.onChange.slice(mountCalls.length);
      expect(second.length).toBeGreaterThanOrEqual(1);
      expect(second.length).toBeLessThanOrEqual(3);
      expect(new Set(second)).toEqual(new Set(['1000']));
    }
  );

  it('one for one: five grouped writes from outside get five answers and no loop', async () => {
    const m = mount({ formProps: seeded('') });
    for (let i = 1; i <= 5; i += 1) {
      act(() => m.api().setValue('amount', `${i},000`));
      await settle();
    }
    expect(writesTo(m.handle)).toEqual(['1000', '2000', '3000', '4000', '5000']);
    expect(m.api().getValues('amount')).toBe('5000');
  });

  it('invisible: every committed frame shows the same text, unfocused and focused', async () => {
    const m = mount({ formProps: seeded('250,000.00'), strict: true });
    await settle();
    expect(new Set(m.handle.commits.map((c) => c.text))).toEqual(new Set(['250,000.00']));

    focus(m.input());
    m.handle.commits.length = 0;
    act(() => m.api().reset({ amount: '1,234,567.89' }));
    await settle();
    // Focused: the plain form in every frame, before the write and after its adoption.
    expect(new Set(m.handle.commits.map((c) => c.text))).toEqual(new Set(['1234567.89']));
    expect(m.api().getValues('amount')).toBe('1234567.89');
    expect(document.activeElement).toBe(m.input());
  });

  it('a reset to a grouped value while focused, then one typed character: the character lands in the plain text and is kept', async () => {
    const m = mount({ formProps: seeded('') });
    focus(m.input());
    act(() => m.api().reset({ amount: '250,000.00' }));
    await settle();
    expect(m.input().value).toBe('250000.00');
    fireEvent.change(m.input(), { target: { value: '250000.001' } });
    await settle();
    expect(m.input().value).toBe('250000.001');
    expect(m.api().getValues('amount')).toBe('250000.001');
    focusElsewhere();
    expect(m.input().value).toBe('250,000.001');
  });

  it.each([
    ['typed with commas', '1,000', '1000'],
    ['typed with commas and a fraction', '12,345,678.90', '12345678.90'],
    ['typed plain', '250000', '250000'],
    ['typed wrongly grouped', '25,00,000', '25,00,000'],
  ])('never caused by the user: %s is exactly one write', (_label, typed, stored) => {
    const d = mountDirect('');
    focus(d.input());
    fireEvent.change(d.input(), { target: { value: typed } });
    for (let i = 0; i < 3; i += 1) d.set({});
    act(() => screen.getByRole('button', { name: 'Elsewhere' }).focus());
    expect(d.spies.onChange).toEqual([stored]);
  });

  it('never caused by the user: an input event on the unfocused field (autofill, a drop) is one write', () => {
    const d = mountDirect('');
    fireEvent.change(d.input(), { target: { value: '9,876,543.21' } });
    d.set({});
    expect(d.spies.onChange).toEqual(['9876543.21']);
    expect(d.input().value).toBe('9,876,543.21');
  });

  it('failure case: `useForm({ values })` re-applies the grouped value after the write; the field still settles plain', async () => {
    for (const strict of STRICT) {
      const m = mount({ formProps: { values: { amount: '250,000.00' } }, strict });
      await settle();
      m.set({});
      await settle();
      expect(m.api().getValues('amount'), `strict ${strict}`).toBe('250000.00');
      expect(writesTo(m.handle).length, `strict ${strict}`).toBeLessThanOrEqual(3);
      await m.submit();
      expect(m.handle.validCalls.at(-1)?.amount, `strict ${strict}`).toBe('250000.00');
      expect(alertTexts()).toEqual([]);
      cleanup();
    }
  });
});

describe('INV-20: a submitted value never contains a comma, and an untouched grouped seed submits plain', () => {
  it.each(STRICT)(
    'StrictMode %s · safety: a grouped value written and submitted in the same tick, before the normalising effect, is blocked',
    async (strict) => {
      for (const mode of MODES) {
        const m = mount({ formProps: seeded('', mode), strict });
        await settle();
        await act(async () => {
          m.api().setValue('amount', '250,000.00');
          await m.api().handleSubmit(m.handle.onValid, m.handle.onInvalid)();
        });
        await settle();
        expect(m.handle.validCalls, mode).toEqual([]);
        expect(m.handle.invalidCalls, mode).toHaveLength(1);
        expect(m.handle.invalidCalls[0]?.amount?.message, mode).toBe(SEPARATOR_MESSAGE);
        // The value is plain once effects have run, and the next submit goes through.
        expect(m.api().getValues('amount'), mode).toBe('250000.00');
        await m.submit();
        expect(m.handle.validCalls.at(-1)?.amount, mode).toBe('250000.00');
        cleanup();
      }
    }
  );

  describe.each(MODES)('mode %s', (mode) => {
    it('liveness: an untouched grouped seed submits as the seed without commas and never shows the separator message', async () => {
      const seen: string[] = [];
      const observer = new MutationObserver(() => {
        seen.push(document.body.textContent ?? '');
      });
      observer.observe(document.body, { subtree: true, childList: true, characterData: true });
      const m = mount({ formProps: seeded('1,250,000.50', mode), strict: true });
      await settle();
      await m.submit();
      observer.disconnect();
      seen.push(document.body.textContent ?? '');
      expect(m.handle.validCalls.map((v) => v.amount)).toEqual(['1250000.50']);
      expect(m.handle.invalidCalls).toEqual([]);
      for (const text of seen) {
        expect(text).not.toContain(SEPARATOR_MESSAGE);
        expect(text).not.toContain(GROUPING_OFF_MESSAGE);
      }
    });

    it('safety: a grouped seed on a read-only field is refused, never submitted', async () => {
      const m = mount({ options: READONLY, formProps: seeded('250,000.00', mode) });
      await settle();
      await m.submit();
      expect(m.handle.validCalls).toEqual([]);
      expect(m.handle.invalidCalls.at(-1)?.amount?.message).toBe(SEPARATOR_MESSAGE);
    });
  });

  it('failure case: a wrongly grouped seed never reaches the valid callback and is not rewritten', async () => {
    const m = mount({ formProps: seeded('25,00,000') });
    await settle();
    await m.submit();
    expect(m.handle.validCalls).toEqual([]);
    expect(m.api().getValues('amount')).toBe('25,00,000');
    expect(m.input().value).toBe('25,00,000');
    expect(alertTexts()).toEqual(['Use , only between groups of three digits, e.g. 1,234,567.89']);
  });

  const corpus = Array.from(new Set(SC003_VALID_CASES.map(strip)));
  const arrivals = ['typed', 'seeded plain', 'seeded grouped', 'reset to grouped'] as const;

  it.each(arrivals)(
    'digits: every corpus value, %s, through two focus and blur cycles, submits character for character',
    async (arrival) => {
      expect(corpus.length).toBeGreaterThanOrEqual(45);
      for (const plain of corpus) {
        const grouped = refGroup(plain);
        const m =
          arrival === 'seeded plain'
            ? mount({ formProps: seeded(plain), strict: true })
            : arrival === 'seeded grouped'
              ? mount({ formProps: seeded(grouped), strict: true })
              : mount({ formProps: seeded(''), strict: true });
        if (arrival === 'typed') {
          focus(m.input());
          fireEvent.change(m.input(), { target: { value: plain } });
        }
        if (arrival === 'reset to grouped') act(() => m.api().reset({ amount: grouped }));
        await settle();
        for (let cycle = 0; cycle < 2; cycle += 1) {
          focus(m.input());
          expect(m.input().value, plain).toBe(plain);
          focusElsewhere();
          expect(m.input().value, plain).toBe(grouped);
        }
        await m.submit();
        expect(
          m.handle.validCalls.map((v) => v.amount),
          plain
        ).toEqual([plain]);
        expect(alertTexts(), plain).toEqual([]);
        expect(document.body.textContent, plain).not.toContain(SEPARATOR_MESSAGE);
        expect(document.body.textContent, plain).not.toContain(GROUPING_OFF_MESSAGE);
        cleanup();
      }
    },
    60_000
  );
});

describe('INV-21: read-only and disabled fields are never written, stay grouped on focus, and a grouped seed fails closed', () => {
  const SEEDS: readonly unknown[] = [
    '250000.00',
    '250,000.00',
    '25,00,000',
    '',
    1234567.5,
    9007199254740993n,
  ];

  describe.each([
    ['focusable read-only', READONLY, { readOnly: true, readOnlyMode: 'readonly' as const }],
    ['disabled', DISABLED, { readOnly: true }],
  ])('%s', (_label, options, directProps) => {
    it.each(STRICT)(
      'StrictMode %s: zero writes from mount, a value from outside, focus, blur and Escape',
      async (strict) => {
        for (const seed of SEEDS) {
          const m = mount({ options, formProps: seeded(seed), strict });
          await settle();
          const input = m.input();
          focus(input);
          // A disabled control gets no key events from a browser; the real-keyboard case
          // is in the Chromium suite.
          if (!input.disabled) fireEvent.keyDown(input, { key: 'Escape' });
          fireEvent.blur(input);
          focusElsewhere();
          act(() => m.api().setValue('amount', '1,000'));
          act(() => m.api().reset({ amount: '2,000,000' }));
          await settle();
          expect(m.handle.writes, String(seed)).toEqual([]);
          expect(m.api().getValues('amount'), String(seed)).toBe('2,000,000');
          expect(m.api().formState.isDirty, String(seed)).toBe(false);
          cleanup();

          const d = mountDirect(seed, { ...directProps, strict });
          focus(d.input());
          if (!d.input().disabled) fireEvent.keyDown(d.input(), { key: 'Escape' });
          act(() => screen.getByRole('button', { name: 'Elsewhere' }).focus());
          act(() => d.spies.setOutside?.('3,000'));
          d.set({});
          expect(d.spies.onChange, String(seed)).toEqual([]);
          cleanup();
        }
      }
    );
  });

  it('read-only: shown grouped whether focused or not; the kit sets no selection; Escape is inert and not prevented', async () => {
    const setSelection = vi.spyOn(HTMLInputElement.prototype, 'setSelectionRange');
    const m = mount({ options: READONLY, formProps: seeded('1250000.50') });
    await settle();
    const input = m.input();
    expect(input.value).toBe('1,250,000.50');
    focus(input);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('1,250,000.50');
    // fireEvent returns false when a handler called preventDefault.
    expect(fireEvent.keyDown(input, { key: 'Escape' })).toBe(true);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('1,250,000.50');
    focusElsewhere();
    expect(input.value).toBe('1,250,000.50');
    expect(setSelection).not.toHaveBeenCalled();
    expect(m.api().getValues('amount')).toBe('1250000.50');
  });

  it('read-only with a plain seed: pristine, passes validation, submits the plain seed', async () => {
    const m = mount({ options: READONLY, formProps: seeded('1250000.50') });
    await settle();
    await m.submit();
    expect(m.handle.validCalls.map((v) => v.amount)).toEqual(['1250000.50']);
    expect(m.api().formState.isDirty).toBe(false);
    expect(alertTexts()).toEqual([]);
    expect(m.handle.writes).toEqual([]);
  });

  it('read-only with a validly grouped seed fails closed: shown as given, never rewritten, submit blocked with a visible message, field focused', async () => {
    const m = mount({ options: READONLY, formProps: seeded('250,000.00') });
    await settle();
    expect(m.input().value).toBe('250,000.00');
    expect(alertTexts()).toEqual([]);
    await m.submit();
    expect(m.handle.validCalls).toEqual([]);
    expect(alertTexts()).toEqual([SEPARATOR_MESSAGE]);
    expect(m.input().getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(m.input());
    expect(m.input().value).toBe('250,000.00');
    expect(m.input().value).toBe(m.api().getValues('amount'));
    expect(m.handle.writes).toEqual([]);
    expect(m.api().formState.isDirty).toBe(false);
    // The message names separators, and the shown text does contain them.
    expect(m.input().value).toContain(',');
  });

  it('disabled with a grouped seed: shown as given, zero writes, the value is left out of the submit data and blocks nothing', async () => {
    const m = mount({ options: DISABLED, formProps: seeded('250,000.00') });
    await settle();
    expect(m.input().disabled).toBe(true);
    expect(m.input().value).toBe('250,000.00');
    await m.submit();
    expect(m.handle.validCalls).toHaveLength(1);
    expect(m.handle.validCalls[0]).not.toHaveProperty('amount');
    expect(m.handle.writes).toEqual([]);
    expect(alertTexts()).toEqual([]);
  });
});

describe('INV-22: editability and flag changes at runtime follow the same write rule', () => {
  it.each([
    ['read-only', READONLY],
    ['disabled', DISABLED],
  ])(
    'a %s field with a grouped value is normalised in the first commit in which it is editable, not before',
    async (_label, locked) => {
      for (const strict of STRICT) {
        const m = mount({ options: locked, formProps: seeded('250,000.00'), strict });
        await settle();
        m.set({});
        expect(m.handle.writes).toEqual([]);
        m.set({ options: GROUPED });
        await settle();
        expect(new Set(writesTo(m.handle))).toEqual(new Set(['250000.00']));
        expect(m.api().getValues('amount')).toBe('250000.00');
        expect(m.api().formState.isDirty).toBe(true);
        expect(m.input().value).toBe('250,000.00');
        await m.submit();
        expect(m.handle.validCalls.at(-1)?.amount).toBe('250000.00');
        cleanup();
      }
    }
  );

  it('unlocking after a refused submit: the value is normalised and the next submit passes with no separator message left', async () => {
    const m = mount({ options: READONLY, formProps: seeded('250,000.00') });
    await settle();
    await m.submit();
    expect(alertTexts()).toEqual([SEPARATOR_MESSAGE]);
    m.set({ options: GROUPED });
    await settle();
    expect(m.api().getValues('amount')).toBe('250000.00');
    await m.submit();
    expect(m.handle.validCalls.map((v) => v.amount)).toEqual(['250000.00']);
    expect(alertTexts()).toEqual([]);
  });

  it.each([
    ['read-only', READONLY],
    ['disabled', DISABLED],
  ])('becoming %s writes nothing; a focused field shows grouped at once', async (label, locked) => {
    const m = mount({ formProps: seeded('') });
    focus(m.input());
    fireEvent.change(m.input(), { target: { value: '1234567' } });
    await settle();
    const writes = m.handle.writes.length;
    expect(m.input().value).toBe('1234567');
    m.set({ options: locked });
    await settle();
    expect(m.handle.writes.length).toBe(writes);
    expect(m.input().value).toBe('1,234,567');
    expect(m.api().getValues('amount')).toBe('1234567');
    // Back to editable: nothing to normalise, so still no write.
    m.set({ options: GROUPED });
    await settle();
    expect(m.handle.writes.length).toBe(writes);
    if (label === 'read-only') {
      // Still the same focus session, so the plain text shows again.
      expect(document.activeElement).toBe(m.input());
      expect(m.input().value).toBe('1234567');
    } else {
      // Disabling ended the edit session, so the field is back to the unfocused form.
      expect(m.input().value).toBe('1,234,567');
    }
  });

  const PLAIN_EXACT: AmountFieldOptions = { ...GROUPED, groupedDisplay: false };
  const NO_GROUPING: AmountFieldOptions = { ...GROUPED, allowGrouping: false };

  it.each([
    ['groupedDisplay', PLAIN_EXACT],
    ['allowGrouping', NO_GROUPING],
  ])(
    'turning %s off and on with a plain value swaps the input and writes nothing',
    async (_label, off) => {
      const m = mount({ formProps: seeded('1234567.5') });
      await settle();
      const groupedNode = m.input();
      expect(groupedNode.value).toBe('1,234,567.5');
      m.set({ options: off });
      await settle();
      expect(m.input()).not.toBe(groupedNode);
      expect(m.input().value).toBe('1234567.5');
      m.set({ options: GROUPED });
      await settle();
      expect(m.input().value).toBe('1,234,567.5');
      expect(m.handle.writes).toEqual([]);
      expect(m.api().formState.isDirty).toBe(false);
    }
  );

  it('turning groupedDisplay on over a grouped value on an editable field normalises it; turning it off writes nothing', async () => {
    const m = mount({ options: PLAIN_EXACT, formProps: seeded('250,000.00') });
    await settle();
    // Without the opt-in the grouped seed stays as written (the 006 behaviour).
    expect(m.handle.writes).toEqual([]);
    expect(m.api().getValues('amount')).toBe('250,000.00');
    m.set({ options: GROUPED });
    await settle();
    expect(new Set(writesTo(m.handle))).toEqual(new Set(['250000.00']));
    const writes = m.handle.writes.length;
    m.set({ options: PLAIN_EXACT });
    await settle();
    expect(m.handle.writes.length).toBe(writes);
    expect(m.input().value).toBe('250000.00');
  });

  it('failure case: turning groupedDisplay on over a grouped value on a read-only field writes nothing', async () => {
    const m = mount({
      options: { ...READONLY, groupedDisplay: false },
      formProps: seeded('250,000.00'),
    });
    await settle();
    m.set({ options: READONLY });
    await settle();
    expect(m.handle.writes).toEqual([]);
    expect(m.api().getValues('amount')).toBe('250,000.00');
  });
});

describe('Known limit (not a guarantee): a second writer in the same flush as a grouped value from outside', () => {
  // Pending a dev call. What IS guaranteed is INV-5: afterwards the screen and the form
  // agree. Which writer wins is pinned below as current behaviour only.
  const grouped = '250,000.00';

  async function run(where: 'before' | 'after' | 'parent'): Promise<Mounted> {
    const handle = createGroupedHandle();
    const writer = <SecondWriter handle={handle} when={grouped} write="5" />;
    const props: MountProps =
      where === 'parent'
        ? { formProps: seeded(grouped), onMount: (api) => api.setValue('amount', '5') }
        : { formProps: seeded(''), [where]: writer };
    const view = render(<GroupedHarness handle={handle} options={GROUPED} {...props} />);
    if (where !== 'parent') act(() => handle.api?.reset({ amount: grouped }));
    await settle();
    void view;
    return {
      handle,
      api: () => handle.api as UseFormReturn<FieldValues>,
      input: () => screen.getByRole('textbox') as HTMLInputElement,
      set: () => undefined,
      submit: async () => undefined,
    };
  }

  it.each(['before', 'after', 'parent'] as const)(
    'guaranteed, writer %s the field: the shown amount and the form value agree, and the value has no comma',
    async (where) => {
      const m = await run(where);
      const value = m.api().getValues('amount') as string;
      expect(value).not.toContain(',');
      expect(strip(m.input().value)).toBe(value);
      expect(['5', '250000.00']).toContain(value);
    }
  );

  it('a writer rendered after the field wins', async () => {
    const m = await run('after');
    expect(m.api().getValues('amount')).toBe('5');
  });

  it('a writer in the parent form component wins', async () => {
    const m = await run('parent');
    expect(m.api().getValues('amount')).toBe('5');
  });

  it('current behaviour, known limit: a writer rendered before the field loses its value to the stripped older one', async () => {
    // Not a contract. If this starts failing because the earlier writer now wins, that
    // is an improvement: flip the expectation and drop the limit from the docs.
    const m = await run('before');
    expect(m.api().getValues('amount')).toBe('250000.00');
    expect(m.input().value).toBe('250,000.00');
  });
});

describe('Known limit (not a guarantee): `reset` followed by a submit in the same tick', () => {
  // react-hook-form drops every field's rules inside `reset` and registers them again
  // after the next render, so a submit in the same tick validates nothing, for any field.
  // The grouped input neither causes nor can prevent this. Pinned as parity with the
  // plain exact input, so the day react-hook-form changes it, both pins move together.
  it.each([
    ['grouped display', GROUPED],
    ['the plain exact input', { ...GROUPED, groupedDisplay: false } as AmountFieldOptions],
  ])(
    'current behaviour with %s: the valid callback receives the value exactly as `reset` gave it',
    async (_label, options) => {
      const m = mount({ options, formProps: seeded('') });
      await settle();
      await act(async () => {
        m.api().reset({ amount: '250,000.00' });
        await m.api().handleSubmit(m.handle.onValid, m.handle.onInvalid)();
      });
      await settle();
      expect(m.handle.validCalls.map((v) => v.amount)).toEqual(['250,000.00']);
      // Acknowledged here, so the file-wide "no comma in a valid submit" check stays strict
      // for every other test.
      m.handle.commaLeaks.length = 0;
    }
  );

  it('one render later the same submit is blocked (plain exact input) or goes through plain (grouped display)', async () => {
    for (const [options, valid] of [
      [GROUPED, ['250000.00']],
      [{ ...GROUPED, groupedDisplay: false } as AmountFieldOptions, []],
    ] as const) {
      const m = mount({ options, formProps: seeded('') });
      await settle();
      act(() => m.api().reset({ amount: '250,000.00' }));
      await settle();
      await m.submit();
      expect(m.handle.validCalls.map((v) => v.amount)).toEqual(valid);
      cleanup();
    }
  });
});

describe('INV-18 / INV-14 sensitivity: the reference agrees on what counts as "validly grouped"', () => {
  it('every seed class above that got a write matches the grouped grammar, and none of the unwritten ones do', () => {
    for (const [, seed] of UNWRITTEN_SEEDS) {
      expect(typeof seed === 'string' && REF_GROUPED.test(seed)).toBe(false);
    }
    for (const seed of ['250,000.00', '1,000', '2,000.50', '7,000,000', '1,250,000.50']) {
      expect(REF_GROUPED.test(seed)).toBe(true);
    }
  });
});
