/**
 * @vitest-environment jsdom
 *
 * SF-2 · Interaction & transition — INV-10, INV-11 (delta), INV-12.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BOTTOM_SHEET_KEYBOARD_STEP_PX } from '../../bottom-sheet-height';
import {
  BottomSheetHost,
  cleanupBottomSheetTests,
  DEFAULT_VIEWPORT_HEIGHT,
  getSheetCloseButton,
  getSheetSeparator,
  renderBottomSheet,
} from './helpers';

afterEach(() => {
  cleanupBottomSheetTests();
  vi.restoreAllMocks();
});

describe('INV-10: dismissal is explicit and scoped', () => {
  it('closes from the close button exactly once', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderBottomSheet({ 'aria-label': 'Preview', onOpenChange });

    await user.click(getSheetCloseButton()!);
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes on Escape when focus is inside the region', () => {
    const onOpenChange = vi.fn();
    renderBottomSheet({
      'aria-label': 'Preview',
      onOpenChange,
      children: <button type="button">Inside</button>,
    });
    screen.getByRole('button', { name: 'Inside' }).focus();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes on Escape when focus is on the separator', () => {
    const onOpenChange = vi.fn();
    renderBottomSheet({ 'aria-label': 'Preview', onOpenChange });
    getSheetSeparator()?.focus();
    fireEvent.keyDown(getSheetSeparator()!, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('ignores Escape when focus is on the page behind the sheet', () => {
    const onOpenChange = vi.fn();
    render(
      <>
        <input aria-label="Token name" />
        <BottomSheetHost aria-label="Preview" onOpenChange={onOpenChange} />
      </>
    );
    const field = screen.getByLabelText('Token name');
    field.focus();
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('never calls onOpenChange(true) from internal handlers', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderBottomSheet({ 'aria-label': 'Preview', onOpenChange });
    await user.click(getSheetCloseButton()!);
    expect(onOpenChange.mock.calls.every(([value]) => value === false)).toBe(true);
  });
});

describe('INV-11: pointer drag maps position to clamped height', () => {
  it('documents jsdom limit: pointer capture and drag deltas are browser-only (see bottom-sheet.browser.test.tsx)', () => {
    expect(typeof PointerEvent).toBe('undefined');
  });
});

describe('INV-12: keyboard resize matches the clamp path', () => {
  const interior = DEFAULT_VIEWPORT_HEIGHT * 0.6;

  it.each([
    { key: 'ArrowUp', expected: interior + BOTTOM_SHEET_KEYBOARD_STEP_PX },
    { key: 'ArrowDown', expected: interior - BOTTOM_SHEET_KEYBOARD_STEP_PX },
    { key: 'Home', expected: 160 },
    { key: 'End', expected: DEFAULT_VIEWPORT_HEIGHT },
  ])('$key proposes a clamped height through onHeightChange', async ({ key, expected }) => {
    const user = userEvent.setup();
    const onHeightChange = vi.fn();
    renderBottomSheet({
      'aria-label': 'Preview',
      height: interior,
      onHeightChange,
    });
    const separator = getSheetSeparator()!;
    separator.focus();
    await user.keyboard(`{${key}}`);
    expect(onHeightChange).toHaveBeenCalledWith(expected);
  });

  it('clamps ArrowDown at the lower bound for a short viewport', async () => {
    const user = userEvent.setup();
    const onHeightChange = vi.fn();
    renderBottomSheet({
      'aria-label': 'Preview',
      viewportHeight: 120,
      height: 136,
      onHeightChange,
    });
    const separator = getSheetSeparator()!;
    separator.focus();
    await user.keyboard('{ArrowDown}');
    expect(onHeightChange).toHaveBeenCalledWith(120);
  });

  it('ignores Enter for height changes', async () => {
    const user = userEvent.setup();
    const onHeightChange = vi.fn();
    renderBottomSheet({
      'aria-label': 'Preview',
      onHeightChange,
    });
    const separator = getSheetSeparator()!;
    separator.focus();
    await user.keyboard('{Enter}');
    expect(onHeightChange).not.toHaveBeenCalled();
  });
});
