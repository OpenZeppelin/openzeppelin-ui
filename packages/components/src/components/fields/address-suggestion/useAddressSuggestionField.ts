/**
 * Headless suggestion-dropdown behavior for address fields.
 *
 * Extracted from `AddressField`'s inline dropdown logic (SF-3, D9) into one
 * reusable headless hook the base `AddressField` consumes — no divergence, no
 * regression (INV-72). It owns:
 *   - `AddressSuggestionContext` resolution (explicit `suggestions` prop overrides),
 *   - the `MAX_SUGGESTIONS` (5) cap on context-resolved lists,
 *   - the 200 ms suggestion debounce,
 *   - keyboard highlight state with wrapping ArrowUp / ArrowDown navigation,
 *   - click-outside-to-close.
 *
 * It is capability-free and chain-agnostic — nothing about ENS or any chain
 * leaks into `@openzeppelin/ui-components`. The consuming field owns the RHF
 * value write on selection and the Enter / Escape input handlers; this hook
 * exposes the state and primitives they need.
 *
 * Distinct from the pre-existing convenience hook `useAddressSuggestions(query,
 * networkId)`, which resolves a raw suggestion list from context with no
 * debounce / cap / keyboard state — that hook is unchanged and still exported.
 *
 * @see INV-72 (suggestion-dropdown behavior preserved with zero regression; SF-5 depends)
 * @see INV-94 (legacy a11y + suggestion keyboard contract preserved verbatim)
 */
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import type { AddressSuggestion } from '@openzeppelin/ui-types';

import { AddressSuggestionContext } from './context';

/** Suggestion debounce window (ms). Matches the legacy `AddressField`. */
const DEBOUNCE_MS = 200;
/** Cap on context-resolved suggestions. Explicit arrays are rendered as-is. */
const MAX_SUGGESTIONS = 5;

/** Arguments for {@link useAddressSuggestionField}. */
export interface UseAddressSuggestionFieldArgs {
  /** The current input text — drives the debounce and dropdown visibility. */
  readonly inputValue: string;
  /**
   * Explicit suggestion list. When an array, it overrides context resolution and
   * is rendered as-is (no cap). `false` disables suggestions entirely (even with
   * a provider mounted). `undefined` falls back to context resolution.
   */
  readonly suggestions?: AddressSuggestion[] | false;
  /** Optional network id forwarded to the context resolver for scoping. */
  readonly networkId?: string;
}

/** State and handlers returned by {@link useAddressSuggestionField}. */
export interface UseAddressSuggestionFieldResult {
  /** Ref for the field container — used for click-outside detection. */
  readonly containerRef: React.RefObject<HTMLDivElement | null>;
  /** The suggestions to render (context-resolved + capped, or the explicit array). */
  readonly resolvedSuggestions: AddressSuggestion[];
  /** `true` when the dropdown is open AND there is at least one suggestion. */
  readonly hasSuggestions: boolean;
  /** Index of the keyboard-highlighted option, or `-1` when none. */
  readonly highlightedIndex: number;
  /** `true` when suggestions are explicitly disabled (`suggestions === false`). */
  readonly suggestionsDisabled: boolean;
  /** Set the highlighted option index (e.g. on hover). */
  readonly setHighlightedIndex: (index: number) => void;
  /** Close the dropdown and clear the highlight. */
  readonly closeSuggestions: () => void;
  /** Notify the hook of an input change — opens/closes the dropdown and resets highlight. */
  readonly onInputChange: (value: string) => void;
  /** Container-level keydown handler: wrapping ArrowUp / ArrowDown navigation. */
  readonly onContainerKeyDown: (e: React.KeyboardEvent) => void;
}

/**
 * Headless address-suggestion dropdown behavior. See the module docstring for
 * the full behavior contract.
 *
 * @param args - {@link UseAddressSuggestionFieldArgs}.
 * @returns {@link UseAddressSuggestionFieldResult}.
 */
export function useAddressSuggestionField({
  inputValue,
  suggestions: suggestionsProp,
  networkId,
}: UseAddressSuggestionFieldArgs): UseAddressSuggestionFieldResult {
  const contextResolver = useContext(AddressSuggestionContext);
  const containerRef = useRef<HTMLDivElement>(null);

  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    if (!inputValue.trim()) {
      setDebouncedQuery('');
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(inputValue), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const suggestionsDisabled = suggestionsProp === false;

  const resolvedSuggestions = useMemo<AddressSuggestion[]>(() => {
    if (suggestionsDisabled) return [];
    if (Array.isArray(suggestionsProp)) return suggestionsProp;
    if (!contextResolver || !debouncedQuery.trim()) return [];
    return contextResolver.resolveSuggestions(debouncedQuery, networkId).slice(0, MAX_SUGGESTIONS);
  }, [suggestionsDisabled, suggestionsProp, contextResolver, debouncedQuery, networkId]);

  const hasSuggestions = showSuggestions && resolvedSuggestions.length > 0;

  useEffect(() => {
    let active = true;
    const handleClickOutside = (e: MouseEvent): void => {
      if (active && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      active = false;
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const onContainerKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (!hasSuggestions) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < resolvedSuggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : resolvedSuggestions.length - 1));
      }
    },
    [hasSuggestions, resolvedSuggestions.length]
  );

  const onInputChange = useCallback((value: string): void => {
    setShowSuggestions(value.length > 0);
    setHighlightedIndex(-1);
  }, []);

  const closeSuggestions = useCallback((): void => {
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  }, []);

  return {
    containerRef,
    resolvedSuggestions,
    hasSuggestions,
    highlightedIndex,
    suggestionsDisabled,
    setHighlightedIndex,
    closeSuggestions,
    onInputChange,
    onContainerKeyDown,
  };
}
