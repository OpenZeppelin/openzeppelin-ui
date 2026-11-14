/**
 * @vitest-environment jsdom
 *
 * SearchableMultiSelectField with `showSelected="chips"`: the field forwards the three chips
 * props, a chip removal is an ordinary change of the form value (validated by the form's mode,
 * submitted in chip order with stale ids kept), both read-only modes show chips without
 * remove buttons, a form reset shows in the chips, and switching modes keeps the form ref.
 */
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FieldValues, Mode } from 'react-hook-form';

import { FieldHarness, type FieldOptions } from './smsf.sf16-harness';
import { api, FIELD_NAME, newHandle, q, type FieldHandle } from './smsf.sf16-kit';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const setup = () => userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });

const CHIPS: FieldOptions = { showSelected: 'chips' };

function mount(
  options: FieldOptions = CHIPS,
  defaultValues?: FieldValues,
  mode: Mode = 'onSubmit'
) {
  const handle = newHandle();
  const utils = render(
    <FieldHarness handle={handle} options={options} defaultValues={defaultValues} mode={mode} />
  );
  const rerender = (next: FieldOptions) =>
    utils.rerender(
      <FieldHarness handle={handle} options={next} defaultValues={defaultValues} mode={mode} />
    );
  return { handle, rerender };
}

const chipLabels = (): string[] =>
  Array.from(document.querySelectorAll('[data-slot="searchable-multi-select-chip"]')).map(
    (li) => li.textContent ?? ''
  );
const removeButtons = (): HTMLButtonElement[] =>
  Array.from(
    document.querySelectorAll<HTMLButtonElement>(
      '[data-slot="searchable-multi-select-chip-remove"]'
    )
  );
const removeButton = (label: string): HTMLButtonElement =>
  screen.getByRole('button', { name: `Remove ${label}` });
const chipList = (): HTMLElement | null =>
  document.querySelector('[data-slot="searchable-multi-select-chips"]');
const status = (): string =>
  document.querySelector('[data-slot="searchable-multi-select-chips-status"]')?.textContent ?? '';
const value = (handle: FieldHandle): unknown => api(handle).getValues(FIELD_NAME);
const touched = (handle: FieldHandle): unknown =>
  (api(handle).formState.touchedFields as Record<string, unknown>)[FIELD_NAME];

async function submit(user: ReturnType<typeof setup>): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Submit' }));
}

describe('the field forwards the chips props', () => {
  it('chips render under the trigger, with the field label naming the list', () => {
    mount(CHIPS, { countries: ['ES', 'FR'] });
    expect(chipLabels()).toEqual(['Spain', 'France']);
    const list = screen.getByRole('list', { name: 'Allowed countries' });
    expect(list).toBe(chipList());
    expect(q.trigger().contains(list)).toBe(false);
  });

  it('custom copy reaches the buttons and the announcement', async () => {
    const user = setup();
    mount(
      {
        showSelected: 'chips',
        formatRemoveLabel: (label) => `Quitar ${label}`,
        formatRemovedAnnouncement: (label) => `${label} quitado`,
      },
      { countries: ['ES', 'FR'] }
    );
    await user.click(screen.getByRole('button', { name: 'Quitar Spain' }));
    expect(status()).toBe('Spain quitado');
  });

  it('without showSelected the field stays in count mode', () => {
    mount({}, { countries: ['ES', 'FR'] });
    expect(chipList()).toBeNull();
    expect(document.querySelector('[data-slot="searchable-multi-select"]')).toBeNull();
  });

  it('chipClassName reaches each chip under the field', () => {
    mount({ showSelected: 'chips', chipClassName: 'border-primary' }, { countries: ['ES', 'FR'] });
    const items = Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="searchable-multi-select-chip"]')
    );
    expect(items).toHaveLength(2);
    for (const li of items) {
      expect(li.className.split(/\s+/)).toContain('border-primary');
      expect(li.className.split(/\s+/)).not.toContain('border-border');
    }
  });
});

describe('a chip removal is an ordinary change of the form value', () => {
  it('submits the remaining chips in chip order, with stale ids in place', async () => {
    const user = setup();
    const { handle } = mount(CHIPS, { countries: ['ES', 'ZZ', 'FR', 'DE'] });
    await user.click(removeButton('France'));
    expect(value(handle)).toEqual(['ES', 'ZZ', 'DE']);
    expect(chipLabels()).toEqual(['Spain', 'Germany']);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Remove Germany');
    await submit(user);
    expect(handle.submits).toEqual([{ countries: ['ES', 'ZZ', 'DE'] }]);
  });

  it('keyboard removal, then submit: the payload matches the chips', async () => {
    const user = setup();
    const { handle } = mount(CHIPS, { countries: ['IT', 'JP', 'BR'] });
    act(() => removeButton('Japan').focus());
    await user.keyboard('{Enter}');
    await submit(user);
    expect(handle.submits.at(-1)).toEqual({ countries: ['IT', 'BR'] });
    expect(chipLabels()).toEqual(['Italy', 'Brazil']);
  });

  it('onChange mode: removing the last chip of a required field shows the error at once', async () => {
    const user = setup();
    mount({ ...CHIPS, validation: { required: true } }, { countries: ['ES'] }, 'onChange');
    expect(q.error()).toBeNull();
    await user.click(removeButton('Spain'));
    expect(q.error()?.textContent).toBe('This field is required');
    expect(document.activeElement).toBe(q.trigger());
  });

  it('onTouched mode: removing the last chip neither touches the field nor shows the error; submit does', async () => {
    const user = setup();
    const { handle } = mount(
      { ...CHIPS, validation: { required: true } },
      { countries: ['ES'] },
      'onTouched'
    );
    await user.click(removeButton('Spain'));
    // Focus lands on the trigger, but focusing it alone is not a touch and opens nothing.
    expect(document.activeElement).toBe(q.trigger());
    expect(q.dialog()).toBeNull();
    expect(touched(handle)).toBeUndefined();
    expect(q.error()).toBeNull();
    await submit(user);
    expect(handle.submits).toEqual([]);
    expect(q.error()?.textContent).toBe('This field is required');
  });

  it('onSubmit mode: a removal that leaves chips does not validate early', async () => {
    const user = setup();
    const { handle } = mount(
      { ...CHIPS, validation: { required: true } },
      { countries: ['ES', 'FR'] }
    );
    await user.click(removeButton('Spain'));
    expect(q.error()).toBeNull();
    expect(touched(handle)).toBeUndefined();
    await submit(user);
    expect(handle.submits).toEqual([{ countries: ['FR'] }]);
  });

  it('a removal by mouse does not mark the field touched', async () => {
    const user = setup();
    const { handle } = mount(CHIPS, { countries: ['ES', 'FR', 'DE'] }, 'onTouched');
    await user.click(removeButton('France'));
    await user.click(removeButton('Spain'));
    expect(touched(handle)).toBeUndefined();
    expect(value(handle)).toEqual(['DE']);
  });
});

describe('read-only fields show chips without remove buttons', () => {
  it('default read-only mode: disabled look, nothing removable, value left out of submit data', async () => {
    const user = setup();
    const { handle } = mount({ ...CHIPS, readOnly: true }, { countries: ['FR', 'DE'] });
    expect(chipLabels()).toEqual(['France', 'Germany']);
    expect(removeButtons()).toHaveLength(0);
    expect(chipList()?.className).toMatch(/\bopacity-50\b/);
    for (const li of Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="searchable-multi-select-chip"]')
    )) {
      await user.click(li);
    }
    await user.keyboard('{Delete}{Backspace}');
    expect(value(handle)).toEqual(['FR', 'DE']);
    await submit(user);
    expect(handle.submits).toEqual([{}]);
  });

  it('readonly mode: read-only look, nothing removable, value submitted unchanged', async () => {
    const user = setup();
    const { handle } = mount(
      { ...CHIPS, readOnly: true, readOnlyMode: 'readonly' },
      { countries: ['FR', 'DE'] }
    );
    expect(chipLabels()).toEqual(['France', 'Germany']);
    expect(removeButtons()).toHaveLength(0);
    expect(chipList()?.className).not.toMatch(/opacity-50/);
    const root = document.querySelector('[data-slot="searchable-multi-select"]') as HTMLElement;
    expect(Array.from(root.querySelectorAll('button'))).toEqual([q.trigger()]);
    act(() => q.trigger().focus());
    await user.tab();
    expect(document.activeElement?.getAttribute('data-slot')).not.toBe(
      'searchable-multi-select-chip-remove'
    );
    await submit(user);
    expect(handle.submits).toEqual([{ countries: ['FR', 'DE'] }]);
  });

  it('toggling read-only at runtime drops and restores the remove buttons', () => {
    const { rerender } = mount(CHIPS, { countries: ['FR', 'DE'] });
    expect(removeButtons()).toHaveLength(2);
    rerender({ ...CHIPS, readOnly: true, readOnlyMode: 'readonly' });
    expect(removeButtons()).toHaveLength(0);
    rerender(CHIPS);
    expect(removeButtons()).toHaveLength(2);
  });
});

describe('the chips follow the form value', () => {
  it('reset() shows in the chips and clears the announcement', async () => {
    const user = setup();
    const { handle } = mount(CHIPS, { countries: ['FR', 'DE'] });
    await user.click(removeButton('France'));
    expect(status()).toBe('France removed');
    act(() => api(handle).reset({ countries: ['JP', 'IT'] }));
    expect(chipLabels()).toEqual(['Japan', 'Italy']);
    expect(status()).toBe('');
  });

  it('setValue() shows in the chips', () => {
    const { handle } = mount(CHIPS, { countries: [] });
    expect(chipList()).toBeNull();
    act(() => api(handle).setValue(FIELD_NAME, ['BR', 'ES']));
    expect(chipLabels()).toEqual(['Brazil', 'Spain']);
  });
});

describe('switching display modes at runtime keeps the form wiring', () => {
  it('setFocus focuses the mounted trigger after count → chips → count', async () => {
    const { handle, rerender } = mount({}, { countries: ['FR'] });
    rerender(CHIPS);
    // The trigger moves under the chips root (a new node); the form ref must follow it.
    act(() => api(handle).setFocus(FIELD_NAME));
    // react-hook-form focuses on a timer.
    await waitFor(() => expect(document.activeElement).toBe(q.trigger()));
    expect(chipLabels()).toEqual(['France']);
    rerender({});
    act(() => (document.activeElement as HTMLElement | null)?.blur());
    act(() => api(handle).setFocus(FIELD_NAME));
    await waitFor(() => expect(document.activeElement).toBe(q.trigger()));
    expect(value(handle)).toEqual(['FR']);
  });

  it('a failed submit after switching to chips focuses the trigger', async () => {
    const user = setup();
    const { rerender } = mount({ validation: { required: true } }, { countries: [] });
    rerender({ ...CHIPS, validation: { required: true } });
    await submit(user);
    expect(document.activeElement).toBe(q.trigger());
  });
});
