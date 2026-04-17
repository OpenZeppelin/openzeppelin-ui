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
  /**
   * Called when the user completes the wizard from the **scrollable** layout footer
   * (when that footer is shown), or as a fallback when the last step is confirmed
   * in **paged** layouts — see `onLastStepPrimary`.
   */
  onComplete?: () => void;
  /**
   * Called when the user activates the primary control on the **last step** of a
   * **paged** layout (`vertical` / `horizontal`). When omitted, `onComplete` is
   * invoked instead for that interaction.
   */
  onLastStepPrimary?: () => void;
  onCancel?: () => void;
  /** Label for the primary control on non-final steps. @default "Next" */
  nextLabel?: string;
  /** Label for the primary control on the last step of paged layouts. @default "Finish" */
  lastStepLabel?: string;
  /**
   * Optional secondary control on the **last step** of **paged** layouts only.
   * Rendered to the left of the primary action with an outline style. Both
   * `lastStepSecondaryLabel` and `onLastStepSecondary` must be set for it to appear.
   */
  onLastStepSecondary?: () => void;
  lastStepSecondaryLabel?: string;
  lastStepSecondaryDisabled?: boolean;
  /**
   * When true, the primary Next/Finish control is omitted on the last step of
   * **paged** layouts. Use when the step content provides its own primary action.
   * @default false
   */
  hideLastStepPrimary?: boolean;
  /**
   * When true, the optional footer button at the bottom of the **scrollable**
   * layout is omitted (even if `onComplete` is set).
   * @default false
   */
  hideScrollableCompleteButton?: boolean;
  /** Label for the scrollable layout footer button. @default "Finish" */
  scrollableCompleteLabel?: string;
  /**
   * Optional secondary footer button for the **scrollable** layout (outline style),
   * to the left of the complete button. Both `scrollableSecondaryLabel` and
   * `onScrollableSecondary` must be set for it to appear.
   */
  onScrollableSecondary?: () => void;
  scrollableSecondaryLabel?: string;
  scrollableSecondaryDisabled?: boolean;
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
  onLastStepPrimary,
  onCancel,
  nextLabel,
  lastStepLabel,
  onLastStepSecondary,
  lastStepSecondaryLabel,
  lastStepSecondaryDisabled,
  hideLastStepPrimary,
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
      if (onLastStepPrimary) {
        onLastStepPrimary();
      } else {
        onComplete?.();
      }
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
      nextLabel={nextLabel}
      lastStepLabel={lastStepLabel}
      onLastStepSecondary={onLastStepSecondary}
      lastStepSecondaryLabel={lastStepSecondaryLabel}
      lastStepSecondaryDisabled={lastStepSecondaryDisabled}
      showLastStepPrimary={!hideLastStepPrimary}
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
  hideScrollableCompleteButton,
  scrollableCompleteLabel,
  onScrollableSecondary,
  scrollableSecondaryLabel,
  scrollableSecondaryDisabled,
  scrollPadding,
  className,
}: Pick<
  WizardLayoutProps,
  | 'steps'
  | 'currentStepIndex'
  | 'onStepChange'
  | 'header'
  | 'onComplete'
  | 'hideScrollableCompleteButton'
  | 'scrollableCompleteLabel'
  | 'onScrollableSecondary'
  | 'scrollableSecondaryLabel'
  | 'scrollableSecondaryDisabled'
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

  const showScrollableSecondary =
    onScrollableSecondary != null &&
    scrollableSecondaryLabel != null &&
    scrollableSecondaryLabel !== '';
  const showScrollablePrimary = onComplete != null && !hideScrollableCompleteButton;
  const showScrollableFooter = showScrollableSecondary || showScrollablePrimary;

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

        {showScrollableFooter && (
          <div className="flex justify-end gap-2 pt-8">
            {showScrollableSecondary && (
              <Button
                type="button"
                variant="outline"
                onClick={onScrollableSecondary}
                disabled={scrollableSecondaryDisabled ?? false}
              >
                {scrollableSecondaryLabel}
              </Button>
            )}
            {showScrollablePrimary && (
              <Button type="button" onClick={onComplete}>
                {scrollableCompleteLabel ?? 'Finish'}
              </Button>
            )}
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
    // isInvalid on WizardStepDef takes explicit precedence; isValid on
    // WizardStepConfig is the convenience shorthand when not set.
    const isInvalid = s.isInvalid ?? s.isValid === false;
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
        hideScrollableCompleteButton={rest.hideScrollableCompleteButton}
        scrollableCompleteLabel={rest.scrollableCompleteLabel}
        onScrollableSecondary={rest.onScrollableSecondary}
        scrollableSecondaryLabel={rest.scrollableSecondaryLabel}
        scrollableSecondaryDisabled={rest.scrollableSecondaryDisabled}
        scrollPadding={rest.scrollPadding}
        className={rest.className}
      />
    );
  }

  return <PagedLayout {...rest} variant={variant} />;
}
