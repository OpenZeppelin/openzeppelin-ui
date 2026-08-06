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
 *
 * This is the **confirmed-path** shape — `onchainId` is only knowable once the deployment is
 * mined. Prefer {@link DeployOnchainIdOutcome} when writing code that must also handle the
 * submit-only path; narrow on `completion === 'confirmed'` to reach `onchainId`.
 */
export interface DeployOnchainIdResult extends OperationResult {
  /** The deployed ONCHAINID contract address. */
  onchainId: string;
}

/**
 * Confirmed-path `deployOnchainId` outcome: the deployment was mined and the ONCHAINID
 * address was read from the factory event, so `onchainId` is required.
 */
export interface DeployOnchainIdConfirmedResult extends DeployOnchainIdResult {
  /** Discriminant — this arm carries a resolved `onchainId`. */
  readonly completion: 'confirmed';
}

/**
 * Submit-only `deployOnchainId` outcome: the write resolved as soon as submission was known,
 * so the ONCHAINID address does not exist yet.
 *
 * **Mechanism, not convention:** this arm has *no* `onchainId` property at all — rather than
 * an optional `onchainId?: string` on one shared shape. A caller therefore cannot read a
 * fabricated or empty address without first narrowing on `completion`, and the compiler
 * enforces it. `id` is the preferred submission id (the relayer submission id when the
 * strategy supplied one, else the tx hash).
 */
export interface DeployOnchainIdSubmittedResult extends OperationResult {
  /** Discriminant — this arm has no `onchainId`; resolve it later via `findIdentityByWallet`. */
  readonly completion: 'submitted';
}

/**
 * Completion-keyed discriminated union returned by
 * {@link IRSCapability.deployOnchainId}.
 *
 * Narrow before reading the ONCHAINID address:
 *
 * ```ts
 * const outcome = await irs.deployOnchainId({ holder }, executionConfig);
 * if (outcome.completion === 'confirmed') {
 *   use(outcome.onchainId); // required on this arm
 * } else {
 *   // submit-only: persist outcome.id and resolve the address on resume
 * }
 * ```
 */
export type DeployOnchainIdOutcome =
  | DeployOnchainIdConfirmedResult
  | DeployOnchainIdSubmittedResult;
