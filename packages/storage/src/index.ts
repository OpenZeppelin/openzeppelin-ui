// Base classes
export { EntityStorage } from './base/EntityStorage';
export type { BaseRecord, EntityStorageOptions } from './base/EntityStorage';

export { KeyValueStorage } from './base/KeyValueStorage';
export type { KeyValueRecord, KeyValueStorageOptions } from './base/KeyValueStorage';

// Utilities
export { isQuotaError, withQuotaHandling } from './base/utils';

// Core utilities
export { createDexieDatabase } from './core';
export type { DbVersion } from './core';

// React utilities
export {
  useLiveQuery,
  createLiveQueryHook,
  createCrudHook,
  createJsonFileIO,
  createRepositoryHook,
} from './react';

// Account Alias Storage Plugin
export {
  // Types
  type AliasRecord,
  type AliasInput,
  type AliasUpdate,
  type DuplicateMode,
  type LogLevel,
  type AliasStorageOptions,
  type ImportResult,
  type AliasExport,
  type AliasStorageErrorCode,
  type UseAliasStorageOptions,
  type UseAliasStorageReturn,
  // Constants
  DEFAULT_OPTIONS,
  ALIAS_SCHEMA,
  ERROR_MESSAGES,
  // Classes
  AliasStorage,
  AliasStorageError,
  // Factory functions
  createAliasStorage,
  createAliasSchema,
  getAliasSchema,
  createUseAliasStorage,
  getAliasStorageInstance,
  // Error utilities
  isAliasStorageError,
  duplicateAliasError,
  aliasTooLongError,
  invalidAliasError,
  invalidAddressError,
  aliasNotFoundError,
  invalidImportFormatError,
  storageQuotaExceededError,
  // Label resolver hook
  useAliasLabelResolver,
  type UseAliasLabelResolverOptions,
  // Suggestion resolver hook
  useAliasSuggestionResolver,
  type UseAliasSuggestionResolverOptions,
  // Widget bridge hook
  useAddressBookWidgetProps,
  type UseAddressBookWidgetPropsOptions,
  // Edit popover bridge hook
  useAliasEditCallbacks,
  type UseAliasEditCallbacksReturn,
} from './plugins/account-alias';
