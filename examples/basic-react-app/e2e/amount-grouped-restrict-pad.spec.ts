/**
 * Prove-it-works: grouped exact AmountField with restrictInput + padDecimals in the
 * example app ("Amount Field: grouped restrictInput and padDecimals" on FormFields).
 *
 * Seeds 123000, decimals 2: unfocused shows 123,000.00; focus shows 123000; a letter
 * and a third decimal are refused; Backspace still works; form value stays plain.
 */
import { createRequire } from 'node:module';
import { expect, test, type Locator, type Page } from 'playwright/test';

const axeSource = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

async function clickVisibleText(page: Page, text: string): Promise<void> {
  for (const match of await page.getByText(text, { exact: true }).all()) {
    if (await match.isVisible()) {
      await match.click();
      return;
    }
  }
  throw new Error(`No visible "${text}" navigation item`);
}

async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.classList.toggle('light', t === 'light');
  }, theme);
}

interface Demo {
  readonly section: Locator;
  readonly input: Locator;
  readonly formValue: () => Promise<string>;
  readonly seed: () => Promise<void>;
}

async function openDemo(page: Page): Promise<Demo> {
  await page.setViewportSize({ width: 1280, height: 1400 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Forms' }).first().waitFor({ timeout: 90_000 });
  await clickVisibleText(page, 'Forms');
  await clickVisibleText(page, 'FormFields');
  const section = page.locator('section[aria-labelledby="amount-grouped-restrict-pad-heading"]');
  const heading = page.getByRole('heading', {
    name: 'Amount Field: grouped restrictInput and padDecimals',
  });
  await heading.waitFor({ timeout: 90_000 });
  await heading.scrollIntoViewIfNeeded();
  const field = page.getByTestId('amount-grouped-restrict-pad-field');
  const input = field.getByRole('textbox');
  return {
    section,
    input,
    formValue: async () => page.getByTestId('amount-grouped-restrict-pad-form-value').innerText(),
    seed: async () => {
      await page.getByTestId('amount-grouped-restrict-pad-seed').click();
    },
  };
}

test.describe('AmountField grouped restrictInput + padDecimals (example app)', () => {
  test('pad on blur, plain on focus, refuse letter and third decimal, allow Backspace', async ({
    page,
  }) => {
    const demo = await openDemo(page);
    await demo.seed();
    await expect(demo.input).toHaveValue('123,000.00');
    expect(await demo.formValue()).toBe('"123000"');

    await demo.input.click();
    await expect(demo.input).toHaveValue('123000');
    expect(await demo.formValue()).toBe('"123000"');

    await demo.input.press('End');
    await page.keyboard.type('a');
    await expect(demo.input).toHaveValue('123000');
    expect(await demo.formValue()).toBe('"123000"');

    await page.keyboard.type('.12');
    await expect(demo.input).toHaveValue('123000.12');
    await page.keyboard.type('3');
    await expect(demo.input).toHaveValue('123000.12');

    await page.keyboard.press('Backspace');
    await expect(demo.input).toHaveValue('123000.1');
    expect(await demo.formValue()).toBe('"123000.1"');

    await page.getByTestId('amount-grouped-restrict-pad-submit').click();
    // Blur via submit click ends the session → padded display.
    await expect(demo.input).toHaveValue('123,000.10');
    expect(await demo.formValue()).toBe('"123000.1"');
  });

  test('axe: no new violation kinds vs the sibling grouped-display section', async ({ page }) => {
    const demo = await openDemo(page);
    await page.addScriptTag({ path: axeSource });

    const scan = async (selector: string): Promise<string[]> =>
      page.evaluate(async (sel) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const axe = (window as any).axe;
        const result = await axe.run(document.querySelector(sel) ?? document.body, {
          resultTypes: ['violations'],
        });
        return (result.violations as { id: string }[]).map((v) => v.id).sort();
      }, selector);

    for (const theme of ['light', 'dark'] as const) {
      await setTheme(page, theme);
      const baseline = await scan('section[aria-labelledby="amount-grouped-display-heading"]');
      const kinds = await scan('section[aria-labelledby="amount-grouped-restrict-pad-heading"]');
      for (const id of kinds) {
        expect(baseline, `${theme}: unexpected axe kind ${id}`).toContain(id);
      }
      void demo;
    }
  });
});
