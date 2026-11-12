/**
 * 005 SF-11 · Configurable WizardNavigation — interaction, lifecycle and statelessness (jsdom).
 *
 * `INV-N` is SF-11's series. jsdom is evidence for call counts, node identity and the
 * absence of kit focus moves; it is NOT evidence for INV-21 (focus never dropped to body),
 * which lives in `WizardNavigation.sf11.browser.test.tsx`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React, { useState, type MouseEvent } from 'react';

import { WizardLayout, type WizardStepConfig } from '../WizardLayout';
import { WizardNavigation, type WizardNavigationProps } from '../WizardNavigation';
import { BaselineWizardNavigation } from './WizardNavigation.sf11-baseline';

const noop = (): void => undefined;

function base(overrides: Partial<WizardNavigationProps> = {}): WizardNavigationProps {
  return { isFirstStep: false, isLastStep: false, onPrevious: noop, onNext: noop, ...overrides };
}

type Activation = {
  name: string;
  run: (el: HTMLButtonElement, user: ReturnType<typeof userEvent.setup>) => Promise<void>;
};

/** Every activation path INV-11 names. Keyboard paths focus the button first. */
const ACTIVATIONS: Activation[] = [
  { name: 'user.click', run: async (el, user) => user.click(el) },
  { name: 'user.dblClick', run: async (el, user) => user.dblClick(el) },
  {
    name: 'Enter',
    run: async (el, user) => {
      el.focus();
      await user.keyboard('{Enter}');
    },
  },
  {
    name: 'Space',
    run: async (el, user) => {
      el.focus();
      await user.keyboard(' ');
    },
  },
  {
    name: 'held Enter (auto-repeat ×3)',
    run: async (el, user) => {
      el.focus();
      await user.keyboard('{Enter>3/}');
    },
  },
  { name: 'fireEvent.click', run: async (el) => void fireEvent.click(el) },
  { name: 'button.click()', run: async (el) => el.click() },
];

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// INV-11: blocked buttons invoke nothing, by any activation path
// ---------------------------------------------------------------------------

describe('INV-11: blocked buttons invoke nothing', () => {
  for (const a of ACTIVATIONS) {
    it(`pending primary: ${a.name} → onNext called 0 times`, async () => {
      const user = userEvent.setup();
      const onNext = vi.fn();
      render(<WizardNavigation {...base({ onNext, primaryLoading: true })} />);
      await a.run(screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement, user);
      expect(onNext).toHaveBeenCalledTimes(0);
    });

    it(`disabled Back: ${a.name} → onPrevious called 0 times`, async () => {
      const user = userEvent.setup();
      const onPrevious = vi.fn();
      render(<WizardNavigation {...base({ onPrevious, previousDisabled: true })} />);
      await a.run(screen.getByRole('button', { name: 'Previous' }) as HTMLButtonElement, user);
      expect(onPrevious).toHaveBeenCalledTimes(0);
    });
  }

  it('control: the same activation paths DO call the handlers when not blocked (each path ≥ 1 call)', async () => {
    for (const a of ACTIVATIONS) {
      const user = userEvent.setup();
      const onNext = vi.fn();
      const onPrevious = vi.fn();
      const { unmount } = render(<WizardNavigation {...base({ onNext, onPrevious })} />);
      await a.run(screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement, user);
      await a.run(screen.getByRole('button', { name: 'Previous' }) as HTMLButtonElement, user);
      expect(onNext.mock.calls.length, a.name).toBeGreaterThanOrEqual(1);
      expect(onPrevious.mock.calls.length, a.name).toBeGreaterThanOrEqual(1);
      unmount();
    }
  });

  it('guard reads the props of the current render: unblocking by rerender makes the next click count', () => {
    const onNext = vi.fn();
    const { rerender } = render(<WizardNavigation {...base({ onNext, primaryLoading: true })} />);
    const primary = screen.getByRole('button', { name: 'Next' });
    fireEvent.click(primary);
    rerender(<WizardNavigation {...base({ onNext, primaryLoading: false })} />);
    fireEvent.click(primary);
    rerender(<WizardNavigation {...base({ onNext, primaryLoading: true })} />);
    fireEvent.click(primary);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  describe('through WizardLayout (conditional on decision 8)', () => {
    const steps: WizardStepConfig[] = [
      { id: 'a', title: 'A', component: <p>A</p> },
      { id: 'b', title: 'B', component: <p>B</p> },
      { id: 'c', title: 'C', component: <p>C</p> },
    ];

    for (const variant of ['horizontal', 'vertical'] as const) {
      it(`${variant}: pending primary calls none of onStepChange / onComplete / onLastStepPrimary; disabled Back no onStepChange`, async () => {
        const user = userEvent.setup();
        const onStepChange = vi.fn();
        const onComplete = vi.fn();
        const onLastStepPrimary = vi.fn();
        const props = {
          variant,
          steps,
          onStepChange,
          onComplete,
          onLastStepPrimary,
          primaryLoading: true,
          previousDisabled: true,
        };
        const { rerender } = render(<WizardLayout {...props} currentStepIndex={1} />);
        for (const a of ACTIVATIONS) {
          await a.run(screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement, user);
          await a.run(screen.getByRole('button', { name: 'Previous' }) as HTMLButtonElement, user);
        }
        rerender(<WizardLayout {...props} currentStepIndex={2} />);
        for (const a of ACTIVATIONS) {
          await a.run(screen.getByRole('button', { name: 'Finish' }) as HTMLButtonElement, user);
        }
        expect(onStepChange).not.toHaveBeenCalled();
        expect(onComplete).not.toHaveBeenCalled();
        expect(onLastStepPrimary).not.toHaveBeenCalled();
      });
    }

    it('control: unblocked, the same layout calls onStepChange(i+1), onStepChange(i-1) and onLastStepPrimary', async () => {
      const user = userEvent.setup();
      const onStepChange = vi.fn();
      const onLastStepPrimary = vi.fn();
      const { rerender } = render(
        <WizardLayout
          steps={steps}
          currentStepIndex={1}
          onStepChange={onStepChange}
          onLastStepPrimary={onLastStepPrimary}
        />
      );
      await user.click(screen.getByRole('button', { name: 'Next' }));
      await user.click(screen.getByRole('button', { name: 'Previous' }));
      expect(onStepChange.mock.calls).toEqual([[2], [0]]);
      rerender(
        <WizardLayout
          steps={steps}
          currentStepIndex={2}
          onStepChange={onStepChange}
          onLastStepPrimary={onLastStepPrimary}
        />
      );
      await user.click(screen.getByRole('button', { name: 'Finish' }));
      expect(onLastStepPrimary).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// INV-12: enabled activations call the handler once, with the click event
// ---------------------------------------------------------------------------

describe('INV-12: enabled activations call the handler once with the click event', () => {
  type Target = 'Previous' | 'Next' | 'Cancel' | 'Preview';
  const targets: Target[] = ['Previous', 'Next', 'Cancel', 'Preview'];
  const paths = ['pointer', 'Enter', 'Space'] as const;

  for (const name of targets)
    for (const path of paths) {
      it(`${name} via ${path}: one call, one argument, currentTarget is the button`, async () => {
        const user = userEvent.setup();
        const seen: Array<{ args: number; currentTarget: EventTarget | null; type: string }> = [];
        const spy = vi.fn((event: MouseEvent<HTMLButtonElement>) => {
          // Read synchronously: React clears currentTarget after dispatch.
          seen.push({
            args: spy.mock.calls.at(-1)?.length ?? -1,
            currentTarget: event.currentTarget,
            type: event.type,
          });
        });
        const isLast = name === 'Preview';
        render(
          <WizardNavigation
            isFirstStep={false}
            isLastStep={isLast}
            onPrevious={name === 'Previous' ? spy : noop}
            onNext={name === 'Next' ? spy : noop}
            onCancel={name === 'Cancel' ? spy : noop}
            lastStepSecondaryLabel="Preview"
            onLastStepSecondary={name === 'Preview' ? spy : noop}
          />
        );
        const button = screen.getByRole('button', { name });
        if (path === 'pointer') await user.click(button);
        else {
          button.focus();
          await user.keyboard(path === 'Enter' ? '{Enter}' : ' ');
        }
        expect(spy).toHaveBeenCalledTimes(1);
        expect(seen[0]?.args).toBe(1);
        expect(seen[0]?.currentTarget).toBe(button);
        expect(seen[0]?.type).toBe('click');
      });
    }

  it('zero-argument handlers keep working', async () => {
    const user = userEvent.setup();
    let called = 0;
    render(<WizardNavigation {...base({ onNext: () => void (called += 1) })} />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(called).toBe(1);
  });

  it('failure guard: canProceed=false still blocks the primary (native disabled), even with primaryLoading=false', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<WizardNavigation {...base({ onNext, canProceed: false })} />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onNext).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// INV-7 (activation part): blocked states are independent
// ---------------------------------------------------------------------------

describe('INV-7: each blocked state blocks only its own button', () => {
  for (const previousDisabled of [false, true])
    for (const primaryLoading of [false, true]) {
      it(`previousDisabled=${previousDisabled}, primaryLoading=${primaryLoading}`, async () => {
        const user = userEvent.setup();
        const onNext = vi.fn();
        const onPrevious = vi.fn();
        const onCancel = vi.fn();
        render(
          <WizardNavigation
            {...base({ onNext, onPrevious, onCancel, previousDisabled, primaryLoading })}
          />
        );
        await user.click(screen.getByRole('button', { name: 'Next' }));
        await user.click(screen.getByRole('button', { name: 'Previous' }));
        await user.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onNext).toHaveBeenCalledTimes(primaryLoading ? 0 : 1);
        expect(onPrevious).toHaveBeenCalledTimes(previousDisabled ? 0 : 1);
        expect(onCancel).toHaveBeenCalledTimes(1);
      });
    }

  it('secondary stays usable while the primary is pending and Back is disabled', async () => {
    const user = userEvent.setup();
    const onLastStepSecondary = vi.fn();
    render(
      <WizardNavigation
        {...base({
          isLastStep: true,
          primaryLoading: true,
          previousDisabled: true,
          lastStepSecondaryLabel: 'Preview',
          onLastStepSecondary,
        })}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(onLastStepSecondary).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// INV-13: blocked activations are dropped, not queued
// ---------------------------------------------------------------------------

describe('INV-13: blocked activations are dropped, not queued', () => {
  it('primary: 3 blocked activations, unblock → 0 calls; one real activation → exactly 1', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    const { rerender } = render(<WizardNavigation {...base({ onNext, primaryLoading: true })} />);
    const primary = screen.getByRole('button', { name: 'Next' });
    await user.click(primary);
    primary.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    rerender(<WizardNavigation {...base({ onNext, primaryLoading: false })} />);
    expect(onNext).toHaveBeenCalledTimes(0);
    await user.click(primary);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('Back: same drop semantics for previousDisabled', async () => {
    const user = userEvent.setup();
    const onPrevious = vi.fn();
    const { rerender } = render(
      <WizardNavigation {...base({ onPrevious, previousDisabled: true })} />
    );
    const back = screen.getByRole('button', { name: 'Previous' });
    await user.click(back);
    await user.dblClick(back);
    rerender(<WizardNavigation {...base({ onPrevious })} />);
    expect(onPrevious).toHaveBeenCalledTimes(0);
    await user.click(back);
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// INV-14: one handler call per pending cycle under rapid activation
// ---------------------------------------------------------------------------

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve: () => void = noop;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** Integrator pattern from the JSDoc: set pending synchronously, then await. */
function PendingHarness({
  onSave,
  wait,
}: {
  onSave: () => void;
  wait: () => Promise<void>;
}): React.ReactElement {
  const [saving, setSaving] = useState(false);
  return (
    <WizardNavigation
      isFirstStep={false}
      isLastStep={false}
      onPrevious={noop}
      onNext={async () => {
        onSave();
        setSaving(true);
        await wait();
        setSaving(false);
      }}
      previousDisabled={saving}
      primaryLoading={saving}
    />
  );
}

describe('INV-14: one onNext per pending cycle under rapid activation', () => {
  const bursts: Array<{
    name: string;
    run: (el: HTMLElement, user: ReturnType<typeof userEvent.setup>) => Promise<void>;
  }> = [
    { name: 'double-click', run: async (el, user) => user.dblClick(el) },
    {
      name: 'two consecutive clicks',
      run: async (el, user) => {
        await user.click(el);
        await user.click(el);
      },
    },
    {
      name: 'held Enter (repeat ×3)',
      run: async (el, user) => {
        el.focus();
        await user.keyboard('{Enter>3/}');
      },
    },
    {
      name: 'Enter then click',
      run: async (el, user) => {
        el.focus();
        await user.keyboard('{Enter}');
        await user.click(el);
      },
    },
    {
      name: 'two fireEvent.click in separate act() batches',
      run: async (el) => {
        act(() => void fireEvent.click(el));
        act(() => void fireEvent.click(el));
      },
    },
  ];

  for (const b of bursts) {
    it(`${b.name} → exactly one save; after settle the next activation starts cycle 2`, async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const pending = [deferred(), deferred()];
      let cycle = 0;
      render(<PendingHarness onSave={onSave} wait={() => pending[cycle++]!.promise} />);
      const primary = screen.getByRole('button', { name: 'Next' });
      await b.run(primary, user);
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(primary.getAttribute('aria-busy')).toBe('true');
      await act(async () => pending[0]!.resolve());
      expect(primary.hasAttribute('aria-busy')).toBe(false);
      await b.run(primary, user);
      expect(onSave).toHaveBeenCalledTimes(2);
      await act(async () => pending[1]!.resolve());
    });
  }
});

// ---------------------------------------------------------------------------
// INV-15 (behaviour part): nav buttons never take part in form submission
// ---------------------------------------------------------------------------

describe('INV-15: nav buttons never submit or get implicitly activated by a form', () => {
  function FormHost({
    onSubmit,
    onNext,
    onPrevious,
    onCancel,
    primaryLoading,
  }: {
    onSubmit: () => void;
    onNext: () => void;
    onPrevious: () => void;
    onCancel: () => void;
    primaryLoading?: boolean;
  }): React.ReactElement {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        {/* Two text fields: no implicit submission without a submit button, so a submit
            here could only come from a nav button acting as the form's default button. */}
        <label>
          First
          <input name="a" />
        </label>
        <label>
          Second
          <input name="b" />
        </label>
        <WizardNavigation
          isFirstStep={false}
          isLastStep
          onNext={onNext}
          onPrevious={onPrevious}
          onCancel={onCancel}
          lastStepSecondaryLabel="Preview"
          onLastStepSecondary={noop}
          primaryLoading={primaryLoading}
        />
      </form>
    );
  }

  for (const primaryLoading of [false, true]) {
    it(`primaryLoading=${primaryLoading}: Enter in a field and clicks on every nav button never submit the form`, async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onNext = vi.fn();
      const onPrevious = vi.fn();
      const onCancel = vi.fn();
      render(
        <FormHost
          onSubmit={onSubmit}
          onNext={onNext}
          onPrevious={onPrevious}
          onCancel={onCancel}
          primaryLoading={primaryLoading}
        />
      );
      await user.type(screen.getByLabelText('First'), 'x{Enter}');
      expect(onSubmit).not.toHaveBeenCalled();
      expect(onNext).not.toHaveBeenCalled();
      expect(onPrevious).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
      for (const name of ['Cancel', 'Previous', 'Preview', 'Finish']) {
        await user.click(screen.getByRole('button', { name }));
      }
      expect(onSubmit).not.toHaveBeenCalled();
      expect(onNext).toHaveBeenCalledTimes(primaryLoading ? 0 : 1);
    });
  }

  it('control: the same form with a plain <button> (implicit type=submit) DOES submit on Enter (test is sensitive)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <input aria-label="First" />
        <input aria-label="Second" />
        <button>Plain</button>
      </form>
    );
    await user.type(screen.getByLabelText('First'), 'x{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// INV-17: the primary (and Back) is one stable DOM node
// ---------------------------------------------------------------------------

describe('INV-17: primary and Back are stable DOM nodes', () => {
  it('primary survives toggles of primaryLoading, previousDisabled, canProceed, primaryIcon, previousLabel, nextLabel', () => {
    const { rerender, container } = render(<WizardNavigation {...base()} />);
    const primary = screen.getByRole('button', { name: 'Next' });
    const back = screen.getByRole('button', { name: 'Previous' });
    const sequence: Array<Partial<WizardNavigationProps>> = [
      { primaryLoading: true },
      { primaryLoading: true, previousDisabled: true },
      { canProceed: false },
      { primaryIcon: <svg data-testid="i" /> },
      { primaryIcon: null },
      { previousLabel: 'Back' },
      { previousLabel: 'Back', previousDisabled: true },
      { nextLabel: 'Save & continue', primaryLoading: true },
      {},
    ];
    for (const s of sequence) {
      rerender(<WizardNavigation {...base(s)} />);
      const buttons = container.querySelectorAll('button');
      expect(buttons[buttons.length - 1], JSON.stringify(Object.keys(s))).toBe(primary);
      expect(buttons[0]).toBe(back);
    }
  });

  it('primary survives isLastStep and lastStepLabel changes on WizardNavigation directly', () => {
    const { rerender } = render(<WizardNavigation {...base()} />);
    const primary = screen.getByRole('button', { name: 'Next' });
    rerender(<WizardNavigation {...base({ isLastStep: true, lastStepLabel: 'Deploy' })} />);
    expect(screen.getByRole('button', { name: 'Deploy' })).toBe(primary);
    rerender(<WizardNavigation {...base({ isLastStep: true, primaryLoading: true })} />);
    expect(screen.getByRole('button', { name: 'Finish' })).toBe(primary);
  });

  it('through WizardLayout: step 0 → 1 → last → 1 keeps the same primary node (Back mounts, secondary appears)', () => {
    const steps: WizardStepConfig[] = [
      { id: 'a', title: 'A', component: <p>A</p> },
      { id: 'b', title: 'B', component: <p>B</p> },
      { id: 'c', title: 'C', component: <p>C</p> },
    ];
    const props = {
      steps,
      onStepChange: noop,
      lastStepSecondaryLabel: 'Preview',
      onLastStepSecondary: noop,
    };
    const { rerender } = render(<WizardLayout {...props} currentStepIndex={0} />);
    const primary = screen.getByRole('button', { name: 'Next' });
    rerender(<WizardLayout {...props} currentStepIndex={1} primaryLoading />);
    expect(screen.getByRole('button', { name: 'Next' })).toBe(primary);
    rerender(<WizardLayout {...props} currentStepIndex={2} />);
    expect(screen.getByRole('button', { name: 'Finish' })).toBe(primary);
    expect(screen.getByRole('button', { name: 'Preview' })).toBeTruthy();
    rerender(<WizardLayout {...props} currentStepIndex={1} />);
    expect(screen.getByRole('button', { name: 'Next' })).toBe(primary);
  });
});

// ---------------------------------------------------------------------------
// INV-10 / INV-18: stateless, fire-and-forget, no new runtime resources
// ---------------------------------------------------------------------------

describe('INV-10: the kit stays stateless and controlled', () => {
  it('a never-settling handler leaves the primary idle until primaryLoading is set by the integrator', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <WizardNavigation {...base({ onNext: () => new Promise<void>(noop) })} />
    );
    const primary = screen.getByRole('button', { name: 'Next' });
    const before = primary.outerHTML;
    await user.click(primary);
    expect(primary.outerHTML).toBe(before);
    expect(primary.hasAttribute('aria-busy')).toBe(false);
    rerender(<WizardNavigation {...base({ primaryLoading: true })} />);
    expect(primary.getAttribute('aria-busy')).toBe('true');
  });

  it('never awaits, chains or catches the returned value (a thenable handler result is untouched)', async () => {
    const user = userEvent.setup();
    const then = vi.fn();
    const thenable = { then };
    const { container } = render(<WizardNavigation {...base({ onNext: () => thenable })} />);
    const before = container.innerHTML;
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await act(async () => undefined);
    expect(then).not.toHaveBeenCalled();
    expect(container.innerHTML).toBe(before);
  });

  it('a synchronous throw propagates exactly as it did before SF-11 (not swallowed)', () => {
    const errors: unknown[] = [];
    const onError = (e: ErrorEvent): void => {
      errors.push(e.error);
      e.preventDefault();
    };
    window.addEventListener('error', onError);
    vi.spyOn(console, 'error').mockImplementation(noop);
    const boom = (): never => {
      throw new Error('save failed synchronously');
    };
    try {
      const current = render(<WizardNavigation {...base({ onNext: boom })} />);
      fireEvent.click(current.getByRole('button', { name: 'Next' }));
      current.unmount();
      const currentErrors = errors.splice(0);
      const old = render(
        <BaselineWizardNavigation
          isFirstStep={false}
          isLastStep={false}
          onPrevious={noop}
          onNext={boom}
        />
      );
      fireEvent.click(old.getByRole('button', { name: 'Next' }));
      old.unmount();
      expect(currentErrors.map((e) => (e as Error).message)).toEqual(
        errors.map((e) => (e as Error).message)
      );
      expect(currentErrors.map((e) => (e as Error).message)).toEqual(['save failed synchronously']);
    } finally {
      window.removeEventListener('error', onError);
    }
  });

  it('source has no hooks, refs, effects or focus/blur calls (INV-10 / INV-18 / INV-22 grep)', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/components/ui/wizard/WizardNavigation.tsx'),
      'utf8'
    );
    expect(src).not.toMatch(
      /\buse(State|Effect|LayoutEffect|Ref|Reducer|Memo|Callback|ImperativeHandle)\b/
    );
    expect(src).not.toMatch(/\.(focus|blur)\(/);
    expect(src).not.toMatch(/\b(setTimeout|setInterval|addEventListener|requestAnimationFrame)\b/);
  });
});

describe('INV-18: no new runtime resources', () => {
  it('100 mount/unmount cycles in pending state produce no React warnings or errors', () => {
    const error = vi.spyOn(console, 'error');
    const warn = vi.spyOn(console, 'warn');
    for (let i = 0; i < 100; i += 1) {
      const { unmount } = render(
        <WizardNavigation
          {...base({ primaryLoading: true, previousDisabled: true, onCancel: noop })}
        />
      );
      unmount();
    }
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('no timers are scheduled by a pending render (fake-timer count stays 0)', () => {
    vi.useFakeTimers();
    try {
      const { rerender, unmount } = render(<WizardNavigation {...base()} />);
      rerender(<WizardNavigation {...base({ primaryLoading: true })} />);
      rerender(<WizardNavigation {...base()} />);
      expect(vi.getTimerCount()).toBe(0);
      unmount();
    } finally {
      vi.useRealTimers();
    }
  });
});

// ---------------------------------------------------------------------------
// INV-22: the kit never moves focus; the trigger stays restorable
// ---------------------------------------------------------------------------

describe('INV-22: kit never moves focus; trigger stays restorable', () => {
  it('focus in a step-body input stays there through pending, Back-disabled and the advance (WizardLayout)', () => {
    const steps: WizardStepConfig[] = [
      { id: 'a', title: 'A', component: <p>A</p> },
      { id: 'b', title: 'B', component: <p>B</p> },
      { id: 'c', title: 'C', component: <p>C</p> },
    ];
    const header = <input aria-label="Outside field" />;
    const { rerender } = render(
      <WizardLayout steps={steps} currentStepIndex={1} onStepChange={noop} header={header} />
    );
    const field = screen.getByLabelText('Outside field');
    field.focus();
    rerender(
      <WizardLayout
        steps={steps}
        currentStepIndex={1}
        onStepChange={noop}
        header={header}
        primaryLoading
        previousDisabled
      />
    );
    expect(document.activeElement).toBe(field);
    rerender(
      <WizardLayout steps={steps} currentStepIndex={2} onStepChange={noop} header={header} />
    );
    expect(document.activeElement).toBe(field);
  });

  it('currentTarget captured in onNext is still connected after the pending cycle and focus() makes it active', async () => {
    const user = userEvent.setup();
    const captured: { trigger: HTMLButtonElement | null } = { trigger: null };
    const gate = deferred();
    function Harness(): React.ReactElement {
      const [saving, setSaving] = useState(false);
      return (
        <>
          <input aria-label="Elsewhere" />
          <WizardNavigation
            isFirstStep={false}
            isLastStep={false}
            onPrevious={noop}
            primaryLoading={saving}
            onNext={async (event) => {
              captured.trigger = event.currentTarget;
              setSaving(true);
              await gate.promise;
              setSaving(false);
            }}
          />
        </>
      );
    }
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    screen.getByLabelText('Elsewhere').focus();
    await act(async () => gate.resolve());
    const t = captured.trigger;
    if (t === null) throw new Error('onNext did not capture currentTarget');
    expect(t.isConnected).toBe(true);
    expect(document.activeElement).toBe(screen.getByLabelText('Elsewhere'));
    t.focus();
    expect(document.activeElement).toBe(t);
    expect(t).toBe(screen.getByRole('button', { name: 'Next' }));
  });
});
