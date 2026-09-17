import React from 'react';

import { cn } from '@openzeppelin/ui-utils';

export type BadgeVariant = 'filled' | 'outline';
export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface BadgeProps {
  readonly label: string;
  readonly variant?: BadgeVariant;
  readonly tone?: BadgeTone;
  readonly icon?: React.ReactNode;
  readonly 'aria-label'?: string;
  readonly className?: string;
}

const toneClasses: Record<BadgeVariant, Record<BadgeTone, string>> = {
  filled: {
    neutral: 'bg-muted text-muted-foreground',
    info: 'bg-info/15 text-info',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/20 text-foreground',
    danger: 'bg-destructive/10 text-destructive',
  },
  outline: {
    neutral: 'border-border text-muted-foreground',
    info: 'border-info/50 text-info',
    success: 'border-success/50 text-success',
    warning: 'border-warning/60 text-foreground',
    danger: 'border-destructive/50 text-destructive',
  },
};

/**
 * Renders a short, domain-neutral status label.
 */
export function Badge({
  label,
  variant = 'filled',
  tone = 'neutral',
  icon,
  'aria-label': ariaLabel,
  className,
}: BadgeProps): React.ReactElement {
  const hasIcon = icon != null && icon !== false;

  return (
    <span
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        hasIcon && 'gap-1',
        variant === 'outline' && 'border',
        toneClasses[variant][tone],
        className
      )}
    >
      {hasIcon && (
        <span aria-hidden="true" className="inline-flex shrink-0 items-center [&>svg]:size-3">
          {icon}
        </span>
      )}
      {label}
    </span>
  );
}
