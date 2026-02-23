/**
 * Alias Label Resolver Hook
 *
 * Provides a reactive `AddressLabelResolver` backed by alias storage.
 * The resolver maintains an in-memory record list via Dexie's `useLiveQuery`,
 * enabling **synchronous** label resolution during React render while
 * automatically re-rendering when aliases change.
 *
 * @example
 * ```tsx
 * import { AddressLabelProvider } from '@openzeppelin/ui-components';
 * import { useAliasLabelResolver } from '@openzeppelin/ui-storage';
 *
 * function App() {
 *   const resolver = useAliasLabelResolver(db, { networkId: 'ethereum-mainnet' });
 *   return (
 *     <AddressLabelProvider {...resolver}>
 *       <MyApp />
 *     </AddressLabelProvider>
 *   );
 * }
 * ```
 */
import type Dexie from 'dexie';
import { useCallback, useMemo } from 'react';

import type { AddressLabelResolver } from '@openzeppelin/ui-types';

import { useLiveQuery } from '../../react';
import { createAliasStorage } from './AliasStorage';
import type { AliasRecord, AliasStorageOptions } from './types';

/**
 * Options for the `useAliasLabelResolver` hook.
 */
export interface UseAliasLabelResolverOptions extends AliasStorageOptions {
  /**
   * Default network ID used when `resolveLabel` is called without a networkId.
   * When set, the resolver first attempts a network-specific lookup, then
   * falls back to a global (no networkId) lookup.
   */
  networkId?: string;
}

/**
 * Creates a reactive `AddressLabelResolver` backed by alias storage.
 *
 * The returned object can be spread directly into `AddressLabelProvider`:
 * ```tsx
 * const resolver = useAliasLabelResolver(db);
 * <AddressLabelProvider {...resolver}>...</AddressLabelProvider>
 * ```
 *
 * @param db - Dexie database instance with alias schema
 * @param options - Optional configuration including default networkId
 * @returns An `AddressLabelResolver` with a synchronous `resolveLabel` function
 */
export function useAliasLabelResolver(
  db: Dexie,
  options?: UseAliasLabelResolverOptions
): AddressLabelResolver {
  const { networkId: defaultNetworkId, ...storageOptions } = options ?? {};
  const tableName = storageOptions.tableName ?? 'aliases';

  const storage = useMemo(
    () => createAliasStorage(db, storageOptions),
    [
      db,
      tableName,
      storageOptions.duplicateMode,
      storageOptions.maxAliasLength,
      storageOptions.enableLogging,
      storageOptions.logLevel,
    ]
  );

  const records: AliasRecord[] | undefined = useLiveQuery(() => storage.getAll(), [storage]);

  const resolveLabel = useCallback(
    (address: string, networkId?: string): string | undefined => {
      if (!records) return undefined;

      const normalized = address.toLowerCase();
      const effectiveNetworkId = networkId ?? defaultNetworkId;

      if (effectiveNetworkId) {
        const networkMatch = records.find(
          (r) => r.address.toLowerCase() === normalized && r.networkId === effectiveNetworkId
        );
        if (networkMatch) return networkMatch.alias;
      }

      // Fall back to global alias (no networkId)
      const globalMatch = records.find(
        (r) => r.address.toLowerCase() === normalized && !r.networkId
      );
      return globalMatch?.alias;
    },
    [records, defaultNetworkId]
  );

  return { resolveLabel };
}
