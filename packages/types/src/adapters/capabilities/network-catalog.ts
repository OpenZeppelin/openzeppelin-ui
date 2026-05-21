import type { NetworkConfig } from '../../networks';

/**
 * **Tier 1** — Discovery of networks supported by the adapter / ecosystem.
 *
 * Does not extend `RuntimeCapability`.
 */
export interface NetworkCatalogCapability {
  /**
   * Returns all networks this adapter can target.
   *
   * @returns Stable list of {@link NetworkConfig} entries (typically mirrors
   * `EcosystemExport.networks` but may be filtered for UI).
   */
  getNetworks(): NetworkConfig[];
}
