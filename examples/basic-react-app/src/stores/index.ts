/**
 * Stores Index
 *
 * Re-exports all Zustand stores for convenient imports.
 */

export {
  useEcosystemStore,
  useCurrentEcosystem,
  useCurrentNetwork,
  useCurrentAdapter,
  useEcosystemMetadata,
  useAvailableNetworks,
  useSampleAddresses,
  useEcosystemActions,
  useSelectedKitName,
  useSetSelectedKitName,
  useIsEcosystemLoading,
  useEcosystemError,
  type EcosystemState,
  type EcosystemActions,
  type EcosystemStore,
} from './ecosystemStore';

export { useUiStore, type UiActions, type UiState, type UiStore } from './uiStore';
