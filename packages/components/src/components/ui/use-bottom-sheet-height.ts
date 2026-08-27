import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

import {
  BOTTOM_SHEET_KEYBOARD_STEP_PX,
  bottomSheetHeightBounds,
  resolveBottomSheetHeight,
  type BottomSheetHeightPx,
} from './bottom-sheet-height';

const IS_DEV = process.env.NODE_ENV !== 'production';

interface DragSession {
  pointerId: number;
  startY: number;
  startEffectiveHeight: number;
}

export interface UseBottomSheetHeightArgs {
  open: boolean;
  height: number;
  onHeightChange: (height: BottomSheetHeightPx) => void;
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
  // eslint-disable-next-line no-console -- design: non-finite height is a warning, not a throw
  console.warn(message);
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

/**
 * Owns clamp, pointer capture, keyboard resize, viewport subscription, and
 * correction reporting. INV-6, INV-7, INV-8, INV-11, INV-12, INV-13, INV-14
 */
export function useBottomSheetHeight({
  open,
  height,
  onHeightChange,
}: UseBottomSheetHeightArgs): UseBottomSheetHeightResult {
  const [viewportHeight, setViewportHeight] = useState<number | undefined>(undefined);
  const [dragging, setDragging] = useState(false);
  const separatorNodeRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragSession | null>(null);
  const lastReportedPairRef = useRef<{ incoming: number; effective: number } | null>(null);
  const lastNonFiniteWarningRef = useRef<number | null>(null);
  const onHeightChangeRef = useRef(onHeightChange);
  onHeightChangeRef.current = onHeightChange;
  const heightRef = useRef(height);
  heightRef.current = height;

  const viewportReady = viewportHeight !== undefined;
  const effectiveHeight = resolveBottomSheetHeight(height, viewportHeight ?? 0);
  const { min: minHeight, max: maxHeight } = bottomSheetHeightBounds(viewportHeight ?? 0);

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
      setViewportHeight(undefined);
      return;
    }

    const onResize = (): void => {
      setViewportHeight(window.innerHeight);
    };

    setViewportHeight(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, [open, endDrag]);

  useLayoutEffect(() => {
    return () => {
      endDrag();
    };
  }, [endDrag]);

  useLayoutEffect(() => {
    if (!open || viewportHeight === undefined) {
      return;
    }

    if (IS_DEV && !Number.isFinite(height)) {
      if (!Object.is(lastNonFiniteWarningRef.current, height)) {
        lastNonFiniteWarningRef.current = height;
        emitDevWarning(
          `[BottomSheet] height must be a finite number. Received ${String(height)}; using defaultBottomSheetHeight(viewport).`
        );
      }
    }

    reportCorrection(height, resolveBottomSheetHeight(height, viewportHeight));
  }, [open, height, viewportHeight, reportCorrection]);

  const proposeHeight = useCallback(
    (proposed: number) => {
      if (viewportHeight === undefined) {
        return;
      }
      reportCorrection(heightRef.current, resolveBottomSheetHeight(proposed, viewportHeight));
    },
    [reportCorrection, viewportHeight]
  );

  const onSeparatorPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!event.isPrimary || viewportHeight === undefined) {
        return;
      }
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }
      event.preventDefault();
      dragRef.current = {
        pointerId: event.pointerId,
        startY: event.clientY,
        startEffectiveHeight: resolveBottomSheetHeight(heightRef.current, viewportHeight),
      };
      setDragging(true);
      if (typeof event.currentTarget.setPointerCapture === 'function') {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    },
    [viewportHeight]
  );

  const onSeparatorPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const session = dragRef.current;
      if (session == null || event.pointerId !== session.pointerId) {
        return;
      }
      proposeHeight(session.startEffectiveHeight + session.startY - event.clientY);
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
      if (viewportHeight === undefined) {
        return;
      }
      const current = resolveBottomSheetHeight(heightRef.current, viewportHeight);
      const bounds = bottomSheetHeightBounds(viewportHeight);

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          proposeHeight(current + BOTTOM_SHEET_KEYBOARD_STEP_PX);
          break;
        case 'ArrowDown':
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
    [proposeHeight, viewportHeight]
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
