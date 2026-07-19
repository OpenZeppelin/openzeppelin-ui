/**
 * Application Providers
 *
 * This module provides the core providers for the application following the
 * UI Builder pattern. It integrates:
 * - RuntimeProvider: Manages runtime instances per network
 * - WalletStateProvider: Manages global wallet/network state
 * - EcosystemProvider: Demo-specific ecosystem context for UI elements
 *
 * LAZY LOADING: Runtimes are loaded on-demand via ecosystemManager.
 * State is managed using Zustand which persists across component remounts.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  AddressLabelProvider,
  AddressSuggestionProvider,
  NameResolverProvider,
} from '@openzeppelin/ui-components';
import {
  RuntimeProvider,
  useRuntimeNameResolver,
  useWalletState,
  WalletStateProvider,
} from '@openzeppelin/ui-react';
import { useAliasLabelResolver, useAliasSuggestionResolver } from '@openzeppelin/ui-storage';
import type {
  CreateRuntimeOptions,
  NativeConfigLoader,
  NetworkConfig,
} from '@openzeppelin/ui-types';

import { EcosystemContext, type EcosystemContextValue } from '../context/ecosystemContextDef';
import {
  MainnetL1FallbackOptInContext,
  type MainnetL1FallbackOptInContextValue,
} from '../context/mainnetL1FallbackOptInContext';
import { demoDb } from '../core/demoDb';
import { getNetworkById, getRuntime, type DemoEcosystem } from '../core/ecosystemManager';
import { toDemoCapabilities, type DemoRuntime } from '../core/runtimeCapabilities';
import { useEcosystemStore } from '../stores';

// ============================================================================
// Config Module Loading (for RainbowKit and other wallet kits)
// ============================================================================

/**
 * Use Vite's import.meta.glob to discover all kit config files.
 * These follow the convention: ./config/wallet/[kitName].config.ts
 */
const kitConfigImporters = import.meta.glob('./config/wallet/*.config.ts');

// Also check the config folder structure used in this app
const kitConfigImportersAlt = import.meta.glob('../config/wallet/*.config.ts');

/**
 * Loads a native configuration module for a wallet kit (e.g., RainbowKit).
 * The runtime calls this when configuring the UI kit, passing a conventional path.
 *
 * @param relativePath - The conventional path like './config/wallet/rainbowkit.config.ts'
 * @returns The configuration object or null if not found
 */
const loadAppConfigModule: NativeConfigLoader = async (relativePath: string) => {
  // Try both path patterns since the actual file location may differ
  const importerToCall = kitConfigImporters[relativePath] || kitConfigImportersAlt[relativePath];

  // Also try without the leading './'
  const altPath = relativePath.startsWith('./') ? relativePath.slice(2) : relativePath;
  const altImporter = kitConfigImporters[`./${altPath}`] || kitConfigImportersAlt[`../${altPath}`];

  const finalImporter = importerToCall || altImporter;

  if (finalImporter) {
    try {
      const module = (await finalImporter()) as { default?: Record<string, unknown> } & Record<
        string,
        unknown
      >;
      return module.default || module;
    } catch {
      return null;
    }
  }

  return null;
};

// ============================================================================
// Types
// ============================================================================

interface AppProvidersProps {
  children: React.ReactNode;
  /** Initial ecosystem (defaults to 'evm') */
  initialEcosystem?: DemoEcosystem;
}

// ============================================================================
// Inner Provider Component (has access to WalletStateProvider)
// ============================================================================

interface EcosystemProviderInnerProps {
  children: React.ReactNode;
}

/**
 * Inner component that bridges EcosystemContext with WalletStateProvider.
 * This must be rendered inside WalletStateProvider to access setActiveNetworkId.
 *
 * Uses Zustand store for ecosystem state - state persists across remounts.
 */
function EcosystemProviderInner({ children }: EcosystemProviderInnerProps): React.ReactElement {
  const { activeRuntime, isRuntimeLoading, setActiveNetworkId } = useWalletState();

  // Get state and actions from Zustand store
  // State persists even when this component remounts
  const {
    ecosystem,
    setEcosystem,
    network,
    setNetwork,
    availableNetworks,
    metadata,
    sampleAddresses,
    isLoading,
  } = useEcosystemStore();

  // Sync network changes with WalletStateProvider
  // Use ref to store the callback to avoid dependency issues
  const setActiveNetworkIdRef = useRef(setActiveNetworkId);
  setActiveNetworkIdRef.current = setActiveNetworkId;

  // Track if this is the initial mount
  const isInitialMount = useRef(true);

  // Sync network changes with WalletStateProvider via useEffect
  // This ensures Zustand state is committed before triggering external updates
  useEffect(() => {
    // Skip the initial mount - we don't want to trigger on first render
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    // Notify WalletStateProvider about the network change after state is committed
    if (network?.id) {
      setActiveNetworkIdRef.current?.(network.id);
    }
  }, [network?.id]);

  const matchingRuntime =
    network?.id && activeRuntime?.networkConfig.id === network.id
      ? (activeRuntime as DemoRuntime)
      : null;
  const capabilities = useMemo(() => toDemoCapabilities(matchingRuntime), [matchingRuntime]);
  const isRuntimePending = Boolean(network?.id && (!matchingRuntime || isRuntimeLoading));

  // Memoized context value for EcosystemContext
  // This bridges the Zustand store to the React context for components
  // that use the useEcosystem() hook
  const ecosystemContextValue = useMemo<EcosystemContextValue>(
    () => ({
      ecosystem,
      setEcosystem,
      network,
      setNetwork,
      availableNetworks,
      runtime: matchingRuntime,
      capabilities,
      metadata,
      sampleAddresses,
      isLoading: isLoading || isRuntimePending,
    }),
    [
      ecosystem,
      setEcosystem,
      network,
      setNetwork,
      availableNetworks,
      matchingRuntime,
      capabilities,
      metadata,
      sampleAddresses,
      isLoading,
      isRuntimePending,
    ]
  );

  return (
    <EcosystemContext.Provider value={ecosystemContextValue}>
      <NameResolverBridge>
        <AliasProviderBridge networkId={network?.id}>{children}</AliasProviderBridge>
      </NameResolverBridge>
    </EcosystemContext.Provider>
  );
}

// ============================================================================
// Alias Provider Bridge (bridges alias storage into ui-components contexts)
// ============================================================================

/**
 * Wraps children with AddressLabelProvider and AddressSuggestionProvider
 * so that all AddressDisplay and AddressField instances across the app
 * automatically resolve aliases from the shared demo database.
 */
function AliasProviderBridge({
  children,
  networkId,
}: {
  children: React.ReactNode;
  networkId?: string;
}): React.ReactElement {
  const labelResolver = useAliasLabelResolver(demoDb, { networkId });
  const suggestionResolver = useAliasSuggestionResolver(demoDb);

  return (
    <AddressLabelProvider {...labelResolver}>
      <AddressSuggestionProvider {...suggestionResolver}>{children}</AddressSuggestionProvider>
    </AddressLabelProvider>
  );
}

// ============================================================================
// Name Resolver Bridge (ambient forward ENS resolution for AddressField)
// ============================================================================

/**
 * Projects the active runtime's name-resolution capability into the
 * `NameResolverProvider` seam, so every base `AddressField` in the app resolves
 * typed names (e.g. `vitalik.eth`) inline with zero call-site wiring. On
 * runtimes without the capability the resolver is empty and fields behave
 * exactly as before.
 */
function NameResolverBridge({ children }: { children: React.ReactNode }): React.ReactElement {
  const resolver = useRuntimeNameResolver();
  // Mirror TransactionForm: wire active network into the provider so
  // `isChainScopeMismatch` can gate coinType wrong-chain submits. Omitting
  // these leaves the gate permanently off for every AddressField in the app.
  const { activeNetworkId, activeNetworkConfig } = useWalletState();
  return (
    <NameResolverProvider
      {...resolver}
      activeNetworkId={activeNetworkId ?? null}
      activeNetworkName={activeNetworkConfig?.name}
    >
      {children}
    </NameResolverProvider>
  );
}

// ============================================================================
// Main Provider Component
// ============================================================================

/**
 * AppProviders Component
 *
 * Wraps the application with all necessary providers for:
 * 1. Runtime management (RuntimeProvider from ui-react)
 * 2. Wallet state management (WalletStateProvider from ui-react)
 * 3. Demo ecosystem context (EcosystemContext for UI demos)
 *
 * This setup allows seamless runtime switching between:
 * - Different blockchain ecosystems (EVM, Stellar, etc.)
 * - Different networks within each ecosystem
 * - Different wallet kits (RainbowKit, custom, etc.)
 *
 * State Management:
 * - Uses Zustand store (recommended for production)
 * - State persists across component remounts
 * - Matches the UI Builder's state management pattern
 */
export function AppProviders({
  children,
  initialEcosystem: _initialEcosystem = 'evm',
}: AppProvidersProps): React.ReactElement {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initialNetworkId, setInitialNetworkId] = useState<string | null>(null);
  const [enableMainnetL1MissFallback, setEnableMainnetL1MissFallback] = useState(true);

  // Integrator reference: pass the third `createRuntime` arg only when opted in.
  // RuntimeProvider flushes cached runtimes when this identity changes, so forward
  // and reverse resolution re-run immediately after toggling.
  const runtimeCreationOptions = useMemo((): CreateRuntimeOptions | undefined => {
    if (!enableMainnetL1MissFallback) {
      return undefined;
    }
    return { nameResolution: { enableMainnetL1MissFallback: true } };
  }, [enableMainnetL1MissFallback]);

  const resolveRuntime = useCallback(
    (networkConfig: NetworkConfig) => getRuntime(networkConfig, runtimeCreationOptions),
    [runtimeCreationOptions]
  );

  const mainnetL1FallbackOptIn = useMemo<MainnetL1FallbackOptInContextValue>(
    () => ({
      enabled: enableMainnetL1MissFallback,
      setEnabled: setEnableMainnetL1MissFallback,
    }),
    [enableMainnetL1MissFallback]
  );

  // Initialize the ecosystem store on mount
  const initialize = useEcosystemStore((s) => s.initialize);
  const storeNetwork = useEcosystemStore((s) => s.network);
  const storeError = useEcosystemStore((s) => s.error);

  useEffect(() => {
    let mounted = true;

    async function init() {
      await initialize();
      if (mounted) {
        setIsInitialized(true);
      }
    }

    void init();

    return () => {
      mounted = false;
    };
  }, [initialize]);

  // Set initial network ID once store is initialized
  useEffect(() => {
    if (isInitialized && storeNetwork && !initialNetworkId) {
      setInitialNetworkId(storeNetwork.id);
    }
  }, [isInitialized, storeNetwork, initialNetworkId]);

  // Memoized network lookup function
  const getNetworkConfigById = useCallback(async (id: string) => {
    return getNetworkById(id);
  }, []);

  // Show loading state while initializing
  if (storeError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-xl text-center">
          <p className="text-sm font-medium text-destructive">
            Failed to initialize the example app
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{storeError}</p>
        </div>
      </div>
    );
  }

  if (!isInitialized || !initialNetworkId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <MainnetL1FallbackOptInContext.Provider value={mainnetL1FallbackOptIn}>
      <RuntimeProvider resolveRuntime={resolveRuntime}>
        <WalletStateProvider
          initialNetworkId={initialNetworkId}
          getNetworkConfigById={getNetworkConfigById}
          loadConfigModule={loadAppConfigModule}
        >
          <EcosystemProviderInner>{children}</EcosystemProviderInner>
        </WalletStateProvider>
      </RuntimeProvider>
    </MainnetL1FallbackOptInContext.Provider>
  );
}

export default AppProviders;
