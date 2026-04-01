import React, { useState } from 'react';

import { Button } from '@openzeppelin/ui-components';
import type { BaseComponentProps } from '@openzeppelin/ui-types';
import { cn, logger } from '@openzeppelin/ui-utils';

import { useWalletState } from '../hooks/WalletStateContext';

/**
 * Props for the WalletConnectionUI component.
 */
export interface WalletConnectionUIProps {
  /** Additional CSS classes to apply to the wrapper container */
  className?: string;
  /** Props forwarded to the ConnectButton component */
  connectButtonProps?: BaseComponentProps;
  /** Props forwarded to the AccountDisplay component */
  accountDisplayProps?: BaseComponentProps;
  /** Props forwarded to the NetworkSwitcher component */
  networkSwitcherProps?: BaseComponentProps;
}

/**
 * Component that displays wallet connection UI components
 * provided by the active adapter.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <WalletConnectionUI />
 *
 * // With custom styling for the connect button
 * <WalletConnectionUI
 *   connectButtonProps={{ size: "lg", variant: "outline", fullWidth: true }}
 * />
 *
 * // Customizing all components
 * <WalletConnectionUI
 *   connectButtonProps={{ size: "lg" }}
 *   accountDisplayProps={{ size: "lg" }}
 *   networkSwitcherProps={{ size: "lg" }}
 * />
 * ```
 */
export const WalletConnectionUI: React.FC<WalletConnectionUIProps> = ({
  className,
  connectButtonProps,
  accountDisplayProps,
  networkSwitcherProps,
}) => {
  const [isError, setIsError] = useState(false);
  const { activeNetworkConfig, activeRuntime, isRuntimeLoading } = useWalletState();
  const activeUiKit = activeRuntime?.uiKit;
  const isCrossEcosystemTransition = !!(
    isRuntimeLoading &&
    activeRuntime?.networkConfig?.ecosystem &&
    activeNetworkConfig?.ecosystem &&
    activeRuntime.networkConfig.ecosystem !== activeNetworkConfig.ecosystem
  );

  if (isCrossEcosystemTransition) {
    return null;
  }

  const walletComponents = (() => {
    if (!activeUiKit || typeof activeUiKit.getEcosystemWalletComponents !== 'function') {
      return null;
    }

    try {
      return activeUiKit.getEcosystemWalletComponents();
    } catch (error) {
      logger.error('WalletConnectionUI', 'Error getting wallet components:', error);
      setIsError(true);
      return null;
    }
  })();

  if (!walletComponents) {
    return null;
  }

  const { ConnectButton, AccountDisplay, NetworkSwitcher } = walletComponents;

  if (isError) {
    return (
      <div className={cn('flex items-center gap-4', className)}>
        <Button variant="destructive" size="sm" onClick={() => window.location.reload()}>
          Wallet Error - Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-4', className)}>
      {NetworkSwitcher && <NetworkSwitcher {...networkSwitcherProps} />}
      {AccountDisplay && <AccountDisplay {...accountDisplayProps} />}
      {ConnectButton && <ConnectButton {...connectButtonProps} />}
    </div>
  );
};
