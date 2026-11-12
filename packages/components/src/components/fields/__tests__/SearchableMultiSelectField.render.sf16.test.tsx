/**
 * @vitest-environment jsdom
 *
 * 005 SF-16 · Render contract + accessibility (jsdom layer).
 * INV-1 shell, INV-2 state on the trigger only, INV-3 describedby resolves (SF-1),
 * INV-4 trigger shows the form value, INV-25 names, INV-26 alert + description.
 * axe and the real-browser a11y tree live in the Chromium suite.
 * artifacts/005-uikit-requests/sf-16-searchable-multi-select-field/03-invariants.md
 */
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { useForm, type FieldValues } from 'react-hook-form';

import { SearchableMultiSelectField } from '../SearchableMultiSelectField';
import { getAccessibilityProps } from '../utils';
import { FieldHarness, type FieldOptions } from './smsf.sf16-harness';
import {
  api,
  COUNTRIES,
  countryId,
  countryLabel,
  danglingDescribedBy,
  FIELD_ID,
  FIELD_NAME,
  newHandle,
  q,
  type Country,
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
  return { handle, ...utils };
}

async function setManualError(handle: ReturnType<typeof newHandle>, message = 'Boom') {
  await act(async () => {
    api(handle).setError(FIELD_NAME, { type: 'manual', message });
  });
}

// ── INV-1 · INV-3: the 16-cell shell matrix ─────────────────────────────────────────────────
const MATRIX = [true, false].flatMap((label) =>
  [true, false].flatMap((required) =>
    [true, false].flatMap((helper) =>
      [true, false].map((error) => ({ label, required, helper, error }))
    )
  )
);

describe('INV-1 / INV-3: shell matrix {label} × {required} × {helper} × {error}', () => {
  it.each(MATRIX)(
    'label=$label required=$required helper=$helper error=$error',
    async ({ label, required, helper, error }) => {
      const { handle } = mount({
        label: label ? 'Allowed countries' : '',
        validation: required ? { required: true } : undefined,
        helperText: helper ? 'Pick where investors live.' : undefined,
      });
      if (error) await setManualError(handle);

      const trigger = q.trigger();
      const wrapper = trigger.parentElement as HTMLElement;
      // INV-1: order inside the one wrapper div; nothing else outside the SF-15 portal.
      const expected = [
        ...(label ? [`LABEL#${FIELD_ID}-label`] : []),
        `BUTTON#${FIELD_ID}`,
        ...(helper ? [`DIV#${FIELD_ID}-description`] : []),
        ...(error ? [`DIV#${FIELD_ID}-error`] : []),
      ];
      const children = Array.from(wrapper.children) as HTMLElement[];
      const visible = children.filter((c) => !c.hidden);
      const hidden = children.filter((c) => c.hidden);
      expect(visible.map((c) => `${c.tagName}#${c.id}`)).toEqual(expected);
      // A button cannot carry aria-required: required is a hidden description text instead.
      expect(hidden.map((c) => `${c.tagName}:${c.textContent}`)).toEqual(
        required ? ['SPAN:Required'] : []
      );
      expect(trigger.getAttribute('data-slot')).toBe('searchable-multi-select-trigger');
      expect(trigger.hasAttribute('role')).toBe(false);
      expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
      expect(trigger.hasAttribute('aria-required')).toBe(false);

      // INV-1: the asterisk iff required (and only with a label).
      const lbl = q.label();
      if (label) {
        expect(lbl?.getAttribute('for')).toBe(FIELD_ID);
        expect(lbl?.querySelectorAll('span.text-destructive').length).toBe(required ? 1 : 0);
        if (required) expect(lbl?.querySelector('span.text-destructive')?.textContent).toBe('*');
      } else {
        expect(lbl).toBeNull();
        expect(document.querySelector(`label[for="${FIELD_ID}"]`)).toBeNull();
      }
      if (helper) expect(q.description()?.textContent).toBe('Pick where investors live.');
      if (error) {
        expect(q.error()?.getAttribute('role')).toBe('alert');
        expect(q.error()?.textContent).toBe('Boom');
      }

      // INV-3: getAccessibilityProps' value, then the hidden "Required" text when required, and
      // every token resolves with text.
      const base = getAccessibilityProps({ id: FIELD_ID, hasError: error, hasHelperText: helper })[
        'aria-describedby'
      ];
      expect(trigger.getAttribute('aria-describedby') ?? undefined).toBe(
        [base, required ? hidden[0]?.id : undefined].filter(Boolean).join(' ') || undefined
      );
      if (!helper && !error && !required) {
        expect(trigger.hasAttribute('aria-describedby')).toBe(false);
      }
      expect(danglingDescribedBy()).toEqual([]);
    }
  );

  it.each([
    ['full', 'w-full', '100%'],
    ['half', 'w-1/2', '50%'],
    ['third', 'w-1/3', '33.333%'],
  ] as const)('INV-1 width=%s → class %s, inline width %s', (width, cls, style) => {
    mount({ width });
    const wrapper = q.trigger().parentElement as HTMLElement;
    expect(wrapper.classList.contains('flex')).toBe(true);
    expect(wrapper.classList.contains('flex-col')).toBe(true);
    expect(wrapper.classList.contains('gap-2')).toBe(true);
    expect(wrapper.classList.contains(cls)).toBe(true);
    expect(wrapper.style.width).toBe(style);
  });

  it('INV-1 boundary: width omitted defaults to full', () => {
    mount();
    expect((q.trigger().parentElement as HTMLElement).style.width).toBe('100%');
  });

  it('INV-1: the popover content is portalled out of the field wrapper', async () => {
    const user = setup();
    mount();
    await user.click(q.trigger());
    const wrapper = q.trigger().parentElement as HTMLElement;
    expect(q.dialog()).not.toBeNull();
    expect(wrapper.contains(q.dialog())).toBe(false);
  });
});

// ── INV-2 ─────────────────────────────────────────────────────────────────────────────────
describe('INV-2: aria-invalid / the required description live on the trigger only', () => {
  it('required: "Required" description; invalid only after a failed submit, then cleared', async () => {
    const user = setup();
    const { handle } = mount({ validation: { required: true } });
    const trigger = q.trigger();
    expect(screen.getByRole('button', { description: 'Required' })).toBe(trigger);
    expect(trigger.getAttribute('aria-invalid')).not.toBe('true');

    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(handle.invalids).toBe(1);
    expect(trigger.getAttribute('aria-invalid')).toBe('true');

    await user.click(trigger);
    await user.click(q.option('Italy'));
    expect(trigger.getAttribute('aria-invalid')).not.toBe('true');
  });

  it('optional: no "Required" description and no aria-required', () => {
    mount();
    expect(q.trigger().getAttribute('aria-required')).not.toBe('true');
    expect(screen.queryByRole('button', { description: /Required/ })).toBeNull();
  });

  it('failure guard: in the error state no popover node carries field aria', async () => {
    const user = setup();
    mount({ validation: { required: true }, helperText: 'Help' });
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await user.click(q.trigger());
    const content = q.dialog() as HTMLElement;
    expect(content).not.toBeNull();
    expect(
      content.querySelectorAll('[aria-invalid],[aria-required],[aria-describedby]').length
    ).toBe(0);
    expect(content.hasAttribute('aria-describedby')).toBe(false);
  });
});

// ── INV-6 runtime half: hyphenated JSX attributes escape excess-prop checks ───────────────
describe('INV-6: stray aria-* passed to the field never reach the trigger', () => {
  function Stray(): React.ReactElement {
    const form = useForm<FieldValues>({ defaultValues: { [FIELD_NAME]: [] } });
    return (
      <SearchableMultiSelectField<Country, FieldValues>
        id={FIELD_ID}
        name={FIELD_NAME}
        label="Allowed countries"
        control={form.control}
        items={COUNTRIES}
        getItemId={countryId}
        getItemLabel={countryLabel}
        aria-label="Hijack"
        aria-labelledby="nowhere"
        aria-describedby="nowhere"
        aria-invalid
        aria-required
      />
    );
  }

  it('the field computes all five itself; caller values are dropped', () => {
    render(<Stray />);
    const trigger = q.trigger();
    expect(trigger.hasAttribute('aria-label')).toBe(false);
    // The label, then the trigger's own value text (never the caller's "nowhere").
    const [labelRef, valueRef, ...rest] = (trigger.getAttribute('aria-labelledby') ?? '').split(
      ' '
    );
    expect(labelRef).toBe(`${FIELD_ID}-label`);
    expect(document.getElementById(valueRef as string)?.textContent).toBe('Select items');
    expect(rest).toEqual([]);
    expect(trigger.hasAttribute('aria-describedby')).toBe(false);
    expect(trigger.getAttribute('aria-invalid')).not.toBe('true');
    expect(trigger.getAttribute('aria-required')).not.toBe('true');
  });
});

// ── INV-3 failure cases (custom rule results) ────────────────────────────────────────────
describe('INV-3: no dangling describedby when validateSelection returns false / ""', () => {
  it.each([false, ''] as const)(
    'validateSelection → %j: error element exists with text',
    async (r) => {
      const { handle } = mount(
        { validateSelection: () => r, helperText: 'Help' },
        { countries: ['FR'] }
      );
      await act(async () => {
        await api(handle).trigger(FIELD_NAME);
      });
      expect(q.trigger().getAttribute('aria-describedby')).toBe(
        `${FIELD_ID}-error ${FIELD_ID}-description`
      );
      expect(danglingDescribedBy()).toEqual([]);
      expect(q.error()?.textContent).toBe('Invalid selection');
    }
  );
});

// ── INV-4 ─────────────────────────────────────────────────────────────────────────────────
describe('INV-4: the trigger shows the form value, stale ids and duplicates counted', () => {
  it.each([
    [[], 'Pick countries', {}],
    [['FR'], '1 selected', { France: 'true' }],
    [['FR', 'ZZ'], '2 selected', { France: 'true' }],
    [['FR', 'FR'], '2 selected', { France: 'true' }],
    [undefined, 'Pick countries', {}],
  ] as const)('value %j → "%s"', async (value, text, selected) => {
    const user = setup();
    mount({ placeholder: 'Pick countries' }, { countries: value });
    expect(q.triggerText()).toBe(text);
    await user.click(q.trigger());
    const flags = q.selected();
    for (const [label, flag] of Object.entries(flags)) {
      expect(flag).toBe((selected as Record<string, string>)[label] ?? 'false');
    }
  });

  it('boundary: placeholder omitted → SF-15 default "Select items"', () => {
    mount();
    expect(q.triggerText()).toBe('Select items');
  });

  it('formatSelectedCount gets (raw length, items.length)', () => {
    const fmt = vi.fn((n: number, total: number) => `${n}/${total}`);
    mount({ formatSelectedCount: fmt }, { countries: ['FR', 'ZZ', 'DE'] });
    expect(q.triggerText()).toBe('3/6');
    expect(fmt).toHaveBeenLastCalledWith(3, 6);
  });
});

// ── INV-25 ────────────────────────────────────────────────────────────────────────────────
describe('INV-25: trigger, listbox and dialog are named after the label', () => {
  it('required: all three named "Allowed countries *"; search named by searchLabel', async () => {
    const user = setup();
    mount({ validation: { required: true }, searchLabel: 'Search countries' });
    // The trigger reads the label, then its value text, like a select.
    const trigger = screen.getByRole('button', { name: 'Allowed countries * Select items' });
    expect(trigger).toBe(q.trigger());
    expect(trigger.getAttribute('aria-labelledby')?.split(' ')[0]).toBe(`${FIELD_ID}-label`);
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Allowed countries *' });
    within(dialog).getByRole('listbox', { name: 'Allowed countries *' });
    within(dialog).getByRole('combobox', { name: 'Search countries' });
  });

  it('optional: name has no asterisk', () => {
    mount();
    expect(screen.getByRole('button', { name: 'Allowed countries Select items' })).toBe(
      q.trigger()
    );
  });

  it('the name follows the selection count', () => {
    mount({}, { countries: ['FR', 'ES'] });
    expect(screen.getByRole('button', { name: 'Allowed countries 2 selected' })).toBe(q.trigger());
  });

  it('boundary: empty label → no <label>, no aria-labelledby; SF-15 warns once across rerenders', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const handle = newHandle();
    const { rerender } = render(<FieldHarness handle={handle} options={{ label: '' }} />);
    rerender(<FieldHarness handle={handle} options={{ label: '' }} />);
    rerender(<FieldHarness handle={handle} options={{ label: '' }} />);
    expect(q.trigger().hasAttribute('aria-labelledby')).toBe(false);
    expect(document.querySelector('label')).toBeNull();
    const nameWarnings = warn.mock.calls.filter((c) => c.join(' ').includes('No accessible name'));
    expect(nameWarnings.length).toBe(1);
  });

  it('labelled field: no "No accessible name" warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mount();
    expect(warn.mock.calls.some((c) => c.join(' ').includes('No accessible name'))).toBe(false);
  });
});

// ── INV-26 (jsdom layer) ──────────────────────────────────────────────────────────────────
describe('INV-26: the error is an alert and part of the trigger description', () => {
  it('after a failed submit: alert holds the text; trigger description contains it', async () => {
    const user = setup();
    mount({ validation: { required: true }, helperText: 'Pick where investors live.' });
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.getByRole('alert').textContent).toBe('This field is required');
    expect(
      screen.getByRole('button', {
        name: 'Allowed countries * Select items',
        description: 'This field is required Pick where investors live. Required',
      })
    ).toBe(q.trigger());
  });

  it('happy: valid field has no alert', () => {
    mount({ validation: { required: true } }, { countries: ['FR'] });
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
