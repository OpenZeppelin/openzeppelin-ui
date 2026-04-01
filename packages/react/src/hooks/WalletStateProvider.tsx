import React, { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import type {
  EcosystemReactUiProviderProps,
  EcosystemRuntime,
  EcosystemSpecificReactHooks,
  NativeConfigLoader,
  NetworkConfig,
  UiKitConfiguration,
} from '@openzeppelin/ui-types';
import { logger } from '@openzeppelin/ui-utils';

import { useRuntimeContext } from './useAdapterContext';
import {
  getWalletSession,
  upsertWalletSession,
  type WalletSessionRegistry,
} from './walletSessionRegistry';
import { WalletStateContext, type WalletStateContextValue } from './WalletStateContext';

export interface WalletStateProviderProps {
  children: ReactNode;
  /** Optional initial network ID to set as active when the provider mounts. */
  initialNetworkId?: string | null;
  /** Function to retrieve a NetworkConfig object by its ID. */
  getNetworkConfigById: (
    networkId: string
  ) => Promise<NetworkConfig | null | undefined> | NetworkConfig | null | undefined;
  /**
   * Optional generic function to load configuration modules by relative path.
   * The adapter is responsible for constructing the conventional path (e.g., './config/wallet/[kitName].config').
   * @param relativePath The conventional relative path to the configuration module.
   * @returns A Promise resolving to the configuration object (expected to have a default export) or null.
   */
  loadConfigModule?: NativeConfigLoader;
}

/**
 * Configures the runtime's UI kit capability and returns the ecosystem session artifacts.
 */
async function configureRuntimeUiKit(
  runtime: EcosystemRuntime,
  loadConfigModule?: (relativePath: string) => Promise<Record<string, unknown> | null>,
  programmaticOverrides: Partial<UiKitConfiguration> = {}
): Promise<{
  providerComponent: React.ComponentType<EcosystemReactUiProviderProps> | null;
  hooks: EcosystemSpecificReactHooks | null;
}> {
  const uiKit = runtime.uiKit;
  if (!uiKit) {
    return { providerComponent: null, hooks: null };
  }

  try {
    const hasUiKitOverride = Object.keys(programmaticOverrides).length > 0;

    // Always initialize the runtime UI kit so adapter-managed providers (wagmi, Stellar kit, etc.)
    // can hydrate their internal state from app-config defaults even without explicit overrides.
    if (typeof uiKit.configureUiKit === 'function') {
      const nextUiKitConfig = { ...programmaticOverrides };
      logger.info(
        '[WSP configureRuntimeUiKit]',
        hasUiKitOverride
          ? `Applying explicit UI kit overrides for runtime: ${runtime.networkConfig.id}`
          : `Initializing runtime UI kit from adapter/app defaults for runtime: ${runtime.networkConfig.id}`
      );
      await uiKit.configureUiKit(nextUiKitConfig, {
        loadUiKitNativeConfig: loadConfigModule,
      });
      logger.info(
        '[WSP configureRuntimeUiKit] configureUiKit completed for runtime:',
        runtime.networkConfig.id
      );
    }

    const providerComponent = uiKit.getEcosystemReactUiContextProvider?.() || null;
    const hooks = uiKit.getEcosystemReactHooks?.() || null;

    logger.info('[WSP configureRuntimeUiKit]', 'UI provider and hooks retrieved successfully.');

    return { providerComponent, hooks };
  } catch (error) {
    logger.error('[WSP configureRuntimeUiKit]', 'Error during runtime UI setup:', error);
    throw error; // Re-throw to be handled by caller
  }
}

/**
 * @name WalletStateProvider
 * @description This provider is a central piece of the application's state management for wallet and network interactions.
 * It is responsible for:
 * 1. Managing the globally selected active network ID (`activeNetworkId`).
 * 2. Deriving the full `NetworkConfig` object (`activeNetworkConfig`) for the active network.
 * 3. Fetching and providing the corresponding `EcosystemRuntime` (`activeRuntime`) for the active network,
 *    leveraging the `RuntimeProvider` to ensure runtime singletons.
 * 4. Caching ecosystem-scoped wallet session artifacts (provider roots and facade hooks)
 *    independently from the network-scoped runtime.
 * 5. Rendering the active ecosystem wallet provider (e.g., WagmiProvider for EVM) around its
 *    children, which is essential for the facade hooks to function correctly.
 * 6. Providing a function (`setActiveNetworkId`) to change the globally active network.
 *
 * Consumers use the `useWalletState()` hook to access this global state.
 * It should be placed high in the component tree, inside a `<RuntimeProvider>`.
 */
export function WalletStateProvider({
  children,
  initialNetworkId = null,
  getNetworkConfigById,
  loadConfigModule,
}: WalletStateProviderProps) {
  // State for the ID of the globally selected network.
  const [currentGlobalNetworkId, setCurrentGlobalNetworkIdState] = useState<string | null>(
    initialNetworkId
  );
  // State for the full NetworkConfig object of the globally selected network.
  const [currentGlobalNetworkConfig, setCurrentGlobalNetworkConfig] =
    useState<NetworkConfig | null>(null);

  // State for the active EcosystemRuntime corresponding to the currentGlobalNetworkConfig.
  const [globalActiveRuntime, setGlobalActiveRuntime] = useState<EcosystemRuntime | null>(null);
  // Loading state for the globalActiveRuntime.
  const [isGlobalRuntimeLoading, setIsGlobalRuntimeLoading] = useState<boolean>(false);
  // Cache one wallet provider/hooks pair per ecosystem so same-ecosystem network switches do not
  // remount the wallet provider. The active runtime remains network-scoped and disposable.
  const [walletSessionRegistry, setWalletSessionRegistry] = useState<WalletSessionRegistry>({});
  const [activeWalletSessionEcosystem, setActiveWalletSessionEcosystem] = useState<string | null>(
    null
  );

  // New state to act as a manual trigger for re-configuring the UI kit.
  const [uiKitConfigVersion, setUiKitConfigVersion] = useState(0);
  // State to hold programmatic overrides for the next reconfiguration.
  const [programmaticUiKitConfig, setProgrammaticUiKitConfig] = useState<
    Partial<UiKitConfiguration> | undefined
  >(undefined);

  // Consume RuntimeContext to get the function for fetching runtime instances.
  const { getRuntimeForNetwork } = useRuntimeContext();

  // Effect to derive the full NetworkConfig object when currentGlobalNetworkId changes.
  useEffect(() => {
    const abortController = new AbortController();

    async function fetchNetworkConfig() {
      if (!currentGlobalNetworkId) {
        // If currentGlobalNetworkId is null, clear the config.
        if (!abortController.signal.aborted) {
          setCurrentGlobalNetworkConfig(null);
        }
        return;
      }

      try {
        const config = await Promise.resolve(getNetworkConfigById(currentGlobalNetworkId));
        if (!abortController.signal.aborted) {
          setCurrentGlobalNetworkConfig(config || null);
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          logger.error('[WSP fetchNetworkConfig]', 'Failed to fetch network config:', error);
          setCurrentGlobalNetworkConfig(null);
        }
      }
    }

    void fetchNetworkConfig();
    return () => abortController.abort();
  }, [currentGlobalNetworkId, getNetworkConfigById]);

  // Effect to load the active runtime and its UI capabilities when currentGlobalNetworkConfig changes.
  useEffect(() => {
    const abortController = new AbortController();

    async function loadRuntimeAndConfigureUi() {
      if (!currentGlobalNetworkConfig) {
        // No network config - clear everything
        if (!abortController.signal.aborted) {
          setGlobalActiveRuntime(null);
          setIsGlobalRuntimeLoading(false);
          setActiveWalletSessionEcosystem(null);
        }
        return;
      }

      const { runtime: newRuntime, isLoading: newIsLoading } = getRuntimeForNetwork(
        currentGlobalNetworkConfig
      ) as { runtime: EcosystemRuntime | null; isLoading: boolean };

      if (abortController.signal.aborted) return;

      // Update loading state immediately, but defer exposing the new runtime
      // until its UI provider and hooks are configured to avoid mismatch renders.
      setIsGlobalRuntimeLoading(newIsLoading);

      if (newRuntime && !newIsLoading) {
        try {
          const { providerComponent, hooks } = await configureRuntimeUiKit(
            newRuntime,
            loadConfigModule,
            programmaticUiKitConfig
          );

          if (!abortController.signal.aborted) {
            const ecosystem = newRuntime.networkConfig.ecosystem;

            // Cache the latest provider/hooks pair for this ecosystem. When switching between
            // networks inside the same ecosystem, the provider key stays stable and the mounted
            // wallet session survives the runtime replacement underneath it.
            setWalletSessionRegistry((prevRegistry) =>
              upsertWalletSession(prevRegistry, {
                ecosystem,
                lastConfiguredNetworkId: newRuntime.networkConfig.id,
                providerComponent,
                hooks,
              })
            );
            setGlobalActiveRuntime(newRuntime);
            setActiveWalletSessionEcosystem(ecosystem);
          }
        } catch (error) {
          if (!abortController.signal.aborted) {
            logger.error(
              '[WSP loadRuntimeAndConfigureUi]',
              'Error during runtime UI setup:',
              error
            );
          }
        }
      } else if (!newRuntime && !newIsLoading) {
        // Runtime is null and not loading, clear active runtime and visible session selection.
        if (!abortController.signal.aborted) {
          setGlobalActiveRuntime(null);
          setActiveWalletSessionEcosystem(null);
        }
      }
      // If newIsLoading is true, retain the active wallet session so same-ecosystem switches do
      // not tear down the connected provider while the target runtime is still loading.
    }

    void loadRuntimeAndConfigureUi();
    return () => abortController.abort();
  }, [
    currentGlobalNetworkConfig,
    getRuntimeForNetwork,
    loadConfigModule,
    uiKitConfigVersion,
    programmaticUiKitConfig,
  ]);

  /**
   * Callback to set the globally active network ID.
   * Also clears dependent states if the network ID is cleared.
   */
  const setActiveNetworkIdCallback = useCallback((networkId: string | null) => {
    logger.info('WalletStateProvider', `Setting global network ID to: ${networkId}`);
    setCurrentGlobalNetworkIdState(networkId); // This will trigger the fetchNetworkConfig effect.
    if (!networkId) {
      // If clearing the network, proactively clear downstream states.
      // The effects above will also clear them, but this is more immediate.
      setCurrentGlobalNetworkConfig(null);
      setGlobalActiveRuntime(null);
      setIsGlobalRuntimeLoading(false);
      setActiveWalletSessionEcosystem(null);
    }
  }, []); // Empty dependency array as it only uses setters from useState.

  /**
   * Callback to explicitly trigger a re-configuration of the active runtime's UI kit.
   * This is useful when a UI kit setting changes (e.g., via a wizard) without a network change.
   */
  const reconfigureActiveUiKit = useCallback(
    (uiKitConfig?: Partial<UiKitConfiguration>) => {
      logger.info(
        'WalletStateProvider',
        'Explicitly triggering UI kit re-configuration by bumping version.',
        uiKitConfig
      );
      setProgrammaticUiKitConfig(uiKitConfig);
      setUiKitConfigVersion((v) => v + 1);
    },
    [setProgrammaticUiKitConfig, setUiKitConfigVersion]
  );

  const activeWalletSession = useMemo(
    () => getWalletSession(walletSessionRegistry, activeWalletSessionEcosystem),
    [walletSessionRegistry, activeWalletSessionEcosystem]
  );

  const walletFacadeHooks: EcosystemSpecificReactHooks | null = activeWalletSession?.hooks ?? null;

  // The context value exposes the active network-scoped runtime and the active ecosystem-scoped
  // wallet session hooks. Consumers continue to access the same public fields.
  const contextValue = useMemo<WalletStateContextValue>(
    () => ({
      activeNetworkId: currentGlobalNetworkId,
      setActiveNetworkId: setActiveNetworkIdCallback,
      activeNetworkConfig: currentGlobalNetworkConfig,
      activeRuntime: globalActiveRuntime,
      isRuntimeLoading: isGlobalRuntimeLoading,
      walletFacadeHooks,
      reconfigureActiveUiKit,
    }),
    [
      currentGlobalNetworkId,
      setActiveNetworkIdCallback,
      currentGlobalNetworkConfig,
      globalActiveRuntime,
      isGlobalRuntimeLoading,
      walletFacadeHooks,
      reconfigureActiveUiKit,
    ]
  );

  const ActualProviderToRender = activeWalletSession?.providerComponent ?? null;
  let childrenToRender: ReactNode;

  if (ActualProviderToRender) {
    // Key the provider by ecosystem instead of network so same-ecosystem network switches keep
    // the wallet provider mounted. Switching ecosystems still remounts the provider cleanly.
    const key = activeWalletSessionEcosystem || 'unknown';

    // Runtime-provided UI roots manage their own configuration internally via the UI kit capability.
    logger.debug(
      '[WSP RENDER]',
      'Rendering runtime-provided UI context provider:',
      ActualProviderToRender.displayName || ActualProviderToRender.name || 'UnknownComponent',
      'with key:',
      key
    );
    childrenToRender = <ActualProviderToRender key={key}>{children}</ActualProviderToRender>;
  } else {
    logger.debug(
      '[WSP RENDER]',
      'No runtime UI context provider to render. Rendering direct children.'
    );
    childrenToRender = children;
  }

  return (
    <WalletStateContext.Provider value={contextValue}>
      {childrenToRender}
    </WalletStateContext.Provider>
  );
}
