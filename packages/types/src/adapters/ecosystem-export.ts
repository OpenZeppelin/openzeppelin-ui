/**
 * Standardized ecosystem export interface.
 *
 * Each adapter package exports a single `ecosystemDefinition` conforming to
 * this shape, making adapters self-describing. Consumers discover ecosystem
 * metadata, networks, capability factories, and profile runtimes from the module.
 */

import type { ProfileName } from './profiles/profile-name';

import type { NetworkConfig } from '../networks';
import type { AdapterConfig } from './config';
import type { EcosystemMetadata } from './ecosystem-metadata';
import type { AdapterExportBootstrap, AdapterExportContext } from './export';
import type { CapabilityFactoryMap, EcosystemRuntime } from './runtime';
import type { CreateRuntimeOptions } from './runtime-options';

export interface EcosystemExport extends EcosystemMetadata {
  /** All networks supported by this adapter */
  networks: NetworkConfig[];

  /** Per-capability factory functions; missing keys mean unsupported capabilities */
  capabilities: CapabilityFactoryMap;

  /**
   * Compose a profile-scoped runtime for a network. Implementations throw
   * `UnsupportedProfileError` when required capabilities are absent, and `TypeError`
   * when `profile` is not a valid `ProfileName`.
   *
   * @param profile - One of the five supported profile identifiers.
   * @param config - Target network configuration.
   * @param options - Runtime creation options ({@link CreateRuntimeOptions}).
   */
  createRuntime: (
    profile: ProfileName,
    config: NetworkConfig,
    options?: CreateRuntimeOptions
  ) => EcosystemRuntime;

  /**
   * Optional build-time hook for exported apps that need adapter-specific
   * bootstrap files or initialization snippets.
   */
  getExportBootstrapFiles?: (
    context: AdapterExportContext
  ) => Promise<AdapterExportBootstrap | null>;

  /** Dependency and build configuration (used by ui-builder for scaffolding) */
  adapterConfig?: AdapterConfig;
}
