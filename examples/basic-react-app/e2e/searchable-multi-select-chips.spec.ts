/**
 * SearchableMultiSelect chips in the running example app (Chromium, real stylesheet), in light
 * and dark.
 *
 * - The "Chips" example (320px wide, eight picks): the chips wrap without widening the field,
 *   remove buttons are at least 24×24, chip text has 4.5:1 contrast on the chip fill, the
 *   remove icon and the keyboard focus ring 3:1; a keyboard removal never shows a frame with
 *   focus on <body>, moves focus to the next chip, announces, and updates the readout.
 * - The field demo: a keyboard removal in "Blocked countries" then submit gives a payload that
 *   matches the chips; removing that field's last chip focuses its own trigger, not the
 *   "Allowed countries" one above; Read-only drops every remove button and keeps the value.
 * - axe on both demos in every state reports no violation kind that the same page did not
 *   already report before chips existed, and no violation at all on a chips node.
 *
 * The axe baseline (`searchable-multi-select-chips.axe-baseline.271efee34.json`) was recorded
 * by running this file against the example app at `271efee34`, the commit this work branched
 * from, with `CHIPS_AXE_RECORD=<path>` set. Record mode only visits the states that existed
 * then. Rule ids are compared per state, not node counts: the chips example adds nodes to the
 * page, and axe skips contrast for nodes outside the viewport.
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { expect, test, type Locator, type Page } from 'playwright/test';

const require = createRequire(import.meta.url);
const axeSource = require.resolve('axe-core/axe.min.js');
const RECORD = process.env.CHIPS_AXE_RECORD;
type Baseline = Record<string, string[]>;
const BASELINE_FILE = './searchable-multi-select-chips.axe-baseline.271efee34.json';
const BASELINE: Baseline = RECORD ? {} : (require(BASELINE_FILE) as Baseline);

const recorded: Baseline = {};

const THEMES = ['light', 'dark'] as const;
type Theme = (typeof THEMES)[number];

const CHIPS_NODES =
  '[data-slot="searchable-multi-select-chips"], [data-slot="searchable-multi-select-chips-status"]';

// The app boots wallet adapters before the gallery renders, which is slow on a loaded machine.
test.describe.configure({ timeout: 180_000 });

test.afterAll(() => {
  if (RECORD) writeFileSync(RECORD, `${JSON.stringify(recorded, null, 2)}\n`);
});

const frames = (page: Page, n = 2) =>
  page.evaluate(
    (count) =>
      new Promise<void>((resolve) => {
        const step = (left: number) =>
          left === 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
        step(count);
      }),
    n
  );

async function open(page: Page, theme: Theme, group: string, item: string): Promise<void> {
  await page.setViewportSize({ width: 1400, height: 1400 });
  await page.addInitScript((t) => {
    localStorage.setItem('theme', t);
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style');
      s.textContent = '*, *::before, *::after { transition: none !important; }';
      document.head.append(s);
    });
  }, theme);
  await page.goto('/', { waitUntil: 'networkidle' });
  const groupButton = page.getByRole('button', { name: group }).first();
  await groupButton.waitFor({ timeout: 120_000 });
  const nav = page.getByText(item, { exact: true }).first();
  if (!(await nav.isVisible().catch(() => false))) await groupButton.click();
  await nav.click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
    .toBe(theme === 'dark');
}

/** axe rule ids on the page, plus any violation node that is part of a chip list. */
async function axeRun(page: Page): Promise<{ ids: string[]; onChips: string[] }> {
  if (!(await page.evaluate(() => 'axe' in window))) await page.addScriptTag({ path: axeSource });
  return page.evaluate(async (chipsSelector) => {
    const w = window as unknown as {
      axe: {
        run: (
          ctx: Element,
          opts: object
        ) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }>;
      };
    };
    const r = await w.axe.run(document.body, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    });
    const onChips: string[] = [];
    for (const v of r.violations) {
      for (const n of v.nodes) {
        const el = document.querySelector(n.target.join(' '));
        if (el?.closest(chipsSelector)) onChips.push(`${v.id}: ${n.target.join(' ')}`);
      }
    }
    return { ids: Array.from(new Set(r.violations.map((v) => v.id))).sort(), onChips };
  }, CHIPS_NODES);
}

/** Records (record mode) or checks one state against the baseline state it maps to. */
async function axeState(page: Page, key: string, baselineKey = key): Promise<void> {
  const { ids, onChips } = await axeRun(page);
  if (RECORD) {
    recorded[key] = ids;
    return;
  }
  expect(onChips, `${key}: violations on chips nodes`).toEqual([]);
  const before = BASELINE[baselineKey];
  expect(before, `baseline has ${baselineKey}`).toBeDefined();
  expect(
    ids.filter((id) => !(before as string[]).includes(id)),
    `${key}: new violation kinds vs ${baselineKey}`
  ).toEqual([]);
}

/** Escape, then wait for the popover's exit animation to finish, so the next click lands. */
async function closePopover(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-slot="searchable-multi-select-content"]')).toHaveCount(0);
  // The modal layer gives pointer events back to the page after it unmounts.
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).pointerEvents))
    .not.toBe('none');
}

/** WCAG contrast of two CSS colours (any syntax), each painted on a canvas to read sRGB. */
async function contrast(page: Page, fg: string, bg: string): Promise<number> {
  return page.evaluate(
    ([a, b]) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
      const rgb = (color: string) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, 1, 1);
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        return Array.from(ctx.getImageData(0, 0, 1, 1).data.slice(0, 3));
      };
      const lum = (c: number[]) => {
        const [r, g, bl] = c.map((v) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        }) as [number, number, number];
        return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
      };
      const l1 = lum(rgb(a as string));
      const l2 = lum(rgb(b as string));
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    },
    [fg, bg]
  );
}

/**
 * The focus ring in a computed box-shadow list: the visible shadow with the largest spread.
 * The kit draws a ring offset in the chip fill first, then the ring outside it.
 */
function ringColor(boxShadow: string): string | null {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of boxShadow) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  parts.push(cur.trim());
  let best: { color: string; spread: number } | null = null;
  for (const p of parts) {
    const color = p.match(/^(\w+\([^)]*\)|#\w+)/)?.[1];
    if (!color || /rgba\(0, 0, 0, 0\)/.test(color)) continue;
    const spread = parseFloat(p.replace(color, '').trim().split(/\s+/)[3] ?? '0');
    if (!best || spread > best.spread) best = { color, spread };
  }
  return best?.color ?? null;
}

const chipsExample = (page: Page): Locator =>
  page
    .locator('[data-slot="searchable-multi-select"]')
    .filter({ has: page.getByRole('list', { name: 'Shipping countries' }) });

for (const theme of THEMES) {
  test(`${theme}: axe on the SearchableMultiSelect page adds no violation kind`, async ({
    page,
  }) => {
    await open(page, theme, 'Inputs', 'SearchableMultiSelect');
    const allowed = page.locator('[data-slot="searchable-multi-select-trigger"]').first();
    await allowed.waitFor();
    await axeState(page, `${theme} sms closed`);
    await allowed.click();
    await page.getByRole('combobox', { name: 'Search countries' }).first().waitFor();
    await axeState(page, `${theme} sms open`);
    await closePopover(page);
    if (RECORD) return;

    // Chips example: after a removal, and with its own popover open.
    const root = page.locator('[data-slot="searchable-multi-select"]').first();
    await root.getByRole('button', { name: 'Remove Germany' }).click();
    await axeState(page, `${theme} sms chips after removal`, `${theme} sms closed`);
    await root.locator('[data-slot="searchable-multi-select-trigger"]').click();
    await axeState(page, `${theme} sms chips open`, `${theme} sms open`);
    await closePopover(page);
  });

  test(`${theme}: axe on the field demo adds no violation kind`, async ({ page }) => {
    await open(page, theme, 'Forms', 'FormFields');
    const form = page.getByTestId('smsf-form');
    await form.scrollIntoViewIfNeeded();
    const allowed = form.locator('[data-slot="searchable-multi-select-trigger"]').first();
    await axeState(page, `${theme} smsf closed`);
    await page.getByTestId('smsf-readonly-toggle').click();
    await axeState(page, `${theme} smsf read-only`);
    await page.getByTestId('smsf-readonly-toggle').click();
    await allowed.click();
    await page.getByRole('combobox', { name: 'Search countries' }).first().waitFor();
    await axeState(page, `${theme} smsf open`);
    await closePopover(page);
    if (RECORD) return;

    // Blocked countries with chips, interactive and read-only.
    const blocked = page.locator('#smsfBlocked');
    // Keyboard, not a click: closing "Allowed countries" empty marked it touched (onTouched
    // mode), so the next mousedown shows its required error and shifts this trigger down
    // before mouseup, and the click is lost. A demo layout effect, not a chips one.
    await blocked.focus();
    await page.keyboard.press('Enter');
    const search = page.getByRole('combobox', { name: 'Search countries' });
    for (const name of ['Spain', 'France']) {
      await search.fill(name);
      await page.keyboard.press('Enter');
    }
    await axeState(page, `${theme} smsf chips open`, `${theme} smsf open`);
    await closePopover(page);
    await axeState(page, `${theme} smsf chips`, `${theme} smsf closed`);
    await page.getByTestId('smsf-readonly-toggle').click();
    await axeState(page, `${theme} smsf chips read-only`, `${theme} smsf read-only`);
  });

  test(`${theme}: chips fit the narrow example and meet contrast and target size`, async ({
    page,
  }) => {
    test.skip(!!RECORD, 'chips did not exist at the baseline');
    await open(page, theme, 'Inputs', 'SearchableMultiSelect');
    const root = chipsExample(page);
    await root.waitFor();
    await root.scrollIntoViewIfNeeded();
    const geom = await root.evaluate((r) => {
      const chips = Array.from(
        r.querySelectorAll<HTMLElement>('[data-slot="searchable-multi-select-chip"]')
      );
      const rootRect = r.getBoundingClientRect();
      const panel = r.closest('[data-testid="sms-chips-tinted-panel"]') as HTMLElement | null;
      return {
        width: Math.round(rootRect.width),
        panelWidth: panel ? Math.round(panel.getBoundingClientRect().width) : null,
        scroll: r.scrollWidth,
        client: r.clientWidth,
        lines: new Set(chips.map((c) => Math.round(c.getBoundingClientRect().top))).size,
        outside: chips.filter((c) => {
          const b = c.getBoundingClientRect();
          return b.left < rootRect.left - 0.5 || b.right > rootRect.right + 0.5;
        }).length,
        buttons: Array.from(
          r.querySelectorAll('[data-slot="searchable-multi-select-chip-remove"]')
        ).map((b) => {
          const rect = b.getBoundingClientRect();
          return [rect.width, rect.height];
        }),
        pageScroll: document.documentElement.scrollWidth - window.innerWidth,
        fill: getComputedStyle(chips[0] as HTMLElement).backgroundColor,
        text: getComputedStyle(chips[0] as HTMLElement).color,
        icon: getComputedStyle(
          (chips[0] as HTMLElement).querySelector('button') as HTMLButtonElement
        ).color,
      };
    });
    // Panel is max-w-xs (320); p-3 inset leaves the field a little under that.
    expect(geom.panelWidth).toBe(320);
    expect(geom.width).toBeLessThanOrEqual(320);
    expect(geom.width).toBeGreaterThan(280);
    expect(geom.scroll).toBeLessThanOrEqual(geom.client);
    expect(geom.lines).toBeGreaterThan(1);
    expect(geom.outside).toBe(0);
    expect(geom.pageScroll).toBeLessThanOrEqual(0);
    expect(geom.buttons).toHaveLength(8);
    for (const [w, h] of geom.buttons) {
      expect(w).toBeGreaterThanOrEqual(24);
      expect(h).toBeGreaterThanOrEqual(24);
    }
    expect(await contrast(page, geom.text, geom.fill)).toBeGreaterThanOrEqual(4.5);
    expect(await contrast(page, geom.icon, geom.fill)).toBeGreaterThanOrEqual(3);
  });

  test(`${theme}: the keyboard focus ring on a remove button has 3:1 against the chip fill`, async ({
    page,
  }) => {
    test.skip(!!RECORD, 'chips did not exist at the baseline');
    // Known gap, reported for a decision: in dark the kit's ring token (--ring) on the chip fill
    // (bg-background) measures under 3:1. The same token on the page background, as every kit
    // Button draws it, is also under 3:1. Light passes.
    test.fail(theme === 'dark', 'dark focus ring under 3:1 on the chip fill');
    await open(page, theme, 'Inputs', 'SearchableMultiSelect');
    const root = chipsExample(page);
    await root.waitFor();
    await root.scrollIntoViewIfNeeded();
    await root.locator('[data-slot="searchable-multi-select-trigger"]').focus();
    await page.keyboard.press('Tab');
    const focused = root.getByRole('button', { name: 'Remove France' });
    await expect(focused).toBeFocused();
    const { shadow, fill } = await focused.evaluate((b) => ({
      shadow: getComputedStyle(b).boxShadow,
      fill: getComputedStyle(b.closest('li') as HTMLElement).backgroundColor,
    }));
    const ring = ringColor(shadow);
    expect(ring, shadow).not.toBeNull();
    expect(ring).not.toBe(fill);
    expect(await contrast(page, ring as string, fill)).toBeGreaterThanOrEqual(3);
  });

  test(`${theme}: a keyboard removal keeps focus on a chip, announces it and updates the value`, async ({
    page,
  }) => {
    test.skip(!!RECORD, 'chips did not exist at the baseline');
    await open(page, theme, 'Inputs', 'SearchableMultiSelect');
    const root = chipsExample(page);
    await root.waitFor();
    await root.scrollIntoViewIfNeeded();
    await root.locator('[data-slot="searchable-multi-select-trigger"]').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(root.getByRole('button', { name: 'Remove Spain' })).toBeFocused();
    // Sample the focused element on every frame from before the key press.
    await page.evaluate(() => {
      const w = window as unknown as { __seen: string[]; __run: boolean };
      w.__seen = [];
      w.__run = true;
      const tick = () => {
        const a = document.activeElement;
        w.__seen.push(
          a === document.body || a === null ? '<body>' : (a.getAttribute('aria-label') ?? a.tagName)
        );
        if (w.__run) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.keyboard.press('Enter');
    await frames(page, 3);
    const seen = await page.evaluate(() => {
      const w = window as unknown as { __seen: string[]; __run: boolean };
      w.__run = false;
      return w.__seen;
    });
    expect(seen).not.toContain('<body>');
    await expect(root.getByRole('button', { name: 'Remove Germany' })).toBeFocused();
    await expect(root.locator('[data-slot="searchable-multi-select-chips-status"]')).toHaveText(
      'Spain removed'
    );
    await expect(page.getByTestId('sms-chips-readout')).toHaveText('FR, DE, IT, NL, PT, SE, GB');
    await expect(root.locator('[data-slot="searchable-multi-select-trigger"]')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  test(`${theme}: chips on a muted panel keep a visible edge and a darker remove icon`, async ({
    page,
  }) => {
    test.skip(!!RECORD, 'chips did not exist at the baseline');
    await open(page, theme, 'Inputs', 'SearchableMultiSelect');
    const panel = page.getByTestId('sms-chips-tinted-panel');
    await panel.scrollIntoViewIfNeeded();
    const root = chipsExample(page);
    await root.waitFor();
    const measured = await root.evaluate((r) => {
      const chip = r.querySelector('[data-slot="searchable-multi-select-chip"]') as HTMLElement;
      const remove = r.querySelector(
        '[data-slot="searchable-multi-select-chip-remove"]'
      ) as HTMLButtonElement;
      const panelEl = r.closest('[data-testid="sms-chips-tinted-panel"]') as HTMLElement;
      const cs = getComputedStyle(chip);
      const ps = getComputedStyle(panelEl);
      return {
        className: chip.className,
        borderWidth: parseFloat(cs.borderTopWidth),
        chipBg: cs.backgroundColor,
        panelBg: ps.backgroundColor,
        borderColor: cs.borderTopColor,
        removeColor: getComputedStyle(remove).color,
      };
    });
    expect(measured.className.split(/\s+/)).toEqual(
      expect.arrayContaining(['border', 'border-border', 'bg-background'])
    );
    expect(measured.borderWidth).toBe(1);
    expect(measured.chipBg).not.toBe(measured.panelBg);
    expect(measured.borderColor).not.toBe(measured.chipBg);
    expect(await contrast(page, measured.removeColor, measured.chipBg)).toBeGreaterThanOrEqual(3);

    const override = page.getByTestId('sms-chips-override');
    const overrideChip = override.locator('[data-slot="searchable-multi-select-chip"]').first();
    await expect(overrideChip).toHaveClass(/border-primary/);
    const overrideBorder = await overrideChip.evaluate((el) => getComputedStyle(el).borderTopColor);
    expect(overrideBorder).not.toBe(measured.borderColor);
  });
}

test('field demo: remove a chip by keyboard and submit; the payload matches the chips', async ({
  page,
}) => {
  test.skip(!!RECORD, 'chips did not exist at the baseline');
  await open(page, 'light', 'Forms', 'FormFields');
  const form = page.getByTestId('smsf-form');
  await form.scrollIntoViewIfNeeded();

  // Allowed countries is required: pick one so the form can submit.
  await form.locator('[data-slot="searchable-multi-select-trigger"]').first().click();
  const search = page.getByRole('combobox', { name: 'Search countries' });
  await search.fill('Canada');
  await page.keyboard.press('Enter');
  await closePopover(page);

  const blocked = page.locator('#smsfBlocked');
  await blocked.click();
  for (const name of ['Spain', 'France', 'Japan']) {
    await search.fill(name);
    await page.keyboard.press('Enter');
  }
  await closePopover(page);
  await expect(blocked).toBeFocused();
  const root = page.locator('[data-slot="searchable-multi-select"]', { has: blocked });
  const chipTexts = () =>
    root.locator('[data-slot="searchable-multi-select-chip"]').allInnerTexts();
  expect(await chipTexts()).toEqual(['Spain', 'France', 'Japan']);

  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(root.getByRole('button', { name: 'Remove France' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(root.getByRole('button', { name: 'Remove Japan' })).toBeFocused();
  expect(await chipTexts()).toEqual(['Spain', 'Japan']);

  await form.getByRole('button', { name: 'Submit' }).click();
  const payload = page.getByTestId('smsf-payload');
  await expect(payload).toContainText('"blocked"');
  const submitted = JSON.parse((await payload.innerText()).trim()) as {
    countries: string[];
    blocked: string[];
  };
  expect(submitted.blocked).toEqual(['ES', 'JP']);
  expect(submitted.countries).toEqual(['CA']);

  // Removing the last chips of the second field focuses its own trigger, not the first one's.
  await root.getByRole('button', { name: 'Remove Spain' }).click();
  await root.getByRole('button', { name: 'Remove Japan' }).click();
  await expect(blocked).toBeFocused();
  await expect(root.locator('[data-slot="searchable-multi-select-chips"]')).toHaveCount(0);
  await expect(root.locator('[data-slot="searchable-multi-select-chips-status"]')).toHaveText(
    'Japan removed'
  );
  await expect(blocked).toHaveAttribute('aria-expanded', 'false');

  // Read-only: chips stay, remove buttons go, the value is still submitted.
  await blocked.click();
  await search.fill('Italy');
  await page.keyboard.press('Enter');
  await closePopover(page);
  await page.getByTestId('smsf-readonly-toggle').click();
  expect(await chipTexts()).toEqual(['Italy']);
  await expect(root.locator('[data-slot="searchable-multi-select-chip-remove"]')).toHaveCount(0);
  await expect(root.locator('button')).toHaveCount(1);
  await form.getByRole('button', { name: 'Submit' }).click();
  await expect
    .poll(async () => JSON.parse((await payload.innerText()).trim()).blocked)
    .toEqual(['IT']);
});
