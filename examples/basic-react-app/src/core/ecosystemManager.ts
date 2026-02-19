/**
 * Ecosystem Manager for the Demo App
 *
 * Centralized module for ecosystem/network/adapter management.
 * Adapter-intrinsic metadata (name, description, networks, createAdapter) is
 * loaded from the adapter's `ecosystemDefinition` export. Demo-specific data
 * (sample addresses, demo contract addresses) is kept here.
 */

import type {
  ContractAdapter,
  Ecosystem,
  EcosystemExport,
  EcosystemMetadata as EcosystemMetadataBase,
  NetworkConfig,
} from '@openzeppelin/ui-types';

// Static metadata imports — tiny, available synchronously
import { ecosystemMetadata as evmMetadataBase } from '@openzeppelin/ui-builder-adapter-evm/metadata';
import { ecosystemMetadata as stellarMetadataBase } from '@openzeppelin/ui-builder-adapter-stellar/metadata';

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
// Metadata Registry (synchronous — available from first render)
// ============================================================================

const metadataRegistry: Record<DemoEcosystem, EcosystemMetadataBase> = {
  evm: evmMetadataBase,
  stellar: stellarMetadataBase,
};

// ============================================================================
// Caches
// ============================================================================

const ecosystemDefCache = new Map<DemoEcosystem, EcosystemExport>();
const adapterCache = new Map<string, ContractAdapter>();

// ============================================================================
// Full Adapter Module Loading
// ============================================================================

async function loadAdapterModule(ecosystem: DemoEcosystem): Promise<EcosystemExport> {
  const cached = ecosystemDefCache.get(ecosystem);
  if (cached) return cached;

  let mod: { ecosystemDefinition: EcosystemExport };
  switch (ecosystem) {
    case 'evm':
      mod = await import('@openzeppelin/ui-builder-adapter-evm');
      break;
    case 'stellar':
      mod = await import('@openzeppelin/ui-builder-adapter-stellar');
      break;
    default: {
      const _exhaustiveCheck: never = ecosystem;
      throw new Error(`Unknown ecosystem: ${String(_exhaustiveCheck)}`);
    }
  }

  const def = mod.ecosystemDefinition;
  ecosystemDefCache.set(ecosystem, def);
  return def;
}

// ============================================================================
// Public API - Synchronous (no loading required)
// ============================================================================

export function getSupportedEcosystems(): DemoEcosystem[] {
  return Object.keys(demoRegistry) as DemoEcosystem[];
}

export function getEcosystemStaticMetadata(ecosystem: DemoEcosystem): EcosystemStaticMetadata {
  const demo = demoRegistry[ecosystem];
  const meta = metadataRegistry[ecosystem];
  return {
    name: meta?.name ?? ecosystem,
    description: meta?.description ?? '',
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
  const def = await loadAdapterModule(ecosystem);
  return def.networks;
}

export async function getDefaultNetwork(ecosystem: DemoEcosystem): Promise<NetworkConfig> {
  const def = await loadAdapterModule(ecosystem);
  const demo = demoRegistry[ecosystem];
  const defaultNet = def.networks.find((n) => n.id === demo.defaultNetworkId);
  if (!defaultNet) {
    throw new Error(`Default network '${demo.defaultNetworkId}' not found for ${ecosystem}`);
  }
  return defaultNet;
}

export async function getNetworkById(id: string): Promise<NetworkConfig | undefined> {
  for (const ecosystem of getSupportedEcosystems()) {
    const def = await loadAdapterModule(ecosystem);
    const network = def.networks.find((n) => n.id === id);
    if (network) return network;
  }
  return undefined;
}

export async function getEcosystemMetadata(ecosystem: DemoEcosystem): Promise<EcosystemMetadata> {
  const [def, defaultNetwork] = await Promise.all([
    loadAdapterModule(ecosystem),
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

export async function createAdapter(networkConfig: NetworkConfig): Promise<ContractAdapter> {
  const cached = adapterCache.get(networkConfig.id);
  if (cached) return cached;

  const def = await loadAdapterModule(networkConfig.ecosystem as DemoEcosystem);
  const adapter = def.createAdapter(networkConfig);

  adapterCache.set(networkConfig.id, adapter);
  return adapter;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function clearAllCaches(): void {
  ecosystemDefCache.clear();
  adapterCache.clear();
}

export function isEcosystemLoaded(ecosystem: DemoEcosystem): boolean {
  return ecosystemDefCache.has(ecosystem);
}

export async function preloadEcosystem(ecosystem: DemoEcosystem): Promise<void> {
  await loadAdapterModule(ecosystem);
}
