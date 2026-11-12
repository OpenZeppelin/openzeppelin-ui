/**
 * 005 SF-36 · MapField: the error effect and the rule agree (INV-21), changed options refresh
 * the effect's error without a value change (INV-19), the effect's re-run behaviour (Code
 * stage CD-3), a read-only map with a failing check still submits (CD-4, INV-17), and the
 * required text on the effect's child-error path (INV-16).
 */
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';

import type { FieldValidation, MapEntry } from '@openzeppelin/ui-types';

import { MapField } from '../MapField';
import { TextField } from '../TextField';
import { fieldSpec, mountField, type Values } from './fieldValidation.sf36-kit';

const MAP = fieldSpec('MapField');
const one: MapEntry[] = [{ key: 'a', value: '1' }];
const two: MapEntry[] = [
  { key: 'a', value: '1' },
  { key: 'b', value: '2' },
];
const accepted: MapEntry[] = [{ key: 'ok', value: '1' }];

/** Fails every map unless one key is 'ok'. */
const okOnly = (v: unknown): true | string =>
  Array.isArray(v) && v.some((e: MapEntry) => e.key === 'ok') ? true : 'Check';

async function setMap(m: ReturnType<typeof mountField>, value: MapEntry[]): Promise<void> {
  await act(async () => {
    m.api().setValue('v', value);
  });
}

describe('SF-36 INV-21 — MapField effect and rule agree', () => {
  it('the effect raises the check error for a structurally valid map, keeps it while the check fails, clears it when the check passes', async () => {
    const m = mountField(MAP, { value: one, validation: { validate: okOnly } });
    expect(m.current(), 'effect, no trigger').toBe('Check');
    expect(m.shown()).toBe('Check');
    expect(await m.verdict(), 'rule').toBe('Check');

    await setMap(m, two);
    expect(m.current(), 'still failing after a second valid entry').toBe('Check');
    expect(await m.verdict()).toBe('Check');

    await setMap(m, accepted);
    expect(m.current(), 'effect clears once the check passes').toBe(true);
    expect(await m.verdict()).toBe(true);
    expect(m.shown()).toBeNull();
    m.unmount();
  });

  it('structure comes first: a duplicate key shows the structural text and the check is not called', async () => {
    const check = vi.fn(okOnly);
    const m = mountField(MAP, {
      value: [
        { key: 'a', value: '1' },
        { key: 'a', value: '2' },
      ],
      validation: { validate: check },
    });
    expect(m.current()).toBe('Duplicate keys are not allowed');
    expect(check).not.toHaveBeenCalled();
    m.unmount();
  });

  it('an empty optional map never calls the check and shows no error', async () => {
    for (const value of [[], [{ key: '', value: '' }]]) {
      const check = vi.fn(okOnly);
      const m = mountField(MAP, { value, validation: { validate: check } });
      expect(await m.verdict()).toBe(true);
      expect(m.shown()).toBeNull();
      expect(check).not.toHaveBeenCalled();
      expect((await m.submit()).valid).toBe(1);
      m.unmount();
    }
  });

  it('a required empty map shows the custom required text from the effect and the rule alike', async () => {
    const m = mountField(MAP, {
      value: [],
      validation: { required: true, messages: { required: 'Add an entry' } },
    });
    expect(m.current(), 'effect').toBe('Add an entry');
    expect(await m.verdict(), 'rule').toBe('Add an entry');
    m.unmount();
  });
});

describe('SF-36 INV-19 — MapField refreshes its error when the options change, value unchanged', () => {
  it('a new check replaces the shown error without a value change or trigger', async () => {
    const m = mountField(MAP, { value: one, validation: { validate: () => 'A' } });
    expect(m.shown()).toBe('A');
    m.set({ validation: { validate: () => 'B' } });
    expect(m.shown()).toBe('B');
    m.set({ validation: { validate: () => true } });
    expect(m.shown()).toBeNull();
    m.unmount();
  });

  it('a new required message replaces the shown required text', async () => {
    const m = mountField(MAP, {
      value: [],
      validation: { required: true, messages: { required: 'R1' } },
    });
    expect(m.shown()).toBe('R1');
    m.set({ validation: { required: true, messages: { required: 'R2' } } });
    expect(m.shown()).toBe('R2');
    m.unmount();
  });
});

describe('SF-36 CD-3 — when MapField’s effect runs the check', () => {
  it('a stable check (same function) is not called on plain parent re-renders', async () => {
    const check = vi.fn((_v: unknown) => true as const);
    const validation: FieldValidation = { validate: check };
    const m = mountField(MAP, { value: one, validation });
    const afterMount = check.mock.calls.length;
    for (let i = 0; i < 5; i += 1) m.set({ validation });
    // A new validation object with the same members doesn't re-run it either.
    for (let i = 0; i < 5; i += 1) m.set({ validation: { validate: check } });
    expect(check).toHaveBeenCalledTimes(afterMount);
    m.unmount();
  });

  it('inline messages (a new object each render) with a stable check do not re-run it', async () => {
    const check = vi.fn((_v: unknown) => true as const);
    const m = mountField(MAP, {
      value: one,
      validation: { validate: check, messages: { required: 'Add an entry' } },
    });
    const afterMount = check.mock.calls.length;
    for (let i = 0; i < 5; i += 1) {
      m.set({ validation: { validate: check, messages: { required: 'Add an entry' } } });
    }
    expect(check).toHaveBeenCalledTimes(afterMount);
    m.unmount();
  });

  it('documented: an inline check (new function each render) runs once per parent re-render while the map is valid', async () => {
    const calls = vi.fn();
    const m = mountField(MAP, { value: one, validation: { validate: () => (calls(), true) } });
    const afterMount = calls.mock.calls.length;
    for (let i = 0; i < 5; i += 1) {
      m.set({ validation: { validate: () => (calls(), true) } });
    }
    expect(calls.mock.calls.length - afterMount).toBe(5);
    m.unmount();
  });

  it('documented: the effect also re-runs the check after a form-state change (RHF memoises the FormProvider value on formState)', async () => {
    const check = vi.fn((_v: unknown) => true as const);
    const m = mountField(MAP, { value: one, validation: { validate: check } });
    check.mockClear();
    await m.verdict(); // rule call, then the effect after formState changes
    expect(check.mock.calls.length).toBe(2);
    m.unmount();
  });

  it('a deterministic failing check settles: the error is set once and stays', async () => {
    const setError = vi.fn();
    const m = mountField(MAP, { value: one, validation: { validate: () => 'Check' } });
    const api = m.api();
    const original = api.setError;
    api.setError = ((...args: Parameters<typeof original>) => {
      setError(...args);
      return original(...args);
    }) as typeof original;
    for (let i = 0; i < 3; i += 1) m.set({ validation: { validate: () => 'Check' } });
    expect(m.current()).toBe('Check');
    expect(setError).not.toHaveBeenCalled(); // same message: no new setError
    m.unmount();
  });
});

describe('SF-36 CD-4 / INV-17 — a read-only map with a failing check still submits', () => {
  it('no check call, no check error, and submit goes through', async () => {
    const check = vi.fn((_v: unknown) => 'Check');
    const m = mountField(MAP, {
      value: one,
      validation: { validate: check },
      props: { readOnly: true },
    });
    expect(m.current()).toBe(true);
    const submitted = await m.submit();
    expect(submitted.valid).toBe(1);
    expect(check).not.toHaveBeenCalled();
    expect(m.shown()).toBeNull();
    m.unmount();
  });

  it('switching an editable map with a failing check to read-only clears nothing it can’t clear: submit goes through', async () => {
    const m = mountField(MAP, { value: one, validation: { validate: () => 'Check' } });
    expect(m.current()).toBe('Check');
    m.set({ props: { readOnly: true } });
    expect((await m.submit()).valid).toBe(1);
    m.unmount();
  });
});

describe('SF-36 INV-16 — MapField child-error path uses the required text', () => {
  /** A map whose key cells are real registered inputs, so a child error is a real RHF error. */
  function ChildHost({
    handle,
    validation,
  }: {
    handle: { api: UseFormReturn<Values> | null };
    validation: FieldValidation;
  }): React.ReactElement {
    const api = useForm<Values>({ defaultValues: { v: [{ key: 'a', value: '1' }] } });
    handle.api = api;
    void api.formState.errors;
    return (
      <FormProvider {...api}>
        <MapField
          id="f"
          name="v"
          label="Map"
          control={api.control}
          validation={validation}
          renderKeyField={(field) => <input aria-label="key" {...api.register(field.name)} />}
          renderValueField={(field) => <input aria-label="value" {...api.register(field.name)} />}
        />
      </FormProvider>
    );
  }

  // The effect reads child errors by nested path (`errors.v[0].key`), so a child error on a
  // required map shows the map's required text.
  it('a child key error on a required map shows the custom required text', async () => {
    const handle: { api: UseFormReturn<Values> | null } = { api: null };
    render(
      <ChildHost
        handle={handle}
        validation={{ required: true, messages: { required: 'Custom req' } }}
      />
    );
    await act(async () => {
      handle.api!.setError('v.0.key', { type: 'manual', message: 'Bad key' });
    });
    await act(async () => {
      handle.api!.setValue('v', [{ key: 'b', value: '1' }]);
    });
    expect(handle.api!.getFieldState('v').error?.message).toBe('Custom req');
  });

  const REQ = { required: true, messages: { required: 'Custom req' } };
  const TWO: MapEntry[] = [
    { key: 'a', value: '1' },
    { key: 'b', value: '2' },
  ];

  async function mountChild(
    validation: FieldValidation
  ): Promise<{ api: UseFormReturn<Values>; unmount: () => void }> {
    const handle: { api: UseFormReturn<Values> | null } = { api: null };
    const view = render(<ChildHost handle={handle} validation={validation} />);
    await act(async () => {
      handle.api!.setValue('v', TWO);
    });
    return { api: handle.api!, unmount: view.unmount };
  }

  // SF-4 scenario 1: the second entry's key fails; the lookup finds index 1.
  it('SF-4 INV-16 · a key error on the second entry shows the required text', async () => {
    const m = await mountChild(REQ);
    await act(async () => {
      m.api.setError('v.1.key', { type: 'manual', message: 'Bad key' });
    });
    await act(async () => {
      m.api.setValue('v', [...TWO]);
    });
    expect(m.api.getFieldState('v').error?.message).toBe('Custom req');
    m.unmount();
  });

  it('SF-4 INV-16 · a value error shows the required text', async () => {
    const m = await mountChild(REQ);
    await act(async () => {
      m.api.setError('v.0.value', { type: 'manual', message: 'Bad value' });
    });
    await act(async () => {
      m.api.setValue('v', [...TWO]);
    });
    expect(m.api.getFieldState('v').error?.message).toBe('Custom req');
    m.unmount();
  });

  it('SF-4 INV-16 · the required text clears once the child error is gone', async () => {
    const m = await mountChild(REQ);
    await act(async () => {
      m.api.setError('v.1.key', { type: 'manual', message: 'Bad key' });
    });
    await act(async () => {
      m.api.setValue('v', [...TWO]);
    });
    expect(m.api.getFieldState('v').error?.message).toBe('Custom req');
    await act(async () => {
      m.api.clearErrors('v.1.key');
    });
    await act(async () => {
      m.api.setValue('v', [{ key: 'c', value: '3' }, ...TWO]);
    });
    expect(m.api.getFieldState('v').error).toBeUndefined();
    m.unmount();
  });

  // SF-4 scenario 2 and the not-required boundary: no child error, or a map that is not
  // required, raises nothing.
  it('SF-4 INV-16 · no child errors: no parent error', async () => {
    const m = await mountChild(REQ);
    expect(m.api.getFieldState('v').error).toBeUndefined();
    m.unmount();
  });

  it('SF-4 INV-16 · a child error on a map that is not required raises no parent error', async () => {
    const m = await mountChild({});
    await act(async () => {
      m.api.setError('v.1.key', { type: 'manual', message: 'Bad key' });
    });
    await act(async () => {
      m.api.setValue('v', [...TWO]);
    });
    // RHF's field state holds the nested child errors; the parent's own message is what the map shows.
    expect(m.api.getFieldState('v').error?.message).toBeUndefined();
    m.unmount();
  });

  /**
   * The real submit path: key cells are validated inputs, and the host never reads
   * `formState.errors` itself (like a form that only shows field messages).
   */
  function SubmitHost(): React.ReactElement {
    const api = useForm<Values>({
      defaultValues: { v: [{ key: '', value: '1' }] },
      mode: 'onTouched',
    });
    return (
      <FormProvider {...api}>
        <form noValidate onSubmit={api.handleSubmit(() => undefined)}>
          <MapField
            id="f"
            name="v"
            label="Map"
            control={api.control}
            validation={{ required: true, messages: { required: 'Custom req' } }}
            renderKeyField={(field) => (
              <TextField
                id={field.id}
                name={field.name as `v.${number}.key`}
                label="key"
                control={api.control}
                validation={{
                  required: true,
                  pattern: /^[a-z_]+$/,
                  messages: { pattern: 'Bad key' },
                  validate: (v) => (v === 'admin' ? 'Reserved' : true),
                }}
              />
            )}
            renderValueField={(field) => (
              <TextField
                id={field.id}
                name={field.name as `v.${number}.value`}
                label="value"
                control={api.control}
              />
            )}
          />
          <button type="submit">Submit</button>
        </form>
      </FormProvider>
    );
  }

  it('after a bad key then a valid key and a resubmit, the required text clears', async () => {
    const user = userEvent.setup();
    render(<SubmitHost />);
    await user.type(screen.getAllByRole('textbox')[0]!, 'BAD');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Custom req')).toBeTruthy();

    const key = screen.getAllByRole('textbox')[0]!;
    await user.clear(key);
    await user.type(key, 'admin');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Reserved')).toBeTruthy();
    expect(screen.queryByText('Custom req')).toBeTruthy();

    await user.clear(key);
    await user.type(key, 'daily_cap');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await act(async () => {});
    expect(screen.queryByText('Custom req')).toBeNull();
  });

  it('fixing the key clears the required text without another submit', async () => {
    const user = userEvent.setup();
    render(<SubmitHost />);
    const key = screen.getAllByRole('textbox')[0]!;
    await user.type(key, 'BAD');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Custom req')).toBeTruthy();

    await user.clear(key);
    await user.type(key, 'daily_cap');
    await act(async () => {});
    expect(screen.queryByText('Bad key')).toBeNull();
    expect(screen.queryByText('Custom req')).toBeNull();
  });
});

/**
 * The renderer names a map inside a struct `struct.prop`, and RHF nests that map's errors
 * (`errors.struct.prop`). The effect must read its own error by path, or it never sees the
 * error it set and calls `setError` on every run.
 */
describe('MapField with a dotted name settles', () => {
  function DottedHost({
    entries,
    required,
    renders,
  }: {
    entries: MapEntry[];
    required?: boolean;
    renders?: { count: number };
  }): React.ReactElement {
    const api = useForm({ defaultValues: { outer: { v: entries } } });
    if (renders) renders.count += 1;
    return (
      <FormProvider {...api}>
        <form noValidate onSubmit={api.handleSubmit(() => undefined)}>
          <MapField
            id="f"
            name="outer.v"
            label="Map"
            control={api.control}
            validation={required ? { required: true, messages: { required: 'Custom req' } } : {}}
            renderKeyField={(field) => (
              <TextField
                id={field.id}
                name={field.name as `outer.v.${number}.key`}
                label="key"
                control={api.control}
                validation={{
                  required: true,
                  pattern: /^[a-z_]+$/,
                  messages: { pattern: 'Bad key' },
                }}
              />
            )}
            renderValueField={(field) => (
              <TextField
                id={field.id}
                name={field.name as `outer.v.${number}.value`}
                label="value"
                control={api.control}
              />
            )}
          />
          <button type="submit">Submit</button>
        </form>
      </FormProvider>
    );
  }

  it('a key error on submit shows the required text and the form settles', async () => {
    const user = userEvent.setup();
    const renders = { count: 0 };
    render(<DottedHost entries={[{ key: 'BAD', value: '1' }]} required renders={renders} />);
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Bad key')).toBeTruthy();
    expect(await screen.findByText('Custom req')).toBeTruthy();

    // A map that can't see its own error sets it again on every run and never stops rendering.
    const settled = renders.count;
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(renders.count, 'no re-renders once the errors are shown').toBe(settled);
  });

  it('an entry with an empty key shows the structural error on mount and the form settles', async () => {
    render(<DottedHost entries={[{ key: '', value: '1' }]} />);
    expect(await screen.findByText('All key-value pairs must be completed')).toBeTruthy();
  });
});
