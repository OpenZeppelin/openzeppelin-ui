/**
 * @vitest-environment jsdom
 *
 * SF-6 · `useResolvingAnnouncerCopy` — loading escalation timer tests.
 *
 * Verifies INV-129 (phase-1 copy), INV-130 (phase-2 escalation), INV-131 (timer lifecycle),
 * INV-149 (single timeout per pending episode — no leaked timers on unmount).
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RESOLVING_ANNOUNCER_ESCALATE_AFTER_MS,
  useResolvingAnnouncerCopy,
} from '../useResolvingAnnouncerCopy';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('INV-129: phase-1 "Resolving…" during debouncing and loading', () => {
  it('returns "Resolving…" while pending and elapsed < escalateAfterMs', () => {
    const { result, rerender } = renderHook(
      ({ isPending }) =>
        useResolvingAnnouncerCopy({
          isPending,
          escalateAfterMs: RESOLVING_ANNOUNCER_ESCALATE_AFTER_MS,
        }),
      { initialProps: { isPending: false } }
    );

    expect(result.current).toBe('Resolving…');

    rerender({ isPending: true });
    expect(result.current).toBe('Resolving…');

    act(() => {
      vi.advanceTimersByTime(RESOLVING_ANNOUNCER_ESCALATE_AFTER_MS - 1);
    });
    expect(result.current).toBe('Resolving…');
  });
});

describe('INV-130: phase-2 "Still resolving…" after escalation threshold', () => {
  it('switches to "Still resolving…" after escalateAfterMs with no mechanism words', () => {
    const { result } = renderHook(
      ({ isPending }) =>
        useResolvingAnnouncerCopy({
          isPending,
          escalateAfterMs: RESOLVING_ANNOUNCER_ESCALATE_AFTER_MS,
        }),
      { initialProps: { isPending: true } }
    );

    expect(result.current).toBe('Resolving…');

    act(() => {
      vi.advanceTimersByTime(RESOLVING_ANNOUNCER_ESCALATE_AFTER_MS);
    });
    expect(result.current).toBe('Still resolving…');
    expect(result.current).not.toMatch(/CCIP|gateway|v2|off-chain/i);
  });
});

describe('INV-131: timer lifecycle — start on pending, clear on settle', () => {
  it('restarts at phase 1 when pending clears and resumes', () => {
    const { result, rerender } = renderHook(
      ({ isPending }) =>
        useResolvingAnnouncerCopy({
          isPending,
          escalateAfterMs: RESOLVING_ANNOUNCER_ESCALATE_AFTER_MS,
        }),
      { initialProps: { isPending: true } }
    );

    act(() => {
      vi.advanceTimersByTime(RESOLVING_ANNOUNCER_ESCALATE_AFTER_MS);
    });
    expect(result.current).toBe('Still resolving…');

    rerender({ isPending: false });
    expect(result.current).toBe('Resolving…');

    rerender({ isPending: true });
    expect(result.current).toBe('Resolving…');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe('Resolving…');
  });

  it('clears timeout on unmount without act warnings (INV-149)', () => {
    const { unmount } = renderHook(() =>
      useResolvingAnnouncerCopy({ isPending: true, escalateAfterMs: 3000 })
    );

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    unmount();

    expect(() => {
      act(() => {
        vi.advanceTimersByTime(5000);
      });
    }).not.toThrow();
  });
});
