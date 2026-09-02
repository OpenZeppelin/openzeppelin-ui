/**
 * Pixel height after clamp. Documenting alias only. Not branded.
 * Hosts pass a number. The component does not enforce units at the type level.
 */
export type BottomSheetHeightPx = number;

/** Edge the sheet docks to. Default `'bottom'` preserves pre-side call sites. */
export type BottomSheetSide = 'top' | 'right' | 'bottom' | 'left';

/** Subsystem name every BottomSheet dev diagnostic is logged under. Internal. */
export const BOTTOM_SHEET_DIAGNOSTIC_SYSTEM = 'BottomSheet';

/** Floor used when the viewport is at least this tall. Internal. */
export const BOTTOM_SHEET_MIN_HEIGHT_PX = 160;

/** Keyboard resize step in pixels. Internal. */
export const BOTTOM_SHEET_KEYBOARD_STEP_PX = 16;

/** Default share of the viewport a freshly opened sheet takes. */
export const BOTTOM_SHEET_DEFAULT_HEIGHT_RATIO = 0.6;

export interface DefaultBottomSheetHeightOptions {
  /**
   * Share of the viewport height to seed with, in `(0, 1]`.
   * Defaults to `BOTTOM_SHEET_DEFAULT_HEIGHT_RATIO` (0.6). Values outside the range,
   * or non-finite, fall back to the default so the helper stays total.
   */
  ratio?: number;
}

function resolveRatio(ratio: number | undefined): number {
  if (ratio === undefined || !Number.isFinite(ratio) || ratio <= 0 || ratio > 1) {
    return BOTTOM_SHEET_DEFAULT_HEIGHT_RATIO;
  }
  return ratio;
}

/**
 * Invalid and negative viewport values become 0 so the public helper stays total.
 * INV-5
 */
export function normalizeViewportHeight(viewportHeightPx: number): number {
  if (!Number.isFinite(viewportHeightPx) || viewportHeightPx < 0) {
    return 0;
  }
  return viewportHeightPx;
}

/**
 * Viewport-wins clamp: effective height is always in
 * `[min(160, viewport), viewport]` for a finite nonnegative viewport.
 * INV-6
 */
export function clampBottomSheetHeight(
  heightPx: number,
  viewportHeightPx: number
): BottomSheetHeightPx {
  const viewport = normalizeViewportHeight(viewportHeightPx);
  const floor = Math.min(BOTTOM_SHEET_MIN_HEIGHT_PX, viewport);
  const ceiling = viewport;
  return Math.min(ceiling, Math.max(floor, heightPx));
}

/** Effective lower and upper bounds for the current viewport. INV-6, INV-18 */
export function bottomSheetHeightBounds(viewportHeightPx: number): {
  min: number;
  max: number;
} {
  const viewport = normalizeViewportHeight(viewportHeightPx);
  return {
    min: Math.min(BOTTOM_SHEET_MIN_HEIGHT_PX, viewport),
    max: viewport,
  };
}

/**
 * Canonical default: clamp of `ratio * viewport` (ratio defaults to 0.6).
 * INV-5, INV-6
 */
export function defaultBottomSheetHeight(
  viewportHeightPx: number,
  options?: DefaultBottomSheetHeightOptions
): BottomSheetHeightPx {
  const viewport = normalizeViewportHeight(viewportHeightPx);
  return clampBottomSheetHeight(viewport * resolveRatio(options?.ratio), viewport);
}

/**
 * Maps a host height prop onto a finite effective height.
 * Non-finite values are not clamped; they are replaced by the default.
 * INV-6, INV-7
 */
export function resolveBottomSheetHeight(
  heightPx: number,
  viewportHeightPx: number
): BottomSheetHeightPx {
  const viewport = normalizeViewportHeight(viewportHeightPx);
  if (!Number.isFinite(heightPx)) {
    return defaultBottomSheetHeight(viewport);
  }
  return clampBottomSheetHeight(heightPx, viewport);
}
