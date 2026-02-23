/**
 * Address Book Widget Bridge Hook
 *
 * Returns the exact `AddressBookWidgetProps` shape from `@openzeppelin/ui-types`,
 * ready to spread into `AddressBookWidget` from `@openzeppelin/ui-renderer`.
 *
 * This follows the same shared-type + bridge-hook pattern established by
 * `useAliasLabelResolver` → `AddressLabelResolver` in Phase 1.
 *
 * @example
 * ```tsx
 * import { AddressBookWidget } from '@openzeppelin/ui-renderer';
 * import { useAddressBookWidgetProps } from '@openzeppelin/ui-storage';
 *
 * function Settings() {
 *   const widgetProps = useAddressBookWidgetProps(db, { networkId });
 *   return <AddressBookWidget {...widgetProps} />;
 * }
 * ```
 */
import type Dexie from 'dexie';
import { useCallback, useMemo } from 'react';

import type { AddressBookAlias, AddressBookWidgetProps } from '@openzeppelin/ui-types';

import { createJsonFileIO, useLiveQuery } from '../../react';
import { createAliasStorage } from './AliasStorage';
import type { AliasRecord, AliasStorageOptions } from './types';

/** Options for the useAddressBookWidgetProps bridge hook. */
export interface UseAddressBookWidgetPropsOptions extends AliasStorageOptions {
  /** Default network ID for scoping display */
  networkId?: string;
  /** When provided, only aliases for these network IDs are fetched (DB-level filter) */
  filterNetworkIds?: string[];
  /** Error handler (e.g., toast notifications) */
  onError?: (title: string, error: unknown) => void;
}

function toWidgetAlias(record: AliasRecord): AddressBookAlias {
  return {
    id: record.id,
    address: record.address,
    alias: record.alias,
    networkId: record.networkId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * Bridge hook that returns spread-ready props for `AddressBookWidget`.
 *
 * Connects Dexie-backed alias storage to the renderer widget,
 * providing reactive data, CRUD callbacks, and import/export support.
 */
export function useAddressBookWidgetProps(
  db: Dexie,
  options?: UseAddressBookWidgetPropsOptions
): AddressBookWidgetProps {
  const { networkId, filterNetworkIds, onError, ...storageOptions } = options ?? {};
  const { duplicateMode, maxAliasLength, onDuplicate, enableLogging, logLevel } = storageOptions;
  const tableName = storageOptions.tableName ?? 'aliases';

  const storage = useMemo(
    () => createAliasStorage(db, storageOptions),
    // Individual primitive deps — storageOptions is a new object each render
    [db, tableName, duplicateMode, maxAliasLength, onDuplicate, enableLogging, logLevel]
  );

  const fileIO = useMemo(
    () =>
      createJsonFileIO(
        {
          exportJson: (ids) => storage.exportJson(ids),
          importJson: async (json) => {
            const result = await storage.importJson(json);
            return result.ids;
          },
        },
        {
          filePrefix: 'aliases',
          onError,
        }
      ),
    [storage, onError]
  );

  const filterKey = filterNetworkIds?.slice().sort().join(',') ?? '';

  const records: AliasRecord[] | undefined = useLiveQuery(
    () =>
      filterNetworkIds && filterNetworkIds.length > 0
        ? storage.getByNetworkIds(filterNetworkIds)
        : storage.getAll(),
    [storage, filterKey]
  );

  const aliases: AddressBookAlias[] | undefined = useMemo(
    () => records?.map(toWidgetAlias),
    [records]
  );

  const isLoading = aliases === undefined;

  const onSave = useCallback(
    async (input: { address: string; alias: string; networkId?: string }): Promise<string> => {
      try {
        return await storage.save(input);
      } catch (error) {
        onError?.('Failed to save alias', error);
        throw error;
      }
    },
    [storage, onError]
  );

  const onRemove = useCallback(
    async (id: string): Promise<void> => {
      try {
        await storage.delete(id);
      } catch (error) {
        onError?.('Failed to remove alias', error);
        throw error;
      }
    },
    [storage, onError]
  );

  const onClear = useCallback(async (): Promise<void> => {
    try {
      await storage.clear();
    } catch (error) {
      onError?.('Failed to clear aliases', error);
      throw error;
    }
  }, [storage, onError]);

  const onExport = useCallback(
    async (ids?: string[]): Promise<void> => {
      await fileIO.exportAsFile(ids);
    },
    [fileIO]
  );

  const onImport = useCallback(
    async (file: File): Promise<string[]> => {
      return await fileIO.importFromFile(file);
    },
    [fileIO]
  );

  return {
    aliases,
    isLoading,
    onSave,
    onRemove,
    onClear,
    onExport,
    onImport,
    currentNetworkId: networkId,
  };
}
