/**
 * API Contract: Account Alias Storage Types
 *
 * This file defines the TypeScript interfaces for the Account Alias Storage plugin.
 * These types serve as the contract between the plugin and its consumers.
 */

import type { BaseRecord } from '@openzeppelin/ui-storage';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Represents a stored alias mapping between an address and a human-readable name.
 * Extends BaseRecord to include id, createdAt, and updatedAt fields.
 */
export interface AliasRecord extends BaseRecord {
  /** Account address (stored as-is, no normalization) */
  address: string;

  /**
   * Network identifier matching NetworkConfig.id pattern (e.g., 'ethereum-mainnet', 'stellar-testnet').
   * undefined = global alias (not network-specific).
   * Same address can have different aliases for different networks.
   */
  networkId?: string;

  /** Human-readable alias name */
  alias: string;

  /** Optional arbitrary JSON metadata for implementer-defined context */
  metadata?: Record<string, unknown>;
}

/**
 * Input type for creating or updating an alias.
 * Excludes auto-managed fields (id, createdAt, updatedAt).
 */
export type AliasInput = Omit<AliasRecord, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Partial input for updating an existing alias.
 */
export type AliasUpdate = Partial<Omit<AliasRecord, 'id' | 'createdAt' | 'updatedAt'>>;

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Duplicate alias name handling modes.
 *
 * - 'strict': Reject duplicate alias names with an error
 * - 'warn': Allow duplicates but invoke onDuplicate callback
 * - 'allow': Silently allow duplicate alias names
 */
export type DuplicateMode = 'strict' | 'warn' | 'allow';

/**
 * Logging verbosity levels.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Configuration options for the AliasStorage plugin.
 */
export interface AliasStorageOptions {
  /**
   * How to handle duplicate alias names.
   * @default 'strict'
   */
  duplicateMode?: DuplicateMode;

  /**
   * Maximum allowed length for alias names.
   * Set to undefined to disable length enforcement.
   * @default 64
   */
  maxAliasLength?: number;

  /**
   * Callback invoked when a duplicate alias is detected in 'warn' mode.
   * @param alias - The duplicate alias name
   * @param existingAddress - The address that already has this alias
   */
  onDuplicate?: (alias: string, existingAddress: string) => void;

  /**
   * Custom table name for the aliases table.
   * @default 'aliases'
   */
  tableName?: string;

  /**
   * Enable or disable logging output.
   * @default true in development, false in production
   */
  enableLogging?: boolean;

  /**
   * Logging verbosity level.
   * @default 'info'
   */
  logLevel?: LogLevel;
}

// ============================================================================
// Import/Export Types
// ============================================================================

/**
 * Result of a bulk import operation.
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
 * Export format for alias data (JSON-serializable).
 */
export interface AliasExport {
  /** Export format version for future compatibility */
  version: 1;

  /** ISO timestamp when export was created */
  exportedAt: string;

  /** Array of alias records (without internal IDs/timestamps) */
  aliases: Array<{
    address: string;
    networkId?: string;
    alias: string;
    metadata?: Record<string, unknown>;
  }>;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error codes for alias storage operations.
 */
export type AliasStorageErrorCode =
  | 'DUPLICATE_ALIAS'
  | 'ALIAS_TOO_LONG'
  | 'INVALID_ALIAS'
  | 'INVALID_ADDRESS'
  | 'ALIAS_NOT_FOUND'
  | 'ADDRESS_NOT_FOUND'
  | 'INVALID_IMPORT_FORMAT'
  | 'STORAGE_QUOTA_EXCEEDED';

/**
 * Structured error for alias storage operations.
 */
export interface AliasStorageError extends Error {
  code: AliasStorageErrorCode;
  details?: Record<string, unknown>;
}
