/**
 * Prove-it: NetworkStatusBadge `size="sm"` is shorter/tighter than default in the
 * running example app (padding + testnet border width), with text contrast still
 * meeting AA on bg-background and bg-muted in light and dark.
 */
import { createRequire } from 'node:module';
import { expect, test, type Page } from 'playwright/test';

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

async function openNetworkDemo(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style');
      s.textContent = '*, *::before, *::after { transition: none !important; }';
      document.head.append(s);
    });
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page
    .getByText('Network Management', { exact: true })
    .first()
    .waitFor({ state: 'attached' });
  await clickVisibleText(page, 'Network Management');
  await page.getByTestId('network-badge-size-demo').waitFor({ state: 'visible' });
  const toggle = page.getByTestId('theme-toggle');
  await toggle.waitFor({ timeout: 90_000 });
  const isDark = () => page.evaluate(() => document.documentElement.classList.contains('dark'));
  if ((await isDark()) !== (theme === 'dark')) await toggle.click();
  await expect.poll(isDark).toBe(theme === 'dark');
}

interface BadgeMetrics {
  height: number;
  paddingLeft: number;
  paddingTop: number;
  borderTopWidth: number;
  borderStyle: string;
}

async function badgeMetrics(page: Page, rowTestId: string): Promise<BadgeMetrics> {
  return page.locator(`[data-testid="${rowTestId}"]`).evaluate((row) => {
    const badge = row.querySelector('.inline-flex') as HTMLElement | null;
    if (!badge) throw new Error(`no badge under ${row.getAttribute('data-testid')}`);
    const cs = getComputedStyle(badge);
    return {
      height: badge.getBoundingClientRect().height,
      paddingLeft: parseFloat(cs.paddingLeft),
      paddingTop: parseFloat(cs.paddingTop),
      borderTopWidth: parseFloat(cs.borderTopWidth),
      borderStyle: cs.borderTopStyle,
    };
  });
}

async function contrastRatio(page: Page, rootTestId: string): Promise<number[]> {
  return page.locator(`[data-testid="${rootTestId}"]`).evaluate((root) => {
    const cx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext(
      '2d',
      { willReadFrequently: true }
    )!;
    const rgb = (css: string): [number, number, number] => {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = '#000';
      cx.fillStyle = css;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2]];
    };
    const lin = (c: number) => {
      const s = c / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const lum = ([r, g, b]: [number, number, number]) =>
      0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const ratio = (fg: string, bg: string) => {
      const L1 = lum(rgb(fg));
      const L2 = lum(rgb(bg));
      const lighter = Math.max(L1, L2);
      const darker = Math.min(L1, L2);
      return (lighter + 0.05) / (darker + 0.05);
    };
    const badge = root.querySelector('.inline-flex') as HTMLElement | null;
    if (!badge) return [];
    const name = badge.querySelector('.text-xs.font-medium:not(.uppercase)') as HTMLElement | null;
    const eco = badge.querySelector('.uppercase') as HTMLElement | null;
    const out: number[] = [];
    for (const el of [name, eco].filter(Boolean) as HTMLElement[]) {
      const cs = getComputedStyle(el);
      out.push(ratio(cs.color, getComputedStyle(badge).backgroundColor));
    }
    return out;
  });
}

test.describe('NetworkStatusBadge size', () => {
  test('sm is shorter and tighter than default; testnet border scales', async ({ page }) => {
    test.setTimeout(120_000);
    await openNetworkDemo(page, 'light');

    const defMain = await badgeMetrics(page, 'size-default-mainnet');
    const smMain = await badgeMetrics(page, 'size-sm-mainnet');
    const defTest = await badgeMetrics(page, 'size-default-testnet');
    const smTest = await badgeMetrics(page, 'size-sm-testnet');

    expect(smMain.height).toBeLessThan(defMain.height);
    expect(smMain.paddingLeft).toBeLessThan(defMain.paddingLeft);
    expect(smMain.paddingTop).toBeLessThan(defMain.paddingTop);
    expect(defMain.borderTopWidth).toBe(0);
    expect(smMain.borderTopWidth).toBe(0);

    // Code Draft measured ~32 vs ~24 (mainnet) and ~36 vs ~26 (testnet).
    expect(defMain.height).toBeGreaterThanOrEqual(30);
    expect(smMain.height).toBeLessThanOrEqual(28);
    expect(defTest.height).toBeGreaterThan(smTest.height);
    expect(defTest.borderStyle).toBe('dashed');
    expect(smTest.borderStyle).toBe('dashed');
    expect(defTest.borderTopWidth).toBe(2);
    expect(smTest.borderTopWidth).toBe(1);
    expect(smTest.borderTopWidth).toBeGreaterThan(0);

    await expect(page.getByTestId('size-sm-header-row')).toBeVisible();
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`sm text contrast meets AA on muted and background (${theme})`, async ({ page }) => {
      test.setTimeout(120_000);
      await openNetworkDemo(page, theme);

      const onMuted = await contrastRatio(page, 'size-sm-on-muted');
      const onHeader = await contrastRatio(page, 'size-sm-header-row');
      expect(onMuted.length).toBeGreaterThan(0);
      expect(onHeader.length).toBeGreaterThan(0);
      for (const r of [...onMuted, ...onHeader]) {
        expect(r).toBeGreaterThanOrEqual(4.5);
      }

      await page.addScriptTag({ path: axeSource });
      const violations = await page.evaluate(async () => {
        const axe = (
          window as unknown as {
            axe: {
              run: (
                c: Element,
                o: object
              ) => Promise<{ violations: { id: string; nodes: unknown[] }[] }>;
            };
          }
        ).axe;
        const root = document.querySelector('[data-testid="network-badge-size-demo"]');
        if (!root) throw new Error('network-badge-size-demo missing');
        const res = await axe.run(root, {
          runOnly: { type: 'rule', values: ['color-contrast'] },
        });
        return res.violations.map((v) => ({ id: v.id, nodes: v.nodes.length }));
      });
      expect(violations).toEqual([]);
    });
  }
});
