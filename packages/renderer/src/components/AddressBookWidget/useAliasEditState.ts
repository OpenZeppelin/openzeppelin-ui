/**
 * useAliasEditState
 *
 * Pure UI state hook for managing the inline alias edit popover.
 * Tracks which address is being edited and the click anchor position
 * so the popover can be positioned near the pencil icon.
 *
 * Returns an `onEditLabel` callback compatible with `AddressLabelProvider`.
 */
import { useCallback, useRef, useState } from 'react';

interface EditingState {
  address: string;
  networkId?: string;
  anchorRect: DOMRect;
}

/** Return type for the `useAliasEditState` hook. */
export interface UseAliasEditStateReturn {
  /** Current editing state, or null when no popover is open */
  editing: EditingState | null;
  /** Callback to pass to `AddressLabelProvider`'s `onEditLabel` */
  onEditLabel: (address: string, networkId?: string) => void;
  /** Close the popover */
  handleClose: () => void;
  /** Ref to capture pointer-down position (attach to a parent via onPointerDown) */
  lastClickRef: React.RefObject<{ x: number; y: number }>;
}

/** Manages the edit state for the inline alias popover. */
export function useAliasEditState(defaultNetworkId?: string): UseAliasEditStateReturn {
  const [editing, setEditing] = useState<EditingState | null>(null);
  const lastClickRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const onEditLabel = useCallback(
    (address: string, networkId?: string) => {
      const { x, y } = lastClickRef.current;
      const anchorRect = new DOMRect(x, y, 0, 0);
      setEditing({
        address,
        networkId: networkId ?? defaultNetworkId,
        anchorRect,
      });
    },
    [defaultNetworkId]
  );

  const handleClose = useCallback(() => {
    setEditing(null);
  }, []);

  return { editing, onEditLabel, handleClose, lastClickRef };
}
