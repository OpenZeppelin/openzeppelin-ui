/**
 * 006 SF-1 scenario 4 / SC-003 (prove-it-works): the default AmountField formats exactly
 * in the running example app ("Amount Field: exact entry" on the FormFields page, EVM,
 * 18 decimals), next to the exact-entry field.
 *
 * The amounts come from the shared corpus (`amount-exact.sf10-corpus.ts`, also used by the
 * component suites). For every amount valid in both modes with at most 18 fraction
 * digits, the script types it into both fields, blurs and submits. The default field's
 * text must equal the exact field's text padded to 18 decimals, and the two submitted
 * values must be numerically equal (checked by BigInt scaling and by real viem
 * `parseUnits`). Over-limit amounts are separate rows: the default field's text must equal
 * the half-away-from-zero rounding computed here, independently of the package.
 *
 * Set SF1_EVIDENCE_DIR to also write a JSON readout and a screenshot for the stage artifact.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Locator, type Page } from 'playwright/test';
import { parseUnits } from 'viem';

import {
  DEFAULT_FORMAT_BOTH_MODES_CASES,
  DEFAULT_FORMAT_OVER_LIMIT_CASES,
} from '../../../packages/components/src/components/fields/__tests__/amount-exact.sf10-corpus';

const DECIMALS = 18;
const evidenceDir = process.env.SF1_EVIDENCE_DIR;

/** Rows entered with real key presses instead of a paste-like fill. */
const TYPED_BY_KEYS = new Set(['0.1', '123456789012345678.5', '-.5', '9.9999999999999999995']);

/**
 * Independent reference: `plain` rounded half away from zero to `decimals` places, by
 * BigInt scaling of the digits as typed. Canonical form, zero unsigned.
 */
function roundHalfAway(plain: string, decimals: number): string {
  const negative = plain.startsWith('-');
  const body = negative ? plain.slice(1) : plain;
  const [intPart = '', fracPart = ''] = body.split('.');
  let units = BigInt(`${intPart}${fracPart.slice(0, decimals).padEnd(decimals, '0')}` || '0');
  if (fracPart.length > decimals && Number(fracPart.charAt(decimals)) >= 5) units += BigInt(1);
  const digits = units.toString().padStart(decimals + 1, '0');
  const point = digits.length - decimals;
  const magnitude = `${digits.slice(0, point)}.${digits.slice(point)}`;
  return negative && units !== BigInt(0) ? `-${magnitude}` : magnitude;
}

/** `plain` × 10^decimals as a BigInt; `plain` has at most `decimals` fraction digits. */
function scaled(plain: string, decimals: number): bigint {
  const negative = plain.startsWith('-');
  const body = negative ? plain.slice(1) : plain;
  const [intPart = '', fracPart = ''] = body.split('.');
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

async function submitCount(page: Page): Promise<number> {
  const text = await page.getByTestId('amount-exact-submit-count').innerText();
  const match = /Submitted (\d+) time/.exec(text);
  if (!match) throw new Error(`unexpected counter text: ${text}`);
  return Number(match[1]);
}

async function enter(input: Locator, blurTarget: Locator, text: string): Promise<void> {
  await input.fill('');
  if (TYPED_BY_KEYS.has(text)) await input.pressSequentially(text);
  else await input.fill(text);
  await blurTarget.click();
}

type RowResult = {
  kind: 'both-modes' | 'over-limit';
  typed: string;
  defaultText: string;
  exactText: string;
  expectedDefaultText: string;
  submitted: { defaultAmount: unknown; exactAmount: unknown };
  pass: boolean;
};

test('006 SF-1 SC-003: the default field formats exactly; equal to the exact field in the running app', async ({
  page,
}) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1280, height: 1400 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Forms' }).first().waitFor({ timeout: 90_000 });
  await clickVisibleText(page, 'Forms');
  await clickVisibleText(page, 'FormFields');
  const heading = page.getByRole('heading', { name: 'Amount Field: exact entry' });
  await heading.waitFor({ timeout: 90_000 });
  await heading.scrollIntoViewIfNeeded();

  const plain = page.getByTestId('amount-default-field').getByRole('textbox');
  const exact = page
    .getByTestId('amount-exact-field')
    .getByRole('textbox', { name: /Amount \(exact entry\)/ });
  const submit = page.getByTestId('amount-exact-submit');
  const results: RowResult[] = [];

  const runRow = async (
    kind: RowResult['kind'],
    typed: string,
    exactInput: string,
    expectedDefaultText: string
  ): Promise<void> => {
    await enter(plain, heading, typed);
    await enter(exact, heading, exactInput);
    const defaultText = await plain.inputValue();
    const exactText = await exact.inputValue();
    const before = await submitCount(page);
    await submit.click();
    await expect.poll(() => submitCount(page)).toBe(before + 1);
    const submitted = JSON.parse(
      (await page.getByTestId('amount-exact-payload').locator('pre, code').first().innerText()) ||
        '{}'
    ) as { defaultAmount: unknown; exactAmount: unknown };
    const { defaultAmount, exactAmount } = submitted;
    const pass =
      exactText === exactInput &&
      defaultText === expectedDefaultText &&
      defaultAmount === defaultText &&
      typeof exactAmount === 'string' &&
      scaled(defaultText, DECIMALS) === scaled(exactAmount, DECIMALS) &&
      parseUnits(defaultText, DECIMALS) === parseUnits(exactAmount, DECIMALS);
    results.push({
      kind,
      typed,
      defaultText,
      exactText,
      expectedDefaultText,
      submitted,
      pass,
    });
  };

  // Rows valid in both modes with at most 18 fraction digits: the exact field gets the
  // same text, and the default field must show it padded, every digit kept.
  for (const typed of DEFAULT_FORMAT_BOTH_MODES_CASES) {
    await runRow('both-modes', typed, typed, roundHalfAway(typed, DECIMALS));
  }
  // Over-limit rows: the exact field would flag them, so it gets the rounded amount, and
  // the default field must round to exactly that.
  for (const typed of DEFAULT_FORMAT_OVER_LIMIT_CASES) {
    const rounded = roundHalfAway(typed, DECIMALS);
    await runRow('over-limit', typed, rounded, rounded);
  }

  // Scenario 1 left on screen for the screenshot.
  await enter(plain, heading, '0.1');
  await expect(plain).toHaveValue('0.100000000000000000');
  await enter(exact, heading, '0.1');
  await submit.click();

  const failures = results.filter((r) => !r.pass);
  const summary = {
    total: results.length,
    bothModes: results.filter((r) => r.kind === 'both-modes').length,
    overLimit: results.filter((r) => r.kind === 'over-limit').length,
    passed: results.length - failures.length,
    scenario1: await plain.inputValue(),
  };
  if (evidenceDir) {
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(
      join(evidenceDir, 'sf1-sc-003-readout.json'),
      `${JSON.stringify({ summary, results }, null, 2)}\n`
    );
    await page
      .locator('section[aria-labelledby="amount-exact-entry-heading"]')
      .screenshot({ path: join(evidenceDir, 'sf1-sc-003-demo.png') });
  }
  test.info().annotations.push({ type: 'SF-1 SC-003', description: JSON.stringify(summary) });

  expect(results.filter((r) => r.kind === 'both-modes').length).toBeGreaterThanOrEqual(50);
  expect(failures, `SF-1 SC-003 ${JSON.stringify(summary)}`).toEqual([]);
});
