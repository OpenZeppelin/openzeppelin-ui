/**
 * @vitest-environment node
 *
 * SF-2 · Height utilities — INV-5, INV-6, INV-7 (pure path).
 */
import { describe, expect, it } from 'vitest';

import {
  BOTTOM_SHEET_MIN_HEIGHT_PX,
  bottomSheetHeightBounds,
  clampBottomSheetHeight,
  defaultBottomSheetHeight,
  normalizeViewportHeight,
  resolveBottomSheetHeight,
} from '../../bottom-sheet-height';

describe('INV-5: defaultBottomSheetHeight is deterministic and finite', () => {
  const cases: Array<{ viewport: number; expected: number }> = [
    { viewport: 0, expected: 0 },
    { viewport: 100, expected: 100 },
    { viewport: 159, expected: 159 },
    { viewport: 160, expected: 160 },
    { viewport: 800, expected: 480 },
    { viewport: 1000, expected: 600 },
  ];

  it.each(cases)(
    'returns clamp(0.6 * viewport) for viewport=$viewport',
    ({ viewport, expected }) => {
      expect(defaultBottomSheetHeight(viewport)).toBe(expected);
    }
  );

  it('normalizes negative and non-finite viewport input to 0', () => {
    expect(defaultBottomSheetHeight(-1)).toBe(0);
    expect(defaultBottomSheetHeight(Number.NaN)).toBe(0);
  });

  it('honours a consumer ratio and clamps it like the default', () => {
    expect(defaultBottomSheetHeight(1000, { ratio: 0.5 })).toBe(500);
    expect(defaultBottomSheetHeight(1000, { ratio: 1 })).toBe(1000);
    expect(defaultBottomSheetHeight(200, { ratio: 0.5 })).toBe(160); // floor still applies
  });

  it('falls back to 0.6 for an out-of-range or non-finite ratio', () => {
    for (const ratio of [0, -0.2, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(defaultBottomSheetHeight(1000, { ratio })).toBe(600);
    }
    expect(defaultBottomSheetHeight(1000, {})).toBe(600);
    expect(defaultBottomSheetHeight(Number.POSITIVE_INFINITY)).toBe(0);
    expect(defaultBottomSheetHeight(Number.NEGATIVE_INFINITY)).toBe(0);
  });

  it('returns the same finite value for repeated calls', () => {
    const first = defaultBottomSheetHeight(720);
    const second = defaultBottomSheetHeight(720);
    expect(first).toBe(second);
    expect(Number.isFinite(first)).toBe(true);
  });
});

describe('INV-6: one clamp defines every effective height', () => {
  it('viewport-wins when the viewport is below the nominal floor', () => {
    expect(clampBottomSheetHeight(500, 120)).toBe(120);
    expect(bottomSheetHeightBounds(120)).toEqual({ min: 120, max: 120 });
  });

  it('clamps interior values to [160, viewport] for a tall viewport', () => {
    expect(clampBottomSheetHeight(100, 800)).toBe(160);
    expect(clampBottomSheetHeight(900, 800)).toBe(800);
    expect(clampBottomSheetHeight(400, 800)).toBe(400);
  });

  it('uses the same oracle for default, resolve, and explicit clamp', () => {
    const viewport = 640;
    const raw = 999;
    const oracle = clampBottomSheetHeight(raw, viewport);
    expect(resolveBottomSheetHeight(raw, viewport)).toBe(oracle);
    expect(defaultBottomSheetHeight(viewport)).toBe(
      clampBottomSheetHeight(viewport * 0.6, viewport)
    );
  });

  it('normalizes invalid viewport heights before clamping', () => {
    expect(normalizeViewportHeight(-5)).toBe(0);
    expect(normalizeViewportHeight(Number.NaN)).toBe(0);
    expect(clampBottomSheetHeight(200, Number.NaN)).toBe(0);
  });

  it('keeps the nominal floor constant for documentation', () => {
    expect(BOTTOM_SHEET_MIN_HEIGHT_PX).toBe(160);
  });
});

describe('INV-7: non-finite host height substitutes the default', () => {
  const viewport = 800;
  const expected = defaultBottomSheetHeight(viewport);

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'resolveBottomSheetHeight(%s) returns defaultBottomSheetHeight(viewport)',
    (invalid) => {
      expect(resolveBottomSheetHeight(invalid, viewport)).toBe(expected);
    }
  );
});
