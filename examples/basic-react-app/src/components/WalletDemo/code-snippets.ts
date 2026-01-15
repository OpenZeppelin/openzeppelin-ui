/**
 * Code snippets for documentation sections in the WalletDemo.
 * These are displayed in CodeBlock components to explain the architecture.
 */

export const ARCHITECTURE_OVERVIEW_CODE = `// The wallet architecture follows a three-layer pattern:
// 1. Adapters - Ecosystem-specific implementations (EVM, Stellar)
// 2. Facade Hooks - Unified React hooks across all ecosystems
// 3. UI Components - Adapter-provided wallet UI components

import { AdapterProvider, WalletStateProvider } from '@openzeppelin/ui-react';

// Provider hierarchy (top to bottom):
<AdapterProvider resolveAdapter={resolveAdapter}>
  <WalletStateProvider
    initialNetworkId={networkId}
    getNetworkConfigById={getNetworkConfigById}
    loadConfigModule={loadAppConfigModule}
  >
    <YourApp />
  </WalletStateProvider>
</AdapterProvider>`;

export const ADAPTER_PATTERN_CODE = `// Adapters are ecosystem-specific implementations that provide:
// 1. Network configuration and validation
// 2. Wallet UI components (ConnectButton, AccountDisplay, etc.)
// 3. React hooks for wallet state (facade hooks)
// 4. UI kit management (RainbowKit, custom, etc.)

import { EvmAdapter } from '@openzeppelin/ui-builder-adapter-evm';
import { StellarAdapter } from '@openzeppelin/ui-builder-adapter-stellar';

// Adapters are created based on network ecosystem
async function resolveAdapter(networkConfig: NetworkConfig): Promise<ContractAdapter> {
  switch (networkConfig.ecosystem) {
    case 'evm':
      return new EvmAdapter(networkConfig);
    case 'stellar':
      return new StellarAdapter(networkConfig);
    default:
      throw new Error(\`Unsupported ecosystem: \${networkConfig.ecosystem}\`);
  }
}`;

export const FACADE_HOOKS_CODE = `// Facade hooks provide a unified API across all ecosystems
// They abstract away ecosystem-specific wallet libraries (wagmi, stellar-wallets-kit)

import {
  useDerivedAccountStatus,    // Connection state, address, chainId
  useDerivedConnectStatus,    // Connection progress, errors
  useDerivedChainInfo,        // Current chain details
  useDerivedSwitchChainStatus,// Network switching capabilities
  useDerivedDisconnect,       // Disconnect functionality
  useWalletState,             // Full wallet state + reconfigure
} from '@openzeppelin/ui-react';

// Example usage in your component:
function MyWalletInfo() {
  const { isConnected, address, chainId } = useDerivedAccountStatus();
  const { isConnecting, error } = useDerivedConnectStatus();
  const { switchChain, isSwitching } = useDerivedSwitchChainStatus();

  if (!isConnected) return <p>Please connect your wallet</p>;
  return <p>Connected: {address} on chain {chainId}</p>;
}`;

export const WALLET_COMPONENTS_CODE = `// WalletConnectionUI renders adapter-provided components
// It automatically adapts to the active adapter and UI kit

import { WalletConnectionUI } from '@openzeppelin/ui-react';

// The component retrieves wallet UI from the active adapter:
// - ConnectButton: Wallet connection trigger
// - AccountDisplay: Shows connected account info
// - NetworkSwitcher: Allows network switching

function MyApp() {
  return (
    <div>
      <WalletConnectionUI className="justify-center" />
    </div>
  );
}

// Under the hood, it calls:
const components = activeAdapter.getEcosystemWalletComponents();
// Returns: { ConnectButton, AccountDisplay, NetworkSwitcher }`;

export const UI_KIT_SWITCHING_CODE = `// UI kits can be switched at runtime without page reload
// This provides the same behavior as UI Builder

import { useWalletState } from '@openzeppelin/ui-react';

function KitSwitcher() {
  const { activeAdapter, reconfigureActiveAdapterUiKit } = useWalletState();
  const [kits, setKits] = useState<AvailableUiKit[]>([]);

  useEffect(() => {
    // Get available kits from the adapter
    activeAdapter?.getAvailableUiKits().then(setKits);
  }, [activeAdapter]);

  return (
    <select onChange={(e) => {
      // Switch kit without losing connection state
      reconfigureActiveAdapterUiKit({ kitName: e.target.value });
    }}>
      {kits.map(kit => (
        <option key={kit.id} value={kit.id}>{kit.name}</option>
      ))}
    </select>
  );
}`;

export const STATE_MANAGEMENT_CODE = `// State is managed using Zustand for persistence across remounts
// This is critical because kit provider changes cause React remounts

import { create } from 'zustand';

// The ecosystem store manages:
// - Current ecosystem (evm, stellar)
// - Selected network configuration
// - Adapter instance (cached)
// - Selected UI kit name

const useEcosystemStore = create<EcosystemStore>((set, get) => ({
  ecosystem: 'evm',
  network: null,
  adapter: null,
  selectedKitName: null,
  
  setEcosystem: async (newEcosystem) => {
    // Load adapter lazily when ecosystem changes
    const adapter = await createAdapter(newEcosystem);
    set({ ecosystem: newEcosystem, adapter });
  },
}));

// WalletStateProvider bridges Zustand with React context
// ensuring state survives provider remounts`;

/**
 * Code snippet explaining the custom kit configuration options.
 */
export const CUSTOM_KIT_EXPLANATION_CODE = `// The "custom" kit is a minimal wallet integration that uses wagmi directly.
// It does NOT require a native config file, but supports runtime configuration.

// ============================================================
// AVAILABLE CONFIGURATION OPTIONS
// ============================================================

// You can exclude specific wallet UI components:
const config: Partial<UiKitConfiguration> = {
  kitName: 'custom',
  kitConfig: {
    components: {
      // Exclude any combination of these components:
      exclude: [
        'NetworkSwitcher',  // Hide network switching UI
        'AccountDisplay',   // Hide connected account display
        'ConnectButton',    // Hide connect button (rare)
      ]
    }
  }
};

// Apply configuration at runtime:
const { reconfigureActiveAdapterUiKit } = useWalletState();
reconfigureActiveAdapterUiKit(config);

// ============================================================
// EXAMPLE: Hide only the NetworkSwitcher
// ============================================================

reconfigureActiveAdapterUiKit({
  kitName: 'custom',
  kitConfig: {
    components: {
      exclude: ['NetworkSwitcher']
    }
  }
});

// ============================================================
// AVAILABLE COMPONENTS
// ============================================================
// The custom kit provides these components by default:
// - ConnectButton: Triggers wallet connection modal
// - AccountDisplay: Shows connected address and balance
// - NetworkSwitcher: Allows switching between networks`;

/**
 * Code snippet showing how to use the custom kit programmatically.
 */
export const CUSTOM_KIT_USAGE_CODE = `// Using the custom kit with wagmi hooks directly:
import { useAccount, useConnect, useDisconnect } from 'wagmi';

function CustomWalletUI() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div>
        <span>{address}</span>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    );
  }

  return (
    <div>
      {connectors.map((connector) => (
        <button key={connector.id} onClick={() => connect({ connector })}>
          {connector.name}
        </button>
      ))}
    </div>
  );
}`;
