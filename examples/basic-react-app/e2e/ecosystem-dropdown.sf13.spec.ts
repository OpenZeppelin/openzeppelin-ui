/**
 * SF-13 · EcosystemDropdown menu width, in the running example app (Tailwind 4 build).
 * Scenario 1: a trigger wider than 200px → the open menu is exactly as wide as the trigger.
 * Scenario 2: a trigger narrower than 200px → the 200px minimum applies.
 * Scenario 3 (prove-it-works): the measured widths come from the real built stylesheet.
 */
import { expect, test, type Locator, type Page } from 'playwright/test';

async function clickVisibleText(page: Page, text: string): Promise<void> {
  const matches = await page.getByText(text, { exact: true }).all();
  for (const match of matches) {
    if (await match.isVisible()) {
      await match.click();
      return;
    }
  }
  throw new Error(`No visible "${text}" navigation item`);
}

async function openDemo(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByText('Layout', { exact: true }).first().waitFor({ state: 'attached' });
  await clickVisibleText(page, 'Layout');
  await clickVisibleText(page, 'EcosystemDropdown');
}

async function width(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element has no box');
  return box.width;
}

const menu = (page: Page) => page.getByRole('menu');

test('scenario 1: the menu is as wide as a trigger wider than the minimum', async ({ page }) => {
  await openDemo(page);
  const trigger = page.getByTestId('ecosystem-dropdown-wide').getByRole('combobox');
  const triggerWidth = await width(trigger);
  expect(triggerWidth).toBeGreaterThan(300);

  await trigger.click();
  await expect(menu(page)).toBeVisible();
  expect(await width(menu(page))).toBeCloseTo(triggerWidth, 0);
  await expect(menu(page)).toHaveCSS('min-width', '200px');
});

test('scenario 2: a trigger narrower than the minimum still gets a 200px menu', async ({
  page,
}) => {
  await openDemo(page);
  const trigger = page.getByTestId('ecosystem-dropdown-narrow').getByRole('combobox');
  const triggerWidth = await width(trigger);
  expect(triggerWidth).toBeLessThan(200);

  await trigger.click();
  await expect(menu(page)).toBeVisible();
  expect(await width(menu(page))).toBeCloseTo(200, 0);
});

test('scenario 3: the width rule is emitted, not just the minimum', async ({ page }) => {
  await openDemo(page);
  // Radix aria-hides the trigger while the menu is open, so locate it by tag, not role.
  const trigger = page.getByTestId('ecosystem-dropdown-wide').locator('button');
  const triggerWidth = await width(trigger);
  await trigger.click();
  const computed = await menu(page).evaluate((el) => getComputedStyle(el).width);
  expect(computed).toBe(`${triggerWidth}px`);
  expect(computed).not.toBe('200px');
});
