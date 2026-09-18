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

test('built DataTable advances its virtual window in the Strict Mode example app', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByText('Data Display', { exact: true }).first().waitFor({ state: 'attached' });
  await clickVisibleText(page, 'Data Display');
  await clickVisibleText(page, 'DataTable');

  const table = page.getByRole('table', { name: 'Large catalog (virtualized)' });
  await expect(table).toBeVisible();
  const wrapper = table.locator('xpath=..');
  await wrapper.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  await expect
    .poll(() =>
      wrapper
        .locator('[data-slot="data-table-row"]')
        .evaluateAll((rows) =>
          rows.some(
            (row) => Number(row.getAttribute('data-row-key')?.replace('catalog-', '')) >= 181
          )
        )
    )
    .toBe(true);
});
