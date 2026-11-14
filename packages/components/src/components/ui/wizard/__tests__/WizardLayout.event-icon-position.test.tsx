/**
 * WizardLayout click-event pass-through and primary icon position.
 * Scenario numbers refer to the sub-feature's acceptance scenarios (SC-1 … SC-4).
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { MouseEvent } from 'react';

import { WizardLayout, type WizardLayoutProps, type WizardStepConfig } from '../WizardLayout';
import { WizardNavigation } from '../WizardNavigation';

const steps: WizardStepConfig[] = [
  { id: 'a', title: 'A', component: <p>A</p> },
  { id: 'b', title: 'B', component: <p>B</p> },
  { id: 'c', title: 'C', component: <p>C</p> },
];

type Mode = 'pointer' | 'Enter' | 'Space';
const modes: Mode[] = ['pointer', 'Enter', 'Space'];

async function activate(
  user: ReturnType<typeof userEvent.setup>,
  button: HTMLElement,
  mode: Mode
): Promise<void> {
  if (mode === 'pointer') return user.click(button);
  button.focus();
  await user.keyboard(mode === 'Enter' ? '{Enter}' : ' ');
}

/** Captures `currentTarget` synchronously, as a consumer must before an `await`. */
function capture() {
  const seen: Array<{ index?: number; target: EventTarget | null; hasEvent: boolean }> = [];
  const onStepChange = vi.fn((index: number, event?: MouseEvent<HTMLButtonElement>) => {
    seen.push({ index, target: event?.currentTarget ?? null, hasEvent: event !== undefined });
  });
  return { seen, onStepChange };
}

if (typeof CSS === 'undefined' || typeof CSS.escape !== 'function') {
  vi.stubGlobal('CSS', { escape: (value: string) => value });
}

describe('SC-1: Next and Previous pass the step index and the click event', () => {
  for (const variant of ['horizontal', 'vertical'] as const) {
    for (const mode of modes) {
      it(`${variant}/${mode}: Next → (index+1, event with currentTarget = Next button)`, async () => {
        const user = userEvent.setup();
        const { seen, onStepChange } = capture();
        render(
          <WizardLayout
            steps={steps}
            currentStepIndex={1}
            onStepChange={onStepChange}
            variant={variant}
          />
        );
        const next = screen.getByRole('button', { name: 'Next' });
        await activate(user, next, mode);
        expect(seen).toHaveLength(1);
        expect(seen[0]).toMatchObject({ index: 2, hasEvent: true });
        expect(seen[0].target).toBe(next);
      });

      it(`${variant}/${mode}: Previous → (index-1, event with currentTarget = Previous button)`, async () => {
        const user = userEvent.setup();
        const { seen, onStepChange } = capture();
        render(
          <WizardLayout
            steps={steps}
            currentStepIndex={1}
            onStepChange={onStepChange}
            variant={variant}
          />
        );
        const prev = screen.getByRole('button', { name: 'Previous' });
        await activate(user, prev, mode);
        expect(seen).toHaveLength(1);
        expect(seen[0]).toMatchObject({ index: 0, hasEvent: true });
        expect(seen[0].target).toBe(prev);
      });
    }
  }

  it('failure: Previous on the first step is not rendered/active, so onStepChange is never called', async () => {
    const user = userEvent.setup();
    const { onStepChange } = capture();
    render(<WizardLayout steps={steps} currentStepIndex={0} onStepChange={onStepChange} />);
    const prev = screen.queryByRole('button', { name: 'Previous' });
    if (prev) await user.click(prev);
    expect(onStepChange).not.toHaveBeenCalled();
  });
});

describe('SC-2: last-step primary and complete callbacks receive the click event', () => {
  for (const mode of modes) {
    it(`${mode}: onLastStepPrimary gets the event; onComplete is not called`, async () => {
      const user = userEvent.setup();
      const targets: Array<EventTarget | null> = [];
      const onLastStepPrimary = vi.fn((e?: MouseEvent<HTMLButtonElement>) => {
        targets.push(e?.currentTarget ?? null);
      });
      const onComplete = vi.fn();
      render(
        <WizardLayout
          steps={steps}
          currentStepIndex={2}
          onStepChange={vi.fn()}
          onLastStepPrimary={onLastStepPrimary}
          onComplete={onComplete}
        />
      );
      const finish = screen.getByRole('button', { name: 'Finish' });
      await activate(user, finish, mode);
      expect(onLastStepPrimary).toHaveBeenCalledTimes(1);
      expect(targets).toEqual([finish]);
      expect(onComplete).not.toHaveBeenCalled();
    });

    it(`${mode}: onComplete fallback (no onLastStepPrimary) gets the event`, async () => {
      const user = userEvent.setup();
      const targets: Array<EventTarget | null> = [];
      const onComplete = vi.fn((e?: MouseEvent<HTMLButtonElement>) => {
        targets.push(e?.currentTarget ?? null);
      });
      render(
        <WizardLayout
          steps={steps}
          currentStepIndex={2}
          onStepChange={vi.fn()}
          onComplete={onComplete}
        />
      );
      const finish = screen.getByRole('button', { name: 'Finish' });
      await activate(user, finish, mode);
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(targets).toEqual([finish]);
    });
  }

  it('scrollable: the complete button passes the click event to onComplete', async () => {
    const user = userEvent.setup();
    const targets: Array<EventTarget | null> = [];
    const onComplete = vi.fn((e?: MouseEvent<HTMLButtonElement>) => {
      targets.push(e?.currentTarget ?? null);
    });
    render(
      <WizardLayout
        variant="scrollable"
        steps={steps}
        currentStepIndex={0}
        onStepChange={vi.fn()}
        onComplete={onComplete}
      />
    );
    const buttons = screen.getAllByRole('button');
    const complete = buttons[buttons.length - 1];
    await user.click(complete);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(targets).toEqual([complete]);
  });

  it('boundary: a handler that reads currentTarget before an await can refocus the button afterwards', async () => {
    const user = userEvent.setup();
    let resolveSave: () => void = () => undefined;
    const save = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    const onLastStepPrimary = vi.fn(async (event?: MouseEvent<HTMLButtonElement>) => {
      const button = event?.currentTarget;
      await save;
      button?.focus();
    });
    render(
      <WizardLayout
        steps={steps}
        currentStepIndex={2}
        onStepChange={vi.fn()}
        onLastStepPrimary={onLastStepPrimary}
      />
    );
    const finish = screen.getByRole('button', { name: 'Finish' });
    await user.click(finish);
    finish.blur();
    resolveSave();
    await onLastStepPrimary.mock.results[0].value;
    expect(document.activeElement).toBe(finish);
  });
});

describe('SC-3: non-button step changes and one-argument handlers', () => {
  it('stepper click calls onStepChange with the index and no event', async () => {
    const user = userEvent.setup();
    const { seen, onStepChange } = capture();
    render(
      <WizardLayout
        steps={steps}
        currentStepIndex={2}
        onStepChange={onStepChange}
        variant="vertical"
      />
    );
    const stepper = screen.getByRole('navigation', { name: 'Wizard steps' });
    await user.click(within(stepper).getAllByRole('button')[0]);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ index: 0, hasEvent: false });
  });

  it('one-argument handlers run unchanged and receive the index first', async () => {
    const user = userEvent.setup();
    const onStepChange = vi.fn((index: number) => index);
    render(<WizardLayout steps={steps} currentStepIndex={0} onStepChange={onStepChange} />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(onStepChange.mock.calls[0][0]).toBe(1);
  });

  it('types: one-argument and zero-argument handlers are assignable; event is typed to the button', () => {
    const oneArg: WizardLayoutProps['onStepChange'] = (index: number) => void index;
    const zeroArgComplete: WizardLayoutProps['onComplete'] = () => undefined;
    expect(oneArg).toBeTypeOf('function');
    expect(zeroArgComplete).toBeTypeOf('function');
    expectTypeOf<WizardLayoutProps['onStepChange']>().parameters.toEqualTypeOf<
      [index: number, event?: MouseEvent<HTMLButtonElement>]
    >();
    expectTypeOf<NonNullable<WizardLayoutProps['onLastStepPrimary']>>()
      .parameter(0)
      .toEqualTypeOf<MouseEvent<HTMLButtonElement> | undefined>();
  });
});

describe('SC-4: primaryIconPosition', () => {
  const icon = <svg data-testid="icon" aria-hidden="true" />;

  function primaryChildren(name: string): ChildNode[] {
    return Array.from(screen.getByRole('button', { name }).childNodes);
  }

  it('default: icon sits after the label', () => {
    render(
      <WizardLayout steps={steps} currentStepIndex={0} onStepChange={vi.fn()} primaryIcon={icon} />
    );
    const kids = primaryChildren('Next');
    expect(kids[kids.length - 1]).toBe(screen.getByTestId('icon'));
    expect(kids[0].textContent).toBe('Next');
  });

  it("'end': icon sits after the label", () => {
    render(
      <WizardLayout
        steps={steps}
        currentStepIndex={0}
        onStepChange={vi.fn()}
        primaryIcon={icon}
        primaryIconPosition="end"
      />
    );
    const kids = primaryChildren('Next');
    expect(kids[kids.length - 1]).toBe(screen.getByTestId('icon'));
  });

  it("'start': icon sits before the label via WizardLayout", () => {
    render(
      <WizardLayout
        steps={steps}
        currentStepIndex={0}
        onStepChange={vi.fn()}
        primaryIcon={icon}
        primaryIconPosition="start"
      />
    );
    const kids = primaryChildren('Next');
    expect(kids[0]).toBe(screen.getByTestId('icon'));
    expect(kids[kids.length - 1].textContent).toBe('Next');
  });

  it("'start' with the default chevron (undefined icon, non-last step): an svg precedes the label", () => {
    render(
      <WizardNavigation
        isFirstStep={false}
        isLastStep={false}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        primaryIconPosition="start"
      />
    );
    const kids = primaryChildren('Next');
    expect((kids[0] as Element).tagName.toLowerCase()).toBe('svg');
    expect(kids[kids.length - 1].textContent).toBe('Next');
  });

  it('failure/boundary: icon null → no icon either way; last step default has no icon', () => {
    const { rerender } = render(
      <WizardNavigation
        isFirstStep={false}
        isLastStep={false}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        primaryIcon={null}
        primaryIconPosition="start"
      />
    );
    expect(screen.getByRole('button', { name: 'Next' }).querySelector('svg')).toBeNull();
    rerender(
      <WizardNavigation
        isFirstStep={false}
        isLastStep
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        primaryIconPosition="start"
      />
    );
    expect(screen.getByRole('button', { name: 'Finish' }).querySelector('svg')).toBeNull();
  });

  it("'start' with loading: spinner stays first, then icon, then label", () => {
    render(
      <WizardNavigation
        isFirstStep={false}
        isLastStep={false}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        primaryLoading
        primaryIcon={icon}
        primaryIconPosition="start"
      />
    );
    const kids = primaryChildren('Next');
    const iconIndex = kids.indexOf(screen.getByTestId('icon'));
    expect(iconIndex).toBeGreaterThan(0);
    expect(kids[iconIndex + 1].textContent).toBe('Next');
  });
});
