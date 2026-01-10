/**
 * Ecosystem Provider for the Demo App
 *
 * Provides global state management for the active blockchain ecosystem,
 * network selection, and adapter instance using REAL adapters from
 * @openzeppelin/ui-builder-adapter-* packages.
 */

import { useCallback, useMemo, useState } from 'react';

import type { NetworkConfig } from '@openzeppelin/ui-types';

import {
  createAdapter,
  getDefaultNetwork,
  getEcosystemMetadata,
  getNetworksForEcosystem,
  getSampleAddresses,
  type DemoEcosystem,
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
 * Provider component that manages ecosystem state and provides
 * real adapter instances to the application.
 */
export function EcosystemProvider({
  children,
  initialEcosystem = 'evm',
}: EcosystemProviderProps): React.ReactElement {
  // State for active ecosystem
  const [ecosystem, setEcosystemState] = useState<DemoEcosystem>(initialEcosystem);

  // State for selected network (defaults to ecosystem's default network)
  const [network, setNetworkState] = useState<NetworkConfig>(() =>
    getDefaultNetwork(initialEcosystem)
  );

  // Get metadata and available networks for current ecosystem
  const metadata = useMemo(() => getEcosystemMetadata(ecosystem), [ecosystem]);
  const availableNetworks = useMemo(() => getNetworksForEcosystem(ecosystem), [ecosystem]);
  const sampleAddresses = useMemo(() => getSampleAddresses(ecosystem), [ecosystem]);

  // Create adapter for current network
  // The adapter is cached internally by createAdapter
  const adapter = useMemo(() => createAdapter(network), [network]);

  // Handler to change ecosystem - also updates network to new ecosystem's default
  const setEcosystem = useCallback((newEcosystem: DemoEcosystem) => {
    setEcosystemState(newEcosystem);
    setNetworkState(getDefaultNetwork(newEcosystem));
  }, []);

  // Handler to change network
  const setNetwork = useCallback(
    (newNetwork: NetworkConfig) => {
      // If network belongs to a different ecosystem, switch ecosystem too
      if (newNetwork.ecosystem !== ecosystem) {
        setEcosystemState(newNetwork.ecosystem as DemoEcosystem);
      }
      setNetworkState(newNetwork);
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
    ]
  );

  return <EcosystemContext.Provider value={value}>{children}</EcosystemContext.Provider>;
}
