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

test('a long SidebarButton label truncates on one line and keeps the trailing slot inside', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await clickVisibleText(page, 'Layout');
  await clickVisibleText(page, 'Scaffold');
  const dot = page.getByTestId('sidebar-long-label-dot');
  await dot.waitFor({ state: 'attached' });
  const item = page.getByRole('button', { name: /A very long contract label/ });

  const m = await item.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const label = el.querySelector('.truncate') as HTMLElement;
    const d = el.querySelector('[data-testid="sidebar-long-label-dot"]') as HTMLElement;
    const dr = d.getBoundingClientRect();
    return {
      height: r.height,
      right: r.right,
      dotRight: dr.right,
      dotLeft: dr.left,
      dotTop: dr.top,
      itemTop: r.top,
      itemBottom: r.bottom,
      dotBottom: dr.bottom,
      clipped: label.scrollWidth > label.clientWidth,
      wrap: getComputedStyle(el).flexWrap,
      ellipsis: getComputedStyle(label).textOverflow,
    };
  });

  expect(m.wrap).toBe('nowrap');
  expect(m.ellipsis).toBe('ellipsis');
  expect(m.clipped).toBe(true);
  expect(m.height).toBeLessThanOrEqual(48);
  expect(m.dotRight).toBeLessThanOrEqual(m.right);
  expect(m.dotTop).toBeGreaterThanOrEqual(m.itemTop);
  expect(m.dotBottom).toBeLessThanOrEqual(m.itemBottom);
});
