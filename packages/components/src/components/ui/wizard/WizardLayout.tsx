import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { cn } from '@openzeppelin/ui-utils';

import { Button } from '../button';
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
  const safeIndex =
    steps.length === 0 ? 0 : Math.max(0, Math.min(currentStepIndex, steps.length - 1));
  const [furthestStepIndex, setFurthestStepIndex] = useState(safeIndex);

  useEffect(() => {
    setFurthestStepIndex((prev) => Math.max(prev, safeIndex));
  }, [safeIndex]);

  if (steps.length === 0) return null;

  const resolvedFurthestStepIndex = furthestStepIndexProp ?? furthestStepIndex;

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
  className,
}: Pick<
  WizardLayoutProps,
  'steps' | 'currentStepIndex' | 'onStepChange' | 'header' | 'onComplete' | 'className'
>) {
  const instanceId = useId();
  const safeIndex =
    steps.length === 0 ? 0 : Math.max(0, Math.min(currentStepIndex, steps.length - 1));
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(safeIndex);
  const sectionId = useCallback(
    (stepId: string) => `wizard-section-${instanceId}-${stepId}`,
    [instanceId]
  );

  useEffect(() => {
    setActiveIndex(safeIndex);
  }, [safeIndex]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || steps.length === 0) return;

    const handleScroll = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const containerTop = container.getBoundingClientRect().top;
        const threshold = containerTop + 150;

        let newActive = 0;
        for (let i = 0; i < steps.length; i++) {
          const el = container.querySelector<HTMLElement>(`#${CSS.escape(sectionId(steps[i].id))}`);
          if (el && el.getBoundingClientRect().top <= threshold) {
            newActive = i;
          }
        }

        setActiveIndex((prev) => {
          if (prev !== newActive) onStepChange(newActive);
          return newActive;
        });
        rafRef.current = null;
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [onStepChange, sectionId, steps]);

  const scrollToSection = useCallback(
    (index: number) => {
      const step = steps[index];
      if (!step) return;
      onStepChange(index);
      const el = scrollRef.current?.querySelector<HTMLElement>(
        `#${CSS.escape(sectionId(step.id))}`
      );
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [onStepChange, sectionId, steps]
  );

  if (steps.length === 0) return null;

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
        currentStepIndex={rest.currentStepIndex}
        onStepChange={rest.onStepChange}
        header={rest.header}
        onComplete={rest.onComplete}
        className={rest.className}
      />
    );
  }

  return <PagedLayout {...rest} variant={variant} />;
}
