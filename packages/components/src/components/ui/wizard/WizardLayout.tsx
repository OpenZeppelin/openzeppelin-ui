import { useCallback, useId, useRef, type ReactNode } from 'react';

import { cn } from '@openzeppelin/ui-utils';

import { Button } from '../button';
import { getSafeStepIndex, useFurthestStepIndex, useScrollableWizardStepTracking } from './hooks';
import { WizardNavigation } from './WizardNavigation';
import type { StepStatus, WizardStepDef } from './WizardStepper';
import { WizardStepper } from './WizardStepper';

export type { StepStatus, WizardStepDef };

export interface WizardStepConfig extends WizardStepDef {
  component: ReactNode;
  isValid?: boolean;
}

export interface WizardLayoutProps {
  steps: WizardStepConfig[];
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  onComplete?: () => void;
  onCancel?: () => void;
  /**
   * - `'vertical'` — Vertical sidebar stepper, one step visible at a time (paged).
   * - `'horizontal'` — Horizontal top stepper, one step visible at a time (paged).
   * - `'scrollable'` — Vertical sidebar stepper, all steps on a single scrollable page.
   */
  variant?: 'vertical' | 'horizontal' | 'scrollable';
  /**
   * Optional override for the highest step index reached in paged variants.
   * When omitted, the layout tracks this internally.
   */
  furthestStepIndex?: number;
  /** Extra actions for the bottom navigation bar (paged variants only). */
  navActions?: ReactNode;
  /** Header content rendered above the step content (e.g. title, breadcrumbs). */
  header?: ReactNode;
  /**
   * Pixels of spacing preserved between the container top and an auto-scrolled
   * section heading (`scrollable` variant only). Defaults to 32 (matches `p-8`).
   */
  scrollPadding?: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Paged layout (vertical & horizontal stepper)
// ---------------------------------------------------------------------------

function PagedLayout({
  steps,
  currentStepIndex,
  furthestStepIndex: furthestStepIndexProp,
  onStepChange,
  onComplete,
  onCancel,
  navActions,
  header,
  variant,
  className,
}: WizardLayoutProps & { variant: 'vertical' | 'horizontal' }) {
  const safeIndex = getSafeStepIndex(steps.length, currentStepIndex);
  const resolvedFurthestStepIndex = useFurthestStepIndex(safeIndex, furthestStepIndexProp);

  if (steps.length === 0) return null;

  const isFirstStep = safeIndex === 0;
  const isLastStep = safeIndex === steps.length - 1;
  const currentStep = steps[safeIndex];
  const canProceed = currentStep?.isValid !== false;

  const handleNext = () => {
    if (isLastStep) {
      onComplete?.();
      return;
    }
    onStepChange(safeIndex + 1);
  };

  const handlePrevious = () => {
    if (!isFirstStep) onStepChange(safeIndex - 1);
  };

  const stepDefs = toStepDefs(steps, safeIndex);

  const navigation = (
    <WizardNavigation
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      canProceed={canProceed}
      onPrevious={handlePrevious}
      onNext={handleNext}
      onCancel={onCancel}
      extraActions={navActions}
    />
  );

  const footer = (
    <div className="shrink-0 border-t border-border bg-background px-8 py-4">
      <div className="mx-auto max-w-5xl">{navigation}</div>
    </div>
  );

  if (variant === 'vertical') {
    return (
      <div className={cn('flex h-full gap-6', className)}>
        <div className="w-[220px] shrink-0 py-6 pl-6">
          <WizardStepper
            variant="vertical"
            steps={stepDefs}
            currentStepIndex={safeIndex}
            furthestStepIndex={resolvedFurthestStepIndex}
            onStepClick={onStepChange}
            className="h-full"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto max-w-5xl">
              {header}
              {currentStep?.component}
            </div>
          </div>
          {footer}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="shrink-0 p-6 pb-0">
        <WizardStepper
          variant="horizontal"
          steps={stepDefs}
          currentStepIndex={safeIndex}
          furthestStepIndex={resolvedFurthestStepIndex}
          onStepClick={onStepChange}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-5xl">
            {header}
            {currentStep?.component}
          </div>
        </div>
        {footer}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scrollable layout — all sections on one page, scroll-tracked stepper
// ---------------------------------------------------------------------------

function ScrollableLayout({
  steps,
  currentStepIndex,
  onStepChange,
  header,
  onComplete,
  scrollPadding,
  className,
}: Pick<
  WizardLayoutProps,
  | 'steps'
  | 'currentStepIndex'
  | 'onStepChange'
  | 'header'
  | 'onComplete'
  | 'scrollPadding'
  | 'className'
>) {
  const instanceId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionId = useCallback(
    (stepId: string) => `wizard-section-${instanceId}-${stepId}`,
    [instanceId]
  );
  const { activeIndex, furthestStepIndex, scrollToSection } = useScrollableWizardStepTracking({
    steps,
    currentStepIndex,
    onStepChange,
    scrollRef,
    sectionId,
    scrollPadding,
  });

  if (steps.length === 0) return null;

  const stepDefs = toStepDefs(steps, activeIndex);

  return (
    <div className={cn('flex h-full gap-6', className)}>
      <div className="w-[220px] shrink-0 py-6 pl-6">
        <WizardStepper
          variant="vertical"
          steps={stepDefs}
          currentStepIndex={activeIndex}
          furthestStepIndex={furthestStepIndex}
          onStepClick={scrollToSection}
          freeNavigation
          className="h-full"
        />
      </div>

      <div ref={scrollRef} className="flex min-w-0 flex-1 flex-col overflow-y-auto p-8">
        {header}
        <div className="space-y-12">
          {steps.map((step) => (
            <section key={step.id} id={sectionId(step.id)}>
              {step.component}
            </section>
          ))}
        </div>

        {onComplete && (
          <div className="flex justify-end pt-8">
            <Button type="button" onClick={onComplete}>
              Finish
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toStepDefs(steps: WizardStepConfig[], currentStepIndex: number): WizardStepDef[] {
  return steps.map((s, i) => {
    const isInvalid = s.isValid === false;
    // Don't auto-assign 'completed' for invalid past steps — resolveState
    // needs to see isInvalid=true to render the error indicator instead.
    const status = s.status ?? (i < currentStepIndex && !isInvalid ? 'completed' : 'pending');
    return { id: s.id, title: s.title, status, isInvalid };
  });
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

/**
 * A layout component for the wizard.
 *
 * @param props - The props for the WizardLayout component.
 * @returns A React node representing the layout component.
 */
export function WizardLayout(props: WizardLayoutProps) {
  const { variant = 'horizontal', ...rest } = props;

  if (variant === 'scrollable') {
    return (
      <ScrollableLayout
        steps={rest.steps}
        currentStepIndex={rest.currentStepIndex}
        onStepChange={rest.onStepChange}
        header={rest.header}
        onComplete={rest.onComplete}
        scrollPadding={rest.scrollPadding}
        className={rest.className}
      />
    );
  }

  return <PagedLayout {...rest} variant={variant} />;
}
