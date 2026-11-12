/**
 * @vitest-environment jsdom
 *
 * 006 SF-3 · TextAreaField default `readOnly` matches its siblings (jsdom half).
 *
 * The fixture `textarea-readonly.sf3-baseline.8424e7228.json` was recorded at 8424e7228, before
 * the SF-3 fix, with the harness reproduced in `renderCase` below: one form, id `f`, name `v`,
 * label `Label`, helper `Help`, default value `'multi line'`, props omitted when absent. It holds
 * nine cases (readOnlyMode absent / 'disabled' / 'readonly' × readOnly absent / false / true)
 * with unstripped HTML, the handleSubmit payload and the control's DOM properties.
 *
 * - INV-1: default read-only (mode absent or 'disabled') = fixture + `disabled=""`, nothing else.
 * - INV-2: no `readOnly` (six cases) = fixture, byte for byte.
 * - INV-3: readonly mode = fixture's attribute map (order inside the tag is not the contract).
 * - INV-5: payload = fixture's payload in all nine cases.
 * - INV-8: `reset()` while read-only writes through and the control stays disabled.
 * The Chromium half (INV-6, INV-7, INV-11) is `textarea-readonly.sf3.browser.test.tsx`.
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import React from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import type { ReadOnlyMode } from '../BaseField';
import { TextAreaField } from '../TextAreaField';
import { TextField } from '../TextField';
import { attrs, fieldSpec, mountField, type Values } from './readonly-mode.sf19-kit';
import fixture from './textarea-readonly.sf3-baseline.8424e7228.json';

afterEach(cleanup);

type ModeKey = 'absent' | 'disabled' | 'readonly';
type ReadOnlyKey = 'absent' | 'false' | 'true';
interface FixtureCase {
  html: string;
  payload: Values;
  payloadHasName: boolean;
  control: {
    disabled: boolean;
    readOnly: boolean;
    tabIndex: number;
    value: string;
    attributeNames: string[];
  };
}
const FIXTURE = fixture as Record<ModeKey, Record<ReadOnlyKey, FixtureCase>>;

const MODES: ReadonlyArray<[ModeKey, ReadOnlyMode | undefined]> = [
  ['absent', undefined],
  ['disabled', 'disabled'],
  ['readonly', 'readonly'],
];
const READONLY_VALUES: ReadonlyArray<[ReadOnlyKey, boolean | undefined]> = [
  ['absent', undefined],
  ['false', false],
  ['true', true],
];
const CASES = MODES.flatMap(([modeKey, mode]) =>
  READONLY_VALUES.map(([roKey, readOnly]) => ({ modeKey, mode, roKey, readOnly }))
);
type Case = (typeof CASES)[number];
const label = (c: Case): string => `readOnlyMode=${c.modeKey} · readOnly=${c.roKey}`;

interface Rendered {
  html: string;
  payload: Values;
  payloadHasName: boolean;
  control: HTMLTextAreaElement;
}

/** The fixture's capture harness, same props and same form; the control is read before cleanup. */
async function renderCase(c: Case): Promise<Rendered> {
  let form: UseFormReturn<Values> | null = null;
  function Host(): React.ReactElement {
    form = useForm<Values>({ defaultValues: { v: 'multi line' } });
    return (
      <form data-testid="host">
        <TextAreaField
          id="f"
          name="v"
          label="Label"
          helperText="Help"
          control={form.control}
          {...(c.readOnly === undefined ? {} : { readOnly: c.readOnly })}
          {...(c.mode === undefined ? {} : { readOnlyMode: c.mode })}
        />
      </form>
    );
  }
  render(<Host />);
  let payload: Values = {};
  await act(async () => {
    await (form as UseFormReturn<Values> | null)?.handleSubmit((d) => {
      payload = d;
    })();
  });
  const host = screen.getByTestId('host');
  const control = host.querySelector('textarea');
  if (!control) throw new Error('no <textarea> rendered');
  return {
    html: host.innerHTML,
    payload,
    payloadHasName: Object.prototype.hasOwnProperty.call(payload, 'v'),
    control,
  };
}

/** Parse form HTML into the textarea's attribute map and the HTML around it. */
function split(html: string): { control: Record<string, string>; outside: string } {
  const host = document.createElement('div');
  host.innerHTML = html;
  const control = host.querySelector('textarea');
  if (!control) throw new Error('no <textarea> in HTML');
  return {
    control: attrs(control),
    outside: host.innerHTML.replace(control.outerHTML, '<CONTROL/>'),
  };
}

describe('fixture sanity', () => {
  it('holds the nine cases the invariants name', () => {
    expect(Object.keys(FIXTURE).sort()).toStrictEqual(['absent', 'disabled', 'readonly']);
    for (const m of Object.values(FIXTURE)) {
      expect(Object.keys(m).sort()).toStrictEqual(['absent', 'false', 'true']);
    }
    // Pre-fix: no case was DOM-disabled, which is the bug SF-3 fixes.
    expect(CASES.every((c) => FIXTURE[c.modeKey][c.roKey].control.disabled === false)).toBe(true);
  });
});

describe('INV-2: without readOnly the HTML is byte-identical to 8424e7228', () => {
  const noReadOnly = CASES.filter((c) => c.readOnly !== true);

  it('covers the six no-readOnly cases', () => {
    expect(noReadOnly).toHaveLength(6);
  });

  it.each(noReadOnly.map((c) => [label(c), c] as const))('%s', async (_l, c) => {
    const got = await renderCase(c);
    const want = FIXTURE[c.modeKey][c.roKey];
    expect(got.html).toBe(want.html);
    expect(got.control.disabled).toBe(false);
    expect(got.control.hasAttribute('disabled')).toBe(false);
  });
});

describe('INV-1: default read-only is the fixture plus disabled="" and nothing else', () => {
  const defaultReadOnly = CASES.filter((c) => c.readOnly === true && c.mode !== 'readonly');

  it.each(defaultReadOnly.map((c) => [label(c), c] as const))('%s', async (_l, c) => {
    const got = await renderCase(c);
    const want = FIXTURE[c.modeKey][c.roKey];
    const g = split(got.html);
    const w = split(want.html);
    expect(g.control).toStrictEqual({ ...w.control, disabled: '' });
    expect(g.outside).toBe(w.outside);
    expect(got.control.disabled).toBe(true);
    expect(got.control.readOnly).toBe(false);
    expect(got.control.tabIndex).toBe(0);
    expect(got.control.hasAttribute('readonly')).toBe(false);
    expect(got.control.hasAttribute('data-readonly')).toBe(false);
    expect(got.control.value).toBe(want.control.value);
  });

  it('both default modes render the same HTML', async () => {
    const html: string[] = [];
    for (const c of defaultReadOnly) {
      html.push((await renderCase(c)).html);
      cleanup();
    }
    expect(html).toHaveLength(2);
    expect(html[0]).toBe(html[1]);
  });

  it('the control carries the same disabled / readonly / tabindex state as TextField with readOnly', () => {
    const state = (el: HTMLInputElement | HTMLTextAreaElement) => ({
      disabled: el.getAttribute('disabled'),
      readonly: el.getAttribute('readonly'),
      dataReadonly: el.getAttribute('data-readonly'),
      tabindex: el.getAttribute('tabindex'),
      ariaDisabled: el.getAttribute('aria-disabled'),
      ariaReadonly: el.getAttribute('aria-readonly'),
    });
    const ta = mountField(fieldSpec('TextAreaField'), { readOnly: true });
    const taState = state(ta.control());
    ta.unmount();
    const tf = mountField(fieldSpec('TextField'), { readOnly: true }, (p) => <TextField {...p} />);
    expect(taState).toStrictEqual(state(tf.control()));
    expect(taState).toStrictEqual({
      disabled: '',
      readonly: null,
      dataReadonly: null,
      tabindex: '0',
      ariaDisabled: null,
      ariaReadonly: null,
    });
  });
});

describe('INV-3: readonly mode keeps the fixture attribute map, values and payload', () => {
  const c = CASES.find((x) => x.mode === 'readonly' && x.readOnly === true) as Case;

  it('readOnlyMode=readonly · readOnly=true', async () => {
    const got = await renderCase(c);
    const want = FIXTURE.readonly.true;
    const g = split(got.html);
    const w = split(want.html);
    expect(g.control).toStrictEqual(w.control);
    expect(g.outside).toBe(w.outside);
    expect(g.control).toMatchObject({ readonly: '', 'data-readonly': '', tabindex: '0' });
    expect(g.control).not.toHaveProperty('disabled');
    expect(got.control.readOnly).toBe(true);
    expect(got.control.disabled).toBe(false);
    expect(got.control.tabIndex).toBe(0);
    expect(got.payload).toStrictEqual({ v: 'multi line' });
  });
});

describe('INV-5: handleSubmit payload equals the fixture in all nine cases', () => {
  it.each(CASES.map((c) => [label(c), c] as const))('%s', async (_l, c) => {
    const got = await renderCase(c);
    const want = FIXTURE[c.modeKey][c.roKey];
    expect(got.payload).toStrictEqual(want.payload);
    expect(got.payloadHasName).toBe(want.payloadHasName);
  });

  it('default read-only drops the value; readonly mode and no readOnly keep it', () => {
    expect(FIXTURE.absent.true.payload).toStrictEqual({});
    expect(FIXTURE.disabled.true.payload).toStrictEqual({});
    expect(FIXTURE.readonly.true.payload).toStrictEqual({ v: 'multi line' });
    expect(FIXTURE.absent.false.payload).toStrictEqual({ v: 'multi line' });
  });
});

describe('INV-8: reset() while read-only writes through and stays disabled', () => {
  /**
   * Payload right after `reset()` on a default read-only field. react-hook-form 7.79 drops the
   * Controller's `disabled` state on `reset()` until the field re-renders, so the next
   * `handleSubmit` includes the value. TextField does exactly the same (the Controller prop SF-3
   * leaves untouched), so SF-3 asserts parity here, not `{}`; the kit-wide gap is recorded in the
   * SF-3 Tests artifact and reported to the Orchestrator.
   */
  async function payloadAfterReset(key: 'TextField' | 'TextAreaField'): Promise<Values | null> {
    const m = mountField(fieldSpec(key), { readOnly: true }, (p) =>
      key === 'TextField' ? <TextField {...p} /> : <TextAreaField {...p} />
    );
    act(() => m.api().reset({ v: 'other' }));
    const data = (await m.submit()).data;
    m.unmount();
    return data;
  }

  it('payload right after reset() matches TextField (parity, RHF behaviour)', async () => {
    expect(await payloadAfterReset('TextAreaField')).toStrictEqual(
      await payloadAfterReset('TextField')
    );
  });

  it.each([
    ['readOnlyMode absent', undefined],
    ["readOnlyMode 'disabled'", 'disabled'],
  ] as const)(
    '%s: reset({ v }) shows the new value on the same disabled node',
    async (_l, mode) => {
      const m = mountField(fieldSpec('TextAreaField'), { readOnly: true, readOnlyMode: mode });
      const node = m.control();
      act(() => m.api().reset({ v: 'other' }));
      expect(m.control()).toBe(node);
      expect(node.value).toBe('other');
      expect(node.disabled).toBe(true);
      expect(node.tabIndex).toBe(0);
      expect(m.api().getValues('v')).toBe('other');

      // Once the field re-renders read-only, the payload drops the value again.
      m.set({ readOnly: true, helperText: 'Help 2' });
      expect(node.disabled).toBe(true);
      expect((await m.submit()).data).toStrictEqual({});

      m.set({ readOnly: false });
      expect(m.control()).toBe(node);
      expect(node.value).toBe('other');
      expect(node.disabled).toBe(false);
      expect((await m.submit()).data).toStrictEqual({ v: 'other' });
    }
  );

  it('reset() with no values goes back to the default value and stays disabled', () => {
    const m = mountField(fieldSpec('TextAreaField'), { readOnly: true });
    act(() => m.api().setValue('v', 'changed'));
    expect(m.control().value).toBe('changed');
    act(() => m.api().reset());
    expect(m.control().value).toBe('multi line');
    expect(m.control().disabled).toBe(true);
  });

  it('reset() to an empty value shows an empty, still-disabled control', () => {
    const m = mountField(fieldSpec('TextAreaField'), { readOnly: true });
    act(() => m.api().reset({ v: '' }));
    expect(m.control().value).toBe('');
    expect(m.control().disabled).toBe(true);
  });
});
