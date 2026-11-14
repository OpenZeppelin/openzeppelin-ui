import React from 'react';

import type { NetworkConfig } from '@openzeppelin/ui-types';
import { cn } from '@openzeppelin/ui-utils';

import { NetworkIcon } from './network-icon';

interface NetworkStatusBadgeProps {
  /**
   * A full `NetworkConfig`, or just the fields the badge reads. The full type stays in the
   * union so an inline object with other `NetworkConfig` fields (such as `isTestnet`) still
   * compiles.
   */
  network:
    | NetworkConfig
    | Pick<NetworkConfig, 'ecosystem' | 'name' | 'type' | 'iconComponent'>
    | null;
  className?: string;
  /** Show the uppercase ecosystem label before the name. Defaults to true. */
  showEcosystem?: boolean;
  /** Show the network icon (or the placeholder circle for icon-less networks). Defaults to true. */
  showIcon?: boolean;
  /**
   * Visual density. `'default'` keeps today's padding and testnet border; `'sm'` tightens
   * both for dense header rows. Defaults to `'default'`.
   */
  size?: 'default' | 'sm';
}

const ICON_SIZE_DEFAULT = 16;
const ICON_SIZE_SM = 14;

/**
 * NetworkStatusBadge - Displays network information in a compact badge format
 * Shows the network icon, ecosystem, and name (icon and ecosystem can be hidden) with dashed borders for testnet/devnet
 */
export function NetworkStatusBadge({
  network,
  className,
  showEcosystem = true,
  showIcon = true,
  size = 'default',
}: NetworkStatusBadgeProps): React.ReactElement | null {
  if (!network) return null;

  const isTestnetLike = network.type === 'testnet' || network.type === 'devnet';
  const isSm = size === 'sm';

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full bg-muted',
        isSm ? 'gap-1.5 px-2 py-1' : 'gap-2 px-3 py-2',
        isTestnetLike
          ? cn('border-dashed border-muted-foreground/40', isSm ? 'border' : 'border-2')
          : 'border-0',
        className
      )}
    >
      {showIcon && <NetworkIcon network={network} size={isSm ? ICON_SIZE_SM : ICON_SIZE_DEFAULT} />}

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
