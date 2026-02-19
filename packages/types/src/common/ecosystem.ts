/**
 * Blockchain Ecosystem Types
 *
 * This file defines core types related to blockchain ecosystems supported
 * by the OpenZeppelin UI ecosystem. It consolidates previously scattered
 * ecosystem-related types into a single source of truth.
 */

/**
 * Supported blockchain ecosystems
 */
export type Ecosystem = 'evm' | 'solana' | 'stellar' | 'midnight' | 'polkadot';

/**
 * Network environment types
 */
export type NetworkType = 'mainnet' | 'testnet' | 'devnet';

/**
 * Configuration for ecosystem feature flags
 */
export interface EcosystemFeatureConfig {
  /** Whether the ecosystem is enabled and functional */
  enabled: boolean;
  /** Whether to show the ecosystem in the UI (even if disabled) */
  showInUI: boolean;
  /** Label to display when the ecosystem is disabled */
  disabledLabel?: string;
  /** Description to show when the ecosystem is disabled */
  disabledDescription?: string;
}

/**
 * Type guards for ecosystem types
 */

export const isEvmEcosystem = (ecosystem: Ecosystem): ecosystem is 'evm' => ecosystem === 'evm';

export const isSolanaEcosystem = (ecosystem: Ecosystem): ecosystem is 'solana' =>
  ecosystem === 'solana';

export const isStellarEcosystem = (ecosystem: Ecosystem): ecosystem is 'stellar' =>
  ecosystem === 'stellar';

export const isMidnightEcosystem = (ecosystem: Ecosystem): ecosystem is 'midnight' =>
  ecosystem === 'midnight';

export const isPolkadotEcosystem = (ecosystem: Ecosystem): ecosystem is 'polkadot' =>
  ecosystem === 'polkadot';
