/**
 * @vitest-environment jsdom
 *
 * SF-3 · `AddressField` suggestion-dropdown regression suite (INV-72 / INV-94).
 *
 * `AddressField` was refactored to consume the extracted `useAddressSuggestionField`
 * + `AddressSuggestionList` (D9). This suite pins the *existing* dropdown behavior
 * so the extraction is proven behavior-preserving: context resolution + the 5-cap,
 * wrapping ArrowUp / ArrowDown navigation, Enter-to-select, Escape-to-close,
 * click-outside dismissal, and the input's `aria-expanded` / `aria-autocomplete` /
 * `aria-controls` / `aria-activedescendant` wiring. Since inline ENS resolution
 * now lives in this base `AddressField` itself (no renderer fork), this suite
 * discharges INV-72's "byte-identical suggestion behavior" for every consumer.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { useForm } from 'react-hook-form';

import type { AddressSuggestion } from '@openzeppelin/ui-types';

import { AddressSuggestionProvider } from './address-suggestion';
import { AddressField } from './AddressField';

interface HarnessProps {
  suggestionCount?: number;
  onSuggestionSelect?: (s: AddressSuggestion) => void;
}

function Harness({ suggestionCount = 3, onSuggestionSelect }: HarnessProps): React.ReactElement {
  const resolveSuggestions = (query: string): AddressSuggestion[] =>
    Array.from({ length: suggestionCount }, (_, i) => ({
      label: `${query}-alias-${i}`,
      value: `0x${String(i).padStart(40, '0')}`,
    }));

  function Field(): React.ReactElement {
    const { control } = useForm({ defaultValues: { recipient: '' }, mode: 'onChange' });
    return (
      <AddressField
        id="recipient"
        name="recipient"
        label="Recipient"
        control={control}
        onSuggestionSelect={onSuggestionSelect}
      />
    );
  }

  return (
    <AddressSuggestionProvider resolveSuggestions={resolveSuggestions}>
      <Field />
    </AddressSuggestionProvider>
  );
}

/** Type into the input and let the 200 ms suggestion debounce fire. */
function openDropdown(value: string): HTMLElement {
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value } });
  act(() => {
    vi.advanceTimersByTime(200);
  });
  return input;
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('INV-72: context resolution + the 5-cap through AddressField', () => {
  it('opens a listbox from context suggestions after the debounce', () => {
    render(<Harness suggestionCount={3} />);
    openDropdown('al');
    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('caps context-resolved suggestions at 5', () => {
    render(<Harness suggestionCount={10} />);
    openDropdown('al');
    expect(screen.getAllByRole('option')).toHaveLength(5);
  });

  it('shows no dropdown before the debounce elapses', () => {
    render(<Harness suggestionCount={3} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'al' } });
    // No timer advance yet.
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

describe('INV-94: keyboard navigation, selection, and ARIA wiring', () => {
  it('wires aria-expanded / aria-autocomplete / aria-controls when open', () => {
    render(<Harness />);
    const input = openDropdown('al');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-autocomplete')).toBe('list');
    expect(input.getAttribute('aria-controls')).toBe('recipient-suggestions');
  });

  it('ArrowDown moves the highlight and wraps at the end; aria-activedescendant tracks it', () => {
    render(<Harness suggestionCount={3} />);
    const input = openDropdown('al');

    fireEvent.keyDown(input, { key: 'ArrowDown' }); // -1 → 0
    expect(input.getAttribute('aria-activedescendant')).toBe('recipient-suggestion-0');
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // 0 → 1
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // 1 → 2
    expect(input.getAttribute('aria-activedescendant')).toBe('recipient-suggestion-2');
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // 2 → wraps to 0
    expect(input.getAttribute('aria-activedescendant')).toBe('recipient-suggestion-0');
  });

  it('ArrowUp from the top wraps to the last option', () => {
    render(<Harness suggestionCount={3} />);
    const input = openDropdown('al');
    fireEvent.keyDown(input, { key: 'ArrowUp' }); // -1 → last (2)
    expect(input.getAttribute('aria-activedescendant')).toBe('recipient-suggestion-2');
  });

  it('Enter selects the highlighted option, fills the value, closes, and notifies', () => {
    const onSuggestionSelect = vi.fn();
    render(<Harness suggestionCount={3} onSuggestionSelect={onSuggestionSelect} />);
    const input = openDropdown('al');
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // highlight 0
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSuggestionSelect).toHaveBeenCalledTimes(1);
    expect((input as HTMLInputElement).value).toBe(`0x${'0'.repeat(40)}`);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('selecting via mouse-down fills the value without losing input focus', () => {
    render(<Harness suggestionCount={3} />);
    const input = openDropdown('al');
    const option = screen.getAllByRole('option')[1];
    const notPrevented = fireEvent.mouseDown(option);
    expect(notPrevented).toBe(false); // preventDefault kept focus on the input
    expect((input as HTMLInputElement).value).toBe(`0x${String(1).padStart(40, '0')}`);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('Escape closes the open dropdown without clearing the input', () => {
    render(<Harness suggestionCount={3} />);
    const input = openDropdown('al');
    expect(screen.getByRole('listbox')).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect((input as HTMLInputElement).value).toBe('al');
  });

  it('click-outside closes the dropdown', () => {
    render(<Harness suggestionCount={3} />);
    openDropdown('al');
    expect(screen.getByRole('listbox')).toBeTruthy();
    act(() => {
      fireEvent.mouseDown(document.body);
    });
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
