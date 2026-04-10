/**
 * Code snippets for documentation sections in the WalletDemo.
 * These are displayed in CodeBlock components to explain wallet-specific functionality.
 */

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

export const WALLET_COMPONENTS_CODE = `// WalletConnectionUI renders runtime-provided components
// It automatically adapts to the active runtime and UI kit

import { WalletConnectionUI } from '@openzeppelin/ui-react';

// The component retrieves wallet UI from the active runtime:
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
const components = activeRuntime?.uiKit?.getEcosystemWalletComponents?.();
// Returns: { ConnectButton, AccountDisplay, NetworkSwitcher }`;

export const UI_KIT_SWITCHING_CODE = `// UI kits can be switched at runtime without page reload
// Available in profiles with the UiKit capability (Transactor, Composer, Operator)

import { useWalletState } from '@openzeppelin/ui-react';

function KitSwitcher() {
  const { activeRuntime, reconfigureActiveUiKit } = useWalletState();
  const [kits, setKits] = useState<AvailableUiKit[]>([]);

  useEffect(() => {
    // Get available kits from the runtime's UI kit capability
    activeRuntime?.uiKit?.getAvailableUiKits().then(setKits);
  }, [activeRuntime]);

  return (
    <select onChange={(e) => {
      // Switch kit without losing connection state
      reconfigureActiveUiKit({ kitName: e.target.value });
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
// - Active network selection
// - Selected UI kit name

const useEcosystemStore = create<EcosystemStore>((set, get) => ({
  ecosystem: 'evm',
  network: null,
  selectedKitName: null,
  
  setEcosystem: async (newEcosystem) => {
    // Update metadata + network selection when ecosystems change
    const defaultNetwork = await getDefaultNetwork(newEcosystem);
    set({ ecosystem: newEcosystem, network: defaultNetwork });
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
const { reconfigureActiveUiKit } = useWalletState();
reconfigureActiveUiKit(config);

// ============================================================
// EXAMPLE: Hide only the NetworkSwitcher
// ============================================================

reconfigureActiveUiKit({
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

// ============================================================
// Stellar Wallets Kit Code Snippets
// ============================================================

/**
 * Code snippet explaining the Stellar Wallets Kit configuration.
 */
export const STELLAR_WALLETS_KIT_EXPLANATION_CODE = `// The Stellar Wallets Kit provides a built-in wallet selection modal
// with support for multiple Stellar wallets out of the box.
//
// SUPPORTED WALLETS:
// - Freighter (browser extension)
// - xBull (browser extension)
// - Lobstr (mobile via WalletConnect)
// - Albedo (web-based)
// - And more...
//
// CONFIGURATION:
// Unlike RainbowKit, the Stellar Wallets Kit uses its own built-in UI
// and does not require a separate config file. The runtime automatically
// initializes it with the current network (testnet/mainnet).
//
// The kit's modal UI is opened automatically when clicking "Connect Wallet"
// and handles the entire wallet selection and connection flow.`;

/**
 * Code snippet showing how the Stellar Wallets Kit works under the hood.
 */
export const STELLAR_WALLETS_KIT_USAGE_CODE = `// The runtime initializes the Stellar Wallets Kit internally:
import { StellarWalletsKit, WalletNetwork, allowAllModules } from '@creit.tech/stellar-wallets-kit';

// Kit is created with all wallet modules enabled
const kit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET, // or WalletNetwork.PUBLIC for mainnet
  modules: allowAllModules(),     // Enables all supported wallets
});

// When the user clicks "Connect Wallet", the kit opens its modal:
await kit.openModal({
  onWalletSelected: async (option) => {
    // User selected a wallet - kit handles connection
    kit.setWallet(option.id);
    const { address } = await kit.getAddress();
    console.log('Connected:', address);
  },
});

// For transaction signing, the runtime uses the kit internally:
const signedXdr = await kit.signTransaction(transactionXdr);`;

// ============================================================
// Customization API Code Snippets
// ============================================================

export const WALLET_CONNECTION_UI_EXAMPLE = `import { WalletConnectionUI } from '@openzeppelin/ui-react';

// Standard usage with customization
<WalletConnectionUI
  className="justify-center"
  connectButtonProps={{
    size: "lg",
    variant: "outline",
    fullWidth: true,
    className: "font-semibold"
  }}
  accountDisplayProps={{
    size: "lg",
    variant: "ghost"
  }}
  networkSwitcherProps={{
    size: "lg"
  }}
/>`;

export const USE_WALLET_COMPONENTS_SIGNATURE = `function useWalletComponents(): EcosystemWalletComponents | null

// Returns:
interface EcosystemWalletComponents {
  ConnectButton?: React.ComponentType<BaseComponentProps>;
  AccountDisplay?: React.ComponentType<BaseComponentProps>;
  NetworkSwitcher?: React.ComponentType<BaseComponentProps>;
}`;

export const USE_WALLET_COMPONENTS_EXAMPLE = `import { useDerivedAccountStatus, useWalletComponents } from '@openzeppelin/ui-react';

function CustomWalletSection() {
  const walletComponents = useWalletComponents();
  const { isConnected } = useDerivedAccountStatus();

  if (!walletComponents) {
    return <p>Loading wallet...</p>;
  }

  const { ConnectButton, NetworkSwitcher, AccountDisplay } = walletComponents;

  // Disconnected state - prominent connect button
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <h4 className="font-semibold text-lg">Connect Your Wallet</h4>
        {ConnectButton && (
          <ConnectButton
            size="xl"
            variant="default"
            className="font-bold shadow-lg"
          />
        )}
      </div>
    );
  }

  // Connected state - rich custom layout
  return (
    <div className="space-y-4">
      {/* Header with gradient background */}
      <div className="rounded-lg bg-gradient-to-r from-primary/10 to-transparent p-4">
        <div className="flex items-center justify-between">
          {/* Styled account display */}
          {AccountDisplay && (
            <AccountDisplay
              size="lg"
              variant="ghost"
              className="font-mono text-primary"
            />
          )}
          {/* Styled network switcher */}
          {NetworkSwitcher && (
            <NetworkSwitcher
              size="default"
              variant="outline"
              className="border-primary/30"
            />
          )}
        </div>
      </div>

      {/* Action row */}
      <div className="flex gap-2">
        {ConnectButton && (
          <ConnectButton size="sm" variant="secondary" className="flex-1" />
        )}
      </div>
    </div>
  );
}`;
