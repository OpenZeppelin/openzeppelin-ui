/**
 * Ecosystem Provider for the Demo App
 *
 * Standalone provider for ecosystem state management.
 * Note: In the main app, AppProviders.tsx provides this context using Zustand.
 * This provider is an alternative for simpler use cases.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ContractAdapter, NetworkConfig } from '@openzeppelin/ui-types';

import {
  createAdapter,
  getDefaultNetwork,
  getEcosystemMetadata,
  getNetworksForEcosystem,
  getSampleAddresses,
  type DemoEcosystem,
  type EcosystemMetadata,
} from '../core/ecosystemManager';
import { EcosystemContext, type EcosystemContextValue } from './ecosystemContextDef';

// ============================================================================
// Provider
// ============================================================================

interface EcosystemProviderProps {
  children: React.ReactNode;
  /** Initial ecosystem (defaults to 'evm') */
  initialEcosystem?: DemoEcosystem;
}

/**
 * Standalone provider component that manages ecosystem state.
 * Uses async loading for adapters (lazy loading pattern).
 */
export function EcosystemProvider({
  children,
  initialEcosystem = 'evm',
}: EcosystemProviderProps): React.ReactElement {
  // State
  const [ecosystem, setEcosystemState] = useState<DemoEcosystem>(initialEcosystem);
  const [network, setNetworkState] = useState<NetworkConfig | null>(null);
  const [adapter, setAdapterState] = useState<ContractAdapter | null>(null);
  const [metadata, setMetadataState] = useState<EcosystemMetadata | null>(null);
  const [availableNetworks, setAvailableNetworksState] = useState<NetworkConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sample addresses (sync, no loading required)
  const sampleAddresses = useMemo(() => getSampleAddresses(ecosystem), [ecosystem]);

  // Load ecosystem data
  useEffect(() => {
    let mounted = true;

    async function loadEcosystemData() {
      setIsLoading(true);

      try {
        const [loadedMetadata, loadedNetworks, defaultNetwork] = await Promise.all([
          getEcosystemMetadata(ecosystem),
          getNetworksForEcosystem(ecosystem),
          getDefaultNetwork(ecosystem),
        ]);

        if (!mounted) return;

        const loadedAdapter = await createAdapter(defaultNetwork);

        if (!mounted) return;

        setMetadataState(loadedMetadata);
        setAvailableNetworksState(loadedNetworks);
        setNetworkState(defaultNetwork);
        setAdapterState(loadedAdapter);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadEcosystemData();

    return () => {
      mounted = false;
    };
  }, [ecosystem]);

  // Handler to change ecosystem
  const setEcosystem = useCallback(async (newEcosystem: DemoEcosystem) => {
    setEcosystemState(newEcosystem);
    // useEffect will handle loading the new ecosystem data
  }, []);

  // Handler to change network
  const setNetwork = useCallback(
    async (newNetwork: NetworkConfig) => {
      setIsLoading(true);

      try {
        // If network belongs to a different ecosystem, switch ecosystem too
        if (newNetwork.ecosystem !== ecosystem) {
          setEcosystemState(newNetwork.ecosystem as DemoEcosystem);
        }

        const newAdapter = await createAdapter(newNetwork);
        setNetworkState(newNetwork);
        setAdapterState(newAdapter);
      } finally {
        setIsLoading(false);
      }
    },
    [ecosystem]
  );

  const value = useMemo<EcosystemContextValue>(
    () => ({
      ecosystem,
      setEcosystem,
      network,
      setNetwork,
      availableNetworks,
      adapter,
      metadata,
      sampleAddresses,
      isLoading,
    }),
    [
      ecosystem,
      setEcosystem,
      network,
      setNetwork,
      availableNetworks,
      adapter,
      metadata,
      sampleAddresses,
      isLoading,
    ]
  );

  return <EcosystemContext.Provider value={value}>{children}</EcosystemContext.Provider>;
}
