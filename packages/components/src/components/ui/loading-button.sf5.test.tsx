/**
 * 006 SF-5 · LoadingButton keeps focus while loading — jsdom contract tests.
 *
 * INV-1 to INV-5, INV-7, INV-8, INV-11, INV-12 and INV-14 (type surface). jsdom has no
 * implicit form submission and does not move focus off a disabled button, so the
 * activation matrix (INV-6) and focus continuity (INV-9) run in Chromium in
 * `loading-button.sf5.browser.test.tsx`. Only the mouse-click and `.click()` rows of INV-6
 * are repeated here as a fast check.
 *
 * jest-dom is not installed in this package; `toBeDisabled()` would ignore `aria-disabled`
 * anyway (INV-12), so every check reads the attribute or the DOM property directly.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import type { VariantProps } from 'class-variance-authority';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import * as React from 'react';

import * as pkg from '../../index';
import { buttonVariants } from '../../utils/button-variants';
import { LoadingButton, type LoadingButtonProps } from './loading-button';
import { BaselineLoadingButton } from './loading-button.sf5-baseline';

const VARIANTS = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const;
const SIZES = ['default', 'sm', 'lg', 'icon'] as const;

function attributeMap(el: Element): Record<string, string> {
  return Object.fromEntries(
    Array.from(el.attributes)
      .map((a) => [a.name, a.value] as const)
      .sort(([a], [b]) => a.localeCompare(b))
  );
}

function classesOf(el: Element): string[] {
  return (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
}

/** Renders a single element and returns it (the button, or the `asChild` child). */
function renderOne(ui: React.ReactElement): HTMLElement {
  const { container } = render(ui);
  const el = container.firstElementChild;
  if (!(el instanceof HTMLElement)) throw new Error('nothing rendered');
  return el;
}

describe('SF-5 INV-1: loading renders the accessible-disabled state, not native disabled', () => {
  for (const variant of VARIANTS) {
    for (const size of SIZES) {
      it(`variant=${variant} size=${size}`, () => {
        const idle = renderOne(
          <LoadingButton variant={variant} size={size}>
            Save
          </LoadingButton>
        );
        const idleClasses = classesOf(idle);

        const btn = renderOne(
          <LoadingButton variant={variant} size={size} loading>
            Save
          </LoadingButton>
        ) as HTMLButtonElement;

        expect(btn.tagName).toBe('BUTTON');
        expect(btn.disabled).toBe(false);
        expect(btn.hasAttribute('disabled')).toBe(false);
        expect(btn.getAttribute('aria-disabled')).toBe('true');
        expect(btn.getAttribute('aria-busy')).toBe('true');
        // Same class string as idle, plus opacity-50 at the end.
        expect(classesOf(btn)).toEqual([...idleClasses, 'opacity-50']);

        // Spinner first, decorative, today's classes; children after it.
        const first = btn.firstElementChild;
        expect(first?.tagName.toLowerCase()).toBe('svg');
        const spinnerClasses = classesOf(first as Element);
        for (const c of ['mr-2', 'h-4', 'w-4', 'animate-spin']) expect(spinnerClasses).toContain(c);
        expect(first?.getAttribute('aria-hidden')).toBe('true');
        expect(btn.querySelector('[role="status"]')).toBeNull();
        expect(btn.textContent).toBe('Save');
      });
    }
  }

  it('opacity-50 is merged after the consumer className', () => {
    const btn = renderOne(
      <LoadingButton loading className="w-full">
        Save
      </LoadingButton>
    );
    const classes = classesOf(btn);
    expect(classes.indexOf('opacity-50')).toBe(classes.length - 1);
    expect(classes.indexOf('w-full')).toBeLessThan(classes.indexOf('opacity-50'));
  });

  it('under asChild, aria-disabled, aria-busy and the dim reach the child element', () => {
    const a = renderOne(
      <LoadingButton asChild loading>
        <a href="#sf5">Open</a>
      </LoadingButton>
    );
    expect(a.tagName).toBe('A');
    expect(a.getAttribute('aria-disabled')).toBe('true');
    expect(a.getAttribute('aria-busy')).toBe('true');
    expect(classesOf(a)).toContain('opacity-50');
    expect(a.hasAttribute('disabled')).toBe(false);
    expect(a.querySelector('svg.animate-spin')).not.toBeNull();
  });
});

describe('SF-5 INV-2: idle render is unchanged from 005', () => {
  type Case = { name: string; props: LoadingButtonProps; children: React.ReactNode };
  const cases: Case[] = [
    ...VARIANTS.map((variant) => ({
      name: `variant=${variant}`,
      props: { variant },
      children: 'Go',
    })),
    ...SIZES.map((size) => ({ name: `size=${size}`, props: { size }, children: 'Go' })),
    { name: 'no props', props: {}, children: 'Go' },
    { name: 'loading={false}', props: { loading: false }, children: 'Go' },
    { name: 'consumer aria-disabled', props: { 'aria-disabled': true }, children: 'Go' },
    { name: 'consumer aria-busy', props: { 'aria-busy': true }, children: 'Go' },
    { name: 'consumer className', props: { className: 'w-full opacity-75' }, children: 'Go' },
    { name: 'type=submit', props: { type: 'submit' }, children: 'Go' },
    {
      name: 'consumer-disabled with other attributes',
      props: { disabled: true, type: 'submit', id: 'x', title: 't' },
      children: 'Go',
    },
    {
      name: 'element children',
      props: {},
      children: (
        <>
          <span>icon</span>Send
        </>
      ),
    },
  ];

  for (const { name, props, children } of cases) {
    it(name, () => {
      const now = renderOne(<LoadingButton {...props}>{children}</LoadingButton>);
      const before = renderOne(
        <BaselineLoadingButton {...props}>{children}</BaselineLoadingButton>
      );
      expect(now.tagName).toBe(before.tagName);
      expect(attributeMap(now)).toEqual(attributeMap(before));
      expect(now.getAttribute('class')).toBe(before.getAttribute('class'));
      expect(now.innerHTML).toBe(before.innerHTML);
    });
  }

  it('asChild with an <a>', () => {
    const now = renderOne(
      <LoadingButton asChild variant="link">
        <a href="#sf5">Open</a>
      </LoadingButton>
    );
    const before = renderOne(
      <BaselineLoadingButton asChild variant="link">
        <a href="#sf5">Open</a>
      </BaselineLoadingButton>
    );
    expect(now.tagName).toBe('A');
    expect(attributeMap(now)).toEqual(attributeMap(before));
    expect(now.innerHTML).toBe(before.innerHTML);
  });

  it('idle with no consumer ARIA renders neither attribute and no dim', () => {
    const btn = renderOne(<LoadingButton>Go</LoadingButton>);
    expect(btn.hasAttribute('aria-disabled')).toBe(false);
    expect(btn.hasAttribute('aria-busy')).toBe(false);
    expect(classesOf(btn)).not.toContain('opacity-50');
  });

  it('sensitivity: the comparison does see a loading difference', () => {
    const now = renderOne(<LoadingButton loading>Go</LoadingButton>);
    const before = renderOne(<BaselineLoadingButton loading>Go</BaselineLoadingButton>);
    expect(attributeMap(now)).not.toEqual(attributeMap(before));
  });
});

describe('SF-5 INV-3: consumer disabled stays native, with or without loading', () => {
  it('disabled, idle: natively disabled, no aria-busy, no spinner', () => {
    const btn = renderOne(<LoadingButton disabled>Go</LoadingButton>) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.hasAttribute('aria-busy')).toBe(false);
    expect(btn.hasAttribute('aria-disabled')).toBe(false);
    expect(btn.querySelector('svg')).toBeNull();
  });

  it('disabled and loading: natively disabled plus everything loading adds', () => {
    const btn = renderOne(
      <LoadingButton disabled loading>
        Go
      </LoadingButton>
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect(classesOf(btn)).toContain('opacity-50');
    expect(btn.querySelector('svg.animate-spin')).not.toBeNull();
  });

  it('disabled={false} with loading is not natively disabled', () => {
    const btn = renderOne(
      <LoadingButton disabled={false} loading>
        Go
      </LoadingButton>
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});

describe('SF-5 INV-4: no consumer prop can switch off the loading state', () => {
  it('loading wins over aria-disabled={false}, aria-busy={false}, opacity-100 and onClick', () => {
    const onClick = vi.fn();
    const btn = renderOne(
      <LoadingButton
        loading
        aria-disabled={false}
        aria-busy={false}
        className="opacity-100"
        onClick={onClick}
      >
        Go
      </LoadingButton>
    );
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect(classesOf(btn)).toContain('opacity-50');
    expect(classesOf(btn)).not.toContain('opacity-100');
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('idle with the same props uses the consumer values as given', () => {
    const onClick = vi.fn();
    const btn = renderOne(
      <LoadingButton
        aria-disabled={false}
        aria-busy={false}
        className="opacity-100"
        onClick={onClick}
      >
        Go
      </LoadingButton>
    );
    expect(btn.getAttribute('aria-disabled')).toBe('false');
    expect(btn.getAttribute('aria-busy')).toBe('false');
    expect(classesOf(btn)).toContain('opacity-100');
    expect(classesOf(btn)).not.toContain('opacity-50');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('SF-5 INV-5: the guard reads the current loading; no component state', () => {
  it('rerendering false → true → false gates the same onClick: 1, 1, 2', () => {
    const onClick = vi.fn();
    const { rerender } = render(<LoadingButton onClick={onClick}>Go</LoadingButton>);
    const btn = screen.getByRole('button', { name: 'Go' });
    btn.click();
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <LoadingButton loading onClick={onClick}>
        Go
      </LoadingButton>
    );
    btn.click();
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(<LoadingButton onClick={onClick}>Go</LoadingButton>);
    btn.click();
    expect(onClick).toHaveBeenCalledTimes(2);
    // Same node throughout.
    expect(screen.getByRole('button', { name: 'Go' })).toBe(btn);
  });

  it('loading defaults to false', () => {
    const onClick = vi.fn();
    const btn = renderOne(<LoadingButton onClick={onClick}>Go</LoadingButton>);
    btn.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('forwards the ref to the <button>, and to the child under asChild', () => {
    const buttonRef = React.createRef<HTMLButtonElement>();
    const btn = renderOne(
      <LoadingButton ref={buttonRef} loading>
        Go
      </LoadingButton>
    );
    expect(buttonRef.current).toBe(btn);

    const seen: Array<HTMLElement | null> = [];
    const a = renderOne(
      <LoadingButton asChild loading ref={(node) => void seen.push(node)}>
        <a href="#sf5">Open</a>
      </LoadingButton>
    );
    expect(seen[0]).toBe(a);
  });
});

describe('SF-5 INV-6 (fast jsdom rows): loading blocks onClick and the default action', () => {
  it('mouse click and .click() call no onClick and are defaultPrevented, every time', () => {
    const onClick = vi.fn();
    const seen: boolean[] = [];
    const btn = renderOne(
      <LoadingButton loading onClick={onClick}>
        Go
      </LoadingButton>
    );
    // Listen on the document so the check runs after React's root listener.
    const record = (e: Event): void => void seen.push(e.defaultPrevented);
    document.addEventListener('click', record);
    try {
      fireEvent.click(btn);
      btn.click();
      btn.click();
    } finally {
      document.removeEventListener('click', record);
    }
    expect(onClick).not.toHaveBeenCalled();
    expect(seen).toEqual([true, true, true]);
  });
});

describe('SF-5 INV-7: idle activation behaves as in 005', () => {
  it('calls onClick once with the original event and does not prevent it', () => {
    const events: Array<{ type: string; currentTarget: EventTarget; native: Event }> = [];
    const prevented: boolean[] = [];
    const btn = renderOne(
      <LoadingButton
        onClick={(e) =>
          void events.push({ type: e.type, currentTarget: e.currentTarget, native: e.nativeEvent })
        }
      >
        Go
      </LoadingButton>
    );
    let dispatched: Event | undefined;
    btn.addEventListener('click', (e) => (dispatched = e), { once: true });
    const record = (e: Event): void => void prevented.push(e.defaultPrevented);
    document.addEventListener('click', record);
    try {
      btn.click();
    } finally {
      document.removeEventListener('click', record);
    }
    expect(events).toHaveLength(1);
    expect(events[0].currentTarget).toBe(btn);
    expect(events[0].type).toBe('click');
    expect(events[0].native).toBe(dispatched);
    expect(prevented).toEqual([false]);
  });

  it("a consumer handler's own preventDefault still applies when idle", () => {
    const prevented: boolean[] = [];
    const btn = renderOne(<LoadingButton onClick={(e) => e.preventDefault()}>Go</LoadingButton>);
    const record = (e: Event): void => void prevented.push(e.defaultPrevented);
    document.addEventListener('click', record);
    try {
      btn.click();
    } finally {
      document.removeEventListener('click', record);
    }
    expect(prevented).toEqual([true]);
  });
});

describe('SF-5 INV-8: the guard blocks only onClick and the default action', () => {
  it('the click still reaches a React ancestor and a native ancestor listener, prevented', () => {
    const reactAncestor = vi.fn((e: React.MouseEvent) => e.defaultPrevented);
    const nativeSeen: boolean[] = [];
    render(
      <div onClick={reactAncestor} data-testid="row">
        <LoadingButton loading>Go</LoadingButton>
      </div>
    );
    const row = screen.getByTestId('row');
    const documentSeen: boolean[] = [];
    // A native listener on `row` runs before React's root listener, so it sees the click
    // but not yet the prevent. A document listener runs after React and sees both.
    const native = (): void => void nativeSeen.push(true);
    const onDocument = (e: Event): void => void documentSeen.push(e.defaultPrevented);
    row.addEventListener('click', native);
    document.addEventListener('click', onDocument);
    try {
      screen.getByRole('button', { name: 'Go' }).click();
    } finally {
      row.removeEventListener('click', native);
      document.removeEventListener('click', onDocument);
    }
    expect(reactAncestor).toHaveBeenCalledTimes(1);
    expect(reactAncestor.mock.results[0].value).toBe(true);
    expect(nativeSeen).toHaveLength(1);
    expect(documentSeen).toEqual([true]);
  });

  it('onKeyDown, onKeyUp, onMouseDown, onPointerDown, onFocus and onBlur still run while loading', () => {
    const handlers = {
      onKeyDown: vi.fn(),
      onKeyUp: vi.fn(),
      onMouseDown: vi.fn(),
      onPointerDown: vi.fn(),
      onFocus: vi.fn(),
      onBlur: vi.fn(),
    };
    const btn = renderOne(
      <LoadingButton loading {...handlers}>
        Go
      </LoadingButton>
    );
    fireEvent.keyDown(btn, { key: 'Enter' });
    fireEvent.keyUp(btn, { key: 'Enter' });
    fireEvent.mouseDown(btn);
    fireEvent.pointerDown(btn);
    fireEvent.focus(btn);
    fireEvent.blur(btn);
    for (const [name, fn] of Object.entries(handlers)) {
      expect(fn, name).toHaveBeenCalledTimes(1);
    }
  });

  it('under asChild, the child handler runs and the guard still cancels the default', () => {
    const childSpy = vi.fn();
    const onClick = vi.fn();
    const prevented: boolean[] = [];
    const a = renderOne(
      <LoadingButton asChild loading onClick={onClick}>
        <a href="#sf5" onClick={childSpy}>
          Open
        </a>
      </LoadingButton>
    );
    const record = (e: Event): void => void prevented.push(e.defaultPrevented);
    document.addEventListener('click', record);
    try {
      a.click();
    } finally {
      document.removeEventListener('click', record);
    }
    expect(childSpy).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
    expect(prevented).toEqual([true]);
  });
});

describe('SF-5 INV-11 and INV-5: no new runtime machinery in loading-button.tsx', () => {
  const raw = readFileSync(path.join(__dirname, 'loading-button.tsx'), 'utf-8');
  // Comments explain what the guard leaves out (stopPropagation, pointer-events-none), so
  // match against the code only.
  const source = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('calls no React hook', () => {
    expect(source).not.toMatch(
      /\b(?:React\.)?use(?:State|Ref|Effect|LayoutEffect|Memo|Callback|Reducer|Context)\s*\(/
    );
  });

  it('imports only what 005 imported', () => {
    const imports = Array.from(raw.matchAll(/^import .* from '([^']+)';$/gm)).map((m) => m[1]);
    expect(imports.sort()).toEqual(
      [
        '@radix-ui/react-slot',
        'class-variance-authority',
        'react',
        '@openzeppelin/ui-utils',
        '../../utils/button-variants',
        './spinner',
      ].sort()
    );
  });

  it('adds no listener, timer or stopPropagation', () => {
    expect(source).not.toMatch(/addEventListener|setTimeout|setInterval|stopPropagation/);
    expect(source).not.toMatch(/pointer-events-none/);
  });
});

describe('SF-5 INV-12: assistive tech sees a disabled, busy button with the same name', () => {
  it('same role and name idle and loading; no status; still in the Tab order', () => {
    const { rerender } = render(<LoadingButton>Send Tokens</LoadingButton>);
    const idle = screen.getByRole('button', { name: 'Send Tokens' });
    rerender(<LoadingButton loading>Send Tokens</LoadingButton>);
    const loading = screen.getByRole('button', { name: 'Send Tokens' });
    expect(loading).toBe(idle);
    expect(loading.getAttribute('aria-disabled')).toBe('true');
    expect(loading.getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(loading.querySelector('[aria-live]')).toBeNull();
    expect(loading.hasAttribute('tabindex')).toBe(false);
    expect(loading.hasAttribute('inert')).toBe(false);
    expect(loading.hasAttribute('hidden')).toBe(false);
    expect(loading.tabIndex).toBe(0);
  });
});

describe('SF-5 INV-14: public surface unchanged', () => {
  it('LoadingButtonProps adds only asChild and loading to the button and variant props', () => {
    type Own = Exclude<
      keyof LoadingButtonProps,
      | keyof React.ButtonHTMLAttributes<HTMLButtonElement>
      | keyof VariantProps<typeof buttonVariants>
    >;
    expectTypeOf<Own>().toEqualTypeOf<'asChild' | 'loading'>();
    expectTypeOf<LoadingButtonProps['loading']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<LoadingButtonProps['asChild']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<LoadingButtonProps['disabled']>().toEqualTypeOf<boolean | undefined>();
  });

  it('is exported from the package entry as the same component', () => {
    expect(pkg.LoadingButton).toBe(LoadingButton);
  });
});
