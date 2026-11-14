/**
 * 005 SF-35 / SC-001 (prove-it-works): the example app's real theme control, in Chromium.
 *
 * - Scenario 1: click the control → `html.dark`, pressed state follows; click again → light.
 *   Also by keyboard.
 * - Scenario 2: the chosen theme survives a reload, and `html.dark` is present before first
 *   paint of the app shell (no light flash).
 * - Scenario 3: dark reached through the control (no pre-set storage key) then reload; the root
 *   class follows each click. SF-34's contrast check through the toggle is
 *   `SF34_VIA_TOGGLE=1 pnpm test:browser e2e/dark-contrast.sf34.spec.ts`.
 *
 * Set SF35_EVIDENCE_DIR to keep a JSON readout and screenshots.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from 'playwright/test';

const evidenceDir = process.env.SF35_EVIDENCE_DIR;
const log: Array<Record<string, unknown>> = [];

const isDark = (page: Page): Promise<boolean> =>
  page.evaluate(() => document.documentElement.classList.contains('dark'));

async function open(page: Page) {
  await page.goto('/', { waitUntil: 'networkidle' });
  const toggle = page.getByTestId('theme-toggle');
  await toggle.waitFor({ timeout: 90_000 });
  return toggle;
}

async function shot(page: Page, name: string): Promise<void> {
  if (!evidenceDir) return;
  mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({ path: join(evidenceDir, `sf35-${name}.png`) });
}

test.afterAll(() => {
  if (evidenceDir)
    writeFileSync(join(evidenceDir, 'sf35-spec-readout.json'), JSON.stringify(log, null, 2));
});

test('SF-35 scenario 1: pointer toggles dark and back; name and pressed state follow', async ({
  page,
}) => {
  const toggle = await open(page);
  await expect(toggle).toHaveAccessibleName('Dark mode');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(await isDark(page)).toBe(false);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(await isDark(page)).toBe(true);
  await shot(page, 'dark');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(await isDark(page)).toBe(false);
  await shot(page, 'light');
  log.push({ scenario: 1, pointer: 'light→dark→light', name: 'Dark mode' });
});

test('SF-35 scenario 1: keyboard activation toggles the theme', async ({ page }) => {
  const toggle = await open(page);
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(await isDark(page)).toBe(true);
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(await isDark(page)).toBe(false);
  log.push({ scenario: 1, keyboard: 'Enter→dark, Space→light' });
});

test('SF-35 scenario 2+3: dark chosen with the control survives reload, no light flash', async ({
  page,
}) => {
  // Paint timing vs the moment `dark` lands on the root. The provider is client-only, so the
  // blank pre-mount document is its existing behaviour; the contract is that the first paint
  // with app content (first-contentful-paint) already has the dark class.
  await page.addInitScript(() => {
    const w = window as unknown as { __t: { darkAt?: number } };
    w.__t = {};
    new MutationObserver(() => {
      if (w.__t.darkAt === undefined && document.documentElement.classList.contains('dark'))
        w.__t.darkAt = performance.now();
    }).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  });
  const toggle = await open(page);
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull();
  await toggle.click();
  expect(await isDark(page)).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');

  await page.reload({ waitUntil: 'networkidle' });
  const after = page.getByTestId('theme-toggle');
  await after.waitFor({ timeout: 90_000 });
  expect(await isDark(page), 'dark restored after reload').toBe(true);
  await expect(after).toHaveAttribute('aria-pressed', 'true');
  const t = await page.evaluate(() => ({
    darkAt: (window as unknown as { __t: { darkAt?: number } }).__t.darkAt,
    fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
  }));
  expect(t.fcp, 'first-contentful-paint reported').toBeDefined();
  expect(t.darkAt, 'dark class observed on the root').toBeDefined();
  expect(t.darkAt!, 'dark class set before first contentful paint').toBeLessThanOrEqual(t.fcp!);
  await shot(page, 'dark-after-reload');

  await after.click();
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('theme-toggle').waitFor({ timeout: 90_000 });
  expect(await isDark(page), 'light restored after reload').toBe(false);
  log.push({
    scenario: '2+3',
    reload: 'dark persisted, light persisted',
    darkAtMs: t.darkAt,
    firstContentfulPaintMs: t.fcp,
  });
});
