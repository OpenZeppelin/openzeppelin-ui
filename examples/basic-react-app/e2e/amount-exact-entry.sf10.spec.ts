/**
 * 005 SF-10 scenario 6 / SC-003 (prove-it-works): AmountField exact-entry mode in the
 * running example app ("Amount Field: exact entry" on the FormFields page, EVM, 18 decimals).
 *
 * For every precision-hostile case the script types (or pastes) the text into the exact
 * field, blurs, submits and reads the live DOM: the text after blur must be byte-equal to
 * what was typed; a valid case must reach the payload as the text minus commas, and real
 * viem `parseUnits` of that payload must equal an independent BigInt reference; an invalid
 * or over-limit case must show its error and leave the submit count unchanged. The default
 * field next to it must still format on blur (exactly, since 006 SF-1).
 *
 * Set SF10_EVIDENCE_DIR to also write a JSON readout and screenshots for the stage artifact.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Locator, type Page } from 'playwright/test';
import { parseUnits } from 'viem';

const DECIMALS = 18;
const evidenceDir = process.env.SF10_EVIDENCE_DIR;

/** Valid at 18 decimals, grouping on: submitted as the text minus commas. */
const VALID = [
  '12,345,678,901,234,567.123456789012345678',
  '12345678901234567.123456789012345678',
  '9007199254740993',
  '9,007,199,254,740,993',
  '9007199254740992.000000000000000001',
  '18446744073709551616',
  '18,446,744,073,709,551,616',
  '115792089237316195423570985008687907853269984665640564039457584007913129639935',
  '115,792,089,237,316,195,423,570,985,008,687,907,853,269,984,665,640,564,039,457,584,007,913,129,639,935',
  '0.1',
  '0.100000000000000001',
  '0.123456789012345678',
  '0.000000000000000001',
  '.000000000000000001',
  '1.999999999999999999',
  '999999999999999999.999999999999999999',
  '999,999,999,999,999,999.999999999999999999',
  '1,000',
  '1,000.5',
  '1,000.',
  '1,000.000000000000000000',
  '1,234,567.89',
  '123,456,789,012,345,678,901,234,567,890',
  '100000000000000000000000000000000000000000',
  '0.30000000000000004',
  '4.35',
  '1.005',
  '2.675',
  '0.07',
  '-0',
  '-0.000000000000000001',
  '-12,345.678901234567890123',
  '-9007199254740993',
  '007',
  '000123.450',
  '5.',
  '.5',
  '-.5',
  '1.500',
  '0.000000000000000000',
  '123456789.123456789123456789',
  '3.141592653589793238',
  '2,718.281828459045235',
  '1,000,000,000,000,000,000,000',
  '340282366920938463463374607431768211455',
  '79228162514264337593543950335.000000000000000001',
  '12,345.6789012345678901',
  '1',
  '0',
  '10,000,000',
  '-1,000,000.000001',
  '42.000000000000000042',
];

/** Over the 18-decimal limit: kept on screen, flagged, never submitted. */
const OVER_LIMIT = [
  '0.1234567890123456789',
  '1.2345678901234567890',
  '0.0000000000000000001',
  '1,000.0000000000000000000',
  '9007199254740993.0000000000000000001',
];

/** Malformed: kept on screen, flagged, never submitted. */
const INVALID = [
  '1e18',
  '1E18',
  '1..2',
  '1.2.3',
  '1,5',
  '1,00',
  '1234,567',
  ',123',
  '1,,000',
  '1,000,',
  '1,000.5,0',
  '0,123',
  ' 1,000 ',
  '-',
  '.',
  '-.',
  '+1',
  '1 000',
  'abc',
];

/** Cases entered with real key presses instead of a paste-like fill. */
const TYPED_BY_KEYS = new Set([
  '12,345,678,901,234,567.123456789012345678',
  '9007199254740993',
  '0.1234567890123456789',
  '1..2',
  '-.5',
]);

/** Independent reference: `int · 10^decimals + frac` padded, by string scaling and BigInt. */
function reference(plain: string, decimals: number): bigint {
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

async function submitCount(page: Page): Promise<number> {
  const text = await page.getByTestId('amount-exact-submit-count').innerText();
  const match = /Submitted (\d+) time/.exec(text);
  if (!match) throw new Error(`unexpected counter text: ${text}`);
  return Number(match[1]);
}

async function enter(page: Page, input: Locator, text: string): Promise<void> {
  await input.fill('');
  if (TYPED_BY_KEYS.has(text)) await input.pressSequentially(text);
  else await input.fill(text);
  await page.getByRole('heading', { name: 'Amount Field: exact entry' }).click(); // blur
}

type CaseResult = {
  kind: 'valid' | 'over-limit' | 'invalid';
  typed: string;
  textAfterBlur: string;
  submitted: string | null;
  error: string | null;
  viemUnits: string | null;
  pass: boolean;
};

test('SC-003: exact-entry keeps every digit in the running app; default field unchanged', async ({
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

  const exactWrap = page.getByTestId('amount-exact-field');
  const exact = exactWrap.getByRole('textbox', { name: /Amount \(exact entry\)/ });
  const plain = page.getByTestId('amount-default-field').getByRole('textbox');
  const submit = page.getByTestId('amount-exact-submit');
  const results: CaseResult[] = [];

  // Default field still formats on blur (SC-002). 006 SF-1 restated the 0.1 row: 005 pinned
  // the float artefact 0.100000000000000006; the default field now writes the exact text.
  await plain.fill('1.5');
  await heading.click();
  await expect(plain).toHaveValue('1.500000000000000000');
  const defaultOneFive = await plain.inputValue();
  await plain.fill('0.1');
  await heading.click();
  await expect(plain).toHaveValue('0.100000000000000000');
  const defaultReadout = { '1.5': defaultOneFive, '0.1': await plain.inputValue() };

  for (const typed of VALID) {
    await enter(page, exact, typed);
    const textAfterBlur = await exact.inputValue();
    const before = await submitCount(page);
    await submit.click();
    await expect.poll(() => submitCount(page)).toBe(before + 1);
    const payload = JSON.parse(
      (await page.getByTestId('amount-exact-payload').locator('pre, code').first().innerText()) ||
        '{}'
    ) as { exactAmount?: string };
    const submitted = payload.exactAmount ?? null;
    const expected = typed.replace(/,/g, '');
    const viemUnits = submitted === null ? null : parseUnits(submitted, DECIMALS);
    const pass =
      textAfterBlur === typed &&
      submitted === expected &&
      viemUnits !== null &&
      viemUnits === reference(expected, DECIMALS);
    results.push({
      kind: 'valid',
      typed,
      textAfterBlur,
      submitted,
      error: null,
      viemUnits: viemUnits === null ? null : viemUnits.toString(),
      pass,
    });
  }

  for (const [kind, cases] of [
    ['over-limit', OVER_LIMIT],
    ['invalid', INVALID],
  ] as const) {
    for (const typed of cases) {
      await enter(page, exact, typed);
      const before = await submitCount(page);
      await submit.click();
      const alert = exactWrap.getByRole('alert');
      await alert.waitFor();
      const error = (await alert.innerText()).trim();
      const textAfterBlur = await exact.inputValue();
      const after = await submitCount(page);
      const pass =
        textAfterBlur === typed &&
        after === before &&
        error.length > 0 &&
        (kind !== 'over-limit' || error === `Use at most ${DECIMALS} decimal places`);
      results.push({ kind, typed, textAfterBlur, submitted: null, error, viemUnits: null, pass });
    }
  }

  // Leave a representative state on screen for the screenshot.
  await enter(page, exact, '12,345,678,901,234,567.123456789012345678');
  await submit.click();

  const failures = results.filter((r) => !r.pass);
  const summary = {
    total: results.length,
    valid: results.filter((r) => r.kind === 'valid').length,
    overLimit: results.filter((r) => r.kind === 'over-limit').length,
    invalid: results.filter((r) => r.kind === 'invalid').length,
    passed: results.length - failures.length,
    defaultField: defaultReadout,
  };
  if (evidenceDir) {
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(
      join(evidenceDir, 'sc-003-readout.json'),
      `${JSON.stringify({ summary, results }, null, 2)}\n`
    );
    await heading.scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(evidenceDir, 'sc-003-demo.png') });
    await page
      .locator('section[aria-labelledby="amount-exact-entry-heading"]')
      .screenshot({ path: join(evidenceDir, 'sc-003-payload.png') });
  }
  test.info().annotations.push({ type: 'SC-003', description: JSON.stringify(summary) });

  expect(results.length).toBeGreaterThanOrEqual(50);
  expect(failures, `SC-003 ${JSON.stringify(summary)}`).toEqual([]);
});
