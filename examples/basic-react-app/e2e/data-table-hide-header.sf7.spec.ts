/**
 * 005 SF-7 scenario 4 (prove-it-works) — DataTable `hideHeaderWhenEmpty` in the running app.
 *
 * Reads the header row's presence and the table's accessible name at three steps
 * (initial → no-match query → cleared) on the opt-in demo, and checks that the existing
 * "Row selection" table (no opt-in) keeps its header for the same query (scenario 3, SC-002).
 * Set SF7_EVIDENCE_DIR to also write a JSON readout and screenshots for the stage artifact.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Locator, type Page } from 'playwright/test';

const OPT_IN_CAPTION = 'Accounts (header hides when empty)';
const OPT_IN_SEARCH = '#data-table-account-search-hide-header';
const DEFAULT_CAPTION = 'Accounts (selectable)';
const DEFAULT_SEARCH = '#data-table-account-search';
const NO_MATCH = 'zzz-no-such-account';
const OPT_IN_EMPTY = 'No matching accounts';
const DEFAULT_EMPTY = 'Nothing to show';

const evidenceDir = process.env.SF7_EVIDENCE_DIR;

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

type Readout = {
  step: string;
  columnheaders: number;
  theadHidden: boolean;
  theadDisplay: string;
  theadHeight: number;
  dataRows: number;
  emptyStateVisible: boolean;
};

async function readTable(step: string, table: Locator, emptyTitle: string): Promise<Readout> {
  const head = table.locator('thead[data-slot="data-table-head"]');
  const geometry = await head.evaluate((node) => ({
    hidden: (node as HTMLElement).hidden,
    display: getComputedStyle(node).display,
    height: node.getBoundingClientRect().height,
  }));
  return {
    step,
    columnheaders: await table.getByRole('columnheader').count(),
    theadHidden: geometry.hidden,
    theadDisplay: geometry.display,
    theadHeight: geometry.height,
    dataRows: await table.locator('tr[data-slot="data-table-row"]').count(),
    emptyStateVisible: await table.getByText(emptyTitle).isVisible(),
  };
}

test('SF-7: opt-in table hides its header for a no-match query and restores it on clear', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByText('Data Display', { exact: true }).first().waitFor({ state: 'attached' });
  await clickVisibleText(page, 'Data Display');
  await clickVisibleText(page, 'DataTable');

  const table = page.getByRole('table', { name: OPT_IN_CAPTION });
  const search = page.locator(OPT_IN_SEARCH);
  await expect(table).toBeVisible();
  await table.scrollIntoViewIfNeeded();
  const frame = table.locator('xpath=ancestor::div[@data-slot="data-table-frame"]');
  const readouts: Readout[] = [];

  // Initial: headed, rows, named.
  await expect(table).toHaveAccessibleName(OPT_IN_CAPTION);
  readouts.push(await readTable('initial', table, OPT_IN_EMPTY));
  expect(readouts[0]).toMatchObject({ theadHidden: false, theadDisplay: 'table-header-group' });
  expect(readouts[0]!.columnheaders).toBeGreaterThan(0);
  expect(readouts[0]!.dataRows).toBeGreaterThan(0);

  // Put sort and selection state in place so scenario 2's "comes back" is visible live.
  await table.getByRole('button', { name: /Sort by Token/ }).click();
  const tokenHeader = table.getByRole('columnheader', { name: /Token/ });
  await expect(tokenHeader).toHaveAttribute('aria-sort', 'ascending');
  await table.getByRole('checkbox').nth(1).check();
  await expect(table.getByRole('checkbox', { name: 'Select all accounts' })).toHaveAttribute(
    'aria-checked',
    'mixed'
  );

  // No-match query: header gone from layout and the a11y tree; empty state shown; still named.
  await search.fill(NO_MATCH);
  await expect(table.getByRole('columnheader')).toHaveCount(0);
  await expect(table).toHaveAccessibleName(OPT_IN_CAPTION);
  readouts.push(await readTable('no-match query', table, OPT_IN_EMPTY));
  expect(readouts[1]).toMatchObject({
    columnheaders: 0,
    theadHidden: true,
    theadDisplay: 'none',
    theadHeight: 0,
    dataRows: 0,
    emptyStateVisible: true,
  });
  await expect(page.getByRole('table', { name: OPT_IN_CAPTION })).toHaveCount(1);
  const emptyAria = await table.ariaSnapshot();
  expect(emptyAria).not.toMatch(/columnheader/);
  expect(emptyAria).toContain('No matching accounts');
  if (evidenceDir) {
    mkdirSync(evidenceDir, { recursive: true });
    await frame.screenshot({ path: join(evidenceDir, 'opt-in-no-match.png') });
  }

  // Cleared: header, sort and selection come back with the rows.
  await search.fill('');
  await expect(table.getByRole('columnheader').first()).toBeVisible();
  await expect(table).toHaveAccessibleName(OPT_IN_CAPTION);
  readouts.push(await readTable('cleared', table, OPT_IN_EMPTY));
  expect(readouts[2]).toMatchObject({
    columnheaders: readouts[0]!.columnheaders,
    theadHidden: false,
    theadDisplay: 'table-header-group',
    emptyStateVisible: false,
  });
  expect(readouts[2]!.dataRows).toBeGreaterThan(0);
  await expect(tokenHeader).toHaveAttribute('aria-sort', 'ascending');
  await expect(table.getByRole('checkbox', { name: 'Select all accounts' })).toHaveAttribute(
    'aria-checked',
    'mixed'
  );

  // Scenario 3 live reference: the default table keeps its header over the same empty result.
  const defaultTable = page.getByRole('table', { name: DEFAULT_CAPTION });
  await page.locator(DEFAULT_SEARCH).fill(NO_MATCH);
  await expect(defaultTable.locator('tr[data-slot="data-table-row"]')).toHaveCount(0);
  const defaultReadout = await readTable(
    'default table, no-match query',
    defaultTable,
    DEFAULT_EMPTY
  );
  expect(defaultReadout.theadHidden).toBe(false);
  expect(defaultReadout.emptyStateVisible).toBe(true);
  expect(defaultReadout.columnheaders).toBe(readouts[0]!.columnheaders);
  if (evidenceDir) {
    await defaultTable
      .locator('xpath=ancestor::div[@data-slot="data-table-frame"]')
      .screenshot({ path: join(evidenceDir, 'default-no-match.png') });
    await page.locator(DEFAULT_SEARCH).fill('');
    writeFileSync(
      join(evidenceDir, 'scenario-4-readout.json'),
      `${JSON.stringify({ optIn: readouts, defaultTable: defaultReadout, emptyAria }, null, 2)}\n`
    );
  }
});
