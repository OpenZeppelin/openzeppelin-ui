/**
 * 006 SF-8 (prove-it-works): the NetworkSelector type chip meets WCAG AA text contrast in both
 * themes, in the running example app (Chromium), with the theme set by the app's own toggle.
 *
 * - AS-1: light, popover open: axe `color-contrast` flags nothing inside it, and every chip's
 *   measured ratio is at least 4.5:1.
 * - AS-2: dark, same checks.
 * - AS-3: the theme is switched with the app's toggle, and the chips are read after the switch.
 * - The trigger chip (selected network) is held to the same bar.
 *
 * Set SF8_MUTANT=oldTokens to put light `--muted-foreground` back to its 005 value (4.35:1 on the
 * chip) through CSS, with no source edit, and watch the light test fail.
 */
import { createRequire } from 'node:module';
import { expect, test, type Page } from 'playwright/test';

const axeSource = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const mutant = process.env.SF8_MUTANT ?? '';

const MUTANT_CSS: Record<string, string> = {
  oldTokens: `:root:not(.dark) { --muted-foreground: oklch(0.556 0 0) !important; }`,
};

async function clickVisibleText(page: Page, text: string): Promise<void> {
  for (const match of await page.getByText(text, { exact: true }).all()) {
    if (await match.isVisible()) {
      await match.click();
      return;
    }
  }
  throw new Error(`No visible "${text}" navigation item`);
}

async function openApp(page: Page, theme: 'light' | 'dark'): Promise<void> {
  const css = [
    '*, *::before, *::after { transition: none !important; }',
    ...mutant
      .split(',')
      .filter(Boolean)
      .map((m) => {
        if (!MUTANT_CSS[m]) throw new Error(`unknown SF8_MUTANT ${m}`);
        return MUTANT_CSS[m];
      }),
  ].join('\n');
  await page.addInitScript((text) => {
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style');
      s.textContent = text;
      document.head.append(s);
    });
  }, css);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page
    .getByText('Network Management', { exact: true })
    .first()
    .waitFor({ state: 'attached' });
  await clickVisibleText(page, 'Network Management');
  const toggle = page.getByTestId('theme-toggle');
  await toggle.waitFor({ timeout: 90_000 });
  const isDark = () => page.evaluate(() => document.documentElement.classList.contains('dark'));
  if ((await isDark()) !== (theme === 'dark')) await toggle.click();
  await expect.poll(isDark).toBe(theme === 'dark');
}

interface ChipRead {
  text: string;
  fg: string;
  bg: string;
  ratio: number;
}

/** Chips and pills under `rootSel`, read as computed colours and resolved through a canvas. */
async function readChips(page: Page, rootSel: string): Promise<ChipRead[]> {
  return page.evaluate((sel) => {
    const cx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext(
      '2d',
      { willReadFrequently: true }
    )!;
    const rgb = (css: string): [number, number, number] => {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = '#000';
      cx.fillStyle = css;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2]];
    };
    const lum = (c: number[]) => {
      const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
    };
    const root = document.querySelector(sel);
    if (!root) throw new Error(`${sel} not found`);
    return [...root.querySelectorAll('span')]
      .filter((s) => /text-\[10px\]/.test(s.className) && s.className.includes('bg-muted'))
      .map((s) => {
        const cs = getComputedStyle(s);
        const [hi, lo] = [lum(rgb(cs.color)), lum(rgb(cs.backgroundColor))].sort((a, b) => b - a);
        return {
          text: s.textContent ?? '',
          fg: cs.color,
          bg: cs.backgroundColor,
          ratio: +((hi + 0.05) / (lo + 0.05)).toFixed(2),
        };
      });
  }, rootSel);
}

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: popover chips are at least 4.5:1 and axe color-contrast is clean`, async ({
    page,
  }) => {
    await openApp(page, theme);
    const trigger = page.locator('[data-slot="network-selector-trigger"]').first();
    await trigger.click();
    const pop = page.locator('[data-slot="network-selector-content"]');
    await pop.waitFor();

    const chips = await readChips(page, '[data-slot="network-selector-content"]');
    expect(chips.length, 'chips rendered in the popover').toBeGreaterThan(0);
    for (const c of chips)
      expect(c.ratio, `${c.text} ${c.fg} on ${c.bg}`).toBeGreaterThanOrEqual(4.5);

    await page.addScriptTag({ path: axeSource });
    const axeResult = await page.evaluate(async () => {
      const axe = (
        window as unknown as {
          axe: {
            run: (
              c: Element,
              o: object
            ) => Promise<{
              violations: { id: string; nodes: { html: string }[] }[];
              passes: { nodes: { html: string }[] }[];
            }>;
          };
        }
      ).axe;
      const root = document.querySelector('[data-slot="network-selector-content"]')!;
      const r = await axe.run(root, { runOnly: ['color-contrast'] });
      return {
        violations: r.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.html.slice(0, 100)),
        })),
        chipPasses: r.passes.flatMap((p) => p.nodes).filter((n) => n.html.includes('text-[10px]'))
          .length,
      };
    });
    expect(axeResult.violations).toEqual([]);
    expect(axeResult.chipPasses, 'axe actually evaluated the chips').toBeGreaterThan(0);
  });

  test(`${theme}: the trigger chip of a selected network is at least 4.5:1`, async ({ page }) => {
    await openApp(page, theme);
    const trigger = page.locator('[data-slot="network-selector-trigger"]').first();
    await trigger.click();
    await page.locator('[data-slot="network-selector-option"]').first().click();
    await expect(page.locator('[data-slot="network-selector-content"]')).toHaveCount(0);
    const chips = await readChips(page, '[data-slot="network-selector-trigger"]');
    expect(chips.length, 'chip in the trigger').toBeGreaterThan(0);
    for (const c of chips)
      expect(c.ratio, `${c.text} ${c.fg} on ${c.bg}`).toBeGreaterThanOrEqual(4.5);
  });
}
