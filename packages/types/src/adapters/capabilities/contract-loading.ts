import type { ProxyInfo } from '../../contracts/proxy';
import type { ContractSchema } from '../../contracts/schema';
import type { FormFieldType } from '../../forms/form-field';
import type { RuntimeCapability } from '../runtime';

/**
 * **Tier 2** — Contract definition loading, ABI resolution, artifact persistence, and export bootstrap.
 *
 * Extends `RuntimeCapability` — requires a bound `NetworkConfig`.
 *
 * @remarks
 * Optional methods use TypeScript optional syntax; adapters omit unsupported features.
 */
export interface ContractLoadingCapability extends RuntimeCapability {
  /**
   * Load a contract schema from an address string or embedded ABI JSON.
   *
   * @param source - Contract address or ABI payload.
   * @returns Parsed {@link ContractSchema}.
   * @throws When the source cannot be resolved for this network.
   */
  loadContract(source: string | Record<string, unknown>): Promise<ContractSchema>;

  /**
   * Load a contract and return provenance metadata (e.g. verification status, proxy info).
   *
   * @param source - Same as {@link ContractLoadingCapability.loadContract}.
   */
  loadContractWithMetadata?(source: string | Record<string, unknown>): Promise<{
    schema: ContractSchema;
    source: 'fetched' | 'manual';
    metadata?: {
      fetchedFrom?: string;
      contractName?: string;
      verificationStatus?: 'verified' | 'unverified' | 'unknown';
      fetchTimestamp?: Date;
      definitionHash?: string;
    };
    proxyInfo?: ProxyInfo;
  }>;

  /**
   * Form fields required to define/import a contract in the builder UI.
   */
  getContractDefinitionInputs(): FormFieldType[];

  /**
   * Optional provider keys the adapter supports for automated ABI fetch (e.g. Etherscan, Sourcify).
   */
  getSupportedContractDefinitionProviders?(): Array<{ key: string; label?: string }>;

  /**
   * Deep comparison of two serialized contract definitions.
   */
  compareContractDefinitions?(
    storedSchema: string,
    freshSchema: string
  ): Promise<{
    identical: boolean;
    differences: Array<{
      type: 'added' | 'removed' | 'modified';
      section: string;
      name: string;
      details: string;
      impact: 'low' | 'medium' | 'high';
      oldSignature?: string;
      newSignature?: string;
    }>;
    severity: 'none' | 'minor' | 'major' | 'breaking';
    summary: string;
  }>;

  /**
   * Structural validation of a serialized contract definition.
   */
  validateContractDefinition?(definition: string): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };

  /**
   * Stable hash for quick equality checks of serialized definitions.
   */
  hashContractDefinition?(definition: string): string;

  /**
   * Hint for when large artifacts should be persisted vs deferred.
   */
  getArtifactPersistencePolicy?():
    | {
        mode: 'immediate' | 'deferredUntilFunctionSelected';
        sizeThresholdBytes?: number;
      }
    | undefined;

  /**
   * Trim or rewrite artifacts when the user selects a target function.
   */
  prepareArtifactsForFunction?(args: {
    functionId: string;
    currentArtifacts: Record<string, unknown>;
    definitionOriginal?: string | null;
  }): Promise<{
    persistableArtifacts?: Record<string, unknown>;
    publicAssets?: Record<string, Uint8Array | Blob>;
    bootstrapSource?: Record<string, unknown>;
  }>;
}
