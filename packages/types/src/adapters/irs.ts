/**
 * Identity Registry Storage (IRS) Domain Types
 *
 * Chain-agnostic data shapes consumed by the `IRSCapability` interface and its adapter
 * implementations. Covers ONCHAINID lookups, identity registration, and the pre-signed
 * onboarding-claim flow. The method surface itself lives in `capabilities/irs.ts`.
 *
 * Claims are **pre-signed by a consumer-owned trusted-issuer key**: the capability never
 * holds signing keys. `buildClaimPayload` returns a {@link ClaimPayload} digest the consumer
 * signs out-of-band, and the resulting {@link OnboardingClaim} is attached on-chain.
 */

import type { OperationResult } from './access-control';

/**
 * A pre-signed identity claim ready to attach to an ONCHAINID.
 *
 * The `signature` is produced by the consumer's trusted-issuer key over the digest from
 * `buildClaimPayload`; the capability only relays it on-chain.
 */
export interface OnboardingClaim {
  /** Claim topic identifier (e.g. KYC, jurisdiction). */
  topic: string;
  /** Signature scheme (e.g. ERC-734 / EIP-191). */
  scheme: number;
  /** Hex-encoded claim data. */
  data: string;
  /** Signature produced by the trusted issuer (consumer-owned key). */
  signature: string;
  /** Optional issuer identity address; defaults to the configured trusted issuer. */
  issuer?: string;
}

/**
 * Output of the pure, key-free `buildClaimPayload` helper.
 *
 * Contains the canonical digest the consumer must sign, with the claim fields echoed back
 * for convenience. Computing this performs no execution and requires no signing key.
 */
export interface ClaimPayload {
  /** Canonical digest the consumer signs. */
  digest: string;
  /** Claim topic, echoed for convenience. */
  topic: string;
  /** Signature scheme, echoed for convenience. */
  scheme: number;
  /** Hex-encoded claim data, echoed for convenience. */
  data: string;
}

/**
 * Parameters for registering a holder's identity in the Identity Registry.
 */
export interface IdentityRegistration {
  /** Wallet address being registered. */
  holder: string;
  /** The holder's ONCHAINID contract address. */
  onchainId: string;
  /** Numeric country/jurisdiction code (T-REX `registerIdentity` argument). */
  country?: number;
}

/**
 * Result of an ONCHAINID lookup for a holder.
 *
 * Expected-negative lookups return `{ found: false }` rather than throwing.
 */
export interface OnchainIdLookup {
  /** Whether an ONCHAINID exists for the holder. */
  found: boolean;
  /** Present when `found === true`. */
  onchainId?: string;
}

/**
 * Result of resolving the ONCHAINID deployed for a wallet via the identity factory.
 *
 * `not_found` (zero address) is distinct from `read_failed` (RPC/transport failure).
 */
export type FactoryIdentityLookup =
  | { readonly status: 'found'; readonly onchainId: string }
  | { readonly status: 'not_found' }
  | { readonly status: 'read_failed'; readonly cause: Error };

/**
 * Result of probing whether an address holds a given ERC-734 key purpose on an ONCHAINID.
 *
 * `lacks` (on-chain false) is distinct from `read_failed` (RPC/transport failure).
 */
export type IdentityKeyPurposeLookup =
  | { readonly status: 'has' }
  | { readonly status: 'lacks' }
  | { readonly status: 'read_failed'; readonly cause: Error };

/**
 * Result of `deployOnchainId`: the operation id plus the freshly deployed ONCHAINID address.
 */
export interface DeployOnchainIdResult extends OperationResult {
  /** The deployed ONCHAINID contract address. */
  onchainId: string;
}
