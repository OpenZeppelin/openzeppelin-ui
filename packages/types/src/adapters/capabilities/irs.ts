import type { ExecutionConfig } from '../../execution';
import type { TransactionStatusUpdate, TxStatus } from '../../transactions/status';
import type { OperationResult } from '../access-control';
import type {
  ClaimPayload,
  DeployOnchainIdOutcome,
  FactoryIdentityLookup,
  IdentityKeyPurposeLookup,
  IdentityRegistration,
  OnboardingClaim,
  OnchainIdLookup,
} from '../irs';
import type { RuntimeCapability } from '../runtime';

/**
 * **Tier 3** — Identity Registry Storage (IRS) / ONCHAINID capability.
 *
 * Owns all on-chain identity primitives; the consuming plugin orchestrates onboarding
 * ordering. Reads run over RPC; writes delegate to the adapter's injected
 * `signAndBroadcast` callback. Extends {@link RuntimeCapability}.
 *
 * The capability **never holds or uses the trusted-issuer key**: claims are pre-signed
 * by the consumer ({@link buildClaimPayload} produces the digest to sign out-of-band,
 * and {@link attachClaim} relays the resulting {@link OnboardingClaim} on-chain).
 *
 * Identity writes are idempotent on retry to support partial-failure recovery;
 * `registerIdentity` on an already-registered holder maps to `IdentityAlreadyRegistered`.
 *
 * @see Contract `specs/002-ri-evm-capabilities/contracts/irs-capability.md`
 */
export interface IRSCapability extends RuntimeCapability {
  // ---- Reads ----

  /**
   * Look up the ONCHAINID for `holder`.
   * Returns `{ found: false }` (never throws) when no identity exists.
   */
  getOnchainId(holder: string): Promise<OnchainIdLookup>;

  /**
   * Resolve the ONCHAINID the identity factory deployed for `holder`.
   *
   * Used by resume/idempotency paths that must detect deployed-but-unregistered holders.
   * `not_found` is distinct from `read_failed` — transport failures must not be treated as
   * "no identity".
   */
  getFactoryIdentity(holder: string): Promise<FactoryIdentityLookup>;

  /**
   * Probe whether `address` holds `purpose` on an ONCHAINID identity.
   *
   * Used by resume/idempotency paths that must detect whether `grantHolderManagementKey`
   * already ran — `read_failed` must not be treated as `lacks`.
   */
  hasIdentityKeyPurpose(input: {
    onchainId: string;
    address: string;
    purpose: number;
  }): Promise<IdentityKeyPurposeLookup>;

  /**
   * The IRS verification pre-check.
   * Returns `false` (never throws) when `holder` is unregistered.
   */
  isVerified(holder: string): Promise<boolean>;

  /** Jurisdiction code for `holder`, or `undefined` when unavailable. */
  getJurisdiction(holder: string): Promise<string | undefined>;

  // ---- Pure helper (no key, no execution) ----

  /**
   * Build the canonical claim digest the consumer signs out-of-band.
   * Pure and key-free: same inputs → same {@link ClaimPayload.digest}, no RPC, no signing.
   */
  buildClaimPayload(input: {
    onchainId: string;
    topic: string;
    scheme: number;
    data: string;
  }): ClaimPayload;

  // ---- Writes (via injected signAndBroadcast) ----

  /**
   * Deploy a new ONCHAINID for `holder`.
   *
   * Resolves with a completion-keyed {@link DeployOnchainIdOutcome}:
   *
   * - `completion: 'confirmed'` (the default when the execution config does not request
   *   submit-only) — the deployment was mined and `onchainId` is available.
   * - `completion: 'submitted'` — resolved at submission time; the arm carries **no**
   *   `onchainId`, only the submission `id`. Resolve the address later via
   *   `findIdentityByWallet` when the deployment is mined.
   *
   * Narrow on `completion` before reading `onchainId`; the compiler enforces it.
   *
   * @param input - The holder to deploy an ONCHAINID for.
   * @param executionConfig - Execution method (eoa, relayer, etc.).
   * @param onStatusChange - Optional transaction status callback.
   * @param runtimeApiKey - Optional session-only API key (e.g. Relayer).
   */
  deployOnchainId(
    input: { holder: string },
    executionConfig: ExecutionConfig,
    onStatusChange?: (status: TxStatus, details: TransactionStatusUpdate) => void,
    runtimeApiKey?: string
  ): Promise<DeployOnchainIdOutcome>;

  /**
   * Grant the holder a MANAGEMENT key on their ONCHAINID (submits `addKey(holder, MANAGEMENT)`).
   *
   * **Saga ordering is load-bearing:** consumers MUST call this after `deployOnchainId` and
   * **before** `attachClaim` so the holder can rescue their identity if a later step fails.
   */
  grantHolderManagementKey(
    input: { onchainId: string; holder: string },
    executionConfig: ExecutionConfig,
    onStatusChange?: (status: TxStatus, details: TransactionStatusUpdate) => void,
    runtimeApiKey?: string
  ): Promise<OperationResult>;

  /**
   * Register a trusted issuer for the given claim `topics`. Idempotent: safe to
   * re-run when the issuer is already registered.
   */
  registerTrustedIssuer(
    input: { issuer: string; topics: string[] },
    executionConfig: ExecutionConfig,
    onStatusChange?: (status: TxStatus, details: TransactionStatusUpdate) => void,
    runtimeApiKey?: string
  ): Promise<OperationResult>;

  /**
   * Attach a pre-signed {@link OnboardingClaim} to an ONCHAINID (submits `addClaim`).
   * The capability neither accepts nor uses the issuer key.
   */
  attachClaim(
    input: { onchainId: string; claim: OnboardingClaim },
    executionConfig: ExecutionConfig,
    onStatusChange?: (status: TxStatus, details: TransactionStatusUpdate) => void,
    runtimeApiKey?: string
  ): Promise<OperationResult>;

  /**
   * Register a holder's identity in the Identity Registry.
   * An already-registered holder maps to `IdentityAlreadyRegistered`.
   */
  registerIdentity(
    input: IdentityRegistration,
    executionConfig: ExecutionConfig,
    onStatusChange?: (status: TxStatus, details: TransactionStatusUpdate) => void,
    runtimeApiKey?: string
  ): Promise<OperationResult>;
}
