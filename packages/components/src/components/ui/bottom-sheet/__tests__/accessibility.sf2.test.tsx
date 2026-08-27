/**
 * @vitest-environment jsdom
 *
 * SF-2 · Accessibility — INV-18, INV-19.
 */
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  cleanupBottomSheetTests,
  dispatchViewportResize,
  getSheetCloseButton,
  getSheetSeparator,
  renderBottomSheet,
} from './helpers';

afterEach(() => {
  cleanupBottomSheetTests();
  vi.restoreAllMocks();
});

describe('INV-18: separator semantics match the effective range', () => {
  it('exposes separator ARIA values for a tall viewport', () => {
    renderBottomSheet({
      id: 'code-preview',
      'aria-label': 'Preview',
      height: 400,
      viewportHeight: 800,
    });
    const separator = getSheetSeparator()!;
    expect(separator.getAttribute('role')).toBe('separator');
    expect(separator.getAttribute('aria-orientation')).toBe('horizontal');
    expect(separator.getAttribute('aria-label')).toBe('Resize');
    expect(separator.getAttribute('aria-controls')).toBe('code-preview');
    expect(separator.getAttribute('aria-valuemin')).toBe('160');
    expect(separator.getAttribute('aria-valuenow')).toBe('400');
    expect(separator.getAttribute('aria-valuemax')).toBe('800');
  });

  it('updates ARIA bounds when the viewport shrinks below the nominal floor', async () => {
    renderBottomSheet({
      'aria-label': 'Preview',
      height: 120,
      viewportHeight: 120,
    });
    const separator = getSheetSeparator()!;
    expect(separator.getAttribute('aria-valuemin')).toBe('120');
    expect(separator.getAttribute('aria-valuemax')).toBe('120');
    expect(separator.getAttribute('aria-valuenow')).toBe('120');

    dispatchViewportResize(100);
    await act(async () => {
      await vi.waitFor(() => {
        expect(getSheetSeparator()?.getAttribute('aria-valuemax')).toBe('100');
      });
    });
  });

  it('uses a generated region id when the host omits id', () => {
    renderBottomSheet({ 'aria-label': 'Preview' });
    const separator = getSheetSeparator()!;
    const regionId = separator.getAttribute('aria-controls');
    expect(regionId).toBeTruthy();
    expect(document.getElementById(regionId!)).not.toBeNull();
  });
});

describe('INV-19: both controls remain operable and named', () => {
  it('defaults the close button label to Close', () => {
    renderBottomSheet({ 'aria-label': 'Preview' });
    expect(getSheetCloseButton()?.getAttribute('aria-label')).toBe('Close');
  });

  it('honors a custom closeLabel', () => {
    renderBottomSheet({ 'aria-label': 'Preview', closeLabel: 'Dismiss preview' });
    expect(getSheetCloseButton()?.getAttribute('aria-label')).toBe('Dismiss preview');
  });

  it('keeps a 44px separator hit area and focus treatment', () => {
    renderBottomSheet({ 'aria-label': 'Preview' });
    const separator = getSheetSeparator()!;
    expect(separator.className).toContain('min-h-11');
    expect(separator.className).toContain('focus-visible:ring-2');
    expect(separator.tabIndex).toBe(0);
  });

  it('activates the close button from the keyboard', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderBottomSheet({ 'aria-label': 'Preview', onOpenChange });
    const close = getSheetCloseButton()!;
    close.focus();
    await user.keyboard('{Enter}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
