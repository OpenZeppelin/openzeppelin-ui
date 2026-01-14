/**
 * Ecosystem State Store (Zustand)
 *
 * This module manages ecosystem and network state using Zustand.
 * Zustand stores state outside of React's component lifecycle, ensuring
 * state survives component remounts (e.g., when WalletStateProvider remounts
 * during network/kit changes).
 *
 * LAZY LOADING: Adapters are loaded on-demand when switching ecosystems.
 * The initial ecosystem (EVM) is loaded at startup, others load when accessed.
 */

import { create } from 'zustand';

import type { ContractAdapter, NetworkConfig } from '@openzeppelin/ui-types';

import {
  createAdapter,
  getDefaultNetwork,
  getEcosystemMetadata,
  getNetworkById,
  getNetworksForEcosystem,
  getSampleAddresses,
  type DemoEcosystem,
  type EcosystemMetadata,
} from '../core/ecosystemManager';

// ============================================================================
// Store Types
// ============================================================================

export interface EcosystemState {
  /** Current ecosystem (e.g., 'evm', 'stellar') */
  ecosystem: DemoEcosystem;

  /** Currently selected network configuration (null while loading) */
  network: NetworkConfig | null;

  /** Cached adapter instance for current network (null while loading) */
  adapter: ContractAdapter | null;

  /** Metadata for current ecosystem (null while loading) */
  metadata: EcosystemMetadata | null;

  /** Available networks for current ecosystem */
  availableNetworks: NetworkConfig[];

  /** Sample addresses for current ecosystem (for demo purposes) */
  sampleAddresses: Record<string, string>;

  /**
   * Currently selected wallet UI kit name (e.g., 'custom', 'rainbowkit').
   * Stored here to survive React remounts caused by kit provider changes.
   */
  selectedKitName: string | null;

  /** Whether the ecosystem data is currently loading */
  isLoading: boolean;

  /** Error message if loading failed */
  error: string | null;
}

export interface EcosystemActions {
  /**
   * Change the active ecosystem.
   * This also switches to the default network for that ecosystem.
   * Async - triggers lazy loading of the adapter if not already loaded.
   */
  setEcosystem: (ecosystem: DemoEcosystem) => Promise<void>;

  /**
   * Change the active network.
   * If the network belongs to a different ecosystem, the ecosystem is also switched.
   */
  setNetwork: (network: NetworkConfig) => Promise<void>;

  /**
   * Change network by ID.
   * Useful when you only have the network ID string.
   */
  setNetworkById: (networkId: string) => Promise<void>;

  /**
   * Change the selected wallet UI kit.
   * Stored in Zustand to survive React remounts when kit providers change.
   */
  setSelectedKitName: (kitName: string | null) => void;

  /**
   * Initialize the store with async data loading.
   * Called once on app startup.
   */
  initialize: () => Promise<void>;
}

export type EcosystemStore = EcosystemState & EcosystemActions;

// ============================================================================
// Zustand Store
// ============================================================================

/**
 * The ecosystem store manages all ecosystem/network related state.
 *
 * Key benefits of using Zustand:
 * - State persists across component remounts
 * - No prop drilling needed
 * - Minimal re-renders (components only re-render when their subscribed state changes)
 * - Works seamlessly with React concurrent features
 *
 * Usage:
 * ```tsx
 * // Subscribe to specific state
 * const ecosystem = useEcosystemStore((s) => s.ecosystem);
 * const setEcosystem = useEcosystemStore((s) => s.setEcosystem);
 *
 * // Or get multiple values
 * const { ecosystem, network, setEcosystem } = useEcosystemStore();
 * ```
 */
export const useEcosystemStore = create<EcosystemStore>((set, get) => {
  // Initial state with placeholder values (loading=true)
  const initialEcosystem: DemoEcosystem = 'evm';

  return {
    // Initial state (will be populated by initialize())
    ecosystem: initialEcosystem,
    network: null,
    adapter: null,
    metadata: null,
    availableNetworks: [],
    sampleAddresses: getSampleAddresses(initialEcosystem),
    selectedKitName: null,
    isLoading: true,
    error: null,

    // Initialize - called once on app startup
    initialize: async () => {
      const ecosystem = get().ecosystem;

      try {
        set({ isLoading: true, error: null });

        // Load ecosystem data (this triggers lazy loading of the adapter)
        const [metadata, networks, defaultNetwork] = await Promise.all([
          getEcosystemMetadata(ecosystem),
          getNetworksForEcosystem(ecosystem),
          getDefaultNetwork(ecosystem),
        ]);

        // Create adapter for default network
        const adapter = await createAdapter(defaultNetwork);

        set({
          network: defaultNetwork,
          adapter,
          metadata,
          availableNetworks: networks,
          isLoading: false,
        });
      } catch (error) {
        set({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to initialize ecosystem',
        });
      }
    },

    // Actions
    setEcosystem: async (newEcosystem: DemoEcosystem) => {
      const currentEcosystem = get().ecosystem;

      // Skip if already on this ecosystem
      if (newEcosystem === currentEcosystem) {
        return;
      }

      try {
        set({ isLoading: true, error: null, ecosystem: newEcosystem });

        // Load new ecosystem data (triggers lazy loading)
        const [metadata, networks, defaultNetwork] = await Promise.all([
          getEcosystemMetadata(newEcosystem),
          getNetworksForEcosystem(newEcosystem),
          getDefaultNetwork(newEcosystem),
        ]);

        // Create adapter for default network
        const adapter = await createAdapter(defaultNetwork);

        set({
          network: defaultNetwork,
          adapter,
          metadata,
          availableNetworks: networks,
          sampleAddresses: getSampleAddresses(newEcosystem),
          selectedKitName: null, // Reset kit when changing ecosystems
          isLoading: false,
        });
      } catch (error) {
        set({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to switch ecosystem',
        });
      }
    },

    setNetwork: async (newNetwork: NetworkConfig) => {
      const currentNetwork = get().network;

      // Skip if already on this network
      if (newNetwork.id === currentNetwork?.id) {
        return;
      }

      const newEcosystem = newNetwork.ecosystem as DemoEcosystem;
      const currentEcosystem = get().ecosystem;
      const isEcosystemChange = newEcosystem !== currentEcosystem;

      try {
        set({ isLoading: true, error: null });

        // Create adapter for new network (may trigger lazy loading if new ecosystem)
        const adapter = await createAdapter(newNetwork);

        // If ecosystem changed, load new ecosystem data
        if (isEcosystemChange) {
          const [metadata, networks] = await Promise.all([
            getEcosystemMetadata(newEcosystem),
            getNetworksForEcosystem(newEcosystem),
          ]);

          set({
            ecosystem: newEcosystem,
            network: newNetwork,
            adapter,
            metadata,
            availableNetworks: networks,
            sampleAddresses: getSampleAddresses(newEcosystem),
            selectedKitName: null, // Reset kit when changing ecosystems
            isLoading: false,
          });
        } else {
          set({
            network: newNetwork,
            adapter,
            isLoading: false,
          });
        }
      } catch (error) {
        set({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to switch network',
        });
      }
    },

    setNetworkById: async (networkId: string) => {
      try {
        const network = await getNetworkById(networkId);
        if (network) {
          await get().setNetwork(network);
        }
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to find network',
        });
      }
    },

    setSelectedKitName: (kitName: string | null) => {
      set({ selectedKitName: kitName });
    },
  };
});

// ============================================================================
// Selector Hooks (for convenience and performance)
// ============================================================================

/**
 * Get just the current ecosystem.
 * Component only re-renders when ecosystem changes.
 */
export const useCurrentEcosystem = () => useEcosystemStore((s) => s.ecosystem);

/**
 * Get just the current network.
 * Component only re-renders when network changes.
 */
export const useCurrentNetwork = () => useEcosystemStore((s) => s.network);

/**
 * Get the adapter for the current network.
 * Component only re-renders when adapter changes.
 */
export const useCurrentAdapter = () => useEcosystemStore((s) => s.adapter);

/**
 * Get ecosystem metadata.
 * Component only re-renders when metadata changes.
 */
export const useEcosystemMetadata = () => useEcosystemStore((s) => s.metadata);

/**
 * Get available networks for current ecosystem.
 * Component only re-renders when availableNetworks changes.
 */
export const useAvailableNetworks = () => useEcosystemStore((s) => s.availableNetworks);

/**
 * Get sample addresses for current ecosystem.
 * Component only re-renders when sampleAddresses changes.
 */
export const useSampleAddresses = () => useEcosystemStore((s) => s.sampleAddresses);

/**
 * Get loading state.
 */
export const useIsEcosystemLoading = () => useEcosystemStore((s) => s.isLoading);

/**
 * Get error state.
 */
export const useEcosystemError = () => useEcosystemStore((s) => s.error);

/**
 * Get ecosystem actions (setEcosystem, setNetwork).
 * These are stable references and won't cause re-renders.
 */
export const useEcosystemActions = () =>
  useEcosystemStore((s) => ({
    setEcosystem: s.setEcosystem,
    setNetwork: s.setNetwork,
    setNetworkById: s.setNetworkById,
    setSelectedKitName: s.setSelectedKitName,
    initialize: s.initialize,
  }));

/**
 * Get the currently selected wallet UI kit name.
 * Stored in Zustand to survive React remounts.
 */
export const useSelectedKitName = () => useEcosystemStore((s) => s.selectedKitName);

/**
 * Get kit selection action.
 * This is a stable reference and won't cause re-renders.
 */
export const useSetSelectedKitName = () => useEcosystemStore((s) => s.setSelectedKitName);
