/**
 * 005 SF-20 · Chromium half of SelectField read-only: what only a real browser decides.
 * INV-11 (default-mode open / pick / Escape / outside click / typeahead with real input),
 * INV-12 (no open path opens: real mouse, label, keyboard; page doesn't scroll, form doesn't
 * submit), INV-13 / INV-6 (real typeahead), INV-14 (Tab order and the keys Radix prevents are the
 * same as editable), INV-16 (close at the switch keeps focus), INV-17 (open and typeahead after
 * the flip back), INV-27 (focus survives every switch and path), INV-28 (CDP accessibility tree),
 * plus an axe parity check. Styles aren't loaded in this runner; the look (INV-4, INV-5) and
 * layout (INV-20) are measured in the example app (`e2e/selectfield-readonly.sf20.spec.ts`).
 */
import { act, cleanup } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cdp, userEvent } from 'vitest/browser';

import {
  EDITABLE_OPTED_IN,
  LABEL,
  mountSelect,
  PLACEHOLDER,
  READONLY,
  shownText,
  type Mounted,
  type MountOptions,
} from './selectfield-readonly.sf20-kit';

afterEach(() => cleanup());

const BEFORE = <input aria-label="before" data-testid="before" />;
const AFTER = <input aria-label="after" data-testid="after" />;
const SPACER = <div data-testid="spacer" style={{ height: 3000 }} />;

const byTestId = (id: string): HTMLElement =>
  document.querySelector(`[data-testid="${id}"]`) as HTMLElement;

function mount(opts: MountOptions): Mounted {
  return mountSelect({
    before: BEFORE,
    after: (
      <>
        {AFTER}
        {SPACER}
      </>
    ),
    ...opts,
  });
}

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

async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}

async function focusTrigger(m: Mounted): Promise<void> {
  // Tab in from the previous control: real keyboard focus.
  byTestId('before').focus();
  await userEvent.keyboard('{Tab}');
  expect(document.activeElement).toBe(m.trigger());
}

function pointerTap(el: Element, pointerType: 'touch' | 'pen'): void {
  const r = el.getBoundingClientRect();
  const init = {
    pointerType,
    button: 0,
    pointerId: 7,
    isPrimary: true,
    bubbles: true,
    cancelable: true,
    clientX: r.x + 5,
    clientY: r.y + 5,
  };
  el.dispatchEvent(new PointerEvent('pointerdown', init));
  el.dispatchEvent(new PointerEvent('pointerup', init));
  (el as HTMLElement).click();
}

type Path = [string, (m: Mounted) => Promise<void>];
const OPEN_PATHS: readonly Path[] = [
  ['mouse click', async (m) => userEvent.click(m.trigger())],
  ['label click', async (m) => userEvent.click(m.label())],
  ['trigger.click()', async (m) => act(() => m.trigger().click())],
  [
    'touch tap (synthetic pointer events)',
    async (m) => act(() => pointerTap(m.trigger(), 'touch')),
  ],
  ['pen tap (synthetic pointer events)', async (m) => act(() => pointerTap(m.trigger(), 'pen'))],
  ['Enter', async (m) => (await focusTrigger(m), userEvent.keyboard('{Enter}'))],
  ['Space', async (m) => (await focusTrigger(m), userEvent.keyboard(' '))],
  ['ArrowDown', async (m) => (await focusTrigger(m), userEvent.keyboard('{ArrowDown}'))],
  ['ArrowUp', async (m) => (await focusTrigger(m), userEvent.keyboard('{ArrowUp}'))],
];

function option(text: string): HTMLElement {
  const o = Array.from(document.querySelectorAll('[role="option"]')).find(
    (x) => x.textContent === text
  );
  if (!o) throw new Error(`no option ${text}`);
  return o as HTMLElement;
}

describe('INV-11: default-mode open, pick and close behave as today (real input)', () => {
  const MODES: ReadonlyArray<[string, MountOptions]> = [
    ['default mode, readOnly true (ignored)', { readOnly: true }],
    ['readOnlyMode="readonly", readOnly false', EDITABLE_OPTED_IN],
  ];
  for (const [modeName, ro] of MODES) {
    describe(modeName, () => {
      it.each(OPEN_PATHS)(
        '%s opens; picking Gamma commits once, closes, focus on trigger',
        async (_n, open) => {
          const m = mount({ value: 'beta', ...ro });
          let changes = 0;
          const sub = m.api().watch(() => {
            changes += 1;
          });
          await open(m);
          await settle();
          expect(m.listbox()).not.toBeNull();
          expect(m.trigger().getAttribute('aria-expanded')).toBe('true');
          await userEvent.click(option('Gamma'));
          await settle();
          sub.unsubscribe();
          expect(m.listbox()).toBeNull();
          expect(m.api().getValues('role')).toBe('gamma');
          expect(changes).toBe(1);
          expect(shownText(m.trigger())).toBe('Gamma');
          expect(document.activeElement).toBe(m.trigger());
        }
      );

      it('Escape closes without a change; focus on trigger', async () => {
        const m = mount({ value: 'beta', ...ro });
        await focusTrigger(m);
        await userEvent.keyboard('{Enter}');
        await settle();
        expect(m.listbox()).not.toBeNull();
        await userEvent.keyboard('{ArrowDown}{Escape}');
        await settle();
        expect(m.listbox()).toBeNull();
        expect(m.api().getValues('role')).toBe('beta');
        expect(document.activeElement).toBe(m.trigger());
      });

      it('an outside click closes without a change', async () => {
        const m = mount({ value: 'beta', ...ro });
        await focusTrigger(m);
        await userEvent.keyboard('{Enter}');
        await settle();
        expect(m.listbox()).not.toBeNull();
        await userEvent.click(byTestId('spacer'), { position: { x: 5, y: 5 }, force: true });
        await settle();
        expect(m.listbox()).toBeNull();
        expect(m.api().getValues('role')).toBe('beta');
      });

      it('closed-trigger typeahead commits the match', async () => {
        const m = mount({ value: 'beta', ...ro });
        await focusTrigger(m);
        await userEvent.keyboard('g');
        await settle();
        expect(m.api().getValues('role')).toBe('gamma');
        expect(shownText(m.trigger())).toBe('Gamma');
        expect(m.listbox()).toBeNull();
      });
    });
  }
});

describe('INV-12 / INV-27: no open path opens the list while read-only (real input)', () => {
  it.each(OPEN_PATHS)(
    '%s: no listbox ever, closed, focus on trigger, no scroll, no submit',
    async (_n, open) => {
      const onValid = vi.fn();
      const m = mount({ value: 'beta', onValid, ...READONLY });
      m.trigger().scrollIntoView({ block: 'center' });
      const scrollY = window.scrollY;
      const w = watchListbox();
      await open(m);
      await settle();
      w.stop();
      expect(w.seen()).toBe(false);
      expect(m.trigger().getAttribute('aria-expanded')).toBe('false');
      expect(m.trigger().getAttribute('data-state')).toBe('closed');
      expect(document.activeElement).toBe(m.trigger());
      expect(window.scrollY).toBe(scrollY);
      expect(onValid).not.toHaveBeenCalled();
      expect(m.api().getValues('role')).toBe('beta');
    }
  );

  it('every open path in a row, then Tab out and back: still closed, focus never on <body>', async () => {
    const m = mount({ value: 'beta', ...READONLY });
    const w = watchListbox();
    const focusLog: string[] = [];
    const onFocusIn = (): void => {
      focusLog.push(document.activeElement?.tagName ?? 'null');
    };
    document.addEventListener('focusin', onFocusIn);
    for (const [, open] of OPEN_PATHS) {
      await open(m);
      await settle();
      expect(document.activeElement).toBe(m.trigger());
    }
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    expect(document.activeElement).toBe(byTestId('before'));
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(m.trigger());
    document.removeEventListener('focusin', onFocusIn);
    w.stop();
    expect(w.seen()).toBe(false);
    expect(focusLog).not.toContain('BODY');
  });
});

describe('INV-13 / INV-6: real typeahead never changes the value or the shown text', () => {
  const KEYS: ReadonlyArray<[string, string]> = [
    ['g', 'g'],
    ['ga', 'ga'],
    ['g + Space', 'g '],
    ['a then g', 'ag'],
  ];
  for (const [label, value, text] of [
    ['value beta', 'beta', 'Beta'],
    ['no value', undefined, PLACEHOLDER],
  ] as const) {
    it.each(KEYS)(`${label}: typeahead %s`, async (_n, keys) => {
      const m = mount({ value, ...READONLY });
      await focusTrigger(m);
      await userEvent.keyboard(keys);
      await settle();
      expect(m.api().getValues('role')).toBe(value);
      expect(shownText(m.trigger())).toBe(text);
      expect(m.trigger().hasAttribute('data-placeholder')).toBe(value === undefined);
      expect(m.listbox()).toBeNull();
      m.rerender(EDITABLE_OPTED_IN);
      await settle();
      expect(shownText(m.trigger())).toBe(text);
    });
  }

  it('hidden <select> change (autofill) commits nothing, with and without a value', async () => {
    for (const [value, text] of [
      ['beta', 'Beta'],
      [undefined, PLACEHOLDER],
    ] as const) {
      const m = mount({ value, ...READONLY });
      const native = m.nativeSelect();
      if (!native) throw new Error('no hidden select');
      await act(async () => {
        native.value = 'gamma';
        native.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(m.api().getValues('role')).toBe(value);
      expect(shownText(m.trigger())).toBe(text);
      cleanup();
    }
  });
});

describe('INV-14: keyboard navigation stays normal while read-only', () => {
  async function tabOrder(): Promise<string[]> {
    byTestId('before').focus();
    const order: string[] = [];
    for (let i = 0; i < 2; i++) {
      await userEvent.keyboard('{Tab}');
      order.push(
        document.activeElement?.id || document.activeElement?.getAttribute('aria-label') || ''
      );
    }
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    order.push(document.activeElement?.id ?? '');
    return order;
  }

  it('Tab / Shift+Tab order equals editable mode', async () => {
    mount({ value: 'beta', ...EDITABLE_OPTED_IN });
    const editable = await tabOrder();
    cleanup();
    mount({ value: 'beta', ...READONLY });
    const ro = await tabOrder();
    expect(ro).toStrictEqual(editable);
    expect(ro).toStrictEqual(['role', 'after', 'role']);
  });

  it('the keys Radix prevents on the closed trigger are the same as editable; Escape and Ctrl+A change nothing', async () => {
    const KEYS = ['{Escape}', '{ControlOrMeta>}a{/ControlOrMeta}', 'x', '{Home}', '{End}', '{Tab}'];
    async function prevented(opts: MountOptions): Promise<boolean[]> {
      const m = mount({ value: 'beta', ...opts });
      const out: boolean[] = [];
      for (const k of KEYS) {
        await focusTrigger(m);
        let p: boolean | undefined;
        const onKey = (e: KeyboardEvent): void => {
          if (p === undefined && e.target === m.trigger()) p = e.defaultPrevented;
        };
        window.addEventListener('keydown', onKey);
        await userEvent.keyboard(k);
        window.removeEventListener('keydown', onKey);
        out.push(p ?? false);
        // Close anything an editable select may have done (x is a typeahead miss: no change).
        await settle();
      }
      expect(m.api().getValues('role')).toBe('beta');
      cleanup();
      return out;
    }
    const editable = await prevented(EDITABLE_OPTED_IN);
    const ro = await prevented(READONLY);
    expect(ro).toStrictEqual(editable);
    expect(ro).toStrictEqual([false, false, false, false, false, false]);
  });
});

describe('INV-16 / INV-27: a list open at the switch closes; focus stays on the trigger', () => {
  it('open with Enter, ArrowDown, switch on → no listbox, value kept, focus on trigger; off → closed; Enter opens', async () => {
    const m = mount({ value: 'beta', ...EDITABLE_OPTED_IN });
    await focusTrigger(m);
    await userEvent.keyboard('{Enter}');
    await settle();
    expect(m.listbox()).not.toBeNull();
    await userEvent.keyboard('{ArrowDown}');
    m.rerender(READONLY);
    await settle();
    expect(m.listbox()).toBeNull();
    expect(m.api().getValues('role')).toBe('beta');
    expect(document.activeElement).toBe(m.trigger());
    m.rerender(EDITABLE_OPTED_IN);
    await settle();
    expect(m.listbox()).toBeNull();
    expect(document.activeElement).toBe(m.trigger());
    await userEvent.keyboard('{Enter}');
    await settle();
    expect(m.listbox()).not.toBeNull();
  });

  it('a focused trigger keeps focus through 10 switches each way; a click from another control focuses it', async () => {
    const m = mount({ value: 'beta', ...EDITABLE_OPTED_IN });
    await focusTrigger(m);
    for (let i = 0; i < 10; i++) {
      m.rerender(READONLY);
      await settle();
      expect(document.activeElement).toBe(m.trigger());
      m.rerender(i % 2 ? EDITABLE_OPTED_IN : { readOnly: true, readOnlyMode: 'disabled' });
      await settle();
      expect(document.activeElement).toBe(m.trigger());
    }
    m.rerender(READONLY);
    byTestId('after').focus();
    await userEvent.click(m.trigger());
    expect(document.activeElement).toBe(m.trigger());
  });
});

describe('INV-17: after the flip back, open and typeahead work again (real input)', () => {
  it.each([
    ['readOnly → false', EDITABLE_OPTED_IN],
    ['readOnlyMode → disabled', { readOnly: true, readOnlyMode: 'disabled' }],
  ] as const)('exit by %s', async (_n, exit) => {
    const m = mount({ value: 'beta', ...READONLY });
    await focusTrigger(m);
    await userEvent.keyboard('g');
    m.rerender(exit);
    await settle();
    expect(m.api().getValues('role')).toBe('beta');
    await userEvent.keyboard('g');
    await settle();
    expect(m.api().getValues('role')).toBe('gamma');
    await userEvent.click(m.trigger());
    await settle();
    expect(m.listbox()).not.toBeNull();
  });
});

/* ------------------------------------- INV-28: AX tree ------------------------------------- */

interface AXNode {
  role?: { value: string };
  name?: { value: string };
  description?: { value: string };
  properties?: Array<{ name: string; value: { value: unknown } }>;
}

async function axCombobox(): Promise<{
  role: string | undefined;
  name: string | undefined;
  description: string | undefined;
  props: Record<string, unknown>;
}> {
  type Frame = { frame: { id: string; url: string }; childFrames?: Frame[] };
  const session = cdp();
  const { frameTree } = (await session.send('Page.getFrameTree', {})) as { frameTree: Frame };
  const frames: Frame[] = [];
  const walk = (f: Frame): void => {
    frames.push(f);
    (f.childFrames ?? []).forEach(walk);
  };
  walk(frameTree);
  const testFrame = frames.find((f) => f.frame.url.includes('iframeId='));
  if (!testFrame) throw new Error('test iframe not found');
  const { nodes } = (await session.send('Accessibility.getFullAXTree', {
    frameId: testFrame.frame.id,
  })) as { nodes: AXNode[] };
  const hits = nodes.filter((n) => n.role?.value === 'combobox');
  if (hits.length !== 1) throw new Error(`expected one combobox, got ${hits.length}`);
  const n = hits[0];
  return {
    role: n.role?.value,
    name: n.name?.value,
    description: n.description?.value,
    props: Object.fromEntries((n.properties ?? []).map((p) => [p.name, p.value.value])),
  };
}

describe('INV-28: assistive tech is told read-only, not disabled', () => {
  it('read-only: combobox named by the label, description has "Read-only", focusable, not disabled, collapsed', async () => {
    const m = mount({ value: 'beta', helperText: 'Pick one', ...EDITABLE_OPTED_IN });
    const editable = await axCombobox();
    m.rerender({ ...READONLY, helperText: 'Pick one' });
    await settle();
    const ro = await axCombobox();
    expect(ro.role).toBe('combobox');
    expect(ro.name).toBe(LABEL);
    expect(ro.name).toBe(editable.name);
    expect(ro.description).toBe('Pick one Read-only');
    expect(ro.props.focusable).toBe(true);
    expect(ro.props.disabled).toBeUndefined();
    expect(ro.props.expanded).toBe(false);
    expect(editable.description).toBe('Pick one');
    expect(editable.props.disabled).toBeUndefined();
  });

  it.each([
    ['default mode, readOnly true', { readOnly: true }],
    ['opted in, readOnly false', EDITABLE_OPTED_IN],
  ] as const)('%s: no "Read-only" anywhere in name or description', async (_n, ro) => {
    mount({ value: 'beta', ...ro });
    const ax = await axCombobox();
    expect(`${ax.name} ${ax.description ?? ''}`).not.toContain('Read-only');
    expect(ax.props.focusable).toBe(true);
  });
});

describe('axe: read-only adds no violations', () => {
  async function violations(): Promise<string[]> {
    const form = document.querySelector('form') as HTMLElement;
    const r = await axe.run(form, { resultTypes: ['violations'] });
    return r.violations.map((v) => v.id).sort();
  }

  it('read-only (with error + helper) has the same axe result as editable: none', async () => {
    const m = mount({ required: true, helperText: 'Pick one', ...EDITABLE_OPTED_IN });
    await m.submit();
    const editable = await violations();
    m.rerender({ required: true, helperText: 'Pick one', ...READONLY });
    await settle();
    const ro = await violations();
    expect(ro).toStrictEqual(editable);
    expect(ro).toStrictEqual([]);
  });
});
