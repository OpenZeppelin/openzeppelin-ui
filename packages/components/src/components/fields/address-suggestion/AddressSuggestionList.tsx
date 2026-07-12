/**
 * Presentational ARIA listbox for address suggestions (SF-3, D9).
 *
 * Extracted from `AddressField`'s inline dropdown markup into a reusable
 * presentational listbox so the base `AddressField` renders a consistent
 * suggestion structure (INV-72). Purely presentational and capability-free: it
 * owns no state and no resolution — the consuming field supplies the resolved
 * list, the highlighted index, and the select / hover callbacks.
 *
 * @see INV-72 (byte-identical suggestion structure across both fields)
 * @see INV-94 (`role="listbox"` / `role="option"`, `aria-selected`, `onMouseDown`-preventDefault select)
 */
import * as React from 'react';

import type { AddressSuggestion } from '@openzeppelin/ui-types';
import { cn } from '@openzeppelin/ui-utils';

/** Props for {@link AddressSuggestionList}. */
export interface AddressSuggestionListProps {
  /** Field id — anchors the listbox id (`${id}-suggestions`) and option ids. */
  readonly id: string;
  /** The suggestions to render. */
  readonly suggestions: AddressSuggestion[];
  /** Index of the currently highlighted option, or `-1`. */
  readonly highlightedIndex: number;
  /** Called when an option is selected (click / mouse-down). */
  readonly onSelect: (suggestion: AddressSuggestion) => void;
  /** Called when an option is hovered, to sync the highlight. */
  readonly onHighlight: (index: number) => void;
}

/**
 * Render the suggestion dropdown. Returns `null` when there are no suggestions
 * (the consuming field also gates on `hasSuggestions`, so this is a safety net).
 *
 * @param props - {@link AddressSuggestionListProps}.
 */
export function AddressSuggestionList({
  id,
  suggestions,
  highlightedIndex,
  onSelect,
  onHighlight,
}: AddressSuggestionListProps): React.ReactElement | null {
  if (suggestions.length === 0) return null;

  return (
    <div
      id={`${id}-suggestions`}
      className={cn(
        'absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md',
        'max-h-48 overflow-auto'
      )}
      role="listbox"
    >
      {suggestions.map((s, i) => (
        <button
          key={`${s.value}-${s.description ?? i}`}
          id={`${id}-suggestion-${i}`}
          type="button"
          role="option"
          aria-selected={i === highlightedIndex}
          className={cn(
            'flex w-full flex-col px-3 py-2 text-left text-sm',
            'hover:bg-selected/10',
            i === highlightedIndex && 'bg-selected/10'
          )}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(s);
          }}
          onMouseEnter={() => onHighlight(i)}
        >
          <span className="font-medium">{s.label}</span>
          <span className="truncate font-mono text-xs text-muted-foreground">{s.value}</span>
        </button>
      ))}
    </div>
  );
}

AddressSuggestionList.displayName = 'AddressSuggestionList';
