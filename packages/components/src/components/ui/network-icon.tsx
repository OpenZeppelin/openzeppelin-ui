import React from 'react';

import type { NetworkConfig } from '@openzeppelin/ui-types';
import { cn } from '@openzeppelin/ui-utils';

import { MidnightIcon } from '../icons/MidnightIcon';

export interface NetworkIconProps {
  network: Pick<NetworkConfig, 'ecosystem' | 'iconComponent'>;
  className?: string;
  size?: number;
  variant?: 'mono' | 'branded';
}

/** Displays the appropriate icon for a blockchain network. */
export function NetworkIcon({
  network,
  className,
  size = 16,
  variant = 'branded',
}: NetworkIconProps): React.ReactElement {
  if (network.ecosystem === 'midnight') {
    return <MidnightIcon size={size} variant={variant} className={cn('shrink-0', className)} />;
  }

  if (network.iconComponent) {
    return (
      <network.iconComponent size={size} variant={variant} className={cn('shrink-0', className)} />
    );
  }

  return (
    <div
      className={cn('bg-muted shrink-0 rounded-full', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
