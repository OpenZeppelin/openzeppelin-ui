/**
 * SF-7 · The Add Alias dialog's network selector is named by its visible "Network" label, in the
 * running example app. AS-3: the accessibility tree names the trigger "Network", and axe finds no
 * `button-name` violation inside the dialog.
 */
import { createRequire } from 'node:module';
import { expect, test, type Page } from 'playwright/test';

const axeSource = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

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

test('AS-3: the network selector is named "Network" and axe reports no button-name violation', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByText('Account Alias', { exact: true }).first().waitFor({ state: 'attached' });
  await clickVisibleText(page, 'Account Alias');
  await page.getByRole('button', { name: 'Add Alias' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add Alias' });

  const trigger = dialog.getByRole('combobox', { name: 'Network', exact: true });
  await expect(trigger).toHaveAttribute('id', 'alias-network');
  await expect(dialog.locator('label[for="alias-network"]')).toHaveText('Network');
  await expect(dialog).toContainText('Network');
  await expect(dialog.locator('form')).toMatchAriaSnapshot('- combobox "Network"');

  await page.addScriptTag({ path: axeSource });
  const violations = await page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: { run: (c: Element, o: object) => Promise<{ violations: { id: string }[] }> };
      }
    ).axe;
    const root = document.querySelector('[role="dialog"]');
    if (!root) throw new Error('dialog not found');
    const result = await axe.run(root, { runOnly: ['button-name'] });
    return result.violations.map((v) => v.id);
  });
  expect(violations).toEqual([]);
});
