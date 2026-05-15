import { Settings } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

import { Button, useNetworkErrors } from '@openzeppelin/ui-components';
import { useWalletState, WalletConnectionUI } from '@openzeppelin/ui-react';
import type { UiKitConfiguration } from '@openzeppelin/ui-types';
import { appConfigService } from '@openzeppelin/ui-utils';

import { NetworkSettingsDialog } from './network/NetworkSettingsDialog';

/**
 * Enhanced wallet connection header with network settings menu.
 * Used in exported apps to provide access to RPC and Explorer configuration.
 */
export const WalletConnectionWithSettings: React.FC = () => {
  const { isRuntimeLoading, activeRuntime, activeNetworkConfig, reconfigureActiveUiKit } =
    useWalletState();
  const { setOpenNetworkSettingsHandler } = useNetworkErrors();

  // Network settings dialog state
  const [showNetworkSettings, setShowNetworkSettings] = useState(false);

  // Create a stable callback for opening network settings
  const openNetworkSettings = useCallback(
    (networkId: string) => {
      // In exported apps, we only support the current network
      // The dialog will show tabs based on relayer.getNetworkServiceForms()
      if (activeNetworkConfig && networkId === activeNetworkConfig.id) {
        setShowNetworkSettings(true);
      }
    },
    [activeNetworkConfig]
  );

  // Register handler for opening network settings from error notifications
  useEffect(() => {
    setOpenNetworkSettingsHandler(openNetworkSettings);
  }, [openNetworkSettings, setOpenNetworkSettingsHandler]);

  if (isRuntimeLoading) {
    return <div className="h-9 w-28 animate-pulse rounded bg-muted"></div>;
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <WalletConnectionUI />

        {/* Settings Button */}
        {activeRuntime?.relayer && activeNetworkConfig && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            title="Network Settings"
            onClick={() => setShowNetworkSettings(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Network Settings Dialog */}
      <NetworkSettingsDialog
        isOpen={showNetworkSettings}
        onOpenChange={setShowNetworkSettings}
        networkConfig={activeNetworkConfig}
        relayer={activeRuntime?.relayer ?? null}
        onSettingsChanged={() => {
          const cfg = appConfigService.getTypedNestedConfig<UiKitConfiguration>(
            'walletui',
            'config'
          );
          reconfigureActiveUiKit(cfg ?? { kitName: 'custom', kitConfig: {} });
        }}
      />
    </>
  );
};
