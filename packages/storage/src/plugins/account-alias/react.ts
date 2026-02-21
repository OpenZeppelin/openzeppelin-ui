/**
 * React Hook Integration for Account Alias Storage
 *
 * Provides React hooks for live reactive queries and CRUD operations
 * using the existing storage package patterns (createRepositoryHook, createJsonFileIO).
 */
import type Dexie from 'dexie';
import { useCallback } from 'react';

import { createRepositoryHook } from '../../react/createRepositoryHook';
import type { AliasStorage } from './AliasStorage';
import { createAliasStorage } from './AliasStorage';
import type { AliasInput, AliasRecord, AliasStorageOptions, AliasUpdate } from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Error handler callback type for hook operations.
 */
type OnError = (title: string, error: unknown) => void;

/**
 * Options for creating the alias storage hook.
 */
export interface UseAliasStorageOptions extends AliasStorageOptions {
  /**
   * Error handler called when CRUD operations fail.
   * Errors are re-thrown after the callback is invoked.
   */
  onError?: OnError;
}

/**
 * Return type for the useAliasStorage hook.
 * Matches the createRepositoryHook pattern from the storage package.
 */
export interface UseAliasStorageReturn {
  /** All alias records, undefined while loading */
  records: AliasRecord[] | undefined;

  /** True during initial data load */
  isLoading: boolean;

  /** Save a new alias or update existing */
  save: (input: AliasInput) => Promise<string>;

  /** Update an existing alias by ID */
  update: (id: string, updates: AliasUpdate) => Promise<void>;

  /** Remove an alias by ID */
  remove: (id: string) => Promise<void>;

  /** Clear all aliases */
  clear: () => Promise<void>;

  /** Export aliases to a downloadable JSON file */
  exportAsFile: (ids?: string[]) => Promise<void>;

  /** Import aliases from a File object */
  importFromFile: (file: File) => Promise<string[]>;

  /** Get global alias by address */
  getByAddress: (address: string) => Promise<AliasRecord | undefined>;

  /** Get alias by address and optional networkId */
  getByAddressAndNetwork: (address: string, networkId?: string) => Promise<AliasRecord | undefined>;

  /** Find all aliases for an address across all networks */
  findByAddress: (address: string) => Promise<AliasRecord[]>;

  /** Get alias record by alias name */
  getByAlias: (alias: string) => Promise<AliasRecord | undefined>;

  /** Resolve alias name to address */
  resolveAlias: (alias: string) => Promise<string | undefined>;

  /** Resolve address to alias name */
  resolveAddress: (address: string, networkId?: string) => Promise<string | undefined>;
}

// ============================================================================
// Hook Factory
// ============================================================================

/**
 * Creates a React hook for alias storage with live reactive updates.
 *
 * The returned hook provides:
 * - Live reactive list of all aliases (auto-updates on changes)
 * - CRUD operations with error handling
 * - File import/export functionality
 * - Convenience lookup methods
 *
 * This hook uses the shared createRepositoryHook pattern from the storage package
 * to ensure consistency with other storage hooks.
 *
 * @param db - Dexie database instance with alias schema
 * @param options - Configuration options including error handler
 * @returns A React hook for alias storage
 *
 * @example
 * ```typescript
 * import { createDexieDatabase, ALIAS_SCHEMA } from '@openzeppelin/ui-storage';
 * import { createUseAliasStorage } from '@openzeppelin/ui-storage/plugins/account-alias';
 *
 * const db = createDexieDatabase('MyApp', [{ version: 1, stores: ALIAS_SCHEMA }]);
 *
 * const useAliasStorage = createUseAliasStorage(db, {
 *   duplicateMode: 'strict',
 *   onError: (title, error) => toast.error(title),
 * });
 *
 * function MyComponent() {
 *   const { records, isLoading, save } = useAliasStorage();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *
 *   return (
 *     <ul>
 *       {records?.map(r => <li key={r.id}>{r.alias}: {r.address}</li>)}
 *     </ul>
 *   );
 * }
 * ```
 */
export function createUseAliasStorage(
  db: Dexie,
  options?: UseAliasStorageOptions
): () => UseAliasStorageReturn {
  // Extract onError from options to pass to hook
  const { onError, ...storageOptions } = options ?? {};

  // Create storage instance once (shared across all hook instances)
  const storage = createAliasStorage(db, storageOptions);

  // Create the base hook using createRepositoryHook
  const useBaseHook = createRepositoryHook<AliasRecord, AliasStorage>({
    db,
    tableName: storageOptions.tableName ?? 'aliases',
    query: (table) => table.orderBy('updatedAt').reverse().toArray(),
    repo: storage,
    onError,
    fileIO: {
      exportJson: (ids) => storage.exportJson(ids),
      // Adapter: importJson returns ImportResult, but createJsonFileIO expects string[]
      importJson: async (json) => {
        const result = await storage.importJson(json);
        return result.ids;
      },
      filePrefix: 'aliases',
    },
    // Expose alias-specific lookup methods
    expose: (repo) => ({
      getByAddress: repo.getByAddress.bind(repo),
      getByAddressAndNetwork: repo.getByAddressAndNetwork.bind(repo),
      findByAddress: repo.findByAddress.bind(repo),
      getByAlias: repo.getByAlias.bind(repo),
      resolveAlias: repo.resolveAlias.bind(repo),
      resolveAddress: repo.resolveAddress.bind(repo),
    }),
  });

  // Return wrapper hook that adds error handling to lookup methods
  return function useAliasStorage(): UseAliasStorageReturn {
    const baseResult = useBaseHook();

    // Wrap lookup operations with error handling
    const wrap = useCallback(async <T>(title: string, operation: () => Promise<T>): Promise<T> => {
      try {
        return await operation();
      } catch (error) {
        onError?.(title, error);
        throw error;
      }
    }, []);

    const getByAddress = useCallback(
      (address: string) =>
        wrap('Failed to get alias by address', () => storage.getByAddress(address)),
      [wrap]
    );

    const getByAddressAndNetwork = useCallback(
      (address: string, networkId?: string) =>
        wrap('Failed to get alias', () => storage.getByAddressAndNetwork(address, networkId)),
      [wrap]
    );

    const findByAddress = useCallback(
      (address: string) =>
        wrap('Failed to find aliases by address', () => storage.findByAddress(address)),
      [wrap]
    );

    const getByAlias = useCallback(
      (alias: string) => wrap('Failed to get alias by name', () => storage.getByAlias(alias)),
      [wrap]
    );

    const resolveAlias = useCallback(
      (alias: string) => wrap('Failed to resolve alias', () => storage.resolveAlias(alias)),
      [wrap]
    );

    const resolveAddress = useCallback(
      (address: string, networkId?: string) =>
        wrap('Failed to resolve address', () => storage.resolveAddress(address, networkId)),
      [wrap]
    );

    return {
      records: baseResult.records,
      isLoading: baseResult.isLoading,
      save: baseResult.save as (input: AliasInput) => Promise<string>,
      update: baseResult.update as (id: string, updates: AliasUpdate) => Promise<void>,
      remove: baseResult.remove,
      clear: baseResult.clear,
      exportAsFile: baseResult.exportAsFile as (ids?: string[]) => Promise<void>,
      importFromFile: baseResult.importFromFile as (file: File) => Promise<string[]>,
      getByAddress,
      getByAddressAndNetwork,
      findByAddress,
      getByAlias,
      resolveAlias,
      resolveAddress,
    };
  };
}

// ============================================================================
// Utility: Get Storage Instance
// ============================================================================

/**
 * Returns the underlying AliasStorage instance from the hook factory.
 * Useful for advanced use cases where direct storage access is needed.
 *
 * @param db - Dexie database instance
 * @param options - Storage options
 * @returns AliasStorage instance
 */
export function getAliasStorageInstance(db: Dexie, options?: AliasStorageOptions): AliasStorage {
  return createAliasStorage(db, options);
}
