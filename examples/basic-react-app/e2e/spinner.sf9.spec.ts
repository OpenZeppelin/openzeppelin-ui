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

  // The labelled spinner's svg is hidden; its wrapper is the named status with the label as text.
  const labelled = page.getByTestId('spinner-labelled');
  await expect(labelled).toBeVisible();
  await expect(labelled).toHaveAttribute('aria-hidden', 'true');
  await expect(labelled).toHaveCSS('animation-name', 'spin');
  const status = page.getByRole('status', { name: 'Loading data' });
  await expect(status).toHaveText('Loading data');
  await expect(status.getByTestId('spinner-labelled')).toHaveCount(1);

  const decorative = page.getByTestId('spinner-decorative');
  await expect(decorative).toBeVisible();
  await expect(decorative).toHaveAttribute('aria-hidden', 'true');
  await expect(decorative).toHaveCSS('animation-name', 'spin');

  await page.getByRole('button', { name: 'Click to Load' }).click();
  // 006 SF-5: a loading button is aria-busy, not natively disabled.
  const buttonSpinner = page.locator('button[aria-busy="true"] svg.animate-spin').first();
  await expect(buttonSpinner).toBeVisible();
  await expect(buttonSpinner).toHaveCSS('margin-right', '8px');
  await expect(buttonSpinner).toHaveCSS('width', '16px');
  await expect(buttonSpinner).toHaveCSS('height', '16px');
});
