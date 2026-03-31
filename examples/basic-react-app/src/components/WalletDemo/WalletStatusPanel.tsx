/**
 * WalletStatusPanel
 *
 * Displays live runtime status from wallet facade hooks.
 * Shows connection state, adapter info, and errors/warnings.
 */

import { RefreshCcw } from 'lucide-react';
import { useMemo } from 'react';

import { AddressDisplay, Alert, AlertDescription, Button } from '@openzeppelin/ui-components';
import {
  useDerivedAccountStatus,
  useDerivedChainInfo,
  useDerivedConnectStatus,
  useDerivedSwitchChainStatus,
  useWalletState,
} from '@openzeppelin/ui-react';

export interface WalletStatusPanelProps {
  selectedKitName: string | null;
}

export function WalletStatusPanel({ selectedKitName }: WalletStatusPanelProps): React.ReactElement {
  const { activeRuntime, activeNetworkConfig, isRuntimeLoading } = useWalletState();
  const { isConnected, address, chainId } = useDerivedAccountStatus();
  const { currentChainId } = useDerivedChainInfo();
  const { error: connectError, isConnecting } = useDerivedConnectStatus();
  const { switchChain, error: switchError, isSwitching } = useDerivedSwitchChainStatus();

  // Zero-config kits (custom, none) don't require a native config file
  const isZeroConfigKit = selectedKitName === 'custom' || selectedKitName === 'none';

  const walletComponentsAvailability = useMemo(() => {
    if (!activeRuntime?.uiKit) {
      return { isAvailable: false, reason: 'No active runtime UI kit.' };
    }

    if (typeof activeRuntime.uiKit.getEcosystemWalletComponents !== 'function') {
      return { isAvailable: false, reason: 'Runtime UI kit does not expose wallet components.' };
    }

    try {
      const comps = activeRuntime.uiKit.getEcosystemWalletComponents();
      if (!comps)
        return { isAvailable: false, reason: 'No wallet components for this runtime/kit.' };
      return { isAvailable: true, reason: null as string | null };
    } catch {
      return {
        isAvailable: false,
        reason: 'Failed to resolve wallet components (possible context/version mismatch).',
      };
    }
  }, [activeRuntime]);

  const expectedChainId =
    activeNetworkConfig &&
    'chainId' in activeNetworkConfig &&
    typeof activeNetworkConfig.chainId === 'number'
      ? activeNetworkConfig.chainId
      : undefined;
  const hasNetworkMismatch =
    isConnected &&
    typeof expectedChainId === 'number' &&
    typeof currentChainId === 'number' &&
    expectedChainId !== currentChainId;

  const canAttemptSwitch =
    hasNetworkMismatch && typeof expectedChainId === 'number' && typeof switchChain === 'function';

  // Helper to render status indicator
  const StatusIndicator = ({
    value,
    activeColor = 'text-green-600',
    inactiveColor = 'text-muted-foreground',
  }: {
    value: boolean;
    activeColor?: string;
    inactiveColor?: string;
  }) => <span className={value ? activeColor : inactiveColor}>{value ? '● true' : '○ false'}</span>;

  const hasErrors =
    connectError || switchError || hasNetworkMismatch || !walletComponentsAvailability.isAvailable;

  return (
    <div className="space-y-4">
      {/* Live Hook Values */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Live Facade Hook Values</h4>
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
              <code className="text-xs text-muted-foreground">isConnected</code>
              <StatusIndicator value={isConnected} />
            </div>
            <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
              <code className="text-xs text-muted-foreground">isConnecting</code>
              <StatusIndicator value={isConnecting} activeColor="text-yellow-600" />
            </div>
            <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
              <code className="text-xs text-muted-foreground">isSwitching</code>
              <StatusIndicator value={isSwitching} activeColor="text-yellow-600" />
            </div>
            <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
              <code className="text-xs text-muted-foreground">isRuntimeLoading</code>
              <StatusIndicator value={isRuntimeLoading} activeColor="text-yellow-600" />
            </div>
            <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
              <code className="text-xs text-muted-foreground">address</code>
              {address ? (
                <AddressDisplay
                  address={address}
                  startChars={6}
                  endChars={4}
                  className="bg-transparent px-0 py-0 text-xs"
                />
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
            <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
              <code className="text-xs text-muted-foreground">chainId</code>
              <code className="text-xs">
                {chainId ?? <span className="text-muted-foreground">—</span>}
              </code>
            </div>
            <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
              <code className="text-xs text-muted-foreground">currentChainId</code>
              <code className="text-xs">
                {currentChainId ?? <span className="text-muted-foreground">—</span>}
              </code>
            </div>
            <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
              <code className="text-xs text-muted-foreground">expectedChainId</code>
              <code className="text-xs">
                {expectedChainId ?? <span className="text-muted-foreground">—</span>}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Adapter & Kit Info */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Adapter & Kit Status</h4>
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
              <code className="text-xs text-muted-foreground">activeKit</code>
              <code className="text-xs font-medium">
                {selectedKitName || <span className="text-muted-foreground">—</span>}
              </code>
            </div>
            <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
              <code className="text-xs text-muted-foreground">ecosystem</code>
              <code className="text-xs font-medium">
                {activeNetworkConfig?.ecosystem || <span className="text-muted-foreground">—</span>}
              </code>
            </div>
            <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
              <code className="text-xs text-muted-foreground">networkId</code>
              <code className="text-xs">
                {activeNetworkConfig?.id || <span className="text-muted-foreground">—</span>}
              </code>
            </div>
            <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
              <code className="text-xs text-muted-foreground">hasRuntime</code>
              <StatusIndicator value={!!activeRuntime} />
            </div>
            <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
              <code className="text-xs text-muted-foreground">hasWalletComponents</code>
              <StatusIndicator value={walletComponentsAvailability.isAvailable} />
            </div>
            <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
              <code className="text-xs text-muted-foreground">requiresConfig</code>
              <StatusIndicator value={!isZeroConfigKit} inactiveColor="text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Errors & Warnings */}
      {hasErrors && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Errors & Warnings</h4>
          <div className="space-y-2">
            {connectError && (
              <Alert variant="destructive">
                <AlertDescription>
                  <span className="font-medium">Connection error:</span> {connectError.message}
                </AlertDescription>
              </Alert>
            )}

            {switchError && (
              <Alert variant="destructive">
                <AlertDescription>
                  <span className="font-medium">Switch error:</span> {switchError.message}
                </AlertDescription>
              </Alert>
            )}

            {!walletComponentsAvailability.isAvailable && !isRuntimeLoading && (
              <Alert variant="destructive">
                <AlertDescription>{walletComponentsAvailability.reason}</AlertDescription>
              </Alert>
            )}

            {hasNetworkMismatch && (
              <Alert variant="destructive">
                <AlertDescription className="flex flex-col gap-2">
                  <span>
                    Network mismatch: wallet on chain <span className="font-medium">{chainId}</span>
                    , expected <span className="font-medium">{expectedChainId}</span>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canAttemptSwitch}
                    onClick={() => {
                      if (typeof expectedChainId === 'number') {
                        switchChain?.({ chainId: expectedChainId });
                      }
                    }}
                    className="w-fit"
                  >
                    <RefreshCcw className="mr-2 size-3" />
                    Switch network
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
