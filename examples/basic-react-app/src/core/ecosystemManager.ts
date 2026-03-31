/**
 * Ecosystem Manager for the Demo App
 *
 * Centralized module for ecosystem, network, and adapter management.
 * Adapter-owned metadata and network catalogs come directly from the published
 * adapter subpath exports, while this file adds the demo-specific presentation
 * data used by the example app.
 */

import type {
  Ecosystem,
  EcosystemExport,
  NetworkConfig,
  EcosystemMetadata as PublishedEcosystemMetadata,
} from '@openzeppelin/ui-types';

import { ecosystemMetadata as evmMetadata } from '@openzeppelin/adapter-evm/metadata';
import { networks as evmNetworks } from '@openzeppelin/adapter-evm/networks';
import { ecosystemMetadata as stellarMetadata } from '@openzeppelin/adapter-stellar/metadata';
import { networks as stellarNetworks } from '@openzeppelin/adapter-stellar/networks';

import type { DemoRuntime } from './runtimeCapabilities';

// ============================================================================
// Types
// ============================================================================

export type DemoEcosystem = Extract<Ecosystem, 'evm' | 'stellar'>;

export interface EcosystemStaticMetadata {
  name: string;
  description: string;
  sampleAddresses: Record<string, string>;
  addressFormat: string;
  iconName: string;
  demoContractAddress: string;
  defaultNetworkId: string;
}

export interface EcosystemMetadata extends EcosystemStaticMetadata {
  networks: NetworkConfig[];
  defaultNetwork: NetworkConfig;
}

// ============================================================================
// Demo-Specific Data (app-level, not from adapters)
// ============================================================================

interface DemoEcosystemData {
  sampleAddresses: Record<string, string>;
  addressFormat: string;
  iconName: string;
  demoContractAddress: string;
  defaultNetworkId: string;
}

const demoRegistry: Record<DemoEcosystem, DemoEcosystemData> = {
  evm: {
    sampleAddresses: {
      wallet: '0x742d35cc6634c0532925a3b844bc9e7595f1d3f4',
      contract: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      zero: '0x0000000000000000000000000000000000000000',
    },
    addressFormat: '0x + 40 hex characters (42 total)',
    iconName: 'ethereum',
    demoContractAddress: '0x3814B80Df228055EA043F14219c5b70F40a7Bf14',
    defaultNetworkId: 'ethereum-sepolia',
  },
  stellar: {
    sampleAddresses: {
      wallet: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
      contract: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
      zero: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    },
    addressFormat: 'G/C + 55 base32 characters (56 total)',
    iconName: 'stellar',
    demoContractAddress: 'CDXBAC2SN6DR67PWHP45KIG2A2AY7EC2O2H4IIW4GR3NQP7AY37RKJU5',
    defaultNetworkId: 'stellar-testnet',
  },
};

// ============================================================================
// Adapter-owned published metadata
// ============================================================================

interface PublishedEcosystemEntry {
  metadata: PublishedEcosystemMetadata;
  networks: NetworkConfig[];
  loadDefinition: () => Promise<EcosystemExport>;
}

const PUBLISHED_ECOSYSTEMS: Record<DemoEcosystem, PublishedEcosystemEntry> = {
  evm: {
    metadata: evmMetadata,
    networks: evmNetworks,
    loadDefinition: async () => (await import('@openzeppelin/adapter-evm')).ecosystemDefinition,
  },
  stellar: {
    metadata: stellarMetadata,
    networks: stellarNetworks,
    loadDefinition: async () => (await import('@openzeppelin/adapter-stellar')).ecosystemDefinition,
  },
};

export const ECOSYSTEM_METADATA: Record<DemoEcosystem, PublishedEcosystemMetadata> = {
  evm: PUBLISHED_ECOSYSTEMS.evm.metadata,
  stellar: PUBLISHED_ECOSYSTEMS.stellar.metadata,
};

// ============================================================================
// Caches
// ============================================================================

const ecosystemDefCache = new Map<DemoEcosystem, EcosystemExport>();
const runtimeCache = new Map<string, DemoRuntime>();

// ============================================================================
// Full Adapter Loading
// ============================================================================

async function loadEcosystemDefinition(ecosystem: DemoEcosystem): Promise<EcosystemExport> {
  const cached = ecosystemDefCache.get(ecosystem);
  if (cached) {
    return cached;
  }

  const definition = await PUBLISHED_ECOSYSTEMS[ecosystem].loadDefinition();
  ecosystemDefCache.set(ecosystem, definition);
  return definition;
}

// ============================================================================
// Public API - Synchronous (no loading required)
// ============================================================================

export function getSupportedEcosystems(): DemoEcosystem[] {
  return Object.keys(PUBLISHED_ECOSYSTEMS) as DemoEcosystem[];
}

export function getEcosystemStaticMetadata(ecosystem: DemoEcosystem): EcosystemStaticMetadata {
  const demo = demoRegistry[ecosystem];
  const meta = PUBLISHED_ECOSYSTEMS[ecosystem].metadata;
  return {
    name: meta.name,
    description: meta.description,
    sampleAddresses: demo.sampleAddresses,
    addressFormat: demo.addressFormat,
    iconName: demo.iconName,
    demoContractAddress: demo.demoContractAddress,
    defaultNetworkId: demo.defaultNetworkId,
  };
}

export function getSampleAddresses(ecosystem: DemoEcosystem): Record<string, string> {
  return demoRegistry[ecosystem]?.sampleAddresses ?? {};
}

export function getDemoContractAddress(ecosystem: DemoEcosystem): string {
  return demoRegistry[ecosystem].demoContractAddress;
}

export function isDemoContractDeployed(ecosystem: DemoEcosystem): boolean {
  const address = getDemoContractAddress(ecosystem);
  return !address.startsWith('PLACEHOLDER');
}

// ============================================================================
// Public API - Asynchronous (may trigger lazy loading)
// ============================================================================

export async function getNetworksForEcosystem(ecosystem: DemoEcosystem): Promise<NetworkConfig[]> {
  return PUBLISHED_ECOSYSTEMS[ecosystem].networks;
}

export async function getDefaultNetwork(ecosystem: DemoEcosystem): Promise<NetworkConfig> {
  const networks = PUBLISHED_ECOSYSTEMS[ecosystem].networks;
  const demo = demoRegistry[ecosystem];
  const defaultNet = networks.find((n) => n.id === demo.defaultNetworkId);
  if (!defaultNet) {
    throw new Error(`Default network '${demo.defaultNetworkId}' not found for ${ecosystem}`);
  }
  return defaultNet;
}

export async function getNetworkById(id: string): Promise<NetworkConfig | undefined> {
  for (const ecosystem of getSupportedEcosystems()) {
    const network = PUBLISHED_ECOSYSTEMS[ecosystem].networks.find((item) => item.id === id);
    if (network) return network;
  }
  return undefined;
}

export async function getEcosystemMetadata(ecosystem: DemoEcosystem): Promise<EcosystemMetadata> {
  const [def, defaultNetwork] = await Promise.all([
    loadEcosystemDefinition(ecosystem),
    getDefaultNetwork(ecosystem),
  ]);

  const demo = demoRegistry[ecosystem];
  return {
    name: def.name,
    description: def.description,
    sampleAddresses: demo.sampleAddresses,
    addressFormat: demo.addressFormat,
    iconName: demo.iconName,
    demoContractAddress: demo.demoContractAddress,
    defaultNetworkId: demo.defaultNetworkId,
    networks: def.networks,
    defaultNetwork,
  };
}

export async function getRuntime(networkConfig: NetworkConfig): Promise<DemoRuntime> {
  const cached = runtimeCache.get(networkConfig.id);
  if (cached) return cached;

  const def = await loadEcosystemDefinition(networkConfig.ecosystem as DemoEcosystem);
  const runtime = def.createRuntime('composer', networkConfig) as DemoRuntime;

  runtimeCache.set(networkConfig.id, runtime);
  return runtime;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function clearAllCaches(): void {
  ecosystemDefCache.clear();
  runtimeCache.forEach((runtime) => runtime.dispose());
  runtimeCache.clear();
}

export function isEcosystemLoaded(ecosystem: DemoEcosystem): boolean {
  return ecosystemDefCache.has(ecosystem);
}

export async function preloadEcosystem(ecosystem: DemoEcosystem): Promise<void> {
  await loadEcosystemDefinition(ecosystem);
}
