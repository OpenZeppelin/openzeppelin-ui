/**
 * Account Alias Storage Schema
 *
 * This file defines the Dexie schema for the Account Alias Storage plugin.
 * The schema can be merged with existing database schemas when setting up a database version.
 */

import type { AliasStorageOptions } from './types';
import { DEFAULT_OPTIONS } from './types';

/**
 * Default Dexie schema for the aliases table.
 *
 * Index explanation:
 * - `++id`: Auto-increment primary key (overridden by `generateId()` for UUID)
 * - `[address+networkId]`: Compound index for efficient lookup by (address, networkId) pair. Uniqueness is enforced at the application layer in `AliasStorage.save`.
 * - `address`: Non-unique index for lookup by address across all networks
 * - `networkId`: Non-unique index for lookup by network
 * - `alias`: Non-unique index for lookup by alias name
 * - `createdAt`, `updatedAt`: Indexed for chronological queries
 *
 * @example
 * ```typescript
 * import { ALIAS_SCHEMA, createDexieDatabase } from '@openzeppelin/ui-storage';
 *
 * const db = createDexieDatabase('MyApp', [{
 *   version: 1,
 *   stores: {
 *     ...ALIAS_SCHEMA,
 *     // ...other tables
 *   }
 * }]);
 * ```
 */
export const ALIAS_SCHEMA = {
  aliases: '++id, [address+networkId], address, networkId, alias, createdAt, updatedAt',
} as const;

/**
 * Creates an alias schema with a custom table name.
 * Use this when you need multiple independent alias stores in the same database.
 *
 * @param tableName - Custom table name for the aliases store
 * @returns Schema object with the custom table name
 *
 * @example
 * ```typescript
 * const schema = createAliasSchema('myAliases');
 * // { myAliases: '++id, [address+networkId], address, networkId, alias, createdAt, updatedAt' }
 * ```
 */
export function createAliasSchema(
  tableName: string = DEFAULT_OPTIONS.tableName
): Record<string, string> {
  return {
    [tableName]: '++id, [address+networkId], address, networkId, alias, createdAt, updatedAt',
  };
}

/**
 * Gets the schema for alias storage based on provided options.
 * Convenience function that respects the tableName option.
 *
 * @param options - Optional storage options containing tableName
 * @returns Schema object for the configured table name
 */
export function getAliasSchema(options?: AliasStorageOptions): Record<string, string> {
  const tableName = options?.tableName ?? DEFAULT_OPTIONS.tableName;
  return createAliasSchema(tableName);
}
