/**
 * @vitest-environment jsdom
 *
 * RadioField card / segmented / read-only: the form-state and ARIA contract (jsdom half).
 * Every block names its invariant. Parametrised over the three variants wherever the invariant
 * says "every variant". The Chromium half (geometry, computed look, real focus, axe) is
 * `radio-field.sf6.browser.test.tsx`; the 271efee34 baseline is `radio-field.baseline.sf6.test.tsx`.
 *
 * Options in every case (`OPTIONS`): Starter (described), Team, Scale (described), Enterprise
 * (described, disabled).
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import React from 'react';
import { useForm } from 'react-hook-form';

import type { ReadOnlyMode } from '../BaseField';
import { RadioField } from '../RadioField';
import {
  installResizeObserverStub,
  isChecked,
  mountRadio,
  normaliseIds,
  OPTIONS,
  press,
  READ_ONLY,
  setFocusAndWait,
  submit,
  VARIANTS,
  type Mounted,
  type MountOptions,
  type Variant,
} from './radio-field.sf6-kit';

installResizeObserverStub();
afterEach(cleanup);

const fieldHtml = (m: Mounted): string =>
  normaliseIds((m.form().firstElementChild as HTMLElement).outerHTML);

const REQUIRED_TEXT = 'This field is required';

/** Focus an option as a keyboard user would land on it, without picking it. */
async function focusOption(m: Mounted, label: string): Promise<void> {
  await act(async () => {
    m.radio(label).focus();
  });
}

// ---------------------------------------------------------------------------------------------
describe('INV-4 (jsdom half): horizontal cards differ from vertical only in the root class', () => {
  it('same DOM apart from the group class; the group becomes a grid', () => {
    const v = mountRadio({ variant: 'card', seed: 'team' });
    const vertical = fieldHtml(v);
    const vClass = v.group().className;
    v.unmount();
    const h = mountRadio({ variant: 'card', layout: 'horizontal', seed: 'team' });
    const horizontal = fieldHtml(h);
    const hClass = h.group().className;

    expect(horizontal.split(hClass).join('ROOT')).toBe(vertical.split(vClass).join('ROOT'));
    const hTokens = hClass.split(/\s+/);
    expect(hTokens).toContain('grid');
    expect(hTokens).not.toContain('flex');
    expect(hTokens.some((t) => t.startsWith('grid-cols-'))).toBe(true);
    expect(vClass.split(/\s+/)).toContain('flex-col');
  });

  it('keeps DOM order, the radiogroup role and the arrow-key order of the vertical list', async () => {
    const user = userEvent.setup();
    const orders: string[][] = [];
    for (const layout of ['vertical', 'horizontal'] as const) {
      const m = mountRadio({ variant: 'card', layout, seed: 'starter' });
      expect(screen.getByRole('radiogroup', { name: /Plan/ })).toBe(m.group());
      await focusOption(m, 'Starter');
      const order = [document.activeElement?.getAttribute('value') ?? ''];
      for (let i = 0; i < 3; i++) {
        await press(user, 'ArrowDown');
        order.push(document.activeElement?.getAttribute('value') ?? '');
      }
      orders.push(order);
      m.unmount();
    }
    // Enterprise is disabled, so the fourth step loops back to Starter.
    expect(orders[0]).toEqual(['starter', 'team', 'scale', 'starter']);
    expect(orders[1]).toEqual(orders[0]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('INV-5: the segmented field renders the RadioGroup segmented control', () => {
  it('one radiogroup, data-variant="segmented", id plan-group, one radio per option, by label', () => {
    const m = mountRadio({ variant: 'segmented', seed: 'scale' });
    const groups = screen.getAllByRole('radiogroup');
    expect(groups).toHaveLength(1);
    expect(groups[0].getAttribute('data-variant')).toBe('segmented');
    expect(groups[0].id).toBe('plan-group');
    expect(screen.getAllByRole('radio').map((r) => r.getAttribute('value'))).toEqual(
      OPTIONS.map((o) => o.value)
    );
    for (const o of OPTIONS) expect(screen.getByRole('radio', { name: o.label })).toBeTruthy();
    expect(m.checkedLabels()).toEqual(['Scale']);
    expect(screen.getAllByRole('radio').filter(isChecked)).toHaveLength(1);
  });

  it('renders no option description', () => {
    mountRadio({ variant: 'segmented' });
    for (const o of OPTIONS.filter((x) => x.description)) {
      expect(screen.queryByText(o.description as string)).toBeNull();
    }
  });

  it('layout="horizontal" and layout="vertical" give identical DOM', () => {
    const a = mountRadio({ variant: 'segmented', layout: 'vertical', seed: 'team' });
    const vertical = fieldHtml(a);
    a.unmount();
    const b = mountRadio({ variant: 'segmented', layout: 'horizontal', seed: 'team' });
    expect(fieldHtml(b)).toBe(vertical);
  });

  it('helper and error render under the group with the shared ids and text', async () => {
    const m = mountRadio({
      variant: 'segmented',
      helperText: 'How transactions are sent',
      validation: { required: true },
    });
    await submit(m);
    const helper = document.getElementById('plan-description');
    const error = document.getElementById('plan-error');
    expect(helper?.textContent).toBe('How transactions are sent');
    expect(error?.textContent).toBe(REQUIRED_TEXT);
    // Both follow the group in document order.
    const follows = (n: Node | null): boolean =>
      !!n && !!(m.group().compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(helper)).toBe(true);
    expect(follows(error)).toBe(true);
  });

  it('an empty options array renders an empty group and does not throw', () => {
    const m = mountRadio({ variant: 'segmented', options: [] });
    expect(m.group()).toBeTruthy();
    expect(m.radios()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------------------------
describe('INV-6: the read-only opt-in is strict and fails closed', () => {
  const NOT_OPTED_IN: ReadonlyArray<[string, MountOptions]> = [
    ['readOnly true, mode absent', { readOnly: true }],
    ['readOnly true, mode "disabled"', { readOnly: true, readOnlyMode: 'disabled' }],
    [
      'readOnly true, mode "focusable" (unknown string from JS)',
      { readOnly: true, readOnlyMode: 'focusable' as unknown as ReadOnlyMode },
    ],
    ['readOnly false, mode "readonly"', { readOnly: false, readOnlyMode: 'readonly' }],
    ['readOnly absent, mode "readonly"', { readOnlyMode: 'readonly' }],
  ];

  describe.each(VARIANTS)('%s', (variant) => {
    it.each(NOT_OPTED_IN)(
      '%s: same DOM as readOnly absent, a click picks, the value is submitted',
      async (_n, ro) => {
        const user = userEvent.setup();
        const plain = mountRadio({ variant, seed: 'team', helperText: 'Help' });
        const expected = fieldHtml(plain);
        plain.unmount();

        const m = mountRadio({ variant, seed: 'team', helperText: 'Help', ...ro });
        expect(fieldHtml(m)).toBe(expected);
        expect(m.group().hasAttribute('aria-readonly')).toBe(false);

        await user.click(m.radio('Scale'));
        expect(m.api().getValues('plan')).toBe('scale');
        expect(m.writes).toEqual(['scale']);
        await submit(m);
        expect(m.submitted).toEqual([{ plan: 'scale' }]);
      }
    );
  });
});

// ---------------------------------------------------------------------------------------------
describe('INV-7: read-only keeps the value in the payload', () => {
  describe.each(VARIANTS)('%s', (variant) => {
    it('a seeded value is submitted and readable', async () => {
      const m = mountRadio({ variant, seed: 'team', ...READ_ONLY });
      expect(m.api().getValues('plan')).toBe('team');
      await submit(m);
      expect(m.submitted).toEqual([{ plan: 'team' }]);
      expect(Object.keys(m.submitted[0])).toContain('plan');
      expect(m.api().formState.disabled).toBe(false);
    });

    it.each([
      ['empty string', ''],
      ['no default', undefined],
    ] as const)('an empty value (%s) is submitted as when editable', async (_n, seed) => {
      const editable = mountRadio({ variant, seed });
      await submit(editable);
      const expected = editable.submitted;
      editable.unmount();

      const m = mountRadio({ variant, seed, ...READ_ONLY });
      await submit(m);
      expect(m.submitted).toEqual(expected);
      expect(m.submitted).toHaveLength(1);
      expect(Object.keys(m.submitted[0])).toEqual(Object.keys(expected[0]));
    });

    it('values set by setValue and reset while read-only are submitted', async () => {
      const m = mountRadio({ variant, seed: 'team', ...READ_ONLY });
      act(() => m.api().setValue('plan', 'starter'));
      await submit(m);
      act(() => m.api().reset({ plan: 'scale' }));
      await submit(m);
      expect(m.submitted).toEqual([{ plan: 'starter' }, { plan: 'scale' }]);
    });
  });
});

// ---------------------------------------------------------------------------------------------
describe('INV-8: RHF owns the value; the kit writes only picked option values', () => {
  let errorSpy: MockInstance;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error');
  });
  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe.each(VARIANTS)('%s', (variant) => {
    it('no write on mount; the form is not dirty', () => {
      const m = mountRadio({ variant, seed: 'team' });
      expect(m.writes).toEqual([]);
      expect(m.api().formState.isDirty).toBe(false);
      expect(m.api().formState.dirtyFields).toEqual({});
      expect(m.checkedLabels()).toEqual(['Team']);
    });

    it('no write on variant, layout or read-only switches', () => {
      const m = mountRadio({ variant, seed: 'team' });
      const switches: MountOptions[] = [
        { variant, layout: 'horizontal', seed: 'team' },
        { variant, ...READ_ONLY, seed: 'team' },
        { variant: 'card', seed: 'team' },
        { variant: 'segmented', seed: 'team', ...READ_ONLY },
        { variant: 'default', seed: 'team' },
        { variant, seed: 'team' },
      ];
      for (const s of switches) m.rerender(s);
      expect(m.writes).toEqual([]);
      expect(m.api().getValues('plan')).toBe('team');
      expect(m.checkedLabels()).toEqual(['Team']);
    });

    it('each pick writes exactly the picked option value, as a string', async () => {
      const user = userEvent.setup();
      const m = mountRadio({ variant });
      await user.click(m.radio('Scale'));
      await user.click(m.radio('Starter'));
      expect(m.writes).toEqual(['scale', 'starter']);
      expect(m.writes).not.toContain('');
      expect(m.checkedLabels()).toEqual(['Starter']);
    });

    it.each([
      ['empty string', ''],
      ['no default', undefined],
      ['a value no option has', 'retired'],
    ] as const)(
      'a form value matching no option (%s): nothing checked, never rewritten',
      async (_n, seed) => {
        const user = userEvent.setup();
        const m = mountRadio({ variant, seed, after: <input aria-label="after" /> });
        expect(m.checkedLabels()).toEqual([]);
        // Focus into the group and out again (blur).
        await focusOption(m, 'Starter');
        await user.click(screen.getByLabelText('after'));
        expect(m.api().getValues('plan')).toBe(seed);
        expect(m.writes).toEqual([]);
        expect(m.checkedLabels()).toEqual([]);
      }
    );

    it('no default: pick, then reset to undefined: nothing shows checked', async () => {
      // The root must stay controlled when the form value is undefined; otherwise Radix keeps
      // its own copy of the last pick on screen while the form holds nothing.
      const user = userEvent.setup();
      const m = mountRadio({ variant, seed: undefined });
      await user.click(m.radio('Scale'));
      expect(m.checkedLabels()).toEqual(['Scale']);
      act(() => m.api().reset());
      expect(m.api().getValues('plan')).toBeUndefined();
      expect(m.checkedLabels()).toEqual([]);
      await submit(m);
      expect(m.submitted).toHaveLength(1);
      expect(m.submitted[0].plan).toBeUndefined();
    });

    it('the shown selection follows the form value, never its own state', () => {
      const m = mountRadio({ variant, seed: 'team' });
      act(() => m.api().setValue('plan', 'retired'));
      expect(m.checkedLabels()).toEqual([]);
      act(() => m.api().setValue('plan', 'scale'));
      expect(m.checkedLabels()).toEqual(['Scale']);
      act(() => m.api().reset({ plan: '' }));
      expect(m.checkedLabels()).toEqual([]);
      expect(m.writes).toEqual([]);
      // Never flips between controlled and uncontrolled.
      const controlWarnings = errorSpy.mock.calls.filter((c) =>
        String(c[0]).match(/uncontrolled|controlled/i)
      );
      expect(controlWarnings).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------------------------
describe('INV-10: picking an option submits that option value, the same in every variant', () => {
  it('click Scale then submit: { plan: "scale" } in all three variants', async () => {
    const payloads: unknown[] = [];
    for (const variant of VARIANTS) {
      const user = userEvent.setup();
      const m = mountRadio({ variant });
      await user.click(m.radio('Scale'));
      await submit(m);
      payloads.push(m.submitted[0]);
      m.unmount();
    }
    expect(payloads).toEqual([{ plan: 'scale' }, { plan: 'scale' }, { plan: 'scale' }]);
  });

  it.each(['card', 'segmented'] as const)(
    '%s: an arrow key from Team picks Scale, and the submit carries it',
    async (variant) => {
      const user = userEvent.setup();
      const m = mountRadio({ variant });
      await user.click(m.radio('Team'));
      await press(user, variant === 'segmented' ? 'ArrowRight' : 'ArrowDown');
      expect(m.api().getValues('plan')).toBe('scale');
      await submit(m);
      expect(m.submitted).toEqual([{ plan: 'scale' }]);
      expect(m.writes).toEqual(['team', 'scale']);
    }
  );

  it.each(VARIANTS)('%s: re-picking the checked option writes nothing and keeps it', async (v) => {
    const user = userEvent.setup();
    const m = mountRadio({ variant: v });
    await user.click(m.radio('Scale'));
    await user.click(m.radio('Scale'));
    expect(m.writes).toEqual(['scale']);
    expect(m.checkedLabels()).toEqual(['Scale']);
  });
});

// ---------------------------------------------------------------------------------------------
describe('INV-11: required works the same in every variant, with or without noValidate', () => {
  describe.each(VARIANTS)('%s', (variant) => {
    it.each([
      ['noValidate', true],
      ['plain form', false],
    ] as const)('%s: empty submit shows the kit message and focuses Starter', async (_n, nv) => {
      const user = userEvent.setup();
      const m = mountRadio({ variant, validation: { required: true }, noValidate: nv });
      // Nothing in the group can make the browser block the submit before RHF.
      expect(m.group().querySelectorAll('[required]')).toHaveLength(0);
      if (variant !== 'default') expect(m.group().hasAttribute('required')).toBe(false);
      expect(m.form().checkValidity()).toBe(true);

      await submit(m);
      expect(m.submitted).toEqual([]);
      expect(m.invalidCount()).toBe(1);
      expect(document.getElementById('plan-error')?.textContent).toBe(REQUIRED_TEXT);
      expect(m.group().getAttribute('aria-invalid')).toBe('true');
      expect(m.group().getAttribute('aria-required')).toBe('true');
      expect(document.activeElement).toBe(m.radio('Starter'));

      // A pick clears the error (reValidateMode onChange), and the submit goes through.
      await user.click(m.radio('Team'));
      expect(document.getElementById('plan-error')).toBeNull();
      expect(m.group().getAttribute('aria-invalid')).toBe('false');
      await submit(m);
      expect(m.submitted).toEqual([{ plan: 'team' }]);
    });
  });

  it('a custom required message is the one shown, in every variant', async () => {
    for (const variant of VARIANTS) {
      const m = mountRadio({
        variant,
        validation: { required: true, messages: { required: 'Choose a plan' } },
      });
      await submit(m);
      expect(document.getElementById('plan-error')?.textContent).toBe('Choose a plan');
      m.unmount();
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe('INV-12: no user act changes the value while read-only', () => {
  const ALL_KEYS = [' ', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
  // jsdom's user-event can't press Home / End on a native radio ("not implemented"); the
  // Chromium suite presses them on the default variant.
  const keysFor = (v: Variant): string[] =>
    v === 'default' ? ALL_KEYS.filter((k) => k !== 'Home' && k !== 'End') : ALL_KEYS;

  describe.each(VARIANTS)('%s', (variant) => {
    it('clicks on every enabled option (and its label text) change nothing', async () => {
      const user = userEvent.setup();
      const m = mountRadio({ variant, seed: 'starter', ...READ_ONLY });
      for (const label of ['Team', 'Scale', 'Starter', 'Team']) {
        await user.click(m.radio(label));
      }
      if (variant !== 'segmented') {
        // The visible label and description text (card title, default <label> text).
        await user.click(screen.getByText('Higher limits'));
        await user.click(screen.getByText('Team'));
      }
      if (variant === 'default') {
        await user.click(m.radio('Scale').closest('label') as HTMLElement);
      }
      expect(m.writes).toEqual([]);
      expect(m.api().getValues('plan')).toBe('starter');
      expect(m.checkedLabels()).toEqual(['Starter']);
      expect(m.api().formState.isDirty).toBe(false);
      if (variant === 'default') {
        // React restored every native `checked` after the dropped change.
        expect(m.radios().map((r) => (r as HTMLInputElement).checked)).toEqual([
          true,
          false,
          false,
          false,
        ]);
      }
    });

    it.each(keysFor(variant))('key %s on a focused option changes nothing', async (key) => {
      const user = userEvent.setup();
      const m = mountRadio({ variant, seed: 'starter', ...READ_ONLY });
      await focusOption(m, 'Team');
      await press(user, key);
      await press(user, key);
      expect(m.writes).toEqual([]);
      expect(m.api().getValues('plan')).toBe('starter');
      expect(m.checkedLabels()).toEqual(['Starter']);
      expect(m.api().formState.isDirty).toBe(false);
    });

    it('the full key sequence from the checked option changes nothing', async () => {
      const user = userEvent.setup();
      const m = mountRadio({ variant, seed: 'starter', ...READ_ONLY });
      await focusOption(m, 'Starter');
      for (const key of keysFor(variant)) await press(user, key);
      expect(m.writes).toEqual([]);
      expect(m.api().getValues('plan')).toBe('starter');
      expect(m.checkedLabels()).toEqual(['Starter']);
    });
  });
});

// ---------------------------------------------------------------------------------------------
describe('INV-13: programmatic writes still land while read-only', () => {
  describe.each(VARIANTS)('%s', (variant) => {
    it('setValue and reset update the selection and the payload; turning read-only off restores picking', async () => {
      const user = userEvent.setup();
      const m = mountRadio({ variant, seed: 'starter', ...READ_ONLY });
      act(() => m.api().setValue('plan', 'scale'));
      expect(m.checkedLabels()).toEqual(['Scale']);
      await submit(m);
      act(() => m.api().reset({ plan: 'team' }));
      expect(m.checkedLabels()).toEqual(['Team']);
      await submit(m);
      expect(m.submitted).toEqual([{ plan: 'scale' }, { plan: 'team' }]);

      m.rerender({ variant, seed: 'starter', readOnly: false, readOnlyMode: 'readonly' });
      await user.click(m.radio('Scale'));
      expect(m.writes).toEqual(['scale']);
      expect(m.api().getValues('plan')).toBe('scale');
      expect(m.checkedLabels()).toEqual(['Scale']);
    });
  });
});

// ---------------------------------------------------------------------------------------------
describe('INV-14: the focus target is the same rule in every variant', () => {
  const firstDisabled = [{ ...OPTIONS[0], disabled: true }, ...OPTIONS.slice(1)];
  const allDisabled = OPTIONS.map((o) => ({ ...o, disabled: true }));

  describe.each(VARIANTS)('%s', (variant) => {
    describe.each([
      ['editable', {}],
      ['read-only', READ_ONLY],
    ] as const)('%s', (_mode, ro) => {
      it.each([
        ['nothing checked: first enabled option', { seed: '' }, 'Starter'],
        ['Scale checked: Scale', { seed: 'scale' }, 'Scale'],
        [
          'first option disabled, nothing checked: Team',
          { seed: '', options: firstDisabled },
          'Team',
        ],
        ['checked option disabled: first enabled', { seed: 'enterprise' }, 'Starter'],
      ] as const)('%s', async (_n, opts, expected) => {
        const m = mountRadio({ variant, ...ro, ...opts });
        await setFocusAndWait(m);
        expect(document.activeElement).toBe(m.radio(expected));
      });

      it.each([
        ['all options disabled', allDisabled],
        ['no options', []],
      ] as const)('%s: setFocus does nothing and logs nothing', async (_n, options) => {
        const errorSpy = vi.spyOn(console, 'error');
        const m = mountRadio({
          variant,
          ...ro,
          options: [...options],
          before: <input aria-label="before" />,
        });
        const before = screen.getByLabelText('before');
        act(() => before.focus());
        await setFocusAndWait(m);
        expect(document.activeElement).toBe(before);
        expect(errorSpy).not.toHaveBeenCalled();
        errorSpy.mockRestore();
      });
    });
  });
});

// ---------------------------------------------------------------------------------------------
describe('INV-15: per-option disabled behaves as today in every variant', () => {
  describe.each(VARIANTS)('%s', (variant) => {
    describe.each([
      ['editable', {}],
      ['read-only', READ_ONLY],
    ] as const)('%s', (mode, ro) => {
      it('the disabled option cannot be picked and keeps its disabled marking', async () => {
        const user = userEvent.setup();
        const m = mountRadio({ variant, seed: 'team', ...ro });
        const enterprise = m.radio('Enterprise');
        expect(enterprise.hasAttribute('disabled')).toBe(true);
        await user.click(enterprise);
        if (variant === 'default') {
          await user.click(enterprise.closest('label') as HTMLElement);
          const labelClass = (enterprise.closest('label') as HTMLElement).className;
          expect(labelClass).toContain('cursor-not-allowed');
          expect(labelClass).toContain('opacity-50');
          expect(labelClass).not.toContain('cursor-default');
        } else {
          // The read-only look never lands on a disabled item.
          expect(enterprise.className).not.toContain('cursor-default');
          expect(enterprise.className).toContain('disabled:opacity-50');
        }
        expect(m.writes).toEqual([]);
        expect(m.api().getValues('plan')).toBe('team');
        void mode;
      });

      if (variant !== 'default') {
        it('arrow keys skip the disabled option', async () => {
          const user = userEvent.setup();
          const m = mountRadio({ variant, seed: 'scale', ...ro });
          await focusOption(m, 'Scale');
          await press(user, variant === 'segmented' ? 'ArrowRight' : 'ArrowDown');
          expect(document.activeElement).toBe(m.radio('Starter'));
          expect(m.checkedLabels()).toEqual([mode === 'editable' ? 'Starter' : 'Scale']);
          expect(m.writes).not.toContain('enterprise');
        });
      }
    });
  });
});

// ---------------------------------------------------------------------------------------------
describe('INV-16: blur and validation run the same while read-only', () => {
  const after = <input aria-label="after" />;

  describe.each(VARIANTS)('%s', (variant) => {
    describe.each([
      ['editable', {}],
      ['read-only', READ_ONLY],
    ] as const)('%s', (_mode, ro) => {
      // The default variant has no blur handler (as at 271efee34), so it never marks the field
      // touched. Pinned as a known gap against the invariant; see the Tests artifact.
      const blurIt = variant === 'default' ? it.fails : it;

      blurIt('focus leaving the group marks the field touched', async () => {
        const user = userEvent.setup();
        const m = mountRadio({ variant, seed: 'team', ...ro, after });
        await focusOption(m, 'Team');
        await user.click(screen.getByLabelText('after'));
        expect(m.api().getFieldState('plan').isTouched).toBe(true);
        expect(m.api().formState.touchedFields.plan).toBe(true);
      });

      blurIt('in an onTouched form, leaving the group empty shows the required error', async () => {
        const user = userEvent.setup();
        const m = mountRadio({
          variant,
          ...ro,
          mode: 'onTouched',
          validation: { required: true },
          after,
        });
        await focusOption(m, 'Starter');
        await user.click(screen.getByLabelText('after'));
        expect(document.getElementById('plan-error')?.textContent).toBe(REQUIRED_TEXT);
      });

      it('validateRadio and validation.custom run on submit', async () => {
        const m = mountRadio({
          variant,
          seed: 'team',
          ...ro,
          validateRadio: (v) => (v === 'team' ? 'Team is full' : true),
        });
        await submit(m);
        expect(m.submitted).toEqual([]);
        expect(document.getElementById('plan-error')?.textContent).toBe('Team is full');
      });

      it('an empty required field shows the required error on submit', async () => {
        const m = mountRadio({ variant, ...ro, validation: { required: true } });
        await submit(m);
        expect(m.submitted).toEqual([]);
        expect(document.getElementById('plan-error')?.textContent).toBe(REQUIRED_TEXT);
      });
    });

    it('an error present when read-only turns on stays until validation clears it', async () => {
      const m = mountRadio({ variant, validation: { required: true } });
      await submit(m);
      m.rerender({ variant, validation: { required: true }, ...READ_ONLY });
      expect(document.getElementById('plan-error')?.textContent).toBe(REQUIRED_TEXT);
      await act(async () => {
        m.api().setValue('plan', 'team', { shouldValidate: true });
      });
      expect(document.getElementById('plan-error')).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------------------------
describe('INV-17: switching props at runtime is safe and quiet', () => {
  it('variant / layout / read-only cycles keep the value and log nothing; unmount is clean', () => {
    const errorSpy = vi.spyOn(console, 'error');
    const warnSpy = vi.spyOn(console, 'warn');
    const m = mountRadio({ variant: 'default', seed: 'team' });
    const cycle: Variant[] = ['default', 'card', 'segmented', 'default', 'segmented', 'card'];
    for (const variant of cycle) {
      for (const layout of ['vertical', 'horizontal'] as const) {
        for (const ro of [{}, READ_ONLY, { readOnly: true }, {}] as MountOptions[]) {
          m.rerender({ variant, layout, seed: 'team', ...ro });
          expect(m.api().getValues('plan')).toBe('team');
          expect(m.checkedLabels()).toEqual(['Team']);
        }
      }
    }
    expect(m.writes).toEqual([]);
    m.unmount();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('under StrictMode every variant mounts, switches and unmounts without a console call', () => {
    const errorSpy = vi.spyOn(console, 'error');
    const warnSpy = vi.spyOn(console, 'warn');
    for (const variant of VARIANTS) {
      const { unmount } = render(
        <React.StrictMode>
          <StrictField variant={variant} />
        </React.StrictMode>
      );
      unmount();
    }
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });
});

/** Read-only field under StrictMode (effects run twice, exposing a missing cleanup). */
function StrictField({ variant }: { variant: Variant }): React.ReactElement {
  const form = useForm<{ plan: string }>({ defaultValues: { plan: 'team' } });
  return (
    <form>
      <RadioField
        id="strict"
        name="plan"
        label="Plan"
        control={form.control}
        options={OPTIONS}
        variant={variant}
        {...READ_ONLY}
      />
    </form>
  );
}

// ---------------------------------------------------------------------------------------------
describe('INV-18: ARIA wiring is the same in every variant', () => {
  const ids = (s: string | null): string[] => (s ? s.split(' ') : []);

  describe.each(VARIANTS)('%s', (variant) => {
    describe.each([
      ['error', true],
      ['no error', false],
    ] as const)('%s', (_e, withError) => {
      describe.each([
        ['helper', 'Pick one plan'],
        ['no helper', undefined],
      ] as const)('%s', (_h, helperText) => {
        it.each([
          ['editable', {}],
          ['read-only', READ_ONLY],
        ] as const)('%s', async (mode, ro) => {
          const m = mountRadio({ variant, helperText, validation: { required: true }, ...ro });
          if (withError) await submit(m);
          const g = screen.getByRole('radiogroup', { name: 'Plan *' });
          expect(g).toBe(m.group());
          expect(g.id).toBe('plan-group');
          expect(g.getAttribute('aria-labelledby')).toBe('plan-label');
          expect(g.getAttribute('aria-required')).toBe('true');
          expect(g.getAttribute('aria-invalid')).toBe(String(withError));
          expect(g.getAttribute('aria-errormessage')).toBe(withError ? 'plan-error' : null);

          const expected = [
            ...(withError ? ['plan-error'] : []),
            ...(helperText ? ['plan-description'] : []),
            ...(mode === 'read-only' ? ['plan-readonly'] : []),
          ];
          const describedBy = g.getAttribute('aria-describedby');
          expect(ids(describedBy)).toEqual(expected);
          if (expected.length === 0) expect(describedBy).toBeNull();
          else expect(describedBy).not.toMatch(/^\s|\s$|\s\s/);

          for (const attr of ['aria-labelledby', 'aria-describedby', 'aria-errormessage']) {
            for (const id of ids(g.getAttribute(attr))) {
              expect(document.getElementById(id), `${attr} → #${id}`).not.toBeNull();
            }
          }
        });
      });
    });

    it('aria-required is false without the rule', () => {
      const m = mountRadio({ variant });
      expect(m.group().getAttribute('aria-required')).toBe('false');
    });
  });

  it('segmented radios are named by label; card radios keep title name and description', () => {
    mountRadio({ variant: 'segmented' });
    for (const o of OPTIONS) {
      expect(screen.getByRole('radio', { name: o.label })).toBeTruthy();
    }
    cleanup();
    mountRadio({ variant: 'card' });
    const starter = screen.getByRole('radio', { name: 'Starter' });
    expect(starter).toHaveProperty('ariaDescription', null);
    const describedBy = starter.getAttribute('aria-describedby') as string;
    expect(document.getElementById(describedBy)?.textContent).toBe('For trying things out');
  });
});

// ---------------------------------------------------------------------------------------------
describe('INV-19: read-only is announced as read-only, not disabled', () => {
  describe.each(VARIANTS)('%s', (variant) => {
    it('with the opt-in: aria-readonly, data-readonly, the sr-only note last in describedby', () => {
      const m = mountRadio({ variant, seed: 'team', helperText: 'Help', ...READ_ONLY });
      const g = m.group();
      expect(g.getAttribute('aria-readonly')).toBe('true');
      expect(g.getAttribute('data-readonly')).toBe('');
      const note = document.getElementById('plan-readonly');
      expect(note?.textContent).toBe('Read-only');
      expect(note?.className).toContain('sr-only');
      expect((g.getAttribute('aria-describedby') ?? '').split(' ').at(-1)).toBe('plan-readonly');
    });

    it('with the opt-in: no enabled option is disabled, aria-disabled or removed from focus', () => {
      const editable = mountRadio({ variant, seed: 'team' });
      const tabIndexes = editable.radios().map((r) => r.tabIndex);
      editable.unmount();
      const m = mountRadio({ variant, seed: 'team', ...READ_ONLY });
      for (const r of m.radios().filter((x) => x.getAttribute('value') !== 'enterprise')) {
        expect(r.hasAttribute('disabled')).toBe(false);
        expect(r.hasAttribute('aria-disabled')).toBe(false);
      }
      // Same tab stops as editable (Radix roving focus keeps one stop on the checked item).
      expect(m.radios().map((r) => r.tabIndex)).toEqual(tabIndexes);
    });

    it('Tab from the element before the field reaches an option, with the same stops as editable', async () => {
      // Focus stops from "before" until an option has focus (at most 3 Tabs).
      const stops = async (ro: MountOptions): Promise<string[]> => {
        const user = userEvent.setup();
        const m = mountRadio({
          variant,
          seed: 'team',
          ...ro,
          before: <input aria-label="before" />,
        });
        act(() => screen.getByLabelText('before').focus());
        const seen: string[] = [];
        for (let i = 0; i < 3 && !m.radios().includes(document.activeElement as HTMLElement); i++) {
          await user.tab();
          const a = document.activeElement as HTMLElement;
          seen.push(
            a.getAttribute('role') === 'radiogroup'
              ? 'group'
              : (a.getAttribute('value') ?? a.tagName)
          );
        }
        const reached = m.radios().includes(document.activeElement as HTMLElement);
        m.unmount();
        return reached ? seen : [...seen, 'NOT REACHED'];
      };
      const editable = await stops({});
      const readOnly = await stops(READ_ONLY);
      expect(readOnly).toEqual(editable);
      // The default variant's group div is itself a tab stop and its unnamed native radios are
      // each a stop (as at 271efee34), so the next Tab reaches the first option. Card and
      // segmented reach the checked option in one Tab (Radix roving focus).
      expect(readOnly).toEqual(variant === 'default' ? ['group', 'starter'] : ['team']);
    });

    it('without the opt-in: no aria-readonly, no data-readonly, no note', () => {
      const m = mountRadio({ variant, seed: 'team', readOnly: true });
      expect(m.group().hasAttribute('aria-readonly')).toBe(false);
      expect(m.group().hasAttribute('data-readonly')).toBe(false);
      expect(document.getElementById('plan-readonly')).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------------------------
describe('INV-21 (jsdom half): the error is conveyed by text in every variant', () => {
  it.each(VARIANTS)('%s: the error text appears and goes', async (variant) => {
    const user = userEvent.setup();
    const m = mountRadio({ variant, validation: { required: true } });
    await submit(m);
    expect(screen.getByRole('alert').textContent).toBe(REQUIRED_TEXT);
    await user.click(m.radio('Team'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('segmented: one destructive ring on the group, none on the items, gone after a pick', async () => {
    const user = userEvent.setup();
    const m = mountRadio({ variant: 'segmented', validation: { required: true } });
    expect(m.group().className).not.toContain('ring-destructive');
    await submit(m);
    expect(m.group().className).toContain('ring-1');
    expect(m.group().className).toContain('ring-destructive/50');
    for (const r of m.radios()) expect(r.className).not.toContain('ring-destructive');
    await user.click(m.radio('Team'));
    expect(m.group().className).not.toContain('ring-destructive');
  });

  it('card: the error border is on every item while the error lasts', async () => {
    const user = userEvent.setup();
    const m = mountRadio({ variant: 'card', validation: { required: true } });
    await submit(m);
    for (const r of m.radios()) expect(r.className).toContain('border-destructive/50');
    await user.click(m.radio('Team'));
    for (const r of m.radios()) expect(r.className).not.toContain('border-destructive/50');
  });
});
