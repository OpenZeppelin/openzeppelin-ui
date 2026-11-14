/**
 * RadioField card / segmented / read-only and the RadioGroup card title: the Chromium half.
 * Loads the kit's real stylesheet (`kit-styles.browser.css`), so geometry and computed colours
 * are the shipped ones.
 *
 * - INV-2: card title centre within 1px of the radio's for plain, filled, solid and outline Badge
 *   titles and the first line of a wrapped title; equal card heights (outline Badge <= +2px);
 *   accessible name includes the Badge label.
 * - INV-4: RadioField horizontal cards at 1280 / 768 / 375 / 240 / 160px containers: no overflow,
 *   cards per row, equal widths and heights on a row.
 * - INV-12 (keyboard half): real keys, held as a person holds them, change nothing while
 *   read-only; the same keys pick when editable (control).
 * - INV-15: a disabled option computes opacity 0.5, editable and read-only.
 * - INV-19: Tab reaches the read-only group; Chromium's accessibility tree reports the group
 *   read-only and not disabled, with "Read-only" in its description.
 * - INV-20: read-only look in light and dark for all three variants: same colours as editable at
 *   rest, hover changes nothing, cursor default, opacity 1 (disabled stays 0.5).
 * - INV-21 (focus half): the segmented error ring sits on the group and a keyboard-focused
 *   segment still shows its focus ring.
 * - INV-22 (component half): axe finds no violations on these fixtures in light and dark.
 */
import '../../../__tests__/kit-styles.browser.css';

import { act, cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';
import { cdp, userEvent } from 'vitest/browser';
import React from 'react';

import { Badge } from '../../ui/badge';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import {
  mountRadio,
  READ_ONLY,
  submit,
  VARIANTS,
  type Mounted,
  type MountOptions,
  type Variant,
} from './radio-field.sf6-kit';

afterEach(() => {
  cleanup();
  setTheme('light');
});

type Theme = 'light' | 'dark';
function setTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

/** Finish every running CSS transition so computed styles are the end state. */
function settleStyles(): void {
  for (const a of document.getAnimations()) a.finish();
}

async function frames(): Promise<void> {
  await act(async () => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}

async function hold(key: string): Promise<void> {
  await userEvent.keyboard(`{${key}>}`);
  await new Promise((r) => setTimeout(r, 30));
  await userEvent.keyboard(`{/${key}}`);
  await frames();
}

// ---------------------------------------------------------------------------------------------
// INV-2
const SAME = 'Same description';

function CardTitles(): React.ReactElement {
  return (
    <div style={{ width: 280 }}>
      <RadioGroup variant="card" aria-label="Markets" defaultValue="plain">
        <RadioGroupItem value="plain" title="Spot" description={SAME} />
        <RadioGroupItem
          value="filled"
          title={
            <>
              Futures <Badge label="Popular" />
            </>
          }
          description={SAME}
        />
        <RadioGroupItem
          value="solid"
          title={
            <>
              Options <Badge label="New" variant="solid" />
            </>
          }
          description={SAME}
        />
        <RadioGroupItem
          value="outline"
          title={
            <>
              Perpetuals <Badge label="Beta" variant="outline" />
            </>
          }
          description={SAME}
        />
        <RadioGroupItem
          value="long"
          title="A long market title that wraps onto a second line here"
          description={SAME}
        />
        <RadioGroupItem value="disabled" title="Closed" description={SAME} disabled />
      </RadioGroup>
    </div>
  );
}

function firstTextNode(el: Node): Text | null {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
  });
  return walker.nextNode() as Text | null;
}

function cardGeometry(value: string): {
  delta: number;
  height: number;
  titleLines: number;
} {
  const item = document.querySelector(`[role="radio"][value="${value}"]`) as HTMLElement;
  const radio = item.firstElementChild as HTMLElement;
  const title = item.querySelector('[id$="-title"]') as HTMLElement;
  const text = firstTextNode(title) as Text;
  const range = document.createRange();
  range.selectNodeContents(text);
  const firstLine = range.getClientRects()[0];
  const r = radio.getBoundingClientRect();
  const lineCentre = firstLine.top + firstLine.height / 2;
  const radioCentre = r.top + r.height / 2;
  return {
    delta: Math.abs(lineCentre - radioCentre),
    height: item.getBoundingClientRect().height,
    titleLines: range.getClientRects().length,
  };
}

describe('INV-2: the card title sits level with the radio', () => {
  it.each(['plain', 'filled', 'solid', 'outline', 'long', 'disabled'])(
    '%s title: first-line centre within 1px of the radio centre',
    async (value) => {
      render(<CardTitles />);
      await frames();
      const g = cardGeometry(value);
      expect(g.delta).toBeLessThanOrEqual(1);
      if (value === 'long') expect(g.titleLines).toBeGreaterThan(1);
    }
  );

  it('same description, same height: plain = filled = solid; outline at most 2px taller', async () => {
    render(<CardTitles />);
    await frames();
    const plain = cardGeometry('plain').height;
    expect(Math.abs(cardGeometry('filled').height - plain)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(cardGeometry('solid').height - plain)).toBeLessThanOrEqual(0.5);
    const outline = cardGeometry('outline').height - plain;
    expect(outline).toBeGreaterThanOrEqual(-0.5);
    expect(outline).toBeLessThanOrEqual(2);
  });

  it('the accessible name includes the Badge label; the description is the description', async () => {
    render(<CardTitles />);
    const futures = screen.getByRole('radio', { name: 'Futures Popular' });
    expect(futures).toBeTruthy();
    const describedBy = futures.getAttribute('aria-describedby') as string;
    expect(document.getElementById(describedBy)?.textContent).toBe(SAME);
    expect(screen.getByRole('radio', { name: 'Perpetuals Beta' })).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------------------------
// INV-4
const THREE = [
  { value: 'starter', label: 'Starter', description: 'For trying things out' },
  {
    value: 'team',
    label: 'Team',
    description: 'Shared access for small teams, with roles and an audit log',
  },
  { value: 'scale', label: 'Scale', description: 'Higher limits' },
];

/** Mount, then move the rendered form into a container of the given width. */
function mountIn(width: number, opts: MountOptions): { m: Mounted; host: HTMLElement } {
  const host = document.createElement('div');
  host.style.width = `${width}px`;
  document.body.appendChild(host);
  const m = mountRadio(opts);
  host.appendChild(m.result.container);
  return { m, host };
}

describe('INV-4: horizontal cards sit side by side and never overflow', () => {
  it.each([
    [1280, 3],
    [768, 3],
    [375, 1],
    [240, 1],
    [160, 1],
  ] as const)(
    'container %ipx: %i per row, no overflow, equal cards on a row',
    async (w, perRow) => {
      const { m, host } = mountIn(w, {
        variant: 'card',
        layout: 'horizontal',
        options: THREE,
        seed: 'team',
      });
      await frames();

      const group = m.group();
      expect(group.scrollWidth).toBeLessThanOrEqual(group.clientWidth);
      const gr = group.getBoundingClientRect();
      const rects = m.radios().map((r) => r.getBoundingClientRect());
      for (const r of rects) {
        expect(r.right).toBeLessThanOrEqual(gr.right + 0.5);
        expect(r.left).toBeGreaterThanOrEqual(gr.left - 0.5);
      }
      // Rows by top edge.
      const rows = new Map<number, DOMRect[]>();
      for (const r of rects) {
        const key = Math.round(r.top);
        rows.set(key, [...(rows.get(key) ?? []), r]);
      }
      expect([...rows.values()][0]).toHaveLength(perRow);
      for (const row of rows.values()) {
        for (const r of row) {
          expect(Math.abs(r.width - row[0].width)).toBeLessThanOrEqual(1);
          expect(Math.abs(r.height - row[0].height)).toBeLessThanOrEqual(1);
        }
      }
      host.remove();
    }
  );

  it('vertical cards stay one per row at 1280px', async () => {
    const { m, host } = mountIn(1280, { variant: 'card', options: THREE });
    await frames();
    const tops = m.radios().map((r) => Math.round(r.getBoundingClientRect().top));
    expect(new Set(tops).size).toBe(3);
    host.remove();
  });
});

// ---------------------------------------------------------------------------------------------
// INV-12 keyboard half (Chromium) with an editable control.
const KEYS = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End', 'Space', 'Enter'];

async function tabIntoGroup(m: Mounted): Promise<void> {
  (screen.getByLabelText('before') as HTMLElement).focus();
  for (let i = 0; i < 3 && !m.radios().includes(document.activeElement as HTMLElement); i++) {
    await userEvent.keyboard('{Tab}');
  }
  expect(m.radios()).toContain(document.activeElement);
}

describe('INV-12: real keys change nothing while read-only', () => {
  describe.each(VARIANTS)('%s', (variant) => {
    it('read-only: every key, held, leaves the value and the selection alone', async () => {
      const m = mountRadio({
        variant,
        seed: 'starter',
        ...READ_ONLY,
        before: <input aria-label="before" />,
      });
      await tabIntoGroup(m);
      for (const key of KEYS) await hold(key);
      expect(m.writes).toEqual([]);
      expect(m.api().getValues('plan')).toBe('starter');
      expect(m.checkedLabels()).toEqual(['Starter']);
      // Focus stayed inside the group (read-only options stay focusable).
      expect(m.group().contains(document.activeElement)).toBe(true);
    });

    if (variant !== 'default') {
      it('editable control: the same arrow key picks the next option', async () => {
        const m = mountRadio({ variant, seed: 'starter', before: <input aria-label="before" /> });
        await tabIntoGroup(m);
        await hold('ArrowDown');
        expect(m.api().getValues('plan')).toBe('team');
        expect(m.writes).toEqual(['team']);
      });
    }
  });
});

// ---------------------------------------------------------------------------------------------
// INV-20 / INV-15
interface Look {
  [part: string]: {
    bg: string;
    border: string;
    color: string;
    opacity: string;
    transform: string;
  };
}

/** The option's visible parts, by variant. */
function parts(variant: Variant, radio: HTMLElement): Record<string, HTMLElement> {
  if (variant === 'default') {
    const label = radio.closest('label') as HTMLElement;
    const indicator = label.querySelector(':scope > div') as HTMLElement;
    return {
      label,
      circle: indicator.firstElementChild as HTMLElement,
      text: document.getElementById(radio.getAttribute('aria-labelledby') as string) as HTMLElement,
    };
  }
  if (variant === 'card') {
    return {
      item: radio,
      radio: radio.firstElementChild as HTMLElement,
      title: radio.querySelector('[id$="-title"]') as HTMLElement,
    };
  }
  return { item: radio };
}

/** The element whose cursor and opacity the user sees for the option. */
const surface = (variant: Variant, radio: HTMLElement): HTMLElement =>
  variant === 'default' ? (radio.closest('label') as HTMLElement) : radio;

function look(variant: Variant, radio: HTMLElement): Look {
  settleStyles();
  const out: Look = {};
  for (const [name, el] of Object.entries(parts(variant, radio))) {
    const cs = getComputedStyle(el);
    out[name] = {
      bg: cs.backgroundColor,
      border: cs.borderTopColor,
      color: cs.color,
      opacity: cs.opacity,
      transform: cs.transform,
    };
  }
  return out;
}

async function hovered(variant: Variant, radio: HTMLElement): Promise<Look> {
  await userEvent.hover(surface(variant, radio));
  await frames();
  const l = look(variant, radio);
  await userEvent.unhover(surface(variant, radio));
  await frames();
  return l;
}

describe.each(['light', 'dark'] as const)('INV-20 / INV-15: the read-only look (%s)', (theme) => {
  describe.each(VARIANTS)('%s', (variant) => {
    async function mountLook(ro: MountOptions): Promise<Mounted> {
      setTheme(theme);
      const m = mountRadio({ variant, seed: 'team', ...ro });
      await frames();
      return m;
    }

    it('at rest, every option looks exactly as when editable', async () => {
      const editable = await mountLook({});
      const before = Object.fromEntries(
        ['Starter', 'Team', 'Scale', 'Enterprise'].map((l) => [l, look(variant, editable.radio(l))])
      );
      editable.unmount();
      const ro = await mountLook(READ_ONLY);
      for (const l of ['Starter', 'Team', 'Scale', 'Enterprise']) {
        expect(look(variant, ro.radio(l)), l).toEqual(before[l]);
      }
    });

    it('hover changes no colour, background, border, opacity or transform (checked and unchecked)', async () => {
      const m = await mountLook(READ_ONLY);
      for (const l of ['Team', 'Scale']) {
        const rest = look(variant, m.radio(l));
        expect(await hovered(variant, m.radio(l)), l).toEqual(rest);
      }
    });

    it('editable control: hovering an unchecked option does change its look', async () => {
      const m = await mountLook({});
      const rest = look(variant, m.radio('Scale'));
      expect(await hovered(variant, m.radio('Scale'))).not.toEqual(rest);
    });

    it('cursor default and opacity 1 on enabled options; a disabled option stays at 0.5', async () => {
      const m = await mountLook(READ_ONLY);
      for (const l of ['Starter', 'Team', 'Scale']) {
        const cs = getComputedStyle(surface(variant, m.radio(l)));
        expect(cs.cursor, l).toBe('default');
        expect(cs.opacity, l).toBe('1');
      }
      const disabled = getComputedStyle(surface(variant, m.radio('Enterprise')));
      expect(disabled.opacity).toBe('0.5');
      // Card and segmented: not-allowed. The default variant's disabled <label> carries both
      // `cursor-pointer` and `cursor-not-allowed` (as at 271efee34) and `cursor-pointer` wins;
      // read-only must leave that as it is (checked against editable below).
      if (variant !== 'default') expect(disabled.cursor).toBe('not-allowed');
      const roDisabledCursor = disabled.cursor;
      m.unmount();
      const editable = await mountLook({});
      expect(getComputedStyle(surface(variant, editable.radio('Enterprise'))).cursor).toBe(
        roDisabledCursor
      );
    });

    it('INV-15: a disabled option computes opacity 0.5 when editable too', async () => {
      const m = await mountLook({});
      expect(getComputedStyle(surface(variant, m.radio('Enterprise'))).opacity).toBe('0.5');
    });
  });
});

// ---------------------------------------------------------------------------------------------
// INV-19
type AXNode = {
  role?: { value: string };
  name?: { value: string };
  description?: { value: string };
  properties?: Array<{ name: string; value: { value: unknown } }>;
};

async function axRadiogroup(): Promise<{
  name?: string;
  description?: string;
  props: Record<string, unknown>;
}> {
  type Frame = { frame: { id: string; url: string }; childFrames?: Frame[] };
  const session = cdp();
  const { frameTree } = (await session.send('Page.getFrameTree', {})) as { frameTree: Frame };
  const frames_: Frame[] = [];
  const walk = (f: Frame): void => {
    frames_.push(f);
    (f.childFrames ?? []).forEach(walk);
  };
  walk(frameTree);
  const testFrame = frames_.find((f) => f.frame.url.includes('iframeId='));
  if (!testFrame) throw new Error('test iframe not found');
  const { nodes } = (await session.send('Accessibility.getFullAXTree', {
    frameId: testFrame.frame.id,
  })) as { nodes: AXNode[] };
  const hits = nodes.filter((n) => n.role?.value === 'radiogroup');
  if (hits.length !== 1) throw new Error(`expected one radiogroup, got ${hits.length}`);
  const n = hits[0];
  return {
    name: n.name?.value,
    description: n.description?.value,
    props: Object.fromEntries((n.properties ?? []).map((p) => [p.name, p.value.value])),
  };
}

describe('INV-19: read-only is announced as read-only, not disabled (Chromium)', () => {
  describe.each(VARIANTS)('%s', (variant) => {
    it('read-only: the AX radiogroup is read-only, not disabled, described "… Read-only"', async () => {
      mountRadio({ variant, seed: 'team', helperText: 'Help', ...READ_ONLY });
      const ax = await axRadiogroup();
      expect(ax.name).toBe('Plan');
      expect(ax.description).toBe('Help Read-only');
      // Chromium (this Playwright build) drops `aria-readonly` on a radiogroup from the AX tree,
      // so the sr-only "Read-only" description is what gets announced. Accept either.
      expect(ax.props.readonly === true || ax.props.readonly === undefined).toBe(true);
      expect(ax.props.disabled).toBeUndefined();
    });

    it('not opted in: no read-only state and no "Read-only" text', async () => {
      mountRadio({ variant, seed: 'team', helperText: 'Help', readOnly: true });
      const ax = await axRadiogroup();
      expect(ax.description).toBe('Help');
      expect(ax.props.readonly).toBeUndefined();
    });

    it('read-only: Tab from the previous control reaches an option', async () => {
      const m = mountRadio({
        variant,
        seed: 'team',
        ...READ_ONLY,
        before: <input aria-label="before" />,
      });
      await tabIntoGroup(m);
    });
  });
});

// ---------------------------------------------------------------------------------------------
// INV-21
describe('INV-21: the segmented error ring and the focus ring', () => {
  it.each(['light', 'dark'] as const)(
    '%s: ring on the group while in error; a keyboard-focused segment shows its own ring',
    async (theme) => {
      setTheme(theme);
      const m = mountRadio({
        variant: 'segmented',
        validation: { required: true },
        before: <input aria-label="before" />,
      });
      expect(getComputedStyle(m.group()).boxShadow).toBe('none');
      await submit(m);
      await frames();
      expect(getComputedStyle(m.group()).boxShadow).not.toBe('none');
      (screen.getByLabelText('before') as HTMLElement).focus();
      await userEvent.keyboard('{Tab}');
      const focused = document.activeElement as HTMLElement;
      expect(m.radios()).toContain(focused);
      settleStyles();
      expect(focused.matches(':focus-visible')).toBe(true);
      expect(getComputedStyle(focused).boxShadow).not.toBe('none');
      for (const r of m.radios().filter((x) => x !== focused)) {
        expect(getComputedStyle(r).boxShadow).toBe('none');
      }
    }
  );
});

// ---------------------------------------------------------------------------------------------
// INV-22 (component half)
describe.each(['light', 'dark'] as const)('INV-22: axe on the fixtures (%s)', (theme) => {
  async function violations(root: HTMLElement): Promise<string[]> {
    settleStyles();
    const r = await axe.run(root, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      resultTypes: ['violations'],
    });
    return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  }

  it.each(
    VARIANTS.flatMap((variant) =>
      (
        [
          ['editable', {}],
          ['read-only', READ_ONLY],
        ] as const
      ).map(([mode, ro]) => [variant, mode, ro] as const)
    )
  )('%s %s, then in error: 0 violations', async (variant, _mode, ro) => {
    setTheme(theme);
    const m = mountRadio({
      variant,
      ...ro,
      helperText: 'Pick one plan',
      validation: { required: true },
    });
    await frames();
    expect(await violations(m.form())).toEqual([]);
    await submit(m);
    await frames();
    expect(await violations(m.form())).toEqual([]);
  });

  it('RadioGroup card titles with Badges: 0 violations', async () => {
    setTheme(theme);
    const { container } = render(<CardTitles />);
    await frames();
    expect(await violations(container)).toEqual([]);
  });
});
