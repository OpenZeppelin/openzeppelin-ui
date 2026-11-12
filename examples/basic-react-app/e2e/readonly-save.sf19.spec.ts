/**
 * 005 SF-19 scenario 4 / SC-001 (prove-it-works): the "Read-only while saving" demo on the
 * FormFields page, in the running example app.
 *
 * - INV-28 / INV-29 / INV-11 / INV-24: focus a field, Enter saves, the active element is the same
 *   node with the same selection during the save, no keyboard edit changes any value, and the
 *   payload read during the save has all five values (plus SF-20's `role`). `disabled (today)`
 *   mode drops focus to <body> and drops the values (INV-1 / INV-10 contrast).
 * - INV-3: the read-only look applies only to `[data-readonly]:read-only:not(:disabled)`; every
 *   other state of the real Input / Textarea class string computes exactly like the same class
 *   string with the four SF-19 look tokens removed (= the pre-SF-19 class), in light and dark.
 * - INV-4: the look is opacity 1, a background distinct from editable and disabled, default
 *   cursor, text contrast >= 4.5:1, and the same border / error / focus ring as editable, in
 *   light and dark.
 * - INV-30: CDP accessibility tree during the save (readonly, not disabled, same names), and Tab
 *   reaches every read-only field.
 *
 * Set SF19_EVIDENCE_DIR to also write a JSON readout and light/dark screenshots.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Locator, type Page } from 'playwright/test';

const evidenceDir = process.env.SF19_EVIDENCE_DIR;
const evidence: Record<string, unknown> = {};

const IDS = ['roName', 'roThreshold', 'roCap', 'roOwner', 'roNotes'] as const;
const NAMES: Record<(typeof IDS)[number], string> = {
  roName: 'name',
  roThreshold: 'threshold',
  roCap: 'cap',
  roOwner: 'owner',
  roNotes: 'notes',
};
const LOOK_TOKEN = /\s?data-readonly:read-only:not-disabled:[\w-]+/g;

async function clickVisibleText(page: Page, text: string): Promise<void> {
  for (const match of await page.getByText(text, { exact: true }).all()) {
    if (await match.isVisible()) {
      await match.click();
      return;
    }
  }
  throw new Error(`No visible "${text}" navigation item`);
}

async function openDemo(page: Page): Promise<Locator> {
  await page.setViewportSize({ width: 1280, height: 1400 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Forms' }).first().waitFor({ timeout: 90_000 });
  await clickVisibleText(page, 'Forms');
  await clickVisibleText(page, 'FormFields');
  const demo = page.getByTestId('readonly-save-demo');
  await demo.waitFor({ timeout: 90_000 });
  await demo.scrollIntoViewIfNeeded();
  return demo;
}

async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.classList.toggle('light', t === 'light');
  }, theme);
}

async function shot(locator: Locator, name: string): Promise<void> {
  if (evidenceDir) await locator.screenshot({ path: join(evidenceDir, name) });
}

async function values(page: Page): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const id of IDS) out[id] = await page.locator(`#${id}`).inputValue();
  return out;
}

async function startSave(page: Page): Promise<void> {
  const name = page.locator('#roName');
  await name.click();
  await name.evaluate((el: HTMLInputElement) => {
    el.setSelectionRange(2, 5);
    (window as unknown as { __sf19Node: Element }).__sf19Node = el;
  });
  await page.keyboard.press('Enter'); // implicit submit → Simulate save
  await expect(page.getByTestId('readonly-save-status')).toHaveText('Saving…');
  await page.getByTestId('readonly-save-payload').waitFor();
}

const activeIsSameNode = (page: Page): Promise<boolean> =>
  page.evaluate(
    () => document.activeElement === (window as unknown as { __sf19Node: Element }).__sf19Node
  );

test.afterAll(() => {
  if (evidenceDir) {
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(join(evidenceDir, 'readonly-save.sf19.json'), JSON.stringify(evidence, null, 2));
  }
});

test('scenario 4: readonly save keeps focus, blocks edits, and submits every value', async ({
  page,
}) => {
  test.setTimeout(240_000);
  if (evidenceDir) mkdirSync(evidenceDir, { recursive: true });
  const demo = await openDemo(page);
  const idle = await values(page);
  const owner = idle.roOwner;
  expect(owner).toMatch(/^0x[0-9a-fA-F]{40}$|^G[A-Z0-9]{55}$/);

  // readonly mode (default selection in the demo)
  await expect(page.getByTestId('readonly-save-mode-readonly')).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await startSave(page);
  expect(await activeIsSameNode(page)).toBe(true);
  expect(
    await page
      .locator('#roName')
      .evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd])
  ).toStrictEqual([2, 5]);

  for (const id of IDS) {
    const el = page.locator(`#${id}`);
    await expect(el).toHaveAttribute('readonly', '');
    await expect(el).toHaveAttribute('data-readonly', '');
    await expect(el).not.toBeDisabled();
  }

  // Every edit path, every field: typing, Backspace, Delete, arrows, Escape, paste, cut, undo.
  await page.evaluate(() => navigator.clipboard?.writeText?.('PASTED').catch(() => undefined));
  for (const id of IDS) {
    await page.locator(`#${id}`).focus();
    await page.keyboard.type('x9');
    for (const k of ['Backspace', 'Delete', 'ArrowUp', 'ArrowDown', 'Escape']) {
      await page.keyboard.press(k);
    }
    await page.keyboard.press('ControlOrMeta+v');
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('ControlOrMeta+x');
    await page.keyboard.press('ControlOrMeta+z');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe(id);
  }
  await page.locator('#roName').focus(); // blur the last one too (no reformat, INV-14)
  expect(await values(page)).toStrictEqual(idle);

  const payload = JSON.parse(await page.getByTestId('readonly-save-payload').innerText());
  // SF-20 added the Role select (readOnlyMode="readonly" keeps its value in the payload too).
  expect(payload).toStrictEqual({
    name: 'Treasury',
    notes: 'Multisig for protocol fees.',
    threshold: 3,
    cap: '1.50',
    owner,
    role: 'operator',
  });
  expect(idle.roCap).toBe('1.50');

  // Tab reaches every read-only field, in DOM order (INV-30 tab order).
  await page.locator('#roName').focus();
  const tabbed: string[] = [];
  for (let i = 0; i < 12 && tabbed.length < IDS.length - 1; i++) {
    await page.keyboard.press('Tab');
    const id = await page.evaluate(() => document.activeElement?.id ?? '');
    if ((IDS as readonly string[]).includes(id) && !tabbed.includes(id)) tabbed.push(id);
  }
  expect(tabbed).toStrictEqual(['roThreshold', 'roCap', 'roOwner', 'roNotes']);

  await setTheme(page, 'light');
  await shot(demo, 'demo-readonly-saving.light.png');
  await setTheme(page, 'dark');
  await shot(demo, 'demo-readonly-saving.dark.png');
  await setTheme(page, 'light');

  // Finish save: editable again, no residue (INV-20).
  await page.getByTestId('readonly-save-finish').click();
  await expect(page.getByTestId('readonly-save-status')).toHaveText('Idle');
  for (const id of IDS) {
    await expect(page.locator(`#${id}`)).not.toHaveAttribute('readonly', '');
  }
  await page.locator('#roName').click();
  await page.keyboard.press('End');
  await page.keyboard.type('!');
  await expect(page.locator('#roName')).toHaveValue('Treasury!');
  await page.keyboard.press('Backspace');

  // disabled (today): focus drops to <body>, values drop out except SelectField, which ignores
  // readOnly without the opt-in (SF-20 INV-1), so `role` stays. 006 SF-2: AmountField is locked
  // like the other text fields, so `cap` is gone too.
  await page.getByTestId('readonly-save-mode-disabled').click();
  await startSave(page);
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY');
  const todayPayload = JSON.parse(await page.getByTestId('readonly-save-payload').innerText());
  expect(Object.keys(todayPayload)).toStrictEqual(['role']);
  expect(todayPayload.role).toBe('operator');
  // 006 SF-2: the amount input is locked the same way: a forced click and typing reach neither
  // the control nor focus.
  const cap = page.locator('#roCap');
  await expect(cap).toBeDisabled();
  await expect(cap).not.toHaveAttribute('readonly');
  await cap.click({ force: true });
  await page.keyboard.type('9');
  await expect(cap).toHaveValue('1.50');
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY');
  // 006 SF-3: the notes textarea is locked like the other text fields: a forced click and
  // typing reach neither the control nor focus.
  const notes = page.locator('#roNotes');
  await expect(notes).toBeDisabled();
  await notes.click({ force: true });
  await page.keyboard.type('x');
  await expect(notes).toHaveValue('Multisig for protocol fees.');
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY');
  await setTheme(page, 'light');
  await shot(demo, 'demo-disabled-saving.light.png');
  await setTheme(page, 'dark');
  await shot(demo, 'demo-disabled-saving.dark.png');
  await setTheme(page, 'light');
  await page.getByTestId('readonly-save-finish').click();
  // 006 SF-2: after the save the amount input is editable again, with the same value.
  await expect(cap).toBeEnabled();
  await expect(cap).toHaveValue('1.50');
  // 006 SF-3: after the save the notes textarea is editable again, with the same text.
  await expect(notes).toBeEnabled();
  await expect(notes).toHaveValue('Multisig for protocol fees.');
  await page.getByTestId('readonly-save-mode-readonly').click();

  evidence.scenario4 = {
    idle,
    readonlyPayload: payload,
    disabledPayload: todayPayload,
    tabOrder: ['roName', ...tabbed],
  };
});

test('INV-30: CDP accessibility tree during the save: read-only, not disabled, same names', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await openDemo(page);
  const session = await page.context().newCDPSession(page);
  type AXNode = {
    role?: { value: string };
    name?: { value: string };
    description?: { value: string };
    properties?: Array<{ name: string; value: { value: unknown } }>;
  };
  const snapshot = async (): Promise<Record<string, unknown>> => {
    const out: Record<string, unknown> = {};
    for (const id of IDS) {
      const { node } = (await session.send('DOM.describeNode', {
        objectId: (
          await session.send('Runtime.evaluate', {
            expression: `document.getElementById('${id}')`,
          })
        ).result.objectId,
      })) as { node: { backendNodeId: number } };
      const { nodes } = (await session.send('Accessibility.getPartialAXTree', {
        backendNodeId: node.backendNodeId,
        fetchRelatives: false,
      })) as { nodes: AXNode[] };
      const n = nodes[0];
      const props = Object.fromEntries((n.properties ?? []).map((p) => [p.name, p.value.value]));
      out[NAMES[id]] = {
        role: n.role?.value,
        name: n.name?.value,
        description: n.description?.value,
        readonly: props.readonly,
        disabled: props.disabled,
        focusable: props.focusable,
        settable: props.settable,
      };
    }
    return out;
  };
  const idle = await snapshot();
  await startSave(page);
  const saving = await snapshot();

  for (const id of IDS) {
    const before = idle[NAMES[id]] as Record<string, unknown>;
    const during = saving[NAMES[id]] as Record<string, unknown>;
    expect(during.readonly, id).toBe(true);
    expect(during.disabled, id).toBeUndefined();
    expect(during.focusable, id).toBe(true);
    expect(during.settable, id).toBeUndefined();
    expect({ role: during.role, name: during.name, description: during.description }).toStrictEqual(
      { role: before.role, name: before.name, description: before.description }
    );
  }
  await page.getByTestId('readonly-save-finish').click();
  evidence.ax = { idle, saving };
});

/** Style probes on elements built from the real Input / Textarea class strings in the page. */
const PROPS = [
  'opacity',
  'background-color',
  'color',
  'cursor',
  'border-top-color',
  'border-top-width',
  'box-shadow',
  'outline-style',
] as const;

type StateKey =
  | 'editable'
  | 'readOnly'
  | 'readOnly+data-readonly'
  | 'disabled'
  | 'disabled+data-readonly'
  | 'data-readonly only'
  | 'editable+invalid'
  | 'readOnly+data-readonly+invalid'
  | 'editable+focus'
  | 'readOnly+data-readonly+focus';

async function styleMatrix(
  page: Page,
  sourceId: string,
  tag: 'input' | 'textarea'
): Promise<Record<StateKey, { kit: Record<string, string>; today: Record<string, string> }>> {
  return page.evaluate(
    ({ sourceId, tag, props, look }) => {
      const source = document.getElementById(sourceId) as HTMLElement;
      const kitClass = source.className;
      const todayClass = kitClass.replace(new RegExp(look, 'g'), '');
      const errorClasses = [
        'border-destructive',
        'focus:border-destructive',
        'focus:ring-destructive/30',
      ];
      const states: Record<string, (el: HTMLElement) => void> = {
        editable: () => undefined,
        readOnly: (el) => el.setAttribute('readonly', ''),
        'readOnly+data-readonly': (el) => {
          el.setAttribute('readonly', '');
          el.setAttribute('data-readonly', '');
        },
        disabled: (el) => el.setAttribute('disabled', ''),
        'disabled+data-readonly': (el) => {
          el.setAttribute('disabled', '');
          el.setAttribute('data-readonly', '');
        },
        'data-readonly only': (el) => el.setAttribute('data-readonly', ''),
        // A field with an error adds aria-invalid and getValidationStateClasses(error) to the
        // base class (Input has no aria-invalid variant of its own; Textarea has one); the kit's
        // cn() (tailwind-merge) then drops the conflicting border-input.
        'editable+invalid': (el) => {
          el.setAttribute('aria-invalid', 'true');
          el.classList.remove('border-input');
          el.classList.add(...errorClasses);
        },
        'readOnly+data-readonly+invalid': (el) => {
          el.setAttribute('readonly', '');
          el.setAttribute('data-readonly', '');
          el.setAttribute('aria-invalid', 'true');
          el.classList.remove('border-input');
          el.classList.add(...errorClasses);
        },
        'editable+focus': (el) => el.setAttribute('data-sf19-focus', ''),
        'readOnly+data-readonly+focus': (el) => {
          el.setAttribute('readonly', '');
          el.setAttribute('data-readonly', '');
          el.setAttribute('data-sf19-focus', '');
        },
      };
      const host = source.parentElement as HTMLElement;
      const read = (cls: string, apply: (el: HTMLElement) => void): Record<string, string> => {
        const el = document.createElement(tag);
        el.className = cls;
        apply(el);
        host.appendChild(el);
        if (el.hasAttribute('data-sf19-focus')) el.focus();
        const s = getComputedStyle(el);
        const out: Record<string, string> = {};
        for (const p of props) out[p] = s.getPropertyValue(p);
        el.remove();
        return out;
      };
      const result: Record<string, { kit: Record<string, string>; today: Record<string, string> }> =
        {};
      for (const [k, apply] of Object.entries(states)) {
        result[k] = { kit: read(kitClass, apply), today: read(todayClass, apply) };
      }
      return result;
    },
    { sourceId, tag, props: [...PROPS], look: LOOK_TOKEN.source }
  ) as Promise<Record<StateKey, { kit: Record<string, string>; today: Record<string, string> }>>;
}

test('INV-3: only [data-readonly]:read-only:not(:disabled) changes style, light and dark', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await openDemo(page);
  const out: Record<string, unknown> = {};
  for (const theme of ['light', 'dark'] as const) {
    await setTheme(page, theme);
    for (const [id, tag] of [
      ['roName', 'input'],
      ['roNotes', 'textarea'],
    ] as const) {
      const m = await styleMatrix(page, id, tag);
      for (const [state, { kit, today }] of Object.entries(m)) {
        if (state.startsWith('readOnly+data-readonly')) {
          expect(kit, `${theme} ${tag} ${state}`).not.toStrictEqual(today);
        } else {
          expect(kit, `${theme} ${tag} ${state}`).toStrictEqual(today);
        }
      }
      out[`${theme}.${tag}`] = m;
    }
  }
  await setTheme(page, 'light');
  evidence.inv3 = out;
});

/** sRGB relative luminance of a CSS color, via a 1x1 canvas (handles oklch). */
async function contrast(page: Page, fg: string, bg: string): Promise<number> {
  return page.evaluate(
    ({ fg, bg }) => {
      const rgb = (c: string): [number, number, number] => {
        const cv = document.createElement('canvas');
        cv.width = cv.height = 1;
        const ctx = cv.getContext('2d') as CanvasRenderingContext2D;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, 1, 1);
        ctx.fillStyle = c;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        return [d[0], d[1], d[2]];
      };
      const lum = ([r, g, b]: [number, number, number]): number => {
        const f = (v: number): number => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const [a, b] = [lum(rgb(fg)), lum(rgb(bg))];
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    },
    { fg, bg }
  );
}

test('INV-4: the look is distinct from editable and disabled and legible, light and dark', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await openDemo(page);
  const out: Record<string, unknown> = {};
  const CONTROLS = [
    ['roName', 'input'],
    ['roNotes', 'textarea'],
  ] as const;

  // Measure from the pristine class strings first: the live save below touches #roName, which
  // adds the field's own `border-success` validation class to it.
  const matrices: Record<string, Awaited<ReturnType<typeof styleMatrix>>> = {};
  for (const theme of ['light', 'dark'] as const) {
    await setTheme(page, theme);
    for (const [id, tag] of CONTROLS)
      matrices[`${theme}.${tag}`] = await styleMatrix(page, id, tag);
  }

  for (const theme of ['light', 'dark'] as const) {
    await setTheme(page, theme);
    for (const [, tag] of CONTROLS) {
      const m = matrices[`${theme}.${tag}`];
      const look = m['readOnly+data-readonly'].kit;
      const editable = m.editable.kit;
      const disabled = m.disabled.kit;
      const ratio = await contrast(page, look.color, look['background-color']);
      const label = `${theme} ${tag}`;
      expect(look.opacity, label).toBe('1');
      expect(disabled.opacity, label).toBe('0.5');
      expect(look['background-color'], label).not.toBe(editable['background-color']);
      expect(look['background-color'], label).not.toBe(disabled['background-color']);
      expect(look.cursor, label).toBe('default');
      expect(disabled.cursor, label).toBe('not-allowed');
      expect(ratio, label).toBeGreaterThanOrEqual(4.5);
      expect(look['border-top-color'], label).toBe(editable['border-top-color']);
      expect(look['border-top-width'], label).toBe(editable['border-top-width']);
      // aria-invalid error styling and the focus-visible ring: same as editable, and present.
      const lookInvalid = m['readOnly+data-readonly+invalid'].kit;
      const editInvalid = m['editable+invalid'].kit;
      expect(lookInvalid['border-top-color'], label).toBe(editInvalid['border-top-color']);
      expect(lookInvalid['box-shadow'], label).toBe(editInvalid['box-shadow']);
      expect(editInvalid['border-top-color'], label).not.toBe(editable['border-top-color']);
      const lookFocus = m['readOnly+data-readonly+focus'].kit;
      const editFocus = m['editable+focus'].kit;
      expect(lookFocus['box-shadow'], label).toBe(editFocus['box-shadow']);
      expect(editFocus['box-shadow'], label).not.toBe(editable['box-shadow']);
      out[label] = {
        look,
        editable,
        disabled,
        lookInvalid,
        editInvalid,
        lookFocus,
        editFocus,
        contrast: Number(ratio.toFixed(2)),
      };
    }

    // Live demo field: border and ring (incl. the field's own validation classes) do not change
    // at the switch.
    const name = page.locator('#roName');
    const ringAndBorder = async (): Promise<Record<string, string>> =>
      name.evaluate((el: HTMLInputElement) => {
        el.setAttribute('aria-invalid', 'true');
        el.focus();
        const s = getComputedStyle(el);
        const r = {
          border: s.borderTopColor,
          shadow: s.boxShadow,
          focusVisible: String(el.matches(':focus-visible')),
        };
        el.setAttribute('aria-invalid', 'false');
        return r;
      });
    await name.click();
    const editableRing = await ringAndBorder();
    await startSave(page);
    const readonlyRing = await ringAndBorder();
    expect(readonlyRing, theme).toStrictEqual(editableRing);
    await page.getByTestId('readonly-save-finish').click();
    out[`${theme} ring+error`] = { editableRing, readonlyRing };
  }
  await setTheme(page, 'light');
  evidence.inv4 = out;
});
