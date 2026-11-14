/**
 * 006 SF-4 scenario 3 (prove-it-works): the required "Limits" map in the Validation messages
 * demo on the FormFields page. A bad key in a row makes the map show its own required text
 * next to the row's key message, and fixing the key clears the map text.
 */
import { expect, test, type Locator, type Page } from 'playwright/test';

const KEY_RULE = 'Use lowercase letters, digits and underscores, starting with a letter';
const RESERVED = 'That limit name is reserved';
const REQUIRED = 'Add at least one limit';

async function clickVisibleText(page: Page, text: string): Promise<void> {
  for (const match of await page.getByText(text, { exact: true }).all()) {
    if (await match.isVisible()) {
      await match.click();
      return;
    }
  }
  throw new Error(`No visible "${text}" navigation item`);
}

async function openDemo(page: Page): Promise<Locator> {
  await page.setViewportSize({ width: 1280, height: 1600 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Forms' }).first().waitFor({ timeout: 90_000 });
  await clickVisibleText(page, 'Forms');
  await clickVisibleText(page, 'FormFields');
  const form = page.getByTestId('validation-messages-form');
  await form.waitFor({ timeout: 90_000 });
  await form.scrollIntoViewIfNeeded();
  return form;
}

test('SF-4: a bad key on a Limits row shows the key message and the map required text', async ({
  page,
}) => {
  const form = await openDemo(page);
  const limits = page.getByTestId('vm-limits-field');
  const submit = page.getByTestId('validation-messages-submit');

  // Scenario 2: before any key error, no key text shows. A required empty map shows its own
  // required text at once (by design), so that text is expected here.
  await expect(limits.getByText(KEY_RULE)).toHaveCount(0);
  await expect(limits.getByText(RESERVED)).toHaveCount(0);

  await limits.getByRole('button', { name: 'Add Item' }).click();
  const key = limits.getByPlaceholder('Limit name').first();
  await key.fill('Bad Key');
  await limits.getByPlaceholder('Value').first().fill('1');
  expect(await form.evaluate((f) => (f as HTMLFormElement).noValidate)).toBe(true);
  await submit.focus();
  await page.keyboard.press('Enter');

  await expect(limits.getByText(KEY_RULE)).toBeVisible();
  await expect(limits.getByText(REQUIRED)).toBeVisible();
  await limits.screenshot({
    path: process.env.SF4_EVIDENCE_DIR ? `${process.env.SF4_EVIDENCE_DIR}/bad-key.png` : undefined,
  });

  // A reserved name shows its own message under the row.
  await key.fill('admin');
  await submit.focus();
  await page.keyboard.press('Enter');
  await expect(limits.getByText(RESERVED)).toBeVisible();
  await expect(limits.getByText(REQUIRED)).toBeVisible();

  // A valid key clears both.
  await key.fill('daily_cap');
  await submit.focus();
  await page.keyboard.press('Enter');
  await expect(limits.getByText(KEY_RULE)).toHaveCount(0);
  await expect(limits.getByText(RESERVED)).toHaveCount(0);
  await expect(limits.getByText(REQUIRED)).toHaveCount(0);
});
