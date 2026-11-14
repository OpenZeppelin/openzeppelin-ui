/**
 * 005 SF-22 scenario 4 (prove-it-works) — DataTable grouped rows in the running app.
 *
 * On the "Keys by role" demo (120 deterministic keys, 3 without a role, virtualized, selectable)
 * this reads the whole table by scrolling it end to end, then checks:
 * - one header row: one row of column headers in the accessibility tree (CDP AX tree), and a
 *   `rowheader` per section with the section's label as its name (INV-34)
 * - sections stay with their groups and in first-appearance order after sorting by Label and
 *   by Added; rows are sorted inside each section (INV-2, INV-12, INV-20)
 * - select-all → readout "120 of 120 keys selected" (INV-21)
 * - at the end of the list, ARIA indices are consecutive and row boxes tile (INV-29, INV-35)
 * and, on "Keys by role (paginated)", that a split role repeats on the next page (INV-22).
 * Set SF22_EVIDENCE_DIR to also write a JSON readout and screenshots for the stage artifact.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type CDPSession, type Locator, type Page } from 'playwright/test';

const GROUPED_CAPTION = 'Keys by role';
const PAGED_CAPTION = 'Keys by role (paginated)';
const ROLES = ['Admin', 'Minter', 'Pauser'] as const;
const WITHOUT_ROLE = new Set([10, 55, 100]);
const TOTAL = 120;

const evidenceDir = process.env.SF22_EVIDENCE_DIR;

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

/** The demo generator's rule: "Signer 001" is n = 0; roles cycle, three rows have none. */
function expectedRole(label: string): string | null {
  const n = Number(label.replace('Signer ', '')) - 1;
  return WITHOUT_ROLE.has(n) ? null : ROLES[n % ROLES.length]!;
}

type Item =
  | { kind: 'group'; key: string | null; label: string; index: number }
  | { kind: 'row'; label: string; added: string; index: number };

/** Scroll the virtualized table top to bottom and collect every painted item by aria-rowindex. */
async function readWholeTable(table: Locator): Promise<Item[]> {
  const wrap = table.locator('xpath=ancestor::div[@data-slot="data-table"][1]');
  const byIndex = new Map<number, Item>();
  await wrap.evaluate((el) => {
    el.scrollTop = 0;
  });
  for (let step = 0; step < 200; step += 1) {
    await table.page().waitForTimeout(60);
    const items = await table.locator('tbody > tr').evaluateAll((trs) =>
      trs
        .filter((tr) =>
          ['data-table-row', 'data-table-group-row'].includes(tr.getAttribute('data-slot') ?? '')
        )
        .map((tr) => {
          const index = Number(tr.getAttribute('aria-rowindex'));
          if (tr.getAttribute('data-slot') === 'data-table-group-row') {
            return {
              kind: 'group' as const,
              key: tr.getAttribute('data-group-key'),
              label: tr.querySelector('th')?.textContent ?? '',
              index,
            };
          }
          const cells = Array.from(tr.querySelectorAll('td')).map((td) => td.textContent ?? '');
          const labelCell = tr.querySelector('td[data-column-id="label"]')?.textContent ?? '';
          const addedCell = tr.querySelector('td[data-column-id="added"]')?.textContent ?? '';
          return {
            kind: 'row' as const,
            label: labelCell || cells[2] || '',
            added: addedCell,
            index,
          };
        })
    );
    for (const item of items) {
      byIndex.set(item.index, item);
    }
    const atEnd = await wrap.evaluate((el) => {
      const done = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      el.scrollTop += Math.max(40, Math.floor(el.clientHeight / 2));
      return done;
    });
    if (atEnd) {
      break;
    }
  }
  return Array.from(byIndex.values()).sort((a, b) => a.index - b.index);
}

/** Sections in order, each with its rows' labels; asserts every row is under its own role. */
function sectionsOf(items: Item[]): { key: string | null; labels: string[]; added: string[] }[] {
  const sections: { key: string | null; labels: string[]; added: string[] }[] = [];
  items.forEach((item, n) => {
    expect(item.index, 'INV-35: consecutive aria-rowindex across the whole table').toBe(n + 2);
    if (item.kind === 'group') {
      sections.push({ key: item.key, labels: [], added: [] });
      return;
    }
    const current = sections.at(-1);
    expect(current, `INV-2: ${item.label} painted without a section`).toBeDefined();
    expect(expectedRole(item.label), `INV-2: ${item.label} under ${String(current!.key)}`).toBe(
      current!.key
    );
    current!.labels.push(item.label);
    current!.added.push(item.added);
  });
  return sections;
}

type AxNode = {
  nodeId: string;
  role?: { value?: string };
  name?: { value?: string };
  childIds?: string[];
  ignored?: boolean;
};

/** CDP accessibility read of the named table: header-row count, column headers, row headers. */
async function axReadTable(
  session: CDPSession,
  name: string
): Promise<{ headerRows: number; columnheaders: string[]; rowheaders: string[] }> {
  const { nodes } = (await session.send('Accessibility.getFullAXTree')) as { nodes: AxNode[] };
  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  const table = nodes.find((node) => node.role?.value === 'table' && node.name?.value === name);
  expect(table, `AX table "${name}"`).toBeDefined();
  const columnheaders: string[] = [];
  const rowheaders: string[] = [];
  let headerRows = 0;
  const walk = (id: string): void => {
    const node = byId.get(id);
    if (node == null) {
      return;
    }
    if (node.role?.value === 'row') {
      const cells = (node.childIds ?? []).map((child) => byId.get(child));
      if (cells.some((cell) => cell?.role?.value === 'columnheader')) {
        headerRows += 1;
      }
    }
    if (node.role?.value === 'columnheader') {
      columnheaders.push(node.name?.value ?? '');
    }
    if (node.role?.value === 'rowheader') {
      rowheaders.push(node.name?.value ?? '');
    }
    for (const child of node.childIds ?? []) {
      walk(child);
    }
  };
  walk(table!.nodeId);
  return { headerRows, columnheaders, rowheaders };
}

function compareLabels(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

test('SF-22: grouped keys stay in their sections through sort, select-all and scrolling', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByText('Data Display', { exact: true }).first().waitFor({ state: 'attached' });
  await clickVisibleText(page, 'Data Display');
  await clickVisibleText(page, 'DataTable');

  const table = page.getByRole('table', { name: GROUPED_CAPTION, exact: true });
  await expect(table).toBeVisible();
  await table.scrollIntoViewIfNeeded();
  const readout = page.getByText(/keys selected$/);
  const session = await page.context().newCDPSession(page);
  const evidence: Record<string, unknown> = {};

  // Scenario 1/4: one header row; sections are row headers named by their label.
  const ax = await axReadTable(session, GROUPED_CAPTION);
  expect(ax.headerRows, 'INV-34: exactly one header row').toBe(1);
  expect(ax.columnheaders).toHaveLength(4);
  expect(ax.rowheaders.length).toBeGreaterThan(0);
  expect(ax.rowheaders[0]).toMatch(/^Admin\b/);
  await expect(table.getByRole('columnheader')).toHaveCount(4);
  await expect(table.locator('thead tr')).toHaveCount(1);
  await expect(table).toHaveAttribute('aria-rowcount', String(1 + TOTAL + 4));
  evidence.axInitial = ax;

  // Initial order: first appearance (Admin, Minter, Pauser), then the "No role" section.
  const initial = sectionsOf(await readWholeTable(table));
  expect(initial.map((section) => section.key)).toEqual(['Admin', 'Minter', 'Pauser', null]);
  expect(initial.map((section) => section.labels.length)).toEqual([40, 37, 40, 3]);
  evidence.initial = initial.map((section) => ({ key: section.key, count: section.labels.length }));

  // Scenario 2: sort by Label (asc, desc) and Added (asc): sections fixed, rows sorted inside.
  const sorts: {
    button: RegExp;
    sort: string;
    check: (s: { labels: string[]; added: string[] }) => void;
  }[] = [
    {
      button: /Sort by Label/,
      sort: 'ascending',
      check: (s) => expect(s.labels).toEqual([...s.labels].sort(compareLabels)),
    },
    {
      button: /Sort by Label/,
      sort: 'descending',
      check: (s) => expect(s.labels).toEqual([...s.labels].sort(compareLabels).reverse()),
    },
    {
      button: /Sort by Added/,
      sort: 'ascending',
      check: (s) => expect(s.added).toEqual([...s.added].sort(compareLabels)),
    },
  ];
  const sortEvidence: unknown[] = [];
  for (const step of sorts) {
    await table.getByRole('button', { name: step.button }).click();
    const header = table.getByRole('columnheader', {
      name: step.button.source.includes('Label') ? /Label/ : /Added/,
    });
    await expect(header).toHaveAttribute('aria-sort', step.sort);
    const sections = sectionsOf(await readWholeTable(table));
    expect(
      sections.map((section) => section.key),
      `INV-12 after ${step.sort}`
    ).toEqual(['Admin', 'Minter', 'Pauser', null]);
    for (const section of sections) {
      step.check(section);
    }
    sortEvidence.push({
      sort: `${step.button.source} ${step.sort}`,
      sections: sections.map((section) => ({
        key: section.key,
        first: section.labels[0],
        last: section.labels.at(-1),
      })),
    });
  }
  evidence.sorts = sortEvidence;

  // Scenario 3: select-all counts data rows only.
  await table.locator('xpath=ancestor::div[@data-slot="data-table"][1]').evaluate((el) => {
    el.scrollTop = 0;
  });
  await table.getByRole('checkbox', { name: 'Select all keys' }).click();
  await expect(readout).toHaveText(`${String(TOTAL)} of ${String(TOTAL)} keys selected`);
  await expect(table.getByRole('checkbox', { name: 'Select all keys' })).toHaveAttribute(
    'aria-checked',
    'true'
  );
  evidence.readoutAfterSelectAll = await readout.textContent();

  // Scenario 3: scrolled to the end, mounted rows are consecutive and tile without overlap.
  const wrap = table.locator('xpath=ancestor::div[@data-slot="data-table"][1]');
  for (let pass = 0; pass < 4; pass += 1) {
    await wrap.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(120);
  }
  const boxes = await table.locator('tbody > tr').evaluateAll((trs) =>
    trs
      .filter((tr) =>
        ['data-table-row', 'data-table-group-row'].includes(tr.getAttribute('data-slot') ?? '')
      )
      .map((tr) => {
        const rect = tr.getBoundingClientRect();
        return {
          index: Number(tr.getAttribute('aria-rowindex')),
          top: rect.top,
          bottom: rect.bottom,
          slot: tr.getAttribute('data-slot'),
        };
      })
      .sort((a, b) => a.index - b.index)
  );
  expect(boxes.length).toBeGreaterThan(3);
  for (let n = 1; n < boxes.length; n += 1) {
    expect(boxes[n]!.index).toBe(boxes[n - 1]!.index + 1);
    expect(Math.abs(boxes[n]!.top - boxes[n - 1]!.bottom), 'INV-29: rows tile').toBeLessThanOrEqual(
      1
    );
  }
  expect(boxes.at(-1)!.index).toBe(1 + TOTAL + 4);
  expect(boxes.at(-1)!.slot).toBe('data-table-row');
  const wrapBox = await wrap.boundingBox();
  expect(boxes.at(-1)!.bottom).toBeLessThanOrEqual(wrapBox!.y + wrapBox!.height + 1);
  evidence.endWindow = { first: boxes[0], last: boxes.at(-1), mounted: boxes.length };
  const axEnd = await axReadTable(session, GROUPED_CAPTION);
  expect(axEnd.headerRows).toBe(1);
  expect(axEnd.rowheaders.at(-1)).toMatch(/^No role\b/);
  evidence.axEnd = axEnd;
  if (evidenceDir) {
    mkdirSync(evidenceDir, { recursive: true });
    await wrap.screenshot({ path: join(evidenceDir, 'keys-by-role-end.png') });
  }

  // INV-22: the paginated table repeats a split role at the top of the next page.
  const paged = page.getByRole('table', { name: PAGED_CAPTION, exact: true });
  await paged.scrollIntoViewIfNeeded();
  const root = paged.locator(
    'xpath=ancestor::div[@data-slot="data-table-frame" or @data-slot="data-table-root"][1]'
  );
  const pages: unknown[] = [];
  const expectedPages = [
    { sections: ['Admin', 'Minter'], rows: 5, status: 'Showing 1–5 of 12' },
    { sections: ['Minter (continued)', 'Pauser'], rows: 5, status: 'Showing 6–10 of 12' },
    { sections: ['Pauser (continued)'], rows: 2, status: 'Showing 11–12 of 12' },
  ];
  for (let n = 0; n < expectedPages.length; n++) {
    const expected = expectedPages[n];
    if (n > 0) {
      await root.locator('[data-slot="data-table-pagination-next"]').click();
    }
    await expect(paged.getByRole('rowheader')).toHaveText(expected.sections);
    await expect(paged.locator('tr[data-slot="data-table-row"]')).toHaveCount(expected.rows);
    await expect(root.locator('[data-slot="data-table-pagination-status"]')).toHaveText(
      expected.status
    );
    const lastSlot = await paged.locator('tbody > tr').last().getAttribute('data-slot');
    expect(lastSlot, 'INV-22: a page never ends on a section').toBe('data-table-row');
    pages.push({ page: n + 1, ...expected });
    if (evidenceDir && n === 1) {
      await root.screenshot({ path: join(evidenceDir, 'paginated-page-2.png') });
    }
  }
  evidence.paginated = pages;

  if (evidenceDir) {
    writeFileSync(
      join(evidenceDir, 'scenario-4-readout.json'),
      `${JSON.stringify(evidence, null, 2)}\n`
    );
  }
});
