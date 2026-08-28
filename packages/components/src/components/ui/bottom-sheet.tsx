import { X } from 'lucide-react';
import * as React from 'react';
import { createPortal } from 'react-dom';

import { cn, logger } from '@openzeppelin/ui-utils';

import { BOTTOM_SHEET_DIAGNOSTIC_SYSTEM, type BottomSheetHeightPx } from './bottom-sheet-height';
import { useBottomSheetHeight } from './use-bottom-sheet-height';

const IS_DEV = process.env.NODE_ENV !== 'production';

const DEFAULT_CLOSE_LABEL = 'Close';
const SEPARATOR_LABEL = 'Resize';

/** CSS custom property published on `<html>` while an `inset` sheet is open. */
export const BOTTOM_SHEET_INSET_PROPERTY = '--bottom-sheet-inset';
/** Attribute set on `<html>` while an `inset` sheet is open; value `'resizing'` during a drag, else `''`. */
export const BOTTOM_SHEET_INSET_ATTRIBUTE = 'data-bottom-sheet-inset';

/**
 * How the sheet relates to the page behind it.
 *
 * - `'overlay'` (default): the sheet floats over the page; nothing else moves.
 * - `'inset'`: the sheet additionally publishes its rendered height as
 *   `--bottom-sheet-inset` on `<html>` (and sets `data-bottom-sheet-inset`) so the
 *   host layout can reserve that space — e.g. `height: calc(100dvh - var(--bottom-sheet-inset, 0px))`
 *   on viewport-height containers. Cleared when the sheet closes or unmounts.
 */
export type BottomSheetLayout = 'overlay' | 'inset';

const SHEET_REGION_CLASSES =
  'pointer-events-auto absolute inset-x-0 bottom-0 z-40 flex flex-col overflow-hidden border-t-2 border-border bg-background shadow-lg';

/** Enter/exit slide. The region stays mounted this long after `open` turns false. */
export const BOTTOM_SHEET_TRANSITION_MS = 200;
const TRANSITION_CLASSES =
  'transition-[translate,opacity,height] duration-200 ease-out motion-reduce:transition-none';
/** While the handle is being dragged the height must track the pointer 1:1. */
const DRAGGING_CLASSES = 'transition-none';
const SHOWN_CLASSES = 'translate-y-0 opacity-100';
const HIDDEN_CLASSES = 'translate-y-full opacity-0';

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
  height: BottomSheetHeightPx;
  onHeightChange: (height: BottomSheetHeightPx) => void;
  /** Accessible name of the close control. Default `'Close'`. */
  closeLabel?: string;
  /**
   * Optional content rendered in the row that holds the close button, above the
   * scrolling body. The row grows to fit it. Omit for the default chrome.
   */
  header?: React.ReactNode;
  /** Overlay the page (default) or publish the height so the host can inset its layout. */
  layout?: BottomSheetLayout;
};

function isNonblank(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function emitDevError(message: string): void {
  // Dev-only diagnostic; production never calls this helper.
  logger.error(BOTTOM_SHEET_DIAGNOSTIC_SYSTEM, message);
}

/**
 * Non-modal bottom sheet. Open and height are always controlled.
 * Does not move focus, lock the document, or present dialog semantics.
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

  const {
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
  } = useBottomSheetHeight({ open, height, onHeightChange });

  React.useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  // The height hook forgets the viewport when `open` turns false; keep the last
  // rendered height so the exit slide, and the host inset under it, have a size
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
    return () => {
      root.style.removeProperty(BOTTOM_SHEET_INSET_PROPERTY);
      root.removeAttribute(BOTTOM_SHEET_INSET_ATTRIBUTE);
    };
  }, [dragging, insetHeight, layout, mounted, open, viewportReady]);

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
        data-state={open ? 'open' : 'closed'}
        className={cn(
          className,
          SHEET_REGION_CLASSES,
          dragging ? DRAGGING_CLASSES : TRANSITION_CLASSES,
          shown && open ? SHOWN_CLASSES : HIDDEN_CLASSES,
          !open && 'pointer-events-none'
        )}
        style={{ height: `${insetHeight}px` }}
        onKeyDown={onRegionKeyDown}
      >
        <div
          ref={assignSeparatorRef}
          role="separator"
          tabIndex={0}
          aria-orientation="horizontal"
          aria-label={SEPARATOR_LABEL}
          aria-controls={regionId}
          aria-valuemin={minHeight}
          aria-valuenow={effectiveHeight}
          aria-valuemax={maxHeight}
          data-slot="bottom-sheet-separator"
          className={cn(
            'flex min-h-11 cursor-ns-resize touch-none items-center justify-center',
            CONTROL_FOCUS_CLASSES
          )}
          onPointerDown={onSeparatorPointerDown}
          onPointerMove={onSeparatorPointerMove}
          onPointerUp={onSeparatorPointerUp}
          onPointerCancel={onSeparatorPointerCancel}
          onKeyDown={onSeparatorKeyDown}
        >
          <div className="flex flex-col gap-1" aria-hidden="true">
            <div className="h-0.5 w-12 rounded-full bg-muted-foreground/30" />
            <div className="h-0.5 w-12 rounded-full bg-muted-foreground/30" />
          </div>
        </div>
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
      </section>
    </div>,
    portalRoot
  );
});

BottomSheet.displayName = 'BottomSheet';
