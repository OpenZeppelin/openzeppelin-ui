/**
 * 007 SF-3 (prove-it-works): AmountField exact entry with `groupedDisplay` in the running
 * example app ("Amount Field: grouped display (exact entry)" on the FormFields page, EVM,
 * 18 decimals).
 *
 * INV-37 / SC-002: for every amount of the shared corpus, however it arrives (seeded
 * plain, seeded grouped, typed), the unfocused field shows the grouped text of an
 * independent reference, the focused field shows the plain text, and the submitted value
 * is the plain text character for character; real viem `parseUnits` of it equals an
 * independent BigInt reference. A plain seed leaves the form pristine and a grouped seed
 * marks it dirty. The read-only field stays grouped on focus and is never written.
 *
 * INV-34 / SC-004: axe reports no violation KIND on the new section that the unchanged
 * exact-entry section next to it does not have, in light and dark. Kinds, not counts: the
 * new section adds instances of two existing contrast findings (the field's symbol and
 * code-block tokens).
 *
 * Set SF3_EVIDENCE_DIR to also write a JSON readout and screenshots for the stage artifact.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { expect, test, type Locator, type Page } from 'playwright/test';
import { parseUnits } from 'viem';

import { SC003_VALID_CASES } from '../../../packages/components/src/components/fields/__tests__/amount-exact.sf10-corpus';

const DECIMALS = 18;
const evidenceDir = process.env.SF3_EVIDENCE_DIR;
const axeSource = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

const SEPARATOR_MESSAGE = 'Remove the , separators from this value';
const MALFORMED_MESSAGE = 'Use , only between groups of three digits, e.g. 1,234,567.89';

/** Every corpus amount as plain text, once. */
const CORPUS = Array.from(new Set(SC003_VALID_CASES.map((text) => text.split(',').join(''))));

/** Independent reference grouper: a right-to-left walk over the integer digits. */
function referenceGroup(plain: string): string {
  const negative = plain.startsWith('-');
  const body = negative ? plain.slice(1) : plain;
  const dot = body.indexOf('.');
  const int = dot < 0 ? body : body.slice(0, dot);
  const rest = dot < 0 ? '' : body.slice(dot);
  if (int.length < 4 || int.startsWith('0')) return plain;
  let out = '';
  for (let i = int.length - 1, placed = 1; i >= 0; i -= 1, placed += 1) {
    out = int.charAt(i) + out;
    if (placed % 3 === 0 && i > 0) out = `,${out}`;
  }
  return `${negative ? '-' : ''}${out}${rest}`;
}

/** Independent reference: `int · 10^decimals + frac` padded, by string scaling and BigInt. */
function referenceUnits(plain: string, decimals: number): bigint {
  const negative = plain.startsWith('-');
  const body = negative ? plain.slice(1) : plain;
  const [intPart = '', fracPart = ''] = body.split('.');
  if (fracPart.length > decimals) throw new Error(`reference: too many decimals in ${plain}`);
  const magnitude = BigInt(`${intPart || '0'}${fracPart.padEnd(decimals, '0')}`);
  return negative ? -magnitude : magnitude;
}

async function clickVisibleText(page: Page, text: string): Promise<void> {
  for (const match of await page.getByText(text, { exact: true }).all()) {
    if (await match.isVisible()) {
      await match.click();
      return;
    }
  }
  throw new Error(`No visible "${text}" navigation item`);
}

async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.classList.toggle('light', t === 'light');
  }, theme);
}

interface Demo {
  readonly section: Locator;
  readonly heading: Locator;
  readonly field: Locator;
  readonly readOnly: Locator;
  readonly seedText: Locator;
  readonly seedCustom: Locator;
  readonly submit: Locator;
  readonly formValue: () => Promise<unknown>;
  readonly isDirty: () => Promise<string>;
  readonly submitCount: () => Promise<number>;
  readonly payload: () => Promise<{ amount?: string; confirmedAmount?: string }>;
  readonly alerts: () => Promise<string[]>;
  readonly blur: () => Promise<void>;
  readonly seed: (text: string) => Promise<void>;
}

async function openDemo(page: Page): Promise<Demo> {
  await page.setViewportSize({ width: 1280, height: 1400 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Forms' }).first().waitFor({ timeout: 90_000 });
  await clickVisibleText(page, 'Forms');
  await clickVisibleText(page, 'FormFields');
  const section = page.locator('section[aria-labelledby="amount-grouped-display-heading"]');
  const heading = page.getByRole('heading', {
    name: 'Amount Field: grouped display (exact entry)',
  });
  await heading.waitFor({ timeout: 90_000 });
  await heading.scrollIntoViewIfNeeded();
  const seedText = page.getByTestId('amount-grouped-seed-text');
  const seedCustom = page.getByTestId('amount-grouped-seed-custom');
  const submitCount = async (): Promise<number> => {
    const text = await page.getByTestId('amount-grouped-submit-count').innerText();
    const match = /Submitted (\d+) time/.exec(text);
    if (!match) throw new Error(`unexpected counter text: ${text}`);
    return Number(match[1]);
  };
  return {
    section,
    heading,
    field: page.getByTestId('amount-grouped-field').getByRole('textbox'),
    readOnly: page.getByTestId('amount-grouped-readonly-field').getByRole('textbox'),
    seedText,
    seedCustom,
    submit: page.getByTestId('amount-grouped-submit'),
    formValue: async () =>
      JSON.parse(await page.getByTestId('amount-grouped-form-value').innerText()) as unknown,
    isDirty: () => page.getByTestId('amount-grouped-is-dirty').innerText(),
    submitCount,
    payload: async () =>
      JSON.parse(
        (await page
          .getByTestId('amount-grouped-payload')
          .locator('pre, code')
          .first()
          .innerText()) || '{}'
      ) as { amount?: string; confirmedAmount?: string },
    alerts: async () =>
      (await section.getByRole('alert').allInnerTexts()).map((t) => t.trim()).filter(Boolean),
    blur: () => heading.click(),
    seed: async (text: string) => {
      await seedText.fill(text);
      await seedCustom.click();
    },
  };
}

type Arrival = 'seeded plain' | 'seeded grouped' | 'typed';

interface CaseResult {
  arrival: Arrival;
  plain: string;
  unfocused: string;
  focused: string;
  afterBlur: string;
  formValue: unknown;
  isDirty: string;
  submitted: string | null;
  viemUnits: string | null;
  alerts: string[];
  pass: boolean;
}

test('SC-002: grouped display keeps every digit in the running app, however the amount arrives', async ({
  page,
}) => {
  test.setTimeout(600_000);
  const consoleProblems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleProblems.push(message.text());
    }
  });
  const demo = await openDemo(page);
  const results: CaseResult[] = [];

  for (const plain of CORPUS) {
    const grouped = referenceGroup(plain);
    for (const arrival of ['seeded plain', 'seeded grouped', 'typed'] as const) {
      if (arrival === 'seeded plain') await demo.seed(plain);
      if (arrival === 'seeded grouped') await demo.seed(grouped);
      if (arrival === 'typed') {
        await demo.seed('');
        await demo.field.fill(plain);
        await demo.blur();
      }
      await expect(demo.field).toHaveValue(grouped);
      const unfocused = await demo.field.inputValue();
      const formValue = await demo.formValue();
      const isDirty = await demo.isDirty();

      await demo.field.focus();
      await expect(demo.field).toHaveValue(plain);
      const focused = await demo.field.inputValue();
      await demo.blur();
      await expect(demo.field).toHaveValue(grouped);
      const afterBlur = await demo.field.inputValue();

      const before = await demo.submitCount();
      await demo.submit.click();
      await expect.poll(() => demo.submitCount()).toBe(before + 1);
      const submitted = (await demo.payload()).amount ?? null;
      const viemUnits = submitted === null ? null : parseUnits(submitted, DECIMALS);
      const alerts = await demo.alerts();

      // A plain seed leaves the form pristine; a grouped seed and a typed value do not.
      const expectedDirty =
        arrival === 'seeded plain'
          ? 'false'
          : arrival === 'typed'
            ? 'true'
            : String(grouped !== plain);
      const pass =
        unfocused === grouped &&
        focused === plain &&
        afterBlur === grouped &&
        formValue === plain &&
        isDirty === expectedDirty &&
        submitted === plain &&
        !submitted.includes(',') &&
        viemUnits !== null &&
        viemUnits === referenceUnits(plain, DECIMALS) &&
        alerts.length === 0;
      results.push({
        arrival,
        plain,
        unfocused,
        focused,
        afterBlur,
        formValue,
        isDirty,
        submitted,
        viemUnits: viemUnits === null ? null : viemUnits.toString(),
        alerts,
        pass,
      });
    }
  }

  // Leave a representative state on screen for the screenshot.
  await demo.seed('250,000.00');
  await demo.submit.click();

  const failures = results.filter((r) => !r.pass);
  const zeroLed = CORPUS.filter((p) => referenceGroup(p) === p && /^-?0\d{3,}/.test(p));
  const summary = {
    amounts: CORPUS.length,
    checks: results.length,
    passed: results.length - failures.length,
    zeroLedShownAsGiven: zeroLed,
    consoleProblems: consoleProblems.length,
  };
  if (evidenceDir) {
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(
      join(evidenceDir, 'sc-002-readout.json'),
      `${JSON.stringify({ summary, results }, null, 2)}\n`
    );
    await demo.section.screenshot({ path: join(evidenceDir, 'sc-002-demo.light.png') });
    await setTheme(page, 'dark');
    await demo.section.screenshot({ path: join(evidenceDir, 'sc-002-demo.dark.png') });
    await setTheme(page, 'light');
  }
  test.info().annotations.push({ type: 'SC-002', description: JSON.stringify(summary) });

  expect(CORPUS.length).toBeGreaterThanOrEqual(45);
  expect(failures, `SC-002 ${JSON.stringify(summary)}`).toEqual([]);
  expect(consoleProblems).toEqual([]);
});

test('INV-37: the seed buttons show the dirty rule, and a wrongly grouped seed is refused as given', async ({
  page,
}) => {
  const demo = await openDemo(page);

  await page.getByTestId('amount-grouped-seed-plain').click();
  await expect(demo.field).toHaveValue('250,000.00');
  expect(await demo.formValue()).toBe('250000.00');
  expect(await demo.isDirty()).toBe('false');

  await page.getByTestId('amount-grouped-seed-grouped').click();
  await expect(demo.field).toHaveValue('250,000.00');
  await expect.poll(() => demo.formValue()).toBe('250000.00');
  expect(await demo.isDirty()).toBe('true');
  expect(await demo.alerts()).toEqual([]);
  await demo.submit.click();
  await expect.poll(async () => (await demo.payload()).amount).toBe('250000.00');
  expect(await demo.alerts()).toEqual([]);

  await page.getByTestId('amount-grouped-reset').click();
  await expect(demo.field).toHaveValue('');
  expect(await demo.isDirty()).toBe('false');

  // Type 250000 and tab out: 250,000 on screen, 250000 in the form.
  await demo.field.click();
  await page.keyboard.type('250000');
  await expect(demo.field).toHaveValue('250000');
  await page.keyboard.press('Tab');
  await expect(demo.field).toHaveValue('250,000');
  expect(await demo.formValue()).toBe('250000');
  // Shift+Tab back: the plain text, all of it selected, so typing replaces the amount.
  await page.keyboard.press('Shift+Tab');
  await expect(demo.field).toHaveValue('250000');
  expect(
    await demo.field.evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd])
  ).toEqual([0, 6]);
  await page.keyboard.type('5');
  await expect(demo.field).toHaveValue('5');
  expect(await demo.formValue()).toBe('5');

  // A wrongly grouped seed: shown as given, never rewritten, submit blocked.
  await demo.seed('25,00,000');
  await expect(demo.field).toHaveValue('25,00,000');
  expect(await demo.formValue()).toBe('25,00,000');
  const before = await demo.submitCount();
  await demo.submit.click();
  await expect.poll(() => demo.alerts()).toEqual([MALFORMED_MESSAGE]);
  expect(await demo.submitCount()).toBe(before);
  await expect(demo.field).toHaveValue('25,00,000');
  expect((await demo.alerts()).includes(SEPARATOR_MESSAGE)).toBe(false);
});

test('INV-21 / INV-36: the read-only field stays grouped on focus, is in the tab order and is never written', async ({
  page,
}) => {
  const demo = await openDemo(page);
  await expect(demo.readOnly).toHaveValue('1,250,000.50');

  // Tab order through the section: the editable field, then the read-only one.
  await demo.field.focus();
  await page.keyboard.press('Tab');
  await expect(demo.readOnly).toBeFocused();
  await expect(demo.readOnly).toHaveValue('1,250,000.50');
  expect(
    await demo.readOnly.evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd])
  ).toEqual([0, 12]);
  await page.keyboard.type('9');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Escape');
  await expect(demo.readOnly).toBeFocused();
  await expect(demo.readOnly).toHaveValue('1,250,000.50');
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('amount-grouped-seed-plain')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(demo.field).toBeFocused();

  expect(await demo.isDirty()).toBe('false');
  await demo.seed('1234.5');
  await demo.submit.click();
  await expect
    .poll(() => demo.payload())
    .toEqual({ amount: '1234.5', confirmedAmount: '1250000.50' });
  expect(await demo.alerts()).toEqual([]);
});

for (const theme of ['light', 'dark'] as const) {
  test(`SC-004: axe finds no violation kind on the grouped section that the exact-entry section lacks (${theme})`, async ({
    page,
  }) => {
    const demo = await openDemo(page);
    // Both sections in the same state: a value in the field and a submitted payload on
    // screen, so each one's code block is part of the scan.
    await demo.seed('250,000.00');
    await demo.submit.click();
    await page.getByTestId('amount-grouped-payload').waitFor();
    const exact = page
      .getByTestId('amount-exact-field')
      .getByRole('textbox', { name: /Amount \(exact entry\)/ });
    await exact.fill('250,000.00');
    await page.getByTestId('amount-exact-submit').click();
    await page.getByTestId('amount-exact-payload').waitFor();
    await demo.blur();
    await setTheme(page, theme);
    // Let the theme's colour transitions finish: a scan in mid-transition reads blended
    // colours and reports contrast failures that are not there a moment later.
    await page.waitForTimeout(800);

    await page.addScriptTag({ path: axeSource });
    const scan = (selector: string): Promise<{ id: string; nodes: string[] }[]> =>
      page.evaluate(async (sel) => {
        const root = document.querySelector(sel);
        if (!root) throw new Error(`no ${sel}`);
        const axe = (
          window as unknown as {
            axe: {
              run: (
                c: Element
              ) => Promise<{ violations: { id: string; nodes: { html: string }[] }[] }>;
            };
          }
        ).axe;
        const result = await axe.run(root);
        return result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.html) }));
      }, selector);

    const grouped = await scan('section[aria-labelledby="amount-grouped-display-heading"]');
    const baseline = await scan('section[aria-labelledby="amount-exact-entry-heading"]');
    const kinds = (found: { id: string }[]): string[] => found.map((v) => v.id).sort();

    if (evidenceDir) {
      mkdirSync(evidenceDir, { recursive: true });
      writeFileSync(
        join(evidenceDir, `sc-004-axe.${theme}.json`),
        `${JSON.stringify({ theme, grouped, baseline }, null, 2)}\n`
      );
    }
    test.info().annotations.push({
      type: 'SC-004',
      description: JSON.stringify({ theme, grouped: kinds(grouped), baseline: kinds(baseline) }),
    });

    const newKinds = kinds(grouped).filter((id) => !kinds(baseline).includes(id));
    expect(newKinds, JSON.stringify(grouped)).toEqual([]);
    // Nothing the new section adds (buttons, seed box, readout, labels) is flagged: every
    // flagged node is the field's symbol or a code-block token, as in the baseline.
    for (const violation of grouped) {
      for (const html of violation.nodes) {
        expect(html, `${violation.id} on new markup`).toMatch(
          /text-gray-500|hljs|token|<code|<pre|<span class="[^"]*(text-|language-)/
        );
      }
    }
  });
}
