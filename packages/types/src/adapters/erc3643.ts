/**
 * ERC-3643 (T-REX) Domain Types
 *
 * Chain-agnostic data shapes consumed by the `ERC3643Capability` interface and its
 * adapter implementations. These describe permissioned-token reads (balance, verification,
 * freeze status, jurisdiction, transfer simulation); the method surface itself lives in
 * `capabilities/erc3643.ts`.
 */

import type { Amount } from './common';

/**
 * Result of a pre-flight compliance evaluation for a prospective transfer.
 *
 * Reads never throw for the expected negative case: a disallowed transfer returns
 * `{ allowed: false, blockingModule }` rather than raising an error.
 */
export interface TransferSimulationResult {
  /** Whether the compliance evaluation permits the transfer. */
  allowed: boolean;
  /** Count of compliance modules evaluated (drives the "N modules evaluated" UI badge). */
  modulesEvaluated: number;
  /** Identifier of the first blocking module when `allowed === false`. */
  blockingModule?: string;
}

/**
 * Composite, convenience read describing a holder's token state in one shape.
 *
 * Derived from the primitive reads (`balanceOf`, `isVerified`, `isFrozen`, jurisdiction);
 * provided for composition. The primitive reads remain the canonical surface.
 */
export interface HolderTokenState {
  /** Token balance as a base-unit decimal string. */
  balance: Amount;
  /** IRS membership / verification status (delegated to the IRS read). */
  isVerified: boolean;
  /** Whether the holder is frozen. */
  isFrozen: boolean;
  /** Jurisdiction code, when available. */
  jurisdiction?: string;
}
