/**
 * Tests for shared wizard hooks and utilities.
 *
 * Validates:
 * - safe step index clamping
 * - furthest-step tracking for visited/touched state
 * - scrollable wizard active-step synchronization on click and scroll
 *
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type React from 'react';

import { getSafeStepIndex, useFurthestStepIndex, useScrollableWizardStepTracking } from './hooks';

const STEPS = [
  { id: 'asset' },
  { id: 'identity' },
  { id: 'compliance' },
  { id: 'roles' },
  { id: 'review' },
];

describe('getSafeStepIndex', () => {
  it('returns zero when there are no steps', () => {
    expect(getSafeStepIndex(0, 10)).toBe(0);
  });

  it('clamps negative indices to zero', () => {
    expect(getSafeStepIndex(STEPS.length, -3)).toBe(0);
  });

  it('clamps indices above the step count to the last step', () => {
    expect(getSafeStepIndex(STEPS.length, 99)).toBe(STEPS.length - 1);
  });
});

describe('useFurthestStepIndex', () => {
  it('tracks the highest reached step and does not shrink on back navigation', () => {
    const { result, rerender } = renderHook(
      ({ currentStepIndex }) => useFurthestStepIndex(currentStepIndex),
      { initialProps: { currentStepIndex: 0 } }
    );

    expect(result.current).toBe(0);

    rerender({ currentStepIndex: 3 });
    expect(result.current).toBe(3);

    rerender({ currentStepIndex: 1 });
    expect(result.current).toBe(3);
  });

  it('prefers the controlled furthest step index when provided', () => {
    const { result, rerender } = renderHook(
      ({ currentStepIndex, controlledFurthestStepIndex }) =>
        useFurthestStepIndex(currentStepIndex, controlledFurthestStepIndex),
      {
        initialProps: {
          currentStepIndex: 1,
          controlledFurthestStepIndex: 4,
        },
      }
    );

    expect(result.current).toBe(4);

    rerender({
      currentStepIndex: 0,
      controlledFurthestStepIndex: 2,
    });
    expect(result.current).toBe(2);
  });
});

describe('useScrollableWizardStepTracking', () => {
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
  const originalCSS = globalThis.CSS;

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('CSS', {
      escape: (value: string) => value,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
    globalThis.CSS = originalCSS;
    document.body.innerHTML = '';
  });

  it('keeps furthest visited step after jumping back via step click', async () => {
    const { container, scrollRef, sectionId, scrollToSpy } = createScrollFixture([
      -260, -120, 20, 100, 360,
    ]);
    const onStepChange = vi.fn();

    const { result } = renderHook(() =>
      useScrollableWizardStepTracking({
        steps: STEPS,
        currentStepIndex: 3,
        onStepChange,
        scrollRef,
        sectionId,
      })
    );

    expect(result.current.activeIndex).toBe(3);
    expect(result.current.furthestStepIndex).toBe(3);

    act(() => {
      result.current.scrollToSection(1);
    });

    expect(result.current.activeIndex).toBe(1);
    expect(result.current.furthestStepIndex).toBe(3);
    expect(onStepChange).toHaveBeenCalledWith(1);
    expect(scrollToSpy).toHaveBeenCalled();

    container.remove();
  });

  it('marks the last step active when the container is scrolled near the bottom', async () => {
    const { container, scrollRef, sectionId } = createScrollFixture([-300, -160, -20, 120, 220], {
      scrollTop: 510,
      clientHeight: 500,
      scrollHeight: 1000,
    });
    const onStepChange = vi.fn();

    const { result } = renderHook(() =>
      useScrollableWizardStepTracking({
        steps: STEPS,
        currentStepIndex: 0,
        onStepChange,
        scrollRef,
        sectionId,
      })
    );

    await waitFor(() => {
      expect(result.current.activeIndex).toBe(STEPS.length - 1);
    });

    expect(result.current.furthestStepIndex).toBeLessThan(STEPS.length - 1);
    // onStepChange is not called on the initial mount scroll to avoid React
    // render-order violations; it is only called on subsequent user-driven changes.

    container.remove();
  });

  it('always marks the last step active at the absolute bottom of the container', async () => {
    const { container, scrollRef, sectionId } = createScrollFixture([-180, -60, 20, 120, 360], {
      scrollTop: 500,
      clientHeight: 500,
      scrollHeight: 1000,
    });
    const onStepChange = vi.fn();

    const { result } = renderHook(() =>
      useScrollableWizardStepTracking({
        steps: STEPS,
        currentStepIndex: 0,
        onStepChange,
        scrollRef,
        sectionId,
      })
    );

    await waitFor(() => {
      expect(result.current.activeIndex).toBe(STEPS.length - 1);
    });

    expect(result.current.furthestStepIndex).toBeLessThan(STEPS.length - 1);
    // Same as above: initial-mount scroll does not call onStepChange.

    container.remove();
  });

  it('does not mark the last step as visited when it is active only because the user reached the bottom', async () => {
    const { container, scrollRef, sectionId } = createScrollFixture([-180, -60, 20, 120, 360], {
      scrollTop: 500,
      clientHeight: 500,
      scrollHeight: 1000,
    });
    const onStepChange = vi.fn();

    const { result } = renderHook(() =>
      useScrollableWizardStepTracking({
        steps: STEPS,
        currentStepIndex: 0,
        onStepChange,
        scrollRef,
        sectionId,
      })
    );

    await waitFor(() => {
      expect(result.current.activeIndex).toBe(STEPS.length - 1);
    });

    expect(result.current.furthestStepIndex).toBeLessThan(STEPS.length - 1);

    act(() => {
      result.current.scrollToSection(3);
    });

    expect(result.current.activeIndex).toBe(3);
    expect(result.current.furthestStepIndex).toBe(3);

    container.remove();
  });

  it('does not force the last step active too early when the previous step is still anchored near the top', async () => {
    const { container, scrollRef, sectionId } = createScrollFixture([-180, -60, 20, 120, 360], {
      scrollTop: 496,
      clientHeight: 500,
      scrollHeight: 1000,
    });
    const onStepChange = vi.fn();

    const { result } = renderHook(() =>
      useScrollableWizardStepTracking({
        steps: STEPS,
        currentStepIndex: 0,
        onStepChange,
        scrollRef,
        sectionId,
      })
    );

    await waitFor(() => {
      expect(result.current.activeIndex).toBe(3);
    });

    expect(result.current.furthestStepIndex).toBe(3);
    // Same as above: initial-mount scroll does not call onStepChange.

    container.remove();
  });

  it('keeps an explicitly clicked last step active while its section is visible', async () => {
    const { container, scrollRef, sectionId, scrollToSpy } = createScrollFixture(
      [-180, -60, 20, 120, 360],
      {
        scrollTop: 496,
        clientHeight: 500,
        scrollHeight: 1000,
      }
    );
    const onStepChange = vi.fn();

    const { result } = renderHook(() =>
      useScrollableWizardStepTracking({
        steps: STEPS,
        currentStepIndex: 0,
        onStepChange,
        scrollRef,
        sectionId,
      })
    );

    await waitFor(() => {
      expect(result.current.activeIndex).toBe(3);
    });

    act(() => {
      result.current.scrollToSection(4);
      container.dispatchEvent(new Event('scroll'));
    });

    expect(result.current.activeIndex).toBe(4);
    expect(result.current.furthestStepIndex).toBe(4);
    expect(onStepChange).toHaveBeenCalledWith(4);
    expect(scrollToSpy).toHaveBeenCalled();

    container.remove();
  });

  it('preserves an explicitly clicked step while smooth scrolling toward an offscreen target', async () => {
    const { container, scrollRef, sectionId, scrollToSpy } = createScrollFixture(
      [-260, -120, 20, 120, 760],
      {
        scrollTop: 120,
        clientHeight: 500,
        scrollHeight: 1400,
      }
    );
    const onStepChange = vi.fn();

    const { result } = renderHook(() =>
      useScrollableWizardStepTracking({
        steps: STEPS,
        currentStepIndex: 2,
        onStepChange,
        scrollRef,
        sectionId,
      })
    );

    const initialActiveIndex = result.current.activeIndex;

    act(() => {
      result.current.scrollToSection(4);
      container.dispatchEvent(new Event('scroll'));
    });

    expect(result.current.activeIndex).toBe(4);
    expect(result.current.furthestStepIndex).toBe(4);
    expect(initialActiveIndex).not.toBe(4);
    expect(onStepChange).toHaveBeenCalledWith(4);
    expect(scrollToSpy).toHaveBeenCalled();

    container.remove();
  });

  it('keeps explicit selection locked until the user scrolls manually', async () => {
    const { container, scrollRef, sectionId } = createScrollFixture([-180, -60, 20, 120, 360], {
      scrollTop: 496,
      clientHeight: 500,
      scrollHeight: 1000,
    });
    const onStepChange = vi.fn();

    const { result } = renderHook(() =>
      useScrollableWizardStepTracking({
        steps: STEPS,
        currentStepIndex: 0,
        onStepChange,
        scrollRef,
        sectionId,
      })
    );

    await waitFor(() => {
      expect(result.current.activeIndex).toBe(3);
    });

    act(() => {
      result.current.scrollToSection(4);
      container.dispatchEvent(new Event('scroll'));
    });
    expect(result.current.activeIndex).toBe(4);

    act(() => {
      container.dispatchEvent(new Event('scroll'));
    });

    expect(result.current.activeIndex).toBe(4);

    act(() => {
      container.dispatchEvent(new Event('wheel'));
      container.dispatchEvent(new Event('scroll'));
    });

    expect(result.current.activeIndex).toBe(3);
    container.remove();
  });
});

function createScrollFixture(
  sectionTops: number[],
  {
    scrollTop = 0,
    clientHeight = 600,
    scrollHeight = 1600,
  }: {
    scrollTop?: number;
    clientHeight?: number;
    scrollHeight?: number;
  } = {}
) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  Object.defineProperty(container, 'scrollTop', {
    value: scrollTop,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(container, 'clientHeight', {
    value: clientHeight,
    configurable: true,
  });
  Object.defineProperty(container, 'scrollHeight', {
    value: scrollHeight,
    configurable: true,
  });

  container.getBoundingClientRect = () =>
    createRect({
      top: 0,
      bottom: clientHeight,
      height: clientHeight,
    });

  const scrollToSpy = vi.fn();
  Object.defineProperty(container, 'scrollTo', {
    value: scrollToSpy,
    configurable: true,
  });

  const sectionId = (stepId: string) => `wizard-test-${stepId}`;

  sectionTops.forEach((top, index) => {
    const section = document.createElement('section');
    section.id = sectionId(STEPS[index].id);
    section.getBoundingClientRect = () =>
      createRect({
        top,
        bottom: top + 120,
        height: 120,
      });
    container.appendChild(section);
  });

  return {
    container,
    scrollRef: { current: container } as React.RefObject<HTMLDivElement | null>,
    scrollToSpy,
    sectionId,
  };
}

function createRect({
  top,
  bottom,
  height,
}: {
  top: number;
  bottom: number;
  height: number;
}): DOMRect {
  return {
    x: 0,
    y: top,
    width: 0,
    height,
    top,
    right: 0,
    bottom,
    left: 0,
    toJSON: () => ({}),
  } as DOMRect;
}
