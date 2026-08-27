/**
 * @vitest-environment jsdom
 *
 * SF-2 · Prop / state contract — INV-4, INV-7, INV-8.
 */
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StrictMode, type ComponentProps } from 'react';

import { BottomSheet } from '../../bottom-sheet';
import { defaultBottomSheetHeight } from '../../bottom-sheet-height';
import {
  BottomSheetHost,
  cleanupBottomSheetTests,
  DEFAULT_VIEWPORT_HEIGHT,
  dispatchViewportResize,
  getSheetRegion,
  renderBottomSheet,
} from './helpers';

afterEach(() => {
  cleanupBottomSheetTests();
  vi.restoreAllMocks();
});

describe('INV-4: exactly one nonblank accessible-name source', () => {
  it('mounts with a valid aria-label without throwing', () => {
    expect(() => renderBottomSheet({ 'aria-label': 'Preview' })).not.toThrow();
  });

  it('emits one dev error for missing name and still mounts', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderBottomSheet({ 'aria-label': '' });
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0]?.[0]).toContain('Accessible name required');
    expect(getSheetRegion()).not.toBeNull();
  });

  it('emits one dev error for dual name sources and still mounts', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onOpenChange = vi.fn();
    const onHeightChange = vi.fn();
    // Runtime invalid props bypass the XOR type on purpose.
    const invalidProps = {
      'aria-label': 'A',
      'aria-labelledby': 'existing-title',
      open: true,
      height: 480,
      onOpenChange,
      onHeightChange,
      children: null,
    } as ComponentProps<typeof BottomSheet>;
    render(<BottomSheet {...invalidProps} />);
    const nameErrors = error.mock.calls.filter((args) =>
      String(args[0]).includes('Accessible name required')
    );
    expect(nameErrors).toHaveLength(1);
    expect(getSheetRegion()).not.toBeNull();
  });

  it('emits one dev error for a missing labelledby target and still mounts', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderBottomSheet({ 'aria-labelledby': 'missing-target' });
    await waitFor(() => {
      expect(error).toHaveBeenCalledTimes(1);
    });
    expect(error.mock.calls[0]?.[0]).toContain('missing-target');
    expect(getSheetRegion()).not.toBeNull();
  });

  it('deduplicates repeated diagnostics for the same invalid condition', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(<BottomSheetHost aria-labelledby="missing-target" />);
    await waitFor(() => expect(error).toHaveBeenCalledTimes(1));
    rerender(<BottomSheetHost aria-labelledby="missing-target" />);
    expect(error).toHaveBeenCalledTimes(1);
  });
});

describe('INV-7: non-finite host height recovers through onHeightChange', () => {
  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'substitutes default height for %s and warns once in dev',
    async (invalid) => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const onHeightChange = vi.fn();
      renderBottomSheet({
        'aria-label': 'Preview',
        height: invalid,
        onHeightChange,
      });

      const expected = defaultBottomSheetHeight(DEFAULT_VIEWPORT_HEIGHT);
      await waitFor(() => {
        expect(onHeightChange).toHaveBeenCalledWith(expected);
      });
      expect(getSheetRegion()?.style.height).toBe(`${expected}px`);
      expect(warn).toHaveBeenCalledTimes(1);
    }
  );
});

describe('INV-8: correction reporting converges without loops', () => {
  it('reports once when the host height is out of range', async () => {
    const onHeightChange = vi.fn();
    renderBottomSheet({
      'aria-label': 'Preview',
      height: 1200,
      onHeightChange,
    });
    await waitFor(() => {
      expect(onHeightChange).toHaveBeenCalledTimes(1);
      expect(onHeightChange).toHaveBeenCalledWith(DEFAULT_VIEWPORT_HEIGHT);
    });
  });

  it('does not loop when the host ignores corrections', async () => {
    const onHeightChange = vi.fn();
    renderBottomSheet({
      'aria-label': 'Preview',
      height: 1200,
      onHeightChange,
    });
    await waitFor(() => expect(onHeightChange).toHaveBeenCalledTimes(1));
    expect(onHeightChange).toHaveBeenCalledTimes(1);
  });

  it('survives Strict Mode without duplicate correction loops', async () => {
    const onHeightChange = vi.fn();
    render(
      <StrictMode>
        <BottomSheetHost aria-label="Preview" height={1200} onHeightChange={onHeightChange} />
      </StrictMode>
    );
    await waitFor(() => expect(onHeightChange.mock.calls.length).toBeGreaterThan(0));
    expect(onHeightChange.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('reports a new pair when the viewport shrinks but the host prop stays out of range', async () => {
    const onHeightChange = vi.fn();
    renderBottomSheet({
      'aria-label': 'Preview',
      height: 1200,
      onHeightChange,
      viewportHeight: 800,
    });
    await waitFor(() => expect(onHeightChange).toHaveBeenCalledWith(800));

    onHeightChange.mockClear();
    act(() => {
      dispatchViewportResize(600);
    });
    await waitFor(() => {
      expect(onHeightChange).toHaveBeenCalledWith(600);
    });
  });

  it('does not call onHeightChange during render for an already-valid height', async () => {
    const onHeightChange = vi.fn();
    renderBottomSheet({
      'aria-label': 'Preview',
      height: 400,
      onHeightChange,
    });
    await waitFor(() => {
      expect(getSheetRegion()?.style.height).toBe('400px');
    });
    expect(onHeightChange).not.toHaveBeenCalled();
  });
});
