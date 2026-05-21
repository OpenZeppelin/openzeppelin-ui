import { useEffect, useRef } from 'react';

import type { RuntimeCapability } from '@openzeppelin/ui-types';
import { logger } from '@openzeppelin/ui-utils';

import { useDerivedAccountStatus } from './useDerivedAccountStatus';

/**
 * Hook that detects wallet reconnection and re-queues network switch if needed.
 *
 * When a user disconnects their wallet and then reconnects in the same session,
 * the wallet may connect to a different chain than what's selected in the app.
 * This hook detects that scenario and invokes a callback to re-queue the network switch.
 *
 * @param selectedNetworkConfigId - Currently selected network in the app
 * @param selectedCapability - Currently active wallet capability instance
 * @param networkToSwitchTo - Current network switch queue state (null if no switch pending)
 * @param onRequeueSwitch - Callback invoked when a network switch should be re-queued
 */
export function useWalletReconnectionHandler(
  selectedNetworkConfigId: string | null,
  selectedCapability: RuntimeCapability | null,
  networkToSwitchTo: string | null,
  onRequeueSwitch: (networkId: string) => void
): void {
  const { isConnected, chainId: walletChainId } = useDerivedAccountStatus();
  const prevConnectedRef = useRef(isConnected);

  useEffect(() => {
    const wasDisconnected = !prevConnectedRef.current;
    const isNowConnected = isConnected;
    const isReconnection = wasDisconnected && isNowConnected;

    // Update ref for next render
    prevConnectedRef.current = isConnected;

    if (!isReconnection || !selectedNetworkConfigId || !selectedCapability) {
      return;
    }

    // Skip if already queued
    if (networkToSwitchTo === selectedNetworkConfigId) {
      return;
    }

    // Check if the selected capability config has chainId (only EVM chains support network switching)
    const selectedNetworkConfig = selectedCapability.networkConfig;
    if (!('chainId' in selectedNetworkConfig) || !walletChainId) {
      return;
    }

    const targetChainId = Number(selectedNetworkConfig.chainId);
    if (walletChainId !== targetChainId) {
      logger.info(
        'useWalletReconnectionHandler',
        `Wallet reconnected with chain ${walletChainId}, but selected network requires ${targetChainId}. Re-queueing switch.`
      );
      onRequeueSwitch(selectedNetworkConfigId);
    }
  }, [
    isConnected,
    walletChainId,
    selectedNetworkConfigId,
    selectedCapability,
    networkToSwitchTo,
    onRequeueSwitch,
  ]);
}
