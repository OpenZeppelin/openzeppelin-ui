/**
 * @vitest-environment jsdom
 *
 * SF-2 · `layout` prop — `'inset'` publishes the rendered height on `<html>` so the
 * host can shrink its layout; `'overlay'` (default) touches nothing.
 */
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  BOTTOM_SHEET_INSET_ATTRIBUTE,
  BOTTOM_SHEET_INSET_PROPERTY,
  BOTTOM_SHEET_TRANSITION_MS,
  BottomSheet,
  type BottomSheetLayout,
} from '../../bottom-sheet';
import { cleanupBottomSheetTests, DEFAULT_VIEWPORT_HEIGHT, mockViewportHeight } from './helpers';

function Sheet(props: { open: boolean; height: number; layout?: BottomSheetLayout }) {
  return (
    <BottomSheet
      aria-label="Preview"
      open={props.open}
      height={props.height}
      onOpenChange={() => {}}
      onHeightChange={() => {}}
      layout={props.layout}
    >
      <p>Body</p>
    </BottomSheet>
  );
}

const root = () => document.documentElement;
const insetValue = () => root().style.getPropertyValue(BOTTOM_SHEET_INSET_PROPERTY);

let restoreViewport: () => void = () => {};

afterEach(() => {
  cleanupBottomSheetTests();
  restoreViewport();
  root().style.removeProperty(BOTTOM_SHEET_INSET_PROPERTY);
  root().removeAttribute(BOTTOM_SHEET_INSET_ATTRIBUTE);
});

describe('layout: overlay (default)', () => {
  it('publishes nothing on <html>', () => {
    restoreViewport = mockViewportHeight(DEFAULT_VIEWPORT_HEIGHT);
    render(<Sheet open height={480} />);
    expect(insetValue()).toBe('');
    expect(root().hasAttribute(BOTTOM_SHEET_INSET_ATTRIBUTE)).toBe(false);
  });

  it('publishes nothing when layout is overlay explicitly', () => {
    restoreViewport = mockViewportHeight(DEFAULT_VIEWPORT_HEIGHT);
    render(<Sheet open height={480} layout="overlay" />);
    expect(insetValue()).toBe('');
  });
});

describe('layout: inset', () => {
  it('publishes the rendered (clamped) height and the attribute while open', () => {
    restoreViewport = mockViewportHeight(DEFAULT_VIEWPORT_HEIGHT);
    render(<Sheet open height={480} layout="inset" />);
    expect(insetValue()).toBe('480px');
    expect(root().hasAttribute(BOTTOM_SHEET_INSET_ATTRIBUTE)).toBe(true);
  });

  it('publishes the clamped value, not the raw prop', () => {
    restoreViewport = mockViewportHeight(DEFAULT_VIEWPORT_HEIGHT);
    render(<Sheet open height={5000} layout="inset" />);
    expect(insetValue()).toBe(`${DEFAULT_VIEWPORT_HEIGHT}px`);
  });

  it('tracks height changes', () => {
    restoreViewport = mockViewportHeight(DEFAULT_VIEWPORT_HEIGHT);
    const { rerender } = render(<Sheet open height={400} layout="inset" />);
    expect(insetValue()).toBe('400px');
    rerender(<Sheet open height={520} layout="inset" />);
    expect(insetValue()).toBe('520px');
  });

  /**
   * The region stays on screen for the exit slide, so the inset has to stay
   * published for exactly as long. Dropping it on the first close frame pulled
   * the host's own layout up while the sheet was still covering it.
   */
  it('holds the property and attribute through the exit transition, then clears them', () => {
    vi.useFakeTimers();
    try {
      restoreViewport = mockViewportHeight(DEFAULT_VIEWPORT_HEIGHT);
      const { rerender } = render(<Sheet open height={400} layout="inset" />);
      expect(insetValue()).toBe('400px');

      rerender(<Sheet open={false} height={400} layout="inset" />);

      expect(insetValue(), 'the sheet is still on screen for the exit slide').toBe('400px');
      expect(root().hasAttribute(BOTTOM_SHEET_INSET_ATTRIBUTE)).toBe(true);

      act(() => {
        vi.advanceTimersByTime(BOTTOM_SHEET_TRANSITION_MS);
      });

      expect(insetValue()).toBe('');
      expect(root().hasAttribute(BOTTOM_SHEET_INSET_ATTRIBUTE)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears the property and attribute on unmount', () => {
    restoreViewport = mockViewportHeight(DEFAULT_VIEWPORT_HEIGHT);
    const { unmount } = render(<Sheet open height={400} layout="inset" />);
    unmount();
    expect(insetValue()).toBe('');
    expect(root().hasAttribute(BOTTOM_SHEET_INSET_ATTRIBUTE)).toBe(false);
  });

  it("marks the attribute 'resizing' during a pointer drag and clears it after", () => {
    // jsdom has no PointerEvent; React's onPointerDown needs `isPrimary` etc. on the
    // event object, so install a minimal polyfill for this test only.
    const original = (window as unknown as { PointerEvent?: unknown }).PointerEvent;
    class PointerEventPolyfill extends MouseEvent {
      pointerId: number;
      isPrimary: boolean;
      pointerType: string;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 0;
        this.isPrimary = init.isPrimary ?? false;
        this.pointerType = init.pointerType ?? '';
      }
    }
    (window as unknown as { PointerEvent: unknown }).PointerEvent = PointerEventPolyfill;
    try {
      restoreViewport = mockViewportHeight(DEFAULT_VIEWPORT_HEIGHT);
      render(<Sheet open height={400} layout="inset" />);
      const separator = document.querySelector(
        '[data-slot="bottom-sheet-separator"]'
      ) as HTMLElement;
      expect(root().getAttribute(BOTTOM_SHEET_INSET_ATTRIBUTE)).toBe('');
      fireEvent.pointerDown(separator, {
        clientY: 500,
        pointerId: 1,
        isPrimary: true,
        button: 0,
        pointerType: 'mouse',
      });
      expect(root().getAttribute(BOTTOM_SHEET_INSET_ATTRIBUTE)).toBe('resizing');
      // The sheet suspends its height transition while dragging.
      expect(document.querySelector('[data-slot="bottom-sheet"]')?.className).toContain(
        'transition-none'
      );
      fireEvent.pointerUp(separator, { pointerId: 1, isPrimary: true, pointerType: 'mouse' });
      expect(root().getAttribute(BOTTOM_SHEET_INSET_ATTRIBUTE)).toBe('');
    } finally {
      (window as unknown as { PointerEvent: unknown }).PointerEvent = original;
    }
  });

  it('clears when switching back to overlay while open', () => {
    restoreViewport = mockViewportHeight(DEFAULT_VIEWPORT_HEIGHT);
    const { rerender } = render(<Sheet open height={400} layout="inset" />);
    rerender(<Sheet open height={400} layout="overlay" />);
    expect(insetValue()).toBe('');
  });
});
