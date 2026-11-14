/**
 * SF-6 · a failed submit moves focus to the first invalid field, in the running
 * example app ("Focus on first error" on the FormFields page, a noValidate form).
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

test('focus follows the first invalid field: TextField, then EnumField, then CodeEditorField', async ({
  page,
}) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1280, height: 1400 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Forms' }).first().waitFor({ timeout: 90_000 });
  await clickVisibleText(page, 'Forms');
  await clickVisibleText(page, 'FormFields');
  await page
    .getByRole('heading', { name: 'Focus on first error' })
    .scrollIntoViewIfNeeded({ timeout: 90_000 });

  const form = page.getByTestId('focus-on-error-form');
  expect(await form.evaluate((el) => (el as HTMLFormElement).noValidate)).toBe(true);
  const submit = page.getByTestId('focus-on-error-submit');
  const name = form.getByRole('textbox', { name: /Name/ });
  const status = form.getByRole('combobox', { name: /Status/ });
  const config = form.locator('#foeConfig');

  await submit.click();
  await expect(name).toBeFocused();

  await name.fill('Treasury');
  await submit.click();
  await expect(status).toBeFocused();

  await status.click();
  await page.getByRole('option', { name: 'Active' }).click();
  await submit.click();
  await expect(config).toBeFocused();

  await config.fill('{}');
  await submit.click();
  await expect(submit).toBeFocused();
});
