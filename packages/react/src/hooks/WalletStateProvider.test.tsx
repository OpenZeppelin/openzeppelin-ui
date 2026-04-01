import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';

import type {
  EcosystemRuntime,
  EcosystemSpecificReactHooks,
  NetworkConfig,
} from '@openzeppelin/ui-types';

import { RuntimeContext } from './AdapterContext';
import { useWalletState } from './WalletStateContext';
import { WalletStateProvider } from './WalletStateProvider';

function createNetworkConfig(overrides: Partial<NetworkConfig> = {}): NetworkConfig {
  return {
    id: 'ethereum-mainnet',
    name: 'Ethereum Mainnet',
    ecosystem: 'evm',
    network: 'ethereum',
    type: 'mainnet',
    isTestnet: false,
    exportConstName: 'ethereumMainnet',
    chainId: 1,
    rpcUrl: 'https://rpc.example.test',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    ...overrides,
  };
}

function createTrackedProvider(onMount: () => void): React.FC<{ children: React.ReactNode }> {
  const stableOnMount = onMount;
  return function TrackedProvider({ children }: { children: React.ReactNode }) {
    React.useEffect(() => {
      stableOnMount();
    }, []);

    return <>{children}</>;
  };
}

function createRuntime(
  networkConfig: NetworkConfig,
  options: {
    providerComponent?: React.ComponentType<{ children: React.ReactNode }>;
    hooks?: EcosystemSpecificReactHooks;
  } = {}
) {
  const configureUiKit = vi.fn().mockResolvedValue(undefined);
  const runtime = {
    networkConfig,
    dispose: vi.fn(),
    uiKit: {
      configureUiKit,
      getAvailableUiKits: vi.fn().mockResolvedValue([]),
      getEcosystemReactUiContextProvider: vi.fn(() => options.providerComponent),
      getEcosystemReactHooks: vi.fn(() => options.hooks),
    },
  } as unknown as EcosystemRuntime;

  return { runtime, configureUiKit };
}

describe('WalletStateProvider', () => {
  it('initializes the runtime UI kit on first load without explicit overrides', async () => {
    const networkConfig = createNetworkConfig();
    const { runtime, configureUiKit } = createRuntime(networkConfig);
    const getRuntimeForNetwork = vi.fn(() => ({ runtime, isLoading: false }));
    const getNetworkConfigById = vi.fn(async () => networkConfig);
    const loadConfigModule = vi.fn();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeContext.Provider value={{ getRuntimeForNetwork }}>
        <WalletStateProvider
          initialNetworkId={networkConfig.id}
          getNetworkConfigById={getNetworkConfigById}
          loadConfigModule={loadConfigModule}
        >
          {children}
        </WalletStateProvider>
      </RuntimeContext.Provider>
    );

    const { result } = renderHook(() => useWalletState(), { wrapper });

    await waitFor(() => expect(result.current.activeRuntime).toBe(runtime));

    expect(configureUiKit).toHaveBeenCalledTimes(1);
    expect(configureUiKit).toHaveBeenCalledWith({}, { loadUiKitNativeConfig: loadConfigModule });
  });

  it('preserves partial runtime UI kit overrides without forcing a default kit', async () => {
    const networkConfig = createNetworkConfig();
    const { runtime, configureUiKit } = createRuntime(networkConfig);
    const getRuntimeForNetwork = vi.fn(() => ({ runtime, isLoading: false }));
    const getNetworkConfigById = vi.fn(async () => networkConfig);
    const loadConfigModule = vi.fn();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeContext.Provider value={{ getRuntimeForNetwork }}>
        <WalletStateProvider
          initialNetworkId={networkConfig.id}
          getNetworkConfigById={getNetworkConfigById}
          loadConfigModule={loadConfigModule}
        >
          {children}
        </WalletStateProvider>
      </RuntimeContext.Provider>
    );

    const { result } = renderHook(() => useWalletState(), { wrapper });

    await waitFor(() => expect(configureUiKit).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.reconfigureActiveUiKit({
        kitConfig: {
          showInjectedConnector: true,
        },
      });
    });

    await waitFor(() => expect(configureUiKit).toHaveBeenCalledTimes(2));

    expect(configureUiKit).toHaveBeenLastCalledWith(
      {
        kitConfig: {
          showInjectedConnector: true,
        },
      },
      { loadUiKitNativeConfig: loadConfigModule }
    );
  });

  it('keeps the ecosystem wallet provider mounted during same-ecosystem network switches', async () => {
    const ethereumMainnet = createNetworkConfig();
    const ethereumSepolia = createNetworkConfig({
      id: 'ethereum-sepolia',
      name: 'Ethereum Sepolia',
      type: 'testnet',
      isTestnet: true,
      exportConstName: 'ethereumSepolia',
      chainId: 11155111,
    });
    const evmHooks = { useAccount: vi.fn() };
    const onEvmProviderMount = vi.fn();
    const EvmProvider = createTrackedProvider(onEvmProviderMount);
    const { runtime: mainnetRuntime } = createRuntime(ethereumMainnet, {
      providerComponent: EvmProvider,
      hooks: evmHooks,
    });
    const { runtime: sepoliaRuntime } = createRuntime(ethereumSepolia, {
      providerComponent: EvmProvider,
      hooks: evmHooks,
    });
    const runtimesById = {
      [ethereumMainnet.id]: mainnetRuntime,
      [ethereumSepolia.id]: sepoliaRuntime,
    };
    const getRuntimeForNetwork = vi.fn((networkConfig: NetworkConfig) => ({
      runtime: runtimesById[networkConfig.id as keyof typeof runtimesById] ?? null,
      isLoading: false,
    }));
    const getNetworkConfigById = vi.fn(async (networkId: string) =>
      networkId === ethereumMainnet.id ? ethereumMainnet : ethereumSepolia
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeContext.Provider value={{ getRuntimeForNetwork }}>
        <WalletStateProvider
          initialNetworkId={ethereumMainnet.id}
          getNetworkConfigById={getNetworkConfigById}
        >
          {children}
        </WalletStateProvider>
      </RuntimeContext.Provider>
    );

    const { result } = renderHook(() => useWalletState(), { wrapper });

    await waitFor(() => expect(result.current.activeRuntime).toBe(mainnetRuntime));
    await waitFor(() => expect(onEvmProviderMount).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.setActiveNetworkId(ethereumSepolia.id);
    });

    await waitFor(() => expect(result.current.activeRuntime).toBe(sepoliaRuntime));

    expect(result.current.walletFacadeHooks).toBe(evmHooks);
    expect(onEvmProviderMount).toHaveBeenCalledTimes(1);
  });

  it('remounts the provider when switching ecosystems and restores the dormant session later', async () => {
    const ethereumMainnet = createNetworkConfig();
    const stellarTestnet = createNetworkConfig({
      id: 'stellar-testnet',
      name: 'Stellar Testnet',
      ecosystem: 'stellar',
      network: 'stellar',
      type: 'testnet',
      isTestnet: true,
      exportConstName: 'stellarTestnet',
    });
    const evmHooks = { useAccount: vi.fn() };
    const stellarHooks = { useAccount: vi.fn() };
    const onEvmProviderMount = vi.fn();
    const onStellarProviderMount = vi.fn();
    const EvmProvider = createTrackedProvider(onEvmProviderMount);
    const StellarProvider = createTrackedProvider(onStellarProviderMount);
    const { runtime: evmRuntime } = createRuntime(ethereumMainnet, {
      providerComponent: EvmProvider,
      hooks: evmHooks,
    });
    const { runtime: stellarRuntime } = createRuntime(stellarTestnet, {
      providerComponent: StellarProvider,
      hooks: stellarHooks,
    });
    const runtimesById = {
      [ethereumMainnet.id]: evmRuntime,
      [stellarTestnet.id]: stellarRuntime,
    };
    const getRuntimeForNetwork = vi.fn((networkConfig: NetworkConfig) => ({
      runtime: runtimesById[networkConfig.id as keyof typeof runtimesById] ?? null,
      isLoading: false,
    }));
    const getNetworkConfigById = vi.fn(async (networkId: string) =>
      networkId === ethereumMainnet.id ? ethereumMainnet : stellarTestnet
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeContext.Provider value={{ getRuntimeForNetwork }}>
        <WalletStateProvider
          initialNetworkId={ethereumMainnet.id}
          getNetworkConfigById={getNetworkConfigById}
        >
          {children}
        </WalletStateProvider>
      </RuntimeContext.Provider>
    );

    const { result } = renderHook(() => useWalletState(), { wrapper });

    await waitFor(() => expect(result.current.activeRuntime).toBe(evmRuntime));
    await waitFor(() => expect(onEvmProviderMount).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.setActiveNetworkId(stellarTestnet.id);
    });

    await waitFor(() => expect(result.current.activeRuntime).toBe(stellarRuntime));
    await waitFor(() => expect(onStellarProviderMount).toHaveBeenCalledTimes(1));
    expect(result.current.walletFacadeHooks).toBe(stellarHooks);

    act(() => {
      result.current.setActiveNetworkId(ethereumMainnet.id);
    });

    await waitFor(() => expect(result.current.activeRuntime).toBe(evmRuntime));
    await waitFor(() => expect(onEvmProviderMount).toHaveBeenCalledTimes(2));
    expect(result.current.walletFacadeHooks).toBe(evmHooks);
  });
});
