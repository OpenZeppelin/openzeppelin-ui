/**
 * RI Capability Error Types
 *
 * Chain-agnostic error classes for the Reference Implementation token capabilities
 * (ERC-3643, ERC-4626, IRS). Mirrors the `AccessControlError` pattern: an abstract base
 * plus concrete classes, each carrying a stable {@link RICapabilityError.code} and
 * structured details for programmatic handling.
 *
 * These are thrown only by **write** methods on known failure conditions. Expected
 * negative reads (e.g. `isVerified`, `simulateTransfer`) return values rather than throw.
 *
 * The `code` values line up 1:1 with the plugin's documented route error codes so a
 * consumer can map `error.code → pluginError(code, …)` directly.
 */

import type { Amount } from './common';

/**
 * Stable, machine-readable discriminator for every {@link RICapabilityError} subclass.
 */
export type RICapabilityErrorCode =
  | 'RECIPIENT_NOT_VERIFIED'
  | 'COMPLIANCE_MODULE_REJECTED'
  | 'HOLDER_FROZEN'
  | 'INSUFFICIENT_BALANCE'
  | 'INSUFFICIENT_SHARES'
  | 'ALREADY_ONBOARDED'
  | 'IRS_OPERATION_FAILED'
  | 'INVALID_AMOUNT'
  | 'OPERATION_FAILED';

/**
 * Abstract base class for all RI capability errors.
 *
 * Provides a stable, machine-readable {@link code} (set by each subclass) and optional
 * contract-address context shared by every subclass.
 */
export abstract class RICapabilityError extends Error {
  /** Stable, machine-readable error discriminator. */
  abstract readonly code: RICapabilityErrorCode;

  /**
   * @param message - Human-readable description of the failure.
   * @param contractAddress - Optional contract address for context.
   */
  constructor(
    message: string,
    public readonly contractAddress?: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Recipient is not verified in the Identity Registry at submit time.
 *
 * Thrown by mint/transfer when the on-chain IRS check fails for the recipient.
 */
export class RecipientNotVerified extends RICapabilityError {
  readonly code = 'RECIPIENT_NOT_VERIFIED' as const;

  /**
   * @param message - Human-readable description of the failure.
   * @param holder - The recipient address that failed verification.
   * @param contractAddress - Optional contract address for context.
   */
  constructor(
    message: string,
    public readonly holder: string,
    contractAddress?: string
  ) {
    super(message, contractAddress);
  }
}

/**
 * A compliance module rejected the transfer.
 */
export class ComplianceModuleRejected extends RICapabilityError {
  readonly code = 'COMPLIANCE_MODULE_REJECTED' as const;

  /**
   * @param message - Human-readable description of the failure.
   * @param blockingModule - Identifier of the module that blocked the transfer.
   * @param contractAddress - Optional contract address for context.
   */
  constructor(
    message: string,
    public readonly blockingModule: string,
    contractAddress?: string
  ) {
    super(message, contractAddress);
  }
}

/**
 * The targeted holder is frozen.
 *
 * Thrown by burn/transfer when the holder's tokens are frozen.
 */
export class HolderFrozen extends RICapabilityError {
  readonly code = 'HOLDER_FROZEN' as const;

  /**
   * @param message - Human-readable description of the failure.
   * @param holder - The frozen holder address.
   * @param contractAddress - Optional contract address for context.
   */
  constructor(
    message: string,
    public readonly holder: string,
    contractAddress?: string
  ) {
    super(message, contractAddress);
  }
}

/**
 * The holder has insufficient token balance for the requested operation.
 *
 * Thrown by burn/transfer/vault-deposit.
 */
export class InsufficientBalance extends RICapabilityError {
  readonly code = 'INSUFFICIENT_BALANCE' as const;

  /**
   * @param message - Human-readable description of the failure.
   * @param holder - The holder whose balance is insufficient.
   * @param requested - Requested amount (base-unit decimal string).
   * @param available - Optional available amount (base-unit decimal string).
   * @param contractAddress - Optional contract address for context.
   */
  constructor(
    message: string,
    public readonly holder: string,
    public readonly requested: Amount,
    public readonly available?: Amount,
    contractAddress?: string
  ) {
    super(message, contractAddress);
  }
}

/**
 * The holder has insufficient vault shares for the requested withdrawal.
 */
export class InsufficientShares extends RICapabilityError {
  readonly code = 'INSUFFICIENT_SHARES' as const;

  /**
   * @param message - Human-readable description of the failure.
   * @param holder - The holder whose shares are insufficient.
   * @param requested - Requested shares (base-unit decimal string).
   * @param available - Optional available shares (base-unit decimal string).
   * @param contractAddress - Optional contract address for context.
   */
  constructor(
    message: string,
    public readonly holder: string,
    public readonly requested: Amount,
    public readonly available?: Amount,
    contractAddress?: string
  ) {
    super(message, contractAddress);
  }
}

/**
 * The holder's identity is already registered.
 *
 * Thrown by `registerIdentity` when an identity already exists for the holder.
 */
export class IdentityAlreadyRegistered extends RICapabilityError {
  readonly code = 'ALREADY_ONBOARDED' as const;

  /**
   * @param message - Human-readable description of the failure.
   * @param holder - The already-registered holder address.
   * @param onchainId - Optional ONCHAINID already associated with the holder.
   * @param contractAddress - Optional contract address for context.
   */
  constructor(
    message: string,
    public readonly holder: string,
    public readonly onchainId?: string,
    contractAddress?: string
  ) {
    super(message, contractAddress);
  }
}

/**
 * A non-amount IRS write failed (ONCHAINID deploy, registration, or claim attachment).
 */
export class IdentityOperationFailed extends RICapabilityError {
  readonly code = 'IRS_OPERATION_FAILED' as const;

  /**
   * @param message - Human-readable description of the failure.
   * @param operation - Name of the IRS operation that failed.
   * @param cause - Optional underlying error.
   * @param contractAddress - Optional contract address for context.
   */
  constructor(
    message: string,
    public readonly operation: string,
    public readonly cause?: Error,
    contractAddress?: string
  ) {
    super(message, contractAddress);
  }
}

/**
 * An {@link Amount} string was malformed and rejected at the factory boundary.
 *
 * Thrown before any RPC or submission when an amount is fractional, negative, signed,
 * uses scientific notation, or is otherwise not a non-negative base-unit decimal string.
 */
export class InvalidAmount extends RICapabilityError {
  readonly code = 'INVALID_AMOUNT' as const;

  /**
   * @param message - Human-readable description of the failure.
   * @param value - The offending amount value as received.
   * @param reason - Why the value was rejected (e.g. 'fractional', 'negative').
   * @param contractAddress - Optional contract address for context.
   */
  constructor(
    message: string,
    public readonly value: string,
    public readonly reason: string,
    contractAddress?: string
  ) {
    super(message, contractAddress);
  }
}

/**
 * Generic write failure / unmapped on-chain revert for an RI capability operation.
 */
export class RICapabilityOperationFailed extends RICapabilityError {
  readonly code = 'OPERATION_FAILED' as const;

  /**
   * @param message - Human-readable description of the failure.
   * @param operation - Name of the operation that failed.
   * @param cause - Optional underlying error.
   * @param contractAddress - Optional contract address for context.
   */
  constructor(
    message: string,
    public readonly operation: string,
    public readonly cause?: Error,
    contractAddress?: string
  ) {
    super(message, contractAddress);
  }
}
