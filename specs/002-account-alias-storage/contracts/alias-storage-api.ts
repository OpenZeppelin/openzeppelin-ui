/**
 * API Contract: AliasStorage Class
 *
 * This file defines the public API for the AliasStorage class.
 * Implementation MUST conform to this interface.
 */

import type {
  AliasExport,
  AliasInput,
  AliasRecord,
  AliasStorageOptions,
  AliasUpdate,
  ImportResult,
} from './types';

// ============================================================================
// Main Storage Interface
// ============================================================================

/**
 * AliasStorage provides address-to-alias mapping with configurable behavior.
 *
 * @example
 * ```typescript
 * import { createAliasStorage, createDexieDatabase, ALIAS_SCHEMA } from '@openzeppelin/ui-storage';
 *
 * const db = createDexieDatabase('MyApp', [{ version: 1, stores: ALIAS_SCHEMA }]);
 * const aliasStorage = createAliasStorage(db, { duplicateMode: 'strict' });
 *
 * await aliasStorage.save({ address: '0x123...', alias: 'Treasury' });
 * const record = await aliasStorage.getByAddress('0x123...');
 * ```
 */
export interface IAliasStorage {
  // ==========================================================================
  // Core CRUD Operations
  // ==========================================================================

  /**
   * Save a new alias or update existing alias for an address.
   * If the address already has an alias, it will be replaced.
   *
   * @param input - Alias data (address, alias, optional metadata)
   * @returns The ID of the created/updated record
   * @throws {AliasStorageError} DUPLICATE_ALIAS in strict mode when alias name exists
   * @throws {AliasStorageError} ALIAS_TOO_LONG when exceeds maxAliasLength
   */
  save(input: AliasInput): Promise<string>;

  /**
   * Update an existing alias record.
   *
   * @param id - Record ID to update
   * @param updates - Partial updates to apply
   * @throws {AliasStorageError} ALIAS_NOT_FOUND when record doesn't exist
   */
  update(id: string, updates: AliasUpdate): Promise<void>;

  /**
   * Delete an alias by record ID.
   *
   * @param id - Record ID to delete
   */
  delete(id: string): Promise<void>;

  /**
   * Delete an alias by address.
   * No-op if address has no alias.
   *
   * @param address - Address to remove alias for
   */
  deleteByAddress(address: string): Promise<void>;

  /**
   * Delete an alias by alias name.
   * In 'allow' mode with duplicates, deletes all records with this alias.
   *
   * @param alias - Alias name to delete
   */
  deleteByAlias(alias: string): Promise<void>;

  /**
   * Clear all aliases from storage.
   */
  clear(): Promise<void>;

  // ==========================================================================
  // Lookup Operations
  // ==========================================================================

  /**
   * Get an alias record by ID.
   *
   * @param id - Record ID
   * @returns The record, or undefined if not found
   */
  get(id: string): Promise<AliasRecord | undefined>;

  /**
   * Get a global alias record by address (networkId undefined).
   *
   * @param address - Account address
   * @returns The global alias record, or undefined if address has no global alias
   */
  getByAddress(address: string): Promise<AliasRecord | undefined>;

  /**
   * Get an alias record by address and optional networkId.
   *
   * @param address - Account address
   * @param networkId - Network identifier matching NetworkConfig.id (undefined for global alias)
   * @returns The record, or undefined if (address, networkId) has no alias
   */
  getByAddressAndNetwork(address: string, networkId?: string): Promise<AliasRecord | undefined>;

  /**
   * Find all alias records for an address across all networks.
   *
   * @param address - Account address
   * @returns Array of all alias records for this address (may include global and network-specific)
   */
  findByAddress(address: string): Promise<AliasRecord[]>;

  /**
   * Get an alias record by alias name.
   * In 'allow' mode with duplicates, returns the first match.
   *
   * @param alias - Alias name
   * @returns The record, or undefined if alias doesn't exist
   */
  getByAlias(alias: string): Promise<AliasRecord | undefined>;

  /**
   * Find all records with a given alias name.
   * Useful when duplicateMode is 'allow' or 'warn'.
   *
   * @param alias - Alias name to search
   * @returns Array of matching records
   */
  findByAlias(alias: string): Promise<AliasRecord[]>;

  /**
   * Get all alias records, ordered by updatedAt descending.
   *
   * @returns Array of all records
   */
  getAll(): Promise<AliasRecord[]>;

  /**
   * Get the count of stored aliases.
   *
   * @returns Number of records
   */
  count(): Promise<number>;

  /**
   * Check if an address has an alias.
   *
   * @param address - Address to check
   * @param networkId - Optional network identifier (undefined checks global alias)
   * @returns true if alias exists for the (address, networkId) pair
   */
  hasAlias(address: string, networkId?: string): Promise<boolean>;

  /**
   * Check if an alias name is in use.
   *
   * @param alias - Alias name to check
   * @returns true if at least one record uses this alias
   */
  aliasExists(alias: string): Promise<boolean>;

  // ==========================================================================
  // Convenience Methods
  // ==========================================================================

  /**
   * Resolve an alias name to an address.
   * Shorthand for getByAlias(alias)?.address.
   *
   * @param alias - Alias name
   * @returns The address, or undefined if alias doesn't exist
   */
  resolveAlias(alias: string): Promise<string | undefined>;

  /**
   * Resolve an address to an alias name.
   * Shorthand for getByAddressAndNetwork(address, networkId)?.alias.
   *
   * @param address - Account address
   * @param networkId - Optional network identifier (undefined for global alias)
   * @returns The alias, or undefined if address has no alias for this network
   */
  resolveAddress(address: string, networkId?: string): Promise<string | undefined>;

  // ==========================================================================
  // Bulk Operations
  // ==========================================================================

  /**
   * Bulk save multiple aliases.
   *
   * @param inputs - Array of alias inputs
   * @returns Array of created/updated record IDs
   */
  bulkSave(inputs: AliasInput[]): Promise<string[]>;

  /**
   * Export aliases to JSON format.
   *
   * @param ids - Optional array of record IDs to export (all if omitted)
   * @returns JSON string of AliasExport
   */
  exportJson(ids?: string[]): Promise<string>;

  /**
   * Import aliases from JSON.
   *
   * @param json - JSON string in AliasExport format
   * @returns Import result with counts and IDs
   * @throws {AliasStorageError} INVALID_IMPORT_FORMAT when JSON is malformed
   */
  importJson(json: string): Promise<ImportResult>;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an AliasStorage instance.
 *
 * @param db - Dexie database instance
 * @param options - Configuration options
 * @returns AliasStorage instance
 *
 * @example
 * ```typescript
 * const aliasStorage = createAliasStorage(db, {
 *   duplicateMode: 'warn',
 *   onDuplicate: (alias, addr) => console.warn(`Duplicate: ${alias}`),
 * });
 * ```
 */
export type CreateAliasStorage = (
  db: import('dexie').default,
  options?: AliasStorageOptions
) => IAliasStorage;

// ============================================================================
// React Hook Types
// ============================================================================

/**
 * Return type for the useAliasStorage hook.
 */
export interface UseAliasStorageReturn {
  /** All alias records (undefined while loading) */
  records: AliasRecord[] | undefined;

  /** Loading state */
  isLoading: boolean;

  /** Save a new alias or update existing */
  save: (input: AliasInput) => Promise<string>;

  /** Update an existing alias */
  update: (id: string, updates: AliasUpdate) => Promise<void>;

  /** Remove an alias by ID */
  remove: (id: string) => Promise<void>;

  /** Clear all aliases */
  clear: () => Promise<void>;

  /** Export aliases to file */
  exportAsFile: () => Promise<void>;

  /** Import aliases from file */
  importFromFile: (file: File) => Promise<string[]>;

  /** Get global alias by address */
  getByAddress: (address: string) => Promise<AliasRecord | undefined>;

  /** Get alias by address and optional networkId */
  getByAddressAndNetwork: (address: string, networkId?: string) => Promise<AliasRecord | undefined>;

  /** Find all aliases for an address across all networks */
  findByAddress: (address: string) => Promise<AliasRecord[]>;

  /** Get alias by name */
  getByAlias: (alias: string) => Promise<AliasRecord | undefined>;

  /** Resolve alias to address */
  resolveAlias: (alias: string) => Promise<string | undefined>;

  /** Resolve address to alias for specific network */
  resolveAddress: (address: string, networkId?: string) => Promise<string | undefined>;
}

/**
 * Hook factory for creating alias storage hooks.
 *
 * Implementation uses `createRepositoryHook` and `createJsonFileIO` internally
 * to ensure consistency with other storage hooks in the package.
 */
export type CreateUseAliasStorage = (
  db: import('dexie').default,
  options?: AliasStorageOptions & {
    onError?: (title: string, error: unknown) => void;
  }
) => () => UseAliasStorageReturn;
