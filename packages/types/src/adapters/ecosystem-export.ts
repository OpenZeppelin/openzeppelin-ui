/**
 * Standardized ecosystem export interface.
 *
 * Each adapter package exports a single `ecosystemDefinition` conforming to
 * this shape, making adapters self-describing. Consumers discover ecosystem
 * metadata, networks, and the adapter factory from the module directly —
 * no hardcoded registries or convention-based export-name lookups required.
 *
 * Display-only fields are inherited from {@link EcosystemMetadata}, which
 * adapters also export separately via a lightweight `/metadata` entry point.
 */

import type { NetworkConfig } from '../networks';
import type { ContractAdapter } from './base';
import type { AdapterConfig } from './config';
import type { EcosystemMetadata } from './ecosystem-metadata';

export interface EcosystemExport extends EcosystemMetadata {
  /** All networks supported by this adapter */
  networks: NetworkConfig[];

  /** Factory that creates an adapter instance for a given network config */
  createAdapter: (config: NetworkConfig) => ContractAdapter;

  /** Dependency and build configuration (used by ui-builder for scaffolding) */
  adapterConfig?: AdapterConfig;
}
