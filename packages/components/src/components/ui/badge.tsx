import React from 'react';

import { cn } from '@openzeppelin/ui-utils';

export type BadgeVariant = 'filled' | 'outline' | 'solid';
export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
type BadgeElement = HTMLSpanElement | HTMLButtonElement;

export interface BadgeProps
  extends Omit<React.ComponentPropsWithoutRef<'span'>, 'children' | 'color' | 'onClick'> {
  readonly label: string;
  readonly variant?: BadgeVariant;
  readonly tone?: BadgeTone;
  readonly icon?: React.ReactNode;
  readonly iconLabel?: string;
  readonly onActivate?: React.MouseEventHandler<HTMLButtonElement>;
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
  solid: {
    neutral: 'bg-foreground text-background',
    info: 'bg-info text-info-foreground',
    success: 'bg-success text-success-foreground',
    warning: 'bg-warning text-warning-foreground',
    danger: 'bg-destructive text-destructive-foreground',
  },
};

type SlotInjectedProps = {
  readonly onClick?: React.MouseEventHandler<HTMLElement>;
  readonly type?: unknown;
};

/**
 * Renders a short status or category label.
 *
 * The host is a non-interactive span unless `onActivate` is supplied, in which
 * case it is a native button. The forwarded ref and host props support overlay
 * trigger composition.
 */
export const Badge = React.forwardRef<BadgeElement, BadgeProps>(function Badge(
  {
    label,
    variant = 'filled',
    tone = 'neutral',
    icon,
    iconLabel,
    onActivate,
    'aria-label': ariaLabel,
    className,
    ...rest
  },
  ref
): React.ReactElement {
  // INV-373/374: only the consumer-owned activation prop changes the host element.
  const isInteractive = typeof onActivate === 'function';
  const hasIcon = icon != null && icon !== false;
  // INV-375/380: the graphic stays decorative; non-empty text names it separately.
  const hasIconLabel = hasIcon && typeof iconLabel === 'string' && iconLabel.length > 0;
  // INV-382: untyped invalid values fail closed instead of unmounting a containing surface.
  const variantClasses = toneClasses[variant] ?? toneClasses.filled;
  const toneClass = variantClasses[tone] ?? variantClasses.neutral;
  // INV-385/394: remove Slot collisions before spreading host props.
  const {
    onClick: slotOnClick,
    type: _ignoredType,
    ...hostProps
  } = rest as typeof rest & SlotInjectedProps;
  const hostClassName = cn(
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
    hasIcon && 'gap-1',
    variant === 'outline' && 'border',
    toneClass,
    isInteractive &&
      'cursor-pointer appearance-none font-inherit transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
    isInteractive && (variant === 'solid' ? 'hover:brightness-95' : 'hover:bg-accent/50'),
    className
  );
  const content = hasIcon ? (
    <>
      <span aria-hidden="true" className="inline-flex shrink-0 items-center [&>svg]:size-3">
        {icon}
      </span>
      {hasIconLabel && <span className="sr-only">{iconLabel}</span>}
      {label}
    </>
  ) : (
    label
  );

  if (!isInteractive) {
    return (
      <span
        {...hostProps}
        ref={ref as React.Ref<HTMLSpanElement>}
        aria-label={ariaLabel}
        className={hostClassName}
        onClick={slotOnClick as React.MouseEventHandler<HTMLSpanElement> | undefined}
      >
        {content}
      </span>
    );
  }

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    // INV-394: overlay bookkeeping runs before consumer activation.
    slotOnClick?.(event);
    onActivate(event);
  };

  return (
    <button
      {...hostProps}
      ref={ref as React.Ref<HTMLButtonElement>}
      type="button"
      aria-label={ariaLabel}
      className={hostClassName}
      onClick={handleClick}
    >
      {content}
    </button>
  );
});

Badge.displayName = 'Badge';
