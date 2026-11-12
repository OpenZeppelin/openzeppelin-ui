/**
 * 006 SF-5 · LoadingButton keeps focus while loading, proven in the running example app
 * (INV-13, with INV-12's Tab and axe checks).
 *
 * Scenario 1 / 4: a keyboard press on a loading button never moves focus off it, from the
 * keypress until the "Done!" label shows. Scenario 2: the "In Form Context" demo is a real
 * form; while it is loading, Enter in a field, Enter, Space and a mouse click on the button
 * don't submit again. Scenario 3: a consumer-disabled button is still natively disabled.
 *
 * Playwright treats `aria-disabled="true"` as not actionable, so the mouse click on the
 * loading button passes `force: true`. It is still a real mouse press.
 */
import { createRequire } from 'node:module';
import { expect, test, type Locator, type Page } from 'playwright/test';

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

async function openDemo(page: Page): Promise<Locator> {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByText('Data Display', { exact: true }).first().waitFor({ state: 'attached' });
  await clickVisibleText(page, 'Data Display');
  await clickVisibleText(page, 'LoadingButton');
  const section = page.locator('section').filter({
    has: page.getByRole('heading', { level: 2, name: 'LoadingButton', exact: true }),
  });
  await expect(section).toHaveCount(1);
  return section;
}

const isFocused = (locator: Locator): Promise<boolean> =>
  locator.evaluate((el) => el === document.activeElement);

test('S1/S4: Enter on the Basic button keeps focus on it from the keypress until "Done!"', async ({
  page,
}) => {
  const section = await openDemo(page);
  const button = section.getByRole('button', { name: 'Click to Load' });
  await button.focus();
  await expect.poll(() => isFocused(button)).toBe(true);

  // Sample focus and the loading attributes every animation frame, in the page, until the
  // label changes to "Done!". Polling from the test process would miss short focus losses.
  await button.evaluate((el) => {
    const samples: Array<{
      focused: boolean;
      ariaDisabled: string | null;
      ariaBusy: string | null;
      spinner: boolean;
      disabled: boolean;
    }> = [];
    const w = window as unknown as { __sf5Samples: typeof samples; __sf5Done: boolean };
    w.__sf5Samples = samples;
    w.__sf5Done = false;
    const tick = (): void => {
      samples.push({
        focused: document.activeElement === el,
        ariaDisabled: el.getAttribute('aria-disabled'),
        ariaBusy: el.getAttribute('aria-busy'),
        spinner: el.querySelector('svg.animate-spin') !== null,
        disabled: (el as HTMLButtonElement).disabled,
      });
      if (el.textContent?.includes('Done!')) {
        w.__sf5Done = true;
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await page.keyboard.press('Enter');
  await expect(section.getByRole('button', { name: 'Done!' })).toBeVisible({ timeout: 5_000 });
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __sf5Done: boolean }).__sf5Done))
    .toBe(true);

  const samples = await page.evaluate(
    () =>
      (
        window as unknown as {
          __sf5Samples: Array<{
            focused: boolean;
            ariaDisabled: string | null;
            ariaBusy: string | null;
            spinner: boolean;
            disabled: boolean;
          }>;
        }
      ).__sf5Samples
  );
  const loadingSamples = samples.filter((s) => s.ariaBusy === 'true');
  // About two seconds of loading at ~60 fps; a handful is enough to show the state was seen.
  expect(loadingSamples.length).toBeGreaterThan(10);
  expect(samples.every((s) => s.focused)).toBe(true);
  for (const s of loadingSamples) {
    expect(s).toMatchObject({ ariaDisabled: 'true', spinner: true, disabled: false });
  }
  // The button is the same node after loading, and still focused.
  expect(await isFocused(section.getByRole('button', { name: 'Done!' }))).toBe(true);
});

test('S2: while the form demo is loading, no activation submits it again; after it ends, Enter does', async ({
  page,
}) => {
  const section = await openDemo(page);
  const form = section.locator('form');
  const amount = form.locator('#loading-button-form-amount');
  const button = form.locator('button[type="submit"]');
  const counter = form.getByTestId('loading-button-form-submits');

  await expect(form).toHaveJSProperty('noValidate', true);
  await expect(counter).toHaveText('Submitted 0 times');

  await amount.fill('1.5');
  await amount.press('Enter');
  await expect(counter).toHaveText('Submitted 1 time');
  await expect(button).toHaveAttribute('aria-busy', 'true');
  await expect(button).toHaveAttribute('aria-disabled', 'true');
  await expect(button).toHaveJSProperty('disabled', false);
  expect(await isFocused(amount)).toBe(true);

  // Every blocked activation, while loading.
  await amount.press('Enter');
  expect(await isFocused(amount)).toBe(true);
  await button.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await button.click({ force: true });
  await expect(button).toHaveAttribute('aria-busy', 'true');
  expect(await isFocused(button)).toBe(true);
  await expect(counter).toHaveText('Submitted 1 time');

  // Sensitivity control: once loading ends, the same Enter submits again.
  await expect(button).not.toHaveAttribute('aria-busy', /.*/, { timeout: 5_000 });
  expect(await isFocused(button)).toBe(true);
  await amount.press('Enter');
  await expect(counter).toHaveText('Submitted 2 times');
});

test('S3: a consumer-disabled button stays natively disabled, with or without loading', async ({
  page,
}) => {
  const section = await openDemo(page);
  const disabled = section.getByRole('button', { name: 'Disabled', exact: true });
  await expect(disabled).toBeDisabled();
  await expect(disabled).not.toHaveAttribute('aria-busy', /.*/);

  const both = section.getByRole('button', { name: 'Both (spinner, stays disabled)' });
  await expect(both).toBeDisabled();
  await expect(both).toHaveAttribute('aria-busy', 'true');

  const loading = section.getByRole('button', { name: 'Loading', exact: true });
  await expect(loading).toHaveJSProperty('disabled', false);
  await expect(loading).toHaveAttribute('aria-disabled', 'true');
});

test('INV-12: Tab reaches a loading button, and axe finds no violation on the demo buttons', async ({
  page,
}) => {
  const section = await openDemo(page);
  const notLoading = section.getByRole('button', { name: 'Not Loading' });
  const loading = section.getByRole('button', { name: 'Loading...' });
  await expect(loading).toHaveAttribute('aria-busy', 'true');
  await notLoading.focus();
  await page.keyboard.press('Tab');
  expect(await isFocused(loading)).toBe(true);
  await page.keyboard.press('Shift+Tab');
  expect(await isFocused(notLoading)).toBe(true);

  await page.addScriptTag({ path: axeSource });
  const violations = await section.evaluate(async (root) => {
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
    const result = await axe.run(root, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    });
    // Report only violations on kit buttons; the demo's code block is example-app styling.
    return result.violations
      .map((v) => ({
        id: v.id,
        targets: v.nodes
          .map((n) => n.target.join(' '))
          .filter((t) => {
            const el = document.querySelector(t);
            return el?.closest('[data-slot="button"]') !== null && el !== null;
          }),
      }))
      .filter((v) => v.targets.length > 0);
  });
  expect(violations).toEqual([]);
});
