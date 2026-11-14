/**
 * Dark-mode tokens for AddressDisplay chip, Banner colour variants, and
 * SidebarLayout / SidebarSection (Wave 5 follow-up).
 *
 * Light: computed colours are pinned. Banner light fills match tip 8dfdb44e2
 * (same Tailwind light classes). Chip and sidebar light pins are the theme-token
 * resolutions after the Behaviour change (verified in the Code Draft proof).
 * Dark: text contrast ≥ 4.5:1, no pale wash on Banner, axe color-contrast clean.
 *
 * Set SF21_MUTANT=oldTokens to inject the pre-fix light-only greys into dark;
 * the dark suite must then fail.
 */
import { createRequire } from 'node:module';
import { expect, test, type Page } from 'playwright/test';

const axeSource = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const mutant = process.env.SF21_MUTANT ?? '';

/** Tip 8dfdb44e2 Banner light fills (unchanged classes) + post-token chip/sidebar light. */
const LIGHT_PINNED = {
  chip: { bg: '#f5f5f5', fg: '#0a0a0a' },
  sidebar: { bg: '#fafafa', title: '#6c6c6c' },
  banners: [
    { bg: '#eff6ff', body: '#193cb8' }, // info
    { bg: '#f0fdf4', body: '#016630' }, // success
    { bg: '#fffbeb', body: '#973c00' }, // warning
    { bg: '#fef2f2', body: '#9f0712' }, // error
  ],
} as const;

const MUTANT_CSS: Record<string, string> = {
  // Force the pre-fix light-only look under html.dark so dark contrast collapses.
  oldTokens: `html.dark .bg-muted { background-color: #f1f5f9 !important; }
html.dark .text-foreground { color: #0f172a !important; }
html.dark .bg-sidebar { background-color: rgba(245,245,245,0.98) !important; }
html.dark .text-muted-foreground { color: #5e5e5e !important; }
html.dark .bg-blue-50 { background-color: #eff6ff !important; }
html.dark .bg-green-50 { background-color: #f0fdf4 !important; }
html.dark .bg-amber-50 { background-color: #fffbeb !important; }
html.dark .bg-red-50 { background-color: #fef2f2 !important; }
html.dark .dark\\:bg-blue-950\\/20,
html.dark .dark\\:bg-green-950\\/20,
html.dark .dark\\:bg-amber-950\\/20,
html.dark .dark\\:bg-red-950\\/20 { background-color: transparent !important; }`,
};

function pageHelpersSrc(): string {
  return `(() => {
  const cx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext(
    '2d',
    { willReadFrequently: true }
  );
  const rgba = (css) => {
    cx.clearRect(0, 0, 1, 1);
    cx.fillStyle = '#000';
    cx.fillStyle = css;
    cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const over = (t, b) => {
    const a = t[3] + b[3] * (1 - t[3]);
    const c = (i) => (t[i] * t[3] + b[i] * b[3] * (1 - t[3])) / (a || 1);
    return [c(0), c(1), c(2), a];
  };
  const hex = (c) =>
    '#' +
    c
      .slice(0, 3)
      .map((v) => Math.round(v).toString(16).padStart(2, '0'))
      .join('');
  const lum = (c) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const contrast = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return +((x + 0.05) / (y + 0.05)).toFixed(2);
  };
  return { rgba, over, hex, lum, contrast };
})()`;
}

async function openApp(page: Page, theme: 'light' | 'dark'): Promise<void> {
  const css = [
    '*, *::before, *::after { transition: none !important; }',
    ...mutant
      .split(',')
      .filter(Boolean)
      .map((m) => {
        if (!MUTANT_CSS[m]) throw new Error(`unknown SF21_MUTANT ${m}`);
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
  await page.setViewportSize({ width: 1400, height: 1200 });
  await page.goto('/', { waitUntil: 'networkidle' });
  const toggle = page.getByTestId('theme-toggle');
  await toggle.waitFor({ timeout: 90_000 });
  const isDark = () => page.evaluate(() => document.documentElement.classList.contains('dark'));
  if ((await isDark()) !== (theme === 'dark')) await toggle.click();
  await expect.poll(isDark).toBe(theme === 'dark');
}

async function openNav(page: Page, label: string): Promise<void> {
  const item = page.getByText(label, { exact: true }).first();
  if (!(await item.isVisible().catch(() => false))) {
    for (const g of ['Data Display', 'Feedback', 'Layout', 'Navigation', 'Surfaces']) {
      const b = page.getByRole('button', { name: g }).first();
      if (await b.isVisible().catch(() => false)) await b.click().catch(() => undefined);
    }
    await page.waitForTimeout(150);
  }
  await item.click();
  await page.waitForTimeout(250);
}

async function injectHelpers(page: Page): Promise<void> {
  await page.addScriptTag({ content: `window.__sf21 = ${pageHelpersSrc()};` });
}

async function readSidebar(page: Page) {
  await injectHelpers(page);
  return page.evaluate(() => {
    const h = (
      window as unknown as {
        __sf21: {
          rgba: (c: string) => number[];
          over: (a: number[], b: number[]) => number[];
          hex: (c: number[]) => string;
          contrast: (a: number[], b: number[]) => number;
          lum: (c: number[]) => number;
        };
      }
    ).__sf21;
    const layout = document.querySelector('div.fixed.left-0.top-0.z-40') as HTMLElement | null;
    const title = Array.from(document.querySelectorAll('div')).find(
      (el) => el.textContent === 'Integration' && el.className.includes('text-xs')
    ) as HTMLElement | undefined;
    if (!layout || !title) throw new Error('sidebar nodes missing');
    const pageBg =
      getComputedStyle(document.body).backgroundColor ||
      getComputedStyle(document.documentElement).backgroundColor ||
      'rgb(255,255,255)';
    const lcs = getComputedStyle(layout);
    const tcs = getComputedStyle(title);
    const bg = h.over(h.rgba(lcs.backgroundColor), h.rgba(pageBg));
    const fg = h.rgba(tcs.color);
    return {
      bg: h.hex(bg),
      title: h.hex(fg),
      ratio: h.contrast(fg, bg),
      hasBgSidebar: layout.className.split(/\s+/).includes('bg-sidebar'),
      hasMutedFg: title.className.split(/\s+/).includes('text-muted-foreground'),
      hasHardGrey: /#5e5e5e|rgba\(245/.test(layout.className + title.className),
    };
  });
}

async function readChip(page: Page) {
  await injectHelpers(page);
  return page.evaluate(() => {
    const h = (
      window as unknown as {
        __sf21: {
          rgba: (c: string) => number[];
          hex: (c: number[]) => string;
          contrast: (a: number[], b: number[]) => number;
        };
      }
    ).__sf21;
    const label = Array.from(document.querySelectorAll('p')).find((p) =>
      p.textContent?.includes('Default (truncated)')
    );
    const chipEl = label?.parentElement?.querySelector('div.group') as HTMLElement | null;
    if (!chipEl) throw new Error('AddressDisplay chip missing');
    const cs = getComputedStyle(chipEl);
    const tcs = getComputedStyle(chipEl.querySelector('span') || chipEl);
    const bg = h.rgba(cs.backgroundColor);
    const fg = h.rgba(tcs.color);
    return {
      bg: h.hex(bg),
      fg: h.hex(fg),
      ratio: h.contrast(fg, bg),
      hasBgMuted: chipEl.className.split(/\s+/).includes('bg-muted'),
      hasFg: /\btext-foreground\b/.test(chipEl.className),
      hasSlate: /slate-/.test(chipEl.className),
    };
  });
}

async function readBanners(page: Page) {
  await injectHelpers(page);
  return page.evaluate(() => {
    const h = (
      window as unknown as {
        __sf21: {
          rgba: (c: string) => number[];
          over: (a: number[], b: number[]) => number[];
          hex: (c: number[]) => string;
          contrast: (a: number[], b: number[]) => number;
          lum: (c: number[]) => number;
        };
      }
    ).__sf21;
    const pageBg =
      getComputedStyle(document.body).backgroundColor ||
      getComputedStyle(document.documentElement).backgroundColor ||
      'rgb(255,255,255)';
    const dark = document.documentElement.classList.contains('dark');
    return Array.from(document.querySelectorAll('[role="alert"]'))
      .slice(0, 4)
      .map((el) => {
        const body = el.querySelector('div.min-w-0 > div');
        const cs = getComputedStyle(el);
        const bg = h.over(h.rgba(cs.backgroundColor), h.rgba(pageBg));
        const fg = body ? h.rgba(getComputedStyle(body).color) : bg;
        return {
          bg: h.hex(bg),
          body: h.hex(fg),
          ratio: h.contrast(fg, bg),
          paleWash: dark && h.lum(bg) > 0.7,
          className: (el as HTMLElement).className,
        };
      });
  });
}

async function axeContrast(page: Page, heading: string): Promise<{ id: string }[]> {
  await page.addScriptTag({ path: axeSource });
  return page.evaluate(async (h) => {
    const axe = (
      window as unknown as {
        axe: {
          run: (
            c: Element,
            o: object
          ) => Promise<{ violations: { id: string; nodes: { html: string }[] }[] }>;
        };
      }
    ).axe;
    const title = Array.from(document.querySelectorAll('h1,h2')).find((el) =>
      el.textContent?.includes(h)
    );
    const root = title?.closest('section') || document.body;
    const r = await axe.run(root, { runOnly: ['color-contrast'] });
    return r.violations.map((v) => ({ id: v.id }));
  }, heading);
}

test('light: AddressDisplay chip, Banner variants and sidebar match pinned tip colours', async ({
  page,
}) => {
  await openApp(page, 'light');

  const sidebar = await readSidebar(page);
  expect(sidebar.hasBgSidebar).toBe(true);
  expect(sidebar.hasMutedFg).toBe(true);
  expect(sidebar.hasHardGrey).toBe(false);
  expect(sidebar.bg).toBe(LIGHT_PINNED.sidebar.bg);
  expect(sidebar.title).toBe(LIGHT_PINNED.sidebar.title);
  expect(sidebar.ratio).toBeGreaterThanOrEqual(4.5);

  await openNav(page, 'AddressDisplay');
  const chip = await readChip(page);
  expect(chip.hasBgMuted).toBe(true);
  expect(chip.hasFg).toBe(true);
  expect(chip.hasSlate).toBe(false);
  expect(chip.bg).toBe(LIGHT_PINNED.chip.bg);
  expect(chip.fg).toBe(LIGHT_PINNED.chip.fg);
  expect(chip.ratio).toBeGreaterThanOrEqual(4.5);
  expect(await axeContrast(page, 'AddressDisplay')).toEqual([]);

  await openNav(page, 'Banner');
  const banners = await readBanners(page);
  expect(banners.length).toBe(4);
  for (let i = 0; i < 4; i++) {
    expect(banners[i].bg, `banner[${i}] bg`).toBe(LIGHT_PINNED.banners[i].bg);
    expect(banners[i].body, `banner[${i}] body`).toBe(LIGHT_PINNED.banners[i].body);
    expect(banners[i].ratio, `banner[${i}] contrast`).toBeGreaterThanOrEqual(4.5);
  }
  expect(await axeContrast(page, 'Banner')).toEqual([]);
});

test('dark: chip, Banner variants and sidebar stay readable (contrast + axe)', async ({ page }) => {
  await openApp(page, 'dark');

  const sidebar = await readSidebar(page);
  expect(sidebar.hasBgSidebar).toBe(true);
  expect(sidebar.hasMutedFg).toBe(true);
  expect(sidebar.hasHardGrey).toBe(false);
  expect(sidebar.ratio, `sidebar title ${sidebar.title} on ${sidebar.bg}`).toBeGreaterThanOrEqual(
    4.5
  );

  await openNav(page, 'AddressDisplay');
  const chip = await readChip(page);
  expect(chip.hasBgMuted).toBe(true);
  expect(chip.hasSlate).toBe(false);
  expect(chip.ratio, `chip ${chip.fg} on ${chip.bg}`).toBeGreaterThanOrEqual(4.5);
  expect(await axeContrast(page, 'AddressDisplay')).toEqual([]);

  await openNav(page, 'Banner');
  const banners = await readBanners(page);
  expect(banners.length).toBe(4);
  for (let i = 0; i < 4; i++) {
    expect(banners[i].paleWash, `banner[${i}] pale wash`).toBe(false);
    expect(
      banners[i].ratio,
      `banner[${i}] ${banners[i].body} on ${banners[i].bg}`
    ).toBeGreaterThanOrEqual(4.5);
    expect(banners[i].className).toMatch(/dark:bg-/);
  }
  expect(await axeContrast(page, 'Banner')).toEqual([]);
});
