/**
 * AliasStorage - Core storage class for address-to-alias mappings
 *
 * Provides CRUD operations for managing address aliases with configurable
 * duplicate handling, validation, and multi-network support.
 */
import type Dexie from 'dexie';
import type { Table } from 'dexie';

import { generateId, logger } from '@openzeppelin/ui-utils';

import { withQuotaHandling } from '../../base/utils';
import {
  aliasNotFoundError,
  aliasTooLongError,
  duplicateAliasError,
  invalidAddressError,
  invalidAliasError,
  invalidImportFormatError,
  storageQuotaExceededError,
} from './errors';
import type {
  AliasExport,
  AliasInput,
  AliasRecord,
  AliasStorageOptions,
  AliasUpdate,
  ImportResult,
} from './types';
import { DEFAULT_OPTIONS } from './types';

/**
 * Sentinel value used to represent a global alias (no specific network) in IndexedDB.
 * IndexedDB compound indexes don't support undefined/null, so we use this sentinel.
 * This value is internal and converted to/from undefined in the public API.
 */
const GLOBAL_NETWORK_SENTINEL = '__global__';

/**
 * Resolved options with all defaults applied.
 */
type ResolvedOptions = Required<Omit<AliasStorageOptions, 'onDuplicate' | 'maxAliasLength'>> & {
  onDuplicate?: AliasStorageOptions['onDuplicate'];
  maxAliasLength: number | undefined;
};

/**
 * Converts networkId for storage (undefined -> sentinel).
 */
function toStorageNetworkId(networkId: string | undefined): string {
  return networkId === undefined || networkId === '' ? GLOBAL_NETWORK_SENTINEL : networkId;
}

/**
 * Converts networkId from storage (sentinel -> undefined).
 */
function fromStorageNetworkId(networkId: string): string | undefined {
  return networkId === GLOBAL_NETWORK_SENTINEL ? undefined : networkId;
}

/**
 * Converts a record from storage format to API format.
 */
function fromStorageRecord(record: AliasRecord): AliasRecord {
  return {
    ...record,
    networkId: fromStorageNetworkId(record.networkId ?? GLOBAL_NETWORK_SENTINEL),
  };
}

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
export class AliasStorage {
  private readonly table: Table<AliasRecord>;
  private readonly options: ResolvedOptions;

  /**
   * Creates a new AliasStorage instance.
   *
   * @param db - Dexie database instance with alias schema
   * @param options - Configuration options
   */
  constructor(db: Dexie, options?: AliasStorageOptions) {
    // Check if maxAliasLength was explicitly provided (even as undefined)
    const hasMaxAliasLength = options !== undefined && 'maxAliasLength' in options;

    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
      // Preserve undefined maxAliasLength only if explicitly set
      maxAliasLength: hasMaxAliasLength ? options.maxAliasLength : DEFAULT_OPTIONS.maxAliasLength,
    };

    this.table = db.table(this.options.tableName);

    this.log('debug', 'Initialized with options', {
      duplicateMode: this.options.duplicateMode,
      maxAliasLength: this.options.maxAliasLength,
      tableName: this.options.tableName,
    });
  }

  // ==========================================================================
  // Core CRUD Operations
  // ==========================================================================

  /**
   * Save a new alias or update existing alias for an address.
   * If the address already has an alias for the same networkId, it will be replaced.
   *
   * @param input - Alias data (address, alias, optional networkId and metadata)
   * @returns The ID of the created/updated record
   * @throws {AliasStorageError} DUPLICATE_ALIAS in strict mode when alias name exists for different address
   * @throws {AliasStorageError} ALIAS_TOO_LONG when exceeds maxAliasLength
   * @throws {AliasStorageError} INVALID_ALIAS when alias is empty
   * @throws {AliasStorageError} INVALID_ADDRESS when address is empty
   */
  async save(input: AliasInput): Promise<string> {
    // Normalize empty string networkId to undefined for API consistency
    const apiNetworkId = input.networkId === '' ? undefined : input.networkId;

    // Validate input
    this.validateAddress(input.address);
    this.validateAlias(input.alias);

    // Check for existing record with same address+networkId (upsert case)
    const existing = await this.getByAddressAndNetwork(input.address, apiNetworkId);

    // Check for duplicate alias names (only if not updating same record)
    if (!existing) {
      await this.checkDuplicate(input.alias);
    } else if (existing.alias !== input.alias) {
      // Alias changed, check for duplicates
      await this.checkDuplicate(input.alias);
    }

    return await this.withQuotaHandling(async () => {
      const now = new Date();
      // Convert to storage format (undefined -> sentinel)
      const storageNetworkId = toStorageNetworkId(apiNetworkId);

      if (existing) {
        // Update existing record
        await this.table.update(existing.id, {
          alias: input.alias,
          metadata: input.metadata,
          updatedAt: now,
        });
        this.log('info', 'Alias updated', { id: existing.id, alias: input.alias });
        return existing.id;
      }

      // Create new record with storage format networkId
      const id = generateId();
      const record = {
        id,
        address: input.address,
        networkId: storageNetworkId,
        alias: input.alias,
        metadata: input.metadata,
        createdAt: now,
        updatedAt: now,
      };

      await this.table.add(record as AliasRecord);
      this.log('info', 'Alias saved', { id, address: input.address, alias: input.alias });
      return id;
    });
  }

  /**
   * Update an existing alias record.
   *
   * @param id - Record ID to update
   * @param updates - Partial updates to apply
   * @throws {AliasStorageError} ALIAS_NOT_FOUND when record doesn't exist
   * @throws {AliasStorageError} ALIAS_TOO_LONG when alias exceeds maxAliasLength
   * @throws {AliasStorageError} INVALID_ALIAS when alias is empty
   */
  async update(id: string, updates: AliasUpdate): Promise<void> {
    // Validate updates
    if (updates.alias !== undefined) {
      this.validateAlias(updates.alias);
    }

    const existing = await this.get(id);
    if (!existing) {
      throw aliasNotFoundError(id);
    }

    return await this.withQuotaHandling(async () => {
      await this.table.update(id, {
        ...updates,
        updatedAt: new Date(),
      });
      this.log('info', 'Alias updated', { id, updates: Object.keys(updates) });
    });
  }

  /**
   * Get an alias record by ID.
   *
   * @param id - Record ID
   * @returns The record, or undefined if not found
   */
  async get(id: string): Promise<AliasRecord | undefined> {
    const record = await this.table.get(id);
    return record ? fromStorageRecord(record) : undefined;
  }

  // ==========================================================================
  // Address Lookup Operations
  // ==========================================================================

  /**
   * Get a global alias record by address (networkId undefined).
   *
   * @param address - Account address
   * @returns The global alias record, or undefined if address has no global alias
   */
  async getByAddress(address: string): Promise<AliasRecord | undefined> {
    return await this.getByAddressAndNetwork(address, undefined);
  }

  /**
   * Get an alias record by address and optional networkId.
   *
   * @param address - Account address
   * @param networkId - Network identifier matching NetworkConfig.id (undefined for global alias)
   * @returns The record, or undefined if (address, networkId) has no alias
   */
  async getByAddressAndNetwork(
    address: string,
    networkId?: string
  ): Promise<AliasRecord | undefined> {
    // Convert to storage format for query
    const storageNetworkId = toStorageNetworkId(networkId);

    // Use compound index [address+networkId]
    const results = await this.table
      .where('[address+networkId]')
      .equals([address, storageNetworkId])
      .toArray();

    const record = results[0];
    return record ? fromStorageRecord(record) : undefined;
  }

  /**
   * Find all alias records for an address across all networks.
   *
   * @param address - Account address
   * @returns Array of all alias records for this address (may include global and network-specific)
   */
  async findByAddress(address: string): Promise<AliasRecord[]> {
    const records = await this.table.where('address').equals(address).toArray();
    return records.map(fromStorageRecord);
  }

  // ==========================================================================
  // Alias Lookup Operations
  // ==========================================================================

  /**
   * Get an alias record by alias name.
   * In 'allow' mode with duplicates, returns the first match.
   *
   * @param alias - Alias name
   * @returns The record, or undefined if alias doesn't exist
   */
  async getByAlias(alias: string): Promise<AliasRecord | undefined> {
    const record = await this.table.where('alias').equals(alias).first();
    return record ? fromStorageRecord(record) : undefined;
  }

  /**
   * Find all records with a given alias name.
   * Useful when duplicateMode is 'allow' or 'warn'.
   *
   * @param alias - Alias name to search
   * @returns Array of matching records
   */
  async findByAlias(alias: string): Promise<AliasRecord[]> {
    const records = await this.table.where('alias').equals(alias).toArray();
    return records.map(fromStorageRecord);
  }

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
  async resolveAlias(alias: string): Promise<string | undefined> {
    const record = await this.getByAlias(alias);
    return record?.address;
  }

  /**
   * Resolve an address to an alias name.
   * Shorthand for getByAddressAndNetwork(address, networkId)?.alias.
   *
   * @param address - Account address
   * @param networkId - Optional network identifier (undefined for global alias)
   * @returns The alias, or undefined if address has no alias for this network
   */
  async resolveAddress(address: string, networkId?: string): Promise<string | undefined> {
    const record = await this.getByAddressAndNetwork(address, networkId);
    return record?.alias;
  }

  // ==========================================================================
  // List and Count Operations (Phase 4)
  // ==========================================================================

  /**
   * Delete an alias by record ID.
   *
   * @param id - Record ID to delete
   */
  async delete(id: string): Promise<void> {
    await this.table.delete(id);
    this.log('info', 'Alias deleted', { id });
  }

  /**
   * Delete an alias by address.
   * No-op if address has no alias.
   *
   * @param address - Address to remove global alias for
   */
  async deleteByAddress(address: string): Promise<void> {
    const record = await this.getByAddress(address);
    if (record) {
      await this.delete(record.id);
    }
  }

  /**
   * Delete an alias by alias name.
   * In 'allow' mode with duplicates, deletes all records with this alias.
   *
   * @param alias - Alias name to delete
   */
  async deleteByAlias(alias: string): Promise<void> {
    const records = await this.findByAlias(alias);
    await this.table.bulkDelete(records.map((r) => r.id));
    if (records.length > 0) {
      this.log('info', 'Aliases deleted by name', { alias, count: records.length });
    }
  }

  /**
   * Clear all aliases from storage.
   */
  async clear(): Promise<void> {
    await this.table.clear();
    this.log('info', 'All aliases cleared');
  }

  /**
   * Get all alias records, ordered by updatedAt descending.
   *
   * @returns Array of all records
   */
  async getAll(): Promise<AliasRecord[]> {
    const records = await this.table.orderBy('updatedAt').reverse().toArray();
    return records.map(fromStorageRecord);
  }

  /**
   * Get alias records filtered by one or more network IDs, ordered by updatedAt descending.
   * Uses the indexed `networkId` column for efficient querying.
   *
   * @param networkIds - Network IDs to include
   * @returns Matching records sorted by updatedAt descending
   */
  async getByNetworkIds(networkIds: string[]): Promise<AliasRecord[]> {
    const storageIds = networkIds.map(toStorageNetworkId);
    const records = await this.table.where('networkId').anyOf(storageIds).sortBy('updatedAt');
    return records.reverse().map(fromStorageRecord);
  }

  /**
   * Get the count of stored aliases.
   *
   * @returns Number of records
   */
  async count(): Promise<number> {
    return await this.table.count();
  }

  /**
   * Check if an address has an alias.
   *
   * @param address - Address to check
   * @param networkId - Optional network identifier (undefined checks global alias)
   * @returns true if alias exists for the (address, networkId) pair
   */
  async hasAlias(address: string, networkId?: string): Promise<boolean> {
    const record = await this.getByAddressAndNetwork(address, networkId);
    return record !== undefined;
  }

  /**
   * Check if an alias name is in use.
   *
   * @param alias - Alias name to check
   * @returns true if at least one record uses this alias
   */
  async aliasExists(alias: string): Promise<boolean> {
    const record = await this.getByAlias(alias);
    return record !== undefined;
  }

  // ==========================================================================
  // Bulk Operations
  // ==========================================================================

  /**
   * Bulk save multiple aliases.
   *
   * @param inputs - Array of alias inputs
   * @returns Array of created/updated record IDs
   */
  async bulkSave(inputs: AliasInput[]): Promise<string[]> {
    return this.table.db.transaction('rw', this.table, async () => {
      const ids: string[] = [];
      for (const input of inputs) {
        const id = await this.save(input);
        ids.push(id);
      }
      return ids;
    });
  }

  /**
   * Bulk delete records by IDs.
   *
   * @param ids - Array of record IDs to delete
   */
  async bulkDelete(ids: string[]): Promise<void> {
    await this.table.bulkDelete(ids);
    this.log('info', 'Bulk delete', { count: ids.length });
  }

  /**
   * Export aliases to JSON format.
   *
   * @param ids - Optional array of record IDs to export (all if omitted)
   * @returns JSON string of AliasExport
   */
  async exportJson(ids?: string[]): Promise<string> {
    let records: AliasRecord[];

    if (ids && ids.length > 0) {
      records = (await Promise.all(ids.map((id) => this.get(id)))).filter(
        (r): r is AliasRecord => r !== undefined
      );
    } else {
      records = await this.getAll();
    }

    const exportData: AliasExport = {
      version: 1,
      exportedAt: new Date().toISOString(),
      aliases: records.map((r) => ({
        address: r.address,
        networkId: r.networkId,
        alias: r.alias,
        metadata: r.metadata,
      })),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import aliases from JSON.
   *
   * @param json - JSON string in AliasExport format
   * @returns Import result with counts and IDs
   * @throws {AliasStorageError} INVALID_IMPORT_FORMAT when JSON is malformed or invalid schema
   */
  async importJson(json: string): Promise<ImportResult> {
    // Parse JSON with error handling
    let data: unknown;
    try {
      data = JSON.parse(json);
    } catch {
      throw invalidImportFormatError('Invalid JSON syntax');
    }

    // Validate schema structure
    this.validateImportSchema(data);

    const exportData = data as AliasExport;
    const ids: string[] = [];
    let skipped = 0;

    for (const alias of exportData.aliases) {
      try {
        const id = await this.save({
          address: alias.address,
          networkId: alias.networkId,
          alias: alias.alias,
          metadata: alias.metadata,
        });
        ids.push(id);
      } catch (err) {
        this.log('debug', 'Skipped import entry', {
          address: alias.address,
          alias: alias.alias,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        skipped++;
      }
    }

    this.log('info', 'Import completed', { imported: ids.length, skipped });

    return {
      imported: ids.length,
      skipped,
      ids,
    };
  }

  /**
   * Validates the import data schema.
   *
   * @param data - Parsed JSON data to validate
   * @throws {AliasStorageError} INVALID_IMPORT_FORMAT when schema is invalid
   */
  private validateImportSchema(data: unknown): asserts data is AliasExport {
    // Must be an object
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      throw invalidImportFormatError('Import data must be an object');
    }

    const obj = data as Record<string, unknown>;

    // Must have version field (number)
    if (typeof obj.version !== 'number') {
      throw invalidImportFormatError('Missing or invalid "version" field');
    }

    // Version must be 1 (only supported version)
    if (obj.version !== 1) {
      throw invalidImportFormatError(
        `Unsupported version: ${obj.version}. Only version 1 is supported`
      );
    }

    // Must have aliases array
    if (!Array.isArray(obj.aliases)) {
      throw invalidImportFormatError('Missing or invalid "aliases" array');
    }

    // Validate each alias entry
    for (let i = 0; i < obj.aliases.length; i++) {
      const entry = obj.aliases[i];
      if (typeof entry !== 'object' || entry === null) {
        throw invalidImportFormatError(`Invalid alias entry at index ${i}: must be an object`);
      }

      const aliasEntry = entry as Record<string, unknown>;

      // Must have address (non-empty string)
      if (typeof aliasEntry.address !== 'string' || aliasEntry.address.trim() === '') {
        throw invalidImportFormatError(
          `Invalid alias entry at index ${i}: missing or invalid "address" field`
        );
      }

      // Must have alias (non-empty string)
      if (typeof aliasEntry.alias !== 'string' || aliasEntry.alias.trim() === '') {
        throw invalidImportFormatError(
          `Invalid alias entry at index ${i}: missing or invalid "alias" field`
        );
      }

      // networkId is optional but must be string if present
      if (aliasEntry.networkId !== undefined && typeof aliasEntry.networkId !== 'string') {
        throw invalidImportFormatError(
          `Invalid alias entry at index ${i}: "networkId" must be a string`
        );
      }

      // metadata is optional but must be object if present
      if (
        aliasEntry.metadata !== undefined &&
        (typeof aliasEntry.metadata !== 'object' ||
          aliasEntry.metadata === null ||
          Array.isArray(aliasEntry.metadata))
      ) {
        throw invalidImportFormatError(
          `Invalid alias entry at index ${i}: "metadata" must be an object`
        );
      }
    }
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Validates that an alias is non-empty and within length limits.
   *
   * @param alias - The alias to validate
   * @throws {AliasStorageError} INVALID_ALIAS when alias is empty
   * @throws {AliasStorageError} ALIAS_TOO_LONG when alias exceeds maxAliasLength
   */
  private validateAlias(alias: string): void {
    if (!alias || alias.trim() === '') {
      throw invalidAliasError();
    }

    if (this.options.maxAliasLength !== undefined && alias.length > this.options.maxAliasLength) {
      throw aliasTooLongError(alias, this.options.maxAliasLength);
    }
  }

  /**
   * Validates that an address is non-empty.
   *
   * @param address - The address to validate
   * @throws {AliasStorageError} INVALID_ADDRESS when address is empty
   */
  private validateAddress(address: string): void {
    if (!address || address.trim() === '') {
      throw invalidAddressError();
    }
  }

  /**
   * Checks for duplicate alias names based on duplicateMode configuration.
   *
   * @param alias - The alias to check for duplicates
   * @throws {AliasStorageError} DUPLICATE_ALIAS in strict mode when duplicate found
   */
  private async checkDuplicate(alias: string): Promise<void> {
    if (this.options.duplicateMode === 'allow') {
      return;
    }

    const existing = await this.getByAlias(alias);
    if (!existing) {
      return;
    }

    if (this.options.duplicateMode === 'strict') {
      throw duplicateAliasError(alias, existing.address);
    }

    // Warn mode
    if (this.options.onDuplicate) {
      this.options.onDuplicate(alias, existing.address);
    }
  }

  /**
   * Wraps an async operation with quota error handling.
   *
   * @param operation - The async operation to execute
   * @returns The result of the operation
   */
  private async withQuotaHandling<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await withQuotaHandling(this.options.tableName, operation);
    } catch (err) {
      if (err instanceof Error && err.message.includes('quota-exceeded')) {
        throw storageQuotaExceededError(err);
      }
      throw err;
    }
  }

  /**
   * Logs a message if logging is enabled.
   *
   * @param level - Log level
   * @param message - Log message
   * @param data - Optional data to log
   */
  private log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: Record<string, unknown>
  ): void {
    if (!this.options.enableLogging) {
      return;
    }

    const logLevels = ['debug', 'info', 'warn', 'error'];
    const configuredLevel = logLevels.indexOf(this.options.logLevel);
    const messageLevel = logLevels.indexOf(level);

    if (messageLevel >= configuredLevel) {
      // logger expects (system, message, ...args)
      const system = `AliasStorage:${this.options.tableName}`;
      if (data) {
        logger[level](system, message, data);
      } else {
        logger[level](system, message);
      }
    }
  }
}

// ==========================================================================
// Factory Function
// ==========================================================================

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
export function createAliasStorage(db: Dexie, options?: AliasStorageOptions): AliasStorage {
  return new AliasStorage(db, options);
}
