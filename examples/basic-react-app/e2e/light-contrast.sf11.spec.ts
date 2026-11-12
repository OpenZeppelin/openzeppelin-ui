/**
 * 006 SF-11 (prove-it-works): the light theme meets WCAG AA on unchecked control borders, focus
 * indicators and muted text, in the running example app (Chromium), and nothing in dark gets worse.
 *
 * - INV-1: light `--muted-foreground` and `--ring` compute to #6c6c6c on real elements.
 * - INV-2: muted text ≥ 4.5:1 (card descriptions at rest, checked and hovered; the network-type chip;
 *   every light surface token, including the primary/5 and primary/10 tints).
 * - INV-3: unchecked Checkbox, default radio, card radio border and dot ring, and multi-select option
 *   checkbox borders ≥ 3:1 at rest, hovered, checked-card and active-row.
 * - INV-4 / INV-5: each focus indicator is ≥ 3:1 and only styles that differ from rest count, so a
 *   focus border the same colour as the resting border doesn't (the Checkbox case).
 * - INV-6: checked, selected, invalid state colours still win over the plain border.
 * - INV-11: checking and unchecking by pointer and keyboard, and light → dark → light without reload.
 * - INV-12: in dark every measured row is at or above its SF-10 / SF-34 stored value.
 * - INV-14: axe `color-contrast` in light flags none of the elements above.
 *
 * Set SF11_EVIDENCE_DIR to write `sf11-light-readout.json` (INV-16) and screenshots. Border rows
 * take the worse of the surface outside and the control's own fill; `outer` keeps SF-34's method.
 * Set SF11_MUTANT to inject a regression through CSS (no source edit) and watch the spec fail:
 *   halo       — Checkbox focus ring back at 50% (the 2.04:1 halo INV-5 forbids)
 *   oldBorders — the four controls' unchecked borders back on `--input`
 *   oldTokens  — light `--muted-foreground` / `--ring` back to their 005 values, i.e. new
 *                ui-components with an old ui-styles (INV-10: the INV-3 test must still pass)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { expect, test, type Locator, type Page } from 'playwright/test';

const evidenceDir = process.env.SF11_EVIDENCE_DIR;
const mutant = process.env.SF11_MUTANT ?? '';
const axeSource = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const evidence: Record<string, unknown> = {};

const MUTANT_CSS: Record<string, string> = {
  halo: `[data-slot="checkbox"]:not([aria-invalid="true"]):focus-visible { --tw-ring-color: color-mix(in oklab, var(--ring) 50%, transparent) !important; }`,
  oldBorders: `[data-slot="checkbox"][data-state="unchecked"]:not([aria-invalid="true"]):not(:focus-visible),
    [role="radio"]:not([data-variant])[data-state="unchecked"],
    [data-variant="card"][data-state="unchecked"], [data-variant="card"] > span:first-child,
    [role="option"] span[aria-hidden="true"]:not([class*="bg-selected"]) { border-color: var(--input) !important; }`,
  oldTokens: `:root:not(.dark) { --muted-foreground: oklch(0.556 0 0) !important; --ring: oklch(0.708 0 0) !important; }`,
};

/** #6c6c6c: light `--muted-foreground` and `--ring`, oklch(0.53 0 0). */
const SF11_GREY = '#6c6c6c';

// ---------------------------------------------------------------------------------------------
// In-page helpers (canvas resolves oklch / oklab / color-mix to sRGB), as in SF-34's spec
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
  /** Box-shadow rings with a spread, in paint order (offset ring first). */
  const rings = (cs: CSSStyleDeclaration) =>
    Array.from(
      cs.boxShadow.matchAll(/((?:rgba?|oklab|oklch|color)\([^)]*\))\s+0px 0px 0px (\d+)px/g)
    )
      .filter((m) => Number(m[2]) > 0)
      .map((m) => ({ color: m[1], spread: Number(m[2]) }));
  /** Everything that can draw a focus indicator, as raw computed strings. */
  const indicatorState = (el: Element) => {
    const cs = getComputedStyle(el);
    return {
      rings: rings(cs).map((r) => `${r.color} ${r.spread}`),
      outline:
        cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0
          ? `${cs.outlineColor} ${cs.outlineWidth}`
          : '',
      border: cs.borderTopColor,
    };
  };
  return { rgba, over, bgOf, ratio, hex, hex8, rings, indicatorState };
}

type Helpers = ReturnType<typeof pageHelpers>;
const HELPERS = pageHelpers.toString();

type Kind = 'text' | 'border' | 'fill';
interface Row {
  name: string;
  kind: Kind | 'focus';
  fg: string;
  bg: string;
  ratio: number;
  need: number;
  /** Borders: the ratio against the outside surface only (SF-34's method, for its stored floors). */
  outer?: number;
  /** Raw computed colour with alpha (#rrggbbaa), before compositing. */
  raw?: string;
  /** Focus rows: which style counted as the indicator, and the ones that matched rest. */
  indicator?: string;
  ignored?: string[];
}

async function read(loc: Locator, name: string, kind: Kind, need?: number): Promise<Row> {
  await loc.scrollIntoViewIfNeeded();
  return loc.evaluate(
    (el, a) => {
      const h = new Function(`return (${a.src})()`)() as Helpers;
      const cs = getComputedStyle(el);
      const parentBg = h.bgOf(el.parentElement ?? el);
      const ownBg = h.bgOf(el);
      if (a.kind === 'text') {
        const fg = h.over(h.rgba(cs.color), ownBg);
        const n = a.need ?? 4.5;
        return {
          name: a.name,
          kind: a.kind,
          fg: h.hex(fg),
          bg: h.hex(ownBg),
          ratio: h.ratio(fg, ownBg),
          need: n,
          raw: h.hex8(h.rgba(cs.color)),
        };
      }
      if (a.kind === 'fill')
        return {
          name: a.name,
          kind: a.kind,
          fg: h.hex(ownBg),
          bg: h.hex(parentBg),
          ratio: h.ratio(ownBg, parentBg),
          need: a.need ?? 3,
        };
      // A border sits between the surface outside it and the control's own fill (a hovered card's
      // accent): measure against both and keep the worse.
      const fg = h.over(h.rgba(cs.borderTopColor), parentBg);
      const [bg, r] = [parentBg, ownBg]
        .map((b) => [b, h.ratio(h.over(h.rgba(cs.borderTopColor), b), b)] as const)
        .sort((p, q) => p[1] - q[1])[0]!;
      return {
        name: a.name,
        kind: a.kind,
        fg: h.hex(fg),
        bg: h.hex(bg),
        ratio: r,
        outer: h.ratio(fg, parentBg),
        need: a.need ?? 3,
        raw: h.hex8(h.rgba(cs.borderTopColor)),
      };
    },
    { name, kind, need, src: HELPERS }
  );
}

type IndicatorState = ReturnType<Helpers['indicatorState']>;

async function indicatorState(loc: Locator): Promise<IndicatorState> {
  return loc.evaluate(
    (el, src) => (new Function(`return (${src})()`)() as Helpers).indicatorState(el),
    HELPERS
  );
}

/**
 * INV-5's rule: the best of ring, outline and border **among the styles that changed from rest**,
 * measured against the surface the control sits on. A style equal to its resting value doesn't count.
 */
async function readFocus(loc: Locator, rest: IndicatorState, name: string): Promise<Row> {
  return loc.evaluate(
    (el, a) => {
      const h = new Function(`return (${a.src})()`)() as Helpers;
      const cs = getComputedStyle(el);
      const surface = h.bgOf(el.parentElement ?? el);
      const now = h.indicatorState(el);
      const candidates: { kind: string; color: string }[] = [];
      const ignored: string[] = [];
      h.rings(cs).forEach((r, i) => {
        if (a.rest.rings.includes(now.rings[i]!)) ignored.push(`ring ${now.rings[i]}`);
        else candidates.push({ kind: `ring ${r.spread}px`, color: r.color });
      });
      if (now.outline && now.outline !== a.rest.outline)
        candidates.push({ kind: 'outline', color: cs.outlineColor });
      if (now.border !== a.rest.border) candidates.push({ kind: 'border', color: now.border });
      else ignored.push(`border ${now.border} (same as rest)`);
      const scored = candidates
        .map((c) => {
          const fg = h.over(h.rgba(c.color), surface);
          return { ...c, fg, ratio: h.ratio(fg, surface), raw: h.hex8(h.rgba(c.color)) };
        })
        .sort((p, q) => q.ratio - p.ratio);
      const best = scored[0];
      return {
        name: a.name,
        kind: 'focus' as const,
        fg: best ? h.hex(best.fg) : h.hex(surface),
        bg: h.hex(surface),
        ratio: best ? best.ratio : 1,
        need: 3,
        raw: best?.raw,
        indicator: best?.kind ?? 'none',
        ignored,
      };
    },
    { rest, name, src: HELPERS }
  );
}

/** Rest reading, then keyboard focus (Shift+Tab, Tab so `:focus-visible` applies), then the focus row. */
async function focusRow(page: Page, loc: Locator, name: string): Promise<Row> {
  await loc.scrollIntoViewIfNeeded();
  await page.mouse.click(2, 2);
  const rest = await indicatorState(loc);
  await loc.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(loc).toBeFocused();
  return readFocus(loc, rest, name);
}

/**
 * Radix moves focus (and so selection) in a timeout after keydown and ignores it if keyup already
 * fired, so hold the key until the radio is checked, as a real press would (see SF-23's tests).
 */
async function arrow(page: Page, key: 'ArrowUp' | 'ArrowDown', becomesChecked: Locator) {
  await page.keyboard.down(key);
  try {
    await expect(becomesChecked).toHaveAttribute('data-state', 'checked');
  } finally {
    await page.keyboard.up(key);
  }
}

/** Resolved token colours from a probe element (hex of the computed sRGB). */
async function tokens(page: Page, names: string[]): Promise<Record<string, string>> {
  return page.evaluate(
    (a) => {
      const h = new Function(`return (${a.src})()`)() as Helpers;
      const probe = document.createElement('div');
      document.body.append(probe);
      const out = Object.fromEntries(
        a.names.map((n) => {
          probe.style.color = `var(${n})`;
          return [n, h.hex(h.rgba(getComputedStyle(probe).color))];
        })
      );
      probe.remove();
      return out;
    },
    { names, src: HELPERS }
  );
}

// ---------------------------------------------------------------------------------------------
// App navigation
// ---------------------------------------------------------------------------------------------

const isDark = (page: Page): Promise<boolean> =>
  page.evaluate(() => document.documentElement.classList.contains('dark'));

async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  if ((await isDark(page)) !== (theme === 'dark')) await page.getByTestId('theme-toggle').click();
  await expect
    .poll(() => isDark(page), `html.dark after switching to ${theme}`)
    .toBe(theme === 'dark');
}

async function openApp(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.setViewportSize({ width: 1400, height: 1400 });
  const css = [
    // Read settled colours, not mid-transition ones (Checkbox transition-shadow, card fades).
    '*, *::before, *::after { transition: none !important; }',
    ...mutant
      .split(',')
      .filter(Boolean)
      .map((m) => {
        if (!MUTANT_CSS[m]) throw new Error(`unknown SF11_MUTANT ${m}`);
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
  await page.getByTestId('theme-toggle').waitFor({ timeout: 90_000 });
  await setTheme(page, theme);
}

async function go(page: Page, label: string, group?: string): Promise<void> {
  const item = page.getByText(label, { exact: true }).first();
  if (group && !(await item.isVisible().catch(() => false)))
    await page.getByRole('button', { name: group }).first().click();
  await item.click();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(200);
}

async function shot(page: Page, name: string): Promise<void> {
  if (!evidenceDir) return;
  mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({ path: join(evidenceDir, `sf11-${name}.png`) });
}

const productType = (page: Page) => page.getByRole('radiogroup', { name: 'Product type' });
const optionBox = (o: Locator) => o.locator('span[aria-hidden="true"]').first();

async function cardDescription(card: Locator): Promise<Locator> {
  return card.locator(`#${await card.getAttribute('aria-describedby')}`);
}

async function openMultiSelect(page: Page): Promise<Locator> {
  await page.locator('[data-slot="searchable-multi-select-trigger"]').first().click();
  const opts = page.getByRole('option');
  await opts.first().waitFor();
  return opts;
}

// ---------------------------------------------------------------------------------------------
// Measurements shared by the light and dark passes
// ---------------------------------------------------------------------------------------------

/** INV-2, INV-3, INV-4/5 rows for one theme. Names are stable: the readout and floors key on them. */
async function measureAll(page: Page, theme: 'light' | 'dark'): Promise<Row[]> {
  const rows: Row[] = [];

  await go(page, 'Checkbox', 'Inputs');
  rows.push(await read(page.locator('#unchecked'), 'Checkbox unchecked: border (K4)', 'border'));
  rows.push(
    await read(page.locator('#disabled-unchecked'), 'Checkbox disabled: border (exempt)', 'border')
  );
  rows.push(await focusRow(page, page.locator('#unchecked'), 'Checkbox: focus indicator'));
  await shot(page, `${theme}-checkbox-focused`);

  await go(page, 'RadioGroup', 'Inputs');
  rows.push(await read(page.locator('#another'), 'Default radio unchecked: border (K1)', 'border'));
  rows.push(
    await read(page.locator('#disabled'), 'Default radio disabled: border (exempt)', 'border')
  );
  // Radix roving focus: Tab lands on the group's checked item.
  rows.push(await focusRow(page, page.locator('#enabled'), 'Default radio: focus indicator'));

  const group = productType(page);
  await group.scrollIntoViewIfNeeded();
  const spot = group.getByRole('radio', { name: 'Spot' });
  const futures = group.getByRole('radio', { name: 'Futures' });
  const options = group.getByRole('radio', { name: 'Options' });
  await spot.click();
  await page.mouse.move(0, 0);
  rows.push(
    await read(futures, 'Card unchecked: border (K2)', 'border'),
    await read(futures.locator('xpath=./span[1]'), 'Card unchecked: dot ring (K3)', 'border'),
    await read(await cardDescription(futures), 'Card unchecked: description', 'text'),
    await read(spot, 'Card checked: border (state wins)', 'border'),
    await read(spot.locator('xpath=./span[1]'), 'Card checked: dot ring (K3)', 'border'),
    await read(await cardDescription(spot), 'Card checked: description', 'text'),
    await read(options, 'Card disabled: border (exempt)', 'border')
  );
  await futures.hover();
  rows.push(
    await read(futures, 'Card unchecked hover: border (K2)', 'border'),
    await read(await cardDescription(futures), 'Card unchecked hover: description', 'text')
  );
  await page.mouse.move(0, 0);
  // Radix roving focus lands keyboard focus on the checked card.
  rows.push(await focusRow(page, spot, 'Card radio: focus indicator'));
  await shot(page, `${theme}-radio-card-focused`);

  await go(page, 'Input', 'Inputs');
  rows.push(await focusRow(page, page.locator('#email'), 'Input: focus indicator'));

  await go(page, 'Textarea', 'Inputs');
  rows.push(await focusRow(page, page.locator('#basic'), 'Textarea: focus indicator'));

  await go(page, 'Button', 'Inputs');
  const main = page.locator('main');
  rows.push(
    await focusRow(
      page,
      main.getByRole('button', { name: 'Default', exact: true }).first(),
      'Button default: focus indicator'
    ),
    await focusRow(
      page,
      main.getByRole('button', { name: 'Outline', exact: true }).first(),
      'Button outline: focus indicator'
    )
  );

  await go(page, 'SearchableMultiSelect', 'Inputs');
  const opts = await openMultiSelect(page);
  await opts.nth(3).hover();
  rows.push(
    await read(optionBox(opts.nth(2)), 'Multi-select unselected: checkbox border (K5)', 'border'),
    await read(optionBox(opts.nth(3)), 'Multi-select active: checkbox border (K5)', 'border')
  );
  await shot(page, `${theme}-multiselect`);
  await page.keyboard.press('Escape');

  await go(page, 'FormFields', 'Forms');
  const plan = page.getByRole('radiogroup', { name: 'Plan' }).last();
  await plan.getByRole('radio', { name: 'Team' }).click();
  await page.mouse.move(0, 0);
  const team = plan.getByRole('radio', { name: 'Team' });
  const starter = plan.getByRole('radio', { name: 'Starter' });
  rows.push(
    await read(await cardDescription(team), 'RadioField card checked: description', 'text'),
    await read(await cardDescription(starter), 'RadioField card unchecked: description', 'text'),
    await read(starter, 'RadioField card unchecked: border (K2)', 'border')
  );

  await go(page, 'Network Management');
  const chip = page.locator('main button[role="combobox"] span.uppercase.bg-muted').first();
  rows.push(await read(chip, 'NetworkSelector type chip: text (SF-8)', 'text'));
  return rows;
}

/** INV-2 / INV-4 token maths in the page: muted text and ring on every light surface token. */
async function surfaceRows(page: Page): Promise<Row[]> {
  return page.evaluate((src) => {
    const h = new Function(`return (${src})()`)() as Helpers;
    const probe = document.createElement('div');
    document.body.append(probe);
    const col = (v: string) => {
      probe.style.color = v;
      return h.rgba(getComputedStyle(probe).color);
    };
    const page = h.rgba(getComputedStyle(document.body).backgroundColor);
    const mix = (token: string, pct: number) =>
      `color-mix(in oklab, var(${token}) ${pct}%, transparent)`;
    const surfaces: [string, string][] = [
      ['background', 'var(--background)'],
      ['card', 'var(--card)'],
      ['popover', 'var(--popover)'],
      ['muted', 'var(--muted)'],
      ['accent', 'var(--accent)'],
      ['secondary', 'var(--secondary)'],
      ['sidebar', 'var(--sidebar)'],
      ['muted/50', mix('--muted', 50)],
      ['primary/5', mix('--primary', 5)],
      ['primary/10', mix('--primary', 10)],
    ];
    const rows = surfaces.flatMap(([name, value]) => {
      const s = h.over(col(value), page);
      return (
        [
          ['--muted-foreground', 'text', 4.5],
          ['--ring', 'ring', 3],
        ] as const
      ).map(([token, what, need]) => {
        const fg = h.over(col(`var(${token})`), s);
        return {
          name: `token ${token} on ${name}`,
          kind: (what === 'text' ? 'text' : 'border') as 'text' | 'border',
          fg: h.hex(fg),
          bg: h.hex(s),
          ratio: h.ratio(fg, s),
          need,
        };
      });
    });
    probe.remove();
    return rows;
  }, HELPERS);
}

const below = (rows: Row[]): string[] =>
  rows
    .filter((r) => !/exempt/.test(r.name) && r.ratio < r.need)
    .map((r) => `${r.name}: ${r.fg} on ${r.bg} = ${r.ratio} (need ${r.need})`);

const byName = (rows: Row[]): Record<string, Row> =>
  Object.fromEntries(rows.map((r) => [r.name, r]));

/** Adds to the readout file as each test finishes (a failing test restarts the worker). */
function record(key: string, value: unknown): void {
  evidence[key] = value;
  if (!evidenceDir) return;
  mkdirSync(evidenceDir, { recursive: true });
  const file = join(evidenceDir, 'sf11-light-readout.json');
  const prior = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as object) : {};
  writeFileSync(file, JSON.stringify({ ...prior, mutant: mutant || null, [key]: value }, null, 2));
}

// =============================================================================================

test('SF-11 INV-1, INV-2, INV-3, INV-4, INV-5: light elements meet AA', async ({ page }) => {
  test.setTimeout(240_000);
  await openApp(page, 'light');
  const t = await tokens(page, ['--muted-foreground', '--ring', '--primary', '--destructive']);
  const rows = await measureAll(page, 'light');
  const surfaces = await surfaceRows(page);
  record('lightTokens', t);
  record('light', rows);
  record('lightSurfaces', surfaces);
  const r = byName(rows);

  // INV-1: both tokens are #6c6c6c, and real elements show it.
  if (!mutant.includes('oldTokens')) {
    expect({ muted: t['--muted-foreground'], ring: t['--ring'] }).toEqual({
      muted: SF11_GREY,
      ring: SF11_GREY,
    });
    expect(r['Card unchecked: description']!.fg).toBe(SF11_GREY);
    expect(r['Card radio: focus indicator']!.fg).toBe(SF11_GREY);
  }

  // INV-2, INV-3, INV-4: every non-exempt row and every surface token meets its threshold.
  expect(below([...rows, ...surfaces]), 'light rows below AA').toEqual([]);

  // INV-3 boundary: a disabled control is exempt from the ratio but keeps the token colour.
  for (const name of [
    'Checkbox disabled: border (exempt)',
    'Default radio disabled: border (exempt)',
    'Card disabled: border (exempt)',
  ])
    expect(r[name]!.raw, name).toBe(`${t['--muted-foreground']}ff`);

  // INV-5: on Checkbox the focus border equals the resting border, so it doesn't count; the
  // indicator is the full-opacity ring, and there is no ring at rest.
  const cb = r['Checkbox: focus indicator']!;
  expect(
    cb.ignored?.some((s) => /^border .* \(same as rest\)$/.test(s)),
    cb.ignored?.join('; ')
  ).toBe(true);
  expect(cb.indicator).toMatch(/^ring /);
  expect(cb.ratio).toBeGreaterThanOrEqual(3);
});

test('SF-11 INV-3 (INV-10 pairing): unchecked borders ≥ 3:1 in light', async ({ page }) => {
  // Runs alone under SF11_MUTANT=oldTokens: new ui-components with an old ui-styles still pass.
  test.setTimeout(180_000);
  await openApp(page, 'light');
  const rows: Row[] = [];
  await go(page, 'Checkbox', 'Inputs');
  rows.push(await read(page.locator('#unchecked'), 'K4 Checkbox', 'border'));
  await go(page, 'RadioGroup', 'Inputs');
  rows.push(await read(page.locator('#another'), 'K1 default radio', 'border'));
  const group = productType(page);
  await group.getByRole('radio', { name: 'Spot' }).click();
  await page.mouse.move(0, 0);
  const futures = group.getByRole('radio', { name: 'Futures' });
  const spot = group.getByRole('radio', { name: 'Spot' });
  rows.push(
    await read(futures, 'K2 card border', 'border'),
    await read(futures.locator('xpath=./span[1]'), 'K3 dot ring, unchecked card', 'border'),
    await read(spot.locator('xpath=./span[1]'), 'K3 dot ring, checked card (primary/5)', 'border')
  );
  await futures.hover();
  rows.push(await read(futures, 'K2 card border, hover (accent)', 'border'));
  await go(page, 'SearchableMultiSelect', 'Inputs');
  const opts = await openMultiSelect(page);
  await opts.nth(3).hover();
  rows.push(
    await read(optionBox(opts.nth(2)), 'K5 option checkbox', 'border'),
    await read(optionBox(opts.nth(3)), 'K5 option checkbox, active row (accent)', 'border')
  );
  record(mutant ? `inv3-${mutant}` : 'inv3', rows);
  expect(below(rows), 'unchecked borders below 3:1').toEqual([]);
});

test('SF-11 INV-6: checked, selected and invalid state colours still win in light', async ({
  page,
}) => {
  await openApp(page, 'light');
  const t = await tokens(page, ['--primary', '--selected', '--destructive']);
  await go(page, 'Checkbox', 'Inputs');
  const checked = await read(page.locator('#checked'), 'Checkbox checked', 'border');
  const invalid = await read(page.locator('#required-checkbox'), 'Checkbox invalid', 'border');
  await go(page, 'RadioGroup', 'Inputs');
  const spot = productType(page).getByRole('radio', { name: 'Spot' });
  await spot.click();
  const card = await read(spot, 'Card checked', 'border');
  await go(page, 'SearchableMultiSelect', 'Inputs');
  const opts = await openMultiSelect(page);
  await opts.nth(1).click();
  const selected = await read(optionBox(opts.nth(1)), 'Option selected', 'border');
  record('stateWins', { tokens: t, checked, invalid, card, selected });
  expect(checked.raw).toBe(`${t['--selected']}ff`);
  expect(card.raw).toBe(`${t['--primary']}ff`);
  expect(selected.raw).toBe(`${t['--selected']}ff`);
  expect(invalid.raw).toBe(`${t['--destructive']}ff`);
  for (const row of [checked, invalid, card, selected]) expect(row.fg).not.toBe(SF11_GREY);
});

test('SF-11 INV-5: the invalid Checkbox keeps its destructive focus ring (SF-10 R9)', async ({
  page,
}) => {
  await openApp(page, 'light');
  await go(page, 'Checkbox', 'Inputs');
  const row = await focusRow(page, page.locator('#required-checkbox'), 'invalid Checkbox focus');
  record('invalidCheckboxFocus', row);
  // destructive / 20 (SF-10 LIGHT pin), not the grey ring.
  expect(row.raw).toBe('#e6000a33');
});

test('SF-11 INV-11: pointer and keyboard toggles return the border to muted-foreground', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await openApp(page, 'light');
  const t = await tokens(page, ['--muted-foreground', '--selected', '--primary']);
  const grey = `${t['--muted-foreground']}ff`;
  const trips: Record<string, string[]> = {};
  const raw = async (loc: Locator) => (await read(loc, 'trip', 'border')).raw!;

  await go(page, 'Checkbox', 'Inputs');
  const cb = page.locator('#gas-approve');
  await cb.scrollIntoViewIfNeeded();
  const ringsAtRest = (await indicatorState(cb)).rings;
  const cbTrip = [await raw(cb)];
  await cb.click();
  cbTrip.push(await raw(cb));
  await cb.click();
  cbTrip.push(await raw(cb));
  // Keyboard: Space checks; Tab away before reading, so the resting border is read, not the focus
  // border (`--ring`, which only matches muted-foreground because SF-11 gives them one value).
  await cb.press('Space');
  const ringsFocused = (await indicatorState(cb)).rings;
  await page.keyboard.press('Tab');
  await expect(cb).not.toBeFocused();
  const ringsAway = (await indicatorState(cb)).rings;
  cbTrip.push(await raw(cb));
  await cb.press('Space');
  await page.keyboard.press('Tab');
  cbTrip.push(await raw(cb));
  trips.checkbox = cbTrip;
  expect(cbTrip).toEqual([grey, `${t['--selected']}ff`, grey, `${t['--selected']}ff`, grey]);
  // Keyboard focus shows the ring; moving focus away removes it again.
  expect(ringsFocused).not.toEqual(ringsAtRest);
  expect(ringsAway).toEqual(ringsAtRest);

  await go(page, 'RadioGroup', 'Inputs');
  // The "enabled / disabled / another" group; the disabled item between them is skipped by arrows.
  const o1 = page.locator('#enabled');
  const o2 = page.locator('#another');
  await o2.click();
  await expect(o2).toHaveAttribute('data-state', 'checked');
  const radioTrip = [await raw(o1)];
  await o2.focus();
  await arrow(page, 'ArrowUp', o1); // keyboard: enabled checked, another back to unchecked
  radioTrip.push(await raw(o2));
  await o2.click(); // pointer: back again
  await expect(o2).toHaveAttribute('data-state', 'checked');
  radioTrip.push(await raw(o1));
  trips.defaultRadio = radioTrip;
  expect(radioTrip).toEqual([grey, grey, grey]);

  const group = productType(page);
  const spot = group.getByRole('radio', { name: 'Spot' });
  const futures = group.getByRole('radio', { name: 'Futures' });
  await spot.click();
  await futures.click();
  await page.mouse.move(0, 0);
  const cardTrip = [await raw(spot), await raw(futures)];
  await futures.focus();
  await arrow(page, 'ArrowUp', spot);
  await page.mouse.move(0, 0);
  cardTrip.push(await raw(futures), await raw(spot));
  trips.card = cardTrip;
  expect(cardTrip).toEqual([grey, `${t['--primary']}ff`, grey, `${t['--primary']}ff`]);

  await go(page, 'SearchableMultiSelect', 'Inputs');
  const opts = await openMultiSelect(page);
  const box = optionBox(opts.nth(2));
  const msTrip = [await raw(box)];
  await opts.nth(2).click();
  msTrip.push(await raw(box));
  await opts.nth(2).click();
  msTrip.push(await raw(box));
  // Keyboard: arrow onto the option from the search box, Enter toggles it on and off.
  const search = page.getByRole('combobox').last();
  await search.focus();
  for (let i = 0; i < 6 && (await opts.nth(2).getAttribute('data-active')) === null; i++)
    await search.press('ArrowDown');
  await expect(opts.nth(2)).toHaveAttribute('data-active', /.*/);
  await search.press('Enter');
  msTrip.push(await raw(box));
  await search.press('Enter');
  msTrip.push(await raw(box));
  trips.multiSelect = msTrip;
  expect(msTrip).toEqual([grey, `${t['--selected']}ff`, grey, `${t['--selected']}ff`, grey]);
  record('toggleTrips', trips);
});

test('SF-11 INV-11: light → dark → light without reload follows the token, no dark: class', async ({
  page,
}) => {
  await openApp(page, 'light');
  await go(page, 'RadioGroup', 'Inputs');
  const group = productType(page);
  await group.getByRole('radio', { name: 'Spot' }).click();
  await page.mouse.move(0, 0);
  const futures = group.getByRole('radio', { name: 'Futures' });
  const targets = {
    K1: page.locator('#another'),
    K2: futures,
    K3: futures.locator('xpath=./span[1]'),
  };
  const snap = async () =>
    Object.fromEntries(
      await Promise.all(
        Object.entries(targets).map(async ([k, l]) => [k, (await read(l, k, 'border')).raw!])
      )
    );
  const light = await snap();
  const lightToken = (await tokens(page, ['--muted-foreground']))['--muted-foreground'];
  await setTheme(page, 'dark');
  const dark = await snap();
  const darkToken = (await tokens(page, ['--muted-foreground']))['--muted-foreground'];
  await setTheme(page, 'light');
  const back = await snap();
  record('themeRoundTrip', { light, dark, back, lightToken, darkToken });
  expect(Object.values(light)).toEqual(Array(3).fill(`${lightToken}ff`));
  expect(Object.values(dark)).toEqual(Array(3).fill(`${darkToken}ff`));
  expect(darkToken).not.toBe(lightToken);
  expect(back).toEqual(light);
  // The colour comes from the token alone: none of the three carries a dark: border class.
  for (const l of Object.values(targets))
    expect(
      await l.evaluate((el) => /(^|\s)(dark:|\[\.dark_&\]:)\S*border/.test(el.className))
    ).toBe(false);
});

/**
 * Dark floors: the SF-10 / SF-34 stored values for the same elements (006 SF-10 proof,
 * `sf34-readout-storage.json` and `sf10-dark-readout.json`). Checkbox and default-radio borders had no
 * stored row; before SF-11 they drew dark `--input` (about 2.5:1), so their floor is set at 3.
 */
const DARK_FLOOR: Record<string, number> = {
  'Checkbox unchecked: border (K4)': 3,
  'Default radio unchecked: border (K1)': 3,
  'Card unchecked: border (K2)': 7.66,
  'Card unchecked: dot ring (K3)': 7.66,
  'Card unchecked: description': 7.66,
  'Card checked: border (state wins)': 7.45,
  'Card checked: dot ring (K3)': 7.27,
  'Card checked: description': 7.27,
  'Multi-select unselected: checkbox border (K5)': 7.66,
  'Multi-select active: checkbox border (K5)': 5.86,
  'Textarea: focus indicator': 2.53,
};

test('SF-11 INV-12: no dark ratio drops below its SF-10 / SF-34 value', async ({ page }) => {
  test.setTimeout(240_000);
  await openApp(page, 'dark');
  const rows = await measureAll(page, 'dark');
  record('dark', rows);
  const r = byName(rows);
  const drops = Object.entries(DARK_FLOOR)
    // Like-for-like with the stored readouts: borders against the outside surface (SF-34's method).
    .map(([name, floor]) => [name, floor, r[name]?.outer ?? r[name]?.ratio] as const)
    .filter(([, floor, ratio]) => !(ratio !== undefined && ratio >= floor))
    .map(([name, floor, ratio]) => `${name}: ${ratio} < ${floor}`);
  expect(drops, 'dark rows below their SF-10 / SF-34 values').toEqual([]);
});

test('SF-11 INV-14: axe color-contrast in light flags none of the SF-11 elements', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await openApp(page, 'light');
  const result: Record<string, { target: string; listed: boolean; summary: string }[]> = {};
  const demos: [string, string | undefined][] = [
    ['Checkbox', 'Inputs'],
    ['RadioGroup', 'Inputs'],
    ['SearchableMultiSelect', 'Inputs'],
    ['FormFields', 'Forms'],
    ['Network Management', undefined],
  ];
  for (const [label, groupName] of demos) {
    await go(page, label, groupName);
    if (label === 'SearchableMultiSelect') await openMultiSelect(page);
    await page.addScriptTag({ path: axeSource });
    result[label] = await page.evaluate(async () => {
      type AxeResult = {
        violations: { nodes: { target: string[]; failureSummary: string }[] }[];
      };
      const axe = (
        window as unknown as { axe: { run: (c: Element, o: object) => Promise<AxeResult> } }
      ).axe;
      const probe = document.createElement('div');
      probe.style.color = 'var(--muted-foreground)';
      document.body.append(probe);
      const muted = getComputedStyle(probe).color;
      probe.remove();
      const r = await axe.run(document.body, { runOnly: ['color-contrast'] });
      return r.violations.flatMap((v) =>
        v.nodes.map((n) => {
          const el = document.querySelector(n.target.join(' '));
          // Muted text counts when it renders at the token colour. A demo wrapper that fades its
          // content with `opacity-*` (RadioGroup's "Sepolia" row) is the page's choice, not the token.
          let faded = false;
          for (let e: Element | null = el; e; e = e.parentElement)
            if (parseFloat(getComputedStyle(e).opacity) < 1) faded = true;
          const listed =
            !!el &&
            (!!el.closest('[role="radio"], [data-slot="checkbox"], [role="option"]') ||
              (getComputedStyle(el).color === muted && !faded));
          return { target: n.target.join(' '), listed, summary: n.failureSummary };
        })
      );
    });
    if (label === 'SearchableMultiSelect') await page.keyboard.press('Escape');
  }
  record('axeLight', result);
  const listed = Object.entries(result).flatMap(([demo, nodes]) =>
    nodes.filter((n) => n.listed).map((n) => `${demo}: ${n.target} — ${n.summary}`)
  );
  expect(listed, 'axe color-contrast on SF-11 elements').toEqual([]);
});
