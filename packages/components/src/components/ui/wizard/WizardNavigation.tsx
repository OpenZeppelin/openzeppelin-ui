import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@openzeppelin/ui-utils';

import { Button } from '../button';

export interface WizardNavigationProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  canProceed?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onCancel?: () => void;
  /** Extra actions rendered between Cancel/Previous and Next (e.g. Show Code) */
  extraActions?: ReactNode;
  nextLabel?: string;
  lastStepLabel?: string;
  /**
   * When `false` on the last step, the primary Next/Finish button is omitted
   * (e.g. when the step body provides its own primary action).
   * @default true
   */
  showLastStepPrimary?: boolean;
  className?: string;
}

/**
 * A navigation component for the wizard.
 *
 * @param props - The props for the WizardNavigation component.
 * @returns A React node representing the navigation component.
 */
export function WizardNavigation({
  isFirstStep,
  isLastStep,
  canProceed = true,
  onPrevious,
  onNext,
  onCancel,
  extraActions,
  nextLabel = 'Next',
  lastStepLabel = 'Finish',
  showLastStepPrimary = true,
  className,
}: WizardNavigationProps) {
  const showPrimary = !isLastStep || showLastStepPrimary;

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="flex gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="gap-2">
            <X className="size-4" />
            Cancel
          </Button>
        )}
        {!isFirstStep && (
          <Button type="button" variant="outline" onClick={onPrevious} className="gap-2">
            <ChevronLeft className="size-4" />
            Previous
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {extraActions}
        {showPrimary && (
          <Button type="button" onClick={onNext} disabled={!canProceed} className="gap-2">
            {isLastStep ? lastStepLabel : nextLabel}
            {!isLastStep && <ChevronRight className="size-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
