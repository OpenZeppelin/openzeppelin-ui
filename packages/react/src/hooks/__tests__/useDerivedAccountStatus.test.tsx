import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDerivedAccountStatus } from '../useDerivedAccountStatus';
import { useWalletState } from '../WalletStateContext';

vi.mock('../WalletStateContext', () => ({
  useWalletState: vi.fn(),
}));

const mockUseWalletState = useWalletState as ReturnType<typeof vi.fn>;

describe('useDerivedAccountStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns default disconnected status when no account hook is available', () => {
    mockUseWalletState.mockReturnValue({
      walletFacadeHooks: null,
    });

    const { result } = renderHook(() => useDerivedAccountStatus());

    expect(result.current).toEqual({
      isConnected: false,
      isConnecting: false,
      isDisconnected: true,
      isReconnecting: false,
      status: 'disconnected',
      address: undefined,
      chainId: undefined,
    });
  });

  it('extracts wagmi account status fields when present', () => {
    mockUseWalletState.mockReturnValue({
      walletFacadeHooks: {
        useAccount: () => ({
          isConnected: false,
          isConnecting: false,
          isDisconnected: false,
          isReconnecting: true,
          status: 'reconnecting',
          address: '0x1234',
          chainId: 1,
        }),
      },
    });

    const { result } = renderHook(() => useDerivedAccountStatus());

    expect(result.current).toEqual({
      isConnected: false,
      isConnecting: false,
      isDisconnected: false,
      isReconnecting: true,
      status: 'reconnecting',
      address: '0x1234',
      chainId: 1,
    });
  });

  it('falls back safely when account hook output is malformed', () => {
    mockUseWalletState.mockReturnValue({
      walletFacadeHooks: {
        useAccount: () => ({
          isConnected: 'yes',
          status: 123,
        }),
      },
    });

    const { result } = renderHook(() => useDerivedAccountStatus());

    expect(result.current).toEqual({
      isConnected: false,
      isConnecting: false,
      isDisconnected: true,
      isReconnecting: false,
      status: 'disconnected',
      address: undefined,
      chainId: undefined,
    });
  });
});
