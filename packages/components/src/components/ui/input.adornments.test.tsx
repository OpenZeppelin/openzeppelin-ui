/**
 * @vitest-environment jsdom
 *
 * Input start and end adornment slots: the jsdom half of the contract.
 *
 * - The plain path (no renderable adornment) renders exactly what Input rendered before the
 *   slots existed. `Input0` below is that component, copied verbatim, so a diff in a failing
 *   test names the attribute that changed.
 * - The adorned path: structure, slot contract, padding maths, ref target, handlers, observer
 *   lifecycle, commit counts and the accessible name and description.
 *
 * jsdom has no layout, so slot widths come from an `offsetWidth` spy and a fake
 * ResizeObserver whose callbacks the tests fire by hand. Geometry, pointer hits and focus in a
 * real layout live in `input.adornments.browser.test.tsx`.
 */
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { computeAccessibleDescription, computeAccessibleName } from 'dom-accessibility-api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';

import { cn } from '@openzeppelin/ui-utils';

import { Input, type InputProps } from './input';

// ---------------------------------------------------------------------------------------------
// The reference: Input as it was before the adornment slots (copied verbatim, comments dropped)
// ---------------------------------------------------------------------------------------------

type Input0Props = React.InputHTMLAttributes<HTMLInputElement>;

const Input0 = React.forwardRef<HTMLInputElement, Input0Props>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        data-slot="input"
        className={cn(
          'border-input bg-background ring-offset-background focus-visible:ring-ring placeholder:text-muted-foreground h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          'data-readonly:read-only:not-disabled:bg-muted data-readonly:read-only:not-disabled:text-foreground data-readonly:read-only:not-disabled:opacity-100 data-readonly:read-only:not-disabled:cursor-default',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input0.displayName = 'Input0';

// ---------------------------------------------------------------------------------------------
// Layout fakes
// ---------------------------------------------------------------------------------------------

const START = '[data-slot="input-start-adornment"]';
const END = '[data-slot="input-end-adornment"]';
const WRAPPER = '[data-slot="input-wrapper"]';

interface FakeObserverRecord {
  cb: ResizeObserverCallback;
  targets: Element[];
  disconnected: boolean;
  instance: ResizeObserver;
}

let observers: FakeObserverRecord[] = [];
let widths: { start: number; end: number };
let offsetWidthReads: HTMLElement[] = [];

class FakeResizeObserver implements ResizeObserver {
  private readonly record: FakeObserverRecord;
  constructor(cb: ResizeObserverCallback) {
    this.record = { cb, targets: [], disconnected: false, instance: this };
    observers.push(this.record);
  }
  observe(target: Element): void {
    this.record.targets.push(target);
  }
  unobserve(): void {}
  disconnect(): void {
    this.record.disconnected = true;
  }
}

/** Fires every live observer watching `selector`'s element, inside `act`. */
function fireResize(selector: string): void {
  act(() => {
    for (const o of observers) {
      if (o.disconnected) continue;
      if (o.targets.some((t) => t.matches(selector))) o.cb([], o.instance);
    }
  });
}

beforeEach(() => {
  observers = [];
  offsetWidthReads = [];
  widths = { start: 16, end: 30 };
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
    this: HTMLElement
  ) {
    offsetWidthReads.push(this);
    if (this.matches(START)) return widths.start;
    if (this.matches(END)) return widths.end;
    return 0;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

const inputEl = (root: ParentNode = document): HTMLInputElement => {
  const el = root.querySelector('input');
  if (!el) throw new Error('no <input> rendered');
  return el;
};
const slot = (selector: string): HTMLElement | null => document.querySelector(selector);

/** Attribute name → value, sorted, optionally without some names. */
function attrs(el: Element, omit: string[] = []): Record<string, string> {
  return Object.fromEntries(
    Array.from(el.attributes)
      .filter((a) => !omit.includes(a.name))
      .map((a) => [a.name, a.value] as const)
      .sort(([a], [b]) => a.localeCompare(b))
  );
}

/** The props React last committed to a host element (React's own expando key). */
function hostProps(el: Element): Record<string, unknown> {
  const key = Object.keys(el).find((k) => k.startsWith('__reactProps$'));
  if (!key) throw new Error('no React props on element');
  return (el as unknown as Record<string, Record<string, unknown>>)[key];
}

// Non-renderable adornment values: React draws nothing for these.
const NON_RENDERABLE: [string, React.ReactNode][] = [
  ['undefined', undefined],
  ['null', null],
  ['false', false],
  ['true', true],
  ["''", ''],
];

/** Prop sets the plain path must render exactly as the reference does. */
const noop = (): void => {};
const PROP_MATRIX: [string, InputProps][] = [
  ['no props', {}],
  ['type text', { type: 'text' }],
  ['type email', { type: 'email' }],
  ['type number', { type: 'number' }],
  ['type password', { type: 'password' }],
  ['className pl-10', { className: 'pl-10' }],
  ['className max-w', { className: 'max-w-[200px]' }],
  ['data-slot override', { 'data-slot': 'custom' } as InputProps],
  ['style', { style: { color: 'red', paddingLeft: 4 } }],
  // `style` after another attribute: attribute order is part of outerHTML.
  ['placeholder then style', { placeholder: 'x', style: { color: 'red' } }],
  ['read-only look', { readOnly: true, 'data-readonly': true } as InputProps],
  ['disabled', { disabled: true }],
  ['aria', { 'aria-invalid': true, 'aria-describedby': 'help' }],
  ['id + name', { id: 'amount', name: 'amount' }],
  ['controlled', { placeholder: '0.00', value: '12', onChange: noop }],
];

// =============================================================================================
// Render contract
// =============================================================================================

describe('Input plain path is the pre-adornment <input>', () => {
  describe.each(PROP_MATRIX)('%s', (_label, props) => {
    it.each(NON_RENDERABLE)('adornments = %s on both sides', (_v, value) => {
      const ref = render(<Input0 {...props} />);
      const expected = ref.container.innerHTML;
      ref.unmount();

      for (const adornments of [
        { startAdornment: value },
        { endAdornment: value },
        { startAdornment: value, endAdornment: value },
      ]) {
        const { container, unmount } = render(<Input {...props} {...adornments} />);
        expect(container.innerHTML).toBe(expected);
        expect(container.childElementCount).toBe(1);
        expect(container.querySelector(WRAPPER)).toBeNull();
        expect(container.querySelector('[data-slot$="-adornment"]')).toBeNull();
        unmount();
      }
    });
  });

  it('boundary: 0 is renderable, so it leaves the plain path', () => {
    const { container } = render(<Input endAdornment={0} />);
    expect(container.querySelector(WRAPPER)).not.toBeNull();
    expect(slot(END)?.textContent).toBe('0');
  });
});

describe('Input adorned structure', () => {
  const sequence = (): string[] => {
    const wrapper = document.querySelector(WRAPPER);
    if (!wrapper) throw new Error('no wrapper');
    return Array.from(wrapper.children).map(
      (c) => `${c.tagName.toLowerCase()}:${c.getAttribute('data-slot')}`
    );
  };

  it('start only: wrapper holds start slot, then the input', () => {
    render(<Input startAdornment="$" />);
    expect(sequence()).toEqual(['span:input-start-adornment', 'input:input']);
  });

  it('end only: wrapper holds the input, then end slot', () => {
    render(<Input endAdornment="USD" />);
    expect(sequence()).toEqual(['input:input', 'span:input-end-adornment']);
  });

  it('both: start slot, input, end slot, in DOM order', () => {
    render(<Input startAdornment="$" endAdornment="USD" />);
    expect(sequence()).toEqual([
      'span:input-start-adornment',
      'input:input',
      'span:input-end-adornment',
    ]);
    expect(document.querySelectorAll(WRAPPER)).toHaveLength(1);
  });

  it('the wrapper is a div with data-slot and class only', () => {
    render(<Input endAdornment="USD" />);
    const wrapper = document.querySelector(WRAPPER);
    expect(wrapper?.tagName).toBe('DIV');
    expect(Object.keys(attrs(wrapper as Element)).sort()).toEqual(['class', 'data-slot']);
  });

  it.each([
    ['start', { startAdornment: 0 }, START, END],
    ['end', { endAdornment: 0 }, END, START],
  ] as const)('boundary: 0 on the %s side renders one slot showing 0', (_s, props, own, other) => {
    render(<Input {...props} />);
    expect(document.querySelectorAll(own)).toHaveLength(1);
    expect(slot(own)?.textContent).toBe('0');
    expect(slot(other)).toBeNull();
  });

  it.each(NON_RENDERABLE)(
    'failure-side: start = %s with end "USD" renders only the end slot',
    (_v, value) => {
      render(<Input startAdornment={value} endAdornment="USD" />);
      expect(slot(START)).toBeNull();
      expect(slot(END)?.textContent).toBe('USD');
    }
  );

  it.each([
    ['fragment', <></>],
    ['empty array', []],
  ])('a renderable value that draws nothing (%s) gets a slot and no padding', (_l, node) => {
    widths.end = 0;
    render(<Input endAdornment={node} />);
    expect(slot(END)).not.toBeNull();
    expect(inputEl().style.paddingInlineEnd).toBe('');
  });
});

describe('Input look stays on the <input>', () => {
  const WRAPPER_ALLOW_LIST = ['relative', 'flex', 'w-full'];

  describe.each(PROP_MATRIX)('%s', (_label, props) => {
    it('adorned <input> attributes other than style equal the plain ones', () => {
      const plain = render(<Input {...props} />);
      const expected = attrs(inputEl(plain.container), ['style']);
      plain.unmount();

      const adorned = render(<Input {...props} startAdornment="$" endAdornment="USD" />);
      expect(attrs(inputEl(adorned.container), ['style'])).toEqual(expected);
    });
  });

  it('wrapper classes are layout-only, from the allow-list', () => {
    render(<Input endAdornment="USD" className="border-destructive" />);
    const wrapper = document.querySelector(WRAPPER) as HTMLElement;
    for (const c of Array.from(wrapper.classList)) expect(WRAPPER_ALLOW_LIST).toContain(c);
    expect(wrapper.classList.contains('relative')).toBe(true);
    expect(wrapper.classList.contains('w-full')).toBe(true);
  });

  it("failure-side: the caller's validation class reaches the <input>, not the wrapper", () => {
    render(<Input endAdornment="USD" className="border-destructive" />);
    expect(inputEl().classList.contains('border-destructive')).toBe(true);
    expect(document.querySelector(WRAPPER)?.classList.contains('border-destructive')).toBe(false);
  });
});

describe('Input slot contract', () => {
  const REQUIRED = [
    'pointer-events-none',
    'absolute',
    'inset-y-0',
    'flex',
    'items-center',
    'text-sm',
    'text-muted-foreground',
  ];

  it.each([
    ['start', START, 'start-3'],
    ['end', END, 'end-3'],
  ])('%s slot carries the slot classes and its side', (_s, selector, side) => {
    render(<Input startAdornment="$" endAdornment="USD" />);
    const el = slot(selector) as HTMLElement;
    expect(el.tagName).toBe('SPAN');
    for (const c of [...REQUIRED, side]) expect(el.classList).toContain(c);
    expect(el.classList.contains(side === 'start-3' ? 'end-3' : 'start-3')).toBe(false);
  });

  it.each([
    ['absent', {}, false],
    ['false', { disabled: false }, false],
    ['true', { disabled: true }, true],
  ] as const)('opacity-50 on the slots iff disabled === true (disabled %s)', (_l, p, dim) => {
    render(<Input {...p} startAdornment="$" endAdornment="USD" />);
    expect(slot(START)?.classList.contains('opacity-50')).toBe(dim);
    expect(slot(END)?.classList.contains('opacity-50')).toBe(dim);
  });

  it('a slot sets no id, role, aria-*, tabindex or event handler', () => {
    render(<Input startAdornment="$" endAdornment="USD" />);
    for (const selector of [START, END]) {
      const el = slot(selector) as HTMLElement;
      expect(Object.keys(attrs(el)).sort()).toEqual(['class', 'data-slot']);
      const handlers = Object.keys(hostProps(el)).filter((k) => /^on[A-Z]/.test(k));
      expect(handlers).toEqual([]);
    }
  });

  it("the consumer's node is the slot's child, attributes intact", () => {
    render(
      <Input
        endAdornment={
          <span id="sym" aria-hidden="true" className="x">
            USD
          </span>
        }
      />
    );
    const child = slot(END)?.firstElementChild;
    expect(child?.tagName).toBe('SPAN');
    expect(child?.id).toBe('sym');
    expect(child?.getAttribute('aria-hidden')).toBe('true');
    expect(child?.className).toBe('x');
    expect(child?.textContent).toBe('USD');
  });
});

// =============================================================================================
// Prop / state contract
// =============================================================================================

describe('Input adornment props never reach the DOM', () => {
  const VALUES: [string, React.ReactNode][] = [
    ['null', null],
    ['false', false],
    ["''", ''],
    ['"USD"', 'USD'],
    ['<svg />', <svg key="s" />],
  ];

  it.each(VALUES)('%s on each side: no adornment attribute, no React warning', (_l, value) => {
    const error = vi.spyOn(console, 'error');
    for (const props of [
      { startAdornment: value },
      { endAdornment: value },
      { startAdornment: value, endAdornment: value },
    ]) {
      const { container, unmount } = render(<Input {...props} />);
      for (const el of Array.from(container.querySelectorAll('*'))) {
        const names = Array.from(el.attributes).map((a) => a.name.toLowerCase());
        expect(names.filter((n) => n.includes('adornment'))).toEqual([]);
      }
      unmount();
    }
    expect(error).not.toHaveBeenCalled();
  });
});

describe('Input padding = 12 + slot width + 8, only where measured', () => {
  it('end width 60 gives inline-end padding 80px and no inline-start padding', () => {
    widths.end = 60;
    render(<Input endAdornment="USD" />);
    expect(inputEl().style.paddingInlineEnd).toBe('80px');
    expect(inputEl().style.paddingInlineStart).toBe('');
  });

  it('both sides: start 16 → inline-start 36px, end 30 → inline-end 50px', () => {
    render(<Input startAdornment="$" endAdornment="USD" />);
    expect(inputEl().style.paddingInlineStart).toBe('36px');
    expect(inputEl().style.paddingInlineEnd).toBe('50px');
  });

  it('boundary: width 0 sets no padding key on that side', () => {
    widths = { start: 0, end: 0 };
    render(<Input startAdornment="$" endAdornment="USD" />);
    expect(inputEl().style.paddingInlineStart).toBe('');
    expect(inputEl().style.paddingInlineEnd).toBe('');
  });

  it("boundary: width 0 leaves the caller's own padding in place", () => {
    widths.end = 0;
    render(<Input endAdornment="USD" style={{ paddingInlineEnd: 4 }} />);
    expect(inputEl().style.paddingInlineEnd).toBe('4px');
  });

  it("measured padding beats the caller's style padding; other keys are kept", () => {
    widths.end = 60;
    render(
      <Input
        endAdornment="USD"
        style={{ paddingInlineEnd: 4, paddingInlineStart: 5, color: 'red' }}
      />
    );
    expect(inputEl().style.paddingInlineEnd).toBe('80px');
    expect(inputEl().style.paddingInlineStart).toBe('5px');
    expect(inputEl().style.color).toBe('red');
  });

  it("a frozen caller style is not mutated and doesn't throw", () => {
    widths.end = 60;
    const style = Object.freeze({ paddingInlineEnd: 4, color: 'red' });
    expect(() => render(<Input endAdornment="USD" style={style} />)).not.toThrow();
    expect(style).toEqual({ paddingInlineEnd: 4, color: 'red' });
    expect(inputEl().style.paddingInlineEnd).toBe('80px');
  });

  it('a pl-10 class is overridden inline by the measured start padding', () => {
    render(<Input className="pl-10" startAdornment={<svg />} />);
    expect(inputEl().classList.contains('pl-10')).toBe(true);
    expect(inputEl().style.paddingInlineStart).toBe('36px');
  });

  it('plain path: the <input> receives the caller style object itself', () => {
    const style = { color: 'red' };
    render(<Input style={style} />);
    expect(hostProps(inputEl()).style).toBe(style);
  });

  it('failure-side: a side with no slot gets no measured padding', () => {
    widths = { start: 50, end: 30 };
    render(<Input endAdornment="USD" startAdornment={null} />);
    expect(inputEl().style.paddingInlineStart).toBe('');
    expect(inputEl().style.paddingInlineEnd).toBe('50px');
  });
});

describe('Input ref targets the <input>', () => {
  it.each([
    ['plain', {}],
    ['start', { startAdornment: '$' }],
    ['end', { endAdornment: 'USD' }],
    ['both', { startAdornment: '$', endAdornment: 'USD' }],
  ] as const)('object ref on the %s path is the textbox', (_l, props) => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} aria-label="Amount" {...props} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toBe(screen.getByRole('textbox', { name: 'Amount' }));
  });

  it('a callback ref receives the <input>', () => {
    const seen: (HTMLInputElement | null)[] = [];
    render(<Input ref={(el) => void seen.push(el)} endAdornment="USD" />);
    expect(seen.at(-1)).toBe(inputEl());
  });

  it('after a content change the ref still points at the same <input>', () => {
    const ref = React.createRef<HTMLInputElement>();
    const { rerender } = render(<Input ref={ref} endAdornment="USD" />);
    const first = ref.current;
    rerender(<Input ref={ref} endAdornment="ETH" />);
    expect(ref.current).toBe(first);
    expect(ref.current).toBe(inputEl());
  });

  it('presence toggles none → "USD" → none: the ref ends on the live <input>', () => {
    const log: (HTMLInputElement | null)[] = [];
    const cb = (el: HTMLInputElement | null): void => void log.push(el);
    const { rerender } = render(<Input ref={cb} />);
    rerender(<Input ref={cb} endAdornment="USD" />);
    expect(log.at(-1)).toBe(inputEl());
    rerender(<Input ref={cb} />);
    expect(log.at(-1)).toBe(inputEl());
    expect(log.at(-1)?.isConnected).toBe(true);
    // Every remount detaches before it attaches.
    for (let i = 1; i < log.length; i += 1) {
      if (log[i] !== null && log[i - 1] !== null) expect(log[i]).toBe(log[i - 1]);
    }
  });

  it('on unmount the ref is null', () => {
    const ref = React.createRef<HTMLInputElement>();
    const { unmount } = render(<Input ref={ref} startAdornment="$" />);
    unmount();
    expect(ref.current).toBeNull();
  });
});

// =============================================================================================
// Interaction & transition
// =============================================================================================

describe('Input content change keeps the <input> mounted', () => {
  it('USD → ETH keeps node, focus, typed value and selection', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Input aria-label="Amount" endAdornment="USD" />);
    const before = inputEl();
    await user.click(before);
    await user.keyboard('abc');
    before.setSelectionRange(1, 2);

    rerender(<Input aria-label="Amount" endAdornment="ETH" />);
    const after = inputEl();
    expect(after).toBe(before);
    expect(document.activeElement).toBe(before);
    expect(after.value).toBe('abc');
    expect([after.selectionStart, after.selectionEnd]).toEqual([1, 2]);
  });

  it('icon → icon and text → icon on the start side keep the node', () => {
    const { rerender } = render(<Input startAdornment={<svg data-icon="a" />} />);
    const before = inputEl();
    rerender(<Input startAdornment={<svg data-icon="b" />} />);
    rerender(<Input startAdornment="$" />);
    expect(inputEl()).toBe(before);
  });

  it('a presence toggle never throws or logs, and the ref lands on the live input', () => {
    const error = vi.spyOn(console, 'error');
    const ref = React.createRef<HTMLInputElement>();
    const { rerender } = render(<Input ref={ref} />);
    expect(() => {
      rerender(<Input ref={ref} endAdornment="USD" />);
      rerender(<Input ref={ref} />);
      rerender(<Input ref={ref} startAdornment="$" endAdornment="USD" />);
      rerender(<Input ref={ref} startAdornment="$" />);
    }).not.toThrow();
    expect(error).not.toHaveBeenCalled();
    expect(ref.current).toBe(inputEl());
  });
});

describe('Input adds no behaviour to the <input>', () => {
  async function record(props: Partial<InputProps>): Promise<Record<string, unknown[]>> {
    const user = userEvent.setup();
    const calls: Record<string, unknown[]> = { focus: [], change: [], blur: [], keydown: [] };
    render(
      <>
        <Input
          aria-label="Amount"
          onFocus={(e) => calls.focus.push(e.target)}
          onChange={(e) => calls.change.push(e.target)}
          onBlur={(e) => calls.blur.push(e.target)}
          onKeyDown={(e) => calls.keydown.push(e.target)}
          {...props}
        />
        <button type="button">after</button>
      </>
    );
    const input = inputEl();
    await user.click(input);
    await user.keyboard('12');
    await user.paste('3');
    await user.keyboard('{Enter}');
    await user.tab();
    const tagged: Record<string, unknown[]> = {};
    for (const [k, v] of Object.entries(calls)) {
      tagged[k] = v.map((t) => (t === input ? 'input' : t));
    }
    return tagged;
  }

  it('the same user script fires the same handlers with the same target', async () => {
    const plain = await record({});
    document.body.innerHTML = '';
    const adorned = await record({ startAdornment: '$', endAdornment: 'USD' });
    expect(adorned).toEqual(plain);
    expect(plain.focus).toEqual(['input']);
    expect(plain.blur).toEqual(['input']);
    expect(plain.change).toHaveLength(3);
  });

  it('failure-side: a disabled adorned input records no change', async () => {
    const calls = await record({ disabled: true, endAdornment: 'USD' });
    expect(calls.change).toEqual([]);
    expect(calls.focus).toEqual([]);
  });
});

// =============================================================================================
// Performance, scalability & stability
// =============================================================================================

describe('Input padding follows the measured width', () => {
  it('end 30 → 60 → 20 moves inline-end padding 50 → 80 → 40 px on observer callbacks', () => {
    render(<Input endAdornment="USD" />);
    expect(inputEl().style.paddingInlineEnd).toBe('50px');
    widths.end = 60;
    fireResize(END);
    expect(inputEl().style.paddingInlineEnd).toBe('80px');
    widths.end = 20;
    fireResize(END);
    expect(inputEl().style.paddingInlineEnd).toBe('40px');
  });

  it('boundary: a slot that shrinks to 0 drops the padding key', () => {
    render(<Input startAdornment={<svg />} />);
    widths.start = 0;
    fireResize(START);
    expect(inputEl().style.paddingInlineStart).toBe('');
  });
});

describe('Input ResizeObserver lifecycle', () => {
  const live = (): FakeObserverRecord[] => observers.filter((o) => !o.disconnected);

  it('one observer per slot, each observing only its slot', () => {
    render(<Input startAdornment="$" endAdornment="USD" />);
    expect(observers).toHaveLength(2);
    const targets = observers.map((o) => o.targets);
    expect(targets).toEqual([[slot(START)], [slot(END)]]);
    for (const t of targets.flat()) {
      expect(t).not.toBe(inputEl());
      expect(t).not.toBe(document.querySelector(WRAPPER));
    }
  });

  it('unmount disconnects both observers', () => {
    const { unmount } = render(<Input startAdornment="$" endAdornment="USD" />);
    unmount();
    expect(observers).toHaveLength(2);
    expect(live()).toEqual([]);
  });

  it('dropping the end adornment disconnects only the end observer', () => {
    const { rerender } = render(<Input startAdornment="$" endAdornment="USD" />);
    const [startObs, endObs] = observers;
    rerender(<Input startAdornment="$" endAdornment={null} />);
    expect(endObs.disconnected).toBe(true);
    expect(startObs.disconnected).toBe(false);
    expect(inputEl().style.paddingInlineEnd).toBe('');
    expect(inputEl().style.paddingInlineStart).toBe('36px');
  });

  it('re-adding a side measures it and observes it again', () => {
    const { rerender } = render(<Input startAdornment="$" />);
    rerender(<Input startAdornment="$" endAdornment="USD" />);
    expect(inputEl().style.paddingInlineEnd).toBe('50px');
    expect(live().map((o) => o.targets[0])).toContain(slot(END));
  });

  it('content changes do not create observers', () => {
    const { rerender } = render(<Input endAdornment="USD" />);
    rerender(<Input endAdornment="ETH" />);
    rerender(<Input endAdornment="USDC" />);
    expect(observers).toHaveLength(1);
    expect(live()).toHaveLength(1);
  });

  it('without ResizeObserver it measures once and does not throw', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    expect(() => render(<Input startAdornment="$" endAdornment="USD" />)).not.toThrow();
    expect(inputEl().style.paddingInlineStart).toBe('36px');
    expect(inputEl().style.paddingInlineEnd).toBe('50px');
    expect(observers).toEqual([]);
  });
});

describe('Input measurement settles (no feedback loop)', () => {
  function countCommits(node: React.ReactElement): { commits: () => number } {
    let n = 0;
    render(
      <React.Profiler id="input" onRender={() => void (n += 1)}>
        {node}
      </React.Profiler>
    );
    return { commits: () => n };
  }

  it('both slots: at most 3 commits after mount', () => {
    const { commits } = countCommits(<Input startAdornment="$" endAdornment="USD" />);
    expect(commits()).toBeLessThanOrEqual(3);
  });

  // React may render once more for the first same-value update after mount before it bails
  // out (stale lanes on the alternate fiber; documented for useState). The property that
  // matters is that it settles: at most one such commit in total, then none, and no DOM change.
  it('same-width observer callbacks settle: at most one commit, then none', () => {
    const { commits } = countCommits(<Input startAdornment="$" endAdornment="USD" />);
    const before = commits();
    const style = inputEl().getAttribute('style');
    fireResize(START);
    fireResize(END);
    expect(commits() - before).toBeLessThanOrEqual(1);
    const settled = commits();
    for (let i = 0; i < 5; i += 1) {
      fireResize(START);
      fireResize(END);
    }
    expect(commits()).toBe(settled);
    expect(inputEl().getAttribute('style')).toBe(style);
  });

  it('failure-side: a callback reporting a new width adds exactly one commit', () => {
    const { commits } = countCommits(<Input endAdornment="USD" />);
    const before = commits();
    widths.end = 44;
    fireResize(END);
    expect(commits()).toBe(before + 1);
  });
});

describe('Input plain path costs what it did before the slots', () => {
  it('no observer, no layout read, one commit on mount', () => {
    let commits = 0;
    render(
      <React.Profiler id="plain" onRender={() => void (commits += 1)}>
        <Input placeholder="x" />
      </React.Profiler>
    );
    expect(observers).toEqual([]);
    expect(offsetWidthReads).toEqual([]);
    expect(commits).toBe(1);
  });

  it('non-renderable adornments keep the plain cost', () => {
    render(<Input startAdornment={null} endAdornment={false} />);
    expect(observers).toEqual([]);
    expect(offsetWidthReads).toEqual([]);
  });

  it('boundary: going from adorned to plain disconnects and stops reading layout', () => {
    const { rerender } = render(<Input endAdornment="USD" />);
    rerender(<Input />);
    const reads = offsetWidthReads.length;
    rerender(<Input placeholder="y" />);
    expect(observers.every((o) => o.disconnected)).toBe(true);
    expect(offsetWidthReads.length).toBe(reads);
  });
});

// =============================================================================================
// Accessibility
// =============================================================================================

describe('Input adds nothing to the accessible name or description', () => {
  function Field(props: Partial<InputProps>): React.ReactElement {
    return (
      <>
        <label htmlFor="amt">Amount</label>
        <Input id="amt" aria-describedby="help" {...props} />
        <p id="help">Helper text</p>
      </>
    );
  }

  it.each([
    ['no adornment', {}],
    ['end "USD"', { endAdornment: 'USD' }],
    ['decorative lock', { startAdornment: <svg aria-hidden="true" /> }],
  ] as const)('%s: name "Amount", description "Helper text"', (_l, props) => {
    render(<Field {...props} />);
    const input = screen.getByRole('textbox', { name: 'Amount' });
    expect(computeAccessibleName(input)).toBe('Amount');
    expect(computeAccessibleDescription(input)).toBe('Helper text');
  });

  it('aria and id attributes on the <input> are identical with and without adornments', () => {
    const plain = render(<Field />);
    const pick = (el: Element) =>
      Object.fromEntries(
        Object.entries(attrs(el)).filter(([k]) => k === 'id' || k.startsWith('aria-'))
      );
    const expected = pick(inputEl(plain.container));
    plain.unmount();
    render(<Field startAdornment="$" endAdornment="USD" />);
    expect(pick(inputEl())).toEqual(expected);
  });

  it('Input creates no ids', () => {
    render(<Field startAdornment="$" endAdornment="USD" />);
    const ids = Array.from(document.querySelectorAll('[id]')).map((e) => e.id);
    expect(ids.sort()).toEqual(['amt', 'help']);
  });

  it('the consumer recipe: an id on the adornment in aria-describedby is announced', () => {
    render(<Field aria-describedby="help sym" endAdornment={<span id="sym">USD</span>} />);
    const input = screen.getByRole('textbox', { name: 'Amount' });
    expect(computeAccessibleDescription(input)).toBe('Helper text USD');
  });
});
