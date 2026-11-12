/**
 * 006 SF-14 (prove-it-works): in the dark theme, destructive text and the success Alert's text meet
 * WCAG AA in the running example app (Chromium), the kit's white-on-red fills keep their contrast,
 * and light is unchanged. Dark is reached with the app's own theme toggle.
 *
 * - INV-1 / INV-2: the live dark `--destructive` is #ff6467; destructive Alert text, field error
 *   text, the required asterisk, a focused destructive menu item and danger Badge text are ≥ 4.5:1
 *   (icon ≥ 3:1), and each rose from its pre-SF-14 value.
 * - INV-3: the success Alert's title, description and icon are green-400 (#05df72) and ≥ 4.5:1.
 * - INV-4: the destructive Button (rest, real hover, keyboard focus), the destructive LoadingButton
 *   (idle, loading) and the solid danger Badge keep their pre-SF-14 dark fill, so white text keeps
 *   its ratio; the solid success Badge doesn't move.
 * - INV-6: invalid input and Alert borders are ≥ 3:1; the network error banner keeps its own colours
 *   and only its border moves.
 * - INV-5: every light row equals its value before SF-14 (pinned below).
 * - INV-11: a light-only `className` fill on a destructive Button wins in light and loses in dark.
 * - INV-12: light → dark → light without a reload moves every row there and back.
 * - INV-15: axe `color-contrast` in dark flags no destructive or success text.
 *
 * "Pre" is the same page with the old dark `--destructive` set on <html> and the four new `dark:`
 * classes removed in place, which is the pre-SF-14 dark render.
 *
 * Set SF14_EVIDENCE_DIR to write `sf14-dark-readout.json` and screenshots. Set SF14_MUTANT to inject a
 * regression in the page (no source edit) and watch the spec fail:
 *   oldToken      — dark --destructive back to red-900: new ui-components with old ui-styles. The
 *                   text tests fail; the fill test (INV-4) must still pass (INV-10 a).
 *   oldComponents — the four new dark: classes stripped: old ui-components with new ui-styles. The
 *                   fill and success tests fail (white on #ff6467, INV-10 b).
 *   noHoverPin    — only dark:hover:bg-red-900/90 stripped: the hover row fails.
 *   noIconPin     — only dark:[&>svg]:text-green-400 stripped: the success icon row fails.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { expect, test, type Locator, type Page } from 'playwright/test';

const evidenceDir = process.env.SF14_EVIDENCE_DIR;
const mutant = process.env.SF14_MUTANT ?? '';
const axeSource = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

const OLD_TOKEN = 'oklch(0.396 0.141 25.723)';
const PINS = [
  'dark:bg-red-900',
  'dark:hover:bg-red-900/90',
  'dark:text-green-400',
  'dark:[&>svg]:text-green-400',
];
const MUTANT_CSS: Record<string, string> = {
  oldToken: `.dark { --destructive: ${OLD_TOKEN} !important; }`,
};
const MUTANT_STRIP: Record<string, string[]> = {
  oldComponents: PINS,
  noHoverPin: ['dark:hover:bg-red-900/90'],
  noIconPin: ['dark:[&>svg]:text-green-400'],
};

/** Dark colours SF-14 sets (Tailwind v4 palette, as Chromium computes them). */
const RED_400 = '#ff6467';
const RED_900 = '#82181a';
const RED_900_HOVER = '#761718'; // red-900 at 90% over the dark page
const GREEN_400 = '#05df72';

/** Light rows before SF-14, measured on a 6d743fccf build (SF-14 changes no light value). */
const LIGHT: Record<string, string> = {
  'Destructive Alert title': '#e7000b on #ffffff',
  'Destructive Alert description': '#e7000b on #ffffff',
  'Destructive Alert icon': '#e7000b on #ffffff',
  'Destructive Alert border': '#f37f84 on #ffffff',
  'Success Alert title': '#008236 on #ffffff',
  'Success Alert description': '#008236 on #ffffff',
  'Success Alert icon': '#008236 on #ffffff',
  'Success Alert border': '#7fe3a7 on #ffffff',
  'Banner title': '#82181a on #fef2f2',
  'Banner description': '#9f0712 on #fef2f2',
  'Banner icon': '#e7000b on #fef2f2',
  'Banner border': '#fd959a on #ffffff',
  'Banner settings button label': '#ffffff on #e7000b',
  'Field error message (TextField)': '#e7000b on #ffffff',
  'Required asterisk (TextField)': '#e7000b on #ffffff',
  'Invalid input border (TextField)': '#e7000b on #ffffff',
  'Destructive menu item, focused': '#e7000b on #f5f5f5',
  'Solid danger Badge label': '#fafafa on #e7000b',
  'Solid success Badge label': '#fafafa on #007f0c',
  'Filled danger Badge label': '#e7000b on #fce5e6',
  'Outline danger Badge label': '#e7000b on #ffffff',
  'Destructive Button label (rest)': '#fafafa on #e7000b',
  'Destructive Button label (hover)': '#fafafa on #e91923',
  'Destructive Button label (keyboard focus)': '#fafafa on #e7000b',
  'Destructive LoadingButton label (idle)': '#fafafa on #e7000b',
};

// ---------------------------------------------------------------------------------------------
// Readout
// ---------------------------------------------------------------------------------------------

/** Adds one section to the readout as soon as it is measured, so a failing test still leaves it. */
function record(key: string, value: unknown): void {
  if (!evidenceDir) return;
  mkdirSync(evidenceDir, { recursive: true });
  const file = join(evidenceDir, 'sf14-dark-readout.json');
  let current: Record<string, unknown> = {};
  try {
    current = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  } catch {
    current = {};
  }
  current[key] = value;
  current.mutant = mutant || null;
  writeFileSync(file, JSON.stringify(current, null, 2));
}

async function shot(page: Page, name: string): Promise<void> {
  if (evidenceDir) await page.screenshot({ path: join(evidenceDir, `sf14-${name}.png`) });
}

// ---------------------------------------------------------------------------------------------
// In-page helpers (canvas resolves oklch / oklab / color-mix to sRGB), as in SF-10 and SF-11
// ---------------------------------------------------------------------------------------------

function pageHelpers() {
  const cx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext(
    '2d',
    { willReadFrequently: true }
  )!;
  type Rgba = [number, number, number, number];
  const rgba = (css: string): Rgba => {
    cx.clearRect(0, 0, 1, 1);
    cx.fillStyle = '#000';
    cx.fillStyle = css;
    cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const over = (t: Rgba, b: Rgba): Rgba => {
    const a = t[3] + b[3] * (1 - t[3]);
    const c = (i: 0 | 1 | 2) => (t[i] * t[3] + b[i] * b[3] * (1 - t[3])) / (a || 1);
    return [c(0), c(1), c(2), a];
  };
  const bgOf = (el: Element): Rgba => {
    const chain: string[] = [];
    for (let e: Element | null = el; e; e = e.parentElement)
      chain.push(getComputedStyle(e).backgroundColor);
    return chain.reverse().reduce((acc, c) => over(rgba(c), acc), [255, 255, 255, 1] as Rgba);
  };
  const lum = (c: Rgba) => {
    const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const ratio = (a: Rgba, b: Rgba) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return +((x + 0.05) / (y + 0.05)).toFixed(2);
  };
  const hex = (c: Rgba) =>
    '#' +
    c
      .slice(0, 3)
      .map((v) => Math.round(v).toString(16).padStart(2, '0'))
      .join('');
  const hex8 = (c: Rgba) =>
    hex(c) +
    Math.round(c[3] * 255)
      .toString(16)
      .padStart(2, '0');
  return { rgba, over, bgOf, ratio, hex, hex8 };
}

type Helpers = ReturnType<typeof pageHelpers>;
const HELPERS = pageHelpers.toString();

type Kind = 'text' | 'border';
interface Reading {
  /** Raw computed colour with alpha (#rrggbbaa), before compositing. */
  value: string;
  fg: string;
  bg: string;
  ratio: number;
}
interface Row extends Reading {
  name: string;
  need?: number;
  pre?: Reading;
}

/** Reads one element now and, in dark, again as the pre-SF-14 render ("pre"). */
async function read(loc: Locator, name: string, kind: Kind, need?: number): Promise<Row> {
  await loc.scrollIntoViewIfNeeded();
  return loc.evaluate(
    (el, a) => {
      const h = new Function(`return (${a.src})()`)() as Helpers;
      const sample = () => {
        const cs = getComputedStyle(el);
        const bg = h.bgOf(a.kind === 'text' ? el : (el.parentElement ?? el));
        const raw = h.rgba(a.kind === 'text' ? cs.color : cs.borderTopColor);
        const fg = h.over(raw, bg);
        return { value: h.hex8(raw), fg: h.hex(fg), bg: h.hex(bg), ratio: h.ratio(fg, bg) };
      };
      const now = sample();
      if (!document.documentElement.classList.contains('dark'))
        return { name: a.name, need: a.need, ...now };
      const root = document.documentElement;
      root.style.setProperty('--destructive', a.oldToken);
      const removed: [Element, string][] = [];
      for (const c of a.pins)
        document.querySelectorAll(`[class~="${CSS.escape(c)}"]`).forEach((e) => {
          e.classList.remove(c);
          removed.push([e, c]);
        });
      const pre = sample();
      root.style.removeProperty('--destructive');
      removed.forEach(([e, c]) => e.classList.add(c));
      return { name: a.name, need: a.need, ...now, pre };
    },
    { name, kind, need, oldToken: OLD_TOKEN, pins: PINS, src: HELPERS }
  );
}

/** The live `--destructive` as the browser computes it, in hex. */
const liveDestructive = (page: Page) =>
  page.evaluate((src) => {
    const h = new Function(`return (${src})()`)() as Helpers;
    const probe = document.createElement('div');
    probe.style.color = 'var(--destructive)';
    document.body.append(probe);
    const v = h.hex(h.rgba(getComputedStyle(probe).color));
    probe.remove();
    return v;
  }, HELPERS);

// ---------------------------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------------------------

const isDark = (page: Page) =>
  page.evaluate(() => document.documentElement.classList.contains('dark'));

async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  if ((await isDark(page)) !== (theme === 'dark')) await page.getByTestId('theme-toggle').click();
  await expect.poll(() => isDark(page)).toBe(theme === 'dark');
}

async function openApp(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.setViewportSize({ width: 1400, height: 1400 });
  await page.addInitScript(
    ({ css, strip }) => {
      document.addEventListener('DOMContentLoaded', () => {
        const s = document.createElement('style');
        s.textContent = `*, *::before, *::after { transition: none !important; }\n${css}`;
        document.head.append(s);
        if (!strip.length) return;
        // Mutant: keep the stripped classes off every element, through React re-renders too.
        const scrub = (root: ParentNode) =>
          strip.forEach((c) =>
            root
              .querySelectorAll(`[class~="${CSS.escape(c)}"]`)
              .forEach((e) => e.classList.remove(c))
          );
        scrub(document);
        new MutationObserver(() => scrub(document)).observe(document.documentElement, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ['class'],
        });
      });
    },
    { css: MUTANT_CSS[mutant] ?? '', strip: MUTANT_STRIP[mutant] ?? [] }
  );
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByTestId('theme-toggle').waitFor({ timeout: 90_000 });
  await setTheme(page, theme);
}

async function go(page: Page, label: string, group?: string): Promise<void> {
  const item = page.getByText(label, { exact: true }).first();
  if (group && !(await item.isVisible().catch(() => false)))
    await page.getByRole('button', { name: group }).first().click();
  await item.click();
  await page.waitForTimeout(400);
}

const destructiveAlert = (page: Page) =>
  page
    .locator('[role="alert"].text-destructive')
    .filter({ has: page.locator('h5') })
    .filter({ has: page.locator(':scope > svg') })
    .first();
const successAlert = (page: Page) =>
  page
    .locator('[role="alert"].text-green-700')
    .filter({ has: page.locator('h5') })
    .first();
const destructiveButton = (page: Page) => page.locator('main button.bg-destructive').first();

// ---------------------------------------------------------------------------------------------
// Measurements, one page at a time
// ---------------------------------------------------------------------------------------------

async function alertRows(page: Page): Promise<Row[]> {
  await go(page, 'Alert', 'Feedback');
  const d = destructiveAlert(page);
  const s = successAlert(page);
  const rows = [
    await read(d.locator('h5'), 'Destructive Alert title', 'text', 4.5),
    await read(d.locator(':scope > div').last(), 'Destructive Alert description', 'text', 4.5),
    await read(d.locator(':scope > svg'), 'Destructive Alert icon', 'text', 3),
    await read(d, 'Destructive Alert border', 'border', 3),
    await read(s.locator('h5'), 'Success Alert title', 'text', 4.5),
    await read(s.locator(':scope > div').last(), 'Success Alert description', 'text', 4.5),
    await read(s.locator(':scope > svg'), 'Success Alert icon', 'text', 3),
    await read(s, 'Success Alert border', 'border'),
  ];
  await d.scrollIntoViewIfNeeded();
  await shot(page, `${(await isDark(page)) ? 'dark' : 'light'}-alert`);
  return rows;
}

async function bannerRows(page: Page): Promise<Row[]> {
  await go(page, 'Network Management');
  const b = page.getByRole('alert').filter({ hasText: 'Connection timeout after 10000ms' }).first();
  const rows = [
    await read(b.locator('h5'), 'Banner title', 'text', 4.5),
    await read(b.locator(':scope > div').first(), 'Banner description', 'text', 4.5),
    await read(b.locator(':scope > svg'), 'Banner icon', 'text', 3),
    await read(b, 'Banner border', 'border'),
    await read(
      b.getByRole('button', { name: /settings/i }),
      'Banner settings button label',
      'text',
      4.5
    ),
  ];
  await shot(page, `${(await isDark(page)) ? 'dark' : 'light'}-banner`);
  return rows;
}

async function formRows(page: Page): Promise<Row[]> {
  await go(page, 'FormFields', 'Forms');
  const input = page.locator('#textField');
  await input.scrollIntoViewIfNeeded();
  await input.fill('a');
  await input.fill('');
  await input.blur();
  await expect.poll(async () => (await input.getAttribute('aria-invalid')) ?? '').toBe('true');
  const describedBy = ((await input.getAttribute('aria-describedby')) ?? '').split(/\s+/);
  let message: Locator | undefined;
  for (const id of describedBy.filter(Boolean)) {
    const l = page.locator(`[id="${id}"]`);
    if ((await l.count()) && /required|least/i.test((await l.textContent()) ?? '')) message = l;
  }
  expect(
    message,
    `error message for #textField (aria-describedby: ${describedBy.join(' ')})`
  ).toBeDefined();
  const rows = [
    await read(message!, 'Field error message (TextField)', 'text', 4.5),
    await read(
      page.locator('label[for="textField"] .text-destructive').first(),
      'Required asterisk (TextField)',
      'text',
      4.5
    ),
    await read(input, 'Invalid input border (TextField)', 'border', 3),
  ];
  await shot(page, `${(await isDark(page)) ? 'dark' : 'light'}-form-error`);
  return rows;
}

async function menuRows(page: Page): Promise<Row[]> {
  await go(page, 'DropdownMenu', 'Layout');
  const triggers = page.locator('main button[aria-haspopup="menu"]');
  for (let i = 0; i < (await triggers.count()); i++) {
    await triggers.nth(i).click();
    const item = page.getByRole('menuitem', { name: 'Disconnect' });
    if (await item.isVisible().catch(() => false)) {
      await item.hover();
      await expect(item).toHaveAttribute('data-highlighted', '');
      const row = await read(item, 'Destructive menu item, focused', 'text', 4.5);
      await page.keyboard.press('Escape');
      return [row];
    }
    await page.keyboard.press('Escape');
  }
  throw new Error('no destructive "Disconnect" menu item found on the DropdownMenu demo');
}

async function badgeRows(page: Page): Promise<Row[]> {
  await go(page, 'Badge', 'Data Display');
  const main = page.locator('main');
  const rows = [
    await read(main.locator('.bg-destructive').first(), 'Solid danger Badge label', 'text', 4.5),
    await read(main.locator('.bg-success').first(), 'Solid success Badge label', 'text', 4.5),
    await read(
      main.locator('[class~="bg-destructive/10"]').first(),
      'Filled danger Badge label',
      'text',
      4.5
    ),
    await read(
      main.locator('[class~="border-destructive/50"]').first(),
      'Outline danger Badge label',
      'text',
      4.5
    ),
  ];
  await shot(page, `${(await isDark(page)) ? 'dark' : 'light'}-badge`);
  return rows;
}

async function buttonRows(page: Page): Promise<Row[]> {
  await go(page, 'Button', 'Inputs');
  const btn = destructiveButton(page);
  await page.mouse.move(0, 0);
  const rows = [await read(btn, 'Destructive Button label (rest)', 'text', 4.5)];
  await btn.hover(); // a real pointer: the hover utilities sit inside @media (hover: hover)
  await page.waitForTimeout(150);
  rows.push(await read(btn, 'Destructive Button label (hover)', 'text', 4.5));
  await shot(page, `${(await isDark(page)) ? 'dark' : 'light'}-button-hover`);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(150);
  rows.push(await read(btn, 'Destructive Button label (after leave)', 'text', 4.5));
  await btn.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toHaveClass(/\bbg-destructive\b/);
  rows.push(await read(focused, 'Destructive Button label (keyboard focus)', 'text', 4.5));
  return rows;
}

async function loadingButtonRows(page: Page): Promise<Row[]> {
  await go(page, 'LoadingButton', 'Data Display');
  await page.mouse.move(0, 0);
  const btn = destructiveButton(page);
  const rows = [await read(btn, 'Destructive LoadingButton label (idle)', 'text', 4.5)];
  await btn.click();
  await expect(btn).toBeDisabled();
  await page.mouse.move(0, 0);
  rows.push(await read(btn, 'Destructive LoadingButton label (loading)', 'text', 4.5));
  return rows;
}

const byName = (rows: Row[]) => Object.fromEntries(rows.map((r) => [r.name, r]));
const below = (rows: Row[]) =>
  rows
    .filter((r) => r.need && r.ratio < r.need)
    .map((r) => `${r.name}: ${r.fg} on ${r.bg} = ${r.ratio}`);
/** INV-13 within SF-14's own rows: nothing lower than its pre-SF-14 dark value. */
const drops = (rows: Row[]) =>
  rows
    .filter((r) => r.pre && r.ratio < r.pre.ratio)
    .map((r) => `${r.name}: ${r.pre!.ratio} → ${r.ratio}`);

// =============================================================================================

test('SF-14 INV-1, INV-2, INV-6: dark destructive text ≥ 4.5:1 and borders ≥ 3:1, each risen from before', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await openApp(page, 'dark');
  const token = await liveDestructive(page);
  record('liveDestructive', { dark: token });

  const rows = [
    ...(await alertRows(page)).filter((r) => r.name.startsWith('Destructive')),
    ...(await formRows(page)),
    ...(await menuRows(page)),
    ...(await badgeRows(page)).filter((r) => /Filled|Outline/.test(r.name)),
  ];
  record('destructiveText', rows);
  expect(token, 'INV-1: live dark --destructive').toBe(RED_400);
  expect(below(rows), 'rows below threshold').toEqual([]);
  // Each row reads the token, so each rose (1.5–2.0 → 5.2–6.9). The old-token mutant fails here.
  const flat = rows.filter((r) => !(r.pre && r.ratio > r.pre.ratio));
  expect(
    flat.map((r) => `${r.name}: ${r.pre?.ratio} → ${r.ratio}`),
    'rows that did not rise'
  ).toEqual([]);
  expect(Object.fromEntries(rows.map((r) => [r.name, r.fg]))).toEqual(
    Object.fromEntries(rows.map((r) => [r.name, RED_400]))
  );
});

test('SF-14 INV-3: the dark success Alert text and icon are green-400, ≥ 4.5:1', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await openApp(page, 'dark');
  const rows = (await alertRows(page)).filter((r) => r.name.startsWith('Success'));
  record('successAlert', rows);
  const r = byName(rows);
  // The colour, not only the ratio: green-700 icon next to green-400 text would still pass at 4.00.
  expect({
    title: r['Success Alert title'].value,
    description: r['Success Alert description'].value,
    icon: r['Success Alert icon'].value,
    border: r['Success Alert border'].value,
  }).toEqual({
    title: `${GREEN_400}ff`,
    description: `${GREEN_400}ff`,
    icon: `${GREEN_400}ff`,
    border: '#00c950ff', // green-500, SF-10 R7, unchanged
  });
  expect(below(rows)).toEqual([]);
  expect(r['Success Alert title'].pre?.ratio, 'before SF-14').toBeLessThan(4.5);
  expect(drops(rows)).toEqual([]);
});

test('SF-14 INV-4, INV-12: the kit fills keep their pre-SF-14 dark colour at rest, on hover, focused and loading', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await openApp(page, 'dark');
  const rows = [
    ...(await buttonRows(page)),
    ...(await loadingButtonRows(page)),
    ...(await badgeRows(page)).filter((r) => r.name.startsWith('Solid')),
  ];
  record('fills', rows);
  const fill = Object.fromEntries(rows.map((r) => [r.name, r.bg]));
  expect(fill).toEqual({
    'Destructive Button label (rest)': RED_900,
    'Destructive Button label (hover)': RED_900_HOVER,
    'Destructive Button label (after leave)': RED_900,
    'Destructive Button label (keyboard focus)': RED_900,
    'Destructive LoadingButton label (idle)': RED_900,
    'Destructive LoadingButton label (loading)': RED_900,
    'Solid danger Badge label': RED_900,
    'Solid success Badge label': '#00571f',
  });
  // Equal to the same element rendered as before SF-14, so the ratio can't have moved either way.
  const moved = rows.filter((r) => r.bg !== r.pre?.bg || r.ratio !== r.pre?.ratio);
  expect(moved.map((r) => `${r.name}: ${r.pre?.bg} ${r.pre?.ratio} → ${r.bg} ${r.ratio}`)).toEqual(
    []
  );
  expect(below(rows)).toEqual([]);
  const r = byName(rows);
  expect(r['Destructive Button label (hover)'].ratio).toBeGreaterThan(
    r['Destructive Button label (rest)'].ratio
  );
});

test('SF-14 INV-6: the network error banner keeps its own colours; only its border moves', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await openApp(page, 'dark');
  const rows = await bannerRows(page);
  record('banner', rows);
  const moved = rows.filter((r) => r.value !== r.pre?.value).map((r) => r.name);
  expect(moved).toEqual(['Banner border']);
  expect(byName(rows)['Banner border'].fg).toBe(RED_400);
  expect(below(rows)).toEqual([]);
  expect(drops(rows)).toEqual([]);
});

test('SF-14 INV-5: light colours equal their pre-SF-14 values', async ({ page }) => {
  test.setTimeout(240_000);
  await openApp(page, 'light');
  expect(await liveDestructive(page), 'light --destructive (red-600)').toBe('#e7000b');
  const rows = [
    ...(await alertRows(page)),
    ...(await bannerRows(page)),
    ...(await formRows(page)),
    ...(await menuRows(page)),
    ...(await badgeRows(page)),
    ...(await buttonRows(page)).filter((r) => !r.name.includes('after leave')),
    ...(await loadingButtonRows(page)).filter((r) => r.name.includes('idle')),
  ];
  record('light', rows);
  expect(Object.fromEntries(rows.map((r) => [r.name, `${r.fg} on ${r.bg}`]))).toEqual(LIGHT);
});

test('SF-14 INV-11: a light-only className fill on a destructive Button wins in light, loses in dark', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await openApp(page, 'light');
  await go(page, 'Button', 'Inputs');
  await page.mouse.move(0, 0);
  // Tag the element first: the class edit below takes it out of `button.bg-destructive`.
  await destructiveButton(page).evaluate((el) => el.setAttribute('data-sf14-override', ''));
  const btn = page.locator('[data-sf14-override]');
  // What cn(buttonVariants({ variant: 'destructive' }), 'bg-red-600') renders (the contract test
  // checks the merge): bg-red-600 replaces bg-destructive, the dark: pins stay. Re-applied after
  // each theme switch in case React re-renders the class list.
  const override = async () => {
    await btn.evaluate((el) => {
      el.classList.remove('bg-destructive');
      el.classList.add('bg-red-600');
    });
    const cls = await btn.evaluate((el) => Array.from(el.classList));
    expect(cls).toContain('bg-red-600');
    expect(cls).not.toContain('bg-destructive');
    return cls;
  };
  await override();
  const hasRule = await page.evaluate(() =>
    Array.from(document.styleSheets).some((s) => {
      try {
        return Array.from(s.cssRules).some((r) => r.cssText.includes('.bg-red-600'));
      } catch {
        return false;
      }
    })
  );
  expect(hasRule, 'the app stylesheet has a bg-red-600 rule').toBe(true);
  const light = await read(btn, 'Override bg-red-600 (light)', 'text');
  await setTheme(page, 'dark');
  const cls = await override();
  const dark = await read(btn, 'Override bg-red-600 (dark)', 'text');
  record('override', { rows: [light, dark], classes: cls });
  expect(light.bg, 'light: the consumer colour (red-600) wins').toBe('#e7000b');
  // Without the kit pin (before SF-14) the override would win in dark too (#e7000b).
  expect(dark.bg, 'dark: the kit pin (red-900) wins over a light-only override').toBe(RED_900);
  expect(dark.pre?.bg, 'before SF-14 the light-only override won in dark as well').toBe('#e7000b');
});

test('SF-14 INV-12: light → dark → light without a reload moves every row there and back', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await openApp(page, 'light');
  await go(page, 'Alert', 'Feedback');
  const snapshot = async () => ({
    destructive: (await read(destructiveAlert(page).locator('h5'), 'd', 'text')).fg,
    success: (await read(successAlert(page).locator('h5'), 's', 'text')).fg,
    successIcon: (await read(successAlert(page).locator(':scope > svg'), 'si', 'text')).fg,
  });
  const first = await snapshot();
  await setTheme(page, 'dark');
  const dark = await snapshot();
  await setTheme(page, 'light');
  const back = await snapshot();
  await go(page, 'Button', 'Inputs');
  await page.mouse.move(0, 0);
  const fillLight = (await read(destructiveButton(page), 'b', 'text')).bg;
  await setTheme(page, 'dark');
  const fillDark = (await read(destructiveButton(page), 'b', 'text')).bg;
  await setTheme(page, 'light');
  const fillBack = (await read(destructiveButton(page), 'b', 'text')).bg;
  record('roundTrip', { first, dark, back, fill: [fillLight, fillDark, fillBack] });
  expect(first).toEqual({ destructive: '#e7000b', success: '#008236', successIcon: '#008236' });
  expect(dark).toEqual({ destructive: RED_400, success: GREEN_400, successIcon: GREEN_400 });
  expect(back).toEqual(first);
  expect([fillLight, fillDark, fillBack]).toEqual(['#e7000b', RED_900, '#e7000b']);
});

test('SF-14 INV-15: axe color-contrast in dark flags no destructive or success text', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await openApp(page, 'dark');
  const found: Record<string, { target: string; html: string; summary: string }[]> = {};
  for (const [nav, group] of [
    ['Alert', 'Feedback'],
    ['Network Management', undefined],
    ['FormFields', 'Forms'],
  ] as const) {
    await go(page, nav, group);
    if (nav === 'FormFields') {
      const input = page.locator('#textField');
      await input.fill('a');
      await input.fill('');
      await input.blur();
      await expect.poll(async () => (await input.getAttribute('aria-invalid')) ?? '').toBe('true');
    }
    await page.addScriptTag({ path: axeSource });
    found[nav] = await page.evaluate(async () => {
      type Node = { target: string[]; html: string; failureSummary: string };
      const axe = (
        window as unknown as {
          axe: { run: (c: Element, o: object) => Promise<{ violations: { nodes: Node[] }[] }> };
        }
      ).axe;
      const r = await axe.run(document.querySelector('main') ?? document.body, {
        runOnly: ['color-contrast'],
      });
      return r.violations.flatMap((v) =>
        v.nodes.map((n) => ({
          target: n.target.join(' '),
          html: n.html.slice(0, 200),
          summary: n.failureSummary,
        }))
      );
    });
  }
  record('axeDark', found);
  // Destructive and success text: the token classes, field messages and the green Alert text.
  const ours = Object.entries(found).flatMap(([demo, nodes]) =>
    nodes
      .filter((n) =>
        /text-destructive|text-green-(400|700)|role="alert"|aria-invalid|-message/.test(n.html)
      )
      .map((n) => `${demo}: ${n.target}`)
  );
  expect(ours).toEqual([]);
});
