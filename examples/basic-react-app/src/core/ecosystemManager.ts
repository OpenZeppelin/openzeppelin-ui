/**
 * Ecosystem Manager for the Demo App
 *
 * Centralized module for ecosystem/network/adapter management.
 * Follows the UI Builder pattern with LAZY LOADING of adapters.
 *
 * Key features:
 * - Adapters are loaded on-demand when first needed (not at startup)
 * - Networks are cached after first load
 * - Single source of truth for ecosystem metadata
 */

import type { TypedEvmNetworkConfig } from '@openzeppelin/ui-builder-adapter-evm';
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
 * Ecosystems supported in the demo app.
 * Note: Midnight/Solana adapters have complex dependencies, excluded for simplicity.
 */
export type DemoEcosystem = Extract<Ecosystem, 'evm' | 'stellar'>;

/**
 * Static metadata for each ecosystem (doesn't require loading adapter).
 */
export interface EcosystemStaticMetadata {
  name: string;
  description: string;
  sampleAddresses: Record<string, string>;
  addressFormat: string;
  iconName: string;
  /** Export name for networks array in adapter package */
  networksExportName: string;
  /** Export name for default network in adapter package */
  defaultNetworkExportName: string;
}

/**
 * Full metadata including loaded networks.
 */
export interface EcosystemMetadata extends EcosystemStaticMetadata {
  networks: NetworkConfig[];
  defaultNetwork: NetworkConfig;
}

// ============================================================================
// Sample Addresses for Demo (static, no loading required)
// ============================================================================

const evmSampleAddresses = {
  wallet: '0x742d35cc6634c0532925a3b844bc9e7595f1d3f4',
  contract: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  zero: '0x0000000000000000000000000000000000000000',
};

const stellarSampleAddresses = {
  // Known valid Stellar testnet addresses (56 characters each)
  wallet: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
  contract: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
  zero: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
};

// ============================================================================
// Ecosystem Registry (Static Metadata)
// ============================================================================

/**
 * Static registry - does NOT trigger adapter loading.
 * Networks are loaded lazily when needed.
 */
const ecosystemStaticRegistry: Record<DemoEcosystem, EcosystemStaticMetadata> = {
  evm: {
    name: 'EVM',
    description: 'Ethereum Virtual Machine compatible chains',
    sampleAddresses: evmSampleAddresses,
    addressFormat: '0x + 40 hex characters (42 total)',
    iconName: 'ethereum',
    networksExportName: 'evmNetworks',
    defaultNetworkExportName: 'ethereumSepolia',
  },
  stellar: {
    name: 'Stellar',
    description: 'Stellar network with Soroban smart contracts',
    sampleAddresses: stellarSampleAddresses,
    addressFormat: 'G/C + 55 base32 characters (56 total)',
    iconName: 'stellar',
    networksExportName: 'stellarNetworks',
    defaultNetworkExportName: 'stellarTestnet',
  },
};

// ============================================================================
// Caches (populated on-demand)
// ============================================================================

/** Cache for loaded adapter modules */
const adapterModuleCache = new Map<DemoEcosystem, Record<string, unknown>>();

/** Cache for networks by ecosystem */
const networksCache = new Map<DemoEcosystem, NetworkConfig[]>();

/** Cache for default networks by ecosystem */
const defaultNetworkCache = new Map<DemoEcosystem, NetworkConfig>();

/** Cache for adapter instances by network ID */
const adapterCache = new Map<string, ContractAdapter>();

// ============================================================================
// Dynamic Module Loading
// ============================================================================

/**
 * Dynamically load an adapter package module.
 * Uses static switch for Vite compatibility (dynamic import paths must be static).
 */
async function loadAdapterModule(ecosystem: DemoEcosystem): Promise<Record<string, unknown>> {
  // Check cache first
  const cached = adapterModuleCache.get(ecosystem);
  if (cached) return cached;

  // Dynamic import based on ecosystem
  let module: Record<string, unknown>;
  switch (ecosystem) {
    case 'evm':
      module = await import('@openzeppelin/ui-builder-adapter-evm');
      break;
    case 'stellar':
      module = await import('@openzeppelin/ui-builder-adapter-stellar');
      break;
    default: {
      const _exhaustiveCheck: never = ecosystem;
      throw new Error(`Unknown ecosystem: ${String(_exhaustiveCheck)}`);
    }
  }

  // Cache and return
  adapterModuleCache.set(ecosystem, module);
  return module;
}

// ============================================================================
// Public API - Synchronous (no loading required)
// ============================================================================

/**
 * Get all supported ecosystems.
 */
export function getSupportedEcosystems(): DemoEcosystem[] {
  return Object.keys(ecosystemStaticRegistry) as DemoEcosystem[];
}

/**
 * Get static metadata for an ecosystem (no loading required).
 */
export function getEcosystemStaticMetadata(ecosystem: DemoEcosystem): EcosystemStaticMetadata {
  return ecosystemStaticRegistry[ecosystem];
}

/**
 * Get sample addresses for an ecosystem (no loading required).
 */
export function getSampleAddresses(ecosystem: DemoEcosystem): Record<string, string> {
  return ecosystemStaticRegistry[ecosystem]?.sampleAddresses ?? {};
}

// ============================================================================
// Public API - Asynchronous (may trigger lazy loading)
// ============================================================================

/**
 * Get available networks for an ecosystem.
 * Lazily loads the adapter package if not already loaded.
 */
export async function getNetworksForEcosystem(ecosystem: DemoEcosystem): Promise<NetworkConfig[]> {
  // Check cache first
  const cached = networksCache.get(ecosystem);
  if (cached) return cached;

  // Load adapter module
  const meta = ecosystemStaticRegistry[ecosystem];
  if (!meta) return [];

  const module = await loadAdapterModule(ecosystem);
  const networks = (module[meta.networksExportName] as NetworkConfig[]) ?? [];

  // Cache and return
  networksCache.set(ecosystem, networks);
  return networks;
}

/**
 * Get the default network for an ecosystem.
 * Lazily loads the adapter package if not already loaded.
 */
export async function getDefaultNetwork(ecosystem: DemoEcosystem): Promise<NetworkConfig> {
  // Check cache first
  const cached = defaultNetworkCache.get(ecosystem);
  if (cached) return cached;

  // Load adapter module
  const meta = ecosystemStaticRegistry[ecosystem];
  const module = await loadAdapterModule(ecosystem);
  const defaultNetwork = module[meta.defaultNetworkExportName] as NetworkConfig;

  // Cache and return
  defaultNetworkCache.set(ecosystem, defaultNetwork);
  return defaultNetwork;
}

/**
 * Get a network configuration by ID.
 * Searches across all ecosystems, loading them as needed.
 */
export async function getNetworkById(id: string): Promise<NetworkConfig | undefined> {
  // First check already-loaded caches
  for (const [, networks] of networksCache) {
    const network = networks.find((n) => n.id === id);
    if (network) return network;
  }

  // Load each ecosystem until we find the network
  for (const ecosystem of getSupportedEcosystems()) {
    if (networksCache.has(ecosystem)) continue; // Already checked above

    const networks = await getNetworksForEcosystem(ecosystem);
    const network = networks.find((n) => n.id === id);
    if (network) return network;
  }

  return undefined;
}

/**
 * Get full metadata for an ecosystem (includes loaded networks).
 * Lazily loads the adapter package if not already loaded.
 */
export async function getEcosystemMetadata(ecosystem: DemoEcosystem): Promise<EcosystemMetadata> {
  const staticMeta = ecosystemStaticRegistry[ecosystem];
  const [networks, defaultNetwork] = await Promise.all([
    getNetworksForEcosystem(ecosystem),
    getDefaultNetwork(ecosystem),
  ]);

  return {
    ...staticMeta,
    networks,
    defaultNetwork,
  };
}

/**
 * Create an adapter instance for a network configuration.
 * Lazily loads the adapter class if not already loaded.
 * Adapters are cached by network ID.
 */
export async function createAdapter(networkConfig: NetworkConfig): Promise<ContractAdapter> {
  // Check cache first
  const cached = adapterCache.get(networkConfig.id);
  if (cached) return cached;

  // Load adapter module and create instance
  const module = await loadAdapterModule(networkConfig.ecosystem as DemoEcosystem);
  let adapter: ContractAdapter;

  switch (networkConfig.ecosystem) {
    case 'evm': {
      const EvmAdapter = module.EvmAdapter as new (
        config: TypedEvmNetworkConfig
      ) => ContractAdapter;
      adapter = new EvmAdapter(networkConfig as TypedEvmNetworkConfig);
      break;
    }
    case 'stellar': {
      const StellarAdapter = module.StellarAdapter as new (
        config: StellarNetworkConfig
      ) => ContractAdapter;
      adapter = new StellarAdapter(networkConfig as StellarNetworkConfig);
      break;
    }
    default:
      throw new Error(`Unsupported ecosystem: ${networkConfig.ecosystem}`);
  }

  // Cache and return
  adapterCache.set(networkConfig.id, adapter);
  return adapter;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clear all caches (useful for testing).
 */
export function clearAllCaches(): void {
  adapterModuleCache.clear();
  networksCache.clear();
  defaultNetworkCache.clear();
  adapterCache.clear();
}

/**
 * Check if an ecosystem's adapter module is already loaded.
 */
export function isEcosystemLoaded(ecosystem: DemoEcosystem): boolean {
  return adapterModuleCache.has(ecosystem);
}

/**
 * Preload an ecosystem's adapter module (for eager loading if desired).
 */
export async function preloadEcosystem(ecosystem: DemoEcosystem): Promise<void> {
  await loadAdapterModule(ecosystem);
}
