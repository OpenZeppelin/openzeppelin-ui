/**
 * Account Alias Storage Error Types
 *
 * This file defines error classes and codes for the Account Alias Storage plugin.
 */

// ============================================================================
// Error Codes
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
  | 'INVALID_IMPORT_FORMAT'
  | 'STORAGE_QUOTA_EXCEEDED';

/**
 * Human-readable error messages for each error code.
 */
export const ERROR_MESSAGES: Record<AliasStorageErrorCode, string> = {
  DUPLICATE_ALIAS: 'An alias with this name already exists',
  ALIAS_TOO_LONG: 'Alias name exceeds maximum allowed length',
  INVALID_ALIAS: 'Alias name must be a non-empty string',
  INVALID_ADDRESS: 'Address must be a non-empty string',
  ALIAS_NOT_FOUND: 'No alias found with the specified ID',
  INVALID_IMPORT_FORMAT: 'Import data is not in the expected format',
  STORAGE_QUOTA_EXCEEDED: 'Storage quota exceeded',
};

// ============================================================================
// Error Class
// ============================================================================

/**
 * Structured error for alias storage operations.
 * Includes an error code and optional details for debugging.
 *
 * @example
 * ```typescript
 * try {
 *   await aliasStorage.save({ address: '0x...', alias: 'Treasury' });
 * } catch (err) {
 *   if (err instanceof AliasStorageError && err.code === 'DUPLICATE_ALIAS') {
 *     console.log('This alias name is already in use');
 *   }
 * }
 * ```
 */
export class AliasStorageError extends Error {
  /** Error code for programmatic error handling */
  readonly code: AliasStorageErrorCode;

  /** Optional additional details about the error */
  readonly details?: Record<string, unknown>;

  /**
   *
   */
  constructor(code: AliasStorageErrorCode, details?: Record<string, unknown>) {
    super(ERROR_MESSAGES[code]);
    this.name = 'AliasStorageError';
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AliasStorageError);
    }
  }
}

/**
 * Type guard to check if an error is an AliasStorageError.
 *
 * @param err - The error to check
 * @returns true if the error is an AliasStorageError
 */
export function isAliasStorageError(err: unknown): err is AliasStorageError {
  return err instanceof AliasStorageError;
}

/**
 * Creates an AliasStorageError for duplicate alias detection.
 *
 * @param alias - The duplicate alias name
 * @param existingAddress - The address that already has this alias
 * @returns AliasStorageError with DUPLICATE_ALIAS code
 */
export function duplicateAliasError(alias: string, existingAddress: string): AliasStorageError {
  return new AliasStorageError('DUPLICATE_ALIAS', { alias, existingAddress });
}

/**
 * Creates an AliasStorageError for alias length validation.
 *
 * @param alias - The alias that exceeded the limit
 * @param maxLength - The configured maximum length
 * @returns AliasStorageError with ALIAS_TOO_LONG code
 */
export function aliasTooLongError(alias: string, maxLength: number): AliasStorageError {
  return new AliasStorageError('ALIAS_TOO_LONG', {
    alias,
    length: alias.length,
    maxLength,
  });
}

/**
 * Creates an AliasStorageError for invalid alias.
 *
 * @returns AliasStorageError with INVALID_ALIAS code
 */
export function invalidAliasError(): AliasStorageError {
  return new AliasStorageError('INVALID_ALIAS');
}

/**
 * Creates an AliasStorageError for invalid address.
 *
 * @returns AliasStorageError with INVALID_ADDRESS code
 */
export function invalidAddressError(): AliasStorageError {
  return new AliasStorageError('INVALID_ADDRESS');
}

/**
 * Creates an AliasStorageError for alias not found.
 *
 * @param id - The ID that was not found
 * @returns AliasStorageError with ALIAS_NOT_FOUND code
 */
export function aliasNotFoundError(id: string): AliasStorageError {
  return new AliasStorageError('ALIAS_NOT_FOUND', { id });
}

/**
 * Creates an AliasStorageError for invalid import format.
 *
 * @param reason - Description of what's wrong with the format
 * @returns AliasStorageError with INVALID_IMPORT_FORMAT code
 */
export function invalidImportFormatError(reason: string): AliasStorageError {
  return new AliasStorageError('INVALID_IMPORT_FORMAT', { reason });
}

/**
 * Creates an AliasStorageError for storage quota exceeded.
 *
 * @param cause - The original quota error
 * @returns AliasStorageError with STORAGE_QUOTA_EXCEEDED code
 */
export function storageQuotaExceededError(cause?: unknown): AliasStorageError {
  return new AliasStorageError('STORAGE_QUOTA_EXCEEDED', { cause });
}
