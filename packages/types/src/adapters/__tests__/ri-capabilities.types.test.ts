/**
 * Type-level conformance tests for the RI capability interfaces (US1 / SC-008).
 *
 * These are compile-time assertions: each stub must structurally satisfy its interface,
 * and each interface's method/return shapes must match the `contracts/*.md` contracts.
 * If any interface drifts from its contract, `pnpm typecheck` (and the build) fail.
 *
 * Runtime `expect`s exist only so Vitest registers the file; the real coverage is the
 * `satisfies` checks evaluated by tsc.
 */

import { describe, expect, it } from 'vitest';

import type {
  Amount,
  ClaimPayload,
  ERC3643Capability,
  ERC4626Capability,
  FactoryIdentityLookup,
  IdentityKeyPurposeLookup,
  IdentityRegistration,
  IRSCapability,
  NetworkConfig,
  OnboardingClaim,
  OnchainIdLookup,
  OperationResult,
  TransferSimulationResult,
} from '../../index';

const networkConfig = {} as NetworkConfig;
const executionConfig = {} as Parameters<ERC3643Capability['mint']>[1];

const opResult: OperationResult = { id: '0xtx' };

// --- ERC-3643 stub: must satisfy every read + write in the contract ---
const erc3643Stub = {
  networkConfig,
  dispose: () => undefined,
  balanceOf: async (_holder: string): Promise<Amount> => '0',
  isVerified: async (_holder: string): Promise<boolean> => false,
  isFrozen: async (_holder: string): Promise<boolean> => false,
  getJurisdiction: async (_holder: string): Promise<string | undefined> => undefined,
  simulateTransfer: async (_input: {
    from: string;
    to: string;
    amount: Amount;
  }): Promise<TransferSimulationResult> => ({ allowed: true, modulesEvaluated: 0 }),
  mint: async (_input: { to: string; amount: Amount }) => opResult,
  burn: async (_input: { from: string; amount: Amount }) => opResult,
  transfer: async (_input: { from: string; to: string; amount: Amount }) => opResult,
  freeze: async (_input: { holder: string }) => opResult,
  unfreeze: async (_input: { holder: string }) => opResult,
} satisfies ERC3643Capability;

// --- ERC-4626 stub ---
const erc4626Stub = {
  networkConfig,
  dispose: () => undefined,
  convertToAssets: async (_shares: Amount): Promise<Amount> => '0',
  convertToShares: async (_assets: Amount): Promise<Amount> => '0',
  totalAssets: async (): Promise<Amount> => '0',
  deposit: async (_input: { from: string; amount: Amount }) => ({ ...opResult, sharesIssued: '0' }),
  withdraw: async (_input: { from: string; shares: Amount }) => ({
    ...opResult,
    amountReturned: '0',
  }),
} satisfies ERC4626Capability;

// --- IRS stub ---
const irsStub = {
  networkConfig,
  dispose: () => undefined,
  getOnchainId: async (_holder: string): Promise<OnchainIdLookup> => ({ found: false }),
  getFactoryIdentity: async (_holder: string): Promise<FactoryIdentityLookup> => ({
    status: 'not_found',
  }),
  hasIdentityKeyPurpose: async (_input: {
    onchainId: string;
    address: string;
    purpose: number;
  }): Promise<IdentityKeyPurposeLookup> => ({ status: 'lacks' }),
  isVerified: async (_holder: string): Promise<boolean> => false,
  getJurisdiction: async (_holder: string): Promise<string | undefined> => undefined,
  buildClaimPayload: (input: {
    onchainId: string;
    topic: string;
    scheme: number;
    data: string;
  }): ClaimPayload => ({
    digest: '0x',
    topic: input.topic,
    scheme: input.scheme,
    data: input.data,
  }),
  deployOnchainId: async (_input: { holder: string }) => ({ ...opResult, onchainId: '0x' }),
  grantHolderManagementKey: async (_input: { onchainId: string; holder: string }) => opResult,
  registerTrustedIssuer: async (_input: { issuer: string; topics: string[] }) => opResult,
  attachClaim: async (_input: { onchainId: string; claim: OnboardingClaim }) => opResult,
  registerIdentity: async (_input: IdentityRegistration) => opResult,
} satisfies IRSCapability;

describe('RI capability type conformance (SC-008)', () => {
  it('ERC3643Capability stub satisfies the contract shape', () => {
    expect(typeof erc3643Stub.simulateTransfer).toBe('function');
    expect(executionConfig).toBeDefined();
  });

  it('ERC4626Capability stub satisfies the contract shape', () => {
    expect(typeof erc4626Stub.convertToAssets).toBe('function');
  });

  it('IRSCapability stub satisfies the contract shape', () => {
    expect(typeof irsStub.buildClaimPayload).toBe('function');
  });
});
