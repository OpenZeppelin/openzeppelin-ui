import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '@openzeppelin/ui-utils';

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
  /** Extra actions for the bottom navigation bar (paged variants only). */
  navActions?: ReactNode;
  /** Header content rendered above the step content (e.g. title, breadcrumbs). */
  header?: ReactNode;
  className?: string;
}

const SECTION_ID_PREFIX = 'wizard-section-';

// ---------------------------------------------------------------------------
// Paged layout (vertical & horizontal stepper)
// ---------------------------------------------------------------------------

function PagedLayout({
  steps,
  currentStepIndex,
  onStepChange,
  onComplete,
  onCancel,
  navActions,
  header,
  variant,
  className,
}: WizardLayoutProps & { variant: 'vertical' | 'horizontal' }) {
  const [furthestStepIndex, setFurthestStepIndex] = useState(currentStepIndex);

  useEffect(() => {
    setFurthestStepIndex((prev) => Math.max(prev, currentStepIndex));
  }, [currentStepIndex]);

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;
  const currentStep = steps[currentStepIndex];
  const canProceed = currentStep?.isValid !== false;

  const handleNext = () => {
    if (isLastStep) {
      onComplete?.();
      return;
    }
    onStepChange(currentStepIndex + 1);
  };

  const handlePrevious = () => {
    if (!isFirstStep) onStepChange(currentStepIndex - 1);
  };

  const stepDefs = toStepDefs(steps, currentStepIndex);

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
            currentStepIndex={currentStepIndex}
            furthestStepIndex={furthestStepIndex}
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
          currentStepIndex={currentStepIndex}
          furthestStepIndex={furthestStepIndex}
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
  header,
  onComplete,
  className,
}: Pick<WizardLayoutProps, 'steps' | 'header' | 'onComplete' | 'className'>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const containerTop = container.getBoundingClientRect().top;
      const threshold = containerTop + 150;

      let newActive = 0;
      for (let i = 0; i < steps.length; i++) {
        const el = document.getElementById(`${SECTION_ID_PREFIX}${steps[i].id}`);
        if (el && el.getBoundingClientRect().top <= threshold) {
          newActive = i;
        }
      }
      setActiveIndex(newActive);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => container.removeEventListener('scroll', handleScroll);
  }, [steps]);

  const scrollToSection = useCallback(
    (index: number) => {
      const step = steps[index];
      if (!step) return;
      const el = document.getElementById(`${SECTION_ID_PREFIX}${step.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [steps]
  );

  const stepDefs = toStepDefs(steps, activeIndex);

  return (
    <div className={cn('flex h-full gap-6', className)}>
      <div className="w-[220px] shrink-0 py-6 pl-6">
        <WizardStepper
          variant="vertical"
          steps={stepDefs}
          currentStepIndex={activeIndex}
          onStepClick={scrollToSection}
          freeNavigation
          className="h-full"
        />
      </div>

      <div ref={scrollRef} className="flex min-w-0 flex-1 flex-col overflow-y-auto p-8">
        {header}
        <div className="space-y-12">
          {steps.map((step) => (
            <section key={step.id} id={`${SECTION_ID_PREFIX}${step.id}`}>
              {step.component}
            </section>
          ))}
        </div>

        {onComplete && (
          <div className="flex justify-end pt-8">
            <button
              type="button"
              onClick={onComplete}
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Finish
            </button>
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
  return steps.map((s, i) => ({
    id: s.id,
    title: s.title,
    status: s.status ?? (i < currentStepIndex ? 'completed' : 'pending'),
  }));
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
        header={rest.header}
        onComplete={rest.onComplete}
        className={rest.className}
      />
    );
  }

  return <PagedLayout {...rest} variant={variant} />;
}
