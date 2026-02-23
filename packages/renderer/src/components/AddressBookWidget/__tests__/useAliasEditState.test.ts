/**
 * Tests for the alias editing state hook.
 *
 * Validates:
 * - onEditLabel sets editing state with address and anchorRect
 * - handleClose clears editing state
 * - The state shape matches AliasEditPopover props expectations
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAliasEditState } from '../useAliasEditState';

describe('useAliasEditState', () => {
  it('starts with null editing state', () => {
    const { result } = renderHook(() => useAliasEditState('ethereum-mainnet'));
    expect(result.current.editing).toBeNull();
  });

  it('onEditLabel opens editing state with address and default networkId', () => {
    const { result } = renderHook(() => useAliasEditState('ethereum-mainnet'));

    act(() => {
      result.current.lastClickRef.current = { x: 100, y: 200 };
      result.current.onEditLabel('0xABC');
    });

    expect(result.current.editing).toEqual({
      address: '0xABC',
      networkId: 'ethereum-mainnet',
      anchorRect: expect.any(DOMRect),
    });
    expect(result.current.editing!.anchorRect.x).toBe(100);
    expect(result.current.editing!.anchorRect.y).toBe(200);
  });

  it('onEditLabel uses provided networkId over default', () => {
    const { result } = renderHook(() => useAliasEditState('ethereum-mainnet'));

    act(() => {
      result.current.lastClickRef.current = { x: 0, y: 0 };
      result.current.onEditLabel('0xDEF', 'polygon-mainnet');
    });

    expect(result.current.editing!.networkId).toBe('polygon-mainnet');
  });

  it('handleClose resets editing to null', () => {
    const { result } = renderHook(() => useAliasEditState('ethereum-mainnet'));

    act(() => {
      result.current.lastClickRef.current = { x: 0, y: 0 };
      result.current.onEditLabel('0xABC');
    });

    expect(result.current.editing).not.toBeNull();

    act(() => {
      result.current.handleClose();
    });

    expect(result.current.editing).toBeNull();
  });

  it('works without a default networkId', () => {
    const { result } = renderHook(() => useAliasEditState(undefined));

    act(() => {
      result.current.lastClickRef.current = { x: 50, y: 50 };
      result.current.onEditLabel('0xAAA');
    });

    expect(result.current.editing!.networkId).toBeUndefined();
  });
});
