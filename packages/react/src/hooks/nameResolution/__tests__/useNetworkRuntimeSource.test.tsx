/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';

import type { EcosystemRuntime, NetworkConfig } from '@openzeppelin/ui-types';

import { RuntimeContext } from '../../AdapterContext';
import { useNetworkRuntimeSource } from '../useNetworkRuntimeSource';

const SEPOLIA_NETWORK = { id: 'eip155:11155111', name: 'Sepolia' } as NetworkConfig;

describe('useNetworkRuntimeSource', () => {
  it('returns empty networkId when network is null', () => {
    const { result } = renderHook(() => useNetworkRuntimeSource(null));

    expect(result.current).toEqual({
      runtime: null,
      networkId: '',
      isRuntimeLoading: false,
    });
  });

  it('preserves network.id when RuntimeContext is absent', () => {
    const { result } = renderHook(() => useNetworkRuntimeSource(SEPOLIA_NETWORK));

    expect(result.current).toEqual({
      runtime: null,
      networkId: SEPOLIA_NETWORK.id,
      isRuntimeLoading: false,
    });
  });

  it('loads runtime from RuntimeContext when mounted', () => {
    const runtime = { networkConfig: SEPOLIA_NETWORK } as EcosystemRuntime;
    const getRuntimeForNetwork = vi.fn(() => ({ runtime, isLoading: true }));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeContext.Provider value={{ getRuntimeForNetwork }}>{children}</RuntimeContext.Provider>
    );

    const { result } = renderHook(() => useNetworkRuntimeSource(SEPOLIA_NETWORK), { wrapper });

    expect(getRuntimeForNetwork).toHaveBeenCalledWith(SEPOLIA_NETWORK);
    expect(result.current).toEqual({
      runtime,
      networkId: SEPOLIA_NETWORK.id,
      isRuntimeLoading: true,
    });
  });
});
