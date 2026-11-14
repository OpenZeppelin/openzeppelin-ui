/**
 * Chips mode in Chromium: what jsdom can't show. Chips wrap inside a narrow field, a long
 * label truncates without pushing the field wider, remove buttons are at least 24×24 with a
 * visible keyboard focus ring, no frame paints with focus lost to <body> after a removal,
 * the <body> branch of the "user hasn't moved focus" guard, a real pointer press on a chip
 * while the popover is open removes nothing, real Tab order, and axe on each state.
 *
 * The browser config does not load the kit stylesheet, so the Tailwind utilities the chips
 * use are injected below with Tailwind's values. The example app's Playwright spec repeats
 * the geometry, contrast and axe with the real stylesheet in light and dark.
 */
import { act, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import { chips, Consumer, newConsumer } from './chips.harness';
import { COUNTRIES, q, type Country } from './helpers';

const STYLE_ID = 'chips-browser-styles';

beforeAll(async () => {
  await page.viewport(1000, 800);
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    *, ::before, ::after { box-sizing: border-box; border: 0 solid; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.5; }
    input, button { font: inherit; background: transparent; }
    ul { list-style: none; }
    .flex { display: flex; }
    .inline-flex { display: inline-flex; }
    .flex-col { flex-direction: column; }
    .flex-wrap { flex-wrap: wrap; }
    .items-center { align-items: center; }
    .justify-center { justify-content: center; }
    .justify-between { justify-content: space-between; }
    .gap-1 { gap: 4px; }
    .gap-2 { gap: 8px; }
    .w-full { width: 100%; }
    .h-10 { height: 40px; }
    .min-h-7 { min-height: 28px; }
    .max-w-full { max-width: 100%; }
    .min-w-0 { min-width: 0; }
    .size-6 { width: 24px; height: 24px; }
    .h-3 { height: 12px; } .w-3 { width: 12px; } .h-4 { height: 16px; } .w-4 { width: 16px; }
    .shrink-0 { flex-shrink: 0; }
    .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rounded-md { border-radius: 6px; } .rounded-sm { border-radius: 2px; }
    .text-xs { font-size: 12px; line-height: 16px; }
    .text-sm { font-size: 14px; line-height: 20px; }
    .px-2 { padding-left: 8px; padding-right: 8px; }
    .px-4 { padding-left: 16px; padding-right: 16px; }
    .py-1 { padding-top: 4px; padding-bottom: 4px; }
    .py-2 { padding-top: 8px; padding-bottom: 8px; }
    .py-0\\.5 { padding-top: 2px; padding-bottom: 2px; }
    .py-px { padding-top: 1px; padding-bottom: 1px; }
    .pr-0\\.5 { padding-right: 2px; }
    .pl-2 { padding-left: 8px; }
    .bg-muted { background: #f4f4f5; }
    .bg-background { background: #ffffff; }
    .text-foreground { color: #09090b; }
    .text-muted-foreground { color: #71717a; }
    .opacity-50 { opacity: 0.5; }
    /* Width first; colour utilities must come after so they can override. */
    .border { border-width: 1px; border-style: solid; border-color: #e4e4e7; }
    .border-border { border-color: #e4e4e7; }
    .border-primary { border-color: #18181b; }
    .tinted { background: #f4f4f5; padding: 12px; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }
    .focus-visible\\:outline-none:focus-visible { outline: 2px solid transparent; outline-offset: 2px; }
    .focus-visible\\:ring-2:focus-visible { box-shadow: 0 0 0 2px #f4f4f5, 0 0 0 4px #18181b; }
    .narrow { width: 320px; }
  `;
  document.head.appendChild(style);
});

afterAll(() => {
  document.getElementById(STYLE_ID)?.remove();
});

/** Samples document.activeElement on every animation frame until stopped. */
function sampleFocus(): { stop: () => (Element | null)[] } {
  const seen: (Element | null)[] = [];
  let running = true;
  const tick = () => {
    seen.push(document.activeElement);
    if (running) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return {
    stop: () => {
      running = false;
      return seen;
    },
  };
}

const frames = (n: number) =>
  new Promise<void>((resolve) => {
    const step = (left: number) =>
      left === 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
    step(n);
  });

async function axeViolations(): Promise<string[]> {
  const results = await axe.run(document.body, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
    },
    // The kit palette is not loaded here; contrast is checked in the example app.
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  return results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`
  );
}

const LONG = `The ${'Very '.repeat(14)}Long Republic`;
const WIDE: readonly Country[] = [
  ...COUNTRIES,
  { code: 'NL', name: 'Netherlands' },
  { code: 'PT', name: 'Portugal' },
  { code: 'SE', name: 'Sweden' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'LR', name: LONG },
];

describe('chips fit a narrow field', () => {
  it('in 320px, nine picks with one long label wrap onto several lines without widening the field', async () => {
    render(
      <div className="narrow">
        <Consumer
          handle={newConsumer()}
          items={WIDE}
          initial={['FR', 'ES', 'DE', 'IT', 'NL', 'PT', 'SE', 'GB', 'LR']}
        />
      </div>
    );
    await frames(2);
    const root = chips.root();
    const list = chips.list() as HTMLUListElement;
    expect(root.getBoundingClientRect().width).toBeLessThanOrEqual(320);
    expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
    expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    const items = Array.from(list.children) as HTMLElement[];
    const rows = new Set(items.map((li) => Math.round(li.getBoundingClientRect().top)));
    expect(rows.size).toBeGreaterThan(1);
    const listRect = list.getBoundingClientRect();
    for (const li of items) {
      const r = li.getBoundingClientRect();
      expect(r.left).toBeGreaterThanOrEqual(listRect.left - 0.5);
      expect(r.right).toBeLessThanOrEqual(listRect.right + 0.5);
    }
    // The long chip is truncated visually, and its remove button stays inside the chip.
    const long = items.at(-1) as HTMLElement;
    const label = long.querySelector('span') as HTMLElement;
    expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
    const button = chips.remove(LONG);
    const b = button.getBoundingClientRect();
    const l = long.getBoundingClientRect();
    expect(b.right).toBeLessThanOrEqual(l.right + 0.5);
    expect(b.width).toBeGreaterThanOrEqual(24);
    expect(button.getAttribute('aria-label')).toBe(`Remove ${LONG}`);
  });

  it('the row height is the same in every mode', async () => {
    const heights: number[] = [];
    for (const props of [{}, { readOnly: true }, { disabled: true }]) {
      const { unmount } = render(<Consumer handle={newConsumer()} initial={['FR']} {...props} />);
      await frames(1);
      heights.push(
        Math.round(
          (
            document.querySelector('[data-slot="searchable-multi-select-chip"]') as HTMLElement
          ).getBoundingClientRect().height
        )
      );
      unmount();
    }
    expect(heights).toEqual([28, 28, 28]);
  });
});

describe('remove buttons are large enough and visibly focused', () => {
  it('every remove button is at least 24×24', async () => {
    render(<Consumer handle={newConsumer()} initial={['FR', 'ES', 'DE']} />);
    await frames(1);
    for (const button of chips.removes()) {
      const r = button.getBoundingClientRect();
      expect(r.width).toBeGreaterThanOrEqual(24);
      expect(r.height).toBeGreaterThanOrEqual(24);
    }
  });

  it('keyboard focus shows a ring the unfocused button does not have', async () => {
    render(<Consumer handle={newConsumer()} initial={['FR', 'ES']} />);
    const button = chips.remove('France');
    const before = getComputedStyle(button).boxShadow;
    act(() => chips.trigger().focus());
    await userEvent.tab();
    expect(document.activeElement).toBe(button);
    expect(button.matches(':focus-visible')).toBe(true);
    expect(getComputedStyle(button).boxShadow).not.toBe(before);
    expect(getComputedStyle(button).boxShadow).not.toBe('none');
  });
});

describe('focus after a removal, in a real browser', () => {
  it('no frame paints with focus on <body> (keyboard removal in the middle)', async () => {
    render(<Consumer handle={newConsumer()} initial={['FR', 'ES', 'DE']} />);
    act(() => chips.trigger().focus());
    await userEvent.tab();
    await userEvent.tab();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Remove Spain');
    const sampler = sampleFocus();
    await userEvent.keyboard('{Enter}');
    await frames(3);
    const seen = sampler.stop();
    expect(seen.length).toBeGreaterThan(2);
    expect(seen.filter((el) => el === document.body || el === null)).toHaveLength(0);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Remove Germany');
    expect(chips.status().textContent).toBe('Spain removed');
  });

  it('no frame paints with focus on <body> (pointer removal of the only chip)', async () => {
    render(<Consumer handle={newConsumer()} initial={['FR']} />);
    const sampler = sampleFocus();
    await userEvent.click(chips.remove('France'));
    await frames(3);
    const seen = sampler.stop();
    // Before the click, focus was on <body>; from the click on, never again.
    const fromClick = seen.slice(seen.findIndex((el) => el !== document.body));
    expect(fromClick.filter((el) => el === document.body || el === null)).toHaveLength(0);
    expect(document.activeElement).toBe(chips.trigger());
    expect(chips.trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('a delayed apply after focus fell to <body> moves focus to the next chip', async () => {
    const handle = newConsumer();
    render(
      <>
        <p data-testid="blank" style={{ height: 40 }}>
          Blank
        </p>
        <Consumer handle={handle} policy="defer" initial={['FR', 'ES', 'DE']} />
      </>
    );
    await userEvent.click(chips.remove('Spain'));
    // A click on non-focusable content sends focus to <body>.
    await userEvent.click(screen.getByTestId('blank'));
    expect(document.activeElement).toBe(document.body);
    act(() => handle.apply());
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Remove Germany');
    expect(chips.status().textContent).toBe('Spain removed');
  });

  it('a delayed apply after the user moved to another field leaves focus there', async () => {
    const handle = newConsumer();
    render(<Consumer handle={handle} policy="defer" initial={['FR', 'ES', 'DE']} />);
    await userEvent.click(chips.remove('Spain'));
    const after = screen.getByRole('textbox', { name: 'After Countries' });
    await userEvent.click(after);
    await userEvent.keyboard('ab');
    act(() => handle.apply());
    expect(document.activeElement).toBe(after);
    expect((after as HTMLInputElement).value).toBe('ab');
    expect(chips.status().textContent).toBe('Spain removed');
  });
});

describe('the open popover blocks the chips', () => {
  it('a press where the open popover covers the chips lands in the popover and removes nothing', async () => {
    const handle = newConsumer();
    render(<Consumer handle={handle} initial={['FR', 'ES']} />);
    await userEvent.click(chips.trigger());
    const dialog = q.dialog() as HTMLElement;
    const r = chips.remove('France').getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    // The popover opens below the trigger, over the chips.
    expect(dialog.contains(hit)).toBe(true);
    await userEvent.click(chips.remove('France'), { force: true });
    expect(handle.emits).toEqual([]);
    expect(chips.labels()).toEqual(['France', 'Spain']);
    await userEvent.keyboard('{Escape}');
  });

  it('a real pointer press on an uncovered remove button while open removes nothing and closes the popover', async () => {
    const handle = newConsumer();
    render(
      <>
        {/* Little room below, so the popover flips above the trigger and leaves the chips uncovered. */}
        <div style={{ height: 640 }} />
        <Consumer handle={handle} initial={['FR', 'ES']} />
      </>
    );
    await userEvent.click(chips.trigger());
    const dialog = q.dialog() as HTMLElement;
    expect(dialog.getAttribute('data-side')).toBe('top');
    expect(getComputedStyle(document.body).pointerEvents).toBe('none');
    const button = chips.remove('France');
    const r = button.getBoundingClientRect();
    expect(
      dialog.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2))
    ).toBe(false);
    // Skip Playwright's actionability check: the press must land wherever the browser sends it.
    await userEvent.click(button, { force: true });
    await frames(2);
    expect(handle.emits).toEqual([]);
    expect(chips.labels()).toEqual(['France', 'Spain']);
    expect(q.dialog()).toBeNull();
  });

  it('picks show as chips while open; Escape returns focus to the trigger', async () => {
    render(<Consumer handle={newConsumer()} initial={['FR']} />);
    await userEvent.click(chips.trigger());
    await userEvent.click(q.option('Germany'));
    expect(chips.labels()).toEqual(['France', 'Germany']);
    expect(document.activeElement).toBe(q.search());
    await userEvent.keyboard('{Escape}');
    expect(document.activeElement).toBe(chips.trigger());
  });
});

describe('real Tab order', () => {
  it('trigger, the remove buttons in chip order, then the next field; Shift+Tab reverses', async () => {
    render(
      <>
        <button type="button">Before</button>
        <Consumer handle={newConsumer()} initial={['DE', 'FR', 'ES']} />
      </>
    );
    act(() => screen.getByRole('button', { name: 'Before' }).focus());
    const names: (string | null)[] = [];
    for (let i = 0; i < 5; i += 1) {
      await userEvent.tab();
      const el = document.activeElement;
      names.push(el === chips.trigger() ? 'trigger' : (el?.getAttribute('aria-label') ?? null));
    }
    expect(names).toEqual([
      'trigger',
      'Remove Germany',
      'Remove France',
      'Remove Spain',
      'After Countries',
    ]);
    await userEvent.tab({ shift: true });
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Remove Spain');
  });
});

describe('chips keep a visible edge on a muted surface', () => {
  it('a chip on a muted panel has a 1px border, a fill distinct from the panel, and a darker remove icon', async () => {
    render(
      <div className="tinted">
        <Consumer handle={newConsumer()} initial={['FR', 'ES']} />
      </div>
    );
    await frames(1);
    const chip = document.querySelector(
      '[data-slot="searchable-multi-select-chip"]'
    ) as HTMLElement;
    const remove = chips.remove('France');
    const panel = chip.closest('.tinted') as HTMLElement;
    const chipStyle = getComputedStyle(chip);
    const panelStyle = getComputedStyle(panel);
    const removeStyle = getComputedStyle(remove);
    expect(parseFloat(chipStyle.borderTopWidth)).toBe(1);
    expect(chipStyle.backgroundColor).not.toBe(panelStyle.backgroundColor);
    expect(chipStyle.borderTopColor).not.toBe(chipStyle.backgroundColor);
    // Stubbed kit tokens: foreground #09090b on background #ffffff is well above 3:1.
    expect(removeStyle.color).toBe('rgb(9, 9, 11)');
    expect(chipStyle.backgroundColor).toBe('rgb(255, 255, 255)');
  });

  it('chipClassName can replace the default border colour on every chip', async () => {
    render(
      <Consumer handle={newConsumer()} initial={['FR', 'ES']} chipClassName="border-primary" />
    );
    await frames(1);
    for (const li of Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="searchable-multi-select-chip"]')
    )) {
      expect(li.className.split(/\s+/)).toContain('border-primary');
      expect(getComputedStyle(li).borderTopColor).toBe('rgb(24, 24, 27)');
    }
  });
});

describe('axe (structure rules; contrast is checked in the example app)', () => {
  it.each([
    ['interactive', {}],
    ['read-only', { readOnly: true }],
    ['disabled', { disabled: true }],
  ] as const)('%s chips: no violations', async (_name, props) => {
    const { unmount } = render(
      <main>
        <Consumer handle={newConsumer()} initial={['FR', 'ES', 'DE']} {...props} />
      </main>
    );
    expect(await axeViolations()).toEqual([]);
    unmount();
  });

  it('after a removal: no violations; with the popover open: the same as count mode', async () => {
    const openViolations = async (mode: 'count' | 'chips') => {
      const { unmount } = render(
        <main>
          <Consumer handle={newConsumer()} initial={['FR', 'ES', 'DE']} showSelected={mode} />
        </main>
      );
      if (mode === 'chips') {
        await userEvent.click(chips.remove('Spain'));
        expect(await axeViolations()).toEqual([]);
      }
      await userEvent.click(q.trigger());
      // Node paths differ between the modes (the chips root); compare rule ids.
      const ids = (await axeViolations()).map((v) => v.split(':')[0]).sort();
      await userEvent.keyboard('{Escape}');
      unmount();
      return ids;
    };
    expect(await openViolations('chips')).toEqual(await openViolations('count'));
  });
});
