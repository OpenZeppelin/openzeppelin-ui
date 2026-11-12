/**
 * @vitest-environment jsdom
 *
 * 005 SF-20 · SelectField read-only, interaction (jsdom; the Chromium file repeats the critical
 * paths with real input). INV-12 (no open path opens), INV-13 / INV-6 (no value path changes the
 * value or the shown text, with and without a value), INV-16 (a list open at the switch closes
 * and stays closed). Every blocked path has a sensitivity control: the same act opens the list or
 * changes the value on an opted-in editable select.
 */
import { act, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  EDITABLE_OPTED_IN,
  fillJsdomGaps,
  mountSelect,
  PLACEHOLDER,
  READONLY,
  shownText,
  type Mounted,
} from './selectfield-readonly.sf20-kit';

beforeAll(fillJsdomGaps);
afterEach(cleanup);

type User = ReturnType<typeof userEvent.setup>;

/** Records whether a listbox node was ever added to the document. */
function watchListbox(): { seen: () => boolean; stop: () => void } {
  let seen = false;
  const mo = new MutationObserver((records) => {
    for (const r of records) {
      for (const n of Array.from(r.addedNodes)) {
        if (
          n instanceof Element &&
          (n.matches('[role="listbox"]') || n.querySelector('[role="listbox"]'))
        ) {
          seen = true;
        }
      }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
  return {
    seen: () => seen || document.querySelector('[role="listbox"]') !== null,
    stop: () => mo.disconnect(),
  };
}

function pointerTap(el: Element, pointerType: 'touch' | 'pen'): void {
  // Radix opens touch / pen on click (pointerTypeRef !== 'mouse'), after pointerdown records it.
  fireEvent.pointerDown(el, { pointerType, button: 0, pointerId: 2 });
  fireEvent.pointerUp(el, { pointerType, button: 0, pointerId: 2 });
  fireEvent.click(el);
}

const OPEN_PATHS: ReadonlyArray<[string, (m: Mounted, u: User) => Promise<void>]> = [
  ['mouse click', (m, u) => u.click(m.trigger())],
  ['label click', (m, u) => u.click(m.label())],
  ['trigger.click()', async (m) => act(() => m.trigger().click())],
  ['touch tap', async (m) => act(() => pointerTap(m.trigger(), 'touch'))],
  ['pen tap', async (m) => act(() => pointerTap(m.trigger(), 'pen'))],
  ['Enter', async (m, u) => (act(() => m.trigger().focus()), u.keyboard('{Enter}'))],
  ['Space', async (m, u) => (act(() => m.trigger().focus()), u.keyboard(' '))],
  ['ArrowDown', async (m, u) => (act(() => m.trigger().focus()), u.keyboard('{ArrowDown}'))],
  ['ArrowUp', async (m, u) => (act(() => m.trigger().focus()), u.keyboard('{ArrowUp}'))],
];

describe('INV-12: no open path opens the list while read-only', () => {
  it.each(OPEN_PATHS)(
    '%s: no listbox at any point, closed, focus on trigger, no submit',
    async (_n, open) => {
      const onValid = vi.fn();
      const m = mountSelect({ value: 'beta', onValid, ...READONLY });
      const w = watchListbox();
      await open(m, userEvent.setup());
      w.stop();
      expect(w.seen()).toBe(false);
      expect(m.trigger().getAttribute('aria-expanded')).toBe('false');
      expect(m.trigger().getAttribute('data-state')).toBe('closed');
      expect(document.activeElement).toBe(m.trigger());
      expect(onValid).not.toHaveBeenCalled();
      expect(m.api().getValues('role')).toBe('beta');
    }
  );

  it.each(OPEN_PATHS)('sensitivity — %s opens an opted-in editable select', async (_n, open) => {
    const m = mountSelect({ value: 'beta', ...EDITABLE_OPTED_IN });
    await open(m, userEvent.setup());
    expect(m.listbox()).not.toBeNull();
    expect(m.trigger().getAttribute('aria-expanded')).toBe('true');
  });
});

const VALUE_PATHS: ReadonlyArray<[string, (m: Mounted, u: User) => Promise<void>]> = [
  ['typeahead g', (_m, u) => u.keyboard('g')],
  ['typeahead ga', (_m, u) => u.keyboard('ga')],
  ['typeahead g + Space', (_m, u) => u.keyboard('g ')],
  [
    'typeahead a, wait, g',
    async (_m, u) => {
      await u.keyboard('a');
      await new Promise((r) => setTimeout(r, 1100)); // past Radix's 1s typeahead reset
      await u.keyboard('g');
    },
  ],
  [
    'hidden <select> change (autofill)',
    async (m) => {
      const native = m.nativeSelect();
      if (!native) throw new Error('no hidden select');
      fireEvent.change(native, { target: { value: 'gamma' } });
    },
  ],
];

describe('INV-13 / INV-6: no value path changes the value or the shown text while read-only', () => {
  for (const [label, value, text] of [
    ['with value beta', 'beta', 'Beta'],
    ['with no value', undefined, PLACEHOLDER],
  ] as const) {
    describe(label, () => {
      it.each(VALUE_PATHS)(
        '%s',
        async (_n, act_) => {
          const m = mountSelect({ value, ...READONLY });
          let watchCalls = 0;
          const sub = m.api().watch(() => {
            watchCalls += 1;
          });
          act(() => m.trigger().focus());
          await act_(m, userEvent.setup());
          sub.unsubscribe();
          expect(m.api().getValues('role')).toBe(value);
          expect(shownText(m.trigger())).toBe(text);
          expect(m.trigger().hasAttribute('data-placeholder')).toBe(value === undefined);
          expect(m.api().formState.dirtyFields).toStrictEqual({});
          expect(watchCalls).toBe(0);
          expect(m.listbox()).toBeNull();

          // After read-only turns off, the shown text still matches the form value (no stale match).
          m.rerender(EDITABLE_OPTED_IN);
          expect(shownText(m.trigger())).toBe(text);
          m.rerender({ readOnly: true, readOnlyMode: 'disabled' });
          expect(shownText(m.trigger())).toBe(text);
        },
        10_000
      );
    });
  }

  it.each(VALUE_PATHS)(
    'sensitivity — %s changes an opted-in editable select',
    async (_n, act_) => {
      const m = mountSelect({ value: 'beta', ...EDITABLE_OPTED_IN });
      act(() => m.trigger().focus());
      await act_(m, userEvent.setup());
      expect(m.api().getValues('role')).toBe('gamma');
      expect(shownText(m.trigger())).toBe('Gamma');
    },
    10_000
  );

  it('the switch itself never changes the shown text', () => {
    for (const [value, text] of [
      ['gamma', 'Gamma'],
      [undefined, PLACEHOLDER],
    ] as const) {
      const m = mountSelect({ value, readOnlyMode: 'readonly' });
      for (const s of [READONLY, EDITABLE_OPTED_IN, READONLY, {}]) {
        m.rerender(s);
        expect(shownText(m.trigger())).toBe(text);
      }
      cleanup();
    }
  });
});

describe('INV-16: a list open at the switch closes and stays closed', () => {
  it('open, highlight another item, switch on → closed, value kept; off → still closed; Enter opens', async () => {
    const m = mountSelect({ value: 'beta', ...EDITABLE_OPTED_IN });
    const user = userEvent.setup();
    act(() => m.trigger().focus());
    await user.keyboard('{Enter}');
    expect(m.listbox()).not.toBeNull();
    await user.keyboard('{ArrowDown}');

    m.rerender(READONLY);
    expect(m.listbox()).toBeNull();
    expect(m.trigger().getAttribute('aria-expanded')).toBe('false');
    expect(m.api().getValues('role')).toBe('beta');
    expect(shownText(m.trigger())).toBe('Beta');
    // Focus after the forced close is asserted in Chromium (selectfield-readonly.sf20.browser):
    // jsdom drops focus to <body> when Radix unmounts the content here.

    m.rerender(EDITABLE_OPTED_IN);
    await act(async () => undefined);
    expect(m.listbox()).toBeNull();
    expect(m.trigger().getAttribute('aria-expanded')).toBe('false');

    await user.keyboard('{Enter}');
    expect(m.listbox()).not.toBeNull();
  });
});
