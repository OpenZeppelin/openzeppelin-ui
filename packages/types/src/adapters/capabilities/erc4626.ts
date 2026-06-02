import type { ExecutionConfig } from '../../execution';
import type { TransactionStatusUpdate, TxStatus } from '../../transactions/status';
import type { Amount } from '../common';
import type { VaultDepositResult, VaultWithdrawResult } from '../erc4626';
import type { RuntimeCapability } from '../runtime';

/**
 * **Tier 3** — ERC-4626 tokenized-vault capability.
 *
 * Reads run over RPC (no wallet); writes delegate to the adapter's injected
 * `signAndBroadcast` callback. Amounts and shares cross the boundary as base-unit
 * decimal {@link Amount} strings. Extends {@link RuntimeCapability}.
 *
 * Insufficient funds map to typed errors: `InsufficientBalance` (deposit) and
 * `InsufficientShares` (withdraw).
 *
 * @see Contract `specs/002-ri-evm-capabilities/contracts/erc4626-capability.md`
 */
export interface ERC4626Capability extends RuntimeCapability {
  // ---- Reads ----

  /** Convert a share quantity to its underlying asset quantity. */
  convertToAssets(shares: Amount): Promise<Amount>;

  /** Convert an asset quantity to its share quantity. */
  convertToShares(assets: Amount): Promise<Amount>;

  /** Total underlying assets managed by the vault. */
  totalAssets(): Promise<Amount>;

  // ---- Writes (via injected signAndBroadcast) ----

  /**
   * Deposit `amount` of the underlying asset from `from`.
   * Resolves with the operation id plus `sharesIssued` when the receipt exposes it.
   *
   * @param input - Depositor and base-unit asset amount.
   * @param executionConfig - Execution method (eoa, relayer, etc.).
   * @param onStatusChange - Optional transaction status callback.
   * @param runtimeApiKey - Optional session-only API key (e.g. Relayer).
   */
  deposit(
    input: { from: string; amount: Amount },
    executionConfig: ExecutionConfig,
    onStatusChange?: (status: TxStatus, details: TransactionStatusUpdate) => void,
    runtimeApiKey?: string
  ): Promise<VaultDepositResult>;

  /**
   * Withdraw by redeeming `shares` for `from`.
   * Resolves with the operation id plus `amountReturned` when the receipt exposes it.
   */
  withdraw(
    input: { from: string; shares: Amount },
    executionConfig: ExecutionConfig,
    onStatusChange?: (status: TxStatus, details: TransactionStatusUpdate) => void,
    runtimeApiKey?: string
  ): Promise<VaultWithdrawResult>;
}
