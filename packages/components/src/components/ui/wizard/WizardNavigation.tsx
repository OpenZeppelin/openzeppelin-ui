import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';

import { cn } from '@openzeppelin/ui-utils';

import { Button } from '../button';
import { Spinner } from '../spinner';

/**
 * Click handler for a navigation button. Receives the React click event (pointer
 * or keyboard activation), so `event.currentTarget` is the activated button.
 * Zero-argument handlers are still accepted.
 *
 * In an async handler, read `event.currentTarget` before the first `await`:
 * React clears it once the event has been dispatched.
 */
type NavigationClickHandler = (event: MouseEvent<HTMLButtonElement>) => void;

/**
 * Dimmed like a natively disabled kit button. Applied only while a blocked state is on,
 * so the default class string is unchanged. Unlike `buttonVariants`' `disabled:` pair it
 * leaves out `pointer-events-none`: a click would then fall through to the container and
 * its mousedown would drop focus to the body. The button keeps the click and the
 * click guard ignores it.
 */
const BLOCKED_LOOK = 'opacity-50';

export interface WizardNavigationProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  canProceed?: boolean;
  /** Called when Back is activated. Not called while `previousDisabled` is set. */
  onPrevious: NavigationClickHandler;
  /** Called when the primary (Next/Finish) is activated. Not called while `primaryLoading` is set. */
  onNext: NavigationClickHandler;
  onCancel?: NavigationClickHandler;
  /** Extra actions rendered between Cancel/Previous and Next (e.g. Show Code) */
  extraActions?: ReactNode;
  nextLabel?: string;
  lastStepLabel?: string;
  /**
   * Optional secondary action on the **last step** only, shown to the left of the
   * primary control with a less prominent (outline) style. Omitted when either
   * `lastStepSecondaryLabel` or `onLastStepSecondary` is missing.
   */
  onLastStepSecondary?: NavigationClickHandler;
  lastStepSecondaryLabel?: string;
  lastStepSecondaryDisabled?: boolean;
  /**
   * When `false` on the last step, the primary Next/Finish button is omitted
   * (e.g. when the step body provides its own primary action).
   * @default true
   */
  showLastStepPrimary?: boolean;
  className?: string;
  /**
   * Label of the Back button, rendered as given. An empty (or whitespace-only) string leaves
   * Back icon-only; it is then named "Previous" for assistive technology, since the chevron
   * icon is hidden from it.
   * @default "Previous"
   */
  previousLabel?: string;
  /**
   * Back can't be activated. Exposed as `aria-disabled="true"` rather than native
   * `disabled`, so Back stays focusable: a focused button that becomes natively
   * disabled drops focus to the document body.
   * @default false
   */
  previousDisabled?: boolean;
  /**
   * The primary (Next/Finish) is pending: it shows a spinner, sets `aria-busy` and
   * `aria-disabled`, and ignores activation. It stays focusable and remains the same
   * DOM node, so focus survives the pending state.
   *
   * The component holds no pending state of its own. To block a double activation,
   * set this from your handler synchronously, before its first `await`.
   * @default false
   */
  primaryLoading?: boolean;
  /**
   * Icon of the primary (after the label unless `primaryIconPosition` says otherwise).
   * - `undefined` (default): a chevron on non-last steps, no icon on the last step.
   * - `null` or `false`: no icon on any step.
   * - any other node: rendered on every step where the primary shows.
   */
  primaryIcon?: ReactNode;
  /**
   * Which side of the label the primary's icon sits on.
   * @default "end"
   */
  primaryIconPosition?: 'start' | 'end';
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
  onLastStepSecondary,
  lastStepSecondaryLabel,
  lastStepSecondaryDisabled,
  showLastStepPrimary = true,
  className,
  previousLabel = 'Previous',
  previousDisabled = false,
  primaryLoading = false,
  primaryIcon,
  primaryIconPosition = 'end',
}: WizardNavigationProps) {
  const showPrimary = !isLastStep || showLastStepPrimary;
  const showSecondary =
    isLastStep &&
    lastStepSecondaryLabel != null &&
    lastStepSecondaryLabel !== '' &&
    onLastStepSecondary != null;

  // `undefined` keeps today's icon; `null` / `false` mean no icon.
  const resolvedPrimaryIcon =
    primaryIcon === undefined ? !isLastStep && <ChevronRight className="size-4" /> : primaryIcon;

  // Keyboard activation of a <button> (Enter, Space) dispatches `click`, so these
  // guards block pointer, keyboard and programmatic activation alike. Blocked
  // activations are dropped, not queued.
  const handlePrevious = (event: MouseEvent<HTMLButtonElement>) => {
    if (previousDisabled) return;
    onPrevious(event);
  };

  const handleNext = (event: MouseEvent<HTMLButtonElement>) => {
    if (primaryLoading) return;
    onNext(event);
  };

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
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            // `aria-disabled`, not native `disabled`, keeps focus on Back.
            // Omitted when off so the default markup is unchanged.
            aria-disabled={previousDisabled || undefined}
            // Icon-only Back: the chevron is aria-hidden, so the button needs its own name.
            aria-label={previousLabel.trim() === '' ? 'Previous' : undefined}
            className={cn('gap-2', previousDisabled && BLOCKED_LOOK)}
          >
            <ChevronLeft className="size-4" />
            {previousLabel}
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {extraActions}
        {showSecondary && (
          <Button
            type="button"
            variant="outline"
            onClick={onLastStepSecondary}
            disabled={lastStepSecondaryDisabled ?? false}
            className="gap-2"
          >
            {lastStepSecondaryLabel}
          </Button>
        )}
        {/* One stable node in every state, so focus survives pending and step changes. */}
        {showPrimary && (
          <Button
            type="button"
            onClick={handleNext}
            disabled={!canProceed}
            aria-disabled={primaryLoading || undefined}
            aria-busy={primaryLoading || undefined}
            className={cn('gap-2', primaryLoading && BLOCKED_LOOK)}
          >
            {/* Decorative: the label stays the accessible name; busy state is aria-busy. */}
            {primaryLoading && <Spinner />}
            {primaryIconPosition === 'start' && resolvedPrimaryIcon}
            {isLastStep ? lastStepLabel : nextLabel}
            {primaryIconPosition !== 'start' && resolvedPrimaryIcon}
          </Button>
        )}
      </div>
    </div>
  );
}
