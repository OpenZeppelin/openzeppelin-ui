/**
 * 006 SF-10 / SC-001 (prove-it-works): `dark:` classes apply in dark mode, in the running example
 * app, in Chromium. Dark is reached with the app's own theme control (html.dark via next-themes).
 *
 * - Scenario 1 / INV-4: each library element with a `dark:` class shows that class's value in dark.
 * - INV-10, R2: the error banner's settings button label stays ≥ 4.5:1 at rest and on hover in both
 *   themes; the banner icon is red-400 and ≥ 3:1 on the dark banner surface.
 * - INV-11: no revived class drops a text pair below 4.5:1 (icons 3:1) when its pre-revival dark
 *   state met it. "Pre" is the same page with every `dark:` class stripped in place.
 * - Scenario 3 / INV-3: light computed colours equal the pre-SF-10 values (pinned below).
 * - INV-9: theme switches apply and undo dark values live, without a reload; the invalid ring
 *   follows `aria-invalid` as well as the theme.
 * - INV-1 / INV-2 (spec edge case): with html light, `dark` on a non-root element turns `dark:` on
 *   for that element and its descendants only, and a same-layer single-class override still wins.
 * - Scenario 4: every example-app page and tab with `dark:` classes (including the Wallet prop
 *   tables and the network requirement hint) shows its dark style with no contrast regression.
 *
 * Set SF10_EVIDENCE_DIR to write the readout (`sf10-dark-readout.json`, SF-11's dark baseline)
 * and screenshots.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Locator, type Page } from 'playwright/test';

const evidenceDir = process.env.SF10_EVIDENCE_DIR;

/** Adds one section to the readout as soon as it is measured, so a failing test still leaves it. */
function record(key: string, value: unknown): void {
  if (!evidenceDir) return;
  mkdirSync(evidenceDir, { recursive: true });
  const file = join(evidenceDir, 'sf10-dark-readout.json');
  const all = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as object) : {};
  writeFileSync(file, JSON.stringify({ ...all, [key]: value }, null, 2));
}

type Kind = 'text' | 'border' | 'fill' | 'ring';
interface Sample {
  /** The measured property as 8-digit hex (#rrggbbaa), uncomposited. */
  value: string;
  /** Foreground and background as composited sRGB hex, and their WCAG ratio. */
  fg: string;
  bg: string;
  ratio: number;
}
interface Row extends Sample {
  name: string;
  kind: Kind;
  /** Contrast threshold when the row is a text pair or an essential indicator. */
  need?: number;
  /** The same reading with every `dark:` class on the page stripped (pre-SF-10 dark). */
  pre: Sample;
}

/** Runs in the page: colour parsing (canvas resolves oklch/oklab), compositing and contrast. */
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
  const hex = (c: Rgba, alpha = false) =>
    '#' +
    [...c.slice(0, 3), ...(alpha ? [c[3] * 255] : [])]
      .map((v) => Math.round(v).toString(16).padStart(2, '0'))
      .join('');
  /** The widest box-shadow ring (Tailwind's ring; narrower ones are offsets / inset rings). */
  const ringColour = (boxShadow: string): string | null =>
    Array.from(boxShadow.matchAll(/((?:rgba?|oklab|oklch|color)\([^)]*\))\s+0px 0px 0px (\d+)px/g))
      .filter((m) => Number(m[2]) > 0)
      .sort((p, q) => Number(q[2]) - Number(p[2]))[0]?.[1] ?? null;
  const sample = (el: Element, kind: string) => {
    const cs = getComputedStyle(el);
    const parentBg = bgOf(el.parentElement ?? el);
    const ownBg = bgOf(el);
    if (kind === 'text') {
      const fg = over(rgba(cs.color), ownBg);
      return {
        value: hex(rgba(cs.color), true),
        fg: hex(fg),
        bg: hex(ownBg),
        ratio: ratio(fg, ownBg),
      };
    }
    if (kind === 'border') {
      const fg = over(rgba(cs.borderTopColor), parentBg);
      return {
        value: hex(rgba(cs.borderTopColor), true),
        fg: hex(fg),
        bg: hex(parentBg),
        ratio: ratio(fg, parentBg),
      };
    }
    if (kind === 'fill') {
      return {
        value: hex(rgba(cs.backgroundColor), true),
        fg: hex(ownBg),
        bg: hex(parentBg),
        ratio: ratio(ownBg, parentBg),
      };
    }
    const ring = ringColour(cs.boxShadow);
    const fg = ring ? over(rgba(ring), parentBg) : parentBg;
    return {
      value: ring ? hex(rgba(ring), true) : 'none',
      fg: hex(fg),
      bg: hex(parentBg),
      ratio: ratio(fg, parentBg),
    };
  };
  /** Runs `read` with every `dark:` class on the page removed, then puts them back. */
  const withoutDarkClasses = <T>(read: () => T): T => {
    const stripped = Array.from(document.querySelectorAll('[class*="dark:"]')).map((e) => {
      const cls = Array.from(e.classList).filter((c) => c.startsWith('dark:'));
      cls.forEach((c) => e.classList.remove(c));
      return [e, cls] as const;
    });
    try {
      return read();
    } finally {
      stripped.forEach(([e, cls]) => cls.forEach((c) => e.classList.add(c)));
    }
  };
  return { rgba, over, bgOf, lum, ratio, hex, sample, withoutDarkClasses };
}
type Helpers = ReturnType<typeof pageHelpers>;
const HELPERS = pageHelpers.toString();

async function measure(loc: Locator, name: string, kind: Kind, need?: number): Promise<Row> {
  await loc.waitFor();
  const [after, pre] = await loc.evaluate(
    (el, a) => {
      const h = new Function(`return (${a.src})()`)() as Helpers;
      return [h.sample(el, a.kind), h.withoutDarkClasses(() => h.sample(el, a.kind))];
    },
    { kind, src: HELPERS }
  );
  return { name, kind, need, ...after, pre };
}

const isDark = (page: Page): Promise<boolean> =>
  page.evaluate(() => document.documentElement.classList.contains('dark'));

async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  if ((await isDark(page)) !== (theme === 'dark')) await page.getByTestId('theme-toggle').click();
  expect(await isDark(page), `html.dark after switching to ${theme}`).toBe(theme === 'dark');
}

async function openApp(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.setViewportSize({ width: 1400, height: 1400 });
  // Read settled colours, not mid-transition ones (Checkbox has transition-shadow, cards fade).
  await page.addInitScript(() =>
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style');
      s.textContent = '*, *::before, *::after { transition: none !important; }';
      document.head.append(s);
    })
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
  await page.waitForTimeout(300);
}

async function shot(page: Page, name: string): Promise<void> {
  if (!evidenceDir) return;
  mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({ path: join(evidenceDir, `sf10-${name}.png`) });
}

const banner = (page: Page) =>
  page.getByRole('alert').filter({ hasText: 'Connection timeout after 10000ms' }).first();

async function measureBanner(page: Page): Promise<Row[]> {
  await go(page, 'Network Management');
  const b = banner(page);
  const btn = b.getByRole('button', { name: /settings/i });
  await page.mouse.move(0, 0);
  const rows = [
    await measure(b, 'R1 banner surface', 'fill'),
    await measure(b.locator(':scope > svg'), 'R2 banner icon', 'text', 3),
    await measure(b.locator('h5'), 'R3 banner title', 'text', 4.5),
    await measure(b.locator(':scope > div').first(), 'R4 banner description', 'text', 4.5),
    await measure(btn, 'R5 settings button label (rest)', 'text', 4.5),
    await measure(b, 'R6 banner border', 'border'),
  ];
  await btn.hover();
  rows.push(await measure(btn, 'R5 settings button label (hover)', 'text', 4.5));
  await page.mouse.move(0, 0);
  return rows;
}

async function measureLibrary(page: Page): Promise<Row[]> {
  const rows = await measureBanner(page);

  await go(page, 'Alert', 'Feedback');
  const alert = (text: string) => page.getByRole('alert').filter({ hasText: text }).first();
  rows.push(
    await measure(alert('Something went wrong.'), 'R6 Alert destructive border', 'border'),
    await measure(alert('Operation completed successfully.'), 'R7 Alert success border', 'border')
  );

  await go(page, 'Progress', 'Layout');
  const track = page.getByRole('progressbar').first();
  rows.push(
    await measure(track, 'R8 Progress track', 'fill'),
    await measure(track.locator(':scope > div'), 'R8 Progress indicator on track', 'fill', 3)
  );

  await go(page, 'Checkbox', 'Inputs');
  const cb = page.locator('#required-checkbox');
  await cb.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab'); // focus-visible
  rows.push(await measure(cb, 'R9 invalid Checkbox focus ring', 'ring'));

  await go(page, 'Textarea', 'Inputs');
  await page.locator('#error').focus();
  rows.push(await measure(page.locator('#error'), 'R11 invalid Textarea focus ring', 'ring'));
  await page.locator('#basic').focus();
  rows.push(await measure(page.locator('#basic'), 'valid Textarea focus ring', 'ring'));
  return rows;
}

/**
 * Dark values each revived class sets (Tailwind v4 palette, or the dark token it names). R5 has no
 * `dark:` class after SF-10, so its label stays white on the light theme's fill. Colours with alpha
 * go through the canvas's premultiplied storage, so their RGB reads a step off the palette value
 * (red-950 #460809 at 20% reads #460a0a33; dark --destructive #82181a at 40% reads #82191966).
 */
const DARK: Record<string, string> = {
  'R1 banner surface': '#460a0a33', // red-950 / 20%
  'R2 banner icon': '#ff6467ff', // red-400
  'R3 banner title': '#ffe2e2ff', // red-100
  'R4 banner description': '#ffc9c9ff', // red-200
  'R5 settings button label (rest)': '#ffffffff',
  'R5 settings button label (hover)': '#ffffffff',
  'R6 banner border': '#82181aff', // dark --destructive
  'R6 Alert destructive border': '#82181aff',
  'R7 Alert success border': '#00c950ff', // green-500
  'R8 Progress track': '#1e2939ff', // gray-800
  'R8 Progress indicator on track': '#8398ffff', // dark --primary (unchanged; the track moved)
  'R9 invalid Checkbox focus ring': '#82191966', // dark --destructive / 40%
  'R11 invalid Textarea focus ring': '#82191966',
};

/**
 * Light computed values before SF-10, recorded on a baseline build (the 005 variant line and the 005
 * banner classes, served through a mutant Vite config; nothing else in the SF-10 diff renders).
 */
const LIGHT: Record<string, string> = {
  'R1 banner surface': '#fef2f2ff',
  'R2 banner icon': '#e7000bff',
  'R3 banner title': '#82181aff',
  'R4 banner description': '#9f0712ff',
  'R5 settings button label (rest)': '#ffffffff',
  'R6 banner border': '#fb2c3680',
  'R5 settings button label (hover)': '#ffffffff',
  'R6 Alert destructive border': '#e7000a80',
  'R7 Alert success border': '#00c75080',
  'R8 Progress track': '#f3f4f6ff',
  'R8 Progress indicator on track': '#5056faff',
  'R9 invalid Checkbox focus ring': '#e6000a33',
  'R11 invalid Textarea focus ring': '#e6000a33',
  'valid Textarea focus ring': '#a1a1a1ff',
};

const byName = (rows: Row[], pick: (r: Row) => string) =>
  Object.fromEntries(rows.map((r) => [r.name, pick(r)]));

/** D-3: a pair that met its threshold before the revival still meets it. */
const regressions = (rows: Row[]) =>
  rows
    .filter((r) => r.need && r.pre.ratio >= r.need && r.ratio < r.need)
    .map((r) => `${r.name}: ${r.pre.ratio} → ${r.ratio} (need ${r.need})`);

test('SF-10 scenario 1 (INV-4, INV-10, INV-11, R2): each library dark: class shows its dark value in dark', async ({
  page,
}) => {
  await openApp(page, 'dark');
  const rows = await measureLibrary(page);
  record('libraryDark', rows);
  await shot(page, 'dark-textarea');

  const revived = rows.filter((r) => r.name in DARK);
  expect(
    byName(revived, (r) => r.value),
    'dark value of each revived class'
  ).toEqual(Object.fromEntries(revived.map((r) => [r.name, DARK[r.name]])));
  // The class is what moved the value: with dark: classes stripped it differs. R5 has no dark:
  // class left, and the indicator has none of its own (its track moved), so they are checked below.
  const own = revived.filter((r) => !r.name.startsWith('R5') && !r.name.includes('indicator'));
  const unmoved = own.filter((r) => r.value === r.pre.value);
  expect(
    unmoved.map((r) => r.name),
    'revived rows whose value equals pre-SF-10 dark'
  ).toEqual([]);
  expect(regressions(rows), 'INV-11 contrast regressions').toEqual([]);

  const r = Object.fromEntries(rows.map((x) => [x.name, x]));
  for (const k of ['R5 settings button label (rest)', 'R5 settings button label (hover)'])
    expect(r[k].bg, `INV-10 ${k}: same fill as without dark: classes`).toBe(r[k].pre.bg);
  expect(r['R8 Progress indicator on track'].ratio).toBeGreaterThan(
    r['R8 Progress indicator on track'].pre.ratio
  );
  expect(r['R2 banner icon'].ratio, 'R2 icon on the dark banner surface').toBeGreaterThanOrEqual(3);
  expect(r['R5 settings button label (rest)'].ratio, 'INV-10 rest').toBeGreaterThanOrEqual(4.5);
  expect(r['R5 settings button label (hover)'].ratio, 'INV-10 hover').toBeGreaterThanOrEqual(4.5);
  // INV-11 (c): no light surface left on the dark page.
  expect(r['R1 banner surface'].ratio, 'banner surface vs page').toBeLessThan(1.5);
  expect(r['R8 Progress track'].ratio, 'progress track vs page').toBeLessThan(1.5);
  // The invalid ring is state-driven: a valid field's ring is not the destructive one.
  expect(r['valid Textarea focus ring'].value).not.toBe(DARK['R11 invalid Textarea focus ring']);
});

test('SF-10 scenario 3 (INV-3, INV-10): light computed colours are unchanged', async ({ page }) => {
  await openApp(page, 'light');
  const rows = await measureLibrary(page);
  record('libraryLight', rows);
  expect(
    byName(rows, (r) => r.value),
    'light value of each swept element'
  ).toEqual(LIGHT);
  // In light no dark: class applies: stripping them changes nothing.
  const leaked = rows.filter((r) => r.value !== r.pre.value).map((r) => r.name);
  expect(leaked, 'rows a dark: class changed in light').toEqual([]);
  const r = Object.fromEntries(rows.map((x) => [x.name, x]));
  expect(r['R5 settings button label (rest)'].ratio, 'INV-10 rest').toBeGreaterThanOrEqual(4.5);
  expect(r['R5 settings button label (hover)'].ratio, 'INV-10 hover').toBeGreaterThanOrEqual(4.5);
});

test('SF-10 INV-9: theme switches apply and undo dark values live, both directions', async ({
  page,
}) => {
  await openApp(page, 'light');
  const light = byName(await measureBanner(page), (r) => r.value);
  await setTheme(page, 'dark');
  const dark = byName(await measureBanner(page), (r) => r.value);
  await setTheme(page, 'light');
  const back = byName(await measureBanner(page), (r) => r.value);
  await setTheme(page, 'dark');
  const again = byName(await measureBanner(page), (r) => r.value);
  record('roundTrip', { light, dark, back, again });

  expect(dark['R1 banner surface']).toBe(DARK['R1 banner surface']);
  expect(dark['R2 banner icon']).toBe(DARK['R2 banner icon']);
  expect(light['R1 banner surface']).toBe(LIGHT['R1 banner surface']);
  expect(back, 'light again without a reload').toEqual(light);
  expect(again, 'dark again without a reload').toEqual(dark);
});

test('SF-10 INV-9: the dark invalid ring follows aria-invalid (Switch, R10)', async ({ page }) => {
  await openApp(page, 'dark');
  await go(page, 'Switch', 'Inputs');
  const sw = page.locator('#switch-notifications');
  const focusVisible = async () => {
    await sw.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
  };
  await focusVisible();
  const valid = await measure(sw, 'valid Switch focus ring', 'ring');
  await sw.evaluate((el) => el.setAttribute('aria-invalid', 'true'));
  await focusVisible();
  const invalid = await measure(sw, 'R10 invalid Switch focus ring', 'ring');
  await sw.evaluate((el) => el.removeAttribute('aria-invalid'));
  await focusVisible();
  const validAgain = await measure(sw, 'valid Switch focus ring, again', 'ring');
  record('switchRing', [valid, invalid, validAgain]);

  expect(invalid.value, 'R10 has the same dark ring as R9').toBe(
    DARK['R9 invalid Checkbox focus ring']
  );
  expect(invalid.value).not.toBe(invalid.pre.value);
  expect(valid.value).not.toBe(invalid.value);
  expect(validAgain.value).toBe(valid.value);
});

test('SF-10 INV-1, INV-2: dark on a non-root element applies on and under it only; overrides still win', async ({
  page,
}) => {
  await openApp(page, 'light');
  await go(page, 'Alert', 'Feedback');
  const success = page.getByRole('alert').filter({ hasText: 'Operation completed successfully.' });
  const destructive = page.getByRole('alert').filter({ hasText: 'Something went wrong.' });
  const lightSuccess = await measure(success, 'success border, light', 'border');
  const lightDestructive = await measure(destructive, 'destructive border, light', 'border');

  // Self: the element carrying `dark`.
  await success.evaluate((el) => el.classList.add('dark'));
  const self = await measure(success, 'success border, dark on itself', 'border');
  await success.evaluate((el) => el.classList.remove('dark'));

  // Descendant: `dark` on a wrapper that holds the success alert but not the destructive one.
  const holder = await success.evaluateHandle((el) => {
    const w = document.createElement('div');
    w.className = 'dark';
    el.before(w);
    w.append(el);
    return w;
  });
  const inside = await measure(success, 'success border, under .dark', 'border');
  const outside = await measure(destructive, 'destructive border, beside .dark', 'border');
  const htmlDark = await isDark(page);

  // INV-2: a same-layer single-class rule loaded after Tailwind beats the dark: utility, as in light.
  await page.addStyleTag({
    content: '@layer utilities { .sf10-override { border-color: rgb(1, 2, 3); } }',
  });
  await success.evaluate((el) => el.classList.add('sf10-override'));
  const overridden = await measure(success, 'success border, override under .dark', 'border');
  await holder.dispose();
  record('nonRootDark', { lightSuccess, lightDestructive, self, inside, outside, overridden });

  expect(htmlDark, 'html stays light').toBe(false);
  expect(self.value, 'dark: applies on the .dark element').toBe(DARK['R7 Alert success border']);
  expect(inside.value, 'dark: applies under the .dark element').toBe(
    DARK['R7 Alert success border']
  );
  expect(outside.value, 'dark: does not apply beside it').toBe(lightDestructive.value);
  expect(lightSuccess.value).not.toBe(DARK['R7 Alert success border']);
  expect(overridden.value, 'consumer override beats dark: by order').toBe('#010203ff');
});

/**
 * Example-app `dark:` classes that never take effect, with the reason. An icon directly inside an
 * `Alert` gets its colour from the Alert's `[&>svg]:text-foreground` (0-1-1), which beats a
 * single-class utility on the icon (the same mechanism as the banner's R2). The icon is still light
 * on the revived dark surface (1.04:1 before, 17.87:1 after), so it is logged, not fixed.
 */
const DEAD_IN_DARK = [/^Wallet Connect \/ (Learn|Config): svg "" \[dark:text-blue-400\]$/];

/** Every element with an unconditional `dark:` colour class, and every text / icon under one. */
async function sweepPage(page: Page, label: string) {
  return page.evaluate(
    ({ src, label }) => {
      const h = new Function(`return (${src})()`)() as Helpers;
      const visible = (e: Element) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
      };
      const unconditional = (e: Element) =>
        Array.from(e.classList).filter((c) => /^dark:(bg|text|border)-[^:]+$/.test(c));
      const hosts = Array.from(document.querySelectorAll('[class*="dark:"]')).filter(
        (e) => visible(e) && unconditional(e).length
      );
      const style = (e: Element) => {
        const cs = getComputedStyle(e);
        return [cs.color, cs.backgroundColor, cs.borderTopColor].map((c) => h.hex(h.rgba(c), true));
      };
      const texts = new Set<Element>();
      for (const host of hosts)
        for (const e of [host, ...Array.from(host.querySelectorAll('*'))]) {
          const direct = Array.from(e.childNodes).some(
            (n) => n.nodeType === 3 && n.textContent!.trim()
          );
          if ((direct || e.tagName === 'svg') && visible(e)) texts.add(e);
        }
      const els = Array.from(texts);
      const read = () => ({
        hosts: hosts.map(style),
        texts: els.map((e) => h.sample(e, 'text')),
        surfaces: hosts.map((e) => h.lum(h.bgOf(e))),
      });
      const after = read();
      const pre = h.withoutDarkClasses(read);
      const describe = (e: Element) =>
        `${e.tagName.toLowerCase()} "${(e.textContent ?? '').trim().slice(0, 40)}"`;
      return {
        hosts: hosts.map((e, i) => ({
          page: label,
          element: describe(e),
          classes: unconditional(e).join(' '),
          changed: after.hosts[i].some((v, k) => v !== pre.hosts[i][k]),
          darkBg: unconditional(e).some((c) => c.startsWith('dark:bg-')),
          surfaceLuminance: +after.surfaces[i].toFixed(3),
        })),
        texts: els.map((e, i) => ({
          page: label,
          element: (e.tagName === 'svg' ? '[icon] ' : '') + describe(e),
          need: e.tagName === 'svg' ? 3 : 4.5,
          pre: pre.texts[i],
          after: after.texts[i],
        })),
      };
    },
    { src: HELPERS, label }
  );
}

test('SF-10 scenario 4 (INV-4, INV-11): every example-app page with dark: classes shows its dark style', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await openApp(page, 'dark');
  const hosts: Awaited<ReturnType<typeof sweepPage>>['hosts'] = [];
  const texts: Awaited<ReturnType<typeof sweepPage>>['texts'] = [];
  const visit = async (label: string) => {
    const r = await sweepPage(page, label);
    hosts.push(...r.hosts);
    texts.push(...r.texts);
  };
  const pages = [
    'Overview',
    'Architecture',
    'Type Mapping',
    'Form Renderer',
    'Network Management',
    'Contract Interactions',
    'Name Resolution',
  ];
  for (const label of pages) {
    await go(page, label);
    await page.waitForTimeout(1500);
    await visit(label);
  }
  // Tabs render only when selected: the prop tables are under Customize, the kit notes under Config.
  await go(page, 'Wallet Connect');
  await page.waitForTimeout(1500);
  for (const tab of ['Learn', 'Customize', 'Config', 'Status']) {
    await page.getByRole('tab', { name: tab }).click();
    await page.waitForTimeout(500);
    await visit(`Wallet Connect / ${tab}`);
    if (tab === 'Customize') await shot(page, 'dark-wallet-customize');
  }
  record('app', { hosts, texts });

  const seen = (re: RegExp) => hosts.some((h) => re.test(`${h.page} ${h.element} ${h.classes}`));
  expect(seen(/Customize .*dark:text-blue-400/), 'Wallet prop-table cells swept').toBe(true);
  expect(seen(/Name Resolution .*dark:text-amber-300/), 'network requirement hint swept').toBe(
    true
  );
  expect(seen(/Network Management .*dark:bg-red-950/), 'error banner swept').toBe(true);

  expect(
    hosts
      .filter((h) => !h.changed)
      .map((h) => `${h.page}: ${h.element} [${h.classes}]`)
      .filter((h) => !DEAD_IN_DARK.some((re) => re.test(h))),
    'dark: hosts that look the same as before'
  ).toEqual([]);
  expect(
    hosts
      .filter((h) => h.darkBg && h.surfaceLuminance > 0.2)
      .map((h) => `${h.page}: ${h.element} L=${h.surfaceLuminance}`),
    'light surfaces left on the dark page'
  ).toEqual([]);
  expect(
    texts
      .filter((t) => t.pre.ratio >= t.need && t.after.ratio < t.need)
      .map((t) => `${t.page}: ${t.element} ${t.pre.ratio} → ${t.after.ratio}`),
    'INV-11 contrast regressions in the example app'
  ).toEqual([]);
});
