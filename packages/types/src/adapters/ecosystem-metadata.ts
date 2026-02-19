/**
 * Lightweight ecosystem display metadata.
 *
 * This is the display-only subset of {@link EcosystemExport}. Adapter packages
 * export an `ecosystemMetadata` object from a dedicated `/metadata` entry point
 * so consumers can load icon + display data without pulling in the heavy adapter
 * runtime (wallet SDKs, chain clients, etc.).
 */

import type { Ecosystem, EcosystemFeatureConfig } from '../common/ecosystem';

export interface EcosystemMetadata {
  /** Unique ecosystem identifier */
  id: Ecosystem;

  /** Human-readable display name (e.g. "Ethereum (EVM)") */
  name: string;

  /** Description of the ecosystem */
  description: string;

  /** Explorer/verification platform guidance (e.g. "Etherscan verified contracts") */
  explorerGuidance: string;

  /** Address format example (e.g. "0x...") */
  addressExample?: string;

  /** Branded icon component for the ecosystem */
  iconComponent?: React.ComponentType<{
    size?: number;
    className?: string;
    variant?: 'mono' | 'branded';
  }>;

  /** Tailwind background color class for ecosystem-branded UI elements */
  bgColorClass?: string;

  /** Tailwind text color class for ecosystem-branded UI elements */
  textColorClass?: string;

  /**
   * Adapter-declared feature flag defaults. Apps can selectively override
   * individual fields via their own sparse config.
   */
  defaultFeatureConfig: EcosystemFeatureConfig;
}
