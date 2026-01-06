import {
  NetworkArbitrumOne,
  NetworkBase,
  NetworkEthereum,
  NetworkPolygonPos,
} from '@web3icons/react';
import { Loader2, Network as NetworkIconLucide } from 'lucide-react';
import { useState } from 'react';

import { NetworkIcon, NetworkSelector, NetworkStatusBadge } from '@openzeppelin/ui-components';
import type { EvmNetworkConfig, MidnightNetworkConfig } from '@openzeppelin/ui-types';

import { DemoSection } from './DemoSection';

/**
 * Sample EVM network configurations for demonstration
 */
const SAMPLE_NETWORKS: EvmNetworkConfig[] = [
  {
    id: 'eth-mainnet',
    name: 'Ethereum',
    ecosystem: 'evm',
    network: 'ethereum',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    type: 'mainnet',
    isTestnet: false,
    exportConstName: 'ethereumMainnet',
    iconComponent: NetworkEthereum,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  {
    id: 'eth-sepolia',
    name: 'Sepolia',
    ecosystem: 'evm',
    network: 'ethereum',
    chainId: 11155111,
    rpcUrl: 'https://sepolia.llamarpc.com',
    type: 'testnet',
    isTestnet: true,
    exportConstName: 'ethereumSepolia',
    iconComponent: NetworkEthereum,
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  },
  {
    id: 'polygon-mainnet',
    name: 'Polygon',
    ecosystem: 'evm',
    network: 'polygon',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    type: 'mainnet',
    isTestnet: false,
    exportConstName: 'polygonMainnet',
    iconComponent: NetworkPolygonPos,
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  },
  {
    id: 'arbitrum-mainnet',
    name: 'Arbitrum One',
    ecosystem: 'evm',
    network: 'arbitrum',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    type: 'mainnet',
    isTestnet: false,
    exportConstName: 'arbitrumMainnet',
    iconComponent: NetworkArbitrumOne,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  {
    id: 'base-mainnet',
    name: 'Base',
    ecosystem: 'evm',
    network: 'base',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    type: 'mainnet',
    isTestnet: false,
    exportConstName: 'baseMainnet',
    iconComponent: NetworkBase,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
];

/**
 * Midnight network config for demonstrating different ecosystem
 */
const MIDNIGHT_NETWORK: MidnightNetworkConfig = {
  id: 'midnight-devnet',
  name: 'Devnet',
  ecosystem: 'midnight',
  network: 'midnight',
  type: 'devnet',
  isTestnet: true,
  exportConstName: 'midnightDevnet',
  networkId: { 2: 'TestNet' },
};

/**
 * Union type for demo networks
 */
type DemoNetwork = EvmNetworkConfig | MidnightNetworkConfig;

/**
 * All networks including midnight for demonstration
 */
const ALL_NETWORKS: DemoNetwork[] = [...SAMPLE_NETWORKS, MIDNIGHT_NETWORK];

/**
 * Demonstrates Network-related components: NetworkIcon, NetworkSelector, NetworkStatusBadge
 */
export function NetworkDemo(): React.ReactElement {
  const [selectedNetwork, setSelectedNetwork] = useState<DemoNetwork | null>(SAMPLE_NETWORKS[0]);
  const [groupedSelectedNetwork, setGroupedSelectedNetwork] = useState<DemoNetwork | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Simulate loading state for network switching
  const handleNetworkChange = (network: DemoNetwork) => {
    setIsLoading(true);
    setTimeout(() => {
      setSelectedNetwork(network);
      setIsLoading(false);
    }, 800);
  };

  // Get chain ID only for EVM networks
  const getChainId = (network: DemoNetwork | null): number | null => {
    if (network && network.ecosystem === 'evm') {
      return network.chainId;
    }
    return null;
  };

  return (
    <DemoSection
      title="Network Components"
      description="A set of components for displaying and selecting blockchain networks. Includes NetworkIcon for displaying network logos, NetworkSelector for choosing networks, and NetworkStatusBadge for showing current network state."
      codeExample={`import { NetworkIcon, NetworkSelector, NetworkStatusBadge } from '@openzeppelin/ui-components';
import type { EvmNetworkConfig } from '@openzeppelin/ui-types';

// Network icon
<NetworkIcon network={network} size={24} />

// Network selector
<NetworkSelector
  networks={networks}
  selectedNetwork={selected}
  onSelectNetwork={setSelected}
  getNetworkLabel={(n) => n.name}
  getNetworkId={(n) => n.id}
/>

// Network status badge
<NetworkStatusBadge network={network} />`}
    >
      {/* NetworkIcon */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">NetworkIcon</h3>
        <p className="text-muted-foreground text-sm">
          Displays the appropriate icon for a blockchain network. Falls back to a placeholder when
          no custom icon is defined.
        </p>
        <div className="flex flex-wrap items-center gap-6">
          {ALL_NETWORKS.map((network) => (
            <div key={network.id} className="flex flex-col items-center gap-2">
              <NetworkIcon network={network} size={32} />
              <span className="text-muted-foreground text-xs">{network.name}</span>
            </div>
          ))}
        </div>

        {/* Size Variations */}
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">Size variations</p>
          <div className="flex items-end gap-6">
            <div className="flex flex-col items-center gap-2">
              <NetworkIcon network={SAMPLE_NETWORKS[0]} size={16} />
              <span className="text-muted-foreground text-xs">16px</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <NetworkIcon network={SAMPLE_NETWORKS[0]} size={24} />
              <span className="text-muted-foreground text-xs">24px</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <NetworkIcon network={SAMPLE_NETWORKS[0]} size={32} />
              <span className="text-muted-foreground text-xs">32px</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <NetworkIcon network={SAMPLE_NETWORKS[0]} size={48} />
              <span className="text-muted-foreground text-xs">48px</span>
            </div>
          </div>
        </div>
      </div>

      {/* NetworkSelector */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">NetworkSelector</h3>
        <p className="text-muted-foreground text-sm">
          A searchable dropdown for selecting blockchain networks with optional grouping by
          ecosystem.
        </p>

        <div className="grid max-w-md gap-6">
          {/* Basic Selector */}
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Basic selector</p>
            <NetworkSelector
              networks={SAMPLE_NETWORKS}
              selectedNetwork={selectedNetwork as EvmNetworkConfig | null}
              onSelectNetwork={handleNetworkChange}
              getNetworkLabel={(n) => n.name}
              getNetworkId={(n) => n.id}
              getNetworkIcon={(n) => <NetworkIcon network={n} size={16} />}
              getNetworkType={(n) => n.type}
            />
          </div>

          {/* With Loading State */}
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              With loading state{' '}
              {isLoading && <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />}
            </p>
            <div className="text-muted-foreground text-xs">
              Selected: {selectedNetwork?.name || 'None'}
              {isLoading && ' (switching...)'}
            </div>
          </div>

          {/* Grouped by Ecosystem */}
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Grouped by ecosystem</p>
            <NetworkSelector
              networks={ALL_NETWORKS}
              selectedNetwork={groupedSelectedNetwork}
              onSelectNetwork={setGroupedSelectedNetwork}
              getNetworkLabel={(n) => n.name}
              getNetworkId={(n) => n.id}
              getNetworkIcon={(n) => <NetworkIcon network={n} size={16} />}
              getNetworkType={(n) => n.type}
              groupByEcosystem
              getEcosystem={(n) => n.ecosystem.toUpperCase()}
              placeholder="Select a network..."
            />
          </div>

          {/* With Custom Placeholder */}
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">With custom placeholder</p>
            <NetworkSelector
              networks={SAMPLE_NETWORKS}
              selectedNetwork={null}
              onSelectNetwork={() => {}}
              getNetworkLabel={(n) => n.name}
              getNetworkId={(n) => n.id}
              getNetworkIcon={(n) => <NetworkIcon network={n} size={16} />}
              placeholder="Choose your network..."
            />
          </div>
        </div>
      </div>

      {/* NetworkStatusBadge */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">NetworkStatusBadge</h3>
        <p className="text-muted-foreground text-sm">
          Displays network information in a compact badge format with ecosystem and network name.
          Testnet and devnet networks are shown with a dashed border.
        </p>

        <div className="flex flex-wrap gap-4">
          {ALL_NETWORKS.map((network) => (
            <NetworkStatusBadge key={network.id} network={network} />
          ))}
        </div>

        {/* Mainnet vs Testnet Styling */}
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">Mainnet vs Testnet styling</p>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground w-20 text-xs">Mainnet:</span>
              <NetworkStatusBadge network={SAMPLE_NETWORKS[0]} />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground w-20 text-xs">Testnet:</span>
              <NetworkStatusBadge network={SAMPLE_NETWORKS[1]} />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground w-20 text-xs">Devnet:</span>
              <NetworkStatusBadge network={MIDNIGHT_NETWORK} />
            </div>
          </div>
        </div>
      </div>

      {/* In Context */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">In Context</h3>

        {/* Header Example */}
        <div className="rounded-lg border">
          <div className="bg-muted/30 flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-3">
              <NetworkIconLucide className="h-5 w-5" />
              <span className="font-medium">My DApp</span>
            </div>
            <div className="flex items-center gap-4">
              <NetworkStatusBadge network={selectedNetwork} />
              <div className="bg-muted rounded-full px-3 py-1 text-xs">0x742d...1D3F4</div>
            </div>
          </div>
          <div className="p-4">
            <p className="text-muted-foreground text-sm">Application content area</p>
          </div>
        </div>

        {/* Settings Panel Example */}
        <div className="max-w-md rounded-lg border p-4">
          <h4 className="mb-4 font-medium">Network Settings</h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Network</label>
              <NetworkSelector
                networks={SAMPLE_NETWORKS}
                selectedNetwork={selectedNetwork as EvmNetworkConfig | null}
                onSelectNetwork={handleNetworkChange}
                getNetworkLabel={(n) => n.name}
                getNetworkId={(n) => n.id}
                getNetworkIcon={(n) => <NetworkIcon network={n} size={16} />}
                getNetworkType={(n) => n.type}
              />
            </div>
            <div className="text-muted-foreground text-xs">
              Current Chain ID: {getChainId(selectedNetwork) ?? 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </DemoSection>
  );
}
