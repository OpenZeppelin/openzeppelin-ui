# Data Model: Account Alias Storage

**Feature**: 002-account-alias-storage  
**Date**: 2026-02-03

## Entities

### AliasRecord

Represents a mapping between an account address and a human-readable alias name.

| Field       | Type                                   | Constraints                 | Description                                        |
| ----------- | -------------------------------------- | --------------------------- | -------------------------------------------------- |
| `id`        | `string`                               | Primary Key, Auto-generated | Unique identifier (UUID format via `generateId()`) |
| `address`   | `string`                               | Unique, Indexed, Required   | Account address (stored as-is, no normalization)   |
| `alias`     | `string`                               | Indexed, Required           | Human-readable alias name                          |
| `metadata`  | `Record<string, unknown> \| undefined` | Optional                    | Arbitrary JSON for implementer-defined context     |
| `createdAt` | `Date`                                 | Auto-managed, Indexed       | Timestamp when record was created                  |
| `updatedAt` | `Date`                                 | Auto-managed, Indexed       | Timestamp when record was last modified            |

**Relationships**: None (self-contained entity)

**State Transitions**:

- **Created**: New alias saved → record created with timestamps
- **Updated**: Alias name or metadata changed → `updatedAt` refreshed
- **Deleted**: Alias removed → record deleted from storage

### AliasStorageOptions

Configuration object for plugin behavior.

| Field            | Type                                               | Default                       | Description                                      |
| ---------------- | -------------------------------------------------- | ----------------------------- | ------------------------------------------------ |
| `duplicateMode`  | `'strict' \| 'warn' \| 'allow'`                    | `'strict'`                    | How to handle duplicate alias names              |
| `maxAliasLength` | `number \| undefined`                              | `64`                          | Maximum alias name length (optional enforcement) |
| `onDuplicate`    | `(alias: string, existingAddress: string) => void` | `undefined`                   | Callback for "warn" mode                         |
| `tableName`      | `string`                                           | `'aliases'`                   | Custom table name in Dexie                       |
| `enableLogging`  | `boolean`                                          | `true` (dev) / `false` (prod) | Enable/disable logging                           |
| `logLevel`       | `'debug' \| 'info' \| 'warn' \| 'error'`           | `'info'`                      | Logging verbosity                                |

## Dexie Schema

```typescript
// Schema definition for database version configuration
export const ALIAS_SCHEMA = {
  aliases: '++id, &address, alias, createdAt, updatedAt',
};
```

**Index Explanation**:

- `++id`: Auto-increment primary key (overridden by `generateId()` for UUID)
- `&address`: **Unique** index ensuring one alias per address
- `alias`: Non-unique index for lookup by alias name
- `createdAt`, `updatedAt`: Indexed for chronological queries

## Validation Rules

| Rule                  | Enforcement      | Error Code        | Source                                                          |
| --------------------- | ---------------- | ----------------- | --------------------------------------------------------------- |
| Address non-empty     | **Enforced**     | `INVALID_ADDRESS` | Plugin rejects empty strings                                    |
| Alias non-empty       | **Enforced**     | `INVALID_ALIAS`   | Plugin rejects empty strings                                    |
| Address format        | **Not enforced** | —                 | Implementer responsibility (FR-013)                             |
| Alias content         | **Not enforced** | —                 | Implementer responsibility (FR-014)                             |
| Alias length          | **Configurable** | `ALIAS_TOO_LONG`  | Enforced if `maxAliasLength` set; set to `undefined` to disable |
| One alias per address | **Enforced**     | —                 | Unique index on `address` field (upsert semantics)              |
| Duplicate alias names | **Configurable** | `DUPLICATE_ALIAS` | `duplicateMode` option: strict/warn/allow                       |
| Unicode normalization | **Not enforced** | —                 | Stored as-is; implementer responsibility                        |

## Error Codes

| Code                     | Description                        | Thrown By                              |
| ------------------------ | ---------------------------------- | -------------------------------------- |
| `DUPLICATE_ALIAS`        | Alias name exists in strict mode   | `save()`, `bulkSave()`, `importJson()` |
| `ALIAS_TOO_LONG`         | Alias exceeds `maxAliasLength`     | `save()`, `update()`, `bulkSave()`     |
| `INVALID_ALIAS`          | Alias is empty string              | `save()`, `update()`, `bulkSave()`     |
| `INVALID_ADDRESS`        | Address is empty string            | `save()`, `bulkSave()`                 |
| `ALIAS_NOT_FOUND`        | Record ID doesn't exist            | `update()`                             |
| `INVALID_IMPORT_FORMAT`  | JSON doesn't match expected schema | `importJson()`                         |
| `STORAGE_QUOTA_EXCEEDED` | IndexedDB quota exceeded           | All write operations                   |

## TypeScript Interfaces

```typescript
import type { BaseRecord } from '../base/EntityStorage';

/**
 * Represents a stored alias mapping.
 */
export interface AliasRecord extends BaseRecord {
  /** Account address (stored as-is, no normalization) */
  address: string;
  /** Human-readable alias name */
  alias: string;
  /** Optional arbitrary JSON metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Duplicate handling mode.
 */
export type DuplicateMode = 'strict' | 'warn' | 'allow';

/**
 * Configuration options for AliasStorage.
 */
export interface AliasStorageOptions {
  /** How to handle duplicate alias names. Default: 'strict' */
  duplicateMode?: DuplicateMode;
  /** Maximum alias name length. Default: 64 */
  maxAliasLength?: number;
  /** Callback when duplicate detected in 'warn' mode */
  onDuplicate?: (alias: string, existingAddress: string) => void;
  /** Custom table name. Default: 'aliases' */
  tableName?: string;
  /** Enable logging. Default: true in development */
  enableLogging?: boolean;
  /** Logging verbosity. Default: 'info' */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Input for creating a new alias (without managed fields).
 */
export type AliasInput = Omit<AliasRecord, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Result of bulk import operation.
 */
export interface ImportResult {
  /** Number of aliases successfully imported */
  imported: number;
  /** Number of aliases skipped (duplicates in strict mode) */
  skipped: number;
  /** IDs of imported records */
  ids: string[];
}

/**
 * Export format for alias data.
 */
export interface AliasExport {
  /** Export version for future compatibility */
  version: 1;
  /** Export timestamp */
  exportedAt: string;
  /** Alias records */
  aliases: Array<{
    address: string;
    alias: string;
    metadata?: Record<string, unknown>;
  }>;
}
```

## Query Patterns

| Operation           | Method                        | Index Used           |
| ------------------- | ----------------------------- | -------------------- |
| Get by ID           | `get(id)`                     | Primary key          |
| Get by address      | `getByAddress(address)`       | `&address` (unique)  |
| Get by alias name   | `getByAlias(alias)`           | `alias`              |
| Find all with alias | `findByAlias(alias)`          | `alias`              |
| List all            | `getAll()`                    | `updatedAt` (sorted) |
| Check duplicate     | `where('alias').equals(name)` | `alias`              |
