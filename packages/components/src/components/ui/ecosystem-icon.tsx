import React from 'react';

import type { EcosystemMetadata } from '@openzeppelin/ui-types';
import { cn } from '@openzeppelin/ui-utils';

import { MidnightIcon } from '../icons/MidnightIcon';

export interface EcosystemIconProps {
  ecosystem: Pick<EcosystemMetadata, 'id' | 'iconComponent'>;
  /** Text used to derive the initial letter when no icon is available */
  fallbackLabel?: string;
  className?: string;
  size?: number;
  variant?: 'mono' | 'branded';
}

/** Displays the appropriate icon for a blockchain ecosystem. */
export function EcosystemIcon({
  ecosystem,
  fallbackLabel,
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

  const initial = (fallbackLabel ?? ecosystem.id).charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        'bg-muted text-muted-foreground shrink-0 rounded-full flex items-center justify-center font-medium',
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      role="img"
      aria-label={fallbackLabel ?? ecosystem.id}
    >
      {initial}
    </div>
  );
}
