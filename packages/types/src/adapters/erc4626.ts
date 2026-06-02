/**
 * ERC-4626 (Tokenized Vault) Domain Types
 *
 * Chain-agnostic data shapes consumed by the `ERC4626Capability` interface and its adapter
 * implementations. Conversions (`convertToAssets`, `convertToShares`, `totalAssets`) return a
 * bare {@link Amount}; the write composites below extend the shared `OperationResult` with the
 * resolved quantities so the consumer can surface issued shares / returned assets after a tx.
 * The method surface itself lives in `capabilities/erc4626.ts`.
 */

import type { OperationResult } from './access-control';
import type { Amount } from './common';

/**
 * Result of a vault `deposit`: the operation id plus the shares issued to the depositor.
 *
 * `sharesIssued` is optional because some execution paths (e.g. relayer/queued) resolve the
 * issued amount asynchronously and may only return the tx id at submit time.
 */
export interface VaultDepositResult extends OperationResult {
  /** Shares issued to the depositor, as a base-unit decimal string. */
  sharesIssued?: Amount;
}

/**
 * Result of a vault `withdraw`: the operation id plus the assets returned to the holder.
 *
 * `amountReturned` is optional for the same reason as {@link VaultDepositResult.sharesIssued}.
 */
export interface VaultWithdrawResult extends OperationResult {
  /** Underlying assets returned to the holder, as a base-unit decimal string. */
  amountReturned?: Amount;
}
