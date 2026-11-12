/**
 * SF-17 · NetworkSelector rebuilt on the searchable select core, in the running example app.
 * INV-8: the appended multi demo shows all six copy overrides and an accurate readout, and the
 * existing selectors on the page keep the default copy. INV-18 / INV-25: inside the renderer's
 * Add Alias dialog, opening the list focuses its search box, and the first Escape closes only
 * the list.
 */
import { expect, test, type Page } from 'playwright/test';

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

async function openDemo(page: Page, name: string): Promise<void> {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByText(name, { exact: true }).first().waitFor({ state: 'attached' });
  await clickVisibleText(page, name);
}

const popover = (page: Page) => page.locator('[data-slot="searchable-multi-select-content"]');

test('INV-8: the multi demo applies every copy override and reports the selected ids', async ({
  page,
}) => {
  await openDemo(page, 'Network Management');
  const demo = page.getByTestId('network-multi-demo');
  const readout = page.getByTestId('network-multi-readout');
  // Radix aria-hides the trigger while the popover is open, so locate it by data-slot.
  const trigger = demo.locator('[data-slot="network-selector-trigger"]');
  await expect(trigger).toHaveText('Pick chains');
  await expect(readout).toHaveText('None');

  await trigger.click();
  const search = popover(page).getByRole('combobox', { name: 'Filter chains' });
  await expect(search).toBeFocused();
  await expect(search).toHaveAttribute('placeholder', 'Filter chains…');
  const options = popover(page).locator('[role="option"]:not([aria-disabled="true"])');
  await options.nth(0).click();
  await options.nth(1).click();
  await expect(readout).toHaveText(/^[^,]+, [^,]+$/);
  await expect(trigger).toHaveText(/^2 of \d+ chains$/);
  await expect(popover(page).locator('[data-slot="searchable-multi-select-summary"]')).toHaveText(
    '2 pickedReset'
  );

  await search.fill('zzz');
  await expect(popover(page).getByRole('status')).toHaveText('No chain matches.');
  await popover(page).getByRole('button', { name: 'Reset' }).click();
  await expect(readout).toHaveText('None');
  await expect(search).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveText('Pick chains');
});

test('INV-8: the existing selectors on the same page keep the default copy', async ({ page }) => {
  await openDemo(page, 'Network Management');
  const section = page.locator("xpath=//h3[normalize-space()='NetworkSelector']/..");
  const basic = section.getByRole('combobox').first();
  await basic.click();
  const search = popover(page).getByRole('combobox', { name: 'Search networks' });
  await expect(search).toBeFocused();
  await expect(search).toHaveAttribute('placeholder', 'Search network...');
  await search.fill('zzz');
  await expect(popover(page).getByRole('status')).toHaveText('No network found.');
  await page.keyboard.press('Escape');
  await expect(basic).toBeFocused();
});

test('INV-18: in the Add Alias dialog, the list takes focus and one Escape closes only it', async ({
  page,
}) => {
  await openDemo(page, 'Account Alias');
  await page.getByRole('button', { name: 'Add Alias' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add Alias' });
  await dialog.locator('#new-alias-name').fill('Treasury');
  const trigger = dialog.locator('form button[role="combobox"]').first();
  await trigger.click();
  await expect(popover(page).getByRole('combobox', { name: 'Search networks' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(popover(page)).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#new-alias-name')).toHaveValue('Treasury');
  await expect(trigger).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveCSS('pointer-events', 'none');
});
