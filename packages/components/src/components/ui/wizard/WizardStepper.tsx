import { Check, Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import React from 'react';

import { cn } from '@openzeppelin/ui-utils';

export type StepStatus = 'pending' | 'completed' | 'skipped';

export type StepVisualState = 'completed' | 'current' | 'visited' | 'upcoming';

export interface WizardStepDef {
  id: string;
  title: string;
  status?: StepStatus;
}

export interface WizardStepperProps {
  steps: WizardStepDef[];
  currentStepIndex: number;
  /** Index of the furthest step the user has reached. Steps up to this index stay clickable. */
  furthestStepIndex?: number;
  onStepClick?: (index: number) => void;
  variant?: 'vertical' | 'horizontal';
  /** When true all steps are clickable regardless of their state (used by scrollable layout). */
  freeNavigation?: boolean;
  className?: string;
}

function resolveState(
  step: WizardStepDef,
  index: number,
  currentStepIndex: number,
  furthestStepIndex: number
): StepVisualState {
  if (step.status === 'completed' || step.status === 'skipped') return 'completed';
  if (index === currentStepIndex) return 'current';
  if (index < currentStepIndex) return 'completed';
  if (index <= furthestStepIndex) return 'visited';
  return 'upcoming';
}

function canClick(state: StepVisualState, freeNavigation = false): boolean {
  if (freeNavigation) return true;
  return state !== 'upcoming';
}

function StepCircle({ state, index }: { state: StepVisualState; index: number }) {
  return (
    <span
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all',
        state === 'completed' && 'bg-blue-600 text-white',
        state === 'current' && 'bg-blue-600 text-white ring-2 ring-blue-200',
        state === 'visited' && 'bg-blue-100 text-blue-600 ring-1 ring-blue-300',
        state === 'upcoming' && 'bg-zinc-100 text-zinc-400'
      )}
    >
      {state === 'completed' ? (
        <Check className="size-3.5" />
      ) : state === 'visited' ? (
        <Pencil className="size-3" />
      ) : (
        index + 1
      )}
    </span>
  );
}

function StepLabel({
  title,
  state,
  isSkipped,
}: {
  title: string;
  state: StepVisualState;
  isSkipped: boolean;
}) {
  return (
    <div className="min-w-0 flex-1">
      <span
        className={cn(
          'text-sm font-medium transition-colors',
          state === 'current' && 'text-blue-700',
          state === 'completed' && 'text-zinc-700',
          state === 'visited' && 'text-blue-600',
          state === 'upcoming' && 'text-zinc-400'
        )}
      >
        {title}
      </span>
      {isSkipped && <span className="mt-0.5 block text-[11px] text-zinc-400">Skipped</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vertical variant — card-wrapped sidebar
// ---------------------------------------------------------------------------

function VerticalStepper({
  steps,
  currentStepIndex,
  furthestStepIndex = currentStepIndex,
  onStepClick,
  freeNavigation,
  className,
}: WizardStepperProps) {
  return (
    <nav
      aria-label="Wizard steps"
      className={cn('rounded-2xl border border-zinc-200 bg-white p-6', className)}
    >
      <div className="flex flex-col gap-1">
        {steps.map((step, index) => {
          const state = resolveState(step, index, currentStepIndex, furthestStepIndex);
          const clickable = canClick(state, freeNavigation) && !!onStepClick;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => clickable && onStepClick?.(index)}
              disabled={!clickable}
              className={cn(
                'flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-left transition-all duration-150',
                clickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                state === 'current' && 'border-blue-200 bg-blue-50',
                state === 'completed' && 'bg-white hover:bg-gray-50',
                state === 'visited' && 'bg-white hover:bg-blue-50/50',
                state === 'upcoming' && 'bg-white'
              )}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <StepCircle state={state} index={index} />
              <StepLabel title={step.title} state={state} isSkipped={step.status === 'skipped'} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Horizontal variant — card-wrapped top bar with connector lines
// ---------------------------------------------------------------------------

function HorizontalStepper({
  steps,
  currentStepIndex,
  furthestStepIndex = currentStepIndex,
  onStepClick,
  freeNavigation,
  className,
}: WizardStepperProps) {
  return (
    <nav
      aria-label="Wizard steps"
      className={cn('rounded-2xl border border-zinc-200 bg-white p-6', className)}
    >
      <div className="flex w-full items-center">
        {steps.map((step, index) => {
          const state = resolveState(step, index, currentStepIndex, furthestStepIndex);
          const clickable = canClick(state, freeNavigation) && !!onStepClick;
          const isLast = index === steps.length - 1;

          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => clickable && onStepClick?.(index)}
                disabled={!clickable}
                className={cn(
                  'flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-left transition-all duration-150',
                  clickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                  state === 'current' && 'border-blue-200 bg-blue-50',
                  state === 'completed' && 'bg-white hover:bg-gray-50',
                  state === 'visited' && 'bg-white hover:bg-blue-50/50',
                  state === 'upcoming' && 'bg-white'
                )}
                aria-current={state === 'current' ? 'step' : undefined}
                aria-label={`Step ${index + 1}: ${step.title}`}
              >
                <StepCircle state={state} index={index} />
                <div className="hidden sm:block">
                  <StepLabel
                    title={step.title}
                    state={state}
                    isSkipped={step.status === 'skipped'}
                  />
                </div>
              </button>

              {!isLast && (
                <div
                  className={cn(
                    'mx-1 h-px flex-1 transition-colors sm:mx-2',
                    index < currentStepIndex ? 'bg-blue-600' : 'bg-zinc-200'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

/**
 * A stepper component for navigating through a series of steps.
 *
 * @param props - The props for the WizardStepper component.
 * @returns A React node representing the stepper component.
 */
export function WizardStepper(props: WizardStepperProps): ReactNode {
  const { variant = 'horizontal', ...rest } = props;
  return variant === 'vertical' ? (
    <VerticalStepper {...rest} variant={variant} />
  ) : (
    <HorizontalStepper {...rest} variant={variant} />
  );
}
