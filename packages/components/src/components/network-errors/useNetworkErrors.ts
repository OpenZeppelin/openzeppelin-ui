'use client';

import { useCallback, useContext } from 'react';

import type { RuntimeCapability } from '@openzeppelin/ui-types';

import { NetworkErrorContext } from './NetworkErrorContext';

export type NetworkErrorType = 'rpc' | 'explorer';

export interface NetworkError {
  id: string;
  type: NetworkErrorType;
  networkId: string;
  networkName: string;
  message: string;
  timestamp: number;
}

export interface NetworkErrorContextValue {
  errors: NetworkError[];
  reportNetworkError: (
    type: NetworkErrorType,
    networkId: string,
    networkName: string,
    message: string
  ) => void;
  clearError: (id: string) => void;
  clearAllErrors: () => void;
  onOpenNetworkSettings?: (networkId: string) => void;
  setOpenNetworkSettingsHandler: (handler: (networkId: string) => void) => void;
}

/** Hook to access network error reporting and management functions. */
export function useNetworkErrors(): NetworkErrorContextValue {
  const context = useContext(NetworkErrorContext);
  if (!context) {
    throw new Error('useNetworkErrors must be used within NetworkErrorNotificationProvider');
  }
  return context;
}

/**
 * Hook for reporting network errors for a specific runtime-bound capability
 */
export function useNetworkErrorReporter(capability: RuntimeCapability | null): {
  reportRpcError: (message: string) => void;
  reportExplorerError: (message: string) => void;
} {
  const { reportNetworkError } = useNetworkErrors();

  const reportRpcError = useCallback(
    (message: string) => {
      if (!capability) return;
      reportNetworkError(
        'rpc',
        capability.networkConfig.id,
        capability.networkConfig.name,
        message
      );
    },
    [capability, reportNetworkError]
  );

  const reportExplorerError = useCallback(
    (message: string) => {
      if (!capability) return;
      reportNetworkError(
        'explorer',
        capability.networkConfig.id,
        capability.networkConfig.name,
        message
      );
    },
    [capability, reportNetworkError]
  );

  return {
    reportRpcError,
    reportExplorerError,
  };
}
