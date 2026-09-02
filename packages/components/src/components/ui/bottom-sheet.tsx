import { X } from 'lucide-react';
import * as React from 'react';
import { createPortal } from 'react-dom';

import { cn, logger } from '@openzeppelin/ui-utils';

import {
  BOTTOM_SHEET_DIAGNOSTIC_SYSTEM,
  type BottomSheetHeightPx,
  type BottomSheetSide,
} from './bottom-sheet-height';
import { useBottomSheetHeight } from './use-bottom-sheet-height';

export type { BottomSheetSide } from './bottom-sheet-height';

const IS_DEV = process.env.NODE_ENV !== 'production';

const DEFAULT_CLOSE_LABEL = 'Close';
const SEPARATOR_LABEL = 'Resize';

/** CSS custom property published on `<html>` while an `inset` sheet is open. */
export const BOTTOM_SHEET_INSET_PROPERTY = '--bottom-sheet-inset';
/** Attribute set on `<html>` while an `inset` sheet is open; value `'resizing'` during a drag, else `''`. */
export const BOTTOM_SHEET_INSET_ATTRIBUTE = 'data-bottom-sheet-inset';
/** Attribute set on `<html>` while an `inset` sheet is open; matches the docked edge. */
export const BOTTOM_SHEET_SIDE_ATTRIBUTE = 'data-bottom-sheet-side';

/**
 * How the sheet relates to the page behind it.
 *
 * - `'overlay'` (default): the sheet floats over the page; nothing else moves.
 * - `'inset'`: the sheet additionally publishes its rendered size as
 *   `--bottom-sheet-inset` on `<html>` (and sets `data-bottom-sheet-inset`) so the
 *   host layout can reserve that space — e.g. `height: calc(100dvh - var(--bottom-sheet-inset, 0px))`
 *   on viewport-height containers. Cleared when the sheet closes or unmounts.
 */
export type BottomSheetLayout = 'overlay' | 'inset';

function isHorizontalSide(side: BottomSheetSide): boolean {
  return side === 'left' || side === 'right';
}

const SHEET_REGION_BASE =
  'pointer-events-auto absolute z-40 overflow-hidden border-border bg-background shadow-lg';

const SIDE_REGION_CLASSES: Record<BottomSheetSide, string> = {
  bottom: 'inset-x-0 bottom-0 flex flex-col border-t-2',
  top: 'inset-x-0 top-0 flex flex-col-reverse border-b-2',
  left: 'inset-y-0 left-0 flex flex-row-reverse border-r-2',
  right: 'inset-y-0 right-0 flex flex-row border-l-2',
};

/** Enter/exit slide. The region stays mounted this long after `open` turns false. */
export const BOTTOM_SHEET_TRANSITION_MS = 200;

const TRANSITION_CLASSES_BLOCK =
  'transition-[translate,opacity,height] duration-200 ease-out motion-reduce:transition-none';
const TRANSITION_CLASSES_INLINE =
  'transition-[translate,opacity,width] duration-200 ease-out motion-reduce:transition-none';
/** While the handle is being dragged the size must track the pointer 1:1. */
const DRAGGING_CLASSES = 'transition-none';
const SHOWN_CLASSES = 'translate-x-0 translate-y-0 opacity-100';

const HIDDEN_CLASSES: Record<BottomSheetSide, string> = {
  bottom: 'translate-y-full opacity-0',
  top: '-translate-y-full opacity-0',
  left: '-translate-x-full opacity-0',
  right: 'translate-x-full opacity-0',
};

const LAYER_CLASSES = 'pointer-events-none fixed inset-0 z-40';

const CONTROL_FOCUS_CLASSES =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

type AccessibleName =
  | { 'aria-label': string; 'aria-labelledby'?: undefined }
  | { 'aria-labelledby': string; 'aria-label'?: undefined };

export type BottomSheetProps = AccessibleName & {
  children: React.ReactNode;
  className?: string;
  id?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Perpendicular size in px. Named `height` for back-compat; on left/right docks
   * this is the sheet width.
   */
  height: BottomSheetHeightPx;
  onHeightChange: (height: BottomSheetHeightPx) => void;
  /** Accessible name of the close control. Default `'Close'`. */
  closeLabel?: string;
  /**
   * Optional content rendered in the row that holds the close button, above the
   * scrolling body. The row grows to fit it. Omit for the default chrome.
   */
  header?: React.ReactNode;
  /** Overlay the page (default) or publish the size so the host can inset its layout. */
  layout?: BottomSheetLayout;
  /**
   * Edge the sheet docks to. Default `'bottom'`.
   * Drives region placement, separator orientation, slide axis, and
   * `data-bottom-sheet-side` on `<html>` while inset+mounted.
   */
  side?: BottomSheetSide;
  /**
   * Optional ceiling below the axis viewport (e.g. leave room for a form).
   * Effective max is `min(axisViewport, maxHeight)`.
   */
  maxHeight?: number;
};

function isNonblank(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function emitDevError(message: string): void {
  // Dev-only diagnostic; production never calls this helper.
  logger.error(BOTTOM_SHEET_DIAGNOSTIC_SYSTEM, message);
}

/**
 * Non-modal docked sheet. Open and size are always controlled.
 * Does not move focus, lock the document, or present dialog semantics.
 * The portal layer is `pointer-events-none`; only the region is interactive.
 */
export const BottomSheet = React.forwardRef<HTMLElement, BottomSheetProps>(function BottomSheet(
  {
    children,
    className,
    id,
    open,
    onOpenChange,
    height,
    onHeightChange,
    closeLabel,
    header,
    layout = 'overlay',
    side = 'bottom',
    maxHeight,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
  },
  forwardedRef
) {
  const generatedId = React.useId();
  const regionId = isNonblank(id) ? id : generatedId;
  const [portalRoot, setPortalRoot] = React.useState<HTMLElement | null>(null);
  // Presence: keep the region mounted through the exit slide, and start the enter
  // slide from the hidden position on the frame after mount.
  const [mounted, setMounted] = React.useState(open);
  const [shown, setShown] = React.useState(false);
  const lastHeightRef = React.useRef(0);
  const nameIssueRef = React.useRef<string | null>(null);
  const missingTargetRef = React.useRef<string | null>(null);
  const onOpenChangeRef = React.useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const horizontal = isHorizontalSide(side);

  const {
    effectiveHeight,
    minHeight,
    maxHeight: resolvedMax,
    viewportReady,
    dragging,
    assignSeparatorRef,
    onSeparatorPointerDown,
    onSeparatorPointerMove,
    onSeparatorPointerUp,
    onSeparatorPointerCancel,
    onSeparatorKeyDown,
  } = useBottomSheetHeight({ open, height, onHeightChange, side, maxHeight });

  React.useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  // The height hook forgets the viewport when `open` turns false; keep the last
  // rendered size so the exit slide, and the host inset under it, have a size
  // to hold until the region unmounts.
  if (open && viewportReady) {
    lastHeightRef.current = effectiveHeight;
  }
  const insetHeight = open ? effectiveHeight : lastHeightRef.current;

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }
    setShown(false);
    const timer = setTimeout(() => setMounted(false), BOTTOM_SHEET_TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [open]);

  // Keyed on `mounted`, not `open`: the region stays on screen for the exit
  // slide, and dropping the inset on the first close frame pulled the host's
  // layout up under a sheet that was still there. The variable is published for
  // as long as something is rendered over the host, and `insetHeight` follows
  // the same last-known value the region is rendered at.
  React.useEffect(() => {
    if (layout !== 'inset' || !mounted || (open && !viewportReady)) {
      return;
    }
    const root = document.documentElement;
    root.style.setProperty(BOTTOM_SHEET_INSET_PROPERTY, `${insetHeight}px`);
    // Value is 'resizing' during a pointer drag so hosts can suspend a height
    // transition and track the handle 1:1; otherwise empty.
    root.setAttribute(BOTTOM_SHEET_INSET_ATTRIBUTE, dragging ? 'resizing' : '');
    root.setAttribute(BOTTOM_SHEET_SIDE_ATTRIBUTE, side);
    return () => {
      root.style.removeProperty(BOTTOM_SHEET_INSET_PROPERTY);
      root.removeAttribute(BOTTOM_SHEET_INSET_ATTRIBUTE);
      root.removeAttribute(BOTTOM_SHEET_SIDE_ATTRIBUTE);
    };
  }, [dragging, insetHeight, layout, mounted, open, side, viewportReady]);

  React.useEffect(() => {
    if (!IS_DEV || !open || portalRoot == null) {
      return;
    }

    const hasLabel = isNonblank(ariaLabel);
    const hasLabelledBy = isNonblank(ariaLabelledBy);
    let issue: string | null = null;
    if (hasLabel && hasLabelledBy) {
      issue = 'both';
    } else if (!hasLabel && !hasLabelledBy) {
      issue = 'missing';
    }

    if (issue != null && nameIssueRef.current !== issue) {
      nameIssueRef.current = issue;
      emitDevError(
        'Accessible name required: provide exactly one of a nonblank aria-label or aria-labelledby.'
      );
    }
  }, [ariaLabel, ariaLabelledBy, open, portalRoot]);

  React.useEffect(() => {
    if (!IS_DEV || !open || portalRoot == null || !isNonblank(ariaLabelledBy)) {
      return;
    }

    if (
      document.getElementById(ariaLabelledBy) == null &&
      missingTargetRef.current !== ariaLabelledBy
    ) {
      missingTargetRef.current = ariaLabelledBy;
      emitDevError(
        `aria-labelledby="${ariaLabelledBy}" does not match any element in the document.`
      );
    }
  }, [ariaLabelledBy, open, portalRoot]);

  const resolvedCloseLabel = isNonblank(closeLabel) ? closeLabel : DEFAULT_CLOSE_LABEL;
  const namedLabel = isNonblank(ariaLabel) ? ariaLabel : undefined;
  const namedBy = isNonblank(ariaLabelledBy) ? ariaLabelledBy : undefined;

  const onRegionKeyDown = (event: React.KeyboardEvent<HTMLElement>): void => {
    if (event.key !== 'Escape' || event.defaultPrevented) {
      return;
    }
    event.preventDefault();
    onOpenChangeRef.current(false);
  };

  const onCloseClick = (): void => {
    onOpenChangeRef.current(false);
  };

  if (portalRoot == null || !mounted || (open && !viewportReady)) {
    return null;
  }

  const hasHeader = header != null && header !== false;
  const sizeStyle = horizontal
    ? ({ width: `${insetHeight}px` } as const)
    : ({ height: `${insetHeight}px` } as const);

  const closeButton = (
    <button
      type="button"
      data-slot="bottom-sheet-close"
      aria-label={resolvedCloseLabel}
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground',
        CONTROL_FOCUS_CLASSES
      )}
      onClick={onCloseClick}
    >
      <X className="size-4" aria-hidden="true" />
    </button>
  );

  return createPortal(
    <div className={LAYER_CLASSES} data-slot="bottom-sheet-layer">
      <section
        ref={forwardedRef}
        id={regionId}
        aria-label={namedLabel}
        aria-labelledby={namedBy}
        data-slot="bottom-sheet"
        data-side={side}
        data-state={open ? 'open' : 'closed'}
        className={cn(
          className,
          SHEET_REGION_BASE,
          SIDE_REGION_CLASSES[side],
          dragging
            ? DRAGGING_CLASSES
            : horizontal
              ? TRANSITION_CLASSES_INLINE
              : TRANSITION_CLASSES_BLOCK,
          shown && open ? SHOWN_CLASSES : HIDDEN_CLASSES[side],
          !open && 'pointer-events-none'
        )}
        style={sizeStyle}
        onKeyDown={onRegionKeyDown}
      >
        <div
          ref={assignSeparatorRef}
          role="separator"
          tabIndex={0}
          aria-orientation={horizontal ? 'vertical' : 'horizontal'}
          aria-label={SEPARATOR_LABEL}
          aria-controls={regionId}
          aria-valuemin={minHeight}
          aria-valuenow={effectiveHeight}
          aria-valuemax={resolvedMax}
          data-slot="bottom-sheet-separator"
          className={cn(
            'flex shrink-0 touch-none items-center justify-center',
            horizontal
              ? 'min-w-11 cursor-ew-resize flex-col self-stretch'
              : 'min-h-11 w-full cursor-ns-resize',
            CONTROL_FOCUS_CLASSES
          )}
          onPointerDown={onSeparatorPointerDown}
          onPointerMove={onSeparatorPointerMove}
          onPointerUp={onSeparatorPointerUp}
          onPointerCancel={onSeparatorPointerCancel}
          onKeyDown={onSeparatorKeyDown}
        >
          <div
            className={cn('flex gap-1', horizontal ? 'flex-row' : 'flex-col')}
            aria-hidden="true"
          >
            <div
              className={cn(
                'rounded-full bg-muted-foreground/30',
                horizontal ? 'h-12 w-0.5' : 'h-0.5 w-12'
              )}
            />
            <div
              className={cn(
                'rounded-full bg-muted-foreground/30',
                horizontal ? 'h-12 w-0.5' : 'h-0.5 w-12'
              )}
            />
          </div>
        </div>
        <div
          data-slot="bottom-sheet-chrome"
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        >
          {hasHeader ? (
            <div className="flex shrink-0 items-start gap-2 pr-2 pl-4">
              <div
                data-slot="bottom-sheet-header"
                className="flex min-h-11 min-w-0 flex-1 items-center py-1"
              >
                {header}
              </div>
              {closeButton}
            </div>
          ) : (
            <div className="flex shrink-0 justify-end px-2">{closeButton}</div>
          )}
          <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        </div>
      </section>
    </div>,
    portalRoot
  );
});

BottomSheet.displayName = 'BottomSheet';
