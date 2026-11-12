/**
 * 006 SF-3 · TextAreaField default `readOnly` matches its siblings (Chromium half).
 *
 * - INV-6: in default read-only, click, type, paste, Escape, Tab and Shift+Tab reach neither the
 *   control nor the form value, exactly as for TextField with `readOnly`.
 * - INV-7: switching `readOnly` on with a dirty, focused value drops focus to <body>, keeps the
 *   text and the node, and drops the value from the payload; switching back restores all three.
 * - INV-11: the accessibility tree reports the control as disabled (not read-only), with the same
 *   role, name and description as the editable control, and no ARIA override.
 * The jsdom half (INV-1, INV-2, INV-3, INV-5, INV-8) is `textarea-readonly.sf3.test.tsx`.
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';
import { cdp, userEvent } from 'vitest/browser';
import React from 'react';

import type { ReadOnlyMode } from '../BaseField';
import { TextAreaField } from '../TextAreaField';
import { TextField } from '../TextField';
import {
  fieldSpec,
  Host,
  mountField,
  type CommonFieldProps,
  type FormHandle,
  type MountedField,
} from './readonly-mode.sf19-kit';

afterEach(() => cleanup());

type Key = 'TextField' | 'TextAreaField';
const PARITY: readonly Key[] = ['TextField', 'TextAreaField'];
const DEFAULT_MODES: ReadonlyArray<[string, ReadOnlyMode | undefined]> = [
  ['mode absent', undefined],
  ["mode 'disabled'", 'disabled'],
];

function renderAs(key: Key): (p: CommonFieldProps) => React.ReactElement {
  return function RenderField(p: CommonFieldProps): React.ReactElement {
    return key === 'TextField' ? <TextField {...p} /> : <TextAreaField {...p} />;
  };
}

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

/** Click (forced: Playwright refuses a disabled target), type, paste and Escape at the control. */
async function tryToEdit(m: MountedField): Promise<{
  focused: boolean;
  shown: string;
  value: unknown;
}> {
  const c = m.control();
  await clipboardHolds('PASTED');
  await userEvent.click(c, { force: true });
  const focused = document.activeElement === c;
  await userEvent.keyboard('x9{Backspace}{Enter}');
  await userEvent.keyboard(MOD('v'));
  await userEvent.keyboard('{Escape}');
  return { focused, shown: c.value, value: m.api().getValues('v') };
}

describe('INV-6: no user input reaches a default read-only textarea', () => {
  describe.each(DEFAULT_MODES)('%s', (_l, readOnlyMode) => {
    it('TextAreaField: click, type, paste and Escape change nothing, focus never lands', async () => {
      const m = mountField(fieldSpec('TextAreaField'), {
        readOnly: true,
        readOnlyMode,
        after: SINK,
      });
      const got = await tryToEdit(m);
      expect(got).toStrictEqual({ focused: false, shown: 'multi line', value: 'multi line' });
      expect(document.activeElement).not.toBe(m.control());
    });

    it('TextField gives the same result (parity)', async () => {
      const results: Record<string, unknown> = {};
      for (const key of PARITY) {
        const spec = fieldSpec(key);
        const m = mountField(spec, { readOnly: true, readOnlyMode, after: SINK }, renderAs(key));
        const got = await tryToEdit(m);
        results[key] = { focused: got.focused, unchanged: got.shown === spec.display };
        m.unmount();
      }
      expect(results.TextAreaField).toStrictEqual(results.TextField);
      expect(results.TextAreaField).toStrictEqual({ focused: false, unchanged: true });
    });
  });

  it('sensitivity: the same click and keys edit an editable TextAreaField', async () => {
    const m = mountField(fieldSpec('TextAreaField'), { readOnly: false, after: SINK });
    const got = await tryToEdit(m);
    expect(got.focused).toBe(true);
    expect(got.shown).not.toBe('multi line');
    expect(got.value).toBe(got.shown);
  });

  /** A button's text, or any other element's id. */
  const focusedName = (): string => {
    const el = document.activeElement;
    return (el?.tagName === 'BUTTON' ? el.textContent : el?.id) ?? '';
  };

  /** Before button, the field, After button; Tab from Before and Shift+Tab from After. */
  async function tabWalk(key: Key, readOnly: boolean): Promise<[string, string]> {
    const handle: FormHandle = { api: null };
    render(
      <Host handle={handle} defaultValues={{ v: fieldSpec(key).value }} formMode="onSubmit">
        {(control) => (
          <>
            <button type="button">Before</button>
            {renderAs(key)({ id: 'f', name: 'v', label: 'Label', control, readOnly })}
            <button type="button">After</button>
          </>
        )}
      </Host>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Before' }));
    await userEvent.tab();
    const forward = focusedName();
    await userEvent.click(screen.getByRole('button', { name: 'After' }));
    await userEvent.tab({ shift: true });
    const back = focusedName();
    cleanup();
    return [forward, back];
  }

  it.each(PARITY)('%s: Tab and Shift+Tab skip the default read-only control', async (key) => {
    expect(await tabWalk(key, true)).toStrictEqual(['After', 'Before']);
  });

  it('sensitivity: Tab and Shift+Tab stop on the editable TextAreaField', async () => {
    expect(await tabWalk('TextAreaField', false)).toStrictEqual(['f', 'f']);
  });
});

describe('INV-7: toggling readOnly with a dirty value keeps the value and the node', () => {
  it.each(DEFAULT_MODES)('%s', async (_l, readOnlyMode) => {
    const m = mountField(fieldSpec('TextAreaField'), { readOnly: false, readOnlyMode, value: '' });
    const node = m.control();
    const host = m.host();
    const labelNode = host.querySelector('label');
    const helperNode = document.getElementById('f-description');
    await userEvent.click(node);
    await userEvent.keyboard('draft');
    expect(document.activeElement).toBe(node);
    expect(m.api().getValues('v')).toBe('draft');

    m.set({ readOnly: true });
    expect(m.control()).toBe(node);
    expect(node.disabled).toBe(true);
    await expect.poll(() => document.activeElement).toBe(document.body);
    expect(node.value).toBe('draft');
    expect(m.api().getValues('v')).toBe('draft');
    expect((await m.submit()).data).toStrictEqual({});
    expect(host.querySelector('label')).toBe(labelNode);
    expect(document.getElementById('f-description')).toBe(helperNode);

    m.set({ readOnly: false });
    expect(m.control()).toBe(node);
    expect(node.disabled).toBe(false);
    expect(node.value).toBe('draft');
    expect((await m.submit()).data).toStrictEqual({ v: 'draft' });
    await userEvent.click(node);
    await userEvent.keyboard('{End}!');
    expect(node.value).toBe('draft!');
    expect(m.api().getValues('v')).toBe('draft!');
  });

  it('TextField behaves the same across the toggle (parity)', async () => {
    const run = async (key: Key): Promise<unknown> => {
      const m = mountField(fieldSpec(key), { readOnly: false, value: '' }, renderAs(key));
      await userEvent.click(m.control());
      await userEvent.keyboard('draft');
      m.set({ readOnly: true });
      const locked = {
        body: document.activeElement === document.body,
        shown: m.control().value,
        payload: (await m.submit()).data,
      };
      m.set({ readOnly: false });
      const unlocked = { shown: m.control().value, payload: (await m.submit()).data };
      m.unmount();
      return { locked, unlocked };
    };
    const ta = await run('TextAreaField');
    expect(ta).toStrictEqual(await run('TextField'));
    expect(ta).toStrictEqual({
      locked: { body: true, shown: 'draft', payload: {} },
      unlocked: { shown: 'draft', payload: { v: 'draft' } },
    });
  });
});

interface AXNode {
  role?: { value: string };
  name?: { value: string };
  description?: { value: string };
  properties?: Array<{ name: string; value: { value: unknown } }>;
}

/**
 * The AX node for the control named `name`, read from the test iframe via CDP. Same lookup as
 * `axControl` in `readonly-mode.sf19.browser.test.tsx` (that file does not export it).
 */
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

describe('INV-11: assistive tech reports a default read-only textarea as disabled', () => {
  it.each(DEFAULT_MODES)(
    '%s: disabled, not read-only, not focusable, same role/name/description as editable',
    async (_l, readOnlyMode) => {
      const m = mountField(fieldSpec('TextAreaField'), { readOnly: false, readOnlyMode });
      const editable = await axControl('Label');
      m.set({ readOnly: true });
      const ro = await axControl('Label');

      expect(editable.props.disabled).toBeUndefined();
      expect(editable.props.focusable).toBe(true);
      expect(ro.props.disabled).toBe(true);
      expect(ro.props.readonly).not.toBe(true);
      expect(ro.props.focusable).toBeUndefined();
      expect({ role: ro.role, name: ro.name, description: ro.description }).toStrictEqual({
        role: editable.role,
        name: editable.name,
        description: editable.description,
      });
      expect(ro.name).toBe('Label');
      expect(ro.description).toBe('Help');
      expect(m.control().hasAttribute('aria-disabled')).toBe(false);
      expect(m.control().hasAttribute('aria-readonly')).toBe(false);
    }
  );

  it('TextField reports the same AX state in default read-only (parity)', async () => {
    const state = async (key: Key): Promise<unknown> => {
      const m = mountField(fieldSpec(key), { readOnly: true }, renderAs(key));
      const ax = await axControl('Label');
      m.unmount();
      return {
        disabled: ax.props.disabled,
        readonly: ax.props.readonly,
        focusable: ax.props.focusable,
      };
    };
    expect(await state('TextAreaField')).toStrictEqual(await state('TextField'));
  });

  it('axe: default read-only adds no violation over the editable textarea', async () => {
    const violations = async (readOnly: boolean): Promise<string[]> => {
      const m = mountField(fieldSpec('TextAreaField'), { readOnly });
      const results = await axe.run(m.host(), {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
      });
      act(() => m.unmount());
      return results.violations.map((v) => v.id).sort();
    };
    const editable = await violations(false);
    const locked = await violations(true);
    expect(locked.filter((id) => !editable.includes(id))).toStrictEqual([]);
    expect(locked).toStrictEqual([]);
  });
});
