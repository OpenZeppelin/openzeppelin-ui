/**
 * FieldLabelRow height with/without a chip in `labelEnd` (Chromium, real stylesheet).
 * Neighbour plain and chipped fields share one label-row height; the Badge stays fully
 * visible and does not overlap the input. Light and dark.
 */
import { expect, test, type Page } from 'playwright/test';

test.describe.configure({ timeout: 120_000 });

const frames = (page: Page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

const isDark = (page: Page) =>
  page.evaluate(() => document.documentElement.classList.contains('dark'));

async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  if ((await isDark(page)) !== (theme === 'dark')) await page.getByTestId('theme-toggle').click();
  await expect.poll(() => isDark(page)).toBe(theme === 'dark');
}

async function openLabelEndDemo(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByTestId('theme-toggle').waitFor({ timeout: 90_000 });

  const formFields = page.getByRole('button', { name: 'FormFields', exact: true }).first();
  if (!(await formFields.isVisible().catch(() => false))) {
    const gallery = page.getByRole('button', { name: /Component Gallery/ }).first();
    if (await gallery.isVisible().catch(() => false)) await gallery.click();
  }
  if (!(await formFields.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: 'Forms' }).first().click();
  }
  await formFields.click();
  await page.getByTestId('label-end-demo').waitFor();
  await page.getByTestId('label-end-height-pair').scrollIntoViewIfNeeded();
  await frames(page);
}

interface FieldMeasure {
  labelHeight: number | null;
  inputTop: number | null;
}

async function measureField(page: Page, testId: string): Promise<FieldMeasure> {
  return page.locator(`[data-testid="${testId}"]`).evaluate((root) => {
    const label =
      root.querySelector('[data-slot="field-label-row"]') ??
      root.querySelector('[data-slot="label"]') ??
      root.querySelector('label');
    const input = root.querySelector('input');
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return {
      labelHeight: labelBox ? Math.round(labelBox.height * 100) / 100 : null,
      inputTop: inputBox ? Math.round(inputBox.top * 100) / 100 : null,
    };
  });
}

/** True when an ancestor with clipping overflow would cut the element's box. */
async function clippedByAncestor(
  page: Page,
  testId: string
): Promise<{ clipped: boolean; height: number }> {
  return page.getByTestId(testId).evaluate((node) => {
    const rect = node.getBoundingClientRect();
    let parent = node.parentElement;
    while (parent && parent !== document.documentElement) {
      const style = getComputedStyle(parent);
      const ox = style.overflowX;
      const oy = style.overflowY;
      const clips =
        /(hidden|clip)/.test(ox) ||
        /(hidden|clip)/.test(oy) ||
        (/(auto|scroll)/.test(ox) && parent.scrollWidth > parent.clientWidth + 1) ||
        (/(auto|scroll)/.test(oy) && parent.scrollHeight > parent.clientHeight + 1);
      if (clips) {
        const pr = parent.getBoundingClientRect();
        if (
          rect.top < pr.top - 0.5 ||
          rect.bottom > pr.bottom + 0.5 ||
          rect.left < pr.left - 0.5 ||
          rect.right > pr.right + 0.5
        ) {
          return { clipped: true, height: rect.height };
        }
      }
      parent = parent.parentElement;
    }
    return { clipped: false, height: rect.height };
  });
}

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: plain and labelEnd chip rows share height; chip visible, no input overlap`, async ({
    page,
  }) => {
    await openLabelEndDemo(page);
    await setTheme(page, theme);
    await page.getByTestId('label-end-height-pair').scrollIntoViewIfNeeded();
    await frames(page);

    const plain = await measureField(page, 'label-end-plain-field');
    const withChip = await measureField(page, 'label-end-with-chip-field');
    const chip = page.getByTestId('label-end-height-chip');
    await chip.waitFor();

    expect(plain.labelHeight).not.toBeNull();
    expect(withChip.labelHeight).not.toBeNull();
    expect(plain.inputTop).not.toBeNull();
    expect(withChip.inputTop).not.toBeNull();

    expect(Math.abs((plain.labelHeight ?? 0) - (withChip.labelHeight ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((plain.inputTop ?? 0) - (withChip.inputTop ?? 0))).toBeLessThanOrEqual(1);

    const clip = await clippedByAncestor(page, 'label-end-height-chip');
    expect(clip.clipped).toBe(false);
    expect(clip.height).toBeGreaterThanOrEqual(18);

    const chipBox = await chip.boundingBox();
    expect(chipBox).not.toBeNull();
    expect(chipBox!.y + chipBox!.height).toBeLessThanOrEqual((withChip.inputTop ?? 0) + 0.5);

    const endMargin = await page
      .locator('[data-testid="label-end-with-chip-field"] [data-slot="field-label-end"]')
      .evaluate((el) => {
        const s = getComputedStyle(el);
        return { mt: s.marginTop, mb: s.marginBottom, overflow: s.overflow };
      });
    expect(endMargin.mt).toBe('-4px');
    expect(endMargin.mb).toBe('-4px');
    expect(endMargin.overflow).not.toMatch(/hidden|clip/);
  });
}

test('without labelEnd the label has no field-label-row wrapper', async ({ page }) => {
  await openLabelEndDemo(page);
  await setTheme(page, 'light');
  await frames(page);

  const hasRow = await page.locator('[data-testid="label-end-plain-field"]').evaluate((root) => ({
    row: root.querySelector('[data-slot="field-label-row"]') != null,
    end: root.querySelector('[data-slot="field-label-end"]') != null,
    label: root.querySelector('label') != null,
  }));
  expect(hasRow.row).toBe(false);
  expect(hasRow.end).toBe(false);
  expect(hasRow.label).toBe(true);
});
