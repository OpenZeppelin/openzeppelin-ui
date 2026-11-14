/**
 * 005 SF-19 · Chromium half of the focusable read-only mode: what only a real browser decides.
 * INV-11 (real typing, paste, cut, undo), INV-12 (Escape reaches a Radix Dialog), INV-17 (select
 * and copy), INV-19 (datetime-local picker), INV-21 (native Enter submit), INV-29 (focus and
 * selection survive the switch; disabled drops focus to <body> as the sensitivity control),
 * INV-30 (accessibility tree via CDP: read-only, not disabled, same name and description), and an
 * axe parity check. Styles are not loaded in this runner; the look (INV-3, INV-4) is measured in
 * the example app (`examples/basic-react-app/e2e/readonly-save.sf19.spec.ts`).
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cdp, userEvent } from 'vitest/browser';
import React, { useState } from 'react';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../ui/dialog';
import { DateTimeField } from '../DateTimeField';
import { PasswordField } from '../PasswordField';
import { TextField } from '../TextField';
import {
  EDITABLE_OPTED_IN,
  FIELDS,
  fieldSpec,
  Host,
  mountField,
  READONLY,
  type FieldSpec,
  type FormHandle,
  type MountOptions,
} from './readonly-mode.sf19-kit';

afterEach(() => cleanup());

const SINK = <textarea data-testid="sink" aria-label="sink" />;
const sink = (): HTMLTextAreaElement => screen.getByTestId('sink') as HTMLTextAreaElement;
const MOD = (k: string): string => `{ControlOrMeta>}${k}{/ControlOrMeta}`;

/** Put `text` on the system clipboard through a real copy from the sink. */
async function clipboardHolds(text: string): Promise<void> {
  const s = sink();
  s.value = text;
  await userEvent.click(s);
  await userEvent.keyboard(MOD('a') + MOD('c'));
  s.value = '';
}

const TEXT_FIELDS = FIELDS.filter((s) => s.key !== 'DateTimeField');

describe('INV-11: no real edit path changes a readonly field', () => {
  it.each(TEXT_FIELDS.map((s) => [s.key, s] as const))(
    '%s: type, Backspace, Delete, paste, cut, undo, redo → unchanged',
    async (_k, spec) => {
      const m = mountField(spec, { ...READONLY, after: SINK });
      const c = m.control();
      const before = { shown: c.value, v: m.api().getValues('v') };
      await clipboardHolds('PASTED');

      await userEvent.click(c);
      await userEvent.keyboard('x9 {Backspace}{Delete}');
      await userEvent.keyboard(MOD('v'));
      await userEvent.keyboard(MOD('a') + MOD('x'));
      await userEvent.keyboard(MOD('z') + '{ControlOrMeta>}{Shift>}z{/Shift}{/ControlOrMeta}');

      expect(c.value).toBe(before.shown);
      expect(m.api().getValues('v')).toStrictEqual(before.v);
      expect(document.activeElement).toBe(c);
    }
  );

  it('sensitivity: the same keyboard and paste edit an opted-in editable TextField', async () => {
    const onUserEdit = vi.fn();
    const m = mountField(fieldSpec('TextField'), { ...EDITABLE_OPTED_IN, after: SINK }, (p) => (
      <TextField {...p} onUserEdit={onUserEdit} />
    ));
    await clipboardHolds('PASTED');
    await userEvent.click(m.control());
    await userEvent.keyboard('{End}x');
    expect(m.control().value).toBe('hellox');
    await userEvent.keyboard(MOD('v'));
    expect(m.api().getValues('v')).toBe('helloxPASTED');
    expect(onUserEdit).toHaveBeenCalled();
  });

  it('TextField onUserEdit never fires for real keystrokes in readonly mode', async () => {
    const onUserEdit = vi.fn();
    const m = mountField(fieldSpec('TextField'), READONLY, (p) => (
      <TextField {...p} onUserEdit={onUserEdit} />
    ));
    await userEvent.click(m.control());
    await userEvent.keyboard('abc{Backspace}{Escape}');
    expect(onUserEdit).not.toHaveBeenCalled();
  });
});

describe('INV-17: select and copy work in readonly mode', () => {
  const COPYABLE = TEXT_FIELDS.filter((s) => s.key !== 'PasswordField');

  it.each(COPYABLE.map((s) => [s.key, s] as const))(
    '%s: Cmd/Ctrl+A selects everything, Cmd/Ctrl+C copies the displayed value',
    async (_k, spec) => {
      const m = mountField(spec, { ...READONLY, after: SINK });
      const c = m.control();
      await userEvent.click(c);
      await userEvent.keyboard(MOD('a'));
      expect(c.selectionStart).toBe(0);
      expect(c.selectionEnd).toBe(c.value.length);
      await userEvent.keyboard(MOD('c'));
      await userEvent.click(sink());
      await userEvent.keyboard(MOD('v'));
      expect(sink().value).toBe(c.value);
    }
  );

  it('double-click selects a word; Shift+Arrow behaves exactly like a plain native readonly input', async () => {
    const m = mountField(fieldSpec('TextField'), {
      ...READONLY,
      value: 'hello world',
      after: <input data-testid="native" aria-label="native" defaultValue="hello world" readOnly />,
    });
    const c = m.control();
    await userEvent.dblClick(c);
    expect(c.value.slice(c.selectionStart ?? 0, c.selectionEnd ?? 0).trim()).not.toBe('');

    // Chromium moves no caret in any readonly input (Shift+Arrow selects nothing, even natively);
    // the kit must add no difference on top of the platform.
    const shiftSelect = async (el: HTMLInputElement): Promise<[number | null, number | null]> => {
      await userEvent.click(el);
      el.setSelectionRange(0, 0);
      await userEvent.keyboard('{Shift>}{ArrowRight}{ArrowRight}{ArrowRight}{/Shift}');
      return [el.selectionStart, el.selectionEnd];
    };
    const native = screen.getByTestId('native') as HTMLInputElement;
    expect(await shiftSelect(c as HTMLInputElement)).toStrictEqual(await shiftSelect(native));
  });

  it('PasswordField: masked text copies nothing (browser rule); revealed text copies', async () => {
    const m = mountField(fieldSpec('PasswordField'), { ...READONLY, after: SINK });
    await clipboardHolds('BEFORE');
    await userEvent.click(m.control());
    await userEvent.keyboard(MOD('a') + MOD('c'));
    await userEvent.click(sink());
    await userEvent.keyboard(MOD('v'));
    expect(sink().value).not.toBe('secret');

    sink().value = '';
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    await userEvent.click(m.control());
    await userEvent.keyboard(MOD('a') + MOD('c'));
    await userEvent.click(sink());
    await userEvent.keyboard(MOD('v'));
    expect(sink().value).toBe('secret');
    expect(m.api().getValues('v')).toBe('secret');
  });
});

describe('INV-19: DateTimeField picker and segments cannot change a readonly value', () => {
  it('showPicker refuses; click, arrows, digits, Backspace/Delete, Space, Alt+Down, Escape → unchanged', async () => {
    const m = mountField(fieldSpec('DateTimeField'), READONLY);
    const c = m.control() as HTMLInputElement;
    let pickerError = 'none';
    try {
      c.showPicker();
    } catch (e) {
      pickerError = (e as Error).name;
    }
    expect(pickerError).toBe('InvalidStateError');

    const steps = [
      '{ArrowUp}{ArrowUp}{ArrowDown}',
      '5',
      '{Backspace}{Delete}',
      ' ',
      '{Enter}',
      '{Alt>}{ArrowDown}{/Alt}',
      '{Escape}',
    ];
    await userEvent.click(c);
    for (const step of steps) {
      await userEvent.keyboard(step);
      expect(c.value, step).toBe('2026-01-01T10:00');
      expect(m.api().getValues('v'), step).toBe('2026-01-01T10:00');
    }
  });

  it('sensitivity: ArrowUp changes an opted-in editable value', async () => {
    const m = mountField(fieldSpec('DateTimeField'), EDITABLE_OPTED_IN, (p) => (
      <DateTimeField {...p} />
    ));
    await userEvent.click(m.control());
    await userEvent.keyboard('{ArrowUp}');
    expect(m.control().value).not.toBe('2026-01-01T10:00');
  });
});

describe('INV-29: focus, caret and selection survive the switch', () => {
  it.each(FIELDS.map((s) => [s.key, s] as const))(
    '%s: editable → readonly → editable keeps activeElement and selection',
    async (_k, spec) => {
      // NumberField's default `5` is one character; use a value long enough for a 1..3 range.
      const value = spec.key === 'NumberField' ? 12345 : spec.value;
      const m = mountField(spec, { ...EDITABLE_OPTED_IN, value });
      const c = m.control();
      await userEvent.click(c);
      if (spec.selectable) c.setSelectionRange(1, 3);
      for (const readOnly of [true, false, true]) {
        m.set({ readOnly });
        expect(document.activeElement).toBe(c);
        if (spec.selectable) {
          expect([c.selectionStart, c.selectionEnd]).toStrictEqual([1, 3]);
        }
      }
    }
  );

  // Sensitivity: the default mode really does drop focus in Chromium, so the test above can fail.
  it.each(
    FIELDS.filter((s) => !['TextAreaField', 'AmountField', 'AmountFieldExact'].includes(s.key)).map(
      (s) => [s.key, s] as const
    )
  )("%s: default mode (today's disabled) drops focus to <body>", async (_k, spec) => {
    const m = mountField(spec, { readOnly: false });
    await userEvent.click(m.control());
    m.set({ readOnly: true });
    expect(document.activeElement).toBe(document.body);
  });

  it('PasswordField: a focused toggle keeps focus across the switch', async () => {
    const m = mountField(fieldSpec('PasswordField'), EDITABLE_OPTED_IN, (p) => (
      <PasswordField {...p} />
    ));
    const toggle = screen.getByRole('button', { name: 'Show password' });
    await userEvent.click(toggle);
    m.set({ readOnly: true });
    expect(document.activeElement).toBe(toggle);
  });

  it('Tab reaches every readonly field in order', async () => {
    const handle: FormHandle = { api: null };
    render(
      <Host
        handle={handle}
        defaultValues={Object.fromEntries(FIELDS.map((s, i) => [`f${i}`, s.value]))}
        formMode="onSubmit"
      >
        {(control) => (
          <>
            <button type="button">Start</button>
            {FIELDS.map((s, i) => (
              <React.Fragment key={s.key}>
                {s.el({ ...READONLY, id: `f${i}`, name: `f${i}`, label: s.key, control })}
              </React.Fragment>
            ))}
          </>
        )}
      </Host>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Start' }));
    const reached: string[] = [];
    for (let i = 0; i < 20 && reached.length < FIELDS.length; i++) {
      await userEvent.tab();
      const id = document.activeElement?.id ?? '';
      if (/^f\d+$/.test(id) && !reached.includes(id)) reached.push(id);
    }
    expect(reached).toStrictEqual(FIELDS.map((_s, i) => `f${i}`));
  });
});

interface AXNode {
  role?: { value: string };
  name?: { value: string };
  description?: { value: string };
  properties?: Array<{ name: string; value: { value: unknown } }>;
}

/** The AX node for the focusable control named `name`, read from the test iframe via CDP. */
async function axControl(name: string): Promise<{
  role: string | undefined;
  name: string | undefined;
  description: string | undefined;
  props: Record<string, unknown>;
}> {
  type Frame = { frame: { id: string; url: string }; childFrames?: Frame[] };
  const session = cdp();
  const { frameTree } = (await session.send('Page.getFrameTree', {})) as { frameTree: Frame };
  const frames: Frame[] = [];
  const walk = (f: Frame): void => {
    frames.push(f);
    (f.childFrames ?? []).forEach(walk);
  };
  walk(frameTree);
  const testFrame = frames.find((f) => f.frame.url.includes('iframeId='));
  if (!testFrame) throw new Error('test iframe not found');
  const { nodes } = (await session.send('Accessibility.getFullAXTree', {
    frameId: testFrame.frame.id,
  })) as { nodes: AXNode[] };
  const hits = nodes.filter(
    (n) =>
      n.name?.value === name &&
      (n.properties ?? []).some((p) => p.name === 'focusable' || p.name === 'disabled') &&
      n.role?.value !== 'button'
  );
  if (hits.length !== 1) throw new Error(`expected one control named ${name}, got ${hits.length}`);
  const n = hits[0];
  return {
    role: n.role?.value,
    name: n.name?.value,
    description: n.description?.value,
    props: Object.fromEntries((n.properties ?? []).map((p) => [p.name, p.value.value])),
  };
}

describe('INV-30: assistive tech reports read-only, not disabled', () => {
  const TEXTBOXES = FIELDS.filter((s) => s.key !== 'DateTimeField');

  it.each(TEXTBOXES.map((s) => [s.key, s] as const))(
    '%s: readonly true, not settable, no disabled, focusable, same role/name/description as editable',
    async (_k, spec) => {
      const m = mountField(spec, EDITABLE_OPTED_IN);
      const editable = await axControl('Label');
      m.set({ readOnly: true });
      const ro = await axControl('Label');

      expect(ro.props.readonly).toBe(true);
      expect(ro.props.settable).toBeUndefined();
      expect(ro.props.disabled).toBeUndefined();
      expect(ro.props.focusable).toBe(true);
      expect(editable.props.readonly).not.toBe(true);
      expect({ role: ro.role, name: ro.name, description: ro.description }).toStrictEqual({
        role: editable.role,
        name: editable.name,
        description: editable.description,
      });
    }
  );

  it('DateTimeField: focusable, not disabled, same role/name/description as editable', async () => {
    const m = mountField(fieldSpec('DateTimeField'), EDITABLE_OPTED_IN);
    const editable = await axControl('Label');
    m.set({ readOnly: true });
    const ro = await axControl('Label');
    expect(ro.props.disabled).toBeUndefined();
    expect(ro.props.focusable).toBe(true);
    expect({ role: ro.role, name: ro.name, description: ro.description }).toStrictEqual({
      role: editable.role,
      name: editable.name,
      description: editable.description,
    });
  });

  // GAP (reported to the Orchestrator): Chromium does not map native `readonly` on
  // `<input type="datetime-local">` into the accessibility tree. The node (role DateTime) stays
  // `settable: true` with no `readonly` property, exactly like an editable one, so assistive tech
  // can't tell the field is read-only. Probe: plain `<input type="datetime-local" readonly>`
  // gives the same result, so this is platform behaviour, not a kit wiring bug. `aria-readonly`
  // drops `settable` (still no `readonly` property). Expected to fail until a fix lands; when
  // it starts passing, `it.fails` turns red and this pin must be flipped to `it`.
  it.fails(
    'DateTimeField: AX does not report a readonly field as settable (INV-30 gap)',
    async () => {
      mountField(fieldSpec('DateTimeField'), READONLY);
      const ro = await axControl('Label');
      expect(ro.props.settable).toBeUndefined();
    }
  );

  it.each(
    FIELDS.filter((s) => !['TextAreaField', 'AmountField', 'AmountFieldExact'].includes(s.key)).map(
      (s) => [s.key, s] as const
    )
  )(
    'sensitivity: %s default readOnly is exposed as disabled (today)',
    async (_k, spec: FieldSpec) => {
      mountField(spec, { readOnly: true });
      const ax = await axControl('Label');
      expect(ax.props.disabled).toBe(true);
      expect(ax.props.readonly).not.toBe(true);
    }
  );
});

describe('INV-12 / INV-21: native key behaviour reaches the page', () => {
  function DialogForm({ readOnlyMode }: Pick<MountOptions, 'readOnlyMode'>): React.ReactElement {
    const [open, setOpen] = useState(true);
    const handle: FormHandle = { api: null };
    return (
      <>
        <p data-testid="dialog-state">{open ? 'open' : 'closed'}</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogTitle>Saving</DialogTitle>
            <DialogDescription>Form locked while saving</DialogDescription>
            <Host handle={handle} defaultValues={{ v: 'hello' }} formMode="onSubmit">
              {(control) => (
                <TextField
                  id="f"
                  name="v"
                  label="Label"
                  control={control}
                  readOnly
                  readOnlyMode={readOnlyMode}
                />
              )}
            </Host>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  it('Escape in a readonly field inside a Radix Dialog closes the dialog (not swallowed)', async () => {
    render(<DialogForm readOnlyMode="readonly" />);
    const c = document.getElementById('f') as HTMLInputElement;
    await userEvent.click(c);
    expect(document.activeElement).toBe(c);
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => screen.getByTestId('dialog-state').textContent).toBe('closed');
  });

  it('Enter in a readonly single-line field submits the form once; in a TextAreaField it does not', async () => {
    const submit = vi.fn();
    const m = mountField(fieldSpec('TextField'), {
      ...READONLY,
      onNativeSubmit: submit,
      after: <button type="submit">Save</button>,
    });
    await userEvent.click(m.control());
    await userEvent.keyboard('{Enter}');
    expect(submit).toHaveBeenCalledTimes(1);
    cleanup();

    const ta = mountField(fieldSpec('TextAreaField'), {
      ...READONLY,
      onNativeSubmit: submit,
      after: <button type="submit">Save</button>,
    });
    await userEvent.click(ta.control());
    await userEvent.keyboard('{Enter}');
    expect(submit).toHaveBeenCalledTimes(1);
    expect(ta.control().value).toBe('multi line');
  });
});

describe('axe: readonly mode adds no violation over editable mode', () => {
  async function violations(spec: FieldSpec, opts: MountOptions): Promise<string[]> {
    const m = mountField(spec, opts);
    const results = await axe.run(m.host(), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    });
    act(() => m.unmount());
    return results.violations.map((v) => v.id).sort();
  }

  // Readonly mode may only remove violations. Editable AddressField has a pre-existing
  // `aria-allowed-attr` (aria-expanded on a plain textbox, reported out of scope); readonly mode
  // drops aria-expanded (INV-15), so it has none.
  it.each(FIELDS.map((s) => [s.key, s] as const))(
    '%s: zero violations in readonly mode, none new',
    async (_k, spec) => {
      const editable = await violations(spec, EDITABLE_OPTED_IN);
      const ro = await violations(spec, READONLY);
      expect(ro.filter((id) => !editable.includes(id))).toStrictEqual([]);
      expect(ro).toStrictEqual([]);
    }
  );
});
