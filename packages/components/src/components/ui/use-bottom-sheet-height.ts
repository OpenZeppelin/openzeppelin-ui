import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

import { logger } from '@openzeppelin/ui-utils';

import {
  BOTTOM_SHEET_DIAGNOSTIC_SYSTEM,
  BOTTOM_SHEET_KEYBOARD_STEP_PX,
  bottomSheetHeightBounds,
  resolveBottomSheetHeight,
  type BottomSheetHeightPx,
  type BottomSheetSide,
} from './bottom-sheet-height';

const IS_DEV = process.env.NODE_ENV !== 'production';

interface DragSession {
  pointerId: number;
  startCoord: number;
  startEffectiveHeight: number;
  /** +1 when increasing the pointer coord grows the sheet; −1 otherwise. */
  growSign: number;
}

export interface UseBottomSheetHeightArgs {
  open: boolean;
  height: number;
  onHeightChange: (height: BottomSheetHeightPx) => void;
  /** Dock edge; selects axis viewport and drag/keyboard direction. Default bottom. */
  side?: BottomSheetSide;
  /** Optional ceiling below the axis viewport. */
  maxHeight?: number;
}

export interface UseBottomSheetHeightResult {
  effectiveHeight: BottomSheetHeightPx;
  minHeight: number;
  maxHeight: number;
  viewportReady: boolean;
  /** True while a pointer drag on the separator is in progress. */
  dragging: boolean;
  assignSeparatorRef: (node: HTMLDivElement | null) => void;
  onSeparatorPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onSeparatorPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onSeparatorPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onSeparatorPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
  onSeparatorKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

function emitDevWarning(message: string): void {
  // Dev-only diagnostic; production never calls this helper.
  logger.warn(BOTTOM_SHEET_DIAGNOSTIC_SYSTEM, message);
}

function releasePointerCapture(node: HTMLDivElement | null, pointerId: number): void {
  if (node == null || typeof node.releasePointerCapture !== 'function') {
    return;
  }
  const held = typeof node.hasPointerCapture !== 'function' || node.hasPointerCapture(pointerId);
  if (held) {
    node.releasePointerCapture(pointerId);
  }
}

function isHorizontalSide(side: BottomSheetSide): boolean {
  return side === 'left' || side === 'right';
}

function readAxisViewport(side: BottomSheetSide): number {
  return isHorizontalSide(side) ? window.innerWidth : window.innerHeight;
}

/** Dragging the handle toward the viewport centre grows the sheet. */
function growSignForSide(side: BottomSheetSide): number {
  switch (side) {
    case 'bottom':
    case 'right':
      return -1;
    case 'top':
    case 'left':
      return 1;
  }
}

function resolveCeiling(axisViewport: number, maxHeight: number | undefined): number {
  if (maxHeight === undefined || !Number.isFinite(maxHeight) || maxHeight < 0) {
    return axisViewport;
  }
  return Math.min(axisViewport, maxHeight);
}

/**
 * Owns clamp, pointer capture, keyboard resize, viewport subscription, and
 * correction reporting. INV-6, INV-7, INV-8, INV-11, INV-12, INV-13, INV-14
 */
export function useBottomSheetHeight({
  open,
  height,
  onHeightChange,
  side = 'bottom',
  maxHeight: maxHeightProp,
}: UseBottomSheetHeightArgs): UseBottomSheetHeightResult {
  const [viewportSpan, setViewportSpan] = useState<number | undefined>(undefined);
  const [dragging, setDragging] = useState(false);
  const separatorNodeRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragSession | null>(null);
  const lastReportedPairRef = useRef<{ incoming: number; effective: number } | null>(null);
  const lastNonFiniteWarningRef = useRef<number | null>(null);
  const onHeightChangeRef = useRef(onHeightChange);
  onHeightChangeRef.current = onHeightChange;
  const heightRef = useRef(height);
  heightRef.current = height;
  const sideRef = useRef(side);
  sideRef.current = side;

  const ceiling = viewportSpan === undefined ? 0 : resolveCeiling(viewportSpan, maxHeightProp);
  const viewportReady = viewportSpan !== undefined;
  const effectiveHeight = resolveBottomSheetHeight(height, ceiling);
  const { min: minHeight, max: maxHeight } = bottomSheetHeightBounds(ceiling);

  const reportCorrection = useCallback((incoming: number, effective: number) => {
    // INV-8: skip when already in sync; dedupe on the pair, not incoming alone.
    if (Object.is(incoming, effective)) {
      return;
    }
    const last = lastReportedPairRef.current;
    if (
      last != null &&
      Object.is(last.incoming, incoming) &&
      Object.is(last.effective, effective)
    ) {
      return;
    }
    lastReportedPairRef.current = { incoming, effective };
    onHeightChangeRef.current(effective);
  }, []);

  const endDrag = useCallback(() => {
    const session = dragRef.current;
    if (session == null) {
      return;
    }
    dragRef.current = null;
    setDragging(false);
    releasePointerCapture(separatorNodeRef.current, session.pointerId);
  }, []);

  const assignSeparatorRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node == null) {
        // Release capture on the still-held node before dropping the ref. INV-13
        endDrag();
        separatorNodeRef.current = null;
        return;
      }
      separatorNodeRef.current = node;
    },
    [endDrag]
  );

  useLayoutEffect(() => {
    if (!open) {
      endDrag();
      setViewportSpan(undefined);
      return;
    }

    const onResize = (): void => {
      setViewportSpan(readAxisViewport(sideRef.current));
    };

    setViewportSpan(readAxisViewport(side));
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, [open, side, endDrag]);

  useLayoutEffect(() => {
    return () => {
      endDrag();
    };
  }, [endDrag]);

  useLayoutEffect(() => {
    if (!open || viewportSpan === undefined) {
      return;
    }

    if (IS_DEV && !Number.isFinite(height)) {
      if (!Object.is(lastNonFiniteWarningRef.current, height)) {
        lastNonFiniteWarningRef.current = height;
        emitDevWarning(
          `height must be a finite number. Received ${String(height)}; using defaultBottomSheetHeight(viewport).`
        );
      }
    }

    const span = resolveCeiling(viewportSpan, maxHeightProp);
    reportCorrection(height, resolveBottomSheetHeight(height, span));
  }, [open, height, viewportSpan, maxHeightProp, reportCorrection]);

  const proposeHeight = useCallback(
    (proposed: number) => {
      if (viewportSpan === undefined) {
        return;
      }
      const span = resolveCeiling(viewportSpan, maxHeightProp);
      reportCorrection(heightRef.current, resolveBottomSheetHeight(proposed, span));
    },
    [reportCorrection, viewportSpan, maxHeightProp]
  );

  const onSeparatorPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!event.isPrimary || viewportSpan === undefined) {
        return;
      }
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }
      event.preventDefault();
      const currentSide = sideRef.current;
      const span = resolveCeiling(viewportSpan, maxHeightProp);
      const coord = isHorizontalSide(currentSide) ? event.clientX : event.clientY;
      dragRef.current = {
        pointerId: event.pointerId,
        startCoord: coord,
        startEffectiveHeight: resolveBottomSheetHeight(heightRef.current, span),
        growSign: growSignForSide(currentSide),
      };
      setDragging(true);
      if (typeof event.currentTarget.setPointerCapture === 'function') {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    },
    [viewportSpan, maxHeightProp]
  );

  const onSeparatorPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const session = dragRef.current;
      if (session == null || event.pointerId !== session.pointerId) {
        return;
      }
      const currentSide = sideRef.current;
      const coord = isHorizontalSide(currentSide) ? event.clientX : event.clientY;
      proposeHeight(session.startEffectiveHeight + session.growSign * (coord - session.startCoord));
    },
    [proposeHeight]
  );

  const onSeparatorPointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const session = dragRef.current;
      if (session == null || event.pointerId !== session.pointerId) {
        return;
      }
      endDrag();
    },
    [endDrag]
  );

  const onSeparatorPointerCancel = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const session = dragRef.current;
      if (session == null || event.pointerId !== session.pointerId) {
        return;
      }
      endDrag();
    },
    [endDrag]
  );

  const onSeparatorKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (viewportSpan === undefined) {
        return;
      }
      const span = resolveCeiling(viewportSpan, maxHeightProp);
      const current = resolveBottomSheetHeight(heightRef.current, span);
      const bounds = bottomSheetHeightBounds(span);
      const currentSide = sideRef.current;
      const horizontal = isHorizontalSide(currentSide);

      const growKey = horizontal
        ? currentSide === 'left'
          ? 'ArrowRight'
          : 'ArrowLeft'
        : currentSide === 'top'
          ? 'ArrowDown'
          : 'ArrowUp';
      const shrinkKey = horizontal
        ? currentSide === 'left'
          ? 'ArrowLeft'
          : 'ArrowRight'
        : currentSide === 'top'
          ? 'ArrowUp'
          : 'ArrowDown';

      switch (event.key) {
        case growKey:
          event.preventDefault();
          proposeHeight(current + BOTTOM_SHEET_KEYBOARD_STEP_PX);
          break;
        case shrinkKey:
          event.preventDefault();
          proposeHeight(current - BOTTOM_SHEET_KEYBOARD_STEP_PX);
          break;
        case 'Home':
          event.preventDefault();
          proposeHeight(bounds.min);
          break;
        case 'End':
          event.preventDefault();
          proposeHeight(bounds.max);
          break;
        default:
          break;
      }
    },
    [proposeHeight, viewportSpan, maxHeightProp]
  );

  return {
    effectiveHeight,
    minHeight,
    maxHeight,
    viewportReady,
    dragging,
    assignSeparatorRef,
    onSeparatorPointerDown,
    onSeparatorPointerMove,
    onSeparatorPointerUp,
    onSeparatorPointerCancel,
    onSeparatorKeyDown,
  };
}
