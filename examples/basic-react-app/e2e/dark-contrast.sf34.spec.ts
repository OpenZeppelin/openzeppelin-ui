/**
 * 005 SF-34 / SC-001 (prove-it-works): WCAG AA contrast of the card RadioGroup variant and the
 * SearchableMultiSelect options in the running example app, dark and light.
 *
 * - Scenario 1: in dark (html.dark set by next-themes from its persisted `theme` key; the example
 *   app has no toggle control) every non-exempt state meets 4.5:1 for text and 3:1 for essential
 *   non-text indicators (borders, dot ring, check mark, selected fill, active cue).
 * - Scenario 2: the light computed colours of the same elements equal the pinned pre-fix values.
 * - Disabled card is measured and reported only (WCAG-exempt).
 *
 * Set SF34_MUTANT=1 to inject the pre-fix dark colours (the `--input` token); the dark test must
 * then fail, which proves the thresholds can detect the regression. Set SF34_EVIDENCE_DIR to write
 * a JSON readout and screenshots.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Locator, type Page } from 'playwright/test';

const evidenceDir = process.env.SF34_EVIDENCE_DIR;
const mutant = process.env.SF34_MUTANT === '1';
// SF-35: reach dark by clicking the app's theme control instead of pre-setting the storage key.
const viaToggle = process.env.SF34_VIA_TOGGLE === '1';
const evidence: Record<string, unknown> = {};

type Kind = 'text' | 'border' | 'fill' | 'ring';
interface Reading {
  name: string;
  fg: string;
  bg: string;
  ratio: number;
  need: number;
}

/** Runs in the page: computed-colour contrast helpers (canvas resolves oklch/oklab to sRGB). */
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
  return { rgba, over, bgOf, ratio, hex };
}

async function read(loc: Locator, name: string, kind: Kind, target?: string): Promise<Reading> {
  return loc.evaluate(
    (el, a) => {
      const h = new Function(`return (${a.src})()`)() as ReturnType<typeof pageHelpers>;
      const subject = a.target ? el.querySelector(a.target)! : el;
      const cs = getComputedStyle(subject);
      const parentBg = h.bgOf(el.parentElement ?? el);
      const ownBg = h.bgOf(el);
      let fg: ReturnType<typeof h.rgba>;
      let bg = parentBg;
      let need = 3;
      if (a.kind === 'text') {
        fg = h.over(h.rgba(cs.color), ownBg);
        bg = ownBg;
        need = 4.5;
      } else if (a.kind === 'border') {
        fg = h.over(h.rgba(cs.borderTopColor), parentBg);
      } else if (a.kind === 'fill') {
        fg = ownBg;
      } else {
        // ring: the strongest box-shadow ring / outline colour against the surface
        const rings = Array.from(
          cs.boxShadow.matchAll(/((?:rgba?|oklab|oklch|color)\([^)]*\))\s+0px 0px 0px (\d+)px/g)
        )
          .filter((m) => Number(m[2]) > 0)
          .map((m) => h.over(h.rgba(m[1]), parentBg));
        fg = rings.sort((p, q) => h.ratio(q, parentBg) - h.ratio(p, parentBg))[0] ?? parentBg;
      }
      return { name: a.name, fg: h.hex(fg), bg: h.hex(bg), ratio: h.ratio(fg, bg), need };
    },
    { name, kind, target, src: pageHelpers.toString() }
  );
}

async function openDemo(page: Page, theme: 'light' | 'dark', nav: string): Promise<void> {
  await page.setViewportSize({ width: 1400, height: 1400 });
  if (!viaToggle) await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
  if (mutant) {
    // Pre-fix dark look: the `--input` border token the SF-34 classes replaced.
    await page.addInitScript(() => {
      const s = document.createElement('style');
      s.textContent = `html.dark [data-variant="card"][data-state="unchecked"],
        html.dark [data-variant="card"] > span:first-child,
        html.dark [role="option"] span[aria-hidden="true"]:not([class*="bg-selected"]) { border-color: var(--input) !important; }
        html.dark [role="option"][data-active] { box-shadow: none !important; }`;
      document.addEventListener('DOMContentLoaded', () => document.head.append(s));
    });
  }
  await page.goto('/', { waitUntil: 'networkidle' });
  if (viaToggle) {
    const toggle = page.getByTestId('theme-toggle');
    await toggle.waitFor({ timeout: 90_000 });
    // The second demo of a run starts from the persisted choice; click only when not yet dark.
    const alreadyDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    if (theme === 'dark' && !alreadyDark) await toggle.click();
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe(
      theme === 'dark' ? 'dark' : null
    );
    await page.reload({ waitUntil: 'networkidle' }); // the choice must survive a reload
  }
  const inputs = page.getByRole('button', { name: 'Inputs' }).first();
  await inputs.waitFor({ timeout: 90_000 });
  const item = page.getByText(nav, { exact: true }).first();
  if (!(await item.isVisible().catch(() => false))) await inputs.click();
  await item.click();
  const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  expect(isDark, 'html.dark applied by the real theme provider').toBe(theme === 'dark');
}

async function measureRadios(page: Page): Promise<Reading[]> {
  const group = page.getByRole('radiogroup', { name: 'Product type' });
  await group.waitFor();
  await group.scrollIntoViewIfNeeded();
  const spot = group.getByRole('radio', { name: 'Spot' });
  const futures = group.getByRole('radio', { name: 'Futures' });
  const options = group.getByRole('radio', { name: 'Options' });
  await spot.click();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(600); // transition-colors
  const out: Reading[] = [];
  const card = async (state: string, c: Locator) => {
    const title = c.locator(`#${await c.getAttribute('aria-labelledby')}`);
    const desc = c.locator(`#${await c.getAttribute('aria-describedby')}`);
    out.push(
      await read(title, `${state}: title text`, 'text'),
      await read(desc, `${state}: description text`, 'text'),
      await read(c, `${state}: card border`, 'border'),
      await read(c.locator('xpath=./span[1]'), `${state}: radio dot ring`, 'border')
    );
  };
  await card('unchecked', futures);
  await card('checked', spot);
  await card('disabled', options);
  out.push(await read(spot.locator('svg').first(), 'checked: indicator dot', 'text'));
  out[out.length - 1].need = 3;
  // keyboard focus on the unchecked card
  await page.mouse.click(5, 5);
  await futures.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  out.push(await read(page.locator(':focus'), 'focused: focus ring', 'ring'));
  return out;
}

async function measureOptions(page: Page): Promise<Reading[]> {
  // The trigger is a button that opens a dialog; the search box inside is the combobox.
  const combo = page.locator('[data-slot="searchable-multi-select-trigger"]').first();
  await combo.waitFor();
  await combo.click();
  const opts = page.getByRole('option');
  await opts.first().waitFor();
  await opts.nth(1).click(); // selected
  await opts.nth(3).hover(); // active
  await page.waitForTimeout(600);
  const box = (o: Locator) => o.locator('span[aria-hidden="true"]').first();
  return [
    await read(opts.nth(1), 'selected: option text', 'text'),
    await read(box(opts.nth(1)), 'selected: checkbox border', 'border'),
    await read(box(opts.nth(1)), 'selected: checkbox fill', 'fill'),
    await read(opts.nth(2), 'unselected: option text', 'text'),
    await read(box(opts.nth(2)), 'unselected: checkbox border', 'border'),
    await read(opts.nth(3), 'active: option text', 'text'),
    await read(box(opts.nth(3)), 'active: checkbox border', 'border'),
    await read(opts.nth(3), 'active: ring cue', 'ring'),
  ];
}

const EXEMPT = /^disabled:/;
const LIGHT_PINNED: Record<string, string> = {
  'unchecked: card border': '#e5e5e5',
  'unchecked: radio dot ring': '#e5e5e5',
  'checked: card border': '#5056fa',
  'checked: radio dot ring': '#e5e5e5',
  'unchecked: title text': '#0a0a0a',
  'unchecked: description text': '#737373',
  'disabled: card border': '#e5e5e5',
  'selected: checkbox border': '#5056fa',
  'selected: checkbox fill': '#5056fa',
  'unselected: checkbox border': '#e5e5e5',
  'active: checkbox border': '#e5e5e5',
};

async function all(page: Page, theme: 'light' | 'dark'): Promise<Reading[]> {
  await openDemo(page, theme, 'RadioGroup');
  const radios = await measureRadios(page);
  if (evidenceDir) {
    mkdirSync(evidenceDir, { recursive: true });
    await page.screenshot({ path: join(evidenceDir, `sf34-${theme}-radio.png`) });
  }
  await openDemo(page, theme, 'SearchableMultiSelect');
  const options = await measureOptions(page);
  if (evidenceDir)
    await page.screenshot({ path: join(evidenceDir, `sf34-${theme}-multiselect.png`) });
  const rows = [...radios, ...options];
  evidence[theme] = rows;
  return rows;
}

test.afterAll(() => {
  if (evidenceDir)
    writeFileSync(join(evidenceDir, 'sf34-spec-readout.json'), JSON.stringify(evidence, null, 2));
});

test('SF-34 scenario 1: dark mode meets AA for every non-exempt card-radio and option state', async ({
  page,
}) => {
  const rows = await all(page, 'dark');
  expect(rows.length).toBeGreaterThanOrEqual(15);
  const failing = rows
    .filter((r) => !EXEMPT.test(r.name) && r.ratio < r.need)
    .map((r) => `${r.name}: ${r.fg} on ${r.bg} = ${r.ratio} (need ${r.need})`);
  expect(failing, 'dark states below AA').toEqual([]);
  // Disabled is reported, not asserted against AA: the readings still exist.
  expect(rows.some((r) => EXEMPT.test(r.name))).toBe(true);
});

test('SF-34 scenario 2: light computed colours are unchanged', async ({ page }) => {
  const rows = await all(page, 'light');
  const byName = Object.fromEntries(rows.map((r) => [r.name, r.fg]));
  const actual = Object.fromEntries(Object.keys(LIGHT_PINNED).map((k) => [k, byName[k]]));
  expect(actual).toEqual(LIGHT_PINNED);
  // The dark-only active ring must not leak into light.
  const ring = rows.find((r) => r.name === 'active: ring cue');
  expect(ring?.ratio).toBe(1);
});
