import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';

import type { EcosystemRuntime, NetworkConfig } from '@openzeppelin/ui-types';

import { RuntimeContext } from './AdapterContext';
import { useWalletState } from './WalletStateContext';
import { WalletStateProvider } from './WalletStateProvider';

function createNetworkConfig(): NetworkConfig {
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
  };
}

function createRuntime(networkConfig: NetworkConfig) {
  const configureUiKit = vi.fn().mockResolvedValue(undefined);
  const runtime = {
    networkConfig,
    dispose: vi.fn(),
    uiKit: {
      configureUiKit,
      getAvailableUiKits: vi.fn().mockResolvedValue([]),
      getEcosystemReactUiContextProvider: vi.fn(() => undefined),
      getEcosystemReactHooks: vi.fn(() => undefined),
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
});
