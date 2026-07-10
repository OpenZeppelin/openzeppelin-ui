/**
 * @vitest-environment jsdom
 *
 * SF-3 · `useAddressSuggestionField` — headless dropdown behavior (INV-72).
 *
 * The extracted headless hook the base `AddressField` consumes. This
 * suite pins the behavior that must not regress:
 * context resolution + the `MAX_SUGGESTIONS = 5` cap, the 200 ms debounce, the
 * explicit-array override (no cap, no debounce), the `suggestions={false}`
 * opt-out, and the open/close visibility + highlight primitives. Wrapping ArrowUp
 * / ArrowDown navigation and click-outside are asserted end-to-end in the field
 * suites (real synthetic events), per INV-94.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { type ReactNode } from 'react';

import type { AddressSuggestion } from '@openzeppelin/ui-types';

import { AddressSuggestionProvider } from './address-suggestion-context';
import { useAddressSuggestionField } from './useAddressSuggestionField';

/** Build a resolver that returns `count` synthetic suggestions for any query. */
function resolverFor(count: number): (query: string) => AddressSuggestion[] {
  return (query: string) =>
    Array.from({ length: count }, (_, i) => ({
      label: `${query}-${i}`,
      value: `0x${String(i).padStart(40, '0')}`,
    }));
}

function wrapperWith(count: number): (props: { children: ReactNode }) => React.ReactElement {
  const resolveSuggestions = resolverFor(count);
  return function Wrapper({ children }: { children: ReactNode }): React.ReactElement {
    return (
      <AddressSuggestionProvider resolveSuggestions={resolveSuggestions}>
        {children}
      </AddressSuggestionProvider>
    );
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('INV-72: context resolution, 200 ms debounce, and the MAX_SUGGESTIONS cap', () => {
  it('resolves nothing until the 200 ms debounce elapses, then resolves from context', () => {
    const { result, rerender } = renderHook(
      ({ inputValue }) => useAddressSuggestionField({ inputValue }),
      { initialProps: { inputValue: '' }, wrapper: wrapperWith(3) }
    );

    act(() => result.current.onInputChange('al'));
    rerender({ inputValue: 'al' });
    // Before the debounce fires, the context query is empty → no suggestions.
    expect(result.current.resolvedSuggestions).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.resolvedSuggestions).toHaveLength(3);
    expect(result.current.hasSuggestions).toBe(true);
  });

  it('caps context-resolved suggestions at 5 even when the resolver returns more', () => {
    const { result, rerender } = renderHook(
      ({ inputValue }) => useAddressSuggestionField({ inputValue }),
      { initialProps: { inputValue: '' }, wrapper: wrapperWith(10) }
    );
    act(() => result.current.onInputChange('al'));
    rerender({ inputValue: 'al' });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.resolvedSuggestions).toHaveLength(5);
  });

  it('clears the debounced query when the input goes empty (no stale dropdown)', () => {
    const { result, rerender } = renderHook(
      ({ inputValue }) => useAddressSuggestionField({ inputValue }),
      { initialProps: { inputValue: '' }, wrapper: wrapperWith(3) }
    );
    act(() => result.current.onInputChange('al'));
    rerender({ inputValue: 'al' });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.resolvedSuggestions).toHaveLength(3);

    act(() => result.current.onInputChange(''));
    rerender({ inputValue: '' });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.resolvedSuggestions).toHaveLength(0);
    expect(result.current.hasSuggestions).toBe(false);
  });
});

describe('INV-72: explicit-array override and opt-out bypass context/cap/debounce', () => {
  const explicit: AddressSuggestion[] = Array.from({ length: 7 }, (_, i) => ({
    label: `E${i}`,
    value: `0x${String(i).padStart(40, 'f')}`,
  }));

  it('renders an explicit array as-is (no 5-cap) and without waiting for the debounce', () => {
    const { result } = renderHook(
      () => useAddressSuggestionField({ inputValue: 'al', suggestions: explicit }),
      { wrapper: wrapperWith(3) }
    );
    act(() => result.current.onInputChange('al'));
    // No timer advance: explicit arrays do not go through the debounced context path.
    expect(result.current.resolvedSuggestions).toHaveLength(7);
    expect(result.current.suggestionsDisabled).toBe(false);
  });

  it('suggestions={false} disables the surface even with a provider mounted', () => {
    const { result } = renderHook(
      () => useAddressSuggestionField({ inputValue: 'al', suggestions: false }),
      { wrapper: wrapperWith(3) }
    );
    act(() => result.current.onInputChange('al'));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.suggestionsDisabled).toBe(true);
    expect(result.current.resolvedSuggestions).toHaveLength(0);
    expect(result.current.hasSuggestions).toBe(false);
  });
});

describe('INV-72: open/close visibility + highlight primitives', () => {
  it('onInputChange opens on non-empty input and closes on empty, resetting the highlight', () => {
    const { result, rerender } = renderHook(
      ({ inputValue }) => useAddressSuggestionField({ inputValue }),
      { initialProps: { inputValue: '' }, wrapper: wrapperWith(3) }
    );
    act(() => result.current.onInputChange('al'));
    rerender({ inputValue: 'al' });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => result.current.setHighlightedIndex(2));
    expect(result.current.highlightedIndex).toBe(2);
    expect(result.current.hasSuggestions).toBe(true);

    act(() => result.current.onInputChange(''));
    expect(result.current.highlightedIndex).toBe(-1);
    expect(result.current.hasSuggestions).toBe(false);
  });

  it('closeSuggestions hides the dropdown and clears the highlight', () => {
    const { result, rerender } = renderHook(
      ({ inputValue }) => useAddressSuggestionField({ inputValue }),
      { initialProps: { inputValue: '' }, wrapper: wrapperWith(3) }
    );
    act(() => result.current.onInputChange('al'));
    rerender({ inputValue: 'al' });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => result.current.setHighlightedIndex(1));
    act(() => result.current.closeSuggestions());
    expect(result.current.hasSuggestions).toBe(false);
    expect(result.current.highlightedIndex).toBe(-1);
  });
});
