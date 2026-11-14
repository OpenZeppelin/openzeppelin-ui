/**
 * Disabled Badge and read-only Switch, proven in the running example app by mouse and
 * keyboard, in light and dark.
 *
 * Badge "Disabled" demo: no click, Enter, Space or programmatic click activates a disabled chip,
 * the chips keep `aria-pressed`, dim, and leave the tab order; the static badge stays a plain
 * span. Switch "Read-only" demo: the read-only switches take focus by Tab, keep their colour at
 * full opacity, and ignore click, label click, Space, Enter and programmatic clicks; the
 * read-only + disabled one is skipped by Tab and dims. axe finds no violation in either section.
 *
 * Playwright refuses to click a disabled element (or its label), so pointer clicks on disabled
 * controls pass `force: true`. The click is still a real mouse press.
 */
import { createRequire } from 'node:module';
import { expect, test, type Locator, type Page } from 'playwright/test';

const axeSource = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

type Theme = 'light' | 'dark';
const THEMES: readonly Theme[] = ['light', 'dark'];

async function openDemo(page: Page, theme: Theme, group: string, item: string): Promise<void> {
  await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
  await page.goto('/', { waitUntil: 'networkidle' });
  const groupButton = page.getByRole('button', { name: group }).first();
  await groupButton.waitFor({ timeout: 90_000 });
  const navItem = page.getByText(item, { exact: true }).first();
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
    test('a disabled Badge never activates, keeps aria-pressed, dims and leaves the tab order', async ({
      page,
    }) => {
      await openDemo(page, theme, 'Data Display', 'Badge');
      const section = page.getByTestId('badge-disabled-demo');
      const count = page.getByTestId('badge-disabled-count');
      const open = section.getByRole('button', { name: 'Open' });
      const closed = section.getByRole('button', { name: 'Closed' });
      await expect(count).toHaveText('Activations: 0');

      for (const [chip, pressed] of [
        [open, 'true'],
        [closed, 'false'],
      ] as const) {
        await expect(chip).toBeDisabled();
        await expect(chip).toHaveAttribute('aria-pressed', pressed);
        await chip.click({ force: true });
        // Focus can't land on a disabled button; blur first so the keys go to the body, not to
        // whatever control had focus before.
        await chip.evaluate((el) => {
          (document.activeElement as HTMLElement | null)?.blur();
          (el as HTMLElement).focus();
        });
        await page.keyboard.press('Enter');
        await page.keyboard.press('Space');
        await chip.evaluate((el) => (el as HTMLElement).click());
        await expect(chip).toHaveAttribute('aria-pressed', pressed);
        expect(await chip.evaluate((el) => getComputedStyle(el).opacity)).toBe('0.5');
      }
      await expect(count).toHaveText('Activations: 0');

      const staticBadge = section.getByText('Static', { exact: true });
      expect(await staticBadge.evaluate((el) => el.tagName)).toBe('SPAN');
      await expect(staticBadge).not.toHaveAttribute('disabled');
      await expect(staticBadge).not.toHaveAttribute('aria-disabled');
      expect(await staticBadge.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');

      await focusBefore(section);
      await page.keyboard.press('Tab');
      expect(
        await section.evaluate((root) => root.contains(document.activeElement)),
        'Tab skips every control in the Disabled section'
      ).toBe(false);

      expect(await axeViolations(page, section)).toEqual([]);
    });

    test('a read-only Switch takes focus, keeps its colour and ignores every input', async ({
      page,
    }) => {
      await openDemo(page, theme, 'Inputs', 'Switch');
      const section = page.getByTestId('switch-readonly-demo');
      const changes = page.getByTestId('switch-readonly-changes');
      const on = page.locator('#switch-readonly-on');
      const off = page.locator('#switch-readonly-off');
      const both = page.locator('#switch-readonly-disabled');
      const basic = page.locator('#switch-notifications');
      await expect(changes).toHaveText('Changes: 0');

      for (const [sw, label, checked] of [
        [on, 'Read-only (on)', 'true'],
        [off, 'Read-only (off)', 'false'],
      ] as const) {
        await expect(sw).toHaveAttribute('aria-readonly', 'true');
        await expect(sw).toBeEnabled();
        await sw.click();
        await section.getByText(label, { exact: true }).click();
        await sw.focus();
        await page.keyboard.press('Space');
        await page.keyboard.press('Enter');
        await sw.evaluate((el) => (el as HTMLElement).click());
        await expect(sw).toHaveAttribute('aria-checked', checked);
        expect(await isFocused(sw)).toBe(true);
      }

      await expect(both).toBeDisabled();
      await expect(both).not.toHaveAttribute('aria-readonly');
      await both.click({ force: true });
      await section.getByText('Read-only and disabled', { exact: true }).click({ force: true });
      await expect(both).toHaveAttribute('aria-checked', 'true');
      await expect(changes).toHaveText('Changes: 0');

      // Tab: Basic switch → read-only on → read-only off → out of the section (read-only +
      // disabled is skipped).
      await focusBefore(section);
      await page.keyboard.press('Tab');
      expect(await isFocused(on)).toBe(true);
      await page.keyboard.press('Tab');
      expect(await isFocused(off)).toBe(true);
      await page.keyboard.press('Tab');
      expect(await isFocused(both)).toBe(false);
      expect(await section.evaluate((root) => root.contains(document.activeElement))).toBe(false);

      // Full colour with the real stylesheet: read-only matches an editable switch in the same
      // state, at opacity 1; read-only + disabled dims.
      const look = (sw: Locator): Promise<{ bg: string; opacity: string }> =>
        sw.evaluate((el) => {
          const cs = getComputedStyle(el);
          return { bg: cs.backgroundColor, opacity: cs.opacity };
        });
      await expect(basic).toHaveAttribute('aria-checked', 'false');
      const basicOff = await look(basic);
      await basic.click();
      await expect(basic).toHaveAttribute('aria-checked', 'true');
      // Wait out the colour transition before reading the checked colour.
      await expect.poll(async () => (await look(basic)).bg).toBe((await look(on)).bg);
      expect(await look(on)).toEqual({ bg: (await look(basic)).bg, opacity: '1' });
      expect(await look(off)).toEqual({ bg: basicOff.bg, opacity: '1' });
      expect((await look(both)).opacity).toBe('0.5');

      expect(await axeViolations(page, section)).toEqual([]);
    });
  });
}
