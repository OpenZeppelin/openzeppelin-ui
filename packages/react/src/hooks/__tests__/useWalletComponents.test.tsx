import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

import { useWalletComponents } from '../useWalletComponents';
import { useWalletState } from '../WalletStateContext';

// Mock the useWalletState hook
vi.mock('../WalletStateContext', () => ({
  useWalletState: vi.fn(),
}));

const mockUseWalletState = useWalletState as ReturnType<typeof vi.fn>;

// Mock wallet components for testing
const MockConnectButton = () => <button>Connect</button>;
const MockAccountDisplay = () => <div>Account</div>;
const MockNetworkSwitcher = () => <div>Network</div>;

const mockWalletComponents = {
  ConnectButton: MockConnectButton,
  AccountDisplay: MockAccountDisplay,
  NetworkSwitcher: MockNetworkSwitcher,
};

describe('useWalletComponents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('when adapter is null', () => {
    it('should return null when activeAdapter is null', () => {
      mockUseWalletState.mockReturnValue({
        activeAdapter: null,
      });

      const { result } = renderHook(() => useWalletComponents());

      expect(result.current).toBeNull();
    });

    it('should return null when activeAdapter is undefined', () => {
      mockUseWalletState.mockReturnValue({
        activeAdapter: undefined,
      });

      const { result } = renderHook(() => useWalletComponents());

      expect(result.current).toBeNull();
    });
  });

  describe('when getEcosystemWalletComponents is not a function', () => {
    it('should return null when adapter has no getEcosystemWalletComponents', () => {
      mockUseWalletState.mockReturnValue({
        activeAdapter: {},
      });

      const { result } = renderHook(() => useWalletComponents());

      expect(result.current).toBeNull();
    });

    it('should return null when getEcosystemWalletComponents is a non-function value', () => {
      mockUseWalletState.mockReturnValue({
        activeAdapter: {
          getEcosystemWalletComponents: 'not-a-function',
        },
      });

      const { result } = renderHook(() => useWalletComponents());

      expect(result.current).toBeNull();
    });

    it('should return null when getEcosystemWalletComponents is null', () => {
      mockUseWalletState.mockReturnValue({
        activeAdapter: {
          getEcosystemWalletComponents: null,
        },
      });

      const { result } = renderHook(() => useWalletComponents());

      expect(result.current).toBeNull();
    });
  });

  describe('when getEcosystemWalletComponents throws an error', () => {
    it('should return null when getEcosystemWalletComponents throws', () => {
      mockUseWalletState.mockReturnValue({
        activeAdapter: {
          getEcosystemWalletComponents: () => {
            throw new Error('Component retrieval failed');
          },
        },
      });

      const { result } = renderHook(() => useWalletComponents());

      expect(result.current).toBeNull();
    });
  });

  describe('when getEcosystemWalletComponents returns null or undefined', () => {
    it('should return null when getEcosystemWalletComponents returns null', () => {
      mockUseWalletState.mockReturnValue({
        activeAdapter: {
          getEcosystemWalletComponents: () => null,
        },
      });

      const { result } = renderHook(() => useWalletComponents());

      expect(result.current).toBeNull();
    });

    it('should return null when getEcosystemWalletComponents returns undefined', () => {
      mockUseWalletState.mockReturnValue({
        activeAdapter: {
          getEcosystemWalletComponents: () => undefined,
        },
      });

      const { result } = renderHook(() => useWalletComponents());

      expect(result.current).toBeNull();
    });
  });

  describe('when getEcosystemWalletComponents returns components successfully', () => {
    it('should return wallet components when available', () => {
      mockUseWalletState.mockReturnValue({
        activeAdapter: {
          getEcosystemWalletComponents: () => mockWalletComponents,
        },
      });

      const { result } = renderHook(() => useWalletComponents());

      expect(result.current).toEqual(mockWalletComponents);
    });

    it('should return components with all expected properties', () => {
      mockUseWalletState.mockReturnValue({
        activeAdapter: {
          getEcosystemWalletComponents: () => mockWalletComponents,
        },
      });

      const { result } = renderHook(() => useWalletComponents());

      expect(result.current).toHaveProperty('ConnectButton');
      expect(result.current).toHaveProperty('AccountDisplay');
      expect(result.current).toHaveProperty('NetworkSwitcher');
    });

    it('should return partial components when only some are provided', () => {
      const partialComponents = {
        ConnectButton: MockConnectButton,
      };

      mockUseWalletState.mockReturnValue({
        activeAdapter: {
          getEcosystemWalletComponents: () => partialComponents,
        },
      });

      const { result } = renderHook(() => useWalletComponents());

      expect(result.current).toEqual(partialComponents);
      expect(result.current?.ConnectButton).toBeDefined();
      expect(result.current?.AccountDisplay).toBeUndefined();
    });

    it('should return empty object when adapter returns empty object', () => {
      mockUseWalletState.mockReturnValue({
        activeAdapter: {
          getEcosystemWalletComponents: () => ({}),
        },
      });

      const { result } = renderHook(() => useWalletComponents());

      expect(result.current).toEqual({});
    });
  });

  describe('reactivity', () => {
    it('should update when adapter changes', () => {
      // Start with no adapter
      mockUseWalletState.mockReturnValue({
        activeAdapter: null,
      });

      const { result, rerender } = renderHook(() => useWalletComponents());
      expect(result.current).toBeNull();

      // Update to have an adapter
      mockUseWalletState.mockReturnValue({
        activeAdapter: {
          getEcosystemWalletComponents: () => mockWalletComponents,
        },
      });

      rerender();
      expect(result.current).toEqual(mockWalletComponents);
    });
  });
});
