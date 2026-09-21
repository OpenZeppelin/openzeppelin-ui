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

test('built Badge gallery exposes solid, interactive, and overlay compositions', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByText('Data Display', { exact: true }).first().waitFor({ state: 'attached' });
  await clickVisibleText(page, 'Data Display');
  await clickVisibleText(page, 'Badge');

  const badgeSection = page.getByRole('heading', { name: 'Badge', exact: true });
  await expect(badgeSection).toBeVisible();

  const solidGroup = page
    .getByRole('heading', { name: 'solid', exact: true })
    .locator('xpath=following-sibling::div[1]');
  await expect(solidGroup.getByText('Completed', { exact: true })).toHaveClass(/bg-success/);
  await expect(solidGroup.getByText('Failed', { exact: true })).toHaveClass(/bg-destructive/);

  const activationBadge = page.getByRole('button', { name: /Owner role Activated 0 times/ });
  await activationBadge.click();
  await expect(page.getByRole('button', { name: /Owner role Activated 1 time/ })).toBeVisible();

  const overlayBadge = page.getByText('Hover for details', { exact: true });
  await overlayBadge.hover();
  await expect(page.getByRole('tooltip')).toContainText(
    'This non-interactive badge remains a span.'
  );
  await expect(overlayBadge).toHaveJSProperty('tagName', 'SPAN');
});
