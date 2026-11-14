import { expect, test, type Locator, type Page } from 'playwright/test';

/**
 * DescriptionList label width, five columns, span and optional dividers — measured in
 * Chromium against the real kit CSS in the example app.
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
  width: number;
  right: number;
  bottom: number;
}

async function boxes(list: Locator, selector: string): Promise<Box[]> {
  return list.locator(selector).evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, right: r.right, bottom: r.bottom };
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

async function pairMetrics(pair: Locator): Promise<{
  labelShare: number;
  labelWidth: number;
  valueWidth: number;
  pairWidth: number;
  beside: boolean;
}> {
  return pair.evaluate((el) => {
    const dt = el.querySelector('dt');
    const dd = el.querySelector('dd');
    if (!dt || !dd) throw new Error('pair missing dt/dd');
    const pairBox = el.getBoundingClientRect();
    const dtBox = dt.getBoundingClientRect();
    const ddBox = dd.getBoundingClientRect();
    return {
      labelShare: dtBox.width / pairBox.width,
      labelWidth: dtBox.width,
      valueWidth: ddBox.width,
      pairWidth: pairBox.width,
      beside: ddBox.x > dtBox.right - 1,
    };
  });
}

test.describe('DescriptionList layout follow-ups (wide viewport)', () => {
  test.beforeEach(async ({ page }) => openDemo(page, 1440));

  test('S1 short label is content-sized, not a third of the row', async ({ page }) => {
    const list = page.getByTestId('description-list-label-width');
    const shortPair = list.locator('dl > div').nth(1); // "Amount"
    const metrics = await pairMetrics(shortPair);
    expect(metrics.beside).toBe(true);
    // Fixed 1/3 track would be ~0.33; content-sized "Amount" stays well under a quarter.
    expect(metrics.labelShare).toBeLessThan(0.25);
    expect(metrics.valueWidth).toBeGreaterThan(metrics.labelWidth);
  });

  test('S1 long label does not squeeze the value to nothing in a narrow card', async ({ page }) => {
    const list = page.getByTestId('description-list-label-width');
    const longPair = list.locator('dl > div').first(); // "Settlement destination network"
    const metrics = await pairMetrics(longPair);
    expect(metrics.beside).toBe(true);
    // Content-sized long label owns most of the narrow card but leaves a usable value track.
    expect(metrics.labelShare).toBeGreaterThan(0.5);
    expect(metrics.labelShare).toBeLessThan(0.85);
    expect(metrics.valueWidth).toBeGreaterThan(24);
    expect(
      await longPair.locator('dd').evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
    ).toBe(true);
  });

  test('S2 five columns with a full-row span and vertical rules between columns', async ({
    page,
  }) => {
    const list = page.getByTestId('description-list-five-columns-span');
    const pairs = await boxes(list, 'dl > div');
    expect(pairs).toHaveLength(8);
    // First row: five tracks; span row: one full-width pair; then F/G.
    expect(distinct(pairs.slice(0, 5).map((b) => b.x))).toBe(5);
    const listBox = await list.locator('dl').boundingBox();
    expect(listBox).not.toBeNull();
    expect(Math.abs(pairs[5].width - (listBox?.width ?? 0))).toBeLessThanOrEqual(2);
    expect(pairs[5].x).toBeLessThanOrEqual(pairs[0].x + 1);

    const ruled = await list
      .locator('dl > div')
      .nth(1)
      .evaluate((el) => {
        const before = getComputedStyle(el, '::before');
        return {
          position: before.position,
          width: before.width,
          background: before.backgroundColor,
        };
      });
    expect(ruled.position).toBe('absolute');
    expect(parseFloat(ruled.width)).toBeGreaterThan(0);
    expect(ruled.background).not.toBe('rgba(0, 0, 0, 0)');

    const spanRuled = await list
      .locator('dl > div')
      .nth(5)
      .evaluate((el) => {
        const before = getComputedStyle(el, '::before');
        return before.width;
      });
    expect(spanRuled === '0px' || spanRuled === 'auto').toBe(true);
    await noOverflow(page, list);
  });

  test('S3 dividers={false} omits row rules; default keeps them', async ({ page }) => {
    const off = page.getByTestId('description-list-no-dividers').locator('dl');
    const on = page.getByTestId('description-list-review').locator('dl');
    await expect(off).not.toHaveClass(/divide-y/);
    await expect(on).toHaveClass(/divide-y/);

    const borderBetween = async (list: Locator): Promise<number> => {
      const first = list.locator('dl > div').first();
      return first.evaluate((el) => parseFloat(getComputedStyle(el).borderBottomWidth) || 0);
    };
    // divide-y puts the rule on children via border; without it, border width stays 0.
    expect(await borderBetween(page.getByTestId('description-list-no-dividers'))).toBe(0);
  });
});

test.describe('DescriptionList layout follow-ups (narrow viewport)', () => {
  test.beforeEach(async ({ page }) => openDemo(page, 375));

  test('S2 five-column list falls back to one column without horizontal overflow', async ({
    page,
  }) => {
    const list = page.getByTestId('description-list-five-columns-span');
    const pairs = await boxes(list, 'dl > div');
    expect(distinct(pairs.map((b) => b.x))).toBe(1);
    expect(distinct(pairs.map((b) => b.y))).toBe(pairs.length);
    await noOverflow(page, list);
  });

  test('S1 default list still stacks under the label at 375', async ({ page }) => {
    const pair = page.getByTestId('description-list-label-width').locator('dl > div').first();
    const [dt] = await boxes(pair, 'dt');
    const [dd] = await boxes(pair, 'dd');
    expect(dd.y).toBeGreaterThanOrEqual(dt.bottom - 1);
  });
});
