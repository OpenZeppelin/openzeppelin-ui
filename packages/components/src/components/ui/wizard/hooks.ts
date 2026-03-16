import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

interface StepWithId {
  id: string;
}

interface UseScrollableWizardStepTrackingOptions<TStep extends StepWithId> {
  steps: TStep[];
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
  sectionId: (stepId: string) => string;
}

/**
 * Clamp a step index into the valid range for the current wizard.
 */
export function getSafeStepIndex(stepCount: number, currentStepIndex: number) {
  if (stepCount === 0) return 0;

  return Math.max(0, Math.min(currentStepIndex, stepCount - 1));
}

/**
 * Track the highest step reached unless a controlled value is provided.
 */
export function useFurthestStepIndex(
  currentStepIndex: number,
  controlledFurthestStepIndex?: number
) {
  const [internalFurthestStepIndex, setInternalFurthestStepIndex] = useState(currentStepIndex);

  useEffect(() => {
    setInternalFurthestStepIndex((prev) => Math.max(prev, currentStepIndex));
  }, [currentStepIndex]);

  return controlledFurthestStepIndex ?? internalFurthestStepIndex;
}

/**
 * Keep the scrollable wizard's active and visited step state in sync with scrolling and clicks.
 */
export function useScrollableWizardStepTracking<TStep extends StepWithId>({
  steps,
  currentStepIndex,
  onStepChange,
  scrollRef,
  sectionId,
}: UseScrollableWizardStepTrackingOptions<TStep>) {
  const safeIndex = getSafeStepIndex(steps.length, currentStepIndex);
  const initialIndexRef = useRef(safeIndex);
  const rafRef = useRef<number | null>(null);
  const manualSelectionIndexRef = useRef<number | null>(null);

  // Keep a ref to the latest steps/sectionId/onStepChange so the scroll
  // handler always uses fresh values without being a dependency.
  const stepsRef = useRef(steps);
  const sectionIdRef = useRef(sectionId);
  const onStepChangeRef = useRef(onStepChange);
  useEffect(() => {
    stepsRef.current = steps;
    sectionIdRef.current = sectionId;
    onStepChangeRef.current = onStepChange;
  });

  const [activeIndex, setActiveIndex] = useState(initialIndexRef.current);
  const activeIndexRef = useRef(initialIndexRef.current);
  const [furthestStepIndex, setFurthestStepIndex] = useState(initialIndexRef.current);

  const clearManualSelection = useCallback(() => {
    manualSelectionIndexRef.current = null;
  }, []);

  // Wire up scroll tracking once, against the stable scrollRef.
  // Steps/sectionId changes are consumed via refs so this effect never
  // re-runs (and never inadvertently clears the manual selection lock).
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const ownerDocument = container.ownerDocument;

    const releaseManualSelectionOnUserScroll = () => {
      clearManualSelection();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isScrollableNavigationKey(event)) {
        clearManualSelection();
      }
    };

    let isMounted = false;

    const handleScroll = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const currentSteps = stepsRef.current;
        const currentSectionId = sectionIdRef.current;
        const currentOnStepChange = onStepChangeRef.current;

        if (currentSteps.length === 0) return;

        const manualSelectionIndex = manualSelectionIndexRef.current;
        const naturalState = resolveScrollableActiveIndex(
          container,
          currentSteps,
          currentSectionId
        );
        const naturalActiveIndex = naturalState.activeIndex;
        const newActiveIndex = manualSelectionIndex ?? naturalActiveIndex;
        const shouldCommitFurthestStepIndex =
          manualSelectionIndex !== null ? true : naturalState.commitFurthestStepIndex;

        const prevActiveIndex = activeIndexRef.current;
        if (prevActiveIndex !== newActiveIndex) {
          activeIndexRef.current = newActiveIndex;
          setActiveIndex(newActiveIndex);
          // Only notify the parent after the initial mount scroll so we don't
          // call setState on a sibling component during the commit phase.
          if (isMounted) currentOnStepChange(newActiveIndex);
        } else {
          setActiveIndex(newActiveIndex);
        }
        if (shouldCommitFurthestStepIndex) {
          setFurthestStepIndex((prev) => Math.max(prev, newActiveIndex));
        }
        rafRef.current = null;
      });
    };

    container.addEventListener('wheel', releaseManualSelectionOnUserScroll, { passive: true });
    container.addEventListener('touchmove', releaseManualSelectionOnUserScroll, { passive: true });
    ownerDocument.addEventListener('keydown', handleKeyDown);
    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    isMounted = true;

    return () => {
      isMounted = false;
      container.removeEventListener('wheel', releaseManualSelectionOnUserScroll);
      container.removeEventListener('touchmove', releaseManualSelectionOnUserScroll);
      ownerDocument.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('scroll', handleScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // Intentionally only re-run when the scroll container itself changes.
    // steps/sectionId/onStepChange are consumed via refs above.
  }, [clearManualSelection, scrollRef]);

  const scrollToSection = useCallback(
    (index: number) => {
      const step = stepsRef.current[index];
      if (!step) return;

      manualSelectionIndexRef.current = index;
      activeIndexRef.current = index;
      setActiveIndex(index);
      setFurthestStepIndex((prev) => Math.max(prev, index));
      onStepChangeRef.current(index);

      const sectionElement = scrollRef.current?.querySelector<HTMLElement>(
        `#${CSS.escape(sectionIdRef.current(step.id))}`
      );
      sectionElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [scrollRef]
  );

  return {
    activeIndex,
    furthestStepIndex,
    scrollToSection,
  };
}

function resolveScrollableActiveIndex<TStep extends StepWithId>(
  container: HTMLDivElement,
  steps: TStep[],
  sectionId: (stepId: string) => string
) {
  if (steps.length === 0) {
    return {
      activeIndex: 0,
      commitFurthestStepIndex: false,
    };
  }

  const containerRect = container.getBoundingClientRect();
  const anchorY = containerRect.top + Math.min(containerRect.height * 0.35, 220);
  const isScrollable = container.scrollHeight > container.clientHeight + 1;
  const isAtBottom =
    isScrollable && container.scrollTop + container.clientHeight >= container.scrollHeight - 1;
  const isNearBottom =
    isScrollable && container.scrollTop + container.clientHeight >= container.scrollHeight - 4;

  if (isAtBottom) {
    return {
      activeIndex: steps.length - 1,
      commitFurthestStepIndex: false,
    };
  }

  let activeIndex = 0;
  let highestScore = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < steps.length; i++) {
    const sectionMetrics = getSectionMetrics(container, steps[i].id, sectionId);
    if (!sectionMetrics) continue;

    const score = scoreScrollableStep({
      stepIndex: i,
      stepCount: steps.length,
      containerRect,
      anchorY,
      isNearBottom,
      ...sectionMetrics,
    });

    if (score >= highestScore) {
      highestScore = score;
      activeIndex = i;
    }
  }

  return {
    activeIndex,
    commitFurthestStepIndex: true,
  };
}

function getSectionElement(
  container: HTMLDivElement,
  stepId: string,
  sectionId: (stepId: string) => string
) {
  return container.querySelector<HTMLElement>(`#${CSS.escape(sectionId(stepId))}`);
}

function getSectionMetrics(
  container: HTMLDivElement,
  stepId: string,
  sectionId: (stepId: string) => string
) {
  const sectionElement = getSectionElement(container, stepId, sectionId);
  if (!sectionElement) return null;

  const sectionRect = sectionElement.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  return {
    sectionRect,
    visibleHeight: getVisibleHeight(containerRect, sectionRect),
  };
}

function getVisibleHeight(containerRect: DOMRect, sectionRect: DOMRect) {
  return Math.max(
    0,
    Math.min(sectionRect.bottom, containerRect.bottom) -
      Math.max(sectionRect.top, containerRect.top)
  );
}

function scoreScrollableStep({
  stepIndex,
  stepCount,
  containerRect,
  sectionRect,
  visibleHeight,
  anchorY,
  isNearBottom,
}: {
  stepIndex: number;
  stepCount: number;
  containerRect: DOMRect;
  sectionRect: DOMRect;
  visibleHeight: number;
  anchorY: number;
  isNearBottom: boolean;
}) {
  const isVisible = visibleHeight > 0;
  const focusBandTop = containerRect.top + Math.min(containerRect.height * 0.2, 140);
  const focusBandBottom = containerRect.top + Math.min(containerRect.height * 0.55, 360);
  const focusBandOverlap = getBandOverlapHeight(sectionRect, focusBandTop, focusBandBottom);
  const distanceToFocusBand =
    focusBandOverlap > 0
      ? 0
      : Math.min(
          Math.abs(sectionRect.top - focusBandBottom),
          Math.abs(sectionRect.bottom - focusBandTop)
        );
  const isLastStep = stepIndex === stepCount - 1;
  const lastStepProminent =
    isLastStep &&
    visibleHeight >= Math.min(sectionRect.height, containerRect.height) * 0.25 &&
    sectionRect.top <= containerRect.top + containerRect.height * 0.65;

  let score = isVisible ? visibleHeight : Number.NEGATIVE_INFINITY;

  if (focusBandOverlap > 0) score += 12_000 + focusBandOverlap * 25;
  if (sectionRect.top <= anchorY) score += 250;
  score += Math.max(0, 1_000 - distanceToFocusBand);

  if (isNearBottom && lastStepProminent && isVisible) score += 15_000;

  return score;
}

function getBandOverlapHeight(sectionRect: DOMRect, bandTop: number, bandBottom: number) {
  return Math.max(0, Math.min(sectionRect.bottom, bandBottom) - Math.max(sectionRect.top, bandTop));
}

function isScrollableNavigationKey(event: KeyboardEvent) {
  if (event.metaKey || event.ctrlKey || event.altKey) return false;

  return ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key);
}
