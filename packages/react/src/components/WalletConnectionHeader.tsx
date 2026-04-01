import React from 'react';

import { useWalletState } from '../hooks/WalletStateContext';
import { WalletConnectionUI } from './WalletConnectionUI';

/**
 * Component that renders the wallet connection UI.
 * Uses useWalletState to get its data.
 */
export const WalletConnectionHeader: React.FC = () => {
  const { isRuntimeLoading } = useWalletState();

  if (isRuntimeLoading) {
    return <div className="h-9 w-28 animate-pulse rounded bg-muted"></div>;
  }

  return <WalletConnectionUI />;
};
