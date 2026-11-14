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

test('SidebarButton badge stays one line tall while a long label truncates', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await clickVisibleText(page, 'Layout');
  await clickVisibleText(page, 'Scaffold');

  const item = page.getByRole('button', {
    name: /Compliance checklist with a long label that should truncate/,
  });
  await item.waitFor({ state: 'visible' });

  const m = await item.evaluate((el) => {
    const badge = Array.from(el.querySelectorAll('span')).find((s) => s.textContent === 'DEMO-CHK');
    if (!badge) return { error: 'DEMO-CHK badge not found' as const };
    const label = el.querySelector('.truncate') as HTMLElement | null;
    const style = getComputedStyle(badge);
    return {
      badgeClientHeight: badge.clientHeight,
      badgeScrollHeight: badge.scrollHeight,
      whiteSpace: style.whiteSpace,
      flexShrink: style.flexShrink,
      rowHeight: el.getBoundingClientRect().height,
      labelTruncated: label ? label.scrollWidth > label.clientWidth : null,
      wrap: getComputedStyle(el).flexWrap,
    };
  });

  expect(m).not.toHaveProperty('error');
  if ('error' in m) return;

  expect(m.whiteSpace).toBe('nowrap');
  expect(m.flexShrink).toBe('0');
  expect(m.badgeClientHeight).toBe(m.badgeScrollHeight);
  expect(m.badgeClientHeight).toBeGreaterThan(0);
  expect(m.labelTruncated).toBe(true);
  expect(m.wrap).toBe('nowrap');
  expect(m.rowHeight).toBeLessThanOrEqual(48);
});

test('a long SidebarButton badge still does not wrap', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await clickVisibleText(page, 'Layout');
  await clickVisibleText(page, 'Scaffold');

  const longBadgeText = 'VERY-LONG-BADGE-CODE-THAT-EXCEEDS-NARROW-SIDEBAR';
  const item = page.getByRole('button', { name: new RegExp(`Short\\s+${longBadgeText}`) });
  await item.waitFor({ state: 'visible' });

  const m = await item.evaluate((el, text) => {
    const badge = Array.from(el.querySelectorAll('span')).find((s) => s.textContent === text);
    if (!badge) return { error: 'long badge not found' as const };
    const style = getComputedStyle(badge);
    return {
      badgeClientHeight: badge.clientHeight,
      badgeScrollHeight: badge.scrollHeight,
      whiteSpace: style.whiteSpace,
      flexShrink: style.flexShrink,
    };
  }, longBadgeText);

  expect(m).not.toHaveProperty('error');
  if ('error' in m) return;

  expect(m.whiteSpace).toBe('nowrap');
  expect(m.flexShrink).toBe('0');
  expect(m.badgeClientHeight).toBe(m.badgeScrollHeight);
});
