'use client';

import { CloudOff, Settings } from 'lucide-react';
import { useContext } from 'react';

import type { NetworkConfig } from '@openzeppelin/ui-types';
import { getServiceDisplayName } from '@openzeppelin/ui-utils';

import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';
import { NetworkErrorContext } from './NetworkErrorContext';

export interface NetworkServiceErrorBannerProps {
  /** The network configuration for which the service connection failed */
  networkConfig: NetworkConfig;
  /** The type of service that failed (e.g., 'rpc', 'explorer', 'indexer') */
  serviceType: string;
  /** Optional custom error message to display */
  errorMessage?: string;
  /** Optional custom title override */
  title?: string;
  /** Optional custom description to show below the error message */
  description?: string;
  /**
   * Optional callback to open network settings dialog.
   * If not provided, will try to use the context from NetworkErrorNotificationProvider.
   * If neither is available, the settings button will not be rendered.
   */
  onOpenNetworkSettings?: (networkId: string) => void;
}

/**
 * User-friendly banner displayed when a network service connection fails.
 * Works with any service type (RPC, Explorer, Indexer, etc.) and provides
 * a clear explanation of the issue with a call-to-action to open the
 * network settings dialog where users can configure an alternative endpoint.
 *
 * This component can be used with or without the NetworkErrorNotificationProvider:
 * - With provider: The settings handler is obtained from context
 * - Without provider: Pass onOpenNetworkSettings prop directly, or the button won't render
 */
export function NetworkServiceErrorBanner({
  networkConfig,
  serviceType,
  errorMessage,
  title,
  description,
  onOpenNetworkSettings: onOpenNetworkSettingsProp,
}: NetworkServiceErrorBannerProps): React.ReactNode {
  // Try to get handler from context (won't throw if not in provider)
  const context = useContext(NetworkErrorContext);
  const onOpenNetworkSettings = onOpenNetworkSettingsProp ?? context?.onOpenNetworkSettings;

  const handleOpenSettings = (): void => {
    onOpenNetworkSettings?.(networkConfig.id);
  };

  const serviceName = getServiceDisplayName(serviceType);
  const defaultTitle = `Unable to Connect to ${networkConfig.name}`;
  const defaultDescription = onOpenNetworkSettings
    ? `This could be due to network congestion, rate limiting, or the service being temporarily down. You can configure a custom ${serviceName.toLowerCase()} endpoint in the network settings.`
    : `This could be due to network congestion, rate limiting, or the service being temporarily down.`;

  return (
    <Alert variant="destructive" className="border-red-500/50 bg-red-50 dark:bg-red-950/20">
      <CloudOff className="h-4 w-4 text-red-600 dark:text-red-400" />
      <AlertTitle className="text-red-900 dark:text-red-100">{title || defaultTitle}</AlertTitle>
      <AlertDescription className="text-red-800 dark:text-red-200">
        <p className="mb-2">
          {errorMessage ||
            `The ${serviceName.toLowerCase()} for ${networkConfig.name} is currently unavailable or not responding.`}
        </p>
        <p className="text-sm mb-3">{description || defaultDescription}</p>
        {onOpenNetworkSettings && (
          <Button
            onClick={handleOpenSettings}
            variant="default"
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600"
          >
            <Settings className="mr-2 h-4 w-4" />
            Configure {serviceName} Settings
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
