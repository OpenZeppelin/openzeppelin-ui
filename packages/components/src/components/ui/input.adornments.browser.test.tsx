/**
 * Input start and end adornment slots in a real layout (Chromium).
 *
 * jsdom can't measure, hit-test or move focus the way a browser does, so this suite owns:
 * the text never sitting under a slot, slot alignment and wrapper size, a click on a slot
 * landing on the input, tab order, the focus ring not being clipped, padding following a
 * wider slot, and the absence of a ResizeObserver loop.
 *
 * The browser config does not load the kit stylesheet, so the Tailwind utilities Input uses
 * are injected below with Tailwind's values (preflight's border-box, `text-sm` 14px/20px,
 * `h-10` 40px, `px-3` 12px). The example app's Playwright spec repeats the geometry with the
 * real stylesheet in light and dark.
 */
import { render } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import * as React from 'react';

import { Input, type InputProps } from './input';

const STYLE_ID = 'input-adornments-styles';

beforeAll(async () => {
  // The default test viewport (414px) is narrower than the harness; elementFromPoint returns
  // null for points outside it.
  await page.viewport(1000, 800);
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    *, ::before, ::after { box-sizing: border-box; border: 0 solid; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.5; }
    input, button { font: inherit; }
    .relative { position: relative; }
    .absolute { position: absolute; }
    .flex { display: flex; }
    .items-center { align-items: center; }
    .inset-y-0 { top: 0; bottom: 0; }
    .start-3 { inset-inline-start: 12px; }
    .end-3 { inset-inline-end: 12px; }
    .w-full { width: 100%; }
    .h-10 { height: 40px; }
    .max-w-sm { max-width: 384px; }
    .rounded-md { border-radius: 6px; }
    .border { border-width: 1px; border-style: solid; border-color: #e4e4e7; }
    .px-3 { padding-left: 12px; padding-right: 12px; }
    .py-2 { padding-top: 8px; padding-bottom: 8px; }
    .text-sm { font-size: 14px; line-height: 20px; }
    .text-muted-foreground { color: #71717a; }
    .opacity-50 { opacity: 0.5; }
    .pointer-events-none { pointer-events: none; }
    .pointer-events-auto { pointer-events: auto; }
    /* Not used by Input; defined so a clipping wrapper would show up here. */
    .overflow-hidden { overflow: hidden; }
    .focus-visible\\:outline-none:focus-visible { outline: 2px solid transparent; outline-offset: 2px; }
    .focus-visible\\:ring-2:focus-visible { box-shadow: 0 0 0 2px #fff, 0 0 0 4px #18181b; }
    .icon16 { display: block; width: 16px; height: 16px; }
    .harness { width: 480px; padding: 24px; }
  `;
  document.head.appendChild(style);
});

afterAll(() => {
  document.getElementById(STYLE_ID)?.remove();
});

const LONG_VALUE = '1234567890'.repeat(8);
const TOL = 1;

const ICON = <svg className="icon16" aria-hidden="true" data-testid="icon" />;
const CONTENTS: [string, React.ReactNode][] = [
  ['16px icon', ICON],
  ['"$"', '$'],
  ['"USD"', 'USD'],
  ['"USDC"', 'USDC'],
];
const SIDES = ['start', 'end', 'both'] as const;
type Side = (typeof SIDES)[number];

function adornments(side: Side, node: React.ReactNode): Partial<InputProps> {
  if (side === 'start') return { startAdornment: node };
  if (side === 'end') return { endAdornment: node };
  return { startAdornment: node, endAdornment: node };
}

function Harness({ narrow, ...props }: InputProps & { narrow?: boolean }): React.ReactElement {
  return (
    <div className="harness">
      <div data-testid="parent" className={narrow ? 'max-w-sm' : undefined}>
        <Input aria-label="Amount" {...props} />
      </div>
    </div>
  );
}

const q = (selector: string): HTMLElement | null => document.querySelector(selector);
const inputEl = (): HTMLInputElement => document.querySelector('input') as HTMLInputElement;
const startSlot = (): HTMLElement | null => q('[data-slot="input-start-adornment"]');
const endSlot = (): HTMLElement | null => q('[data-slot="input-end-adornment"]');
const wrapper = (): HTMLElement => q('[data-slot="input-wrapper"]') as HTMLElement;

interface Geometry {
  contentLeft: number;
  contentRight: number;
  input: DOMRect;
  start?: DOMRect;
  end?: DOMRect;
  paddingLeft: number;
  paddingRight: number;
}

function geometry(): Geometry {
  const input = inputEl();
  const r = input.getBoundingClientRect();
  const cs = getComputedStyle(input);
  return {
    input: r,
    contentLeft: r.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft),
    contentRight: r.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight),
    start: startSlot()?.getBoundingClientRect(),
    end: endSlot()?.getBoundingClientRect(),
    paddingLeft: parseFloat(cs.paddingLeft),
    paddingRight: parseFloat(cs.paddingRight),
  };
}

/** Waits until the measured padding is on the input (the layout effect has run). */
async function settled(side: Side): Promise<void> {
  await expect
    .poll(() => {
      const s = inputEl().style;
      const needStart = side !== 'end';
      const needEnd = side !== 'start';
      return (!needStart || s.paddingInlineStart !== '') && (!needEnd || s.paddingInlineEnd !== '');
    })
    .toBe(true);
}

async function typeLong(): Promise<void> {
  const input = inputEl();
  await userEvent.fill(input, LONG_VALUE);
  input.setSelectionRange(LONG_VALUE.length, LONG_VALUE.length);
  input.scrollLeft = input.scrollWidth;
}

const centre = (r: DOMRect): [number, number] => [r.left + r.width / 2, r.top + r.height / 2];

// ResizeObserver delivers its callbacks outside any React act() scope in a real browser, and
// that delivery is the behaviour under test, so this file runs outside the act environment.
const actGlobal = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
let actEnv: boolean | undefined;
beforeAll(() => {
  actEnv = actGlobal.IS_REACT_ACT_ENVIRONMENT;
  actGlobal.IS_REACT_ACT_ENVIRONMENT = false;
});
afterAll(() => {
  actGlobal.IS_REACT_ACT_ENVIRONMENT = actEnv;
});

// Records ResizeObserver loop errors (and any other uncaught error) for the whole file.
const windowErrors: string[] = [];
const onError = (e: ErrorEvent): void => void windowErrors.push(String(e.message));
beforeAll(() => window.addEventListener('error', onError));
afterAll(() => window.removeEventListener('error', onError));

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error');
});
afterEach(() => {
  expect(consoleError).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});

// =============================================================================================
// The text never sits under a slot
// =============================================================================================

describe('Input text never sits under a slot', () => {
  describe.each(SIDES)('%s', (side) => {
    it.each(CONTENTS)('%s with a value longer than the field', async (_l, node) => {
      render(<Harness {...adornments(side, node)} />);
      await settled(side);
      await typeLong();
      const input = inputEl();
      expect(input.scrollWidth).toBeGreaterThan(input.clientWidth);
      expect(input.scrollLeft + input.clientWidth).toBeGreaterThanOrEqual(input.scrollWidth - 1);

      const g = geometry();
      if (g.end) expect(g.end.left - g.contentRight).toBeGreaterThanOrEqual(8 - TOL);
      if (g.start) expect(g.contentLeft - g.start.right).toBeGreaterThanOrEqual(8 - TOL);
      // The content box still has room for text.
      expect(g.contentRight - g.contentLeft).toBeGreaterThan(100);
    });
  });

  it('"$" reserves less padding than "USD", and "USD" less than "USDC"', async () => {
    const pad: number[] = [];
    for (const node of ['$', 'USD', 'USDC']) {
      const { unmount } = render(<Harness endAdornment={node} />);
      await settled('end');
      pad.push(geometry().paddingRight);
      unmount();
    }
    expect(pad[0]).toBeLessThan(pad[1]);
    expect(pad[1]).toBeLessThan(pad[2]);
  });

  it('failure-side: with no adornment the class padding (12px) applies', async () => {
    render(<Harness endAdornment={null} />);
    expect(geometry().paddingRight).toBe(12);
    expect(geometry().paddingLeft).toBe(12);
  });
});

// =============================================================================================
// Slot alignment and wrapper size
// =============================================================================================

describe('Input slot alignment and wrapper size', () => {
  describe.each([
    ['full-width parent', false],
    ['max-w-sm parent', true],
  ])('%s', (_l, narrow) => {
    it.each(CONTENTS)('both sides holding %s', async (_c, node) => {
      render(<Harness narrow={narrow} {...adornments('both', node)} />);
      await settled('both');
      const g = geometry();
      const w = wrapper().getBoundingClientRect();
      const parent = q('[data-testid="parent"]') as HTMLElement;

      expect(Math.abs(w.height - g.input.height)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(w.width - parent.clientWidth)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(g.input.width - w.width)).toBeLessThanOrEqual(0.5);
      if (narrow) expect(w.width).toBeLessThanOrEqual(384);

      const inputMid = g.input.top + g.input.height / 2;
      for (const slotRect of [g.start, g.end]) {
        if (!slotRect) throw new Error('slot missing');
        expect(Math.abs(centre(slotRect)[1] - inputMid)).toBeLessThanOrEqual(TOL);
      }
      expect(Math.abs((g.start as DOMRect).left - g.input.left - 12)).toBeLessThanOrEqual(TOL);
      expect(Math.abs(g.input.right - (g.end as DOMRect).right - 12)).toBeLessThanOrEqual(TOL);
    });
  });
});

// =============================================================================================
// The input's look: ring and overflow
// =============================================================================================

describe('Input focus ring is not clipped by the wrapper', () => {
  async function ringOf(props: Partial<InputProps>): Promise<string> {
    const { unmount } = render(
      <>
        <button type="button">before</button>
        <Harness {...props} />
      </>
    );
    (document.querySelector('button') as HTMLButtonElement).focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(inputEl());
    const shadow = getComputedStyle(inputEl()).boxShadow;
    const overflow = q('[data-slot="input-wrapper"]')
      ? getComputedStyle(wrapper()).overflow
      : 'visible';
    unmount();
    expect(overflow).toBe('visible');
    return shadow;
  }

  it('keyboard focus draws the same ring with and without adornments', async () => {
    const plain = await ringOf({});
    expect(plain).not.toBe('none');
    const adorned = await ringOf({ startAdornment: '$', endAdornment: 'USD' });
    expect(adorned).toBe(plain);
  });
});

// =============================================================================================
// A click on a slot lands on the input
// =============================================================================================

describe('Input click on a slot lands on the input', () => {
  describe.each([
    ['editable', {}],
    ['read-only look', { readOnly: true, 'data-readonly': true } as Partial<InputProps>],
  ])('%s', (_l, extra) => {
    it.each([
      ['start icon', { startAdornment: ICON }, startSlot],
      ['end text', { endAdornment: 'USD' }, endSlot],
    ] as const)('%s: hit test and real click focus the input', async (_s, props, getSlot) => {
      const onClick = vi.fn();
      const onFocus = vi.fn();
      render(
        <>
          <button type="button">elsewhere</button>
          <Harness {...extra} {...props} onClick={onClick} onFocus={onFocus} />
        </>
      );
      await settled('startAdornment' in props ? 'start' : 'end');
      const input = inputEl();
      const slotRect = (getSlot() as HTMLElement).getBoundingClientRect();
      const [cx, cy] = centre(slotRect);
      expect(document.elementFromPoint(cx, cy)).toBe(input);

      expect(document.activeElement).not.toBe(input);
      const inputRect = input.getBoundingClientRect();
      // A real pointer press at the slot's centre. Playwright refuses the click if another
      // element would receive it, so this also proves the slot doesn't intercept.
      await userEvent.click(input, {
        position: { x: cx - inputRect.left, y: cy - inputRect.top },
        timeout: 3000,
      });
      expect(document.activeElement).toBe(input);
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick.mock.calls[0][0].target).toBe(input);
      expect(onFocus).toHaveBeenCalledTimes(1);
    });
  });

  it('a click on a slot keeps a focused input focused (no blur)', async () => {
    const onBlur = vi.fn();
    render(<Harness endAdornment="USD" onBlur={onBlur} />);
    await settled('end');
    const input = inputEl();
    input.focus();
    const [cx, cy] = centre((endSlot() as HTMLElement).getBoundingClientRect());
    const r = input.getBoundingClientRect();
    await userEvent.click(input, { position: { x: cx - r.left, y: cy - r.top }, timeout: 3000 });
    expect(document.activeElement).toBe(input);
    expect(onBlur).not.toHaveBeenCalled();
  });
});

// =============================================================================================
// Tab order
// =============================================================================================

describe('Input tab order', () => {
  const active = (): string =>
    document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent ?? '';

  it('a decorative adornment adds no tab stop, forward or back', async () => {
    render(
      <>
        <button type="button">before</button>
        <Harness startAdornment={ICON} endAdornment="USD" />
        <button type="button">after</button>
      </>
    );
    (document.querySelector('button') as HTMLButtonElement).focus();
    const forward: string[] = [];
    for (let i = 0; i < 2; i += 1) {
      await userEvent.tab();
      forward.push(active());
    }
    expect(forward).toEqual(['Amount', 'after']);
    const back: string[] = [];
    for (let i = 0; i < 2; i += 1) {
      await userEvent.tab({ shift: true });
      back.push(active());
    }
    expect(back).toEqual(['Amount', 'before']);
  });

  it('an opted-in end-slot button is clickable and sits after the input', async () => {
    const onMax = vi.fn();
    render(
      <>
        <button type="button">before</button>
        <Harness
          endAdornment={
            <button type="button" className="pointer-events-auto" onClick={onMax}>
              Max
            </button>
          }
        />
        <button type="button">after</button>
      </>
    );
    await settled('end');
    await userEvent.click(document.querySelector('[data-slot="input-end-adornment"] button')!, {
      timeout: 3000,
    });
    expect(onMax).toHaveBeenCalledTimes(1);

    (document.querySelector('button') as HTMLButtonElement).focus();
    const order: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      await userEvent.tab();
      order.push(active());
    }
    expect(order).toEqual(['Amount', 'Max', 'after']);
  });

  it('an opted-in start-slot button sits before the input', async () => {
    render(
      <>
        <button type="button">before</button>
        <Harness
          startAdornment={
            <button type="button" className="pointer-events-auto">
              Pick
            </button>
          }
        />
      </>
    );
    (document.querySelector('button') as HTMLButtonElement).focus();
    await userEvent.tab();
    expect(active()).toBe('Pick');
    await userEvent.tab();
    expect(active()).toBe('Amount');
  });
});

// =============================================================================================
// Logical sides
// =============================================================================================

describe('Input adornments follow the text direction', () => {
  it('RTL: the start slot sits on the right and the text stays clear of both slots', async () => {
    render(
      <div dir="rtl">
        <Harness startAdornment="$" endAdornment="USD" />
      </div>
    );
    await settled('both');
    const g = geometry();
    if (!g.start || !g.end) throw new Error('slot missing');
    expect(Math.abs(g.input.right - 1 - 12 - g.start.right)).toBeLessThanOrEqual(TOL);
    expect(Math.abs(g.end.left - (g.input.left + 1 + 12))).toBeLessThanOrEqual(TOL);
    expect(g.paddingRight).toBeCloseTo(12 + g.start.width + 8, 0);
    expect(g.paddingLeft).toBeCloseTo(12 + g.end.width + 8, 0);
    expect(g.start.left - g.contentRight).toBeGreaterThanOrEqual(8 - TOL);
    expect(g.contentLeft - g.end.right).toBeGreaterThanOrEqual(8 - TOL);
  });

  it("LTR: measured padding beats the caller's physical style padding on that side", async () => {
    render(<Harness endAdornment="USD" style={{ paddingRight: 4, paddingLeft: 5 }} />);
    await settled('end');
    const g = geometry();
    if (!g.end) throw new Error('slot missing');
    expect(g.paddingRight).toBeCloseTo(12 + g.end.width + 8, 0);
    expect(g.paddingLeft).toBe(5);
  });
});

// =============================================================================================
// Padding follows the slot; no ResizeObserver loop
// =============================================================================================

describe('Input padding follows the slot in a real layout', () => {
  it('"USD" → "USDC.e": the padding grows with no test-triggered re-render', async () => {
    function Swap(): React.ReactElement {
      const [label, setLabel] = React.useState('USD');
      return (
        <>
          <button type="button" onClick={() => setLabel('USDC.e')}>
            swap
          </button>
          <Harness endAdornment={label} />
        </>
      );
    }
    render(<Swap />);
    await settled('end');
    const before = geometry().paddingRight;
    await userEvent.click(document.querySelector('button')!);
    await expect.poll(() => geometry().paddingRight).toBeGreaterThan(before);
    await typeLong();
    const g = geometry();
    expect((g.end as DOMRect).left - g.contentRight).toBeGreaterThanOrEqual(8 - TOL);
  });

  it('a slot that grows on its own (no React render) moves the padding', async () => {
    render(<Harness endAdornment={<span data-testid="grow">USD</span>} />);
    await settled('end');
    const before = geometry().paddingRight;
    (q('[data-testid="grow"]') as HTMLElement).textContent = 'USD (bridged)';
    await expect.poll(() => geometry().paddingRight).toBeGreaterThan(before + 20);
    const g = geometry();
    expect((g.end as DOMRect).left - g.contentRight).toBeGreaterThanOrEqual(8 - TOL);
  });

  it('no ResizeObserver loop error over the whole file', async () => {
    // Give any pending observer delivery a frame to report.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    expect(windowErrors.filter((m) => /ResizeObserver/i.test(m))).toEqual([]);
  });
});
