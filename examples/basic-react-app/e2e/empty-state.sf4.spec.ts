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

test('SF-4: EmptyState retry action runs its handler; no icon or description element', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByText('Data Display', { exact: true }).first().waitFor({ state: 'attached' });
  await clickVisibleText(page, 'Data Display');
  await clickVisibleText(page, 'EmptyState');

  const demo = page.getByTestId('empty-state-retry-demo');
  await expect(demo).toBeVisible();
  await expect(demo.getByRole('heading', { name: "Couldn't load transactions" })).toBeVisible();
  await expect(demo.locator('svg')).toHaveCount(0);
  await expect(demo.locator('p')).toHaveCount(0);

  const counter = page.getByTestId('empty-state-retry-count');
  await expect(counter).toHaveText('Retry clicked 0 times');
  const retry = demo.getByRole('button', { name: 'Retry' });
  await retry.focus();
  await expect(retry).toBeFocused();
  await retry.click();
  await expect(counter).toHaveText('Retry clicked 1 time');
  await page.keyboard.press('Enter');
  await expect(counter).toHaveText('Retry clicked 2 times');

  await demo.screenshot({
    path: '../../artifacts/005-uikit-requests/sf-4-emptystate-action-slot/evidence/retry-demo.png',
  });
  const a11y = await demo.ariaSnapshot();
  expect(a11y).toContain('button "Retry"');
  expect(a11y).not.toContain('img');

  // SC-002: the existing default demo (icon omitted) still shows the default icon.
  const defaultIcons = await page.locator('svg.lucide-file-text').count();
  expect(defaultIcons).toBeGreaterThan(0);
});
