/**
 * @vitest-environment jsdom
 *
 * 005 SF-19 · Render contract of the focusable read-only mode.
 * INV-1 (default mode unchanged against the pre-SF-19 baseline), INV-2 (readonly-mode attributes),
 * INV-5 (no write at the switch), INV-7 (controlProps win), INV-10 (AmountField honours readOnly
 * in default mode, 006 SF-2), INV-22 (same DOM nodes across the switch).
 *
 * The INV-1 baseline (`readonly-mode.sf19-baseline.6f66ff2eb.json`) was recorded by the Code
 * stage from commit 6f66ff2eb, before any SF-19 source edit, with the harness reproduced in
 * `renderBaselineCase` below (same props, same form, same order).
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import React from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import type { ReadOnlyMode } from '../BaseField';
import baseline from './readonly-mode.sf19-baseline.6f66ff2eb.json';
import {
  attrs,
  EDITABLE_OPTED_IN,
  FIELDS,
  fieldSpec,
  mountField,
  READONLY,
  stripLook,
  type FieldKey,
  type FieldSpec,
  type Values,
} from './readonly-mode.sf19-kit';

afterEach(cleanup);

interface BaselineCase {
  html: string;
  payload: Values;
  payloadHasName: boolean;
}
type ReadOnlyKey = 'absent' | 'false' | 'true';
const BASELINE = baseline as Record<FieldKey, Record<ReadOnlyKey, BaselineCase>>;

const READONLY_VALUES: ReadonlyArray<[ReadOnlyKey, boolean | undefined]> = [
  ['absent', undefined],
  ['false', false],
  ['true', true],
];

/** The Code-stage capture harness, verbatim in behaviour: one form, no extra nodes. */
async function renderBaselineCase(
  spec: FieldSpec,
  readOnly: boolean | undefined,
  readOnlyMode: ReadOnlyMode | undefined
): Promise<{ html: string; payload: Values; payloadHasName: boolean }> {
  let form: UseFormReturn<Values> | null = null;
  function Host(): React.ReactElement {
    form = useForm<Values>({ defaultValues: { v: spec.value } });
    const props = {
      id: 'f',
      name: 'v',
      label: 'Label',
      helperText: 'Help',
      control: form.control,
      ...(readOnly === undefined ? {} : { readOnly }),
      ...(readOnlyMode === undefined ? {} : { readOnlyMode }),
    };
    return <form data-testid="host">{spec.el(props)}</form>;
  }
  render(<Host />);
  let payload: Values = {};
  await act(async () => {
    await (form as UseFormReturn<Values> | null)?.handleSubmit((d) => {
      payload = d;
    })();
  });
  const html = screen.getByTestId('host').innerHTML;
  cleanup();
  return { html, payload, payloadHasName: Object.prototype.hasOwnProperty.call(payload, 'v') };
}

/**
 * Asserts the control in `gotHtml` has the attributes of the one in `wantHtml` plus `disabled=""`,
 * and that the HTML around the control is byte-identical. Attribute order inside the tag follows
 * React's prop key order, so the control is compared as an attribute map.
 */
function expectOnlyDisabledAdded(gotHtml: string, wantHtml: string): void {
  const parse = (html: string): { control: Element; outside: string } => {
    const host = document.createElement('div');
    host.innerHTML = html;
    const control = host.querySelector('textarea, input');
    if (!control) throw new Error('no <textarea> or <input> in rendered HTML');
    return { control, outside: host.innerHTML.replace(control.outerHTML, '<CONTROL/>') };
  };
  const got = parse(gotHtml);
  const want = parse(wantHtml);
  expect(attrs(got.control)).toStrictEqual({ ...attrs(want.control), disabled: '' });
  expect(got.outside).toBe(want.outside);
}

describe('INV-1: default mode matches the pre-SF-19 baseline (HTML minus look tokens, payload)', () => {
  const cases = FIELDS.flatMap((spec) =>
    (['absent', 'disabled'] as const).flatMap((mode) =>
      READONLY_VALUES.map(([key, readOnly]) => ({ spec, mode, key, readOnly }))
    )
  );

  it.each(cases.map((c) => [c.spec.key, c.mode, c.key, c] as const))(
    '%s · readOnlyMode=%s · readOnly=%s',
    async (_f, _m, _r, c) => {
      const got = await renderBaselineCase(
        c.spec,
        c.readOnly,
        c.mode === 'absent' ? undefined : c.mode
      );
      const want = BASELINE[c.spec.key][c.key];
      const amount = c.spec.key === 'AmountField' || c.spec.key === 'AmountFieldExact';
      if ((c.spec.key === 'TextAreaField' || amount) && c.key === 'true') {
        // 006 SF-3 / SF-2 exception: default read-only TextAreaField and AmountField are now
        // DOM-disabled like TextField. The control gains `disabled=""` and nothing else; the rest
        // of the HTML is unchanged.
        expectOnlyDisabledAdded(stripLook(got.html), want.html);
      } else {
        expect(stripLook(got.html)).toBe(want.html);
      }
      if (amount && c.key === 'true') {
        // 006 SF-2: the baseline kept the amount in the payload; a disabled field drops it.
        expect(got.payload).toStrictEqual({});
        expect(got.payloadHasName).toBe(false);
      } else {
        expect(got.payload).toStrictEqual(want.payload);
        expect(got.payloadHasName).toBe(want.payloadHasName);
      }
    }
  );

  it('the baseline itself pins the pre-SF-19 state: readOnly dropped the value except on AmountField (006 SF-2 now drops it there too)', () => {
    for (const spec of FIELDS) {
      const amount = spec.key === 'AmountField' || spec.key === 'AmountFieldExact';
      expect(BASELINE[spec.key].true.payloadHasName, spec.key).toBe(amount);
      expect(BASELINE[spec.key].absent.payloadHasName, spec.key).toBe(true);
    }
  });

  it('the only class change is the four gated look tokens (sensitivity: stripping is required)', async () => {
    const got = await renderBaselineCase(fieldSpec('TextField'), undefined, undefined);
    expect(got.html).not.toBe(BASELINE.TextField.absent.html);
    expect(got.html.match(/data-readonly:read-only:not-disabled:[\w-]+/g)).toStrictEqual([
      'data-readonly:read-only:not-disabled:bg-muted',
      'data-readonly:read-only:not-disabled:text-foreground',
      'data-readonly:read-only:not-disabled:opacity-100',
      'data-readonly:read-only:not-disabled:cursor-default',
    ]);
  });
});

describe('INV-2: readonly-mode control attributes', () => {
  it.each(FIELDS.map((s) => [s.key, s] as const))(
    '%s · readOnly + readonly → readonly, data-readonly, not disabled, tabbable',
    (_k, spec) => {
      const m = mountField(spec, READONLY);
      const c = m.control();
      expect(c.tagName).toBe(spec.tag);
      expect(c.getAttribute('readonly')).toBe('');
      expect(c.getAttribute('data-readonly')).toBe('');
      expect(c.hasAttribute('disabled')).toBe(false);
      expect(c.disabled).toBe(false);
      expect(c.tabIndex).toBeGreaterThanOrEqual(0);
      expect(c.hasAttribute('aria-readonly')).toBe(false);
      expect(c.hasAttribute('aria-disabled')).toBe(false);
    }
  );

  it.each(FIELDS.map((s) => [s.key, s] as const))(
    "%s · readOnly false + 'readonly' renders exactly the editable baseline",
    async (_k, spec) => {
      for (const readOnly of [false, undefined]) {
        const got = await renderBaselineCase(spec, readOnly, 'readonly');
        const want = BASELINE[spec.key][readOnly === false ? 'false' : 'absent'];
        expect(stripLook(got.html)).toBe(want.html);
        expect(got.payload).toStrictEqual(want.payload);
      }
    }
  );

  it.each(FIELDS.map((s) => [s.key, s] as const))(
    '%s · editable → readonly changes only readonly + data-readonly on the control (+ AddressField combobox attrs)',
    (_k, spec) => {
      const m = mountField(spec, EDITABLE_OPTED_IN);
      const before = attrs(m.control());
      const outsideBefore = m.host().innerHTML.replace(m.control().outerHTML, '<CONTROL/>');
      m.set({ readOnly: true });
      const after = attrs(m.control());
      const outsideAfter = m.host().innerHTML.replace(m.control().outerHTML, '<CONTROL/>');

      const added = Object.keys(after).filter((k) => !(k in before));
      const removed = Object.keys(before).filter((k) => !(k in after));
      const changed = Object.keys(after).filter((k) => k in before && before[k] !== after[k]);
      expect(added.sort()).toStrictEqual(['data-readonly', 'readonly']);
      expect(changed).toStrictEqual([]);
      if (spec.key === 'AddressField') {
        // INV-15: no combobox state in readonly mode.
        expect(removed.sort()).toStrictEqual(['aria-autocomplete', 'aria-expanded']);
      } else {
        expect(removed).toStrictEqual([]);
      }
      expect(outsideAfter).toBe(outsideBefore);
    }
  );
});

describe('INV-7: controlProps win over field / accessibility props', () => {
  it.each(FIELDS.map((s) => [s.key, s] as const))(
    '%s · readonly mode: tabIndex 0, readonly present, disabled absent',
    (_k, spec) => {
      const m = mountField(spec, READONLY);
      expect(m.control().tabIndex).toBe(0);
      expect(m.control().readOnly).toBe(true);
      expect(m.control().disabled).toBe(false);
    }
  );

  it.each(['BytesField', 'DateTimeField'] as const)(
    '%s passes isDisabled: tabIndex -1 in default readOnly (today), 0 in readonly mode',
    (key) => {
      const m = mountField(fieldSpec(key), { readOnly: true });
      expect(m.control().tabIndex).toBe(-1);
      expect(m.control().disabled).toBe(true);
      m.set({ readOnlyMode: 'readonly' });
      expect(m.control().tabIndex).toBe(0);
      expect(m.control().disabled).toBe(false);
      expect(m.control().readOnly).toBe(true);
    }
  );

  it('TextAreaField default mode: readOnly alone is DOM-disabled and stays tabIndex 0, like TextField (006 SF-3)', () => {
    const m = mountField(fieldSpec('TextAreaField'), { readOnly: true });
    expect(m.control().disabled).toBe(true);
    expect(m.control().readOnly).toBe(false);
    expect(m.control().tabIndex).toBe(0);
    m.set({ readOnlyMode: 'readonly' });
    expect(m.control().readOnly).toBe(true);
    expect(m.control().disabled).toBe(false);
  });
});

describe('INV-10: AmountField honours readOnly in default mode like TextField (006 SF-2)', () => {
  it.each([
    ['AmountField', undefined],
    ['AmountField', 'disabled'],
    ['AmountFieldExact', undefined],
    ['AmountFieldExact', 'disabled'],
  ] as const)(
    '%s · readOnly + mode %s: DOM-disabled, not readonly, value dropped from the payload',
    async (key, mode) => {
      const m = mountField(fieldSpec(key), { readOnly: true, readOnlyMode: mode });
      const c = m.control();
      expect(c.hasAttribute('readonly')).toBe(false);
      expect(c.hasAttribute('data-readonly')).toBe(false);
      expect(c.disabled).toBe(true);
      const r = await m.submit();
      expect(r.valid).toBe(true);
      expect(r.data).toStrictEqual({});
    }
  );

  it.each(['AmountField', 'AmountFieldExact'] as const)(
    '%s · default read-only has the same disabled/readonly/tabindex state as TextField',
    (key) => {
      const state = (el: HTMLInputElement | HTMLTextAreaElement): Record<string, unknown> => ({
        disabled: el.disabled,
        readOnly: el.readOnly,
        tabIndex: el.tabIndex,
        ariaDisabled: el.getAttribute('aria-disabled'),
        ariaReadonly: el.getAttribute('aria-readonly'),
        dataReadonly: el.hasAttribute('data-readonly'),
      });
      const amount = mountField(fieldSpec(key), { readOnly: true });
      const text = mountField(fieldSpec('TextField'), { readOnly: true });
      expect(state(amount.control())).toStrictEqual(state(text.control()));
    }
  );

  it.each(['AmountField', 'AmountFieldExact'] as const)(
    '%s · readOnly false/absent stays editable and keeps its value in the payload (boundary)',
    async (key) => {
      for (const readOnly of [false, undefined]) {
        const m = mountField(fieldSpec(key), { readOnly });
        expect(m.control().disabled).toBe(false);
        fireEvent.change(m.control(), { target: { value: '2.5' } });
        const r = await m.submit();
        expect(r.data?.v).toBe('2.5');
        cleanup();
      }
    }
  );

  it.each(['AmountField', 'AmountFieldExact'] as const)(
    '%s · readOnly + readonly engages the mode',
    (key) => {
      const m = mountField(fieldSpec(key), READONLY);
      expect(m.control().hasAttribute('readonly')).toBe(true);
      expect(m.control().getAttribute('data-readonly')).toBe('');
    }
  );
});

/** A non-normalized value per field: what the user could have typed but not blurred yet. */
const RAW: Record<FieldKey, string> = {
  TextField: '  padded  ',
  TextAreaField: 'line one\n',
  NumberField: '7.',
  BigIntField: '0042',
  AmountField: '1.5',
  AmountFieldExact: '1,000.5',
  UrlField: 'example',
  PasswordField: 'pa ss',
  BytesField: 'abcd',
  AddressField: 'alice.eth',
  DateTimeField: '2026-02-03T04:05',
};

describe('INV-5: the switch writes nothing', () => {
  it.each(FIELDS.map((s) => [s.key, s] as const))(
    '%s · typed text and form value survive editable → readonly → editable',
    (_k, spec) => {
      const m = mountField(spec, EDITABLE_OPTED_IN);
      const c = m.control();
      fireEvent.change(c, { target: { value: RAW[spec.key] } });
      const shown = c.value;
      const value = m.api().getValues('v');
      expect(shown).toBe(RAW[spec.key]);

      m.set({ readOnly: true });
      expect(m.control().value).toBe(shown);
      expect(m.api().getValues('v')).toStrictEqual(value);

      m.set({ readOnly: false });
      expect(m.control().value).toBe(shown);
      expect(m.api().getValues('v')).toStrictEqual(value);
    }
  );

  it('a runtime mode switch disabled → readonly while readOnly is true writes nothing either', () => {
    const m = mountField(fieldSpec('TextField'), { readOnly: true, readOnlyMode: 'disabled' });
    m.set({ readOnlyMode: 'readonly' });
    expect(m.control().value).toBe('hello');
    expect(m.api().getValues('v')).toBe('hello');
  });
});

describe('INV-22: the control, helper and error nodes are the same across switches', () => {
  it.each(FIELDS.map((s) => [s.key, s] as const))(
    '%s · editable → readonly → editable → readonly keeps every node',
    async (_k, spec) => {
      const m = mountField(spec, {
        ...EDITABLE_OPTED_IN,
        value: '',
        validation: { required: true },
      });
      await m.submit(); // produce a required error so the error node exists
      fireEvent.blur(m.control());
      const control = m.control();
      const helper = document.getElementById('f-description');
      const error = document.getElementById('f-error');
      const label = document.querySelector('label[for="f"]');
      expect(helper).not.toBeNull();
      expect(error).not.toBeNull();

      for (const readOnly of [true, false, true]) {
        m.set({ readOnly });
        expect(m.control()).toBe(control);
        expect(document.getElementById('f-description')).toBe(helper);
        expect(document.getElementById('f-error')).toBe(error);
        expect(document.querySelector('label[for="f"]')).toBe(label);
      }
    }
  );

  it('a mode switch with readOnly true (disabled → readonly) keeps the control node', () => {
    const m = mountField(fieldSpec('AddressField'), { readOnly: true });
    const control = m.control();
    m.set({ readOnlyMode: 'readonly' });
    expect(m.control()).toBe(control);
    m.set({ readOnlyMode: 'disabled' });
    expect(m.control()).toBe(control);
  });
});
