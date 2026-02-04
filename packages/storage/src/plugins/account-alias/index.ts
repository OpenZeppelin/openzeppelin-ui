/**
 * Account Alias Storage Plugin
 *
 * A universal account address aliasing plugin for the @openzeppelin/ui-storage package.
 * Enables developers to map blockchain addresses to human-readable alias names.
 *
 * @example
 * ```typescript
 * import { createAliasStorage, ALIAS_SCHEMA, createDexieDatabase } from '@openzeppelin/ui-storage';
 *
 * // Create database with alias schema
 * const db = createDexieDatabase('MyApp', [{ version: 1, stores: ALIAS_SCHEMA }]);
 *
 * // Create storage instance
 * const aliasStorage = createAliasStorage(db, { duplicateMode: 'strict' });
 *
 * // Save an alias
 * await aliasStorage.save({ address: '0x742d35Cc...', alias: 'Treasury' });
 *
 * // Look up by address
 * const record = await aliasStorage.getByAddress('0x742d35Cc...');
 * console.log(record?.alias); // 'Treasury'
 * ```
 *
 * @packageDocumentation
 */

// Types
export type {
  AliasRecord,
  AliasInput,
  AliasUpdate,
  DuplicateMode,
  LogLevel,
  AliasStorageOptions,
  ImportResult,
  AliasExport,
} from './types';

export { DEFAULT_OPTIONS } from './types';

// Errors
export type { AliasStorageErrorCode } from './errors';
export {
  AliasStorageError,
  isAliasStorageError,
  duplicateAliasError,
  aliasTooLongError,
  invalidAliasError,
  invalidAddressError,
  aliasNotFoundError,
  invalidImportFormatError,
  storageQuotaExceededError,
  ERROR_MESSAGES,
} from './errors';

// Schema
export { ALIAS_SCHEMA, createAliasSchema, getAliasSchema } from './schema';

// Storage class and factory
export { AliasStorage, createAliasStorage } from './AliasStorage';

// TODO: Export React hooks (Phase 5)
// export { createUseAliasStorage } from './react';
