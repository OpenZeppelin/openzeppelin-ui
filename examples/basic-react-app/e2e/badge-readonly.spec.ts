/**
 * Badge `readOnly`, proven in the running example app by mouse and keyboard, in light and dark.
 *
 * "Read-only" demo: held chips take focus by Tab, keep full colour and `aria-pressed`, announce
 * "Read-only" via `aria-describedby` (never `aria-readonly` / `aria-disabled`), and ignore click,
 * Enter, Space and programmatic clicks. `disabled` wins when both are set. The static badge stays
 * a plain span. axe finds no violation on the section.
 */
import { createRequire } from 'node:module';
import { expect, test, type Locator, type Page } from 'playwright/test';

const axeSource = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

type Theme = 'light' | 'dark';
const THEMES: readonly Theme[] = ['light', 'dark'];
const READ_ONLY_TEXT = 'Read-only';

async function openDemo(page: Page, theme: Theme): Promise<void> {
  await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
  await page.goto('/', { waitUntil: 'networkidle' });
  const groupButton = page.getByRole('button', { name: 'Data Display' }).first();
  await groupButton.waitFor({ timeout: 90_000 });
  const navItem = page.getByText('Badge', { exact: true }).first();
  if (!(await navItem.isVisible().catch(() => false))) await groupButton.click();
  await navItem.click();
  const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  expect(isDark, 'html.dark applied by the theme provider').toBe(theme === 'dark');
}

async function isFocused(locator: Locator): Promise<boolean> {
  return locator.evaluate((el) => el === document.activeElement);
}

/** Focuses the last tabbable element before `section` in document order. */
async function focusBefore(section: Locator): Promise<void> {
  await section.evaluate((root) => {
    const tabbable = Array.from(
      document.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]')
    ).filter(
      (el) =>
        el.tabIndex >= 0 &&
        !(el as HTMLButtonElement).disabled &&
        el.getClientRects().length > 0 &&
        root.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING
    );
    tabbable[tabbable.length - 1]?.focus();
  });
}

async function axeViolations(
  page: Page,
  section: Locator
): Promise<{ id: string; targets: string[] }[]> {
  await page.addScriptTag({ path: axeSource });
  return section.evaluate(async (root) => {
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
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
      },
      rules: { region: { enabled: false } },
    });
    return result.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target.join(' ')),
    }));
  });
}

for (const theme of THEMES) {
  test.describe(`${theme}`, () => {
    test('a read-only Badge takes focus, keeps colour and pressed, and never activates', async ({
      page,
    }) => {
      await openDemo(page, theme);
      const section = page.getByTestId('badge-readonly-demo');
      const count = page.getByTestId('badge-readonly-count');
      const heldOpen = section.getByRole('button', { name: 'Held open' });
      const heldClosed = section.getByRole('button', { name: 'Held closed' });
      const heldDisabled = section.getByRole('button', { name: 'Held + disabled' });
      await expect(count).toHaveText('Activations: 0');

      for (const [chip, pressed] of [
        [heldOpen, 'true'],
        [heldClosed, 'false'],
      ] as const) {
        await expect(chip).toBeEnabled();
        await expect(chip).toHaveAttribute('aria-pressed', pressed);
        await expect(chip).not.toHaveAttribute('aria-readonly');
        await expect(chip).not.toHaveAttribute('aria-disabled');
        await expect(chip).toHaveAccessibleDescription(READ_ONLY_TEXT);

        await chip.click();
        await chip.focus();
        await page.keyboard.press('Enter');
        await page.keyboard.press('Space');
        await chip.evaluate((el) => (el as HTMLElement).click());

        await expect(chip).toHaveAttribute('aria-pressed', pressed);
        expect(await isFocused(chip)).toBe(true);
        expect(await chip.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
      }
      await expect(count).toHaveText('Activations: 0');

      await expect(heldDisabled).toBeDisabled();
      await expect(heldDisabled).toHaveAttribute('aria-pressed', 'true');
      await expect(heldDisabled).not.toHaveAttribute('aria-readonly');
      await expect(heldDisabled).not.toHaveAccessibleDescription(READ_ONLY_TEXT);
      await heldDisabled.click({ force: true });
      await heldDisabled.evaluate((el) => {
        (document.activeElement as HTMLElement | null)?.blur();
        (el as HTMLElement).focus();
      });
      await page.keyboard.press('Enter');
      await page.keyboard.press('Space');
      await heldDisabled.evaluate((el) => (el as HTMLElement).click());
      expect(await heldDisabled.evaluate((el) => getComputedStyle(el).opacity)).toBe('0.5');
      await expect(count).toHaveText('Activations: 0');

      const staticBadge = section.getByText('Static', { exact: true });
      expect(await staticBadge.evaluate((el) => el.tagName)).toBe('SPAN');
      await expect(staticBadge).not.toHaveAttribute('aria-readonly');
      await expect(staticBadge).not.toHaveAttribute('aria-disabled');
      await expect(staticBadge).not.toHaveAttribute('aria-describedby');

      await focusBefore(section);
      await page.keyboard.press('Tab');
      expect(await isFocused(heldOpen)).toBe(true);
      await page.keyboard.press('Tab');
      expect(await isFocused(heldClosed)).toBe(true);
      await page.keyboard.press('Tab');
      expect(await isFocused(heldDisabled)).toBe(false);
      expect(await section.evaluate((root) => root.contains(document.activeElement))).toBe(false);

      expect(await axeViolations(page, section)).toEqual([]);
    });
  });
}
