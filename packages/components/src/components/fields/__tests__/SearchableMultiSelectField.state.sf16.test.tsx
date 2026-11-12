/**
 * @vitest-environment jsdom
 *
 * 005 SF-16 · Prop / state contract (jsdom).
 * INV-7 value verbatim and never written by the field, INV-8 pick order (+ seeded property
 * test against a toggleId model), INV-9 non-array reads as empty, INV-10 required,
 * INV-11 custom rule, INV-12 rules follow props, INV-13 readOnly, INV-21 external writes,
 * INV-24 late / empty / changing items.
 * artifacts/005-uikit-requests/sf-16-searchable-multi-select-field/03-invariants.md
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FieldValues } from 'react-hook-form';

import { FieldHarness, type FieldOptions } from './smsf.sf16-harness';
import {
  api,
  COUNTRIES,
  FIELD_NAME,
  modelToggle,
  newHandle,
  q,
  seeded,
  type FieldHandle,
} from './smsf.sf16-kit';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const setup = () => userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });

function mount(options: FieldOptions = {}, defaultValues?: FieldValues) {
  const handle = newHandle();
  const utils = render(
    <FieldHarness handle={handle} options={options} defaultValues={defaultValues} />
  );
  const rerender = (next: FieldOptions) =>
    utils.rerender(<FieldHarness handle={handle} options={next} defaultValues={defaultValues} />);
  return { handle, rerender, unmount: utils.unmount };
}

const value = (handle: FieldHandle): unknown => api(handle).getValues(FIELD_NAME);

async function submit(user: ReturnType<typeof setup>): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Submit' }));
}

async function validate(handle: FieldHandle): Promise<boolean> {
  let ok = false;
  await act(async () => {
    ok = await api(handle).trigger(FIELD_NAME);
  });
  return ok;
}

const message = (handle: FieldHandle): string | undefined =>
  api(handle).formState.errors[FIELD_NAME]?.message as string | undefined;

// ── INV-7 ─────────────────────────────────────────────────────────────────────────────────
describe('INV-7: the form value is the last emitted array, verbatim; the field never writes', () => {
  it('happy: after a toggle, getValues is the very array SF-15 emitted (same reference)', async () => {
    const user = setup();
    const { handle } = mount();
    const emitted: unknown[] = [];
    const sub = api(handle).watch((values) => emitted.push(values[FIELD_NAME]));
    await user.click(q.trigger());
    await user.click(q.option('Italy'));
    const after = value(handle);
    expect(after).toEqual(['IT']);
    // A second read returns the same reference: RHF stores the emitted array, no copy.
    expect(value(handle)).toBe(after);
    sub.unsubscribe();
    expect(emitted.length).toBe(1);
  });

  it('happy: valid submit payload deep-equals getValues', async () => {
    const user = setup();
    const { handle } = mount({}, { countries: ['DE', 'ZZ'] });
    await submit(user);
    expect(handle.submits).toEqual([{ countries: ['DE', 'ZZ'] }]);
    expect(handle.submits[0]?.[FIELD_NAME]).toEqual(value(handle));
  });

  it('failure guard: mount, open, close, blur, items swap and readOnly toggles never write', async () => {
    const user = setup();
    const initial = ['DE', 'ZZ'];
    const { handle, rerender } = mount({}, { countries: initial });
    const ref0 = value(handle);
    let writes = 0;
    const sub = api(handle).watch(() => {
      writes += 1;
    });

    await user.click(q.trigger()); // open
    await user.keyboard('{Escape}'); // close
    await user.tab(); // blur
    rerender({ items: COUNTRIES.slice(0, 2) }); // items swap
    rerender({ items: [] });
    rerender({ readOnly: true });
    rerender({ readOnly: false });

    expect(value(handle)).toBe(ref0);
    expect(api(handle).formState.isDirty).toBe(false);
    expect(writes).toBe(0);
    sub.unsubscribe();
  });

  it('boundary: Clear all writes a fresh [] (the only non-toggle write)', async () => {
    const user = setup();
    const { handle } = mount({}, { countries: ['FR', 'DE'] });
    await user.click(q.trigger());
    await user.click(q.clear() as HTMLButtonElement);
    expect(value(handle)).toEqual([]);
    expect(Object.isFrozen(value(handle))).toBe(false);
  });
});

// ── INV-8 ─────────────────────────────────────────────────────────────────────────────────
describe('INV-8: submitted order is pick order, never item order', () => {
  it('pointer: B, A, C, deselect A, pick A → [B, C, A] (by codes DE, FR, IT)', async () => {
    const user = setup();
    const { handle } = mount();
    await user.click(q.trigger());
    await user.click(q.option('Germany'));
    await user.click(q.option('France'));
    await user.click(q.option('Italy'));
    await user.click(q.option('France'));
    await user.click(q.option('France'));
    await user.keyboard('{Escape}');
    await submit(user);
    expect(handle.submits.at(-1)).toEqual({ countries: ['DE', 'IT', 'FR'] });
  });

  it('keyboard (search + Enter): Japan then France → [JP, FR]', async () => {
    const user = setup();
    const { handle } = mount();
    await user.click(q.trigger());
    await user.type(q.search() as HTMLInputElement, 'jap');
    await user.keyboard('{Enter}');
    await user.clear(q.search() as HTMLInputElement);
    await user.type(q.search() as HTMLInputElement, 'fra');
    await user.keyboard('{Enter}');
    await user.keyboard('{Escape}');
    await submit(user);
    expect(handle.submits.at(-1)).toEqual({ countries: ['JP', 'FR'] });
  });

  it('boundary: stale ids keep their place: [ZZ, FR] + DE → [ZZ, FR, DE]', async () => {
    const user = setup();
    const { handle } = mount({}, { countries: ['ZZ', 'FR'] });
    await user.click(q.trigger());
    await user.click(q.option('Germany'));
    await user.keyboard('{Escape}');
    await submit(user);
    expect(handle.submits.at(-1)).toEqual({ countries: ['ZZ', 'FR', 'DE'] });
  });

  it('boundary: Clear all on an optional field submits []', async () => {
    const user = setup();
    const { handle } = mount({}, { countries: ['ZZ', 'FR'] });
    await user.click(q.trigger());
    await user.click(q.clear() as HTMLButtonElement);
    await user.keyboard('{Escape}');
    await submit(user);
    expect(handle.submits.at(-1)).toEqual({ countries: [] });
  });

  it('property: 25 seeded toggle sequences match the toggleId reference model', async () => {
    const rand = seeded(16);
    for (let run = 0; run < 25; run += 1) {
      const user = setup();
      const start = rand() < 0.3 ? ['ZZ'] : [];
      const { handle, unmount } = mount({}, { countries: start });
      let model: string[] = [...start];
      await user.click(q.trigger());
      const steps = 1 + Math.floor(rand() * 8);
      for (let i = 0; i < steps; i += 1) {
        if (rand() < 0.1) {
          const clear = q.clear();
          if (clear) {
            await user.click(clear);
            model = [];
            continue;
          }
        }
        const pick = COUNTRIES[Math.floor(rand() * COUNTRIES.length)];
        if (!pick) continue;
        await user.click(q.option(pick.name));
        model = modelToggle(model, pick.code);
      }
      expect(value(handle)).toEqual(model);
      unmount();
    }
  });
});

// ── INV-9 ─────────────────────────────────────────────────────────────────────────────────
describe('INV-9: a non-array value reads as empty in display and rules, never written back', () => {
  it.each([undefined, null, 'FR', {}])('value %j: placeholder + required error', async (v) => {
    const user = setup();
    const { handle } = mount(
      { validation: { required: true }, placeholder: 'None' },
      { countries: v }
    );
    expect(q.triggerText()).toBe('None');
    await submit(user);
    expect(message(handle)).toBe('This field is required');
    // The field never normalised it into form state.
    expect(value(handle)).toEqual(v);
  });

  it('first pick from a non-array writes a fresh, unfrozen [x]', async () => {
    const user = setup();
    const { handle } = mount({}, { countries: undefined });
    await user.click(q.trigger());
    await user.click(q.option('France'));
    const v = value(handle);
    expect(v).toEqual(['FR']);
    expect(Object.isFrozen(v)).toBe(false);
    (v as string[]).push('X'); // integrator mutation must not throw
  });

  it('Clear all from a stale array writes a fresh unfrozen []', async () => {
    const user = setup();
    const { handle } = mount({}, { countries: ['ZZ'] });
    await user.click(q.trigger());
    await user.click(q.clear() as HTMLButtonElement);
    expect(Object.isFrozen(value(handle))).toBe(false);
  });

  it('optional + non-array legacy value "FR": shows nothing, submits "FR" untouched (OQ-4 contract)', async () => {
    const user = setup();
    const { handle } = mount({ placeholder: 'None' }, { countries: 'FR' });
    expect(q.triggerText()).toBe('None');
    await submit(user);
    expect(handle.submits.at(-1)).toEqual({ countries: 'FR' });
  });
});

// ── INV-10 ────────────────────────────────────────────────────────────────────────────────
describe('INV-10: required rule', () => {
  const VALUES: Array<[string, unknown, boolean]> = [
    ['[]', [], true],
    ['undefined', undefined, true],
    ['null', null, true],
    ["'FR'", 'FR', true],
    ["['ZZ'] stale", ['ZZ'], false],
    ["['FR']", ['FR'], false],
  ];

  it.each(VALUES)('required + %s → empty=%s', async (_n, v, empty) => {
    const spy = vi.fn(() => true);
    const { handle } = mount(
      { validation: { required: true }, validateSelection: spy },
      { countries: v }
    );
    const ok = await validate(handle);
    expect(ok).toBe(!empty);
    expect(message(handle)).toBe(empty ? 'This field is required' : undefined);
    expect(spy).toHaveBeenCalledTimes(empty ? 0 : 1);
  });

  it.each(VALUES)('optional + %s → always valid; rule skipped when empty', async (_n, v, empty) => {
    const spy = vi.fn(() => true);
    const { handle } = mount({ validateSelection: spy }, { countries: v });
    expect(await validate(handle)).toBe(true);
    expect(message(handle)).toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(empty ? 0 : 1);
  });

  it('happy end-to-end: required empty submit blocked, success handler not called', async () => {
    const user = setup();
    const { handle } = mount({ validation: { required: true } });
    await submit(user);
    expect(handle.submits).toEqual([]);
    expect(handle.invalids).toBe(1);
  });
});

// ── INV-11 ────────────────────────────────────────────────────────────────────────────────
describe('INV-11: custom rule — non-empty only, after required, never an empty message', () => {
  it.each([
    ['true', true, undefined],
    ["'Too many'", 'Too many', 'Too many'],
    ['false', false, 'Invalid selection'],
    ["''", '', 'Invalid selection'],
    ['undefined (untyped caller)', undefined, 'Invalid selection'],
  ] as const)('validateSelection → %s → %j', async (_n, result, expected) => {
    // `undefined` simulates an untyped JS caller (A3).
    const spy = vi.fn((_ids: readonly string[]) => result as boolean | string);
    const { handle } = mount({ validateSelection: spy }, { countries: ['FR', 'DE'] });
    await validate(handle);
    expect(message(handle)).toBe(expected);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toBe(value(handle)); // the form's array, same reference
  });

  it('runs after required: required + empty never reaches the rule', async () => {
    const spy = vi.fn(() => 'never');
    const { handle } = mount({ validation: { required: true }, validateSelection: spy });
    await validate(handle);
    expect(message(handle)).toBe('This field is required');
    expect(spy).not.toHaveBeenCalled();
  });
});

// ── INV-12 ────────────────────────────────────────────────────────────────────────────────
describe('INV-12: rules follow the latest props', () => {
  it('optional → required between renders: next validation uses required', async () => {
    const { handle, rerender } = mount({});
    expect(await validate(handle)).toBe(true);
    rerender({ validation: { required: true } });
    expect(await validate(handle)).toBe(false);
    expect(message(handle)).toBe('This field is required');
  });

  it('required → optional: the error goes away on the next validation', async () => {
    const { handle, rerender } = mount({ validation: { required: true } });
    expect(await validate(handle)).toBe(false);
    rerender({});
    expect(await validate(handle)).toBe(true);
  });

  it('validateSelection swap () => true → () => "No" applies', async () => {
    const { handle, rerender } = mount({ validateSelection: () => true }, { countries: ['FR'] });
    expect(await validate(handle)).toBe(true);
    rerender({ validateSelection: () => 'No' });
    expect(await validate(handle)).toBe(false);
    expect(message(handle)).toBe('No');
  });
});

// ── INV-13 ────────────────────────────────────────────────────────────────────────────────
describe('INV-13: readOnly disables the control, keeps the value and the rules', () => {
  it('happy: disabled trigger; click / label / keys open nothing; submit carries the value', async () => {
    const user = setup();
    const { handle } = mount({ readOnly: true }, { countries: ['FR', 'DE'] });
    expect(q.trigger().disabled).toBe(true);
    await user.click(q.trigger());
    await user.click(screen.getByText('Allowed countries'));
    q.trigger().focus();
    await user.keyboard('{Enter}{ArrowDown} ');
    expect(q.dialog()).toBeNull();
    await submit(user);
    expect(handle.submits).toEqual([{ countries: ['FR', 'DE'] }]);
    expect(handle.submits[0]?.[FIELD_NAME]).toEqual(value(handle));
  });

  it('rules still run under readOnly (OQ-3 current contract): required + empty blocks submit', async () => {
    const user = setup();
    const { handle } = mount({ readOnly: true, validation: { required: true } });
    await submit(user);
    expect(handle.submits).toEqual([]);
    expect(q.error()?.textContent).toBe('This field is required');
    expect(document.activeElement).not.toBe(q.trigger()); // a disabled trigger can't take focus
  });

  it('readOnly while open: closes, emits nothing, value reference kept; off again restores', async () => {
    const user = setup();
    const { handle, rerender } = mount({}, { countries: ['FR'] });
    const ref0 = value(handle);
    await user.click(q.trigger());
    expect(q.dialog()).not.toBeNull();
    rerender({ readOnly: true });
    expect(q.dialog()).toBeNull();
    expect(value(handle)).toBe(ref0);
    rerender({ readOnly: false });
    expect(value(handle)).toBe(ref0);
    await user.click(q.trigger());
    await user.click(q.option('Italy'));
    expect(value(handle)).toEqual(['FR', 'IT']);
  });
});

// ── INV-21 ────────────────────────────────────────────────────────────────────────────────
describe('INV-21: external writes are shown, not echoed', () => {
  it('setValue while open: options + trigger update; no echo; dialog open; focus kept', async () => {
    const user = setup();
    const { handle } = mount({}, { countries: [] });
    await user.click(q.trigger());
    const search = q.search();
    const written = ['DE', 'ZZ'];
    // An echo would arrive as a field.onChange event (type 'change'); setValue's own
    // notifications carry no type.
    const changeEvents: string[] = [];
    const sub = api(handle).watch((_v, info) => {
      if (info.type === 'change') changeEvents.push(String(info.name));
    });
    await act(async () => {
      api(handle).setValue(FIELD_NAME, written);
    });
    expect(changeEvents).toEqual([]);
    expect(q.selected().Germany).toBe('true');
    expect(q.triggerText()).toBe('2 selected');
    expect(q.dialog()).not.toBeNull();
    expect(document.activeElement).toBe(search);
    // RHF setValue clones arrays itself, so equality (not identity): not pruned, not reordered.
    expect(value(handle)).toEqual(written);
    expect(api(handle).formState.dirtyFields[FIELD_NAME]).toBeUndefined();
    // Sensitivity control: a real pick does arrive as a 'change' event.
    await user.click(q.option('Italy'));
    expect(changeEvents).toEqual([FIELD_NAME]);
    sub.unsubscribe();
  });

  it('reset() / resetField() go back to defaults without echo', async () => {
    const user = setup();
    const { handle } = mount({}, { countries: ['FR'] });
    await user.click(q.trigger());
    await user.click(q.option('Italy'));
    expect(value(handle)).toEqual(['FR', 'IT']);
    await act(async () => {
      api(handle).reset();
    });
    expect(value(handle)).toEqual(['FR']);
    expect(q.selected().Italy).toBe('false');
    expect(api(handle).formState.isDirty).toBe(false);
    await user.click(q.option('Japan'));
    await act(async () => {
      api(handle).resetField(FIELD_NAME);
    });
    expect(value(handle)).toEqual(['FR']);
    expect(q.dialog()).not.toBeNull();
    expect(api(handle).formState.isDirty).toBe(false);
  });
});

// ── INV-24 ────────────────────────────────────────────────────────────────────────────────
describe('INV-24: late, empty or changing items never touch the value', () => {
  it('items [] → full list: count shown, empty text, then selection flags; no validate call', async () => {
    const user = setup();
    const spy = vi.fn(() => true);
    const handle = newHandle();
    const dv = { countries: ['FR', 'DE'] };
    const opts: FieldOptions = { items: [], validateSelection: spy, emptyText: 'Loading…' };
    const { rerender } = render(<FieldHarness handle={handle} options={opts} defaultValues={dv} />);
    const ref0 = value(handle);
    expect(q.triggerText()).toBe('2 selected');
    await user.click(q.trigger());
    expect(screen.getByText('Loading…')).toBeTruthy();
    rerender(
      <FieldHarness handle={handle} options={{ ...opts, items: COUNTRIES }} defaultValues={dv} />
    );
    expect(q.selected()).toMatchObject({ France: 'true', Germany: 'true', Italy: 'false' });
    expect(value(handle)).toBe(ref0);
    expect(spy).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    await submit(user);
    expect(handle.submits.at(-1)).toEqual({ countries: ['FR', 'DE'] });
  });

  it('refetch drops an item: the id stays (stale) and is still submitted', async () => {
    const user = setup();
    const handle = newHandle();
    const dv = { countries: ['FR', 'JP'] };
    const { rerender } = render(<FieldHarness handle={handle} defaultValues={dv} />);
    rerender(
      <FieldHarness
        handle={handle}
        options={{ items: COUNTRIES.filter((c) => c.code !== 'JP') }}
        defaultValues={dv}
      />
    );
    expect(q.triggerText()).toBe('2 selected');
    await submit(user);
    expect(handle.submits.at(-1)).toEqual({ countries: ['FR', 'JP'] });
  });
});
