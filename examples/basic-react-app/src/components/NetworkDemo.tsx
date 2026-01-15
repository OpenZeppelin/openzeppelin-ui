import { Loader2, Network as NetworkIconLucide } from 'lucide-react';
import { useState } from 'react';

import { NetworkIcon, NetworkSelector, NetworkStatusBadge } from '@openzeppelin/ui-components';
import type { NetworkConfig } from '@openzeppelin/ui-types';

import { useEcosystem } from '../context';
import { DemoSection } from './DemoSection';
import { EcosystemSwitcher } from './EcosystemSwitcher';

/**
 * Demonstrates Network-related components: NetworkIcon, NetworkSelector, NetworkStatusBadge
 * Now ecosystem-aware - networks change based on selected ecosystem.
 */
export function NetworkDemo(): React.ReactElement {
  const { metadata, isLoading: ecosystemLoading } = useEcosystem();
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get networks from the current ecosystem
  const networks = metadata?.networks ?? [];
  const defaultNetwork = metadata?.defaultNetwork ?? null;

  // Use selected network or fall back to default
  const currentNetwork = selectedNetwork ?? defaultNetwork;

  // Simulate loading state for network switching
  const handleNetworkChange = (network: NetworkConfig) => {
    setIsLoading(true);
    setTimeout(() => {
      setSelectedNetwork(network);
      setIsLoading(false);
    }, 800);
  };

  // Get chain ID for EVM networks, or network ID info for others
  const getNetworkIdentifier = (network: NetworkConfig | null): string => {
    if (!network) return 'N/A';
    if (network.ecosystem === 'evm' && 'chainId' in network) {
      return `Chain ID: ${network.chainId}`;
    }
    if (network.ecosystem === 'stellar') {
      return `Network: ${network.type}`;
    }
    return `ID: ${network.id}`;
  };

  if (ecosystemLoading || !metadata) {
    return (
      <DemoSection title="Network Components" description="Loading ecosystem data...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DemoSection>
    );
  }

  return (
    <DemoSection
      title="Network Components"
      description={`Network components for ${metadata.name}. Switch ecosystems to see different networks. Currently showing ${networks.length} ${metadata.name} networks.`}
      codeExample={`import { NetworkIcon, NetworkSelector, NetworkStatusBadge } from '@openzeppelin/ui-components';
import type { NetworkConfig } from '@openzeppelin/ui-types';

// Network icon - works with any ecosystem
<NetworkIcon network={network} size={24} />

// Network selector - adapts to ecosystem networks
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
      {/* Ecosystem Switcher */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Current Ecosystem</h3>
        <p className="text-muted-foreground text-sm">
          Switch ecosystems to see how network components adapt. Networks, icons, and selectors all
          change based on the active ecosystem.
        </p>
        <div className="flex items-center gap-4">
          <EcosystemSwitcher />
          <span className="text-muted-foreground text-sm">
            {networks.length} networks available
          </span>
        </div>
      </div>

      {/* NetworkIcon */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">NetworkIcon</h3>
        <p className="text-muted-foreground text-sm">
          Displays the appropriate icon for a blockchain network. Icons are ecosystem-specific.
        </p>
        <div className="flex flex-wrap items-center gap-6">
          {networks.slice(0, 6).map((network) => (
            <div key={network.id} className="flex flex-col items-center gap-2">
              <NetworkIcon network={network} size={32} />
              <span className="text-muted-foreground text-xs">{network.name}</span>
            </div>
          ))}
          {networks.length > 6 && (
            <div className="text-muted-foreground text-sm">+{networks.length - 6} more</div>
          )}
        </div>

        {/* Size Variations */}
        {networks.length > 0 && (
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Size variations</p>
            <div className="flex items-end gap-6">
              {[16, 24, 32, 48].map((size) => (
                <div key={size} className="flex flex-col items-center gap-2">
                  <NetworkIcon network={networks[0]} size={size} />
                  <span className="text-muted-foreground text-xs">{size}px</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* NetworkSelector */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">NetworkSelector</h3>
        <p className="text-muted-foreground text-sm">
          A searchable dropdown for selecting blockchain networks. Automatically populated with{' '}
          {metadata.name} networks.
        </p>

        <div className="grid max-w-md gap-6">
          {/* Basic Selector */}
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">{metadata.name} Network Selector</p>
            <NetworkSelector
              networks={networks}
              selectedNetwork={currentNetwork}
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
              Selection State{' '}
              {isLoading && <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />}
            </p>
            <div className="text-muted-foreground text-xs">
              Selected: {currentNetwork?.name || 'None'}
              {isLoading && ' (switching...)'}
            </div>
          </div>

          {/* Grouped by Type */}
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Grouped by network type</p>
            <NetworkSelector
              networks={networks}
              selectedNetwork={null}
              onSelectNetwork={() => {}}
              getNetworkLabel={(n) => n.name}
              getNetworkId={(n) => n.id}
              getNetworkIcon={(n) => <NetworkIcon network={n} size={16} />}
              getNetworkType={(n) => n.type}
              groupByEcosystem
              getEcosystem={(n) => (n.isTestnet ? 'Testnets' : 'Mainnets')}
              placeholder="Select a network..."
            />
          </div>
        </div>
      </div>

      {/* NetworkStatusBadge */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">NetworkStatusBadge</h3>
        <p className="text-muted-foreground text-sm">
          Displays network information in a compact badge format. Testnet networks are shown with a
          dashed border.
        </p>

        <div className="flex flex-wrap gap-4">
          {networks.slice(0, 6).map((network) => (
            <NetworkStatusBadge key={network.id} network={network} />
          ))}
        </div>

        {/* Mainnet vs Testnet Styling */}
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">Mainnet vs Testnet styling</p>
          <div className="flex flex-col gap-3">
            {networks
              .filter((n) => !n.isTestnet)
              .slice(0, 1)
              .map((network) => (
                <div key={network.id} className="flex items-center gap-4">
                  <span className="text-muted-foreground w-20 text-xs">Mainnet:</span>
                  <NetworkStatusBadge network={network} />
                </div>
              ))}
            {networks
              .filter((n) => n.isTestnet)
              .slice(0, 1)
              .map((network) => (
                <div key={network.id} className="flex items-center gap-4">
                  <span className="text-muted-foreground w-20 text-xs">Testnet:</span>
                  <NetworkStatusBadge network={network} />
                </div>
              ))}
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
              <span className="font-medium">My {metadata.name} DApp</span>
            </div>
            <div className="flex items-center gap-4">
              <NetworkStatusBadge network={currentNetwork} />
              <div className="bg-muted rounded-full px-3 py-1 text-xs font-mono">
                {metadata.name === 'EVM' ? '0x742d...1d3f4' : 'GBZX...MADI'}
              </div>
            </div>
          </div>
          <div className="p-4">
            <p className="text-muted-foreground text-sm">Application content area</p>
          </div>
        </div>

        {/* Settings Panel Example */}
        <div className="max-w-md rounded-lg border p-4">
          <h4 className="mb-4 font-medium">{metadata.name} Network Settings</h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Network</label>
              <NetworkSelector
                networks={networks}
                selectedNetwork={currentNetwork}
                onSelectNetwork={handleNetworkChange}
                getNetworkLabel={(n) => n.name}
                getNetworkId={(n) => n.id}
                getNetworkIcon={(n) => <NetworkIcon network={n} size={16} />}
                getNetworkType={(n) => n.type}
              />
            </div>
            <div className="text-muted-foreground text-xs">
              {getNetworkIdentifier(currentNetwork)}
            </div>
          </div>
        </div>
      </div>
    </DemoSection>
  );
}
