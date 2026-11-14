/**
 * 007 SF-2 (prove-it-works): AmountField's symbol in Input's adornment slot, in the running
 * example app on the FormFields page, with the real stylesheet, in light and dark.
 *
 * Every field with a symbol on the page (the FormFields "Amount Field", the exact-entry and
 * grouped-display fields, the grouped restrictInput/padDecimals field, the five fields of the
 * "Amount Field: symbol" section and the read-only save demo's cap) is checked for:
 * - INV-4: with a value longer than the field, the text area ends at least 8px before the
 *   symbol (starts 8px after it for a prefix); `$` reserves less than `USD`, `USD` less than
 *   `USDC`.
 * - INV-5: the symbol's colour is the theme's muted text colour and meets 4.5:1 on the
 *   input's background (editable and focusable read-only).
 * - INV-11: the point at the symbol's centre hits the input.
 * - INV-17: the input's accessible description starts with the symbol.
 * - INV-12 / INV-18: after switching the network to Stellar, the symbol fields show and
 *   announce XLM, still clear of the text. (The app remounts the FormFields demo on a network
 *   switch, so this is not the in-place change; that one is in the jsdom and Chromium suites.)
 * - INV-14: during a disabled-mode save the read-only demo's symbol is dimmed with its input;
 *   during a readonly-mode save it keeps full opacity and 4.5:1.
 * - INV-18 / SC-004: axe finds no violation KIND on these regions that the 006 tip
 *   (`271efee34`) did not already report for the same region, state and theme. Kinds, not
 *   counts. The new grouped and symbol sections are compared with the 006 exact-entry
 *   section. No `color-contrast` node is a symbol, except a dimmed symbol on a disabled
 *   field, which WCAG 1.4.3 exempts (inactive component) and which is recorded, not failed.
 *
 * The 006 kinds below were recorded with this file's own scan on a build of `271efee34`
 * (`SF2_AXE_RECORD=<file>` writes the scan instead of comparing). Set SF2_EVIDENCE_DIR to also
 * write a JSON readout for the stage artifact.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { expect, test, type Page } from 'playwright/test';

const axeSource = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const evidenceDir = process.env.SF2_EVIDENCE_DIR;
const recordFile = process.env.SF2_AXE_RECORD;

type Theme = 'light' | 'dark';
const THEMES: Theme[] = ['light', 'dark'];

/** Longer than any field on the page at 1280px. */
const LONG = '123456789'.repeat(14) + '.5';

async function clickVisibleText(page: Page, text: string): Promise<void> {
  for (const match of await page.getByText(text, { exact: true }).all()) {
    if (await match.isVisible()) {
      await match.click();
      return;
    }
  }
  throw new Error(`No visible "${text}" navigation item`);
}

async function openFormFields(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 1400 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Forms' }).first().waitFor({ timeout: 90_000 });
  await clickVisibleText(page, 'Forms');
  await clickVisibleText(page, 'FormFields');
  // The FormFields "Amount Field" sits on the Number tab.
  await page.getByRole('tab', { name: 'Number' }).click({ timeout: 90_000 });
  await page.locator('#amountField').waitFor({ timeout: 90_000 });
  await page.getByTestId('readonly-save-demo').waitFor({ timeout: 90_000 });
}

/** Switches the theme class and waits for the colour transitions to finish. */
async function setTheme(page: Page, theme: Theme): Promise<void> {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.classList.toggle('light', t === 'light');
  }, theme);
  // A scan in mid-transition reads blended colours (SF-3 Tests): finish them first.
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    for (const a of document.getAnimations()) a.finish();
  });
}

// ---------------------------------------------------------------------------
// Symbol readout (geometry, colour, hit test, description), all in one evaluate
// ---------------------------------------------------------------------------

interface SymbolReadout {
  id: string;
  symbol: string;
  side: 'start' | 'end';
  gap: number;
  padding: number;
  overflows: boolean;
  color: string;
  mutedColor: string;
  background: string;
  ratio: number;
  opacity: number;
  disabled: boolean;
  readOnly: boolean;
  hitsInput: boolean;
  describedByFirst: string;
}

function readSymbols(page: Page): Promise<SymbolReadout[]> {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
    const rgb = (color: string): number[] => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data);
    };
    const lum = (c: string): number => {
      const [r = 0, g = 0, b = 0] = rgb(c).map((v) => {
        const s = v / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: string, b: string): number => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
      return (hi + 0.05) / (lo + 0.05);
    };
    const probe = document.createElement('span');
    probe.className = 'text-muted-foreground';
    document.body.appendChild(probe);
    const mutedColor = getComputedStyle(probe).color;
    probe.remove();

    return Array.from(document.querySelectorAll<HTMLElement>('[id$="-symbol"]')).map((node) => {
      const slot = node.parentElement as HTMLElement;
      const wrapper = slot.parentElement as HTMLElement;
      const input = wrapper.querySelector('input') as HTMLInputElement;
      const cs = getComputedStyle(input);
      const r = input.getBoundingClientRect();
      const s = slot.getBoundingClientRect();
      const side = slot.dataset.slot === 'input-start-adornment' ? 'start' : 'end';
      const contentLeft = r.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
      const contentRight = r.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);
      let opacity = 1;
      for (let n: HTMLElement | null = node; n && n !== wrapper; n = n.parentElement) {
        opacity *= parseFloat(getComputedStyle(n).opacity);
      }
      // elementFromPoint only sees the viewport: bring the field into view first.
      input.scrollIntoView({ block: 'center' });
      const n = node.getBoundingClientRect();
      const hit = document.elementFromPoint(n.left + n.width / 2, n.top + n.height / 2);
      const color = getComputedStyle(node).color;
      return {
        id: input.id,
        symbol: node.textContent ?? '',
        side,
        gap: side === 'end' ? s.left - contentRight : contentLeft - s.right,
        padding: parseFloat(side === 'end' ? cs.paddingRight : cs.paddingLeft),
        overflows: input.scrollWidth > input.clientWidth,
        color,
        mutedColor,
        background: cs.backgroundColor,
        ratio: Math.round(ratio(color, cs.backgroundColor) * 100) / 100,
        opacity,
        disabled: input.disabled,
        readOnly: input.readOnly,
        hitsInput: hit === input,
        describedByFirst: (input.getAttribute('aria-describedby') ?? '').split(/\s+/)[0] ?? '',
      } satisfies SymbolReadout;
    });
  });
}

/** Types LONG into every editable symbol field, then scrolls every field to its end. */
async function fillLong(page: Page): Promise<void> {
  for (const id of [
    'amountField',
    'amountDefaultEntry',
    'amountExactEntry',
    'amountGroupedDisplay',
    'amountGroupedRestrictPad',
  ]) {
    const input = page.locator(`#${id}`);
    if ((await input.count()) === 0) continue;
    await input.scrollIntoViewIfNeeded();
    // Focus first so a grouped/padded field shows plain text; filling the grouped
    // display under restrictInput can refuse the insert (commas in the DOM value).
    await input.click();
    await input.fill(LONG);
  }
  await page.locator('h1, h2').first().click(); // blur: the grouped field shows grouped text
  await page.evaluate(() => {
    for (const node of Array.from(document.querySelectorAll('[id$="-symbol"]'))) {
      const input = node.parentElement?.parentElement?.querySelector('input');
      if (input) input.scrollLeft = input.scrollWidth;
    }
  });
}

const evidence: Record<string, unknown> = {};

test.afterAll(() => {
  if (evidenceDir) {
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(
      join(evidenceDir, 'amount-symbol.json'),
      `${JSON.stringify(evidence, null, 2)}\n`
    );
  }
});

for (const theme of THEMES) {
  test(`INV-4 / INV-5 / INV-11 / INV-17: every symbol field on the page (${theme})`, async ({
    page,
  }) => {
    test.skip(Boolean(recordFile), 'recording the 006 axe baseline');
    await openFormFields(page);
    await fillLong(page);
    await setTheme(page, theme);
    const fields = await readSymbols(page);
    evidence[`symbols.${theme}`] = fields;

    // The page's symbol fields: FormFields, exact entry (2), grouped (2), grouped
    // restrictInput/padDecimals (1), symbol section (5), read-only save (1).
    expect(fields.map((f) => f.id).sort()).toEqual(
      [
        'amountField',
        'amountDefaultEntry',
        'amountExactEntry',
        'amountGroupedDisplay',
        'amountGroupedDisplayReadOnly',
        'amountGroupedRestrictPad',
        'amountSymbolPrefix',
        'amountSymbolUsd',
        'amountSymbolUsdc',
        'amountSymbolGrouped',
        'amountSymbolReadOnly',
        'roCap',
      ].sort()
    );
    for (const f of fields) {
      const label = `${f.id} (${f.symbol})`;
      // The save demo's cap holds a short value; every other field overflows.
      if (f.id !== 'roCap' && f.id !== 'amountGroupedDisplayReadOnly') {
        expect(f.overflows, `${label}: value longer than the field`).toBe(true);
      }
      expect(f.gap, `${label}: gap`).toBeGreaterThanOrEqual(7);
      expect(f.color, `${label}: muted text colour`).toBe(f.mutedColor);
      expect(f.opacity, `${label}: full opacity`).toBe(1);
      expect(f.ratio, `${label}: ${f.color} on ${f.background}`).toBeGreaterThanOrEqual(4.5);
      expect(f.hitsInput, `${label}: hit test`).toBe(true);
      expect(f.describedByFirst, `${label}: described by`).toBe(`${f.id}-symbol`);
    }
    const pad = (id: string): number => fields.find((f) => f.id === id)?.padding ?? NaN;
    expect(pad('amountSymbolPrefix')).toBeLessThan(pad('amountSymbolUsd')); // $ < USD
    expect(pad('amountSymbolUsd')).toBeLessThan(pad('amountSymbolUsdc')); // USD < USDC
    // Both input backgrounds are covered: editable and focusable read-only.
    expect(fields.some((f) => f.readOnly)).toBe(true);
    expect(fields.some((f) => !f.readOnly)).toBe(true);

    await expect(page.locator('#amountSymbolUsd')).toHaveAccessibleDescription(
      /^USD Up to 6 decimals/
    );
    await expect(page.locator('#amountField')).toHaveAccessibleDescription(
      /^ETH Token amount with symbol/
    );
    // A click on the symbol focuses the input.
    const usdc = page.locator('#amountSymbolUsdc-symbol');
    await usdc.click({ force: true });
    await expect(page.locator('#amountSymbolUsdc')).toBeFocused();
  });
}

test('INV-12 / INV-18: after switching the network to Stellar the fields show and announce XLM', async ({
  page,
}) => {
  test.skip(Boolean(recordFile), 'recording the 006 axe baseline');
  await openFormFields(page);
  await page
    .getByRole('button', { name: /Ethereum - Sepolia|Ethereum - Mainnet/ })
    .first()
    .click();
  await page.getByRole('menuitem', { name: 'Stellar - Testnet' }).click();
  await expect(page.locator('#amountExactEntry-symbol')).toHaveText('XLM', { timeout: 30_000 });
  // The demo remounts on the switch: back to the Number tab for the FormFields field.
  await page.getByRole('tab', { name: 'Number' }).click();
  const input = page.locator('#amountField');
  await expect(page.locator('#amountField-symbol')).toHaveText('XLM', { timeout: 30_000 });
  await expect(input).toHaveAccessibleDescription(/^XLM Token amount with symbol/);
  await expect(page.locator('#amountExactEntry')).toHaveAccessibleDescription(/^XLM Use/);
  await input.fill(LONG);
  await input.evaluate((el: HTMLInputElement) => {
    el.scrollLeft = el.scrollWidth;
  });
  const fields = await readSymbols(page);
  evidence.stellar = fields;
  for (const id of ['amountField', 'amountExactEntry', 'roCap']) {
    const field = fields.find((f) => f.id === id);
    expect(field?.symbol, id).toBe('XLM');
    expect(field?.gap, id).toBeGreaterThanOrEqual(7);
    expect(field?.describedByFirst, id).toBe(`${id}-symbol`);
  }
});

async function startSave(page: Page, mode: 'readonly' | 'disabled'): Promise<void> {
  await page.getByTestId(`readonly-save-mode-${mode}`).click();
  await page.locator('#roName').click();
  await page.keyboard.press('Enter'); // implicit submit → Simulate save
  await expect(page.getByTestId('readonly-save-status')).toHaveText('Saving…');
}

async function finishSave(page: Page): Promise<void> {
  await page.getByTestId('readonly-save-finish').click();
  await expect(page.getByTestId('readonly-save-status')).toHaveText('Idle');
}

for (const theme of THEMES) {
  test(`INV-14: the save demo dims the symbol only on a disabled field (${theme})`, async ({
    page,
  }) => {
    test.skip(Boolean(recordFile), 'recording the 006 axe baseline');
    await openFormFields(page);
    await setTheme(page, theme);
    const cap = async (): Promise<SymbolReadout | undefined> =>
      (await readSymbols(page)).find((f) => f.id === 'roCap');

    await startSave(page, 'readonly');
    const readonly = await cap();
    expect(readonly?.readOnly).toBe(true);
    expect(readonly?.disabled).toBe(false);
    expect(readonly?.opacity).toBe(1);
    expect(readonly?.ratio).toBeGreaterThanOrEqual(4.5);
    await finishSave(page);

    await startSave(page, 'disabled');
    const disabled = await cap();
    expect(disabled?.disabled).toBe(true);
    expect(disabled?.opacity).toBe(0.5); // dimmed with the input: WCAG 1.4.3 inactive component
    await finishSave(page);
    evidence[`save.${theme}`] = { readonly, disabled };
  });
}

// ---------------------------------------------------------------------------
// INV-18 / SC-004: axe kinds against the 006 tip
// ---------------------------------------------------------------------------

type Region =
  | 'formFieldsAmount'
  | 'exactEntry'
  | 'groupedDisplay'
  | 'symbolSection'
  | 'saveIdle'
  | 'saveReadonly'
  | 'saveDisabled';

interface Finding {
  id: string;
  nodes: string[];
}

/**
 * axe kinds per region on the 006 tip, recorded with `SF2_AXE_RECORD` on a build of
 * `271efee34` (2026-11-13). Every `color-contrast` node there is the old `text-gray-500`
 * symbol span; `aria-allowed-attr` is the save demo's `#roOwner` input. The grouped and
 * symbol sections did not exist yet.
 */
const BASELINE_006: Record<Theme, Partial<Record<Region, string[]>>> = {
  light: {
    formFieldsAmount: [],
    exactEntry: [],
    saveIdle: ['aria-allowed-attr'],
    saveReadonly: ['color-contrast'],
    saveDisabled: ['aria-allowed-attr'],
  },
  dark: {
    formFieldsAmount: ['color-contrast'],
    exactEntry: ['color-contrast'],
    saveIdle: ['aria-allowed-attr'],
    saveReadonly: ['color-contrast'],
    saveDisabled: ['aria-allowed-attr', 'color-contrast'],
  },
};

/** Regions that did not exist on the 006 tip compare with the 006 exact-entry section. */
const BASELINE_REGION: Partial<Record<Region, Region>> = {
  groupedDisplay: 'exactEntry',
  symbolSection: 'exactEntry',
};

async function scan(page: Page, region: Region): Promise<Finding[] | null> {
  return page.evaluate(async (r) => {
    const roots: Record<string, () => Element | null | undefined> = {
      formFieldsAmount: () => document.getElementById('amountField')?.closest('div.flex-col'),
      exactEntry: () =>
        document.querySelector('section[aria-labelledby="amount-exact-entry-heading"]'),
      groupedDisplay: () =>
        document.querySelector('section[aria-labelledby="amount-grouped-display-heading"]'),
      symbolSection: () =>
        document.querySelector('section[aria-labelledby="amount-symbol-heading"]'),
      saveIdle: () => document.querySelector('[data-testid="readonly-save-demo"]'),
      saveReadonly: () => document.querySelector('[data-testid="readonly-save-demo"]'),
      saveDisabled: () => document.querySelector('[data-testid="readonly-save-demo"]'),
    };
    const root = roots[r]?.();
    if (!root) return null;
    const axe = (
      window as unknown as {
        axe: {
          run: (c: Element) => Promise<{ violations: { id: string; nodes: { html: string }[] }[] }>;
        };
      }
    ).axe;
    const result = await axe.run(root);
    return result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.html) }));
  }, region);
}

async function scanAll(page: Page): Promise<Partial<Record<Region, Finding[]>>> {
  const out: Partial<Record<Region, Finding[]>> = {};
  const take = async (region: Region): Promise<void> => {
    const found = await scan(page, region);
    if (found) out[region] = found;
  };
  for (const region of [
    'formFieldsAmount',
    'exactEntry',
    'groupedDisplay',
    'symbolSection',
  ] as const) {
    await take(region);
  }
  await take('saveIdle');
  await startSave(page, 'readonly');
  await take('saveReadonly');
  await finishSave(page);
  await startSave(page, 'disabled');
  await take('saveDisabled');
  await finishSave(page);
  return out;
}

const isSymbolNode = (html: string): boolean =>
  /id="[^"]*-symbol"|data-slot="input-(start|end)-adornment"/.test(html);

for (const theme of THEMES) {
  test(`INV-18 / SC-004: no axe kind the 006 tip lacks, no symbol contrast node (${theme})`, async ({
    page,
  }) => {
    await openFormFields(page);
    await setTheme(page, theme);
    await page.addScriptTag({ path: axeSource });
    const found = await scanAll(page);
    const kinds = (f: Finding[] | undefined): string[] =>
      Array.from(new Set((f ?? []).map((v) => v.id))).sort();

    if (recordFile) {
      const record = Object.fromEntries(
        Object.entries(found).map(([region, f]) => [region, { kinds: kinds(f), findings: f }])
      );
      mkdirSync(join(recordFile, '..'), { recursive: true });
      writeFileSync(
        recordFile.replace(/(\.json)?$/, `.${theme}.json`),
        JSON.stringify(record, null, 2)
      );
      return;
    }

    evidence[`axe.${theme}`] = found;
    // Every region was found and scanned: a missing section can't pass silently.
    expect(Object.keys(found).sort()).toEqual(
      [
        'exactEntry',
        'formFieldsAmount',
        'groupedDisplay',
        'saveDisabled',
        'saveIdle',
        'saveReadonly',
        'symbolSection',
      ].sort()
    );
    const exempt: string[] = [];
    for (const [region, raw] of Object.entries(found) as [Region, Finding[]][]) {
      // A dimmed symbol on a disabled field is exempt (WCAG 1.4.3, inactive component):
      // recorded, then left out of the comparison. Only the disabled-mode save has one.
      const findings = raw
        .map((v) => {
          if (region !== 'saveDisabled' || v.id !== 'color-contrast') return v;
          exempt.push(...v.nodes.filter(isSymbolNode));
          return { ...v, nodes: v.nodes.filter((n) => !isSymbolNode(n)) };
        })
        .filter((v) => v.nodes.length > 0);
      const baseRegion = BASELINE_REGION[region] ?? region;
      const allowed = BASELINE_006[theme][baseRegion];
      expect(allowed, `${region}: 006 baseline recorded`).toBeDefined();
      const newKinds = kinds(findings).filter((id) => !(allowed ?? []).includes(id));
      expect(newKinds, `${region} (${theme}): ${JSON.stringify(findings)}`).toEqual([]);
      for (const v of findings.filter((f) => f.id === 'color-contrast')) {
        expect(v.nodes.filter(isSymbolNode), `${region} (${theme}): symbol flagged`).toEqual([]);
      }
    }
    evidence[`axe.${theme}.exempt`] = exempt;
    if (exempt.length) {
      test.info().annotations.push({
        type: 'WCAG 1.4.3 exempt (disabled field)',
        description: `${theme}: ${exempt.join(' | ')}`,
      });
    }
  });
}
