/**
 * 006 SF-12 (prove-it-works): the example app applies the persisted theme before first paint.
 *
 * Two layers per case (stored dark, stored light, nothing stored, storage throws, plus the
 * `system` setting under a dark and a light OS):
 *
 * - Shell only: the app bundle is blocked, so the root class comes from the inline script in
 *   `index.html` alone. Proves the script, not the provider, paints the first frame.
 * - Full app: a MutationObserver installed before any page script records every root-class
 *   state (including the one before each change) and the class at the first paint entries.
 *   Every observed theme must be the expected one: no light-then-dark (or dark-then-light)
 *   flip, and the provider's mount must not change it.
 *
 * With nothing stored, or when storage throws, the provider's default (`light`) wins, not the OS
 * preference.
 */
import { expect, test, type Page } from 'playwright/test';

type Theme = 'light' | 'dark';

interface Case {
  name: string;
  expected: Theme;
  colorScheme: 'light' | 'dark';
  os: Theme;
  stored: string | null;
  storageThrows?: boolean;
}

const cases: Case[] = [
  { name: 'stored dark', expected: 'dark', colorScheme: 'dark', os: 'light', stored: 'dark' },
  { name: 'stored light', expected: 'light', colorScheme: 'light', os: 'dark', stored: 'light' },
  {
    name: 'nothing stored, dark OS',
    expected: 'light',
    colorScheme: 'light',
    os: 'dark',
    stored: null,
  },
  {
    name: 'nothing stored, light OS',
    expected: 'light',
    colorScheme: 'light',
    os: 'light',
    stored: null,
  },
  {
    name: 'stored system, dark OS',
    expected: 'dark',
    colorScheme: 'dark',
    os: 'dark',
    stored: 'system',
  },
  {
    name: 'stored system, light OS',
    expected: 'light',
    colorScheme: 'light',
    os: 'light',
    stored: 'system',
  },
  {
    name: 'storage throws',
    expected: 'light',
    colorScheme: 'light',
    os: 'dark',
    stored: null,
    storageThrows: true,
  },
];

async function arm(page: Page, c: Case): Promise<void> {
  await page.emulateMedia({ colorScheme: c.os });
  await page.addInitScript(
    ({ stored, throws }) => {
      if (throws) {
        Object.defineProperty(window, 'localStorage', {
          configurable: true,
          get() {
            throw new DOMException('denied', 'SecurityError');
          },
        });
      } else if (stored !== null) {
        window.localStorage.setItem('theme', stored);
      }
      const themeOf = (cls: string | null): string =>
        (cls ?? '')
          .split(/\s+/)
          .filter((t) => t === 'light' || t === 'dark')
          .join('+') || 'none';
      const w = window as unknown as { __themeStates: string[]; __paintStates: string[] };
      w.__themeStates = [];
      w.__paintStates = [];
      new MutationObserver((records) => {
        for (const r of records) w.__themeStates.push(themeOf(r.oldValue));
        w.__themeStates.push(themeOf(document.documentElement.getAttribute('class')));
      }).observe(document, {
        subtree: true,
        attributes: true,
        attributeFilter: ['class'],
        attributeOldValue: true,
      });
      new PerformanceObserver((list) => {
        for (const _ of list.getEntries())
          w.__paintStates.push(themeOf(document.documentElement.getAttribute('class')));
      }).observe({ type: 'paint', buffered: true });
    },
    { stored: c.stored, throws: c.storageThrows === true }
  );
}

for (const c of cases) {
  test(`SF-12 shell only (${c.name}): the inline script paints ${c.expected}`, async ({ page }) => {
    await arm(page, c);
    await page.route(/\/src\/main\.tsx/, (route) => route.abort());
    await page.goto('/', { waitUntil: 'load' });
    const state = await page.evaluate(() => ({
      cls: document.documentElement.className,
      scheme: document.documentElement.style.colorScheme,
      mounted: document.getElementById('root')?.childElementCount ?? -1,
    }));
    expect(state.mounted).toBe(0);
    expect(state.cls.split(/\s+/).filter(Boolean)).toEqual([c.expected]);
    expect(state.scheme).toBe(c.colorScheme);
  });

  test(`SF-12 full app (${c.name}): ${c.expected} from the first frame to after mount`, async ({
    page,
  }) => {
    await arm(page, c);
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByTestId('theme-toggle').waitFor({ timeout: 90_000 });
    const seen = await page.evaluate(() => {
      const w = window as unknown as { __themeStates: string[]; __paintStates: string[] };
      return {
        states: Array.from(new Set(w.__themeStates)),
        paints: Array.from(new Set(w.__paintStates)),
        final: document.documentElement.className.split(/\s+/).filter(Boolean),
      };
    });
    // Every root-class state seen, including those before each change, is the expected theme
    // (the one `none` state before the script ran is the only other value allowed).
    expect(seen.states.filter((s) => s !== 'none')).toEqual([c.expected]);
    expect(seen.paints.length).toBeGreaterThan(0);
    expect(seen.paints).toEqual([c.expected]);
    expect(seen.final).toEqual([c.expected]);
  });
}
