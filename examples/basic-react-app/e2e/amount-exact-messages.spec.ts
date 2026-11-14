/**
 * The "Transfer amount" field in the Validation messages demo (FormFields page), in the
 * running app, light and dark: an exact-entry AmountField whose `validation.messages` word
 * its malformed-text, decimals, min and max errors.
 *
 * - Typing `1.2.3`, `12.345`, `5` and `5000` shows each custom text as the visible error and
 *   as the text of an element the input's `aria-describedby` references.
 * - A valid value clears the error; the field is optional, so the form still submits with it
 *   empty and the payload carries `transferAmount: ""`.
 * - axe, compared by kind with the demo before this field existed (the 006 tip, measured in
 *   both themes, pristine and after an empty submit): `aria-allowed-attr` on the Limits map
 *   and `color-contrast` inside the payload code sample. Nothing else may appear, and nothing
 *   inside the new field.
 */
import { createRequire } from 'node:module';
import { expect, test, type Locator, type Page } from 'playwright/test';

const axeSource = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

const CUSTOM: ReadonlyArray<[string, string, string]> = [
  ['1.2.3', 'Enter an amount like 1,234.56', 'Only one decimal point is allowed'],
  ['12.345', 'Use cents at most: two decimal places', 'Use at most 2 decimal places'],
  ['5', 'The minimum transfer is 10', 'Value must be at least 10'],
  ['5000', 'The maximum transfer is 1,000', 'Value must be at most 1000'],
];

/** axe kinds on the demo section at the 006 tip (where = data-testid, or the code sample). */
const TIP_KINDS = ['aria-allowed-attr @ vm-limits-field', 'color-contrast @ code-sample'];

// The app boots wallet adapters before the gallery renders, which is slow on a loaded machine.
test.describe.configure({ timeout: 120_000 });

const isDark = (page: Page) =>
  page.evaluate(() => document.documentElement.classList.contains('dark'));

async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  if ((await isDark(page)) !== (theme === 'dark')) await page.getByTestId('theme-toggle').click();
  await expect.poll(() => isDark(page)).toBe(theme === 'dark');
}

async function clickVisibleText(page: Page, text: string): Promise<void> {
  for (const match of await page.getByText(text, { exact: true }).all()) {
    if (await match.isVisible()) {
      await match.click();
      return;
    }
  }
  throw new Error(`No visible "${text}" navigation item`);
}

async function openDemo(page: Page, theme: 'light' | 'dark', errors: string[]): Promise<Locator> {
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1280, height: 1600 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByTestId('theme-toggle').waitFor({ timeout: 90_000 });
  await setTheme(page, theme);
  await clickVisibleText(page, 'Forms');
  await clickVisibleText(page, 'FormFields');
  const form = page.getByTestId('validation-messages-form');
  await form.waitFor({ timeout: 90_000 });
  await page.getByTestId('vm-transfer-amount-field').scrollIntoViewIfNeeded();
  return form;
}

/** Texts of the elements the input's aria-describedby names; a missing id reads as such. */
async function describedTexts(input: Locator): Promise<string[]> {
  return input.evaluate((el) =>
    (el.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent ?? `<missing #${id}>`)
  );
}

/** axe violation kinds inside the demo section, as `id @ where`. */
async function axeKinds(page: Page): Promise<string[]> {
  await page.addScriptTag({ path: axeSource });
  const kinds = await page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: {
          run: (
            c: Element,
            o: object
          ) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }>;
        };
      }
    ).axe;
    const section = document
      .querySelector('[data-testid="validation-messages-form"]')
      ?.closest('section');
    if (!section) throw new Error('Validation messages section not found');
    const r = await axe.run(section, { resultTypes: ['violations'] });
    return r.violations.flatMap((v) =>
      v.nodes.map((n) => {
        const el = document.querySelector(n.target[0]);
        const owner = el?.closest('[data-testid]');
        const where = el?.closest('pre')
          ? 'code-sample'
          : (owner?.getAttribute('data-testid') ?? n.target.join(' '));
        return `${v.id} @ ${where}`;
      })
    );
  });
  return Array.from(new Set(kinds)).sort();
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`Transfer amount custom messages (${theme})`, () => {
    test('each custom text is the visible error and the referenced description', async ({
      page,
    }) => {
      const errors: string[] = [];
      await openDemo(page, theme, errors);
      const field = page.getByTestId('vm-transfer-amount-field');
      const input = page.locator('#vmTransferAmount');
      const error = page.locator('#vmTransferAmount-error');

      for (const [value, custom, defaultText] of CUSTOM) {
        await input.fill(value);
        await page.keyboard.press('Tab');
        await expect(error, value).toHaveText(custom);
        await expect(error).toHaveAttribute('role', 'alert');
        await expect(error).toBeVisible();
        await expect(input).toHaveAttribute('aria-invalid', 'true');
        await expect(input).toHaveAttribute('aria-errormessage', 'vmTransferAmount-error');
        const texts = await describedTexts(input);
        expect(texts, value).toContain(custom);
        expect(texts.join('|'), value).not.toMatch(/<missing/);
        await expect(field.getByText(defaultText, { exact: true })).toHaveCount(0);
      }

      // Valid values clear the error: on a bound, and with grouping.
      for (const value of ['250.50', '10', '1,000']) {
        await input.fill(value);
        await page.keyboard.press('Tab');
        await expect(error, value).toHaveCount(0);
        await expect(input).toHaveAttribute('aria-invalid', 'false');
      }
      expect(errors).toEqual([]);
    });

    test('axe: same kinds as the 006 tip, nothing inside the new field', async ({ page }) => {
      const errors: string[] = [];
      await openDemo(page, theme, errors);
      await page.setViewportSize({ width: 1280, height: 6000 });
      await page.evaluate(() => window.scrollTo(0, 0));

      const pristine = await axeKinds(page);
      expect(pristine.filter((k) => !TIP_KINDS.includes(k))).toEqual([]);

      // Empty submit (the tip's error state), then a custom transfer error on top.
      await page.getByTestId('validation-messages-submit').focus();
      await page.keyboard.press('Enter');
      await page.locator('#vmTransferAmount').fill('5');
      await page.keyboard.press('Tab');
      await expect(page.locator('#vmTransferAmount-error')).toHaveText(
        'The minimum transfer is 10'
      );
      const withErrors = await axeKinds(page);
      expect(withErrors.filter((k) => !TIP_KINDS.includes(k))).toEqual([]);
      expect(withErrors.filter((k) => k.endsWith('@ vm-transfer-amount-field'))).toEqual([]);
      expect(errors).toEqual([]);
    });
  });
}

test('the optional field never blocks an otherwise valid submit; an invalid value does', async ({
  page,
}) => {
  const errors: string[] = [];
  const form = await openDemo(page, 'light', errors);
  expect(await form.evaluate((f) => (f as HTMLFormElement).noValidate)).toBe(true);

  // The intro copy counts the new field, and it sits before the no-messages field.
  await expect(page.getByText(/The first five fields set custom messages/)).toBeVisible();
  const order = await page.evaluate(() => {
    const transfer = document.querySelector('[data-testid="vm-transfer-amount-field"]');
    const plain = document.getElementById('vmDefaultName');
    return !!transfer && !!plain && !!(transfer.compareDocumentPosition(plain) & 4);
  });
  expect(order).toBe(true);

  await page.locator('#vmDisplayName').fill('Treasury team');
  await page.locator('#vmAmount').fill('5');
  await page
    .getByRole('button', { name: /^Countries/ })
    .first()
    .click();
  await page.getByRole('combobox', { name: 'Search countries' }).fill('Canada');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  const limits = page.getByTestId('vm-limits-field');
  await limits.getByRole('button', { name: 'Add Item' }).click();
  await limits.getByPlaceholder('Limit name').first().fill('daily_cap');
  await limits.getByPlaceholder('Value').first().fill('1');
  await page.locator('#vmDefaultName').fill('ops');

  const submit = page.getByTestId('validation-messages-submit');
  const count = page.getByTestId('validation-messages-submit-count');

  // An invalid transfer amount blocks the submit with its custom text.
  await page.locator('#vmTransferAmount').fill('12.345');
  await submit.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#vmTransferAmount-error')).toHaveText(
    'Use cents at most: two decimal places'
  );
  await expect(count).toHaveText('Submitted 0 times');

  // Emptied, the optional field lets the form through.
  await page.locator('#vmTransferAmount').fill('');
  await submit.focus();
  await page.keyboard.press('Enter');
  await expect(count).toHaveText('Submitted 1 time');
  await expect(page.getByTestId('validation-messages-payload')).toContainText(
    '"transferAmount": ""'
  );
  expect(errors).toEqual([]);
});
