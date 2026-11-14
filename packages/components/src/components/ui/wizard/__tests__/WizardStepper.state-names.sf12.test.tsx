import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import React, { useState } from 'react';

import { WizardLayout, type WizardStepConfig } from '../WizardLayout';
import { WizardStepper, type WizardStepDef, type WizardStepLabelInfo } from '../WizardStepper';

/**
 * SF-12: every stepper step button's accessible name carries number, title and state,
 * in both layouts; `getStepLabel` replaces it. No Invariants stage; scenario ids used
 * (S1 = default names, S2 = custom formatter).
 */

const STEPS: WizardStepDef[] = [
  { id: 'a', title: 'Basics' },
  { id: 'b', title: 'Details' },
  { id: 'c', title: 'Roles' },
  { id: 'd', title: 'Review' },
];

const VARIANTS = ['horizontal', 'vertical'] as const;

function stepNames(): string[] {
  const nav = screen.getByRole('navigation', { name: 'Wizard steps' });
  return within(nav)
    .getAllByRole('button')
    .map((b) => b.getAttribute('aria-label') ?? '');
}

describe.each(VARIANTS)('WizardStepper default step names (%s) (SF-12 S1)', (variant) => {
  it('names step 2 of 4 with step 1 completed: number, title, state for every step', () => {
    render(<WizardStepper variant={variant} steps={STEPS} currentStepIndex={1} />);
    expect(stepNames()).toEqual([
      'Step 1: Basics, completed',
      'Step 2: Details',
      'Step 3: Roles, upcoming',
      'Step 4: Review, upcoming',
    ]);
  });

  it('exposes the name through the role query (accessible name, not just attribute)', () => {
    render(<WizardStepper variant={variant} steps={STEPS} currentStepIndex={1} />);
    expect(screen.getByRole('button', { name: 'Step 2: Details' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Step 1: Basics, completed' })).toBeTruthy();
  });

  it('boundary: first step current, no steps completed', () => {
    render(<WizardStepper variant={variant} steps={STEPS} currentStepIndex={0} />);
    expect(stepNames()[0]).toBe('Step 1: Basics');
    expect(
      stepNames()
        .slice(1)
        .every((n) => n.endsWith(', upcoming'))
    ).toBe(true);
  });

  it('boundary: last step current, all earlier completed', () => {
    render(<WizardStepper variant={variant} steps={STEPS} currentStepIndex={3} />);
    expect(stepNames()).toEqual([
      'Step 1: Basics, completed',
      'Step 2: Details, completed',
      'Step 3: Roles, completed',
      'Step 4: Review',
    ]);
  });

  it('boundary: single step', () => {
    render(<WizardStepper variant={variant} steps={[STEPS[0]]} currentStepIndex={0} />);
    expect(stepNames()).toEqual(['Step 1: Basics']);
  });

  it('reads visited for a step beyond current within furthestStepIndex', () => {
    render(
      <WizardStepper variant={variant} steps={STEPS} currentStepIndex={0} furthestStepIndex={2} />
    );
    expect(stepNames()).toEqual([
      'Step 1: Basics',
      'Step 2: Details, visited',
      'Step 3: Roles, visited',
      'Step 4: Review, upcoming',
    ]);
  });

  it('reads invalid for an invalid step the user has reached', () => {
    const steps = [STEPS[0], { ...STEPS[1], isInvalid: true }, STEPS[2], STEPS[3]];
    render(<WizardStepper variant={variant} steps={steps} currentStepIndex={2} />);
    expect(stepNames()[1]).toBe('Step 2: Details, invalid');
  });

  it('failure boundary: an invalid step not yet reached stays upcoming', () => {
    const steps = [STEPS[0], STEPS[1], STEPS[2], { ...STEPS[3], isInvalid: true }];
    render(<WizardStepper variant={variant} steps={steps} currentStepIndex={1} />);
    expect(stepNames()[3]).toBe('Step 4: Review, upcoming');
  });

  it('reads skipped for a skipped step', () => {
    const steps = [STEPS[0], { ...STEPS[1], status: 'skipped' as const }, STEPS[2], STEPS[3]];
    render(<WizardStepper variant={variant} steps={steps} currentStepIndex={2} />);
    expect(stepNames()[1]).toBe('Step 2: Details, skipped');
  });

  it('reads completed for a step with status "completed" even when ahead of current', () => {
    const steps = [STEPS[0], STEPS[1], { ...STEPS[2], status: 'completed' as const }, STEPS[3]];
    render(<WizardStepper variant={variant} steps={steps} currentStepIndex={0} />);
    expect(stepNames()[2]).toBe('Step 3: Roles, completed');
  });

  it('keeps aria-current="step" on exactly the current step, alongside the name', () => {
    render(<WizardStepper variant={variant} steps={STEPS} currentStepIndex={2} />);
    const nav = screen.getByRole('navigation', { name: 'Wizard steps' });
    const current = nav.querySelectorAll('[aria-current="step"]');
    expect(current).toHaveLength(1);
    expect(current[0].getAttribute('aria-label')).toBe('Step 3: Roles');
  });

  it('still invokes onStepClick for a clickable step found by its new name', async () => {
    const onStepClick = vi.fn();
    render(
      <WizardStepper
        variant={variant}
        steps={STEPS}
        currentStepIndex={1}
        onStepClick={onStepClick}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Step 1: Basics, completed' }));
    expect(onStepClick).toHaveBeenCalledWith(0);
    expect(
      (screen.getByRole('button', { name: 'Step 3: Roles, upcoming' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });
});

describe.each(VARIANTS)('WizardStepper custom getStepLabel (%s) (SF-12 S2)', (variant) => {
  it('every step name is exactly the formatter output', () => {
    const getStepLabel = ({ index, total, title, state }: WizardStepLabelInfo) =>
      `Paso ${index + 1} de ${total}: ${title} (${state})`;
    render(
      <WizardStepper
        variant={variant}
        steps={STEPS}
        currentStepIndex={1}
        getStepLabel={getStepLabel}
      />
    );
    expect(stepNames()).toEqual([
      'Paso 1 de 4: Basics (completed)',
      'Paso 2 de 4: Details (current)',
      'Paso 3 de 4: Roles (upcoming)',
      'Paso 4 de 4: Review (upcoming)',
    ]);
  });

  it('passes index, total, title, state and skipped for each step', () => {
    const getStepLabel = vi.fn((info: WizardStepLabelInfo) => `s${info.index}`);
    const steps = [STEPS[0], { ...STEPS[1], status: 'skipped' as const }, STEPS[2]];
    render(
      <WizardStepper
        variant={variant}
        steps={steps}
        currentStepIndex={2}
        getStepLabel={getStepLabel}
      />
    );
    expect(getStepLabel).toHaveBeenCalledWith({
      index: 1,
      total: 3,
      title: 'Details',
      state: 'completed',
      skipped: true,
    });
    expect(getStepLabel).toHaveBeenCalledWith({
      index: 2,
      total: 3,
      title: 'Roles',
      state: 'current',
      skipped: false,
    });
  });

  it('failure: an empty formatter result falls back to the default name for that step only', () => {
    const getStepLabel = ({ index }: WizardStepLabelInfo) => (index === 1 ? '' : `custom ${index}`);
    render(
      <WizardStepper
        variant={variant}
        steps={STEPS.slice(0, 3)}
        currentStepIndex={1}
        getStepLabel={getStepLabel}
      />
    );
    expect(stepNames()).toEqual(['custom 0', 'Step 2: Details', 'custom 2']);
  });

  it('formatter output has no default suffix or prefix appended', () => {
    render(
      <WizardStepper
        variant={variant}
        steps={STEPS}
        currentStepIndex={0}
        getStepLabel={() => 'X'}
      />
    );
    expect(stepNames()).toEqual(['X', 'X', 'X', 'X']);
  });
});

function Harness({
  variant,
  getStepLabel,
}: {
  variant: 'vertical' | 'horizontal' | 'scrollable';
  getStepLabel?: (info: WizardStepLabelInfo) => string;
}): React.ReactElement {
  const [step, setStep] = useState(0);
  const steps: WizardStepConfig[] = STEPS.map((s) => ({
    ...s,
    component: <p>Body {s.title}</p>,
  }));
  return (
    <WizardLayout
      variant={variant}
      steps={steps}
      currentStepIndex={step}
      onStepChange={setStep}
      getStepLabel={getStepLabel}
    />
  );
}

describe('WizardLayout stepper names (SF-12 S1/S2 through the layout)', () => {
  it.each(['vertical', 'horizontal'] as const)(
    '%s: advancing with Next flips previous step to completed and the next to current',
    async (variant) => {
      render(<Harness variant={variant} />);
      expect(stepNames()[0]).toBe('Step 1: Basics');
      await userEvent.click(screen.getByRole('button', { name: /next/i }));
      expect(stepNames()).toEqual([
        'Step 1: Basics, completed',
        'Step 2: Details',
        'Step 3: Roles, upcoming',
        'Step 4: Review, upcoming',
      ]);
      await userEvent.click(screen.getByRole('button', { name: /next/i }));
      expect(stepNames().slice(0, 3)).toEqual([
        'Step 1: Basics, completed',
        'Step 2: Details, completed',
        'Step 3: Roles',
      ]);
    }
  );

  it('going back keeps the later step reachable and renames it visited', async () => {
    render(<Harness variant="vertical" />);
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Step 1: Basics, completed' }));
    expect(stepNames().slice(0, 3)).toEqual([
      'Step 1: Basics',
      'Step 2: Details, visited',
      'Step 3: Roles, upcoming',
    ]);
  });

  it.each(['vertical', 'horizontal', 'scrollable'] as const)(
    '%s: getStepLabel is forwarded to the stepper',
    (variant) => {
      render(<Harness variant={variant} getStepLabel={({ index }) => `custom-${index}`} />);
      expect(stepNames()).toEqual(['custom-0', 'custom-1', 'custom-2', 'custom-3']);
    }
  );

  it('scrollable: default names carry number, title and state', () => {
    render(<Harness variant="scrollable" />);
    expect(stepNames()[0]).toBe('Step 1: Basics');
    expect(stepNames()[3]).toBe('Step 4: Review, upcoming');
  });
});
