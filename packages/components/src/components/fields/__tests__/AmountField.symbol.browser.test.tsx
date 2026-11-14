/**
 * 007 SF-2 · AmountField symbol in a real layout (Chromium, the kit's real stylesheet).
 * Each `describe` starts with the INV id it verifies.
 *
 * Owns what jsdom can't measure: the typed text never runs under the symbol, in all three
 * modes, on read-only and error fields, and after the symbol changes (INV-4); the symbol's
 * colour is the theme's muted text colour and meets 4.5:1 in light and dark on both input
 * backgrounds (INV-5); error border and focus ring are the same with a symbol (INV-6);
 * select-all inside the input never takes the symbol (INV-8); a click on the symbol focuses
 * the input (INV-11); a grouped field keeps focus and its plain text across a symbol change
 * (INV-12); no ResizeObserver loop or console error (INV-15); and the accessibility tree's
 * description starts with the symbol (INV-17).
 *
 * Contrast: computed colours come back as `oklch(...)`, so each is painted onto a 1×1 canvas
 * and read back as sRGB, then the WCAG 2 ratio is computed from that pixel.
 */
import '../../../__tests__/kit-styles.browser.css';

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cdp, page, userEvent } from 'vitest/browser';
import React from 'react';
import { useForm, type FieldValues, type UseFormReturn } from 'react-hook-form';

import { AmountField } from '../AmountField';
import {
  typeBypass,
  type AmountFieldAnyProps,
  type AmountFieldOptions,
} from './amount-exact.sf10-kit';

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

function Harness({
  options,
  apiRef,
  seed,
}: {
  options: AmountFieldOptions;
  apiRef: { current: UseFormReturn<FieldValues> | null };
  seed: string;
}): React.ReactElement {
  const form = useForm<FieldValues>({ defaultValues: { amount: seed } });
  apiRef.current = form;
  const fieldProps: AmountFieldAnyProps = {
    ...options,
    id: 'amount',
    name: 'amount',
    control: form.control,
  };
  return (
    <form onSubmit={form.handleSubmit(() => undefined)} noValidate className="bg-background p-6">
      <button type="button">Before</button>
      <div style={{ width: 320 }}>
        <AmountField {...fieldProps} />
      </div>
      <button type="button">After</button>
      <button type="submit">Submit</button>
    </form>
  );
}

function mount(options: AmountFieldOptions, seed = '') {
  const apiRef: { current: UseFormReturn<FieldValues> | null } = { current: null };
  const view = render(<Harness options={options} apiRef={apiRef} seed={seed} />);
  return {
    apiRef,
    input: () => document.getElementById('amount') as HTMLInputElement,
    symbol: () => document.getElementById('amount-symbol') as HTMLElement,
    rerender: (next: AmountFieldOptions) =>
      view.rerender(<Harness options={next} apiRef={apiRef} seed={seed} />),
    after: () => screen.getByRole('button', { name: 'After' }),
    before: () => screen.getByRole('button', { name: 'Before' }),
  };
}

const MODES = {
  default: {},
  exact: { formatOnBlur: false },
  grouped: { formatOnBlur: false, allowGrouping: true, groupedDisplay: true },
} as const;
type ModeName = keyof typeof MODES;
const MODE_NAMES = Object.keys(MODES) as ModeName[];

const opts = (mode: ModeName, extra: Record<string, unknown> = {}): AmountFieldOptions =>
  typeBypass<AmountFieldOptions>({ label: 'Amount', decimals: 18, ...MODES[mode], ...extra });

const LONG = '123456789'.repeat(6) + '.25';

type Theme = 'light' | 'dark';
function setTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  for (const a of document.getAnimations()) a.finish();
}

async function frames(): Promise<void> {
  await act(async () => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}

const errors: string[] = [];
const onError = (e: ErrorEvent): void => {
  errors.push(e.message);
};
let consoleError: ReturnType<typeof vi.spyOn>;
const reactEnv = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };

beforeAll(async () => {
  // elementFromPoint returns null outside the viewport; the default (414px) is too narrow.
  await page.viewport(1000, 800);
});
beforeEach(() => {
  errors.length = 0;
  window.addEventListener('error', onError);
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  // Run React as an app does: real browser events commit without `act` (as in SF-3's
  // grouped browser suite). Testing Library turns the flag on for its own calls.
  reactEnv.IS_REACT_ACT_ENVIRONMENT = false;
});
afterEach(() => {
  cleanup();
  setTheme('light');
  window.removeEventListener('error', onError);
  reactEnv.IS_REACT_ACT_ENVIRONMENT = true;
  const logged = [...consoleError.mock.calls];
  consoleError.mockRestore();
  // INV-15: no "ResizeObserver loop" or other error, and React logged nothing.
  expect(errors).toEqual([]);
  expect(logged).toEqual([]);
});

// ---------------------------------------------------------------------------
// Geometry and colour helpers
// ---------------------------------------------------------------------------

const TOL = 1;
const GAP = 8;

function contentBox(input: HTMLInputElement): { left: number; right: number } {
  const r = input.getBoundingClientRect();
  const cs = getComputedStyle(input);
  return {
    left: r.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft),
    right: r.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight),
  };
}

/** Asserts the typed text area stays at least GAP px clear of the symbol's slot. */
function expectClear(input: HTMLInputElement, label: string, overflows = true): void {
  const slot = document.getElementById('amount-symbol')?.parentElement as HTMLElement;
  const s = slot.getBoundingClientRect();
  const box = contentBox(input);
  expect(s.width, `${label}: slot measured`).toBeGreaterThan(0);
  if (slot.dataset.slot === 'input-end-adornment') {
    expect(s.left - box.right, `${label}: end gap`).toBeGreaterThanOrEqual(GAP - TOL);
  } else {
    expect(box.left - s.right, `${label}: start gap`).toBeGreaterThanOrEqual(GAP - TOL);
  }
  // The text overflows the field, so the clear area is what keeps digits off the symbol.
  if (overflows) {
    expect(input.scrollWidth, `${label}: value overflows`).toBeGreaterThan(input.clientWidth);
  }
}

async function fillLong(input: HTMLInputElement): Promise<void> {
  await userEvent.click(input);
  await userEvent.fill(input, LONG);
  await userEvent.keyboard('{End}');
  await frames();
}

let canvasCtx: CanvasRenderingContext2D | null = null;
function toRgb(color: string): [number, number, number, number] {
  if (!canvasCtx) {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    canvasCtx = c.getContext('2d', { willReadFrequently: true });
  }
  const ctx = canvasCtx as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return [r ?? 0, g ?? 0, b ?? 0, a ?? 0];
}

function luminance([r, g, b]: [number, number, number, number]): number {
  const lin = (v: number): number => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(fg: string, bg: string): number {
  const a = luminance(toRgb(fg));
  const b = luminance(toRgb(bg));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Product of `opacity` from `el` up to (not including) `stop`. */
function opacityChain(el: HTMLElement, stop: HTMLElement): number {
  let product = 1;
  for (let n: HTMLElement | null = el; n && n !== stop; n = n.parentElement) {
    product *= parseFloat(getComputedStyle(n).opacity);
  }
  return product;
}

function probe(className: string, prop: 'color' | 'backgroundColor'): string {
  const el = document.createElement('span');
  el.className = className;
  document.body.appendChild(el);
  const value = getComputedStyle(el)[prop];
  el.remove();
  return value;
}

// ---------------------------------------------------------------------------
// Render contract
// ---------------------------------------------------------------------------

describe('INV-4: the typed digits never run under the symbol', () => {
  const rows = MODE_NAMES.flatMap((mode) =>
    ['$', 'ETH', 'USD', 'USDC'].flatMap((symbol) =>
      (['prefix', 'suffix'] as const).map((position) => ({ mode, symbol, position }))
    )
  );

  it.each(rows)(
    '$mode, $symbol as $position, long value typed',
    async ({ mode, symbol, position }) => {
      const m = mount(opts(mode, { symbol, symbolPosition: position }));
      await fillLong(m.input());
      expectClear(m.input(), 'focused');
      if (mode === 'grouped') {
        await userEvent.click(m.after()); // blurred: grouped text shown
        await frames();
        expect(m.input().value).toContain(',');
        expectClear(m.input(), 'blurred, grouped');
      }
    }
  );

  it.each(MODE_NAMES)(
    '%s: focusable read-only and error-border fields keep the gap',
    async (mode) => {
      const ro = mount(
        opts(mode, { symbol: 'USD', readOnly: true, readOnlyMode: 'readonly' }),
        LONG
      );
      await frames();
      ro.input().scrollLeft = ro.input().scrollWidth;
      expectClear(ro.input(), 'read-only');
      cleanup();
      const err = mount(opts(mode, { symbol: 'USD', max: 1 }), LONG);
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
      await frames();
      expect(err.input().getAttribute('aria-invalid')).toBe('true');
      await userEvent.click(err.input());
      await userEvent.keyboard('{End}');
      expectClear(err.input(), 'error');
    }
  );

  it.each(MODE_NAMES)('%s: "$" reserves less padding than "USD" on the same side', async (mode) => {
    const pad: Record<string, number> = {};
    for (const symbol of ['$', 'USD']) {
      for (const side of ['prefix', 'suffix'] as const) {
        const m = mount(opts(mode, { symbol, symbolPosition: side }));
        await frames();
        const cs = getComputedStyle(m.input());
        pad[`${symbol}-${side}`] = parseFloat(side === 'prefix' ? cs.paddingLeft : cs.paddingRight);
        cleanup();
      }
    }
    expect(pad['$-prefix']).toBeLessThan(pad['USD-prefix'] as number);
    expect(pad['$-suffix']).toBeLessThan(pad['USD-suffix'] as number);
  });

  it.each(MODE_NAMES)(
    '%s: USD → USDC on a mounted field: padding follows, gap kept',
    async (mode) => {
      const m = mount(opts(mode, { symbol: 'USD' }));
      await fillLong(m.input());
      const before = parseFloat(getComputedStyle(m.input()).paddingRight);
      m.rerender(opts(mode, { symbol: 'USDC' }));
      await frames();
      expect(parseFloat(getComputedStyle(m.input()).paddingRight)).toBeGreaterThan(before);
      expectClear(m.input(), 'after change');
    }
  );
});

describe('INV-5: the symbol uses the muted text colour and meets 4.5:1 in light and dark', () => {
  const cases = (['light', 'dark'] as const).flatMap((theme) =>
    MODE_NAMES.flatMap((mode) =>
      (['editable', 'read-only'] as const).map((surface) => ({ theme, mode, surface }))
    )
  );

  it.each(cases)('$theme, $mode, $surface', async ({ theme, mode, surface }) => {
    setTheme(theme);
    const extra = surface === 'read-only' ? { readOnly: true, readOnlyMode: 'readonly' } : {};
    const m = mount(opts(mode, { symbol: 'ETH', ...extra }), '12.5');
    await frames();
    setTheme(theme);
    const symbol = m.symbol();
    const wrapper = m.input().parentElement as HTMLElement;
    const color = getComputedStyle(symbol).color;
    expect(color).toBe(probe('text-muted-foreground', 'color'));
    expect(opacityChain(symbol, wrapper)).toBe(1);
    const bg = getComputedStyle(m.input()).backgroundColor;
    expect(bg).toBe(
      probe(surface === 'read-only' ? 'bg-muted' : 'bg-background', 'backgroundColor')
    );
    const ratio = contrast(color, bg);
    expect(ratio, `${theme} ${surface}: ${color} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    // Same size as the input text.
    expect(getComputedStyle(symbol).fontSize).toBe(getComputedStyle(m.input()).fontSize);
    // No palette or dark: override from the symbol up to the wrapper.
    for (let n: HTMLElement | null = symbol; n && n !== wrapper; n = n.parentElement) {
      expect(n.className).not.toMatch(/text-(gray|zinc|slate|neutral|stone)-|dark:/);
    }
  });
});

describe('INV-6: error border and focus ring are the same with a symbol', () => {
  it.each(
    (['light', 'dark'] as const).flatMap((theme) => MODE_NAMES.map((mode) => ({ theme, mode })))
  )('$theme, $mode', async ({ theme, mode }) => {
    setTheme(theme);
    const read = async (symbol: string | undefined) => {
      const m = mount(opts(mode, { symbol, validation: { required: true } }));
      await userEvent.click(screen.getByRole('button', { name: 'Submit' })); // focuses the input
      await frames();
      setTheme(theme);
      const cs = getComputedStyle(m.input());
      const out = {
        border: cs.borderColor,
        ring: cs.boxShadow,
        focused: document.activeElement === m.input(),
      };
      cleanup();
      return out;
    };
    const plain = await read(undefined);
    const withSymbol = await read('USD');
    expect(withSymbol).toEqual(plain);
    expect(plain.focused).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Prop / state, interaction
// ---------------------------------------------------------------------------

describe('INV-8: select-all inside the input never takes the symbol', () => {
  it.each(MODE_NAMES)('%s', async (mode) => {
    const m = mount(opts(mode, { symbol: 'USD' }), '1234.5');
    await userEvent.click(m.input());
    await userEvent.keyboard('{ControlOrMeta>}a{/ControlOrMeta}');
    const input = m.input();
    const selected = input.value.slice(input.selectionStart ?? 0, input.selectionEnd ?? 0);
    expect(selected).toBe(input.value);
    expect(selected).not.toContain('USD');
    expect(String(window.getSelection())).not.toContain('USD');
    input.select();
    expect(String(window.getSelection())).not.toContain('USD');
    expect(m.apiRef.current?.getValues('amount')).toBe('1234.5');
  });
});

describe('INV-11: a click on the symbol focuses the input', () => {
  const rows = MODE_NAMES.flatMap((mode) =>
    (['editable', 'read-only'] as const).flatMap((surface) =>
      (['prefix', 'suffix'] as const).map((position) => ({ mode, surface, position }))
    )
  );

  it.each(rows)('$mode, $surface, $position', async ({ mode, surface, position }) => {
    const extra = surface === 'read-only' ? { readOnly: true, readOnlyMode: 'readonly' } : {};
    const m = mount(opts(mode, { symbol: 'USDC', symbolPosition: position, ...extra }), '5');
    await frames();
    const r = m.symbol().getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    expect(document.elementFromPoint(x, y)).toBe(m.input());
    await userEvent.click(m.symbol(), { force: true });
    expect(document.activeElement).toBe(m.input());
    await userEvent.click(m.symbol(), { force: true }); // already focused: stays
    expect(document.activeElement).toBe(m.input());
  });

  it.each(MODE_NAMES)('%s: Tab goes Before → input → After', async (mode) => {
    const m = mount(opts(mode, { symbol: 'USD', symbolPosition: 'prefix' }));
    m.before().focus();
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(m.input());
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(m.after());
  });
});

describe('INV-12: a grouped field keeps focus and its plain text across a symbol change', () => {
  it('focused grouped field: USD → ETH', async () => {
    const m = mount(opts('grouped', { symbol: 'USD' }), '250000.5');
    expect(m.input().value).toBe('250,000.5');
    await userEvent.click(m.input());
    expect(m.input().value).toBe('250000.5');
    const node = m.input();
    node.setSelectionRange(2, 2);
    const blur = vi.fn();
    node.addEventListener('blur', blur);
    m.rerender(opts('grouped', { symbol: 'ETH' }));
    await frames();
    expect(m.input()).toBe(node);
    expect(document.activeElement).toBe(node);
    expect(node.value).toBe('250000.5'); // not regrouped
    expect(node.selectionStart).toBe(2);
    expect(blur).not.toHaveBeenCalled();
    expect(m.symbol().textContent).toBe('ETH');
    expectClear(node, 'after change', false);
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

type AXNode = {
  role?: { value: string };
  name?: { value: string };
  description?: { value: string };
};

async function axTextbox(): Promise<{ name?: string; description?: string }> {
  type Frame = { frame: { id: string; url: string }; childFrames?: Frame[] };
  const session = cdp();
  const { frameTree } = (await session.send('Page.getFrameTree', {})) as { frameTree: Frame };
  const all: Frame[] = [];
  const walk = (f: Frame): void => {
    all.push(f);
    (f.childFrames ?? []).forEach(walk);
  };
  walk(frameTree);
  const testFrame = all.find((f) => f.frame.url.includes('iframeId='));
  if (!testFrame) throw new Error('test iframe not found');
  const { nodes } = (await session.send('Accessibility.getFullAXTree', {
    frameId: testFrame.frame.id,
  })) as { nodes: AXNode[] };
  const hits = nodes.filter((n) => n.role?.value === 'textbox');
  if (hits.length !== 1) throw new Error(`expected one textbox, got ${hits.length}`);
  return { name: hits[0]?.name?.value, description: hits[0]?.description?.value };
}

describe('INV-17: the accessibility tree describes the field with the symbol first', () => {
  it.each(
    (['light', 'dark'] as const).flatMap((theme) => MODE_NAMES.map((mode) => ({ theme, mode })))
  )('$theme, $mode: name is the label, description starts with USD', async ({ theme, mode }) => {
    setTheme(theme);
    mount(
      opts(mode, { symbol: 'USD', helperText: 'Up to 6 decimals', validation: { required: true } })
    );
    await frames();
    expect(await axTextbox()).toEqual({ name: 'Amount *', description: 'USD Up to 6 decimals' });
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await frames();
    const ax = await axTextbox();
    expect(ax.description).toBe('USD This field is required Up to 6 decimals');
  });
});
