/**
 * RadioGroup card titles, RadioField horizontal cards, segmented and read-only segmented, in the
 * running example app (prove-it-works). The components package proves the same properties on
 * its own fixtures in Chromium (`radio-field.sf6.browser.test.tsx`); this file proves the demos
 * consumers copy from.
 *
 * - Scenario 1 / INV-2: RadioGroup demo card titles (plain, filled Badge, outline Badge,
 *   disabled) sit within 1px of their radio; the filled-Badge card is as tall as the plain one,
 *   the outline-Badge card at most 2px taller.
 * - Scenario 2 / INV-4: the side-by-side Tier cards sit three to a row at 1280px and stack at
 *   375px, with no overflow at 1280, 768 and 375px.
 * - Scenario 3 / INV-11: the segmented required Mode field in a form without `noValidate`: no
 *   `[required]` control and `checkValidity()` true; an empty keyboard submit shows the kit
 *   message, marks the group invalid and focuses a segment; no payload.
 * - Scenario 4 / INV-12 / INV-19 / INV-20: the read-only Network field is announced read-only,
 *   ignores a click and held arrow keys, keeps its look on hover with a default cursor.
 * - Scenario 3 + 4 / INV-7 / INV-10: picking Manual and submitting gives
 *   `{ tier: 'team', mode: 'manual', network: 'testnet' }`.
 * - INV-22: axe finds no violations in light and dark on the RadioGroup demo's Card and Segmented
 *   sections and on both RadioField forms, before and after the empty submit. On FormFields the scope is the two radio forms: the payload
 *   readouts (the app's shared CodeBlock) sit outside them, and their syntax colours fail
 *   contrast on the 271efee34 demo too.
 *
 * Submits use the keyboard on a fresh page (a click right after a blur can be swallowed by the
 * error's layout shift).
 */
import { createRequire } from 'node:module';
import { expect, test, type Locator, type Page } from 'playwright/test';

const axeSource = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

async function clickVisibleText(page: Page, text: string): Promise<void> {
  for (const match of await page.getByText(text, { exact: true }).all()) {
    if (await match.isVisible()) {
      await match.click();
      return;
    }
  }
  throw new Error(`No visible "${text}" navigation item`);
}

async function openDemo(page: Page, category: string, item: string): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 1400 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: category }).first().waitFor({ timeout: 90_000 });
  await clickVisibleText(page, category);
  await clickVisibleText(page, item);
}

async function openVariants(page: Page, width = 1280): Promise<Locator> {
  // Navigate at desktop width (the sidebar collapses on narrow viewports), then resize.
  await openDemo(page, 'Forms', 'FormFields');
  const form = page.getByTestId('radio-field-variants-form');
  await form.waitFor({ timeout: 90_000 });
  if (width !== 1280) {
    await page.setViewportSize({ width, height: 1400 });
    await page.waitForTimeout(200);
  }
  await form.scrollIntoViewIfNeeded();
  return form;
}

async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.classList.toggle('light', t === 'light');
  }, theme);
  // Let colour transitions finish.
  await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
}

async function submitByKeyboard(form: Locator): Promise<void> {
  await form.getByRole('button', { name: 'Submit' }).focus();
  await form.page().keyboard.press('Enter');
}

async function holdKey(page: Page, key: string): Promise<void> {
  await page.keyboard.down(key);
  await page.waitForTimeout(30);
  await page.keyboard.up(key);
}

test('scenario 1: card titles sit level with the radio; a chip keeps the card height', async ({
  page,
}) => {
  await openDemo(page, 'Inputs', 'RadioGroup');
  const group = page.getByRole('radiogroup', { name: 'Product type' });
  await group.waitFor({ timeout: 90_000 });
  const geometry = await group.evaluate((g) => {
    const out: Record<string, { delta: number; height: number }> = {};
    for (const item of Array.from(g.querySelectorAll<HTMLElement>('[role="radio"]'))) {
      const radio = item.firstElementChild as HTMLElement;
      const title = item.querySelector('[id$="-title"]') as HTMLElement;
      const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
      let text = walker.nextNode();
      while (text && !text.textContent?.trim()) text = walker.nextNode();
      const range = document.createRange();
      range.selectNodeContents(text as Node);
      const line = range.getClientRects()[0];
      const r = radio.getBoundingClientRect();
      out[item.getAttribute('value') as string] = {
        delta: Math.abs(line.top + line.height / 2 - (r.top + r.height / 2)),
        height: item.getBoundingClientRect().height,
      };
    }
    return out;
  });
  for (const value of ['spot', 'futures', 'perpetuals', 'options']) {
    expect(geometry[value].delta, value).toBeLessThanOrEqual(1);
  }
  expect(Math.abs(geometry.futures.height - geometry.spot.height)).toBeLessThanOrEqual(0.5);
  expect(geometry.perpetuals.height - geometry.spot.height).toBeLessThanOrEqual(2);
  await expect(page.getByRole('radio', { name: 'Futures Popular' })).toBeVisible();
});

for (const [width, perRow] of [
  [1280, 3],
  [768, 0],
  [375, 1],
] as const) {
  test(`scenario 2: side-by-side cards at ${width}px: no overflow${perRow ? `, ${perRow} per row` : ''}`, async ({
    page,
  }) => {
    const form = await openVariants(page, width);
    const group = form.getByRole('radiogroup', { name: 'Tier' });
    const g = await group.evaluate((el) => {
      const gr = el.getBoundingClientRect();
      const cards = Array.from(el.querySelectorAll<HTMLElement>('[role="radio"]')).map((c) =>
        c.getBoundingClientRect()
      );
      return {
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        overflowRight: Math.max(...cards.map((c) => c.right - gr.right)),
        tops: cards.map((c) => Math.round(c.top)),
        widths: cards.map((c) => c.width),
        heights: cards.map((c) => c.height),
      };
    });
    expect(g.scrollWidth).toBeLessThanOrEqual(g.clientWidth);
    expect(g.overflowRight).toBeLessThanOrEqual(0.5);
    const firstRow = g.tops.filter((t) => t === g.tops[0]).length;
    if (perRow) expect(firstRow).toBe(perRow);
    // Cards on one row share width and height.
    g.tops.forEach((t, i) => {
      if (t !== g.tops[0]) return;
      expect(Math.abs(g.widths[i] - g.widths[0])).toBeLessThanOrEqual(1);
      expect(Math.abs(g.heights[i] - g.heights[0])).toBeLessThanOrEqual(1);
    });
  });
}

test('scenario 3: segmented required in a form without noValidate shows the kit error', async ({
  page,
}) => {
  const form = await openVariants(page);
  const native = await form.evaluate((f: HTMLFormElement) => ({
    noValidate: f.noValidate,
    required: f.querySelectorAll('[required]').length,
    valid: f.checkValidity(),
  }));
  expect(native).toEqual({ noValidate: false, required: 0, valid: true });

  await submitByKeyboard(form);
  const mode = form.getByRole('radiogroup', { name: 'Mode *' });
  await expect(form.getByText('This field is required')).toBeVisible();
  await expect(mode).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('radio', { name: 'Automatic' })).toBeFocused();
  await expect(page.getByTestId('radio-field-variants-payload')).toContainText('submit the form');
});

test('scenario 4: the read-only segmented field ignores clicks and keys, keeps its look, and submits', async ({
  page,
}) => {
  const form = await openVariants(page);
  const network = form.getByRole('radiogroup', { name: 'Network' });
  await expect(network).toHaveAttribute('aria-readonly', 'true');
  await expect(network).toHaveAttribute('aria-describedby', /radioFieldNetwork-readonly$/);
  const mainnet = page.getByRole('radio', { name: 'Mainnet' });
  const testnet = page.getByRole('radio', { name: 'Testnet' });

  const style = (l: Locator) =>
    l.evaluate((e) => {
      document.getAnimations().forEach((a) => a.finish());
      const cs = getComputedStyle(e);
      return { color: cs.color, bg: cs.backgroundColor, opacity: cs.opacity, cursor: cs.cursor };
    });
  for (const theme of ['light', 'dark'] as const) {
    await setTheme(page, theme);
    await page.mouse.move(0, 0);
    const rest = await style(mainnet);
    await mainnet.hover();
    const hover = await style(mainnet);
    expect(hover, theme).toEqual(rest);
    expect(rest.cursor).toBe('default');
    expect(rest.opacity).toBe('1');
  }
  await setTheme(page, 'light');

  await mainnet.click();
  await expect(testnet).toHaveAttribute('aria-checked', 'true');
  await testnet.focus();
  for (const key of [
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End',
    ' ',
    'Enter',
  ]) {
    await holdKey(page, key);
  }
  await expect(testnet).toHaveAttribute('aria-checked', 'true');
  await expect(mainnet).toHaveAttribute('aria-checked', 'false');

  // Fresh page for the submit: pick Manual, keyboard submit.
  await page.reload();
  const fresh = await openVariants(page);
  await page.getByRole('radio', { name: 'Manual' }).click();
  await submitByKeyboard(fresh);
  const payload = page.getByTestId('radio-field-variants-payload');
  await expect(payload).toContainText('manual');
  expect(JSON.parse((await payload.innerText()).trim())).toEqual({
    tier: 'team',
    mode: 'manual',
    network: 'testnet',
  });
});

async function axeViolations(page: Page, selectors: string[]): Promise<string[]> {
  await page.addScriptTag({ path: axeSource });
  return page.evaluate(async (include) => {
    const axe = (
      window as unknown as {
        axe: {
          run: (
            ctx: unknown,
            opts: unknown
          ) => Promise<{ violations: Array<{ id: string; nodes: Array<{ target: string[] }> }> }>;
        };
      }
    ).axe;
    document.getAnimations().forEach((a) => a.finish());
    const r = await axe.run(
      { include: include.map((s) => [s]) },
      { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }
    );
    return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  }, selectors);
}

for (const theme of ['light', 'dark'] as const) {
  test(`INV-22: no axe violations on the radio demos (${theme})`, async ({ page }) => {
    await openDemo(page, 'Inputs', 'RadioGroup');
    await page.getByRole('radiogroup', { name: 'Product type' }).waitFor({ timeout: 90_000 });
    await setTheme(page, theme);
    // The two RadioGroup sections this change touched. The page's "Network Selection" section
    // (unchanged) already fails color-contrast on its dimmed "Free" label.
    await page.evaluate(() => {
      for (const h of Array.from(document.querySelectorAll('main h3'))) {
        if (h.textContent === 'Card Variant' || h.textContent === 'Segmented Variant') {
          h.parentElement?.setAttribute('data-axe-scope', '');
        }
      }
    });
    expect(await page.locator('[data-axe-scope]').count()).toBe(2);
    expect(await axeViolations(page, ['[data-axe-scope]'])).toEqual([]);

    const form = await openVariants(page);
    await setTheme(page, theme);
    const sections = [
      '[data-testid="radio-field-card-form"]',
      '[data-testid="radio-field-variants-form"]',
    ];
    expect(await axeViolations(page, sections)).toEqual([]);
    await submitByKeyboard(form);
    await expect(form.getByText('This field is required')).toBeVisible();
    await setTheme(page, theme);
    expect(await axeViolations(page, sections)).toEqual([]);
  });
}
