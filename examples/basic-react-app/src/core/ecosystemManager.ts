/**
 * Ecosystem Manager for the Demo App
 *
 * Uses REAL adapter packages from @openzeppelin/ui-builder-adapter-*
 * to demonstrate actual blockchain integration patterns.
 */

// Import real adapters and networks
import {
  ethereumSepolia,
  EvmAdapter,
  evmNetworks,
  type TypedEvmNetworkConfig,
} from '@openzeppelin/ui-builder-adapter-evm';
import {
  StellarAdapter,
  stellarNetworks,
  stellarTestnet,
} from '@openzeppelin/ui-builder-adapter-stellar';
import type {
  ContractAdapter,
  Ecosystem,
  NetworkConfig,
  StellarNetworkConfig,
} from '@openzeppelin/ui-types';

// ============================================================================
// Types
// ============================================================================

/**
 * Ecosystems supported in the demo app
 * Note: Midnight adapter has complex WASM dependencies, so we exclude it for now
 */
export type DemoEcosystem = Extract<Ecosystem, 'evm' | 'stellar'>;

/**
 * Metadata for each ecosystem including UI display info
 */
export interface EcosystemMetadata {
  name: string;
  description: string;
  networks: NetworkConfig[];
  defaultNetwork: NetworkConfig;
  sampleAddresses: Record<string, string>;
  addressFormat: string;
  iconName: string;
}

// ============================================================================
// Sample Addresses for Demo
// ============================================================================

const evmSampleAddresses = {
  wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f1D3F4',
  contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  zero: '0x0000000000000000000000000000000000000000',
};

const stellarSampleAddresses = {
  wallet: 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOUJ3WSWWRQGQTQPZ',
  contract: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  zero: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
};

// ============================================================================
// Ecosystem Registry
// ============================================================================

/**
 * Registry of supported ecosystems with their metadata
 */
export const ecosystemRegistry: Record<DemoEcosystem, EcosystemMetadata> = {
  evm: {
    name: 'EVM',
    description: 'Ethereum Virtual Machine compatible chains',
    networks: evmNetworks,
    defaultNetwork: ethereumSepolia,
    sampleAddresses: evmSampleAddresses,
    addressFormat: '0x + 40 hex characters (42 total)',
    iconName: 'ethereum',
  },
  stellar: {
    name: 'Stellar',
    description: 'Stellar network with Soroban smart contracts',
    networks: stellarNetworks,
    defaultNetwork: stellarTestnet,
    sampleAddresses: stellarSampleAddresses,
    addressFormat: 'G/C + 55 base32 characters (56 total)',
    iconName: 'stellar',
  },
};

// ============================================================================
// Adapter Cache
// ============================================================================

/**
 * Cache for adapter instances by network ID
 * Avoids recreating adapters unnecessarily
 */
const adapterCache = new Map<string, ContractAdapter>();

// ============================================================================
// Public API
// ============================================================================

/**
 * Get all supported ecosystems
 */
export function getSupportedEcosystems(): DemoEcosystem[] {
  return Object.keys(ecosystemRegistry) as DemoEcosystem[];
}

/**
 * Get metadata for an ecosystem
 */
export function getEcosystemMetadata(ecosystem: DemoEcosystem): EcosystemMetadata {
  return ecosystemRegistry[ecosystem];
}

/**
 * Get available networks for an ecosystem
 */
export function getNetworksForEcosystem(ecosystem: DemoEcosystem): NetworkConfig[] {
  return ecosystemRegistry[ecosystem].networks;
}

/**
 * Get the default network for an ecosystem
 */
export function getDefaultNetwork(ecosystem: DemoEcosystem): NetworkConfig {
  return ecosystemRegistry[ecosystem].defaultNetwork;
}

/**
 * Create an adapter instance for a network configuration
 *
 * @param networkConfig - The network to create an adapter for
 * @returns A ContractAdapter instance
 */
export function createAdapter(networkConfig: NetworkConfig): ContractAdapter {
  // Check cache first
  const cached = adapterCache.get(networkConfig.id);
  if (cached) {
    return cached;
  }

  // Create new adapter based on ecosystem
  let adapter: ContractAdapter;

  switch (networkConfig.ecosystem) {
    case 'evm':
      // Cast to TypedEvmNetworkConfig as evmNetworks uses the extended type
      adapter = new EvmAdapter(networkConfig as TypedEvmNetworkConfig);
      break;
    case 'stellar':
      adapter = new StellarAdapter(networkConfig as StellarNetworkConfig);
      break;
    default:
      throw new Error(`Unsupported ecosystem: ${networkConfig.ecosystem}`);
  }

  // Cache and return
  adapterCache.set(networkConfig.id, adapter);
  return adapter;
}

/**
 * Get sample addresses for an ecosystem
 */
export function getSampleAddresses(ecosystem: DemoEcosystem): Record<string, string> {
  return ecosystemRegistry[ecosystem].sampleAddresses;
}

/**
 * Clear the adapter cache (useful for testing)
 */
export function clearAdapterCache(): void {
  adapterCache.clear();
}
