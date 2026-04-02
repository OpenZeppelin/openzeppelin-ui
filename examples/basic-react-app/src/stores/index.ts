/**
 * Stores Index
 *
 * Re-exports all Zustand stores for convenient imports.
 */

export {
  useEcosystemStore,
  useCurrentEcosystem,
  useCurrentNetwork,
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

export {
  useUiStore,
  useWalletDemoTab,
  useSetWalletDemoTab,
  type UiActions,
  type UiState,
  type UiStore,
  type WalletDemoTab,
} from './uiStore';
