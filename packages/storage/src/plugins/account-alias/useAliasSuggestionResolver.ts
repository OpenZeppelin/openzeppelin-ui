/**
 * Alias Suggestion Resolver Hook
 *
 * Provides a reactive `AddressSuggestionResolver` backed by alias storage.
 * The resolver maintains an in-memory record list via Dexie's `useLiveQuery`,
 * enabling **synchronous** suggestion resolution during React render while
 * automatically re-rendering when aliases change.
 *
 * @example
 * ```tsx
 * import { AddressSuggestionProvider } from '@openzeppelin/ui-components';
 * import { useAliasSuggestionResolver } from '@openzeppelin/ui-storage';
 *
 * function App() {
 *   const resolver = useAliasSuggestionResolver(db);
 *   return (
 *     <AddressSuggestionProvider {...resolver}>
 *       <MyApp />
 *     </AddressSuggestionProvider>
 *   );
 * }
 * ```
 */
import type Dexie from 'dexie';
import { useCallback, useMemo } from 'react';

import type { AddressSuggestion, AddressSuggestionResolver } from '@openzeppelin/ui-types';

import { useLiveQuery } from '../../react';
import { createAliasStorage } from './AliasStorage';
import type { AliasRecord, AliasStorageOptions } from './types';

const MAX_SUGGESTIONS = 5;

/**
 * Options for the `useAliasSuggestionResolver` hook.
 */
export interface UseAliasSuggestionResolverOptions extends AliasStorageOptions {
  /**
   * Maximum number of suggestions to return per query.
   * @default 5
   */
  maxSuggestions?: number;
}

/**
 * Creates a reactive `AddressSuggestionResolver` backed by alias storage.
 *
 * The returned object can be spread directly into `AddressSuggestionProvider`:
 * ```tsx
 * const resolver = useAliasSuggestionResolver(db);
 * <AddressSuggestionProvider {...resolver}>...</AddressSuggestionProvider>
 * ```
 *
 * @param db - Dexie database instance with alias schema
 * @param options - Optional configuration
 * @returns An `AddressSuggestionResolver` with a synchronous `resolveSuggestions` function
 */
export function useAliasSuggestionResolver(
  db: Dexie,
  options?: UseAliasSuggestionResolverOptions
): AddressSuggestionResolver {
  const { maxSuggestions = MAX_SUGGESTIONS, ...storageOptions } = options ?? {};
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

  const resolveSuggestions = useCallback(
    (query: string, networkId?: string): AddressSuggestion[] => {
      if (!records || !query.trim()) return [];

      const lower = query.toLowerCase();

      return records
        .filter((r) => {
          const matchesQuery =
            r.alias.toLowerCase().includes(lower) || r.address.toLowerCase().includes(lower);
          const matchesNetwork = !networkId || !r.networkId || r.networkId === networkId;
          return matchesQuery && matchesNetwork;
        })
        .sort((a, b) => a.alias.localeCompare(b.alias))
        .slice(0, maxSuggestions)
        .map((r) => ({
          label: r.alias,
          value: r.address,
          description: r.networkId,
        }));
    },
    [records, maxSuggestions]
  );

  return { resolveSuggestions };
}
