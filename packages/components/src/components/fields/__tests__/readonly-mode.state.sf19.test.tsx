/**
 * @vitest-environment jsdom
 *
 * 005 SF-19 · Form state across the "saving" state (readonly mode).
 * INV-8 (never RHF-disabled), INV-24 (payload complete / default unchanged), INV-25 (validation
 * still runs), INV-26 (an existing error survives the switch), INV-27 (AddressField resolution in
 * flight), INV-23 (a switch is one commit and runs no validation).
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React, { Profiler } from 'react';

import { AddressField } from '../AddressField';
import type { ReadOnlyMode } from '../BaseField';
import {
  addressing,
  controlledResolver,
  elapseDebounce,
  HEX_ALICE,
  okResult,
  settle,
} from '../name-resolution/__tests__/helpers';
import { NameResolverProvider } from '../name-resolution/name-resolver-context';
import {
  EDITABLE_OPTED_IN,
  FIELDS,
  fieldSpec,
  Host,
  mountField,
  READONLY,
  type FormHandle,
  type Values,
} from './readonly-mode.sf19-kit';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const isAmount = (key: string): boolean => key === 'AmountField' || key === 'AmountFieldExact';

describe('INV-8: readonly mode never registers the field as disabled', () => {
  it.each(FIELDS.map((s) => [s.key, s] as const))(
    '%s · (a) readonly from mount: name and value in handleSubmit data',
    async (_k, spec) => {
      const m = mountField(spec, READONLY);
      const r = await m.submit();
      expect(r.valid).toBe(true);
      expect(r.data).toStrictEqual({ v: spec.value });
    }
  );

  it.each(FIELDS.map((s) => [s.key, s] as const))(
    "%s · (b) readOnly with 'disabled' then 'readonly' at runtime: value back in the payload",
    async (_k, spec) => {
      const m = mountField(spec, { readOnly: true, readOnlyMode: 'disabled' });
      const before = await m.submit();
      expect(Object.prototype.hasOwnProperty.call(before.data ?? {}, 'v')).toBe(isAmount(spec.key));

      m.set({ readOnlyMode: 'readonly' });
      const after = await m.submit();
      expect(after.data).toStrictEqual({ v: spec.value });
    }
  );

  it.each(FIELDS.filter((s) => !isAmount(s.key)).map((s) => [s.key, s] as const))(
    "%s · (c) and back: 'readonly' → 'disabled' drops the value again (today's default)",
    async (_k, spec) => {
      const m = mountField(spec, READONLY);
      m.set({ readOnlyMode: 'disabled' });
      const r = await m.submit();
      expect(Object.prototype.hasOwnProperty.call(r.data ?? {}, 'v')).toBe(false);
    }
  );
});

describe('INV-24: one form with every supported field', () => {
  function mountAll(readOnlyMode: ReadOnlyMode | undefined): {
    handle: FormHandle;
    defaults: Values;
  } {
    const handle: FormHandle = { api: null };
    const defaults: Values = Object.fromEntries(FIELDS.map((s, i) => [`f${i}`, s.value]));
    render(
      <Host handle={handle} defaultValues={defaults} formMode="onSubmit">
        {(control) =>
          FIELDS.map((s, i) => (
            <React.Fragment key={s.key}>
              {s.el({
                id: `f${i}`,
                name: `f${i}`,
                label: s.key,
                control,
                readOnly: true,
                readOnlyMode,
              })}
            </React.Fragment>
          ))
        }
      </Host>
    );
    return { handle, defaults };
  }

  async function submitAll(handle: FormHandle): Promise<Values | null> {
    let data: Values | null = null;
    await act(async () => {
      await handle.api?.handleSubmit((d) => {
        data = d;
      })();
    });
    return data;
  }

  it('readonly mode: handleSubmit data deep-equals getValues() and the defaults', async () => {
    const { handle, defaults } = mountAll('readonly');
    const data = await submitAll(handle);
    expect(data).toStrictEqual(handle.api?.getValues());
    expect(data).toStrictEqual(defaults);
  });

  it.each([undefined, 'disabled'] as const)(
    'default mode (%s): every read-only name is dropped except the two AmountFields',
    async (mode) => {
      const { handle } = mountAll(mode);
      const data = (await submitAll(handle)) ?? {};
      const present = FIELDS.filter((_s, i) => `f${i}` in data).map((s) => s.key);
      expect(present).toStrictEqual(['AmountField', 'AmountFieldExact']);
    }
  );
});

describe('INV-25: validation still runs in readonly mode', () => {
  it.each(FIELDS.map((s) => [s.key, s] as const))(
    '%s · required + empty: onValid not called, error set (readonly)',
    async (_k, spec) => {
      const m = mountField(spec, { ...READONLY, value: '', validation: { required: true } });
      const r = await m.submit();
      expect(r.valid).toBe(false);
      expect(m.api().getFieldState('v').error).toBeDefined();
    }
  );

  it.each(FIELDS.map((s) => [s.key, s] as const))(
    "%s · same in default readOnly: today's result (disabled fields skip validation, AmountField doesn't)",
    async (_k, spec) => {
      const m = mountField(spec, { readOnly: true, value: '', validation: { required: true } });
      const r = await m.submit();
      expect(r.valid).toBe(!isAmount(spec.key));
    }
  );

  it('field-specific rules also run: NumberField below min, BytesField bad hex', async () => {
    const n = mountField(fieldSpec('NumberField'), {
      ...READONLY,
      value: 0,
      validation: { min: 1 },
    });
    expect((await n.submit()).valid).toBe(false);
    cleanup();
    const b = mountField(fieldSpec('BytesField'), { ...READONLY, value: '0xzz' });
    expect((await b.submit()).valid).toBe(false);
  });
});

describe('INV-26: an existing error survives the switch', () => {
  const ARIA = ['aria-invalid', 'aria-errormessage', 'aria-describedby'] as const;

  it.each(FIELDS.map((s) => [s.key, s] as const))(
    '%s · error node, text and ARIA unchanged editable → readonly → editable',
    async (_k, spec) => {
      const m = mountField(spec, {
        ...EDITABLE_OPTED_IN,
        value: '',
        validation: { required: true },
      });
      await m.submit();
      fireEvent.blur(m.control());
      const error = document.getElementById('f-error');
      expect(error).not.toBeNull();
      const text = error?.textContent;
      const aria = ARIA.map((a) => m.control().getAttribute(a));
      expect(aria[0]).toBe('true');
      expect(aria[1]).toBe('f-error');
      expect(aria[2]?.split(' ')).toContain('f-error');

      for (const readOnly of [true, false, true]) {
        m.set({ readOnly });
        expect(document.getElementById('f-error')).toBe(error);
        expect(error?.textContent).toBe(text);
        expect(ARIA.map((a) => m.control().getAttribute(a))).toStrictEqual(aria);
      }
    }
  );
});

describe('INV-27: AddressField name resolution keeps working in readonly mode', () => {
  it('pending at the switch: submit gated; resolved during readonly: hex written, payload has it', async () => {
    vi.useFakeTimers();
    const r = controlledResolver();
    const m = mountField(
      fieldSpec('AddressField'),
      { ...EDITABLE_OPTED_IN, value: '', validation: { required: true }, formMode: 'onChange' },
      (p) => (
        <NameResolverProvider resolveName={r.resolveName}>
          <AddressField {...p} addressing={addressing} />
        </NameResolverProvider>
      )
    );
    fireEvent.change(m.control(), { target: { value: 'alice.eth' } });
    await elapseDebounce();
    expect(r.calls).toEqual(['alice.eth']);

    m.set({ readOnly: true });
    expect(m.control().readOnly).toBe(true);
    expect((await m.submit()).valid).toBe(false); // pending gate holds

    await settle(r.deferreds[0], okResult('alice.eth', HEX_ALICE));
    expect(m.api().getValues('v')).toBe(HEX_ALICE);
    expect(m.control().value).toBe('alice.eth'); // the typed name stays on screen
    const done = await m.submit();
    expect(done.valid).toBe(true);
    expect(done.data).toStrictEqual({ v: HEX_ALICE });
  });
});

describe('INV-23: a switch costs one commit and runs no validation', () => {
  it.each(FIELDS.map((s) => [s.key, s] as const))(
    '%s · editable → readonly → editable: one Profiler commit each, errors untouched',
    (_k, spec) => {
      const commits = vi.fn();
      const m = mountField(
        spec,
        {
          ...EDITABLE_OPTED_IN,
          value: '',
          validation: { required: true },
          formMode: 'onChange',
        },
        (p) => (
          <Profiler id="field" onRender={commits}>
            {spec.el(p)}
          </Profiler>
        )
      );
      commits.mockClear();
      m.set({ readOnly: true });
      expect(commits).toHaveBeenCalledTimes(1);
      expect(m.api().getFieldState('v').error).toBeUndefined();
      commits.mockClear();
      m.set({ readOnly: false });
      expect(commits).toHaveBeenCalledTimes(1);
      expect(m.api().getFieldState('v').error).toBeUndefined();
    }
  );
});
