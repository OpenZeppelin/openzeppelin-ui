/**
 * @vitest-environment jsdom
 *
 * SF-2 · Lifecycle & stability — INV-13 (jsdom cleanup), INV-14, INV-15.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BottomSheet } from '../../bottom-sheet';
import {
  BottomSheetHost,
  cleanupBottomSheetTests,
  getSheetRegion,
  getSheetSeparator,
  mockViewportHeight,
  renderBottomSheet,
} from './helpers';

afterEach(() => {
  cleanupBottomSheetTests();
  vi.restoreAllMocks();
});

describe('INV-14: browser globals are lifecycle-bound', () => {
  it('does not attach a viewport listener while closed', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    renderBottomSheet({ initialOpen: false, 'aria-label': 'Preview' });
    expect(addSpy.mock.calls.filter(([type]) => type === 'resize')).toHaveLength(0);
    addSpy.mockRestore();
  });

  it('removes the viewport listener after close', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { rerender } = render(<BottomSheetHost open aria-label="Preview" />);
    rerender(<BottomSheetHost open={false} aria-label="Preview" />);
    expect(removeSpy.mock.calls.filter(([type]) => type === 'resize').length).toBeGreaterThan(0);
    removeSpy.mockRestore();
  });

  it('cleans up listeners across repeated open/close cycles', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { rerender } = render(<BottomSheetHost open={false} aria-label="Preview" />);

    rerender(<BottomSheetHost open aria-label="Preview" />);
    rerender(<BottomSheetHost open={false} aria-label="Preview" />);
    rerender(<BottomSheetHost open aria-label="Preview" />);

    const resizeAdds = addSpy.mock.calls.filter(([type]) => type === 'resize').length;
    const resizeRemoves = removeSpy.mock.calls.filter(([type]) => type === 'resize').length;
    expect(resizeRemoves).toBeGreaterThanOrEqual(resizeAdds - 1);
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});

describe('INV-13: closing abandons drag cleanup paths (jsdom)', () => {
  it('does not throw when pointer handlers run after unmount', () => {
    const onHeightChange = vi.fn();
    const { unmount } = renderBottomSheet({
      'aria-label': 'Preview',
      height: 400,
      onHeightChange,
    });
    const separator = getSheetSeparator()!;
    fireEvent.pointerDown(separator, {
      clientY: 500,
      pointerId: 1,
      isPrimary: true,
      button: 0,
      pointerType: 'mouse',
    });
    expect(() => unmount()).not.toThrow();
    expect(() => {
      fireEvent.pointerMove(separator, { clientY: 450, pointerId: 1 });
    }).not.toThrow();
    expect(onHeightChange).not.toHaveBeenCalled();
  });
});

describe('INV-15: instances are isolated', () => {
  it('assigns distinct generated ids and heights to two open sheets', () => {
    render(
      <>
        <BottomSheetHost aria-label="Sheet A" initialHeight={300} />
        <BottomSheetHost aria-label="Sheet B" initialHeight={500} />
      </>
    );
    const regions = screen.getAllByRole('region');
    expect(regions).toHaveLength(2);
    expect(regions[0]?.id).not.toBe(regions[1]?.id);
    expect(regions[0]?.style.height).toBe('300px');
    expect(regions[1]?.style.height).toBe('500px');
  });

  it('does not change the remaining sheet when one instance closes', () => {
    const { rerender } = render(
      <>
        <BottomSheetHost aria-label="Sheet A" open height={300} />
        <BottomSheetHost aria-label="Sheet B" open height={500} />
      </>
    );
    rerender(
      <>
        <BottomSheetHost aria-label="Sheet A" open={false} height={300} />
        <BottomSheetHost aria-label="Sheet B" open height={500} />
      </>
    );
    expect(screen.getAllByRole('region', { name: 'Sheet B' })).toHaveLength(1);
    expect(screen.getByRole('region', { name: 'Sheet B' }).style.height).toBe('500px');
  });

  it('keeps independent correction callbacks across instances', async () => {
    const onHeightChangeA = vi.fn();
    const onHeightChangeB = vi.fn();
    render(
      <>
        <BottomSheetHost aria-label="Sheet A" height={1200} onHeightChange={onHeightChangeA} />
        <BottomSheetHost aria-label="Sheet B" height={1200} onHeightChange={onHeightChangeB} />
      </>
    );
    await vi.waitFor(() => {
      expect(onHeightChangeA).toHaveBeenCalled();
      expect(onHeightChangeB).toHaveBeenCalled();
    });
    expect(onHeightChangeA.mock.calls.at(-1)?.[0]).toBe(800);
    expect(onHeightChangeB.mock.calls.at(-1)?.[0]).toBe(800);
  });
});

describe('INV-3 / INV-14: importing the component module has no render-time document access', () => {
  it('allows constructing props without touching document', () => {
    const restore = mockViewportHeight(800);
    expect(() =>
      render(
        <BottomSheet
          aria-label="Preview"
          open={false}
          onOpenChange={() => {}}
          height={480}
          onHeightChange={() => {}}
        />
      )
    ).not.toThrow();
    expect(getSheetRegion()).toBeNull();
    restore();
  });
});
