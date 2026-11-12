/**
 * @vitest-environment jsdom
 *
 * 005 SF-20 · SelectField read-only, render contract (jsdom).
 * INV-1 (default mode equals the pre-SF-20 baseline from a66d72dd0: HTML, payload, open, pick),
 * INV-2 (read-only trigger attributes; opted-in editable equals editable default on visible
 * nodes), INV-3 (the "Read-only" description and `aria-describedby`), INV-7 (strict resolution
 * table), INV-17 (no residue after either exit route) and INV-19 (same trigger node, `field.ref`).
 */
import { act, cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import baseline from './selectfield-readonly.sf20-baseline.a66d72dd0.json';
import {
  attrs,
  captureCase,
  describedByIds,
  EDITABLE_OPTED_IN,
  fillJsdomGaps,
  ID,
  INV1_CASES,
  LABEL,
  mountSelect,
  normalise,
  READONLY,
  readOnlyNote,
  shownText,
  stripLook,
  type CaseSnapshot,
  type Mounted,
  type SwitchProps,
} from './selectfield-readonly.sf20-kit';

const BASE: Record<string, CaseSnapshot> = baseline.cases;

beforeAll(fillJsdomGaps);
afterEach(cleanup);

/** Whether RHF holds the name in its disabled set (what `Controller disabled` drives). */
function inDisabledSet(m: Mounted): boolean {
  return m.api().control._names.disabled.has('role');
}

/** Visible field HTML: container without Radix's hidden native <select>, look tokens removed. */
function visibleHtml(m: Mounted): string {
  const clone = m.container().cloneNode(true) as HTMLElement;
  clone.querySelectorAll('select').forEach((s) => s.remove());
  return stripLook(normalise(clone.outerHTML));
}

describe('INV-1: default mode equals the pre-SF-20 SelectField (a66d72dd0)', () => {
  it('the baseline covers 3 readOnly × 3 default modes × 4 scenarios', () => {
    expect(Object.keys(BASE).sort()).toStrictEqual(INV1_CASES.map((c) => c.key).sort());
  });

  it.each(INV1_CASES.map((c) => [c.key, c] as const))(
    '%s: same HTML (incl. hidden select), payload, open on Enter and pick',
    async (key, c) => {
      const now = await captureCase(c, userEvent.setup());
      expect(now).toStrictEqual(BASE[key]);
    }
  );

  it('the only class difference on the trigger is the four gated look tokens', () => {
    const m = mountSelect({ value: 'beta' });
    const cls = m.trigger().className;
    const tokens = cls.split(' ').filter((t) => t.startsWith('data-readonly:'));
    expect(tokens).toStrictEqual([
      'data-readonly:not-disabled:bg-muted',
      'data-readonly:not-disabled:text-foreground',
      'data-readonly:not-disabled:opacity-100',
      'data-readonly:not-disabled:cursor-default',
    ]);
    expect(stripLook(`class="${cls}"`)).toBe(
      /<button type="button" role="combobox"[^>]*?(class="[^"]*")/
        .exec(BASE['ro=absent|mode=absent|value'].html)?.[1]
        .replace(/&amp;/g, '&')
    );
  });

  it.each([undefined, 'disabled', 'bogus'])(
    'readOnly true + mode %s: the name never enters RHF’s disabled set (Controller disabled undefined)',
    async (mode) => {
      const m = mountSelect({ value: 'beta', readOnly: true, readOnlyMode: mode });
      expect(inDisabledSet(m)).toBe(false);
      expect(m.trigger().hasAttribute('aria-readonly')).toBe(false);
      expect(readOnlyNote()).toBeNull();
    }
  );
});

describe('INV-2: read-only trigger attributes', () => {
  it('read-only on: same combobox button, not disabled, aria-readonly + data-readonly, closed', () => {
    const m = mountSelect({ value: 'beta', required: true, ...READONLY });
    const t = m.trigger();
    expect(t.tagName).toBe('BUTTON');
    expect(t.getAttribute('type')).toBe('button');
    expect(t.getAttribute('role')).toBe('combobox');
    expect(t.hasAttribute('disabled')).toBe(false);
    expect(t.hasAttribute('data-disabled')).toBe(false);
    expect(t.hasAttribute('aria-disabled')).toBe(false);
    expect(t.hasAttribute('tabindex')).toBe(false);
    expect(t.getAttribute('aria-readonly')).toBe('true');
    expect(t.getAttribute('data-readonly')).toBe('');
    expect(t.getAttribute('aria-expanded')).toBe('false');
    expect(t.getAttribute('data-state')).toBe('closed');
    expect(t.tabIndex).toBe(0);
  });

  it('read-only on: aria-required, aria-invalid, id and aria-controls are as in editable mode', () => {
    const ro = attrs(mountSelect({ value: 'beta', required: true, ...READONLY }).trigger());
    cleanup();
    const ed = attrs(mountSelect({ value: 'beta', required: true }).trigger());
    for (const k of ['aria-required', 'aria-invalid', 'id', 'aria-controls'] as const) {
      expect(ro[k], k).toBe(ed[k]);
    }
    // Everything else that differs is exactly the read-only additions.
    const diff = Object.keys({ ...ro, ...ed }).filter((k) => ro[k] !== ed[k]);
    expect(diff.sort()).toStrictEqual(['aria-describedby', 'aria-readonly', 'data-readonly']);
  });

  // Drift note (3) from Code: under the opt-in the Root value is controlled (`?? ''`), so Radix's
  // hidden <select> has no empty <option> when the value is empty. INV-2 compares the trigger and
  // the visible nodes, not that hidden node.
  it.each([
    ['empty', 'ro=absent|mode=absent|empty', {}],
    ['value', 'ro=absent|mode=absent|value', { value: 'beta' }],
    [
      'value+helper',
      'ro=absent|mode=absent|value+helper',
      { value: 'beta', helperText: 'Pick one' },
    ],
  ] as const)(
    'readOnlyMode="readonly", readOnly false/undefined (%s): visible nodes equal the editable default',
    async (_s, key, extra) => {
      for (const readOnly of [false, undefined]) {
        const m = mountSelect({ ...extra, readOnlyMode: 'readonly', readOnly });
        expect(visibleHtml(m)).toBe(BASE[key].visibleHtml);
        expect(readOnlyNote()).toBeNull();
        cleanup();
      }
    }
  );

  it('readOnlyMode="readonly", readOnly false: payload, open and pick equal the editable default', async () => {
    for (const [scenario, value] of [
      ['empty', undefined],
      ['value', 'beta'],
    ] as const) {
      const c = INV1_CASES.find((x) => x.key === `ro=absent|mode=absent|${scenario}`);
      if (!c) throw new Error('missing case');
      const now = await captureCase(
        { ...c, props: { ...c.props, ...EDITABLE_OPTED_IN }, value },
        userEvent.setup()
      );
      const base = BASE[c.key];
      expect({ ...now, html: '', visibleHtml: '' }).toStrictEqual({
        ...base,
        html: '',
        visibleHtml: '',
      });
      cleanup();
    }
  });
});

describe('INV-3: the read-only description', () => {
  const COMBOS: ReadonlyArray<[string, { error: boolean; helper: boolean }]> = [
    ['no error, no helper', { error: false, helper: false }],
    ['helper', { error: false, helper: true }],
    ['error', { error: true, helper: false }],
    ['error + helper', { error: true, helper: true }],
  ];

  async function mountCombo(
    combo: { error: boolean; helper: boolean },
    ro: SwitchProps
  ): Promise<Mounted> {
    const m = mountSelect({
      value: combo.error ? undefined : 'beta',
      required: combo.error,
      helperText: combo.helper ? 'Pick one' : undefined,
      ...ro,
    });
    if (combo.error) await m.submit();
    return m;
  }

  it.each(COMBOS)(
    '%s, read-only on: ids resolve, order is error, helper, read-only',
    async (_n, combo) => {
      const m = await mountCombo(combo, READONLY);
      const ids = describedByIds(m.trigger());
      const expected = [
        ...(combo.error ? [`${ID}-error`] : []),
        ...(combo.helper ? [`${ID}-description`] : []),
        `${ID}-readonly`,
      ];
      expect(ids).toStrictEqual(expected);
      for (const id of ids) {
        expect(id).not.toBe('');
        expect(id).not.toBe('undefined');
        expect(document.getElementById(id), id).not.toBeNull();
      }
    }
  );

  it.each(COMBOS)('%s, read-only off: no read-only id, no description node', async (_n, combo) => {
    for (const ro of [{}, EDITABLE_OPTED_IN, { readOnly: true }]) {
      const m = await mountCombo(combo, ro);
      expect(describedByIds(m.trigger())).not.toContain(`${ID}-readonly`);
      expect(readOnlyNote()).toBeNull();
      cleanup();
    }
  });

  it('exactly one sr-only "Read-only" span, a sibling after the Select, not inside the trigger', () => {
    const m = mountSelect({ value: 'beta', helperText: 'Pick one', ...READONLY });
    const notes = document.querySelectorAll(`[id="${ID}-readonly"]`);
    expect(notes).toHaveLength(1);
    const note = notes[0] as HTMLElement;
    expect(note.tagName).toBe('SPAN');
    expect(note.className).toBe('sr-only');
    expect(note.textContent).toBe('Read-only');
    expect(note.parentElement).toBe(m.container());
    expect(m.trigger().contains(note)).toBe(false);
    // After the trigger (and Radix's hidden select), before the helper text.
    const kids = Array.from(m.container().children);
    expect(kids.indexOf(note)).toBeGreaterThan(kids.indexOf(m.trigger()));
    expect(kids.indexOf(note)).toBeLessThan(
      kids.indexOf(document.getElementById(`${ID}-description`) as HTMLElement)
    );
  });

  it('the accessible name stays the label; "Read-only" is only in the description', () => {
    mountSelect({ value: 'beta', ...READONLY });
    // Testing Library's role query computes the accessible name and description (dom-accessibility-api).
    const t = screen.getByRole('combobox', { name: LABEL, description: 'Read-only' });
    expect(t).toBe(document.getElementById(ID));
    expect(screen.queryByRole('combobox', { name: /Read-only/ })).toBeNull();
  });

  it('with helper text the description reads helper then "Read-only"', () => {
    mountSelect({ value: 'beta', helperText: 'Pick one', ...READONLY });
    expect(screen.getByRole('combobox', { name: LABEL, description: 'Pick one Read-only' })).toBe(
      document.getElementById(ID)
    );
  });
});

describe('INV-7: read-only resolution is strict and fails closed', () => {
  const RO = [undefined, false, true] as const;
  const MODES = [undefined, 'disabled', 'readonly', 'bogus'] as const;
  const rows = RO.flatMap((readOnly) => MODES.map((mode) => [readOnly, mode] as const));

  it.each(rows)('readOnly=%s, readOnlyMode=%s', async (readOnly, readOnlyMode) => {
    const isRO = readOnly === true && readOnlyMode === 'readonly';
    const m = mountSelect({ value: 'beta', readOnly, readOnlyMode });
    expect(m.trigger().hasAttribute('aria-readonly')).toBe(isRO);
    expect(m.trigger().hasAttribute('data-readonly')).toBe(isRO);
    expect(readOnlyNote() !== null).toBe(isRO);
    expect(inDisabledSet(m)).toBe(false);
    const user = userEvent.setup();
    act(() => m.trigger().focus());
    await user.keyboard('{Enter}');
    expect(m.listbox() !== null).toBe(!isRO);
  });
});

describe('INV-17: the switch is reversible with no residue', () => {
  it.each([
    ['readOnly → false', EDITABLE_OPTED_IN],
    ['readOnlyMode → disabled', { readOnly: true, readOnlyMode: 'disabled' }],
  ] as const)(
    'exit by %s: indistinguishable from a field that was never read-only',
    async (_r, exit) => {
      for (const value of ['beta', undefined]) {
        const fresh = mountSelect({ value, ...exit });
        const freshHtml = normalise(fresh.container().outerHTML);
        cleanup();

        const m = mountSelect({ value, ...EDITABLE_OPTED_IN });
        m.rerender(READONLY);
        expect(m.trigger().getAttribute('aria-readonly')).toBe('true');
        m.rerender(exit);
        const now = normalise(m.container().outerHTML);
        if (exit.readOnlyMode === 'disabled' && value === undefined) {
          // Finding (recorded in 05-tests.md): leaving the opt-in with an empty value leaves one
          // residue, in Radix's aria-hidden native <select> only: its empty <option> doesn't come
          // back (Radix's internal value stays '' from the controlled period). The visible nodes,
          // the AX tree and the payload match a fresh field; pinned exactly so a change shows up.
          expect(now).toBe(freshHtml.replace('<option value=""></option>', ''));
          expect(visibleHtml(m)).toBe(
            stripLook(freshHtml.replace(/<select[\s\S]*?<\/select>/, ''))
          );
        } else {
          // Whole container, Radix's hidden <select> included.
          expect(now).toBe(freshHtml);
        }
        expect(readOnlyNote()).toBeNull();

        const user = userEvent.setup();
        act(() => m.trigger().focus());
        await user.keyboard('{Enter}');
        expect(m.listbox()).not.toBeNull();
        cleanup();
      }
    }
  );
});

describe('INV-19: the trigger is the same DOM node across every switch', () => {
  it('every readOnly / readOnlyMode transition keeps the node; setFocus still lands on it', async () => {
    const m = mountSelect({ value: 'beta' });
    const node = m.trigger();
    const label = m.label();
    const STATES: SwitchProps[] = [
      { readOnly: true },
      { readOnly: true, readOnlyMode: 'disabled' },
      READONLY,
      EDITABLE_OPTED_IN,
      READONLY,
      { readOnly: true, readOnlyMode: 'bogus' },
      READONLY,
      {},
    ];
    for (const s of STATES) {
      m.rerender(s);
      expect(m.trigger()).toBe(node);
      expect(m.label()).toBe(label);
      // react-hook-form defers setFocus with a timeout (as in SF-6's test), so assert eventually.
      act(() => m.api().setFocus('role'));
      await waitFor(() => expect(document.activeElement).toBe(node));
      act(() => node.blur());
    }
  });

  it('the shown text survives the switch (no remount resets it)', () => {
    const m = mountSelect({ value: 'gamma' });
    expect(shownText(m.trigger())).toBe('Gamma');
    m.rerender(READONLY);
    expect(shownText(m.trigger())).toBe('Gamma');
    m.rerender({});
    expect(shownText(m.trigger())).toBe('Gamma');
  });
});
