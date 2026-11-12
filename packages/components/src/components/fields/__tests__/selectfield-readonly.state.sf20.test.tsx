/**
 * @vitest-environment jsdom
 *
 * 005 SF-20 · SelectField read-only, form state (jsdom).
 * INV-8 (never in RHF's disabled set), INV-22 (payload complete), INV-15 (programmatic writes
 * land), INV-18 (no touched / dirty / validation from read-only interaction, all RHF modes),
 * INV-23 (validation still runs; focus on error doesn't open), INV-24 (an error survives the
 * switch), INV-25 (empty value and empty options stay inert), INV-10 / INV-21 (no console noise,
 * render cost per switch, no leaked document listeners).
 */
import { act, cleanup, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Mode } from 'react-hook-form';

import {
  describedByIds,
  EDITABLE_OPTED_IN,
  fillJsdomGaps,
  ID,
  mountSelect,
  PLACEHOLDER,
  READONLY,
  shownText,
  type Mounted,
  type SwitchProps,
  type Values,
} from './selectfield-readonly.sf20-kit';

beforeAll(fillJsdomGaps);
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function inDisabledSet(m: Mounted): boolean {
  return m.api().control._names.disabled.has('role');
}

function submitted(): { calls: Values[]; onValid: (d: Values) => void } {
  const calls: Values[] = [];
  return { calls, onValid: (d) => calls.push({ ...d }) };
}

describe('INV-8 / INV-22: read-only keeps the value in the payload', () => {
  it('read-only on: handleSubmit data has role = operator and deep-equals getValues', async () => {
    const s = submitted();
    const m = mountSelect({ value: 'operator', onValid: s.onValid, ...READONLY });
    await m.submit();
    expect(s.calls).toHaveLength(1);
    expect(s.calls[0].role).toBe('operator');
    expect(s.calls[0]).toStrictEqual(m.api().getValues());
    expect(inDisabledSet(m)).toBe(false);
  });

  it('switched to read-only after mount: still in the payload', async () => {
    const s = submitted();
    const m = mountSelect({ value: 'beta', onValid: s.onValid, readOnlyMode: 'readonly' });
    m.rerender(READONLY);
    await m.submit();
    expect(s.calls[0].role).toBe('beta');
  });

  it("readOnly true, readOnlyMode 'disabled' → 'readonly' → 'disabled': present after every submit", async () => {
    const s = submitted();
    const m = mountSelect({
      value: 'gamma',
      onValid: s.onValid,
      readOnly: true,
      readOnlyMode: 'disabled',
    });
    for (const mode of ['disabled', 'readonly', 'disabled', 'readonly']) {
      m.rerender({ readOnly: true, readOnlyMode: mode });
      expect(inDisabledSet(m), mode).toBe(false);
      await m.submit();
    }
    expect(s.calls.map((c) => c.role)).toStrictEqual(['gamma', 'gamma', 'gamma', 'gamma']);
    expect(m.api().getValues('role')).toBe('gamma');
  });

  it.each([undefined, 'disabled', 'bogus'])(
    'default mode (%s) with readOnly true: the name is present, as before SF-20',
    async (readOnlyMode) => {
      const s = submitted();
      const m = mountSelect({
        value: 'operator',
        onValid: s.onValid,
        readOnly: true,
        readOnlyMode,
      });
      await m.submit();
      expect(s.calls[0].role).toBe('operator');
    }
  );
});

describe('INV-15: programmatic writes still land while read-only', () => {
  it('setValue, reset and resetField update the value and the shown text; the list stays closed', () => {
    const m = mountSelect({ value: 'beta', ...READONLY });
    act(() => m.api().setValue('role', 'gamma'));
    expect(m.api().getValues('role')).toBe('gamma');
    expect(shownText(m.trigger())).toBe('Gamma');

    act(() => m.api().reset({ role: 'alpha' }));
    expect(m.api().getValues('role')).toBe('alpha');
    expect(shownText(m.trigger())).toBe('Alpha');

    act(() => m.api().setValue('role', 'gamma'));
    act(() => m.api().resetField('role'));
    expect(m.api().getValues('role')).toBe('alpha');
    expect(shownText(m.trigger())).toBe('Alpha');

    expect(m.listbox()).toBeNull();
    expect(m.trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('a write of null or empty while read-only shows the placeholder (no stale Radix value)', () => {
    const m = mountSelect({ value: 'beta', ...READONLY });
    for (const v of [null, '']) {
      act(() => m.api().setValue('role', 'gamma'));
      expect(shownText(m.trigger())).toBe('Gamma');
      act(() => m.api().setValue('role', v));
      expect(shownText(m.trigger()), String(v)).toBe(PLACEHOLDER);
      expect(m.trigger().hasAttribute('data-placeholder')).toBe(true);
      expect(m.api().getValues('role')).toBe(v);
    }
  });

  // Observation (RHF 7.79, not SF-20): `setValue(name, undefined)` leaves `field.value` on the
  // default value (useController falls back to defaultValues), so every field shows the default
  // while getValues() is undefined. Same in default mode; SF-10 recorded it for AmountField.
  it.each([
    ['read-only', READONLY],
    ['default mode', {}],
  ] as const)(
    '%s: setValue(undefined) shows the RHF default, as RHF does for every field',
    (_n, ro) => {
      const m = mountSelect({ value: 'beta', ...ro });
      act(() => m.api().setValue('role', 'gamma'));
      act(() => m.api().setValue('role', undefined));
      expect(m.api().getValues('role')).toBeUndefined();
      expect(shownText(m.trigger())).toBe('Beta');
    }
  );
});

describe('INV-18: read-only interaction never touches, dirties or validates', () => {
  const MODES: Mode[] = ['onSubmit', 'onBlur', 'onTouched', 'onChange', 'all'];

  it.each(MODES)(
    'mode %s: focus, click, Enter, Space, arrows, typing, blur → formState unchanged',
    async (mode) => {
      const m = mountSelect({
        mode,
        required: true,
        ...READONLY,
        after: <input aria-label="next" />,
      });
      const user = userEvent.setup();
      await user.click(m.trigger());
      await user.keyboard('{Enter}{ }{ArrowDown}{ArrowUp}ga');
      await user.tab();
      await act(async () => undefined);
      const fs = m.api().formState;
      expect(fs.touchedFields).toStrictEqual({});
      expect(fs.dirtyFields).toStrictEqual({});
      expect(fs.errors).toStrictEqual({});
      expect(fs.isDirty).toBe(false);
      expect(m.api().getFieldState('role')).toMatchObject({
        isTouched: false,
        isDirty: false,
        invalid: false,
      });
      expect(document.getElementById(`${ID}-error`)).toBeNull();
    }
  );
});

describe('INV-23: validation still runs while read-only', () => {
  it('required + empty + read-only: submit fails, error shown, trigger focused, list stays closed', async () => {
    const onInvalid = vi.fn();
    const onValid = vi.fn();
    const m = mountSelect({ required: true, onValid, onInvalid, ...READONLY });
    await m.submit();
    expect(onValid).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledTimes(1);
    expect(onInvalid.mock.calls[0][0].role?.message).toBe('This field is required');
    expect(document.getElementById(`${ID}-error`)?.textContent).toBe('This field is required');
    await waitFor(() => expect(document.activeElement).toBe(m.trigger()));
    expect(m.listbox()).toBeNull();
    expect(m.trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('validateSelect returning a string fails the submit with that message', async () => {
    const onInvalid = vi.fn();
    const m = mountSelect({
      value: 'beta',
      onInvalid,
      validateSelect: (v) => (v === 'beta' ? 'Beta is retired' : true),
      ...READONLY,
    });
    await m.submit();
    expect(onInvalid.mock.calls[0][0].role?.message).toBe('Beta is retired');
  });

  it('sensitivity: the same required select passes once it has a value', async () => {
    const onValid = vi.fn();
    const m = mountSelect({ value: 'alpha', required: true, onValid, ...READONLY });
    await m.submit();
    expect(onValid).toHaveBeenCalledTimes(1);
  });
});

describe('INV-24: an existing error survives the switch', () => {
  it('error text, id, aria-invalid and describedby order hold on and off', async () => {
    const m = mountSelect({ required: true, helperText: 'Pick one', readOnlyMode: 'readonly' });
    await m.submit();
    const err = document.getElementById(`${ID}-error`);
    expect(err?.textContent).toBe('This field is required');
    expect(m.trigger().getAttribute('aria-invalid')).toBe('true');
    expect(describedByIds(m.trigger())).toStrictEqual([`${ID}-error`, `${ID}-description`]);

    m.rerender({ ...READONLY, helperText: 'Pick one', required: true });
    expect(document.getElementById(`${ID}-error`)?.textContent).toBe('This field is required');
    expect(document.getElementById(`${ID}-error`)?.getAttribute('role')).toBe('alert');
    expect(m.trigger().getAttribute('aria-invalid')).toBe('true');
    expect(describedByIds(m.trigger())).toStrictEqual([
      `${ID}-error`,
      `${ID}-description`,
      `${ID}-readonly`,
    ]);

    m.rerender({ ...EDITABLE_OPTED_IN, helperText: 'Pick one', required: true });
    expect(document.getElementById(`${ID}-error`)?.textContent).toBe('This field is required');
    expect(m.trigger().getAttribute('aria-invalid')).toBe('true');
    expect(describedByIds(m.trigger())).toStrictEqual([`${ID}-error`, `${ID}-description`]);
  });
});

describe('INV-25: empty and option-less read-only selects stay inert', () => {
  it.each([
    ['empty value, options', {}],
    ['empty value, no options', { options: [] }],
  ] as const)('%s: open paths and typeahead keep the placeholder and value', async (_n, extra) => {
    const m = mountSelect({ ...READONLY, ...extra });
    const user = userEvent.setup();
    await user.click(m.trigger());
    await user.keyboard('{Enter}{ }{ArrowDown}ga');
    expect(m.listbox()).toBeNull();
    expect(document.body.textContent).not.toContain('No options available');
    expect(shownText(m.trigger())).toBe(PLACEHOLDER);
    expect(m.trigger().hasAttribute('data-placeholder')).toBe(true);
    expect(m.api().getValues('role')).toBeUndefined();
  });

  it('sensitivity: editable with no options opens to "No options available"', async () => {
    const m = mountSelect({ options: [], ...EDITABLE_OPTED_IN });
    const user = userEvent.setup();
    act(() => m.trigger().focus());
    await user.keyboard('{Enter}');
    expect(m.listbox()).not.toBeNull();
    expect(document.body.textContent).toContain('No options available');
  });
});

/* -------------------------------- INV-10 / INV-21: noise and cost -------------------------------- */

function consoleSpies(): { warn: ReturnType<typeof vi.spyOn>; error: ReturnType<typeof vi.spyOn> } {
  return {
    warn: vi.spyOn(console, 'warn').mockImplementation(() => undefined),
    error: vi.spyOn(console, 'error').mockImplementation(() => undefined),
  };
}

/** Messages other than React's own act() notices from the test harness. */
function realMessages(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls
    .map((args: unknown[]) => args.map(String).join(' '))
    .filter((msg: string) => !msg.includes('not wrapped in act('));
}

const CYCLE: SwitchProps[] = [
  READONLY,
  EDITABLE_OPTED_IN,
  READONLY,
  { readOnly: true, readOnlyMode: 'disabled' },
  READONLY,
  {},
];

describe('INV-10 / INV-21: no console noise', () => {
  it('20 cycles of readOnly / readOnlyMode toggles with a value, list open and closed at the switch: no warnings or errors', async () => {
    const { warn, error } = consoleSpies();
    const m = mountSelect({ value: 'beta' });
    const user = userEvent.setup();
    for (let i = 0; i < 20; i++) {
      for (const s of CYCLE) {
        if (i % 2 === 0 && s.readOnly && s.readOnlyMode === 'readonly') {
          // Open the list in the editable state just before switching read-only on.
          m.rerender(EDITABLE_OPTED_IN);
          act(() => m.trigger().focus());
          await user.keyboard('{Enter}');
          expect(m.listbox()).not.toBeNull();
        }
        m.rerender(s);
      }
    }
    expect(realMessages(warn)).toStrictEqual([]);
    expect(realMessages(error)).toStrictEqual([]);
  });

  it('static readOnlyMode="readonly" with an empty value, readOnly toggled 20×: no warnings or errors', () => {
    const { warn, error } = consoleSpies();
    const m = mountSelect({ readOnlyMode: 'readonly' });
    for (let i = 0; i < 20; i++) {
      m.rerender(READONLY);
      m.rerender(EDITABLE_OPTED_IN);
    }
    expect(realMessages(warn)).toStrictEqual([]);
    expect(realMessages(error)).toStrictEqual([]);
  });

  // SF-32 lifted SF-20's INV-21 narrowing: the Root is controlled in every mode ('' when empty),
  // so flipping readOnlyMode at runtime with an empty value no longer switches Radix's `value`
  // between controlled and uncontrolled, and Radix logs nothing. (SF-20 measured 3 warnings over
  // 20 flips here before SF-32.)
  it('runtime readOnlyMode flip with an empty value: no warnings or errors', () => {
    const { warn, error } = consoleSpies();
    const m = mountSelect({});
    for (let i = 0; i < 10; i++) {
      m.rerender(READONLY);
      m.rerender({ readOnly: true, readOnlyMode: 'disabled' });
    }
    expect(realMessages(warn)).toStrictEqual([]);
    expect(realMessages(error)).toStrictEqual([]);
  });

  // SF-32: default mode used to log Radix's uncontrolled-to-controlled warning on the first pick
  // from empty (its Root got `undefined`). The Root now always gets a value, so nothing is logged.
  it('default mode: the first pick from empty logs no warnings or errors', async () => {
    const { warn, error } = consoleSpies();
    const m = mountSelect({});
    const user = userEvent.setup();
    act(() => m.trigger().focus());
    await user.keyboard('{Enter}');
    const gamma = Array.from(document.querySelectorAll('[role="option"]')).find(
      (o) => o.textContent === 'Gamma'
    );
    if (!gamma) throw new Error('no Gamma option');
    await user.click(gamma);
    expect(m.api().getValues('role')).toBe('gamma');
    expect(realMessages(warn)).toStrictEqual([]);
    expect(realMessages(error)).toStrictEqual([]);
  });
});

describe('INV-21: render cost and lifecycle', () => {
  // SelectField's own render count per switch is measured in the spy file; here the whole
  // subtree's commits are compared with a rerender that changes nothing SF-20 reads.
  it('a switch commits the field subtree no more often than an unrelated prop change', async () => {
    const m = mountSelect({ value: 'beta', readOnlyMode: 'readonly' });
    const cost = (next: SwitchProps): number => {
      const before = m.commits();
      m.rerender(next);
      return m.commits() - before;
    };
    const reference = cost({ ...EDITABLE_OPTED_IN, helperText: 'x' });
    expect(cost({ ...READONLY, helperText: 'x' })).toBeLessThanOrEqual(reference);
    expect(cost({ ...EDITABLE_OPTED_IN, helperText: 'x' })).toBeLessThanOrEqual(reference);
    expect(cost({ readOnly: true, readOnlyMode: 'disabled', helperText: 'x' })).toBeLessThanOrEqual(
      reference
    );
  });

  it('50 mount / switch / unmount cycles leave no document or window listeners behind', () => {
    const live = new Map<string, number>();
    const key = (target: string, type: string): string => `${target}:${type}`;
    const track = (target: Document | Window, name: string): void => {
      const add = target.addEventListener.bind(target);
      const remove = target.removeEventListener.bind(target);
      vi.spyOn(target, 'addEventListener').mockImplementation((type, l, o) => {
        live.set(key(name, type), (live.get(key(name, type)) ?? 0) + 1);
        add(type, l, o);
      });
      vi.spyOn(target, 'removeEventListener').mockImplementation((type, l, o) => {
        live.set(key(name, type), (live.get(key(name, type)) ?? 0) - 1);
        remove(type, l, o);
      });
    };
    // Warm-up mount so lazily registered globals (React root listeners) aren't counted.
    mountSelect({ value: 'beta' }).unmount();
    track(document, 'document');
    track(window, 'window');
    for (let i = 0; i < 50; i++) {
      const m = mountSelect({ value: 'beta', readOnlyMode: 'readonly' });
      m.rerender(READONLY);
      m.rerender(EDITABLE_OPTED_IN);
      m.rerender(READONLY);
      m.unmount();
    }
    const leaked = [...live.entries()].filter(([, n]) => n > 0);
    expect(leaked).toStrictEqual([]);
  });

  it('a hidden-select change event while read-only commits nothing (autofill path)', () => {
    const onValid = vi.fn();
    const m = mountSelect({ value: 'beta', onValid, ...READONLY });
    const native = m.nativeSelect();
    if (!native) throw new Error('no hidden select');
    fireEvent.change(native, { target: { value: 'gamma' } });
    expect(m.api().getValues('role')).toBe('beta');
    expect(shownText(m.trigger())).toBe('Beta');
  });
});
