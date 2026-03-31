import React, { useEffect, useState } from 'react';

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
  const { activeRuntime, walletFacadeHooks } = useWalletState();
  const activeUiKit = activeRuntime?.uiKit;

  useEffect(() => {
    logger.debug('WalletConnectionUI', '[Debug] State from useWalletState:', {
      runtimeId: activeRuntime?.networkConfig.id,
      hasFacadeHooks: !!walletFacadeHooks,
    });
  }, [activeRuntime, walletFacadeHooks]);

  // Compute wallet components on each render to ensure UI kit changes are reflected immediately
  const walletComponents = (() => {
    if (!activeUiKit || typeof activeUiKit.getEcosystemWalletComponents !== 'function') {
      logger.debug(
        'WalletConnectionUI',
        '[Debug] No active uiKit or getEcosystemWalletComponents method, returning null.'
      );
      return null;
    }

    try {
      const components = activeUiKit.getEcosystemWalletComponents();
      logger.debug(
        'WalletConnectionUI',
        '[Debug] walletComponents from runtime uiKit:',
        components
      );
      return components;
    } catch (error) {
      logger.error('WalletConnectionUI', '[Debug] Error getting wallet components:', error);
      setIsError(true);
      return null;
    }
  })();

  if (!walletComponents) {
    logger.debug(
      'WalletConnectionUI',
      '[Debug] getEcosystemWalletComponents returned null/undefined, rendering null.'
    );
    return null;
  }

  // Log available components for debugging
  logger.debug('WalletConnectionUI', 'Rendering wallet components:', {
    hasConnectButton: !!walletComponents.ConnectButton,
    hasAccountDisplay: !!walletComponents.AccountDisplay,
    hasNetworkSwitcher: !!walletComponents.NetworkSwitcher,
  });

  const { ConnectButton, AccountDisplay, NetworkSwitcher } = walletComponents;

  // If there was an error, show an error button
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
      {/* Display network switcher if available - moved before account to match typical wallet UI flow */}
      {NetworkSwitcher && <NetworkSwitcher {...networkSwitcherProps} />}

      {/* Display account info if available */}
      {AccountDisplay && <AccountDisplay {...accountDisplayProps} />}

      {/* Display connect button if available */}
      {ConnectButton && <ConnectButton {...connectButtonProps} />}
    </div>
  );
};
