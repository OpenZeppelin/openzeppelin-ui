/**
 * Alias Edit Popover Callbacks Hook
 *
 * Provides Dexie-backed callback props for the `AliasEditPopover` component
 * from `@openzeppelin/ui-renderer`. This follows the same bridge-hook pattern
 * as `useAddressBookWidgetProps` and `useAliasLabelResolver`.
 *
 * @example
 * ```tsx
 * import { AliasEditPopover, useAliasEditState } from '@openzeppelin/ui-renderer';
 * import { useAliasEditCallbacks } from '@openzeppelin/ui-storage';
 *
 * function App() {
 *   const editCallbacks = useAliasEditCallbacks(db);
 *   const { editing, onEditLabel, handleClose, lastClickRef } = useAliasEditState();
 *
 *   return (
 *     <div onPointerDown={(e) => { lastClickRef.current = { x: e.clientX, y: e.clientY }; }}>
 *       <AddressLabelProvider resolveLabel={...} onEditLabel={onEditLabel}>
 *         <App />
 *       </AddressLabelProvider>
 *       {editing && (
 *         <AliasEditPopover {...editing} onClose={handleClose} {...editCallbacks} />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
import type Dexie from 'dexie';
import { useCallback, useMemo } from 'react';

import { createAliasStorage } from './AliasStorage';
import type { AliasStorageOptions } from './types';

/** Lookup result shape expected by AliasEditPopover. */
export interface AliasEditLookupResult {
  id: string;
  alias: string;
}

/** Callback props returned by `useAliasEditCallbacks`, ready to spread into `AliasEditPopover`. */
export interface UseAliasEditCallbacksReturn {
  onLookup: (address: string, networkId?: string) => Promise<AliasEditLookupResult | undefined>;
  onSave: (input: { address: string; alias: string; networkId?: string }) => Promise<string>;
  onRemove: (id: string) => Promise<void>;
}

/**
 * Creates Dexie-backed callbacks for `AliasEditPopover`.
 *
 * The returned object can be spread directly into the popover:
 * ```tsx
 * const editCallbacks = useAliasEditCallbacks(db);
 * <AliasEditPopover {...editCallbacks} ... />
 * ```
 *
 * @param db - Dexie database instance with alias schema
 * @param options - Optional storage configuration
 * @returns Callback props compatible with `AliasEditPopoverProps`
 */
export function useAliasEditCallbacks(
  db: Dexie,
  options?: AliasStorageOptions
): UseAliasEditCallbacksReturn {
  const tableName = options?.tableName ?? 'aliases';
  const storage = useMemo(
    () => createAliasStorage(db, options),
    [
      db,
      tableName,
      options?.duplicateMode,
      options?.maxAliasLength,
      options?.enableLogging,
      options?.logLevel,
    ]
  );

  const onLookup = useCallback(
    async (address: string, networkId?: string): Promise<AliasEditLookupResult | undefined> => {
      const record = await storage.getByAddressAndNetwork(address, networkId);
      if (!record) return undefined;
      return { id: record.id, alias: record.alias };
    },
    [storage]
  );

  const onSave = useCallback(
    async (input: { address: string; alias: string; networkId?: string }): Promise<string> => {
      return storage.save(input);
    },
    [storage]
  );

  const onRemove = useCallback(
    async (id: string): Promise<void> => {
      return storage.delete(id);
    },
    [storage]
  );

  return { onLookup, onSave, onRemove };
}
