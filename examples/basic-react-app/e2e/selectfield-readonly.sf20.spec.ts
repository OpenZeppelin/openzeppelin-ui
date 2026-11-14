/**
 * 005 SF-20 scenario 3 / SC-001 (prove-it-works): the Role select in the "Read-only while saving"
 * demo on the FormFields page, in the running example app.
 *
 * - Scenario 3 / INV-12 / INV-13 / INV-26 / INV-27: during "Simulate save" in readonly mode, Tab
 *   to the select and try Enter, Space, ArrowDown, ArrowUp, Home, typeahead, a real mouse click
 *   and a label click. No listbox is ever added, focus stays on the trigger, the shown value and
 *   the form value stay Operator, and the payload read during the save has `role: 'operator'`.
 *   `disabled (today)` mode leaves the select editable and in the payload (INV-1).
 * - INV-28: CDP accessibility tree during the save: combobox named "Role", description contains
 *   "Read-only", focusable, not disabled, collapsed; none of that before the save.
 * - INV-4: the look tokens apply only to `[data-readonly]:not(:disabled)`; every other state of
 *   the real SelectTrigger class string computes exactly like that class without the four SF-20
 *   tokens (= the pre-SF-20 class), in light and dark.
 * - INV-5: the read-only trigger has opacity 1, a background distinct from editable and disabled,
 *   default cursor, value contrast >= 4.5:1, the chevron, and the same focus treatment as editable.
 * - INV-20: the trigger, the next field and the form footer don't move at the switch.
 *
 * Set SF20_EVIDENCE_DIR to also write a JSON readout and light/dark screenshots.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Locator, type Page } from 'playwright/test';

const evidenceDir = process.env.SF20_EVIDENCE_DIR;
const evidence: Record<string, unknown> = {};
const byTheme = (key: string): Record<string, unknown> =>
  (evidence[key] ??= {}) as Record<string, unknown>;

const LOOK_TOKEN = /\s?data-readonly:not-disabled:[\w-]+/g;

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
  // Record every listbox ever added to the page from here on.
  await page.evaluate(() => {
    const w = window as unknown as { __sf20Listboxes: number };
    w.__sf20Listboxes = 0;
    new MutationObserver((records) => {
      for (const r of records) {
        for (const n of Array.from(r.addedNodes)) {
          if (
            n instanceof Element &&
            (n.matches('[role="listbox"]') || n.querySelector('[role="listbox"]'))
          ) {
            w.__sf20Listboxes += 1;
          }
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
  return demo;
}

const listboxesSeen = (page: Page): Promise<number> =>
  page.evaluate(() => (window as unknown as { __sf20Listboxes: number }).__sf20Listboxes);

const activeId = (page: Page): Promise<string> =>
  page.evaluate(() => document.activeElement?.id ?? '');

async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.classList.toggle('light', t === 'light');
  }, theme);
}

async function shot(locator: Locator, name: string): Promise<void> {
  if (evidenceDir) await locator.screenshot({ path: join(evidenceDir, name) });
}

/** Simulate save from the Name field (Enter = implicit submit), wait for the payload. */
async function startSave(page: Page): Promise<void> {
  await page.locator('#roName').click();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('readonly-save-status')).toHaveText('Saving…');
  await page.getByTestId('readonly-save-payload').waitFor();
}

async function finishSave(page: Page): Promise<void> {
  await page.getByTestId('readonly-save-finish').click();
  await expect(page.getByTestId('readonly-save-status')).toHaveText('Idle');
}

/** Tab forward from the Owner field until the Role trigger has focus. */
async function tabToRole(page: Page): Promise<void> {
  await page.locator('#roOwner').focus();
  for (let i = 0; i < 6 && (await activeId(page)) !== 'roRole'; i++) {
    await page.keyboard.press('Tab');
  }
  expect(await activeId(page)).toBe('roRole');
}

test.afterAll(() => {
  if (evidenceDir) {
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(
      join(evidenceDir, 'selectfield-readonly.sf20.json'),
      JSON.stringify(evidence, null, 2)
    );
  }
});

test('scenario 3: during the save the Role select never opens, keeps focus, and is in the payload', async ({
  page,
}) => {
  test.setTimeout(240_000);
  if (evidenceDir) mkdirSync(evidenceDir, { recursive: true });
  const demo = await openDemo(page);
  const role = page.locator('#roRole');

  // INV-26: one SelectField in the demo, labelled Role, three options, default Operator.
  await expect(demo.getByRole('combobox')).toHaveCount(1);
  await expect(role).toHaveText('Operator');
  await expect(page.locator('label[for="roRole"]')).toHaveText(/^Role/);
  expect(await demo.innerText()).not.toMatch(/disabled mode disables the select/i);

  await expect(page.getByTestId('readonly-save-mode-readonly')).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await startSave(page);
  await expect(role).toHaveAttribute('aria-readonly', 'true');
  await expect(role).toHaveAttribute('data-readonly', '');
  await expect(role).not.toBeDisabled();
  await expect(role).not.toHaveAttribute('aria-disabled');

  const scrollY = await page.evaluate(() => window.scrollY);
  const attempts: Array<{ path: string; active: string; expanded: string | null; text: string }> =
    [];
  const record = async (path: string): Promise<void> => {
    await page.waitForTimeout(150); // one Radix open would mount within a frame or two
    attempts.push({
      path,
      active: await activeId(page),
      expanded: await role.getAttribute('aria-expanded'),
      text: (await role.innerText()).trim(),
    });
  };

  // Keyboard: Tab in, then every open key and typeahead.
  for (const key of ['Enter', 'Space', 'ArrowDown', 'ArrowUp', 'Home', 'End']) {
    await tabToRole(page);
    await page.keyboard.press(key);
    await record(`Tab + ${key}`);
  }
  for (const keys of ['a', 'v', 'ad', 'v ']) {
    await tabToRole(page);
    await page.keyboard.type(keys);
    await record(`typeahead "${keys}"`);
  }
  // Pointer: a real mouse click on the trigger and a click on its label.
  await role.click();
  await record('mouse click');
  await page.locator('label[for="roRole"]').click();
  await record('label click');
  await page.locator('#roOwner').focus();
  await role.click();
  await record('mouse click from another field');

  for (const a of attempts) {
    expect(a, a.path).toStrictEqual({
      path: a.path,
      active: 'roRole',
      expanded: 'false',
      text: 'Operator',
    });
  }
  expect(await listboxesSeen(page)).toBe(0);
  expect(await page.locator('[role="listbox"]').count()).toBe(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
  await expect(page.getByTestId('readonly-save-status')).toHaveText('Saving…');

  const payload = JSON.parse(await page.getByTestId('readonly-save-payload').innerText());
  expect(payload.role).toBe('operator');

  await setTheme(page, 'light');
  await role.focus();
  await shot(demo, 'demo-readonly-saving.light.png');
  await setTheme(page, 'dark');
  await shot(demo, 'demo-readonly-saving.dark.png');
  await setTheme(page, 'light');

  // Finish: editable again; it opens, and a pick commits.
  await finishSave(page);
  await expect(role).not.toHaveAttribute('aria-readonly');
  await role.click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.getByRole('option', { name: 'Viewer' }).click();
  await expect(role).toHaveText('Viewer');
  expect(await activeId(page)).toBe('roRole');
  await page.keyboard.type('o'); // typeahead commits again (INV-17)
  await expect(role).toHaveText('Operator');

  // disabled (today): SelectField ignores readOnly, so it stays editable and in the payload.
  await page.getByTestId('readonly-save-mode-disabled').click();
  await startSave(page);
  await expect(role).not.toHaveAttribute('aria-readonly');
  const todayPayload = JSON.parse(await page.getByTestId('readonly-save-payload').innerText());
  expect(todayPayload.role).toBe('operator');
  await role.click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await finishSave(page);
  await page.getByTestId('readonly-save-mode-readonly').click();

  evidence.scenario3 = { attempts, listboxesSeen: 0, readonlyPayload: payload, todayPayload };
});

test('INV-28: CDP accessibility tree: read-only in the description, not disabled', async ({
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
    const { result } = (await session.send('Runtime.evaluate', {
      expression: `document.getElementById('roRole')`,
    })) as { result: { objectId: string } };
    const { node } = (await session.send('DOM.describeNode', {
      objectId: result.objectId,
    })) as { node: { backendNodeId: number } };
    const { nodes } = (await session.send('Accessibility.getPartialAXTree', {
      backendNodeId: node.backendNodeId,
      fetchRelatives: false,
    })) as { nodes: AXNode[] };
    const n = nodes[0];
    const props = Object.fromEntries((n.properties ?? []).map((p) => [p.name, p.value.value]));
    return {
      role: n.role?.value,
      name: n.name?.value,
      description: n.description?.value,
      disabled: props.disabled,
      focusable: props.focusable,
      expanded: props.expanded,
    };
  };
  const idle = await snapshot();
  await startSave(page);
  const saving = await snapshot();
  await finishSave(page);
  const after = await snapshot();

  expect(saving.role).toBe('combobox');
  expect(saving.name).toBe('Role');
  expect(saving.description).toContain('Read-only');
  expect(saving.disabled).toBeUndefined();
  expect(saving.focusable).toBe(true);
  expect(saving.expanded).toBe(false);
  expect(idle.name).toBe('Role');
  expect(String(idle.description ?? '')).not.toContain('Read-only');
  expect(after).toStrictEqual(idle);
  evidence.ax = { idle, saving, after };
});

/* ------------------------------------- INV-4 / INV-5 / INV-20 ------------------------------------- */

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

type StateKey = 'editable' | 'disabled' | 'data-readonly' | 'disabled+data-readonly';

async function styleMatrix(
  page: Page
): Promise<Record<StateKey, { kit: Record<string, string>; today: Record<string, string> }>> {
  return page.evaluate(
    ({ props, look }) => {
      const source = document.getElementById('roRole') as HTMLElement;
      const kitClass = source.className.replace(/\s+/g, ' ').trim();
      const todayClass = kitClass.replace(new RegExp(look, 'g'), '');
      const states: Record<string, (el: HTMLElement) => void> = {
        editable: () => undefined,
        disabled: (el) => el.setAttribute('disabled', ''),
        'data-readonly': (el) => el.setAttribute('data-readonly', ''),
        'disabled+data-readonly': (el) => {
          el.setAttribute('disabled', '');
          el.setAttribute('data-readonly', '');
        },
      };
      const host = source.parentElement as HTMLElement;
      const read = (cls: string, apply: (el: HTMLElement) => void): Record<string, string> => {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = cls;
        el.textContent = 'Operator';
        apply(el);
        host.appendChild(el);
        const cs = getComputedStyle(el);
        const out: Record<string, string> = {};
        for (const p of props) out[p] = cs.getPropertyValue(p);
        el.remove();
        return out;
      };
      const out: Record<string, { kit: Record<string, string>; today: Record<string, string> }> =
        {};
      for (const [k, apply] of Object.entries(states)) {
        out[k] = { kit: read(kitClass, apply), today: read(todayClass, apply) };
      }
      return out as Record<
        StateKey,
        { kit: Record<string, string>; today: Record<string, string> }
      >;
    },
    { props: [...PROPS], look: LOOK_TOKEN.source }
  );
}

for (const theme of ['light', 'dark'] as const) {
  test(`INV-4: only [data-readonly]:not(:disabled) changes SelectTrigger's style (${theme})`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await openDemo(page);
    await setTheme(page, theme);
    const m = await styleMatrix(page);
    for (const k of ['editable', 'disabled', 'disabled+data-readonly'] as const) {
      expect(m[k].kit, `${theme} ${k}`).toStrictEqual(m[k].today);
    }
    // A trigger with both looks disabled (opacity 0.5, not-allowed), not read-only.
    expect(m['disabled+data-readonly'].kit).toStrictEqual(m.disabled.kit);
    // Sensitivity: the gated state does change.
    expect(m['data-readonly'].kit).not.toStrictEqual(m['data-readonly'].today);
    byTheme('inv4')[theme] = m;
  });
}

/** WCAG relative-luminance contrast of two `rgb()` / `oklch()`-resolved colours (canvas-resolved). */
async function contrast(page: Page, fg: string, bg: string): Promise<number> {
  return page.evaluate(
    ({ fg, bg }) => {
      const ctx = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
      const rgb = (c: string): [number, number, number] => {
        ctx.clearRect(0, 0, 1, 1);
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
      const [l1, l2] = [lum(rgb(fg)), lum(rgb(bg))].sort((a, b) => b - a);
      return (l1 + 0.05) / (l2 + 0.05);
    },
    { fg, bg }
  );
}

for (const theme of ['light', 'dark'] as const) {
  test(`INV-5 / INV-20: read-only look is distinct and legible, and nothing moves (${theme})`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await openDemo(page);
    await setTheme(page, theme);
    const role = page.locator('#roRole');
    const read = async (): Promise<Record<string, string>> =>
      role.evaluate((el) => {
        const cs = getComputedStyle(el);
        const value = el.querySelector('span') as HTMLElement;
        return {
          opacity: cs.opacity,
          bg: cs.backgroundColor,
          color: getComputedStyle(value).color,
          cursor: cs.cursor,
          border: cs.borderTopColor,
          chevron: String(el.querySelector('svg') !== null),
        };
      });
    const rects = async (): Promise<Record<string, number[]>> =>
      page.evaluate(() => {
        const r = (sel: string): number[] => {
          const b = (document.querySelector(sel) as HTMLElement).getBoundingClientRect();
          return [b.x, b.y, b.width, b.height].map((n) => Math.round(n * 100) / 100);
        };
        return {
          trigger: r('#roRole'),
          label: r('label[for="roRole"]'),
          notes: r('#roNotes'),
          // The status text ("Idle" → "Saving…") changes width by design; the button doesn't.
          footer: r('[data-testid="readonly-save-submit"]'),
        };
      });
    // Same modality in both states: keyboard focus (Tab in), so :focus-visible matches.
    const focusRing = async (): Promise<Record<string, string>> => {
      await tabToRole(page);
      return role.evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
          shadow: cs.boxShadow,
          border: cs.borderTopColor,
        };
      });
    };

    const editable = await read();
    const editableRing = await focusRing();
    const before = await rects();
    await startSave(page);
    const ro = await read();
    const roRing = await focusRing();
    const during = await rects();
    const disabledBg = await role.evaluate((el) => {
      const probe = el.cloneNode(true) as HTMLElement;
      probe.removeAttribute('id');
      probe.removeAttribute('data-readonly');
      probe.setAttribute('disabled', '');
      (el.parentElement as HTMLElement).appendChild(probe);
      const cs = getComputedStyle(probe);
      const out = { bg: cs.backgroundColor, opacity: cs.opacity };
      probe.remove();
      return out;
    });
    const ratio = await contrast(page, ro.color, ro.bg);
    await finishSave(page);
    const afterRects = await rects();

    expect(ro.opacity).toBe('1');
    expect(disabledBg.opacity).toBe('0.5');
    expect(ro.bg).not.toBe(editable.bg);
    expect(ro.bg).not.toBe(disabledBg.bg);
    expect(ro.cursor).toBe('default');
    expect(ro.chevron).toBe('true');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(roRing).toStrictEqual(editableRing);
    expect(during).toStrictEqual(before);
    expect(afterRects).toStrictEqual(before);

    byTheme('inv5')[theme] = {
      editable,
      readonly: ro,
      disabled: disabledBg,
      contrast: Math.round(ratio * 10) / 10,
      focusRing: { editable: editableRing, readonly: roRing },
      rects: { before, during, after: afterRects },
    };
  });
}
