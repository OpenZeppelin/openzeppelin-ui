/**
 * @vitest-environment jsdom
 *
 * SF-2 · Render contract — INV-1, INV-2, INV-9 (jsdom), INV-16, INV-17.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createRef } from 'react';

import { BottomSheet } from '../../bottom-sheet';
import {
  BottomSheetHost,
  cleanupBottomSheetTests,
  DEFAULT_VIEWPORT_HEIGHT,
  getSheetCloseButton,
  getSheetLayer,
  getSheetRegion,
  getSheetSeparator,
  mockViewportHeight,
  renderBottomSheet,
} from './helpers';

afterEach(() => {
  cleanupBottomSheetTests();
});

describe('INV-1: open state is the sole visibility authority', () => {
  it('renders nothing when closed', () => {
    renderBottomSheet({ initialOpen: false, 'aria-label': 'Preview' });
    expect(getSheetLayer()).toBeNull();
    expect(screen.queryByRole('region', { name: 'Preview' })).toBeNull();
  });

  it('portals exactly one sheet region when open', () => {
    renderBottomSheet({ initialOpen: true, 'aria-label': 'Preview' });
    expect(getSheetLayer()).not.toBeNull();
    expect(screen.getAllByRole('region', { name: 'Preview' })).toHaveLength(1);
  });

  it('removes the portal on close (after the exit slide) and restores it on reopen', async () => {
    const { rerender } = render(
      <BottomSheetHost initialOpen open={undefined} aria-label="Preview" />
    );
    expect(getSheetRegion()).not.toBeNull();

    rerender(<BottomSheetHost initialOpen={false} open={false} aria-label="Preview" />);
    // Exit slide: still in the DOM for BOTTOM_SHEET_TRANSITION_MS, inert, marked closed.
    const closing = getSheetRegion();
    expect(closing?.getAttribute('data-state')).toBe('closed');
    expect(closing?.className).toContain('pointer-events-none');
    await waitFor(() => {
      expect(getSheetRegion()).toBeNull();
    });

    rerender(<BottomSheetHost initialOpen open aria-label="Preview" />);
    expect(getSheetRegion()).not.toBeNull();
  });

  it('keeps visibility when only height changes', () => {
    const { rerender } = render(<BottomSheetHost open height={400} aria-label="Preview" />);
    expect(getSheetRegion()).not.toBeNull();

    rerender(<BottomSheetHost open height={500} aria-label="Preview" />);
    expect(getSheetRegion()).not.toBeNull();
    expect(getSheetRegion()?.style.height).toBe('500px');
  });
});

describe('INV-2: region structure remains complete', () => {
  it('renders children, separator, and close control with ref on the region', () => {
    const ref = createRef<HTMLElement>();
    const restore = mockViewportHeight(DEFAULT_VIEWPORT_HEIGHT);
    render(
      <BottomSheet
        ref={ref}
        aria-label="Preview"
        open
        height={480}
        onOpenChange={() => {}}
        onHeightChange={() => {}}
      >
        <p>Generated files</p>
      </BottomSheet>
    );

    expect(screen.getByText('Generated files')).not.toBeNull();
    expect(getSheetSeparator()).not.toBeNull();
    expect(getSheetCloseButton()).not.toBeNull();
    expect(ref.current).toBe(getSheetRegion());
    expect(ref.current?.getAttribute('data-slot')).toBe('bottom-sheet');
    restore();
  });

  it('merges caller className without dropping required positioning classes', () => {
    renderBottomSheet({
      'aria-label': 'Preview',
      className: 'border-dashed',
    });
    const region = getSheetRegion();
    expect(region?.className).toContain('border-dashed');
    expect(region?.className).toContain('pointer-events-auto');
    expect(region?.className).toContain('bottom-0');
    expect(region?.className).toContain('overflow-hidden');
  });
});

describe('INV-9: opening is non-modal (jsdom-observable)', () => {
  it('does not move focus when the sheet opens over a focused field', () => {
    const { rerender } = render(
      <>
        <input aria-label="Token name" />
        <BottomSheetHost initialOpen={false} aria-label="Preview" />
      </>
    );
    const field = screen.getByLabelText('Token name');
    field.focus();
    expect(document.activeElement).toBe(field);

    rerender(
      <>
        <input aria-label="Token name" />
        <BottomSheetHost initialOpen aria-label="Preview" />
      </>
    );
    expect(document.activeElement).toBe(field);
  });

  it('does not apply modal document mutations', () => {
    renderBottomSheet({ 'aria-label': 'Preview' });
    expect(document.body.style.overflow).toBe('');
    expect(document.body.getAttribute('inert')).toBeNull();
    expect(document.querySelector('[aria-modal="true"]')).toBeNull();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('routes pointer events through the layer and sheet classes', () => {
    renderBottomSheet({ 'aria-label': 'Preview' });
    expect(getSheetLayer()?.className).toContain('pointer-events-none');
    expect(getSheetRegion()?.className).toContain('pointer-events-auto');
  });
});

describe('INV-16: the sheet stays below existing dialogs', () => {
  it('uses z-40 on the portal layer and region', () => {
    renderBottomSheet({ 'aria-label': 'Preview' });
    expect(getSheetLayer()?.className).toContain('z-40');
    expect(getSheetRegion()?.className).toContain('z-40');
  });
});

describe('INV-17: the sheet is a named region, never a dialog', () => {
  it('exposes a labelled section region without dialog semantics', () => {
    renderBottomSheet({ 'aria-label': 'Generated project preview' });
    const region = screen.getByRole('region', { name: 'Generated project preview' });
    expect(region.tagName).toBe('SECTION');
    expect(region.getAttribute('role')).toBeNull();
    expect(region.getAttribute('aria-modal')).toBeNull();
  });

  it('supports aria-labelledby when the target exists', () => {
    render(
      <>
        <h2 id="preview-title">Generated project preview</h2>
        <BottomSheetHost aria-labelledby="preview-title" />
      </>
    );
    expect(screen.getByRole('region', { name: 'Generated project preview' })).not.toBeNull();
  });
});

describe('AS-1 (jsdom): tall default height style', () => {
  it('renders the clamped default height for the current viewport', () => {
    const restore = mockViewportHeight(DEFAULT_VIEWPORT_HEIGHT);
    renderBottomSheet({ 'aria-label': 'Preview' });
    expect(getSheetRegion()?.style.height).toBe(`${DEFAULT_VIEWPORT_HEIGHT * 0.6}px`);
    restore();
  });
});
