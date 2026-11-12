/**
 * @vitest-environment jsdom
 *
 * 005 SF-19 · Interaction contract of the focusable read-only mode (jsdom half).
 * INV-11 (callback spies), INV-12 (Escape), INV-13 (arrows), INV-14 (blur), INV-15 (AddressField
 * suggestions, incl. the list coming back when readonly ends), INV-16 (programmatic writes),
 * INV-18 (PasswordField toggle), INV-20 (reversible), INV-21 (implicit submit).
 *
 * Real `readonly` editing semantics (typing, paste, cut, undo) are asserted in Chromium in
 * `readonly-mode.sf19.browser.test.tsx`; jsdom does not block edits on `readonly` by itself.
 */
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

import { AddressField } from '../AddressField';
import { AmountField } from '../AmountField';
import { BytesField } from '../BytesField';
import { DateTimeField } from '../DateTimeField';
import { NumberField } from '../NumberField';
import { PasswordField } from '../PasswordField';
import { TextField } from '../TextField';
import {
  EDITABLE_OPTED_IN,
  FIELDS,
  fieldSpec,
  mountField,
  READONLY,
  type CommonFieldProps,
  type FieldSpec,
} from './readonly-mode.sf19-kit';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const HEX_A = '0x1234567890abcdef1234567890abcdef12345678';
const HEX_B = `0x${'b2'.repeat(20)}`;

/** Dispatch a keydown on the control; returns whether default was prevented. */
function key(el: Element, k: string, init: KeyboardEventInit = {}): boolean {
  return !fireEvent.keyDown(el, { key: k, ...init });
}

const touched = (m: ReturnType<typeof mountField>): boolean => m.api().getFieldState('v').isTouched;

describe('INV-12: Escape does nothing in readonly mode', () => {
  const cases = FIELDS.flatMap((spec) =>
    (['filled', 'empty'] as const).map((fill) => [spec.key, fill, spec] as const)
  );

  it.each(cases)('%s (%s): no write, no blur, not preventDefault-ed, bubbles', (_k, fill, spec) => {
    const parent = vi.fn();
    const m = mountField(spec, {
      ...READONLY,
      value: fill === 'empty' ? '' : spec.value,
      onFormKeyDown: (e) => {
        if (e.key === 'Escape') parent();
      },
    });
    const c = m.control();
    act(() => c.focus());
    const shown = c.value;
    const value = m.api().getValues('v');

    expect(key(c, 'Escape')).toBe(false);
    expect(c.value).toBe(shown);
    expect(m.api().getValues('v')).toStrictEqual(value);
    expect(document.activeElement).toBe(c);
    expect(parent).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])('DateTimeField clearOnEscape=%s: readonly Escape is inert', (clear) => {
    const m = mountField(fieldSpec('DateTimeField'), READONLY, (p) => (
      <DateTimeField {...p} clearOnEscape={clear} />
    ));
    expect(key(m.control(), 'Escape')).toBe(false);
    expect(m.api().getValues('v')).toBe('2026-01-01T10:00');
  });

  // Sensitivity: the same keystroke clears in editable mode, so the readonly case is a real guard.
  it.each(FIELDS.filter((s) => s.escapeClears).map((s) => [s.key, s] as const))(
    '%s editable (opted in): Escape clears as today',
    (_k, spec) => {
      const m = mountField(spec, EDITABLE_OPTED_IN);
      key(m.control(), 'Escape');
      expect(m.control().value).toBe('');
      expect([null, '', undefined]).toContain(m.api().getValues('v'));
    }
  );
});

describe('INV-13: arrow keys never step in readonly mode', () => {
  const number = (p: CommonFieldProps): React.ReactElement => (
    <NumberField {...p} min={1} max={10} />
  );

  it.each([
    ['mid', 5],
    ['min', 1],
    ['max', 10],
  ] as const)(
    'NumberField at %s (%s): ×3 up, ×3 down → unchanged, native default kept',
    (_l, v) => {
      const m = mountField(fieldSpec('NumberField'), { ...READONLY, value: v }, number);
      const c = m.control();
      for (const k of ['ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowDown']) {
        expect(key(c, k)).toBe(false);
      }
      expect(m.api().getValues('v')).toBe(v);
      expect(c.value).toBe(String(v));
    }
  );

  it('AmountField default branch: arrows do not step, not preventDefault-ed', () => {
    const m = mountField(fieldSpec('AmountField'), READONLY);
    const c = m.control();
    for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown']) expect(key(c, k)).toBe(false);
    expect(m.api().getValues('v')).toBe('1.5');
    expect(c.value).toBe('1.5');
  });

  it('AmountField exact branch: arrows stay inert (SF-10 INV-21)', () => {
    const m = mountField(fieldSpec('AmountFieldExact'), READONLY);
    key(m.control(), 'ArrowUp');
    key(m.control(), 'ArrowDown');
    expect(m.api().getValues('v')).toBe('1.5');
  });

  it('sensitivity: editable NumberField and AmountField step on ArrowUp', () => {
    const n = mountField(fieldSpec('NumberField'), { ...EDITABLE_OPTED_IN, value: 5 }, number);
    key(n.control(), 'ArrowUp');
    expect(n.api().getValues('v')).toBe(6);
    cleanup();
    const a = mountField(fieldSpec('AmountField'), EDITABLE_OPTED_IN);
    key(a.control(), 'ArrowUp');
    expect(a.api().getValues('v')).not.toBe('1.5');
  });
});

describe('INV-14: blur marks touched but never reformats in readonly mode', () => {
  it('AmountField default branch keeps 1.5 (editable formats to 1.50)', () => {
    const m = mountField(fieldSpec('AmountField'), READONLY);
    const c = m.control();
    act(() => c.focus());
    fireEvent.blur(c);
    expect(c.value).toBe('1.5');
    expect(m.api().getValues('v')).toBe('1.5');
    expect(touched(m)).toBe(true);
  });

  it('sensitivity: editable AmountField reformats 1.5 on blur', () => {
    const m = mountField(fieldSpec('AmountField'), EDITABLE_OPTED_IN);
    fireEvent.blur(m.control());
    expect(m.control().value).not.toBe('1.5');
  });

  const bytes = (p: CommonFieldProps): React.ReactElement => <BytesField {...p} autoPrefix />;

  it('BytesField autoPrefix keeps "abcd" in readonly mode, editable prefixes it', () => {
    const ro = mountField(fieldSpec('BytesField'), { ...READONLY, value: 'abcd' }, bytes);
    fireEvent.blur(ro.control());
    expect(ro.control().value).toBe('abcd');
    expect(ro.api().getValues('v')).toBe('abcd');
    expect(touched(ro)).toBe(true);
    cleanup();
    const ed = mountField(fieldSpec('BytesField'), { ...EDITABLE_OPTED_IN, value: 'abcd' }, bytes);
    fireEvent.blur(ed.control());
    expect(ed.api().getValues('v')).toBe('0xabcd');
  });

  it.each(FIELDS.map((s) => [s.key, s] as const))(
    '%s: blur in readonly mode marks touched, value unchanged',
    async (_k, spec) => {
      vi.useFakeTimers();
      const m = mountField(spec, READONLY);
      const before = m.api().getValues('v');
      fireEvent.blur(m.control());
      await act(async () => {
        vi.runAllTimers(); // PasswordField defers field.onBlur with setTimeout(0)
      });
      expect(touched(m)).toBe(true);
      expect(m.api().getValues('v')).toStrictEqual(before);
    }
  );
});

describe('INV-15: AddressField suggestions are off in readonly mode', () => {
  const COMBOBOX_ATTRS = ['aria-expanded', 'aria-controls', 'aria-activedescendant'];

  function mountWithList(onSuggestionSelect = vi.fn()): ReturnType<typeof mountField> {
    return mountField(fieldSpec('AddressField'), { ...EDITABLE_OPTED_IN, value: '' }, (p) => (
      <AddressField
        {...p}
        suggestions={[
          { label: 'Alice', value: HEX_A },
          { label: 'Bob', value: HEX_B },
        ]}
        onSuggestionSelect={onSuggestionSelect}
      />
    ));
  }

  function openAndHighlight(m: ReturnType<typeof mountField>): void {
    const c = m.control();
    act(() => c.focus());
    fireEvent.change(c, { target: { value: '0x' } });
    key(c, 'ArrowDown');
    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(c.getAttribute('aria-activedescendant')).toBe('f-suggestion-0');
    expect(c.getAttribute('aria-expanded')).toBe('true');
  }

  it('an open, highlighted list closes at the switch; no combobox ARIA; Enter applies nothing', () => {
    const select = vi.fn();
    const native = vi.fn();
    const m = mountField(
      fieldSpec('AddressField'),
      { ...EDITABLE_OPTED_IN, value: '', onNativeSubmit: native },
      (p) => (
        <AddressField
          {...p}
          suggestions={[{ label: 'Alice', value: HEX_A }]}
          onSuggestionSelect={select}
        />
      )
    );
    openAndHighlight(m);
    const c = m.control();

    m.set({ readOnly: true });
    expect(screen.queryByRole('listbox')).toBeNull();
    for (const a of [...COMBOBOX_ATTRS, 'aria-autocomplete']) {
      expect(c.hasAttribute(a), a).toBe(false);
    }
    expect(document.activeElement).toBe(c);

    expect(key(c, 'Enter')).toBe(false);
    expect(key(c, 'ArrowDown')).toBe(false);
    expect(select).not.toHaveBeenCalled();
    expect(c.value).toBe('0x');
    expect(m.api().getValues('v')).toBe('0x');
  });

  it('readonly mode from mount: typing-free list never renders', () => {
    const m = mountField(fieldSpec('AddressField'), READONLY, (p) => (
      <AddressField {...p} suggestions={[{ label: 'Alice', value: HEX_A }]} />
    ));
    key(m.control(), 'ArrowDown');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(m.control().hasAttribute('aria-expanded')).toBe(false);
  });

  // Pinned on purpose (Code drift note, Orchestrator ask): the hook's open/highlight state is not
  // reset at the switch (that would need new state or an effect, INV-23), so a list that was
  // open when the save started comes back with the same highlight when readonly mode ends.
  // INV-15 reads "exactly as before the switch". If the dev wants it closed instead, this flips.
  it('the list that was open before the switch reappears, same highlight, when readonly ends', () => {
    const select = vi.fn();
    const m = mountWithList(select);
    openAndHighlight(m);
    m.set({ readOnly: true });
    expect(screen.queryByRole('listbox')).toBeNull();

    m.set({ readOnly: false });
    const c = m.control();
    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(c.getAttribute('aria-expanded')).toBe('true');
    expect(c.getAttribute('aria-activedescendant')).toBe('f-suggestion-0');
    expect(c.getAttribute('aria-controls')).toBe('f-suggestions');
    expect(c.getAttribute('aria-autocomplete')).toBe('list');

    // ...and it is live again: Enter applies the highlighted item as today.
    expect(key(c, 'Enter')).toBe(true);
    expect(select).toHaveBeenCalledTimes(1);
    expect(m.api().getValues('v')).toBe(HEX_A);
  });

  it('a closed list stays closed when readonly ends, and opens on the next edit', () => {
    const m = mountWithList();
    m.set({ readOnly: true });
    m.set({ readOnly: false });
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.change(m.control(), { target: { value: '0x1' } });
    expect(screen.getByRole('listbox')).toBeTruthy();
  });
});

describe('INV-11: no kit edit callback fires in readonly mode (jsdom spies)', () => {
  it('TextField onUserEdit: user-event typing, paste, clear on a readonly control', async () => {
    const onUserEdit = vi.fn();
    const m = mountField(fieldSpec('TextField'), READONLY, (p) => (
      <TextField {...p} onUserEdit={onUserEdit} />
    ));
    const user = userEvent.setup();
    const c = m.control();
    await user.click(c);
    await user.keyboard('xyz{Backspace}{Delete}');
    await user.paste('pasted');
    await user.clear(c).catch(() => undefined); // user-event refuses to clear a readonly control
    key(c, 'Escape');
    expect(onUserEdit).not.toHaveBeenCalled();
    expect(c.value).toBe('hello');
    expect(m.api().getValues('v')).toBe('hello');
  });

  it('sensitivity: TextField onUserEdit fires on an editable keystroke', async () => {
    const onUserEdit = vi.fn();
    const m = mountField(fieldSpec('TextField'), EDITABLE_OPTED_IN, (p) => (
      <TextField {...p} onUserEdit={onUserEdit} />
    ));
    const user = userEvent.setup();
    await user.type(m.control(), 'x');
    expect(onUserEdit).toHaveBeenCalledWith('hellox');
  });

  it.each(FIELDS.filter((s) => s.selectable).map((s) => [s.key, s] as const))(
    '%s: user-event typing leaves value and form value unchanged',
    async (_k, spec) => {
      const m = mountField(spec, READONLY);
      const user = userEvent.setup();
      const c = m.control();
      const before = { shown: c.value, v: m.api().getValues('v') };
      await user.click(c);
      await user.keyboard('9x{Backspace}');
      expect(c.value).toBe(before.shown);
      expect(m.api().getValues('v')).toStrictEqual(before.v);
    }
  );
});

describe('INV-16: programmatic writes still land in readonly mode', () => {
  const NEXT: Record<string, { value: unknown; shown: string }> = {
    TextField: { value: 'saved', shown: 'saved' },
    TextAreaField: { value: 'saved\ntext', shown: 'saved\ntext' },
    NumberField: { value: 9, shown: '9' },
    BigIntField: { value: '999', shown: '999' },
    AmountField: { value: '2.25', shown: '2.25' },
    AmountFieldExact: { value: '1,000', shown: '1,000' },
    UrlField: { value: 'https://saved.example', shown: 'https://saved.example' },
    PasswordField: { value: 'n3w', shown: 'n3w' },
    BytesField: { value: '0xbeef', shown: '0xbeef' },
    AddressField: { value: HEX_B, shown: HEX_B },
    DateTimeField: { value: '2027-05-06T07:08', shown: '2027-05-06T07:08' },
  };

  it.each(FIELDS.map((s) => [s.key, s] as const))(
    '%s: setValue, resetField and reset update display and value',
    (_k, spec: FieldSpec) => {
      const m = mountField(spec, READONLY);
      const next = NEXT[spec.key];
      act(() => m.api().setValue('v', next.value));
      expect(m.control().value).toBe(next.shown);
      expect(m.api().getValues('v')).toStrictEqual(next.value);

      act(() => m.api().resetField('v'));
      expect(m.control().value).toBe(spec.display);

      act(() => m.api().setValue('v', next.value));
      act(() => m.api().reset());
      expect(m.control().value).toBe(spec.display);
      expect(m.api().getValues('v')).toStrictEqual(spec.value);
    }
  );
});

describe('INV-18: PasswordField toggle in readonly mode', () => {
  it('stays rendered, toggles visibility, value unchanged', () => {
    const m = mountField(fieldSpec('PasswordField'), READONLY);
    const toggle = screen.getByRole('button', { name: 'Show password' });
    fireEvent.click(toggle);
    expect(m.control().getAttribute('type')).toBe('text');
    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(m.control().getAttribute('type')).toBe('password');
    expect(m.control().value).toBe('secret');
    expect(m.api().getValues('v')).toBe('secret');
  });

  it('a focused toggle keeps focus (same node) across the switch into readonly mode', () => {
    const m = mountField(fieldSpec('PasswordField'), EDITABLE_OPTED_IN);
    const toggle = screen.getByRole('button', { name: 'Show password' });
    act(() => toggle.focus());
    m.set({ readOnly: true });
    expect(screen.getByRole('button', { name: 'Show password' })).toBe(toggle);
    expect(document.activeElement).toBe(toggle);
  });

  it('default readOnly hides the toggle, as today', () => {
    mountField(fieldSpec('PasswordField'), { readOnly: true });
    expect(screen.queryByRole('button', { name: /password/i })).toBeNull();
  });

  it('showToggle=false stays hidden in readonly mode', () => {
    mountField(fieldSpec('PasswordField'), READONLY, (p) => (
      <PasswordField {...p} showToggle={false} />
    ));
    expect(screen.queryByRole('button', { name: /password/i })).toBeNull();
  });
});

describe('INV-20: switching back leaves no residue', () => {
  it.each(FIELDS.map((s) => [s.key, s] as const))(
    '%s: after readonly → editable ×2, typing and Escape-clear work again',
    (_k, spec) => {
      const m = mountField(spec, EDITABLE_OPTED_IN);
      for (const readOnly of [true, false, true, false]) m.set({ readOnly });
      const c = m.control();
      expect(c.readOnly).toBe(false);
      expect(c.hasAttribute('data-readonly')).toBe(false);
      fireEvent.change(c, {
        target: { value: spec.key === 'DateTimeField' ? '2026-03-03T03:03' : '7' },
      });
      expect(c.value).not.toBe(spec.display);
      if (spec.escapeClears) {
        key(c, 'Escape');
        expect(c.value).toBe('');
      }
    }
  );

  it('NumberField steps, AmountField and BytesField reformat, TextField reports edits again', () => {
    const n = mountField(fieldSpec('NumberField'), { ...EDITABLE_OPTED_IN, value: 5 });
    n.set({ readOnly: true });
    n.set({ readOnly: false });
    key(n.control(), 'ArrowUp');
    expect(n.api().getValues('v')).toBe(6);
    cleanup();

    const a = mountField(fieldSpec('AmountField'), EDITABLE_OPTED_IN, (p) => (
      <AmountField {...p} />
    ));
    a.set({ readOnly: true });
    a.set({ readOnly: false });
    fireEvent.blur(a.control());
    expect(a.control().value).not.toBe('1.5');
    cleanup();

    const b = mountField(fieldSpec('BytesField'), { ...EDITABLE_OPTED_IN, value: 'abcd' }, (p) => (
      <BytesField {...p} autoPrefix />
    ));
    b.set({ readOnly: true });
    b.set({ readOnly: false });
    fireEvent.blur(b.control());
    expect(b.api().getValues('v')).toBe('0xabcd');
    cleanup();

    const onUserEdit = vi.fn();
    const t = mountField(fieldSpec('TextField'), EDITABLE_OPTED_IN, (p) => (
      <TextField {...p} onUserEdit={onUserEdit} />
    ));
    t.set({ readOnly: true });
    t.set({ readOnly: false });
    fireEvent.change(t.control(), { target: { value: 'again' } });
    expect(onUserEdit).toHaveBeenCalledWith('again');
  });
});

describe('INV-21: implicit submission is unchanged', () => {
  it('Enter in a readonly TextField is not preventDefault-ed by the kit and submits once', async () => {
    const native = vi.fn();
    const m = mountField(fieldSpec('TextField'), {
      ...READONLY,
      onNativeSubmit: native,
      after: <button type="submit">Save</button>,
    });
    const user = userEvent.setup();
    await user.click(m.control());
    await user.keyboard('{Enter}');
    expect(native).toHaveBeenCalledTimes(1);
  });

  it('editable AddressField with a highlighted suggestion: Enter applies it and does not submit', async () => {
    const native = vi.fn();
    const m = mountField(
      fieldSpec('AddressField'),
      {
        ...EDITABLE_OPTED_IN,
        value: '',
        onNativeSubmit: native,
        after: <button type="submit">Save</button>,
      },
      (p) => <AddressField {...p} suggestions={[{ label: 'Alice', value: HEX_A }]} />
    );
    const user = userEvent.setup();
    await user.click(m.control());
    await user.keyboard('0{ArrowDown}{Enter}');
    expect(native).not.toHaveBeenCalled();
    expect(m.api().getValues('v')).toBe(HEX_A);
  });

  it('readonly AddressField: Enter submits (no suggestion path)', async () => {
    const native = vi.fn();
    const m = mountField(
      fieldSpec('AddressField'),
      { ...READONLY, onNativeSubmit: native, after: <button type="submit">Save</button> },
      (p) => <AddressField {...p} suggestions={[{ label: 'Alice', value: HEX_A }]} />
    );
    const user = userEvent.setup();
    await user.click(m.control());
    await user.keyboard('{Enter}');
    expect(native).toHaveBeenCalledTimes(1);
  });
});
