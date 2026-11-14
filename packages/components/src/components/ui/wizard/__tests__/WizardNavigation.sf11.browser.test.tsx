/**
 * 005 SF-11 · Configurable WizardNavigation — Chromium proof.
 *
 * Covers what jsdom cannot: focus never dropped to <body> (INV-21), the amended INV-5 (blocked look is
 * opacity only; a real click on a pending primary lands on it and keeps focus), real-event bursts
 * (INV-14), the kit never moving focus (INV-22), and axe + real Tab order (INV-23).
 */
import { act, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import React, { useState } from 'react';

import { WizardLayout, type WizardStepConfig } from '../WizardLayout';
import { WizardNavigation } from '../WizardNavigation';

/** The browser config does not load the kit stylesheet; inject the utilities this suite depends on. */
function injectStyles(): void {
  if (document.getElementById('sf11-005-styles')) return;
  const style = document.createElement('style');
  style.id = 'sf11-005-styles';
  // `pointer-events-none` is defined so that a regression re-adding it would actually bite here.
  style.textContent = `
    .opacity-50 { opacity: 0.5; }
    .pointer-events-none { pointer-events: none; }
    .disabled\\:pointer-events-none:disabled { pointer-events: none; }
    .disabled\\:opacity-50:disabled { opacity: 0.5; }
    .flex { display: flex; }
    .gap-2 { gap: 8px; }
    button { min-width: 80px; min-height: 32px; }
  `;
  document.head.appendChild(style);
}

const noop = (): void => undefined;

function activeIsBody(): boolean {
  return document.activeElement === document.body || document.activeElement === null;
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve: () => void = noop;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const STEPS: WizardStepConfig[] = [
  { id: 'a', title: 'Alpha', component: <p>Alpha body</p> },
  { id: 'b', title: 'Beta', component: <p>Beta body</p> },
  { id: 'c', title: 'Gamma', component: <p>Gamma body</p> },
];

/** Integrator pattern A from the design: WizardLayout + sync pending before await. */
function SaveWizard({
  gates,
  onSave,
}: {
  gates: Array<{ promise: Promise<void> }>;
  onSave: () => void;
}): React.ReactElement {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const cycle = React.useRef(0);
  const save = async (next: number | null): Promise<void> => {
    onSave();
    setSaving(true);
    await gates[cycle.current++]?.promise;
    setSaving(false);
    if (next !== null) setStep(next);
  };
  return (
    <div style={{ height: 400 }}>
      <WizardLayout
        steps={STEPS}
        currentStepIndex={step}
        onStepChange={(next) => void save(next)}
        onLastStepPrimary={() => void save(null)}
        previousLabel="Back"
        previousDisabled={saving}
        primaryLoading={saving}
      />
    </div>
  );
}

describe('INV-21: focus never drops to <body> (Chromium)', () => {
  it('primary keeps focus through pending and two step advances (WizardLayout, real clicks)', async () => {
    injectStyles();
    const gates = [deferred(), deferred()];
    const onSave = vi.fn();
    render(<SaveWizard gates={gates} onSave={onSave} />);
    const primary = screen.getByRole('button', { name: 'Next' });

    await userEvent.click(primary);
    expect(primary.getAttribute('aria-busy')).toBe('true');
    expect(document.activeElement).toBe(primary);
    await act(async () => gates[0]!.resolve());
    expect(screen.getByText('Beta body')).toBeTruthy();
    expect(document.activeElement).toBe(primary);
    expect(activeIsBody()).toBe(false);

    await userEvent.click(primary);
    expect(document.activeElement).toBe(primary);
    await act(async () => gates[1]!.resolve());
    expect(screen.getByText('Gamma body')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Finish' })).toBe(primary);
    expect(document.activeElement).toBe(primary);
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it('Back keeps focus when previousDisabled turns on and off', async () => {
    injectStyles();
    const { rerender } = render(
      <WizardNavigation isFirstStep={false} isLastStep={false} onPrevious={noop} onNext={noop} />
    );
    const back = screen.getByRole('button', { name: 'Previous' });
    back.focus();
    rerender(
      <WizardNavigation
        isFirstStep={false}
        isLastStep={false}
        onPrevious={noop}
        onNext={noop}
        previousDisabled
      />
    );
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    expect(document.activeElement).toBe(back);
    rerender(
      <WizardNavigation isFirstStep={false} isLastStep={false} onPrevious={noop} onNext={noop} />
    );
    expect(document.activeElement).toBe(back);
  });

  it('control (why aria-disabled): a focused button that becomes natively disabled loses focus in Chromium', async () => {
    function Native({ disabled }: { disabled: boolean }): React.ReactElement {
      return (
        <button type="button" disabled={disabled}>
          Native
        </button>
      );
    }
    const { rerender } = render(<Native disabled={false} />);
    const btn = screen.getByRole('button', { name: 'Native' });
    btn.focus();
    expect(document.activeElement).toBe(btn);
    rerender(<Native disabled />);
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    expect(document.activeElement).not.toBe(btn);
  });
});

describe('INV-5 (amended): opacity-only blocked look; a click on the pending primary keeps focus', () => {
  it('pending primary and disabled Back: computed opacity 0.5, pointer-events not "none"; idle: opacity 1', () => {
    injectStyles();
    const { rerender } = render(
      <WizardNavigation isFirstStep={false} isLastStep={false} onPrevious={noop} onNext={noop} />
    );
    const back = screen.getByRole('button', { name: 'Previous' });
    const primary = screen.getByRole('button', { name: 'Next' });
    expect(getComputedStyle(primary).opacity).toBe('1');
    rerender(
      <WizardNavigation
        isFirstStep={false}
        isLastStep={false}
        onPrevious={noop}
        onNext={noop}
        previousDisabled
        primaryLoading
      />
    );
    for (const b of [back, primary]) {
      expect(getComputedStyle(b).opacity).toBe('0.5');
      expect(getComputedStyle(b).pointerEvents).not.toBe('none');
    }
  });

  it('a real click on the focused pending primary lands on it: no call, focus stays, never body', async () => {
    injectStyles();
    const onNext = vi.fn();
    render(
      <div>
        <WizardNavigation
          isFirstStep={false}
          isLastStep={false}
          onPrevious={noop}
          onNext={onNext}
          primaryLoading
          previousDisabled
        />
      </div>
    );
    const primary = screen.getByRole('button', { name: 'Next' });
    const back = screen.getByRole('button', { name: 'Previous' });
    primary.focus();
    const targets: EventTarget[] = [];
    document.addEventListener('mousedown', (e) => targets.push(e.target as EventTarget), {
      once: true,
    });
    await userEvent.click(primary, { force: true });
    // The pointer lands on the button or its own children (spinner/label), never the container.
    expect(targets[0] instanceof Node && primary.contains(targets[0])).toBe(true);
    expect(document.activeElement).toBe(primary);
    expect(onNext).not.toHaveBeenCalled();

    back.focus();
    await userEvent.click(back, { force: true });
    expect(document.activeElement).toBe(back);
    expect(activeIsBody()).toBe(false);
  });

  it('control (sensitivity): with pointer-events-none, the same forced click falls through and drops focus to body', async () => {
    injectStyles();
    render(
      <div>
        <button type="button" className="pointer-events-none">
          Blocked
        </button>
      </div>
    );
    const btn = screen.getByRole('button', { name: 'Blocked' });
    btn.focus();
    expect(document.activeElement).toBe(btn);
    await userEvent.click(btn, { force: true });
    expect(activeIsBody()).toBe(true);
  });
});

describe('INV-14: one save per pending cycle with real Chromium events', () => {
  const bursts: Array<{ name: string; run: (el: HTMLElement) => Promise<void> }> = [
    { name: 'double-click', run: async (el) => userEvent.dblClick(el) },
    {
      name: 'held Enter (repeat ×3)',
      run: async (el) => {
        el.focus();
        await userEvent.keyboard('{Enter>3/}');
      },
    },
    {
      name: 'Enter then click',
      run: async (el) => {
        el.focus();
        await userEvent.keyboard('{Enter}');
        await userEvent.click(el, { force: true });
      },
    },
  ];
  for (const b of bursts) {
    it(`${b.name} → exactly one save`, async () => {
      injectStyles();
      const gates = [deferred()];
      const onSave = vi.fn();
      render(<SaveWizard gates={gates} onSave={onSave} />);
      const primary = screen.getByRole('button', { name: 'Next' });
      await b.run(primary);
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(document.activeElement).toBe(primary);
      await act(async () => gates[0]!.resolve());
      expect(screen.getByText('Beta body')).toBeTruthy();
    });
  }
});

describe('INV-22: the kit never moves focus (Chromium)', () => {
  it('focus in a header input stays through pending, Back-disabled and the advance', async () => {
    injectStyles();
    const header = <input aria-label="Outside field" />;
    const { rerender } = render(
      <WizardLayout steps={STEPS} currentStepIndex={1} onStepChange={noop} header={header} />
    );
    const field = screen.getByLabelText('Outside field');
    await userEvent.click(field);
    rerender(
      <WizardLayout
        steps={STEPS}
        currentStepIndex={1}
        onStepChange={noop}
        header={header}
        primaryLoading
        previousDisabled
      />
    );
    expect(document.activeElement).toBe(field);
    rerender(
      <WizardLayout steps={STEPS} currentStepIndex={2} onStepChange={noop} header={header} />
    );
    expect(document.activeElement).toBe(field);
  });
});

describe('INV-23: axe and real Tab order (Chromium)', () => {
  async function violations(container: HTMLElement): Promise<axe.Result[]> {
    const results = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    return results.violations;
  }

  for (const [label, props] of [
    ['idle', {}],
    ['pending', { primaryLoading: true }],
    ['Back disabled', { previousDisabled: true }],
    ['both', { primaryLoading: true, previousDisabled: true, previousLabel: 'Back' }],
  ] as const) {
    it(`no axe violations: ${label}`, async () => {
      const { container } = render(
        <WizardNavigation
          isFirstStep={false}
          isLastStep={false}
          onPrevious={noop}
          onNext={noop}
          onCancel={noop}
          {...props}
        />
      );
      expect((await violations(container)).map((v) => v.id)).toEqual([]);
    });
  }

  it('Tab reaches Cancel, the disabled Back and the pending primary in order', async () => {
    injectStyles();
    render(
      <>
        <input aria-label="Start" />
        <WizardNavigation
          isFirstStep={false}
          isLastStep={false}
          onPrevious={noop}
          onNext={noop}
          onCancel={noop}
          previousDisabled
          primaryLoading
        />
      </>
    );
    screen.getByLabelText('Start').focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Previous' }));
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next' }));
  });
});
