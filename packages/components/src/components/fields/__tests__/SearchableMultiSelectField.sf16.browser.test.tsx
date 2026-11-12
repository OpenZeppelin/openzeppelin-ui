/**
 * 005 SF-16 · Chromium verification (focus timing is not evidence in jsdom; Design OQ-1).
 * INV-14 onOpenChange runs before focus moves, for every open and close path;
 * INV-15 opening never touches or validates: 5 RHF modes × 6 open paths × 2 starting focus;
 * INV-16 touched = focus left the control (real Tab, forced-close gate reset);
 * INV-17 failed submit focuses the closed trigger; INV-23 real-browser cleanup;
 * INV-25 / INV-26 names, description and axe in every reachable state.
 * Opt-in via `pnpm test:browser`. Not part of default jsdom `pnpm test`.
 * artifacts/005-uikit-requests/sf-16-searchable-multi-select-field/03-invariants.md
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import React from 'react';
import type { FieldValues, Mode } from 'react-hook-form';

import { SearchableMultiSelect } from '../../ui/searchable-multi-select';
import { FieldHarness, type FieldOptions } from './smsf.sf16-harness';
import {
  api,
  COUNTRIES,
  countryId,
  countryLabel,
  FIELD_NAME,
  newHandle,
  pageSnapshot,
  q,
  type Country,
  type FieldHandle,
} from './smsf.sf16-kit';

afterEach(cleanup);

const settle = () => new Promise((r) => setTimeout(r, 60));
const touched = (h: FieldHandle): boolean => api(h).getFieldState(FIELD_NAME).isTouched;
const searchFocused = () => document.activeElement === q.search();

function mount(
  options: FieldOptions = {},
  extra: { defaultValues?: FieldValues; mode?: Mode; textFirst?: boolean } = {}
) {
  const handle = newHandle();
  const utils = render(<FieldHarness handle={handle} options={options} {...extra} />);
  return { handle, ...utils };
}

// ── INV-14 ordering ───────────────────────────────────────────────────────────────────────
function Bare({ log }: { readonly log: string[] }): React.ReactElement {
  const [ids, setIds] = React.useState<string[]>([]);
  const where = () => (document.activeElement?.id === 'bare' ? 'trigger' : 'other');
  return (
    <>
      <label htmlFor="bare">Bare label</label>
      <button type="button">Outside</button>
      <SearchableMultiSelect<Country>
        id="bare"
        aria-label="Bare"
        items={COUNTRIES}
        getItemId={countryId}
        getItemLabel={countryLabel}
        selectedIds={ids}
        onSelectionChange={setIds}
        onOpenChange={(o) => log.push(`${o}:${where()}`)}
        onBlur={() => log.push('blur')}
      />
    </>
  );
}
const bare = () => document.getElementById('bare') as HTMLButtonElement;

const OPEN_PATHS: Record<
  string,
  (trigger: () => HTMLElement, label: () => HTMLElement) => Promise<void>
> = {
  click: (t) => userEvent.click(t()),
  label: (_t, l) => userEvent.click(l()),
  Enter: async (t) => {
    t().focus();
    await userEvent.keyboard('{Enter}');
  },
  Space: async (t) => {
    t().focus();
    await userEvent.keyboard(' ');
  },
  ArrowDown: async (t) => {
    t().focus();
    await userEvent.keyboard('{ArrowDown}');
  },
  ArrowUp: async (t) => {
    t().focus();
    await userEvent.keyboard('{ArrowUp}');
  },
};

describe('INV-14: onOpenChange runs inside the event, before focus moves', () => {
  for (const [path, open] of Object.entries(OPEN_PATHS)) {
    it(`open by ${path}: true while the trigger still has focus, then the opening blur; Escape: false before focus returns`, async () => {
      const log: string[] = [];
      render(<Bare log={log} />);
      // A label click is a pointer act from wherever focus is; start it from the page.
      if (path !== 'label') bare().focus();
      await open(bare, () => screen.getByText('Bare label'));
      await expect.poll(searchFocused).toBe(true);
      await userEvent.keyboard('{Escape}');
      await expect.poll(() => document.activeElement === bare()).toBe(true);
      expect(log).toEqual(['true:trigger', 'blur', 'false:other']);
    });
  }

  // Documented bare-component behaviour (F1 context): under an integrator's own <label>, a
  // mousedown on the label blurs a focused SF-15 trigger before the label's click opens it.
  // SF-15's onBlur contract reports that blur; the field (below) is what keeps it from RHF.
  it('bare SF-15 under an integrator label, trigger focused: the label mousedown blur is reported first', async () => {
    const log: string[] = [];
    render(<Bare log={log} />);
    bare().focus();
    await userEvent.click(screen.getByText('Bare label'));
    await expect.poll(searchFocused).toBe(true);
    expect(log.slice(0, 3)).toEqual(['blur', 'true:trigger', 'blur']);
  });

  // F1 fix (a34b52668): the field's label keeps focus on a focused trigger at mousedown, so the
  // only focus loss is the open's own move into the search box, after onOpenChange(true).
  it('field label click, trigger focused: the trigger never loses focus to the page', async () => {
    mount({ validation: { required: true } }, { mode: 'onTouched' });
    const outs: Array<string | null> = [];
    q.trigger().addEventListener('focusout', (e) => {
      const to = (e as FocusEvent).relatedTarget as HTMLElement | null;
      outs.push(to?.getAttribute('data-slot') ?? to?.tagName ?? null);
    });
    q.trigger().focus();
    await userEvent.click(q.label() as HTMLElement);
    await expect.poll(searchFocused).toBe(true);
    expect(outs[0]).toBe('searchable-multi-select-search');
  });

  it('outside pointer close: false before focus returns', async () => {
    const log: string[] = [];
    render(<Bare log={log} />);
    await userEvent.click(bare());
    await expect.poll(searchFocused).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Outside', hidden: true }), {
      force: true,
    });
    await expect.poll(() => q.dialog()).toBe(null);
    expect(log.slice(0, 3)).toEqual(['true:trigger', 'blur', 'false:other']);
  });

  it('absent onOpenChange: onBlur still fires on the open transition (SF-15 INV-16 unchanged)', async () => {
    const onBlur = vi.fn();
    render(
      <SearchableMultiSelect<Country>
        id="plain"
        aria-label="Plain"
        items={COUNTRIES}
        getItemId={countryId}
        getItemLabel={countryLabel}
        selectedIds={[]}
        onSelectionChange={() => undefined}
        onBlur={onBlur}
      />
    );
    await userEvent.click(document.getElementById('plain') as HTMLElement);
    await expect.poll(searchFocused).toBe(true);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});

// ── INV-15 matrix ─────────────────────────────────────────────────────────────────────────
const MODES: Mode[] = ['onSubmit', 'onBlur', 'onChange', 'onTouched', 'all'];
const STARTS = ['fresh', 'trigger-focused'] as const;

async function openField(path: string, start: (typeof STARTS)[number]): Promise<void> {
  if (start === 'trigger-focused') {
    // Arrive by keyboard from the preceding input, as a real user would.
    screen.getByLabelText('First').focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(q.trigger());
  }
  const run = OPEN_PATHS[path];
  if (!run) throw new Error(path);
  if (start === 'fresh' && path !== 'click' && path !== 'label') {
    // Keyboard paths need focus; give it without a prior blur of the trigger.
    q.trigger().focus();
    await userEvent.keyboard(
      { Enter: '{Enter}', Space: ' ', ArrowDown: '{ArrowDown}', ArrowUp: '{ArrowUp}' }[path] ?? ''
    );
    return;
  }
  if (start === 'trigger-focused' && path !== 'click' && path !== 'label') {
    await userEvent.keyboard(
      { Enter: '{Enter}', Space: ' ', ArrowDown: '{ArrowDown}', ArrowUp: '{ArrowUp}' }[path] ?? ''
    );
    return;
  }
  await run(q.trigger, () => screen.getByText('Allowed countries'));
}

describe('INV-15: opening never marks touched and never validates (mode × path × start)', () => {
  for (const mode of MODES) {
    for (const path of Object.keys(OPEN_PATHS)) {
      for (const start of STARTS) {
        // F1 cells (label × trigger-focused) pass since the fix in a34b52668.
        it(`${mode} · ${path} · ${start}: required empty field stays untouched and error-free`, async () => {
          const { handle } = mount(
            { validation: { required: true } },
            { mode, textFirst: start === 'trigger-focused' }
          );
          await openField(path, start);
          await expect.poll(searchFocused).toBe(true);
          await settle();
          expect(touched(handle)).toBe(false);
          expect(q.error()).toBeNull();
          expect(q.trigger().getAttribute('aria-invalid')).not.toBe('true');
          expect(api(handle).formState.errors[FIELD_NAME]).toBeUndefined();
        });
      }
      for (const start of STARTS) {
        it(`${mode} · ${path} · ${start}: no validation runs for the field on open (validate spy)`, async () => {
          const spy = vi.fn(() => true);
          mount(
            { validateSelection: spy },
            { mode, defaultValues: { countries: ['FR'] }, textFirst: start === 'trigger-focused' }
          );
          await openField(path, start);
          await expect.poll(searchFocused).toBe(true);
          await settle();
          expect(spy).not.toHaveBeenCalled();
        });
      }
    }
  }
});

// ── INV-16 ────────────────────────────────────────────────────────────────────────────────
describe('INV-16: touched means focus left the control (real focus)', () => {
  it('onTouched: open, Escape (focus back, untouched), Tab away → touched + error', async () => {
    const { handle } = mount({ validation: { required: true } }, { mode: 'onTouched' });
    await userEvent.click(q.trigger());
    await expect.poll(searchFocused).toBe(true);
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => document.activeElement === q.trigger()).toBe(true);
    await settle();
    expect(touched(handle)).toBe(false);
    expect(q.error()).toBeNull();
    await userEvent.tab();
    await expect.poll(() => touched(handle)).toBe(true);
    await expect.poll(() => q.error()?.textContent).toBe('This field is required');
  });

  it('onBlur: Shift+Tab away also marks touched and validates once', async () => {
    const spy = vi.fn(() => 'Nope');
    const { handle } = mount(
      { validateSelection: spy },
      { mode: 'onBlur', defaultValues: { countries: ['FR'] }, textFirst: true }
    );
    await userEvent.click(q.trigger());
    await expect.poll(searchFocused).toBe(true);
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => document.activeElement === q.trigger()).toBe(true);
    expect(spy).not.toHaveBeenCalled();
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    await expect.poll(() => touched(handle)).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(q.error()?.textContent).toBe('Nope');
  });

  it('readOnly forced close then re-enable: the next real blur still marks touched', async () => {
    const handle = newHandle();
    const { rerender } = render(<FieldHarness handle={handle} mode="onTouched" />);
    await userEvent.click(q.trigger());
    await expect.poll(searchFocused).toBe(true);
    rerender(<FieldHarness handle={handle} mode="onTouched" options={{ readOnly: true }} />);
    await expect.poll(() => q.search()).toBe(null);
    rerender(<FieldHarness handle={handle} mode="onTouched" />);
    expect(touched(handle)).toBe(false);
    act(() => q.trigger().focus());
    await userEvent.tab();
    await expect.poll(() => touched(handle)).toBe(true);
  });
});

// ── INV-17 ────────────────────────────────────────────────────────────────────────────────
describe('INV-17: failed submit focuses the closed trigger (real browser)', () => {
  it.each(['onSubmit', 'onTouched'] as const)(
    'mode=%s: click Submit on a fresh form',
    async (mode) => {
      const { handle } = mount({ validation: { required: true }, helperText: 'Help' }, { mode });
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
      await expect.poll(() => document.activeElement === q.trigger()).toBe(true);
      expect(q.dialog()).toBeNull();
      expect(handle.submits).toEqual([]);
      expect(q.trigger().getAttribute('aria-invalid')).toBe('true');
      // Error, helper, then the hidden "Required" text (a button has no aria-required).
      expect(q.trigger().getAttribute('aria-describedby')).toMatch(
        /^countries-error countries-description \S+required$/
      );
    }
  );
});

// ── INV-23 ────────────────────────────────────────────────────────────────────────────────
describe('INV-23: unmount while open leaves the page usable (real browser)', () => {
  it('no pointer-events lock, no aria-hidden siblings, outside button clickable', async () => {
    const before = pageSnapshot();
    const handle = newHandle();
    const { rerender } = render(<FieldHarness handle={handle} />);
    await userEvent.click(q.trigger());
    await expect.poll(searchFocused).toBe(true);
    expect(document.body.style.pointerEvents).toBe('none'); // modal lock is really on
    rerender(<FieldHarness handle={handle} show={false} />);
    await expect.poll(() => document.body.style.pointerEvents).toBe('');
    expect(pageSnapshot()).toEqual(before);
    const after = screen.getByRole('button', { name: 'After' });
    await userEvent.click(after);
    expect(document.activeElement).toBe(after);
  });
});

// ── INV-25 / INV-26 ───────────────────────────────────────────────────────────────────────
async function axeViolations(): Promise<string[]> {
  const results = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  });
  return results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`
  );
}

describe('INV-26: axe-clean in every reachable state', () => {
  const failSubmit = async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await expect.poll(() => q.error()).not.toBeNull();
  };
  const open = async () => {
    await userEvent.click(q.trigger());
    await expect.poll(searchFocused).toBe(true);
  };

  const STATES: Array<[string, FieldOptions, (() => Promise<void>)[]]> = [
    ['idle', {}, []],
    ['helper', { helperText: 'Help' }, []],
    ['error', { validation: { required: true } }, [failSubmit]],
    ['helper + error', { validation: { required: true }, helperText: 'Help' }, [failSubmit]],
    ['open', { helperText: 'Help' }, [open]],
    [
      'open, no matches',
      {},
      [
        open,
        async () => {
          await userEvent.type(q.search() as HTMLInputElement, 'zzzz');
          await expect.poll(() => q.options().length).toBe(0);
        },
      ],
    ],
    ['readOnly', { readOnly: true, helperText: 'Help' }, []],
    [
      'readOnly, readonly mode',
      { readOnly: true, readOnlyMode: 'readonly', helperText: 'Help' },
      [],
    ],
  ];

  it.each(STATES)('%s', async (_name, options, steps) => {
    mount(options);
    for (const step of steps) await step();
    expect(await axeViolations()).toEqual([]);
  });

  it('empty label: the button trigger is named by its text, so axe finds nothing', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mount({ label: '' });
    expect(await axeViolations()).toEqual([]);
    expect(screen.getByRole('button', { name: 'Select items' })).toBe(q.trigger());
  });

  it('INV-25 + INV-26: focused trigger after a failed submit reads name and error', async () => {
    mount({ validation: { required: true } });
    await failSubmit();
    expect(
      screen.getByRole('button', {
        name: 'Allowed countries * Select items',
        description: 'This field is required Required',
      })
    ).toBe(document.activeElement);
  });
});
