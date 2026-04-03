import { type Address, getAddress } from 'viem';

// In dev, proxy through Vite to avoid CORS. In prod, point directly.
export const BUNDLER_URL = import.meta.env.VITE_BUNDLER_URL ?? `${window.location.origin}/bundler`;
export const RPC_URL = import.meta.env.VITE_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com';
export const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? '';

// Contract addresses from SDK deployments (Sepolia)
// IMPORTANT: All addresses must be checksummed — Zama SDK rejects lowercase addresses
// with "Contract address is not a valid address" errors.
// These match @zama-accounts/sdk constants/deployments.ts — kept in sync manually
// until the SDK publishes to npm with proper exports.
export const FAUCET_TOKEN_ADDRESS: Address = getAddress('0x37b0e0ff61c8366b06494a2434596c3595b564eb');
export const SCOPED_SESSION_KEYS_VALIDATOR: Address = getAddress('0xeeabf75e8b9fd833bb374930bcc8794f08f059d3');
export const CONFIDENTIAL_SPENDING_EXECUTOR: Address = getAddress('0xabdbe3ce320c4e12dfd441501e8c9e3ba62b229b'); // v7: encrypted spending limits
export const MULTISIG_VALIDATOR_ADDRESS: Address = getAddress('0xb6368e869d85c42175cb6e860a10edafcb2b5cc7');
export const ECDSA_VALIDATOR_ADDRESS: Address = getAddress('0x444dE8BdF6a60dfe8164Ce614fc8e3D8C1515b0d');
export const WEIGHTED_MULTISIG_VALIDATOR_ADDRESS: Address = getAddress('0x97ead1e653a2aad451fe1ef781a28393a8302ac7');

// Account funding amount (in ETH)
export const ACCOUNT_FUNDING_AMOUNT = '0.005';

// Sepolia faucet links for insufficient balance errors
export const SEPOLIA_FAUCETS = [
  { name: 'Google Cloud', url: 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia' },
  { name: 'Alchemy', url: 'https://www.alchemy.com/faucets/ethereum-sepolia' },
  { name: 'Infura', url: 'https://www.infura.io/faucet/sepolia' },
];
