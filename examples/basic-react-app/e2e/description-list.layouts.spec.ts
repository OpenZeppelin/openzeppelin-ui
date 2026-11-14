import { expect, test, type Locator, type Page } from 'playwright/test';

/**
 * DescriptionList layouts: column count, label-above-value, end alignment and the narrow
 * fallback, measured in Chromium against the real kit CSS.
 */

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

async function openDemo(page: Page, width: number): Promise<void> {
  // The sidebar is only clickable at a desktop width: navigate there, then resize.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByText('Data Display', { exact: true }).first().waitFor({ state: 'attached' });
  await clickVisibleText(page, 'Data Display');
  await clickVisibleText(page, 'DescriptionList');
  await expect(page.getByTestId('description-list-review')).toBeVisible();
  await page.setViewportSize({ width, height: 900 });
}

interface Box {
  x: number;
  y: number;
  right: number;
  bottom: number;
}

async function boxes(list: Locator, selector: string): Promise<Box[]> {
  return list.locator(selector).evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
    })
  );
}

const distinct = (values: number[]): number => new Set(values.map((v) => Math.round(v))).size;

async function noOverflow(page: Page, list: Locator): Promise<void> {
  const dl = list.locator('dl');
  expect(await dl.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
}

test.describe('DescriptionList layouts (wide viewport)', () => {
  test.beforeEach(async ({ page }) => openDemo(page, 1440));

  test('S1 default list: base classes, label beside value, one column', async ({ page }) => {
    const list = page.getByTestId('description-list-review');
    await expect(list.locator('dl')).toHaveClass('divide-y');
    const pair = list.locator('dl > div').first();
    await expect(pair).toHaveClass(
      'flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:grid sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-4'
    );
    const [dt] = await boxes(pair, 'dt');
    const [dd] = await boxes(pair, 'dd');
    expect(dd.x).toBeGreaterThan(dt.right - 1); // beside, not below
    expect(distinct((await boxes(list, 'dl > div')).map((b) => b.x))).toBe(1);
  });

  test('S2 stacked, two columns, end: two columns, label above value, value at the end', async ({
    page,
  }) => {
    const list = page.getByTestId('description-list-stacked-columns');
    const pairs = await boxes(list, 'dl > div');
    expect(pairs).toHaveLength(4);
    expect(distinct(pairs.map((b) => b.x))).toBe(2);
    expect(distinct(pairs.map((b) => b.y))).toBe(2);

    const n = await list.locator('dl > div').count();
    for (let i = 0; i < n; i++) {
      const pair = list.locator('dl > div').nth(i);
      const [box] = await boxes(pair, ':scope');
      const [dt] = await boxes(pair, 'dt');
      const [dd] = await boxes(pair, 'dd');
      expect(dd.y).toBeGreaterThanOrEqual(dt.bottom - 1); // value under label
      expect(dt.x).toBeLessThanOrEqual(box.x + 1); // label at the start
      expect(Math.abs(dd.right - box.right)).toBeLessThanOrEqual(1); // value at the end
    }
    // dl / dt / dd structure is unchanged
    expect(await list.locator('dl > div > dt + dd').count()).toBe(4);
    await noOverflow(page, list);
  });

  test('inline list with values at the end: label and value share a row, value at the end', async ({
    page,
  }) => {
    const list = page.getByTestId('description-list-end-aligned');
    const n = await list.locator('dl > div').count();
    for (let i = 0; i < n; i++) {
      const pair = list.locator('dl > div').nth(i);
      const [box] = await boxes(pair, ':scope');
      const [dt] = await boxes(pair, 'dt');
      const [dd] = await boxes(pair, 'dd');
      expect(dd.x).toBeGreaterThan(dt.right - 1);
      expect(Math.abs(dd.right - box.right)).toBeLessThanOrEqual(1);
    }
    await noOverflow(page, list);
  });

  test('three columns: three tracks at a wide viewport', async ({ page }) => {
    const list = page.getByTestId('description-list-three-columns');
    const pairs = await boxes(list, 'dl > div');
    expect(distinct(pairs.map((b) => b.x))).toBe(3);
    expect(distinct(pairs.map((b) => b.y))).toBe(2);
    await noOverflow(page, list);
  });

  test('three-column list steps down to two columns at the sm width', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    const list = page.getByTestId('description-list-three-columns');
    expect(distinct((await boxes(list, 'dl > div')).map((b) => b.x))).toBe(2);
    await noOverflow(page, list);
  });
});

test.describe('DescriptionList layouts (narrow viewport)', () => {
  test.beforeEach(async ({ page }) => openDemo(page, 375));

  test('S3 multi-column lists fall back to one column without horizontal overflow', async ({
    page,
  }) => {
    for (const id of ['description-list-stacked-columns', 'description-list-three-columns']) {
      const list = page.getByTestId(id);
      const pairs = await boxes(list, 'dl > div');
      expect(distinct(pairs.map((b) => b.x)), id).toBe(1);
      expect(distinct(pairs.map((b) => b.y)), id).toBe(pairs.length);
      await noOverflow(page, list);
    }
  });

  test('end-aligned values stay at the end when the pair stacks', async ({ page }) => {
    const list = page.getByTestId('description-list-end-aligned');
    const n = await list.locator('dl > div').count();
    for (let i = 0; i < n; i++) {
      const pair = list.locator('dl > div').nth(i);
      const [box] = await boxes(pair, ':scope');
      const [dt] = await boxes(pair, 'dt');
      const [dd] = await boxes(pair, 'dd');
      expect(dd.y).toBeGreaterThanOrEqual(dt.bottom - 1);
      expect(Math.abs(dd.right - box.right)).toBeLessThanOrEqual(1);
    }
    await noOverflow(page, list);
  });

  test('default list stacks the value under the label', async ({ page }) => {
    const pair = page.getByTestId('description-list-review').locator('dl > div').first();
    const [dt] = await boxes(pair, 'dt');
    const [dd] = await boxes(pair, 'dd');
    expect(dd.y).toBeGreaterThanOrEqual(dt.bottom - 1);
  });
});
