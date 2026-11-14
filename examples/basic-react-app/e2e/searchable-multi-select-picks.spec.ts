/**
 * The country allow-list on the SearchableMultiSelect page names the picks on its closed
 * trigger, in selection order, through the formatter's third argument.
 */
import { expect, test, type Page } from 'playwright/test';

async function openPage(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'networkidle' });
  const item = page.getByText('SearchableMultiSelect', { exact: true }).first();
  if (!(await item.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: 'Inputs' }).first().click();
  }
  await item.click();
}

test('the closed trigger names the picks in selection order', async ({ page }) => {
  await openPage(page);
  const trigger = page.getByRole('button', { name: /^Allowed countries/ }).first();
  await expect(trigger).toContainText('Select countries');

  await trigger.click();
  const search = page.getByRole('combobox', { name: 'Search countries' });
  for (const name of ['France', 'Spain', 'Italy', 'Japan', 'Mexico']) {
    await search.fill(name);
    await page.keyboard.press('Enter');
  }
  await page.keyboard.press('Escape');

  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toHaveText('France, Spain and 3 more');
  // The text is the trigger's value for assistive technology.
  await expect(
    page.getByRole('button', { name: 'Allowed countries France, Spain and 3 more', exact: true })
  ).toHaveCount(1);
  await expect(page.getByTestId('sms-readout')).toHaveText('FR, ES, IT, JP, MX');

  // Dropping the first pick promotes the next in selection order.
  await trigger.click();
  await search.fill('France');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveText('Spain, Italy and 2 more');
});
