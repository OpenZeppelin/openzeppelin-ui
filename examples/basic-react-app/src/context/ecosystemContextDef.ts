/**
 * Ecosystem Context Definition
 */

import { createContext } from 'react';

import type { ContractAdapter, NetworkConfig } from '@openzeppelin/ui-types';

import type { DemoEcosystem, EcosystemMetadata } from '../core/ecosystemManager';

// ============================================================================
// Context Types
// ============================================================================

export interface EcosystemContextValue {
  /** Currently active ecosystem */
  ecosystem: DemoEcosystem;
  /** Set the active ecosystem */
  setEcosystem: (ecosystem: DemoEcosystem) => void;

  /** Currently selected network */
  network: NetworkConfig;
  /** Set the active network */
  setNetwork: (network: NetworkConfig) => void;

  /** Available networks for the current ecosystem */
  availableNetworks: NetworkConfig[];

  /** The active adapter instance for the current network */
  adapter: ContractAdapter;

  /** Metadata for the current ecosystem */
  metadata: EcosystemMetadata;

  /** Sample addresses for the current ecosystem */
  sampleAddresses: Record<string, string>;
}

// ============================================================================
// Context
// ============================================================================

export const EcosystemContext = createContext<EcosystemContextValue | null>(null);
