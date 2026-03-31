/**
 * Network Utility Functions
 *
 * Centralizes runtime-led network resolution logic used across the example app.
 * All chain-specific knowledge comes from ecosystem metadata or network config —
 * no hardcoded chain conditionals scattered across components.
 */

import type { AddressingCapability, NetworkConfig } from '@openzeppelin/ui-types';

import { ECOSYSTEM_METADATA, getRuntime, type DemoEcosystem } from './ecosystemManager';
import type { DemoRuntime } from './runtimeCapabilities';

/**
 * Explorer address path segment per ecosystem.
 *
 * Ideally this would live on `EcosystemMetadata` in ui-types so adapters
 * can self-describe their explorer URL shape. For now, centralized here.
 */
const EXPLORER_ADDRESS_PATH: Record<string, string> = {
  evm: 'address',
  polkadot: 'address',
  stellar: 'account',
};

/**
 * Build the block explorer address URL for a given network.
 */
export function buildExplorerAddressUrl(
  network: NetworkConfig,
  address: string
): string | undefined {
  if (!network.explorerUrl) return undefined;
  const baseUrl = network.explorerUrl.replace(/\/+$/, '');
  const segment = EXPLORER_ADDRESS_PATH[network.ecosystem] ?? 'address';
  return `${baseUrl}/${segment}/${address}`;
}

/**
 * Create a `resolveExplorerUrl` callback for components that need to
 * look up explorer URLs by (address, networkId) pair.
 *
 * @param getNetwork - Lookup function that resolves a NetworkConfig by ID
 */
export function createResolveExplorerUrl(
  getNetwork: (networkId: string) => NetworkConfig | undefined
): (address: string, networkId?: string) => string | undefined {
  return (address: string, networkId?: string) => {
    if (!networkId) return undefined;
    const net = getNetwork(networkId);
    if (!net) return undefined;
    return buildExplorerAddressUrl(net, address);
  };
}

/**
 * Resolve the address placeholder for a given network from ecosystem metadata.
 */
export function getAddressPlaceholder(network: NetworkConfig): string {
  return ECOSYSTEM_METADATA[network.ecosystem as DemoEcosystem]?.addressExample ?? '0x...';
}

/**
 * Resolve the address placeholder for the currently active runtime.
 */
export function getRuntimeAddressPlaceholder(runtime: DemoRuntime | null): string {
  if (!runtime) return '0x...';
  return (
    ECOSYSTEM_METADATA[runtime.networkConfig.ecosystem as DemoEcosystem]?.addressExample ?? '0x...'
  );
}

/**
 * Resolve a runtime for a given NetworkConfig.
 */
export async function resolveRuntime(network: NetworkConfig): Promise<DemoRuntime> {
  return getRuntime(network);
}

/**
 * Resolve the addressing capability for a given network.
 */
export async function resolveAddressing(
  network: NetworkConfig
): Promise<AddressingCapability | undefined> {
  const runtime = await getRuntime(network);
  return runtime.addressing;
}
