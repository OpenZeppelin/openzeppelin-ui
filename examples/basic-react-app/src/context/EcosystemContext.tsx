/**
 * Ecosystem Provider for the Demo App
 *
 * Standalone provider for ecosystem state management.
 * Note: In the main app, AppProviders.tsx provides this context using Zustand.
 * This provider is an alternative for simpler use cases.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { NetworkConfig } from '@openzeppelin/ui-types';

import {
  getDefaultNetwork,
  getEcosystemMetadata,
  getNetworksForEcosystem,
  getRuntime,
  getSampleAddresses,
  type DemoEcosystem,
  type EcosystemMetadata,
} from '../core/ecosystemManager';
import {
  toDemoCapabilities,
  type DemoCapabilities,
  type DemoRuntime,
} from '../core/runtimeCapabilities';
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
 * Uses async loading for runtimes (lazy loading pattern).
 */
export function EcosystemProvider({
  children,
  initialEcosystem = 'evm',
}: EcosystemProviderProps): React.ReactElement {
  // State
  const [ecosystem, setEcosystemState] = useState<DemoEcosystem>(initialEcosystem);
  const [network, setNetworkState] = useState<NetworkConfig | null>(null);
  const [runtime, setRuntimeState] = useState<DemoRuntime | null>(null);
  const [capabilities, setCapabilitiesState] = useState<DemoCapabilities | null>(null);
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

        const loadedRuntime = await getRuntime(defaultNetwork);

        if (!mounted) return;

        setMetadataState(loadedMetadata);
        setAvailableNetworksState(loadedNetworks);
        setNetworkState(defaultNetwork);
        setRuntimeState(loadedRuntime);
        setCapabilitiesState(toDemoCapabilities(loadedRuntime));
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
        const loadedRuntime = await getRuntime(newNetwork);

        // If network belongs to a different ecosystem, refresh ecosystem metadata too.
        if (newNetwork.ecosystem !== ecosystem) {
          const nextEcosystem = newNetwork.ecosystem as DemoEcosystem;
          const [loadedMetadata, loadedNetworks] = await Promise.all([
            getEcosystemMetadata(nextEcosystem),
            getNetworksForEcosystem(nextEcosystem),
          ]);

          setEcosystemState(nextEcosystem);
          setMetadataState(loadedMetadata);
          setAvailableNetworksState(loadedNetworks);
        }

        setNetworkState(newNetwork);
        setRuntimeState(loadedRuntime);
        setCapabilitiesState(toDemoCapabilities(loadedRuntime));
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
      runtime,
      capabilities,
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
      runtime,
      capabilities,
      metadata,
      sampleAddresses,
      isLoading,
    ]
  );

  return <EcosystemContext.Provider value={value}>{children}</EcosystemContext.Provider>;
}
