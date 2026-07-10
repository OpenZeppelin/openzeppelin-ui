/**
 * @vitest-environment jsdom
 *
 * SF-3 · `AddressSuggestionList` — presentational ARIA listbox (INV-72 / INV-94).
 *
 * The extraction the base `AddressField` consumes, so a regression here is a
 * regression in every address field (INV-72 is Critical; SF-5 depends). Verifies
 * the listbox/option ARIA
 * structure, the highlight → `aria-selected` mapping, and the `onMouseDown`
 * +preventDefault selection contract that keeps input focus during a click.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type * as React from 'react';

import type { AddressSuggestion } from '@openzeppelin/ui-types';

import { AddressSuggestionList } from './AddressSuggestionList';

const SUGGESTIONS: AddressSuggestion[] = [
  { label: 'Alice', value: `0x${'a'.repeat(40)}`, description: 'Treasury' },
  { label: 'Bob', value: `0x${'b'.repeat(40)}` },
  { label: 'Carol', value: `0x${'c'.repeat(40)}` },
];

function renderList(overrides: Partial<React.ComponentProps<typeof AddressSuggestionList>> = {}) {
  const props = {
    id: 'recipient',
    suggestions: SUGGESTIONS,
    highlightedIndex: -1,
    onSelect: vi.fn(),
    onHighlight: vi.fn(),
    ...overrides,
  };
  render(<AddressSuggestionList {...props} />);
  return props;
}

describe('INV-72 / INV-94: listbox + option ARIA structure', () => {
  it('renders a role="listbox" anchored to the field id', () => {
    renderList();
    const listbox = screen.getByRole('listbox');
    expect(listbox.id).toBe('recipient-suggestions');
  });

  it('renders one role="option" per suggestion, with stable per-index ids', () => {
    renderList();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(SUGGESTIONS.length);
    options.forEach((opt, i) => expect(opt.id).toBe(`recipient-suggestion-${i}`));
  });

  it('renders each suggestion label and value as text', () => {
    renderList();
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText(SUGGESTIONS[0].value)).toBeTruthy();
    expect(screen.getByText('Carol')).toBeTruthy();
  });

  it('renders null (no listbox) when there are no suggestions', () => {
    renderList({ suggestions: [] });
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

describe('INV-94: highlight → aria-selected, and select/hover callbacks', () => {
  it('marks exactly the highlighted option aria-selected="true"', () => {
    renderList({ highlightedIndex: 1 });
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
  });

  it('marks no option selected when highlightedIndex is -1', () => {
    renderList({ highlightedIndex: -1 });
    const selected = screen.getAllByRole('option').map((o) => o.getAttribute('aria-selected'));
    expect(selected).toEqual(['false', 'false', 'false']);
  });

  it('selects via onMouseDown and calls preventDefault (keeps input focus during click)', () => {
    const { onSelect } = renderList();
    const option = screen.getByRole('option', { name: /Bob/ });
    // fireEvent returns false when the handler called preventDefault on the event.
    const notPrevented = fireEvent.mouseDown(option);
    expect(notPrevented).toBe(false);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(SUGGESTIONS[1]);
  });

  it('syncs the highlight on hover via onMouseEnter', () => {
    const { onHighlight } = renderList();
    fireEvent.mouseEnter(screen.getByRole('option', { name: /Carol/ }));
    expect(onHighlight).toHaveBeenCalledWith(2);
  });
});
