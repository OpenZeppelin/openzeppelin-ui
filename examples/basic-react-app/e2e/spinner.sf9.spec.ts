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

test('standalone Spinner renders and animates; LoadingButton demo still shows its spinner', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByText('Data Display', { exact: true }).first().waitFor({ state: 'attached' });
  await clickVisibleText(page, 'Data Display');
  await clickVisibleText(page, 'LoadingButton');

  const labelled = page.getByTestId('spinner-labelled');
  await expect(labelled).toBeVisible();
  await expect(labelled).toHaveAttribute('role', 'status');
  await expect(labelled).toHaveAttribute('aria-label', 'Loading data');
  await expect(labelled).toHaveCSS('animation-name', 'spin');

  const decorative = page.getByTestId('spinner-decorative');
  await expect(decorative).toBeVisible();
  await expect(decorative).toHaveAttribute('aria-hidden', 'true');
  await expect(decorative).toHaveCSS('animation-name', 'spin');

  await page.getByRole('button', { name: 'Click to Load' }).click();
  const buttonSpinner = page.locator('button:disabled svg.animate-spin').first();
  await expect(buttonSpinner).toBeVisible();
  await expect(buttonSpinner).toHaveCSS('margin-right', '8px');
  await expect(buttonSpinner).toHaveCSS('width', '16px');
  await expect(buttonSpinner).toHaveCSS('height', '16px');
});
