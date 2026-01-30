import { Loader2, Network as NetworkIconLucide, Settings } from 'lucide-react';
import { useCallback, useState } from 'react';

import {
  Button,
  NetworkIcon,
  NetworkSelector,
  NetworkServiceErrorBanner,
  NetworkStatusBadge,
} from '@openzeppelin/ui-components';
import { NetworkSettingsDialog } from '@openzeppelin/ui-renderer';
import type { NetworkConfig } from '@openzeppelin/ui-types';

import { useEcosystem } from '../context';
import { DemoSection } from './DemoSection';
import { EcosystemSwitcher } from './EcosystemSwitcher';

/**
 * Demonstrates Network-related components: NetworkIcon, NetworkSelector, NetworkStatusBadge,
 * NetworkServiceErrorBanner, and NetworkSettingsDialog.
 * Now ecosystem-aware - networks change based on selected ecosystem.
 */
export function NetworkDemo(): React.ReactElement {
  const { metadata, adapter, isLoading: ecosystemLoading } = useEcosystem();
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [settingsNetworkId, setSettingsNetworkId] = useState<string | null>(null);

  // Get networks from the current ecosystem
  const networks = metadata?.networks ?? [];
  const defaultNetwork = metadata?.defaultNetwork ?? null;

  // Use selected network or fall back to default
  const currentNetwork = selectedNetwork ?? defaultNetwork;

  // Find the network config for the settings dialog
  const settingsNetworkConfig = settingsNetworkId
    ? (networks.find((n) => n.id === settingsNetworkId) ?? null)
    : null;

  // Simulate loading state for network switching
  const handleNetworkChange = (network: NetworkConfig) => {
    setIsLoading(true);
    setTimeout(() => {
      setSelectedNetwork(network);
      setIsLoading(false);
    }, 800);
  };

  // Handler to open network settings dialog - can be triggered from error banners
  const handleOpenNetworkSettings = useCallback((networkId: string) => {
    setSettingsNetworkId(networkId);
    setIsSettingsDialogOpen(true);
  }, []);

  // Handler to close network settings dialog
  const handleCloseNetworkSettings = useCallback(() => {
    setIsSettingsDialogOpen(false);
    setSettingsNetworkId(null);
  }, []);

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
      <DemoSection title="Network Components" description="Loading adapter data...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DemoSection>
    );
  }

  return (
    <DemoSection
      title="Network Components"
      description={`Network components for ${metadata.name}. Switch adapters to see different networks. Currently showing ${networks.length} ${metadata.name} networks.`}
      codeExample={`import { NetworkIcon, NetworkSelector, NetworkServiceErrorBanner, NetworkStatusBadge } from '@openzeppelin/ui-components';
import { NetworkSettingsDialog } from '@openzeppelin/ui-renderer';
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
<NetworkStatusBadge network={network} />

// Network service error banner - for connection failures
// Pass onOpenNetworkSettings to enable the "Configure Settings" button
<NetworkServiceErrorBanner
  networkConfig={network}
  serviceType="rpc"
  errorMessage="Connection timeout after 10000ms."
  onOpenNetworkSettings={(networkId) => openSettingsDialog(networkId)}
/>

// Network settings dialog - adapter-driven service configuration
// The dialog uses adapter.getNetworkServiceForms() to render tabs
<NetworkSettingsDialog
  isOpen={isOpen}
  onOpenChange={setIsOpen}
  networkConfig={network}
  adapter={adapter}
/>`}
    >
      {/* Ecosystem Switcher */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Current Adapter</h3>
        <p className="text-muted-foreground text-sm">
          Switch adapters to see how network components adapt. Networks, icons, and selectors all
          change based on the active adapter.
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

      {/* NetworkSettingsDialog */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">NetworkSettingsDialog</h3>
        <p className="text-muted-foreground text-sm">
          A dialog for configuring network service settings (RPC, Explorer, Indexer endpoints). The
          available tabs and fields are defined by each adapter via{' '}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">getNetworkServiceForms()</code>.
          Settings are persisted locally and take precedence over default configurations.
        </p>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => currentNetwork && handleOpenNetworkSettings(currentNetwork.id)}
              disabled={!currentNetwork}
              variant="outline"
            >
              <Settings className="mr-2 h-4 w-4" />
              Open Network Settings for {currentNetwork?.name || 'No Network'}
            </Button>
          </div>

          <div className="text-muted-foreground text-sm space-y-2">
            <p>
              <strong>How it works:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                Each adapter implements{' '}
                <code className="bg-muted px-1 py-0.5 rounded">getNetworkServiceForms()</code> to
                define configurable services
              </li>
              <li>Services can include RPC endpoints, Block Explorer APIs, Indexers, and more</li>
              <li>The dialog renders dynamic form fields based on the adapter&apos;s schema</li>
              <li>Users can test connections and save custom endpoint configurations</li>
              <li>Saved settings override default endpoints for that network</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Network Settings Dialog Instance */}
      <NetworkSettingsDialog
        isOpen={isSettingsDialogOpen}
        onOpenChange={(open) => !open && handleCloseNetworkSettings()}
        networkConfig={settingsNetworkConfig}
        adapter={adapter ?? null}
      />

      {/* NetworkServiceErrorBanner */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">NetworkServiceErrorBanner</h3>
        <p className="text-muted-foreground text-sm">
          Displays a user-friendly error banner when a network service (RPC, indexer, explorer) is
          unavailable. Click the &ldquo;Configure Settings&rdquo; button to open the network
          settings dialog.
        </p>

        <div className="space-y-4">
          {/* RPC Error Example */}
          {currentNetwork && (
            <NetworkServiceErrorBanner
              networkConfig={currentNetwork}
              serviceType="rpc"
              errorMessage="Connection timeout after 10000ms. The RPC endpoint may be experiencing high traffic."
              onOpenNetworkSettings={handleOpenNetworkSettings}
            />
          )}

          {/* Indexer Error Example */}
          {currentNetwork && (
            <NetworkServiceErrorBanner
              networkConfig={currentNetwork}
              serviceType="indexer"
              title="Indexer Temporarily Unavailable"
              description="Historical data and event queries may be unavailable. Core functionality is not affected."
              onOpenNetworkSettings={handleOpenNetworkSettings}
            />
          )}

          {/* Explorer Error Example */}
          {currentNetwork && (
            <NetworkServiceErrorBanner
              networkConfig={currentNetwork}
              serviceType="explorer"
              errorMessage="The block explorer API is not responding. Contract verification may be unavailable."
              onOpenNetworkSettings={handleOpenNetworkSettings}
            />
          )}
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
              <div className="flex items-center gap-2">
                <NetworkStatusBadge network={currentNetwork} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => currentNetwork && handleOpenNetworkSettings(currentNetwork.id)}
                  disabled={!currentNetwork}
                  title="Network Settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
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
