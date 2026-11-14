import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StepMarker, type StepMarkerState } from '../../step-marker';
import { WizardStepper, type WizardStepDef } from '../WizardStepper';
import { BaselineWizardStepper } from './WizardStepper.sf31-baseline';

/**
 * SF-31. Low stakes, no Invariants stage; spec scenario ids used:
 * S1 = standalone marker looks like the stepper's marker per state,
 * S2 = stepper DOM and accessible names identical to the pre-extraction stepper.
 */

const VARIANTS = ['horizontal', 'vertical'] as const;

const STEPS: WizardStepDef[] = [
  { id: 'a', title: 'Basics' },
  { id: 'b', title: 'Details', isInvalid: true },
  { id: 'c', title: 'Roles', status: 'skipped' },
  { id: 'd', title: 'Review' },
  { id: 'e', title: 'Confirm' },
  { id: 'f', title: 'Done', status: 'completed' },
];

interface Scenario {
  name: string;
  steps: WizardStepDef[];
  current: number;
  furthest?: number;
}

const SCENARIOS: Scenario[] = [
  { name: 'first current', steps: STEPS, current: 0 },
  { name: 'middle current, earlier completed', steps: STEPS, current: 3 },
  { name: 'visited beyond current', steps: STEPS, current: 0, furthest: 4 },
  { name: 'invalid step behind current', steps: STEPS, current: 3, furthest: 3 },
  { name: 'invalid step ahead, within furthest', steps: STEPS, current: 0, furthest: 1 },
  { name: 'skipped + explicit completed', steps: STEPS, current: 4 },
  { name: 'last current', steps: STEPS, current: 5 },
  { name: 'single step', steps: [STEPS[0]], current: 0 },
];

describe.each(VARIANTS)(
  'WizardStepper DOM parity with the pre-extraction stepper (%s) (S2)',
  (variant) => {
    it.each(SCENARIOS)('identical HTML: $name', ({ steps, current, furthest }) => {
      const props = { steps, currentStepIndex: current, furthestStepIndex: furthest, variant };
      const before = render(<BaselineWizardStepper {...props} />).container.innerHTML;
      const after = render(<WizardStepper {...props} />).container.innerHTML;
      expect(after).toBe(before);
    });

    it('identical HTML with click handlers, freeNavigation and className', () => {
      const props = {
        steps: STEPS,
        currentStepIndex: 2,
        furthestStepIndex: 4,
        variant,
        onStepClick: () => undefined,
        freeNavigation: true,
        className: 'extra',
      };
      const before = render(<BaselineWizardStepper {...props} />).container.innerHTML;
      const after = render(<WizardStepper {...props} />).container.innerHTML;
      expect(after).toBe(before);
    });

    it('identical accessible names for every step', () => {
      const props = { steps: STEPS, currentStepIndex: 3, furthestStepIndex: 4, variant };
      const names = (c: HTMLElement) =>
        Array.from(c.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'));
      const before = names(render(<BaselineWizardStepper {...props} />).container);
      const after = names(render(<WizardStepper {...props} />).container);
      expect(after).toEqual(before);
      expect(after).toContain('Step 3: Roles, skipped');
      expect(after).toContain('Step 2: Details, invalid');
    });

    it('sensitivity control: the comparison detects a differing state', () => {
      const a = render(
        <BaselineWizardStepper variant={variant} steps={STEPS} currentStepIndex={0} />
      ).container.innerHTML;
      const b = render(<WizardStepper variant={variant} steps={STEPS} currentStepIndex={1} />)
        .container.innerHTML;
      expect(b).not.toBe(a);
    });
  }
);

const STATES: StepMarkerState[] = ['completed', 'current', 'visited', 'invalid', 'upcoming'];

describe('StepMarker standalone (S1)', () => {
  // The stepper's own marker per state, extracted from the baseline stepper's DOM.
  function baselineMarker(state: StepMarkerState, number: number): Element {
    // Drive the baseline stepper into `state` at position `number`.
    const steps: WizardStepDef[] = Array.from({ length: number }, (_, i) => ({
      id: String(i),
      title: `T${i}`,
    }));
    const target = steps[number - 1];
    let current = number - 1;
    let furthest = number - 1;
    if (state === 'completed') current = number;
    if (state === 'visited') {
      current = number - 2;
      furthest = number - 1;
    }
    if (state === 'upcoming') {
      current = number - 2;
      furthest = number - 2;
    }
    if (state === 'invalid') {
      target.isInvalid = true;
      current = number;
      furthest = number;
    }
    if (current < 0) current = 0;
    if (state === 'completed' || state === 'invalid') steps.push({ id: 'x', title: 'X' });
    const { container } = render(
      <BaselineWizardStepper
        variant="vertical"
        steps={steps}
        currentStepIndex={current}
        furthestStepIndex={furthest}
      />
    );
    return container.querySelectorAll('button')[number - 1].firstElementChild as Element;
  }

  it.each(STATES)('%s: same element, classes and icon as the stepper marker', (state) => {
    // number 2 so "visited"/"upcoming" have a distinct predecessor to be current.
    const expected = baselineMarker(state, 2);
    const { container } = render(<StepMarker state={state} number={2} />);
    expect(container.firstElementChild?.outerHTML).toBe(expected.outerHTML);
  });

  it('current and upcoming show the one-based number; icon states do not', () => {
    const { container: cur } = render(<StepMarker state="current" number={7} />);
    const { container: up } = render(<StepMarker state="upcoming" number={12} />);
    expect(cur.textContent).toBe('7');
    expect(up.textContent).toBe('12');
    for (const state of ['completed', 'visited', 'invalid'] as const) {
      const { container } = render(<StepMarker state={state} number={5} />);
      expect(container.textContent).toBe('');
      expect(container.querySelector('svg')).not.toBeNull();
    }
  });

  it('boundary: number 1 and a large number render verbatim', () => {
    expect(render(<StepMarker state="current" number={1} />).container.textContent).toBe('1');
    expect(render(<StepMarker state="upcoming" number={100} />).container.textContent).toBe('100');
  });

  it('is decorative by default: icons aria-hidden, no role', () => {
    const { container } = render(<StepMarker state="completed" number={1} />);
    expect(container.firstElementChild?.getAttribute('role')).toBeNull();
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('passes span props through: aria-label/role name it, data attrs and handlers land on the span', () => {
    render(
      <StepMarker
        state="completed"
        number={3}
        role="img"
        aria-label="Done"
        data-testid="m"
        id="x"
      />
    );
    expect(screen.getByRole('img', { name: 'Done' }).id).toBe('x');
    expect(screen.getByTestId('m').tagName).toBe('SPAN');
  });

  it('className is merged last without dropping the base classes', () => {
    const { container } = render(<StepMarker state="current" number={1} className="size-8" />);
    const cls = container.firstElementChild?.getAttribute('class') ?? '';
    expect(cls).toContain('rounded-full');
    expect(cls).toContain('size-8');
    expect(cls).not.toContain('size-6');
  });

  it('with no className the class string equals the stepper marker (byte-identical default)', () => {
    const base = baselineMarker('current', 1);
    const { container } = render(<StepMarker state="current" number={1} />);
    expect(container.firstElementChild?.getAttribute('class')).toBe(base.getAttribute('class'));
  });
});
