import React from 'react';

import type { EcosystemMetadata } from '@openzeppelin/ui-types';
import { cn } from '@openzeppelin/ui-utils';

import { MidnightIcon } from '../icons/MidnightIcon';

export interface EcosystemIconProps {
  ecosystem: Pick<EcosystemMetadata, 'id' | 'iconComponent'>;
  className?: string;
  size?: number;
  variant?: 'mono' | 'branded';
}

/** Displays the appropriate icon for a blockchain ecosystem. */
export function EcosystemIcon({
  ecosystem,
  className,
  size = 16,
  variant = 'branded',
}: EcosystemIconProps): React.ReactElement {
  if (ecosystem.id === 'midnight') {
    return <MidnightIcon size={size} variant={variant} className={cn('shrink-0', className)} />;
  }

  if (ecosystem.iconComponent) {
    return (
      <ecosystem.iconComponent
        size={size}
        variant={variant}
        className={cn('shrink-0', className)}
      />
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
