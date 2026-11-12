/**
 * 006 SF-2 · Chromium half of AmountField's default `readOnly`: it behaves like TextField in
 * default mode (DOM-disabled, no user input reaches it, the value leaves the payload), and
 * `readOnlyMode="readonly"` is unchanged.
 * INV-1 (no user edit path), INV-2 (TextField parity), INV-3 (dirty toggle), INV-4 (readonly
 * mode unchanged). The accessibility tree (disabled, not readonly) is covered for the two
 * AmountFields by the sf19 browser file, whose default-mode rows no longer exclude them.
 */
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import { fieldSpec, mountField, type FieldSpec } from './readonly-mode.sf19-kit';

afterEach(() => cleanup());

const AMOUNTS = ['AmountField', 'AmountFieldExact'] as const;
const MODES = [undefined, 'disabled'] as const;
const MOD = (k: string): string => `{ControlOrMeta>}${k}{/ControlOrMeta}`;

interface Observed {
  shown: string;
  form: unknown;
  focused: boolean;
}

/** Click (forced), type, paste, Escape on the control; report what changed. */
async function poke(spec: FieldSpec, props: Parameters<typeof mountField>[1]): Promise<Observed> {
  const m = mountField(spec, props);
  const c = m.control();
  await userEvent.click(c, { force: true }).catch(() => undefined);
  await userEvent.keyboard('9{Backspace}{Delete}');
  await userEvent.keyboard(MOD('v'));
  await userEvent.keyboard('{Escape}');
  return { shown: c.value, form: m.api().getValues('v'), focused: document.activeElement === c };
}

describe('INV-1 / INV-2: default read-only AmountField takes no input, like TextField', () => {
  it.each(AMOUNTS.flatMap((key) => MODES.map((mode) => [key, mode] as const)))(
    '%s · mode %s: click, type, paste, Escape leave value and form untouched',
    async (key, mode) => {
      const spec = fieldSpec(key);
      const got = await poke(spec, { readOnly: true, readOnlyMode: mode });
      expect(got).toStrictEqual({ shown: spec.value, form: spec.value, focused: false });
      cleanup();
      const text = fieldSpec('TextField');
      const ref = await poke(text, { readOnly: true, readOnlyMode: mode });
      expect({ ...ref, shown: undefined, form: undefined }).toStrictEqual({
        ...got,
        shown: undefined,
        form: undefined,
      });
    }
  );

  it.each(AMOUNTS)('%s · sensitivity: the same keys do edit an editable field', async (key) => {
    const spec = fieldSpec(key);
    const m = mountField(spec, { readOnly: false });
    const c = m.control();
    await userEvent.click(c);
    expect(document.activeElement).toBe(c);
    await userEvent.keyboard('9');
    expect(c.value).not.toBe(spec.value);
  });

  it.each(AMOUNTS)('%s · Tab skips a default read-only field', async (key) => {
    const m = mountField(fieldSpec(key), {
      readOnly: true,
      after: <input data-testid="after" aria-label="after" />,
    });
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByTestId('after'));
    expect(document.activeElement).not.toBe(m.control());
  });
});

describe('INV-3: toggling readOnly with a dirty value', () => {
  it.each(AMOUNTS)('%s · typed value survives lock and unlock, payload follows', async (key) => {
    const m = mountField(fieldSpec(key), { readOnly: false });
    const c = m.control();
    await userEvent.click(c);
    await userEvent.keyboard('{Control>}a{/Control}7');
    const typed = c.value;
    m.set({ readOnly: true });
    expect(m.control()).toBe(c);
    expect(c.disabled).toBe(true);
    expect(c.value).toBe(typed);
    expect(document.activeElement).toBe(document.body);
    expect((await m.submit()).data).toStrictEqual({});
    m.set({ readOnly: false });
    expect(m.control()).toBe(c);
    expect(c.disabled).toBe(false);
    expect(c.value).toBe(typed);
    expect((await m.submit()).data?.v).toBe(typed);
  });
});

describe('INV-4: readonly mode is unchanged', () => {
  it.each(AMOUNTS)(
    '%s · focusable, readonly, not disabled, keys ignored, value kept',
    async (key) => {
      const spec = fieldSpec(key);
      const m = mountField(spec, { readOnly: true, readOnlyMode: 'readonly' });
      const c = m.control();
      await userEvent.click(c);
      expect(document.activeElement).toBe(c);
      expect(c.readOnly).toBe(true);
      expect(c.disabled).toBe(false);
      await userEvent.keyboard('9{Backspace}');
      expect(c.value).toBe(spec.value);
      expect((await m.submit()).data).toStrictEqual({ v: spec.value });
    }
  );
});
