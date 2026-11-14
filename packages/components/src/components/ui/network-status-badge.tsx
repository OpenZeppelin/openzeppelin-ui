import React from 'react';

import type { NetworkConfig } from '@openzeppelin/ui-types';
import { cn } from '@openzeppelin/ui-utils';

import { NetworkIcon } from './network-icon';

interface NetworkStatusBadgeProps {
  network: NetworkConfig | null;
  className?: string;
  /** Show the uppercase ecosystem label before the name. Defaults to true. */
  showEcosystem?: boolean;
  /** Show the network icon (or the placeholder circle for icon-less networks). Defaults to true. */
  showIcon?: boolean;
}

// Define constants for consistency
const ICON_SIZE = 16;

/**
 * NetworkStatusBadge - Displays network information in a compact badge format
 * Shows the network icon, ecosystem, and name (icon and ecosystem can be hidden) with dashed borders for testnet/devnet
 */
export function NetworkStatusBadge({
  network,
  className,
  showEcosystem = true,
  showIcon = true,
}: NetworkStatusBadgeProps): React.ReactElement | null {
  if (!network) return null;

  const isTestnetLike = network.type === 'testnet' || network.type === 'devnet';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full bg-muted px-3 py-2',
        isTestnetLike ? 'border-2 border-dashed border-muted-foreground/40' : 'border-0',
        className
      )}
    >
      {/* Network icon */}
      {showIcon && <NetworkIcon network={network} size={ICON_SIZE} />}

      {/* Combined ecosystem + network name */}
      <div className="flex items-baseline gap-1.5">
        {showEcosystem && (
          <span className="text-xs font-medium text-muted-foreground uppercase">
            {network.ecosystem}
          </span>
        )}
        <span className="text-xs font-medium">{network.name}</span>
      </div>
    </div>
  );
}
