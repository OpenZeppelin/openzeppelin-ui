import type { ExecutionConfig } from '../../execution';
import type { TransactionStatusUpdate, TxStatus } from '../../transactions/status';
import type { OperationResult } from '../access-control';
import type { Amount } from '../common';
import type { TransferSimulationResult } from '../erc3643';
import type { RuntimeCapability } from '../runtime';

/**
 * **Tier 3** — ERC-3643 (T-REX) permissioned token capability.
 *
 * Reads run over RPC (no wallet); writes delegate to the adapter's injected
 * `signAndBroadcast` callback (supplied at factory construction, mirroring
 * `createAccessControl`). All amounts cross the boundary as base-unit decimal
 * {@link Amount} strings. Extends {@link RuntimeCapability}.
 *
 * Known on-chain reverts map to typed `RICapabilityError` subclasses
 * (`RecipientNotVerified`, `ComplianceModuleRejected`, `HolderFrozen`,
 * `InsufficientBalance`); unmapped reverts surface as `RICapabilityOperationFailed`.
 *
 * @see Contract `specs/002-ri-evm-capabilities/contracts/erc3643-capability.md`
 */
export interface ERC3643Capability extends RuntimeCapability {
  // ---- Reads (no wallet, RPC only) ----

  /** Token balance of `holder` as a base-unit decimal string. */
  balanceOf(holder: string): Promise<Amount>;

  /**
   * Whether `holder` is verified in the Identity Registry.
   * Returns `false` (never throws) for an unregistered holder.
   */
  isVerified(holder: string): Promise<boolean>;

  /** Whether `holder` is frozen. */
  isFrozen(holder: string): Promise<boolean>;

  /** Jurisdiction code for `holder`, or `undefined` when unavailable. */
  getJurisdiction(holder: string): Promise<string | undefined>;

  /**
   * Pre-flight compliance evaluation for a prospective transfer.
   * Returns `{ allowed: false, blockingModule }` when blocked — never throws
   * for the expected negative case.
   */
  simulateTransfer(input: {
    from: string;
    to: string;
    amount: Amount;
  }): Promise<TransferSimulationResult>;

  // ---- Writes (via injected signAndBroadcast) ----

  /**
   * Mint `amount` to `to`.
   * @param input - Recipient and base-unit amount.
   * @param executionConfig - Execution method (eoa, relayer, etc.).
   * @param onStatusChange - Optional transaction status callback.
   * @param runtimeApiKey - Optional session-only API key (e.g. Relayer).
   */
  mint(
    input: { to: string; amount: Amount },
    executionConfig: ExecutionConfig,
    onStatusChange?: (status: TxStatus, details: TransactionStatusUpdate) => void,
    runtimeApiKey?: string
  ): Promise<OperationResult>;

  /** Burn `amount` from `from`. */
  burn(
    input: { from: string; amount: Amount },
    executionConfig: ExecutionConfig,
    onStatusChange?: (status: TxStatus, details: TransactionStatusUpdate) => void,
    runtimeApiKey?: string
  ): Promise<OperationResult>;

  /** Transfer `amount` from `from` to `to`. */
  transfer(
    input: { from: string; to: string; amount: Amount },
    executionConfig: ExecutionConfig,
    onStatusChange?: (status: TxStatus, details: TransactionStatusUpdate) => void,
    runtimeApiKey?: string
  ): Promise<OperationResult>;

  /** Freeze `holder`. */
  freeze(
    input: { holder: string },
    executionConfig: ExecutionConfig,
    onStatusChange?: (status: TxStatus, details: TransactionStatusUpdate) => void,
    runtimeApiKey?: string
  ): Promise<OperationResult>;

  /** Unfreeze `holder`. */
  unfreeze(
    input: { holder: string },
    executionConfig: ExecutionConfig,
    onStatusChange?: (status: TxStatus, details: TransactionStatusUpdate) => void,
    runtimeApiKey?: string
  ): Promise<OperationResult>;
}
