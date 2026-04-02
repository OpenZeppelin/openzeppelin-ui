/**
 * Ecosystem Context Definition
 */

import { createContext } from 'react';

import type { NetworkConfig } from '@openzeppelin/ui-types';

import type { DemoEcosystem, EcosystemMetadata } from '../core/ecosystemManager';
import type { DemoCapabilities, DemoRuntime } from '../core/runtimeCapabilities';

// ============================================================================
// Context Types
// ============================================================================

export interface EcosystemContextValue {
  /** Currently active ecosystem */
  ecosystem: DemoEcosystem;
  /** Set the active ecosystem (async - triggers lazy loading) */
  setEcosystem: (ecosystem: DemoEcosystem) => Promise<void>;

  /** Currently selected network (null while loading) */
  network: NetworkConfig | null;
  /** Set the active network (async - may trigger lazy loading) */
  setNetwork: (network: NetworkConfig) => Promise<void>;

  /** Available networks for the current ecosystem */
  availableNetworks: NetworkConfig[];

  /** The active runtime for the current network (null while loading) */
  runtime: DemoRuntime | null;

  /** Flattened capability bundle used by demo components */
  capabilities: DemoCapabilities | null;

  /** Metadata for the current ecosystem (null while loading) */
  metadata: EcosystemMetadata | null;

  /** Sample addresses for the current ecosystem */
  sampleAddresses: Record<string, string>;

  /** Whether ecosystem data is currently loading */
  isLoading: boolean;
}

// ============================================================================
// Context
// ============================================================================

export const EcosystemContext = createContext<EcosystemContextValue | null>(null);
