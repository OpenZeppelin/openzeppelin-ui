import React, { useEffect } from 'react';

import { logger } from '@openzeppelin/ui-utils';

import { useWalletState } from '../hooks/WalletStateContext';
import { WalletConnectionUI } from './WalletConnectionUI';

/**
 * Component that renders the wallet connection UI.
 * Uses useWalletState to get its data.
 */
export const WalletConnectionHeader: React.FC = () => {
  const { isRuntimeLoading, activeRuntime } = useWalletState();

  useEffect(() => {
    logger.debug('WalletConnectionHeader', '[Debug] State from useWalletState:', {
      runtimePresent: !!activeRuntime,
      runtimeNetwork: activeRuntime?.networkConfig.id,
      isLoading: isRuntimeLoading,
    });
  }, [activeRuntime, isRuntimeLoading]);

  if (isRuntimeLoading) {
    logger.debug('WalletConnectionHeader', '[Debug] Runtime loading, showing skeleton.');
    return <div className="h-9 w-28 animate-pulse rounded bg-muted"></div>;
  }

  return <WalletConnectionUI />;
};
