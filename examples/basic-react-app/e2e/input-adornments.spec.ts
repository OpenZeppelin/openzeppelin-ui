/**
 * Input start and end adornments in the running example app (Chromium, real stylesheet), in
 * light and dark: on every adorned section of the Input demo, with a value longer than the
 * field, the text never sits under a slot, the slots line up, a click on a slot lands on the
 * input, the moved search icon adds no tab stop, and axe reports nothing new outside the
 * demo's code sample.
 *
 * axe, measured on this demo before the slots existed (tall viewport, so every node is
 * checked; axe skips contrast for nodes outside the viewport):
 * - `button-name` on the password field's hand-placed show/hide icon button;
 * - in light, `color-contrast` on the green "Valid Ethereum address" helper text;
 * - `color-contrast` on syntax tokens inside the Usage code sample (the CodeBlock palette).
 * The adorned sections must report nothing; outside the code sample only the first two may
 * appear; inside it only `color-contrast` may.
 */
import { createRequire } from 'node:module';
import { expect, test, type Locator, type Page } from 'playwright/test';

const axeSource = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

const SECTIONS = [
  'input-demo-start-icon',
  'input-demo-end-text',
  'input-demo-both',
  'input-demo-read-only-lock',
] as const;
const LONG_VALUE = '1234567890'.repeat(8);
const TOL = 1;

// The app boots wallet adapters before the gallery renders, which is slow on a loaded machine.
test.describe.configure({ timeout: 120_000 });

/** Two animation frames: scrolling and layout have settled before reading geometry. */
const frames = (page: Page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

const isDark = (page: Page) =>
  page.evaluate(() => document.documentElement.classList.contains('dark'));

async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  if ((await isDark(page)) !== (theme === 'dark')) await page.getByTestId('theme-toggle').click();
  await expect.poll(() => isDark(page)).toBe(theme === 'dark');
}

async function openInputDemo(page: Page, errors: string[]): Promise<void> {
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.setViewportSize({ width: 1400, height: 1400 });
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style');
      s.textContent = '*, *::before, *::after { transition: none !important; }';
      document.head.append(s);
    });
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByTestId('theme-toggle').waitFor({ timeout: 90_000 });
  const item = page.getByText('Input', { exact: true }).first();
  if (!(await item.isVisible().catch(() => false)))
    await page.getByRole('button', { name: 'Inputs' }).first().click();
  await item.click();
  await page.getByTestId('input-demo-end-text').waitFor();
}

interface SlotReadout {
  gap: number;
  inset: number;
  centreDy: number;
  hit: boolean;
  hitAt: string;
  cx: number;
  cy: number;
}
interface Readout {
  wrapH: number;
  inputH: number;
  wrapW: number;
  parentW: number;
  inputW: number;
  wrapOverflow: string;
  paddingLeft: number;
  paddingRight: number;
  scrolledToEnd: boolean;
  overflowing: boolean;
  start?: SlotReadout;
  end?: SlotReadout;
}

async function measure(section: Locator): Promise<Readout> {
  return section.evaluate((root) => {
    const input = root.querySelector('input') as HTMLInputElement;
    const wrap = root.querySelector('[data-slot="input-wrapper"]') as HTMLElement;
    const r = input.getBoundingClientRect();
    const cs = getComputedStyle(input);
    const contentL = r.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
    const contentR = r.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);
    const wr = wrap.getBoundingClientRect();
    const out: Readout = {
      wrapH: wr.height,
      inputH: r.height,
      wrapW: wr.width,
      parentW: (wrap.parentElement as HTMLElement).clientWidth,
      inputW: r.width,
      wrapOverflow: getComputedStyle(wrap).overflow,
      paddingLeft: parseFloat(cs.paddingLeft),
      paddingRight: parseFloat(cs.paddingRight),
      scrolledToEnd: input.scrollLeft + input.clientWidth >= input.scrollWidth - 1,
      overflowing: input.scrollWidth > input.clientWidth,
    };
    for (const side of ['start', 'end'] as const) {
      const el = root.querySelector(`[data-slot="input-${side}-adornment"]`);
      if (!el) continue;
      const sr = el.getBoundingClientRect();
      const cx = sr.left + sr.width / 2;
      const cy = sr.top + sr.height / 2;
      out[side] = {
        gap: side === 'start' ? contentL - sr.right : sr.left - contentR,
        inset: side === 'start' ? sr.left - r.left : r.right - sr.right,
        centreDy: Math.abs(cy - (r.top + r.height / 2)),
        hit: document.elementFromPoint(cx, cy) === input,
        hitAt: (() => {
          const e = document.elementFromPoint(cx, cy);
          return e ? `${e.tagName} ${String(e.className).slice(0, 60)}` : 'null';
        })(),
        cx,
        cy,
      };
    }
    return out;
  });
}

async function fillLong(section: Locator): Promise<void> {
  const input = section.locator('input');
  await section.scrollIntoViewIfNeeded();
  if (await input.isEditable()) await input.fill(LONG_VALUE);
  else await input.focus();
  await input.press('End');
  await input.evaluate((el) => (el as HTMLInputElement).blur());
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`Input demo adornments (${theme})`, () => {
    test('text never sits under a slot; slots line up; wrapper matches the input', async ({
      page,
    }) => {
      const errors: string[] = [];
      await openInputDemo(page, errors);
      await setTheme(page, theme);
      const readouts: Record<string, Readout> = {};
      for (const id of SECTIONS) {
        const section = page.getByTestId(id);
        await fillLong(section);
        await section.locator('input').focus();
        await section.locator('input').press('End');
        await frames(page);
        const m = await measure(section);
        readouts[id] = m;
        if (await section.locator('input').isEditable())
          expect.soft(m.overflowing, `${id} value overflows`).toBe(true);
        expect.soft(m.scrolledToEnd, `${id} scrolled to end`).toBe(true);
        expect.soft(Math.abs(m.wrapH - m.inputH), `${id} wrapper height`).toBeLessThanOrEqual(0.5);
        expect.soft(Math.abs(m.wrapW - m.parentW), `${id} wrapper width`).toBeLessThanOrEqual(0.5);
        expect.soft(Math.abs(m.inputW - m.wrapW), `${id} input width`).toBeLessThanOrEqual(0.5);
        expect.soft(m.wrapOverflow, `${id} overflow`).toBe('visible');
        const slots = [m.start, m.end].filter((s): s is SlotReadout => s !== undefined);
        expect(slots.length, `${id} has a slot`).toBeGreaterThan(0);
        for (const [side, s] of [
          ['start', m.start],
          ['end', m.end],
        ] as const) {
          if (!s) continue;
          expect.soft(s.gap, `${id} ${side} gap`).toBeGreaterThanOrEqual(8 - TOL);
          expect.soft(Math.abs(s.inset - 12), `${id} ${side} inset`).toBeLessThanOrEqual(TOL);
          expect.soft(s.centreDy, `${id} ${side} centre`).toBeLessThanOrEqual(TOL);
          expect
            .soft(s.hit, `${id} ${side} hit target is the input, got ${s.hitAt} at ${s.cx},${s.cy}`)
            .toBe(true);
        }
      }
      const both = readouts['input-demo-both'];
      expect(both.paddingLeft, '"$" reserves less than "USDC"').toBeLessThan(both.paddingRight);
      expect(errors.filter((e) => /ResizeObserver|Warning|hook/i.test(e))).toEqual([]);
    });

    test('a click on a slot focuses the input; the moved icon adds no tab stop', async ({
      page,
    }) => {
      const errors: string[] = [];
      await openInputDemo(page, errors);
      await setTheme(page, theme);
      for (const id of SECTIONS) {
        const section = page.getByTestId(id);
        await section.scrollIntoViewIfNeeded();
        const input = section.locator('input');
        await input.evaluate((el) => (el as HTMLInputElement).blur());
        await frames(page);
        const m = await measure(section);
        const s = (m.start ?? m.end) as SlotReadout;
        const box = await input.boundingBox();
        if (!box) throw new Error(`${id} input has no box`);
        // A real click on the input at the slot's centre: Playwright refuses it if the slot
        // (or anything else) would receive the pointer event instead.
        await input.click({ position: { x: s.cx - box.x, y: s.cy - box.y }, timeout: 5_000 });
        await expect(input, `${id} focused after a click on its slot`).toBeFocused();
      }

      const search = page.getByTestId('input-demo-start-icon').locator('input');
      await search.focus();
      await page.keyboard.press('Shift+Tab');
      await expect(search).not.toBeFocused();
      await page.keyboard.press('Tab');
      await expect(search).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(search).not.toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(search).toBeFocused();
      expect(errors).toEqual([]);
    });

    test('axe: nothing new outside the code sample; adorned sections clean', async ({ page }) => {
      const errors: string[] = [];
      await openInputDemo(page, errors);
      await setTheme(page, theme);
      for (const id of SECTIONS) await fillLong(page.getByTestId(id));
      await page.setViewportSize({ width: 1400, height: 5000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.addScriptTag({ path: axeSource });
      const found = await page.evaluate(async () => {
        const axe = (
          window as unknown as {
            axe: {
              run: (
                c: Element,
                o: object
              ) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }>;
            };
          }
        ).axe;
        const root = document
          .querySelector('[data-testid="input-demo-start-icon"]')
          ?.closest('section');
        if (!root) throw new Error('Input demo section not found');
        const r = await axe.run(root, { resultTypes: ['violations'] });
        return r.violations.flatMap((v) =>
          v.nodes.map((n) => {
            const el = document.querySelector(n.target[0]);
            return {
              id: v.id,
              target: n.target.join(' '),
              inAdorned: !!el?.closest('[data-testid^="input-demo-"]'),
              inCodeSample: !!el?.closest('pre'),
              cls: el ? String(el.getAttribute('class')) : '',
            };
          })
        );
      });
      expect(found.filter((v) => v.inAdorned)).toEqual([]);
      expect(found.filter((v) => v.inCodeSample && v.id !== 'color-contrast')).toEqual([]);
      const outside = found.filter((v) => !v.inCodeSample);
      const preExisting = (v: (typeof found)[number]) =>
        (v.id === 'button-name' && v.cls.includes('top-1/2')) ||
        (theme === 'light' && v.id === 'color-contrast' && v.cls.includes('text-green-600'));
      expect(outside.filter((v) => !preExisting(v))).toEqual([]);
      expect(outside.length).toBeLessThanOrEqual(theme === 'light' ? 2 : 1);
    });
  });
}
