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

  describe('when runtime is null', () => {
    it('should return null when activeRuntime is null', () => {
      mockUseWalletState.mockReturnValue({
        activeRuntime: null,
      });

      const { result } = renderHook(() => useWalletComponents());

      expect(result.current).toBeNull();
    });

    it('should return null when activeRuntime is undefined', () => {
      mockUseWalletState.mockReturnValue({
        activeRuntime: undefined,
      });

      const { result } = renderHook(() => useWalletComponents());

      expect(result.current).toBeNull();
    });
  });

  describe('when getEcosystemWalletComponents is not a function', () => {
    it('should return null when runtime has no uiKit capability', () => {
      mockUseWalletState.mockReturnValue({
        activeRuntime: {},
      });

      const { result } = renderHook(() => useWalletComponents());

      expect(result.current).toBeNull();
    });

    it('should return null when getEcosystemWalletComponents is a non-function value', () => {
      mockUseWalletState.mockReturnValue({
        activeRuntime: {
          uiKit: {
            getEcosystemWalletComponents: 'not-a-function',
          },
        },
      });

      const { result } = renderHook(() => useWalletComponents());

      expect(result.current).toBeNull();
    });

    it('should return null when getEcosystemWalletComponents is null', () => {
      mockUseWalletState.mockReturnValue({
        activeRuntime: {
          uiKit: {
            getEcosystemWalletComponents: null,
          },
        },
      });

      const { result } = renderHook(() => useWalletComponents());

      expect(result.current).toBeNull();
    });
  });

  describe('when getEcosystemWalletComponents throws an error', () => {
    it('should return null when getEcosystemWalletComponents throws', () => {
      mockUseWalletState.mockReturnValue({
        activeRuntime: {
          uiKit: {
            getEcosystemWalletComponents: () => {
              throw new Error('Component retrieval failed');
            },
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
        activeRuntime: {
          uiKit: {
            getEcosystemWalletComponents: () => null,
          },
        },
      });

      const { result } = renderHook(() => useWalletComponents());

      expect(result.current).toBeNull();
    });

    it('should return null when getEcosystemWalletComponents returns undefined', () => {
      mockUseWalletState.mockReturnValue({
        activeRuntime: {
          uiKit: {
            getEcosystemWalletComponents: () => undefined,
          },
        },
      });

      const { result } = renderHook(() => useWalletComponents());

      expect(result.current).toBeNull();
    });
  });

  describe('when getEcosystemWalletComponents returns components successfully', () => {
    it('should return wallet components when available', () => {
      mockUseWalletState.mockReturnValue({
        activeRuntime: {
          uiKit: {
            getEcosystemWalletComponents: () => mockWalletComponents,
          },
        },
      });

      const { result } = renderHook(() => useWalletComponents());

      expect(result.current).toEqual(mockWalletComponents);
    });

    it('should return components with all expected properties', () => {
      mockUseWalletState.mockReturnValue({
        activeRuntime: {
          uiKit: {
            getEcosystemWalletComponents: () => mockWalletComponents,
          },
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
        activeRuntime: {
          uiKit: {
            getEcosystemWalletComponents: () => partialComponents,
          },
        },
      });

      const { result } = renderHook(() => useWalletComponents());

      expect(result.current).toEqual(partialComponents);
      expect(result.current?.ConnectButton).toBeDefined();
      expect(result.current?.AccountDisplay).toBeUndefined();
    });

    it('should return empty object when runtime uiKit returns empty object', () => {
      mockUseWalletState.mockReturnValue({
        activeRuntime: {
          uiKit: {
            getEcosystemWalletComponents: () => ({}),
          },
        },
      });

      const { result } = renderHook(() => useWalletComponents());

      expect(result.current).toEqual({});
    });
  });

  describe('reactivity', () => {
    it('should update when runtime changes', () => {
      // Start with no runtime
      mockUseWalletState.mockReturnValue({
        activeRuntime: null,
      });

      const { result, rerender } = renderHook(() => useWalletComponents());
      expect(result.current).toBeNull();

      // Update to have a runtime with uiKit
      mockUseWalletState.mockReturnValue({
        activeRuntime: {
          uiKit: {
            getEcosystemWalletComponents: () => mockWalletComponents,
          },
        },
      });

      rerender();
      expect(result.current).toEqual(mockWalletComponents);
    });
  });
});
