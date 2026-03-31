import type { NetworkConfig } from '../networks';

/**
 * Base interface for **Tier 2** and **Tier 3** capabilities.
 *
 * Tier 1 capabilities do not extend this type. Implementations must treat `networkConfig`
 * as immutable; changing networks requires disposing and recreating capabilities.
 *
 * @remarks
 * Standalone Tier 2+ instances returned from adapter factory functions must implement
 * `dispose()` for resource cleanup (FR-018).
 */
export interface RuntimeCapability {
  readonly networkConfig: NetworkConfig;

  /**
   * Releases resources for this capability when used outside a profile `EcosystemRuntime`.
   */
  dispose(): void;
}

/**
 * Live capability bundle for a single network profile. Tier 2/3 entries are present
 * only when the selected profile includes those capabilities.
 *
 * @remarks
 * After `dispose()`, all method and property access on nested capabilities must throw
 * `RuntimeDisposedError`.
 */
export interface EcosystemRuntime {
  readonly networkConfig: NetworkConfig;

  readonly addressing: import('./capabilities/addressing').AddressingCapability;
  readonly explorer: import('./capabilities/explorer').ExplorerCapability;
  readonly networkCatalog: import('./capabilities/network-catalog').NetworkCatalogCapability;
  readonly uiLabels: import('./capabilities/ui-labels').UiLabelsCapability;

  readonly contractLoading?: import('./capabilities/contract-loading').ContractLoadingCapability;
  readonly schema?: import('./capabilities/schema').SchemaCapability;
  readonly typeMapping?: import('./capabilities/type-mapping').TypeMappingCapability;
  readonly query?: import('./capabilities/query').QueryCapability;

  readonly execution?: import('./capabilities/execution').ExecutionCapability;
  readonly wallet?: import('./capabilities/wallet').WalletCapability;
  readonly uiKit?: import('./capabilities/ui-kit').UiKitCapability;
  readonly relayer?: import('./capabilities/relayer').RelayerCapability;
  readonly accessControl?: import('./capabilities/access-control').AccessControlCapability;

  /**
   * Idempotent lifecycle teardown for the composed runtime and shared internal state.
   */
  dispose(): void;
}

/**
 * Registry of per-capability factory functions exposed by an adapter module.
 *
 * @remarks
 * Missing entries mean the adapter does not implement that capability. `createRuntime`
 * must validate required entries for the requested profile and throw
 * `UnsupportedProfileError` when any are missing.
 */
export interface CapabilityFactoryMap {
  addressing?: (config?: NetworkConfig) => import('./capabilities/addressing').AddressingCapability;
  explorer?: (config?: NetworkConfig) => import('./capabilities/explorer').ExplorerCapability;
  networkCatalog?: () => import('./capabilities/network-catalog').NetworkCatalogCapability;
  uiLabels?: () => import('./capabilities/ui-labels').UiLabelsCapability;
  contractLoading?: (
    config: NetworkConfig
  ) => import('./capabilities/contract-loading').ContractLoadingCapability;
  schema?: (config: NetworkConfig) => import('./capabilities/schema').SchemaCapability;
  typeMapping?: (
    config: NetworkConfig
  ) => import('./capabilities/type-mapping').TypeMappingCapability;
  query?: (config: NetworkConfig) => import('./capabilities/query').QueryCapability;
  execution?: (config: NetworkConfig) => import('./capabilities/execution').ExecutionCapability;
  wallet?: (config: NetworkConfig) => import('./capabilities/wallet').WalletCapability;
  uiKit?: (config: NetworkConfig) => import('./capabilities/ui-kit').UiKitCapability;
  relayer?: (config: NetworkConfig) => import('./capabilities/relayer').RelayerCapability;
  accessControl?: (
    config: NetworkConfig
  ) => import('./capabilities/access-control').AccessControlCapability;
}
