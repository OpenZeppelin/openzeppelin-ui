import { X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@openzeppelin/ui-utils';

export type BannerVariant = 'info' | 'success' | 'warning' | 'error' | 'neutral';

export type BannerSize = 'default' | 'compact';

export interface BannerProps {
  /**
   * The variant/style of the banner
   * @default 'info'
   */
  variant?: BannerVariant;

  /**
   * Density preset for padding and typography
   * @default 'default'
   */
  size?: BannerSize;

  /**
   * Title text displayed at the top of the banner
   */
  title?: React.ReactNode;

  /**
   * Body text/content of the banner
   */
  children: React.ReactNode;

  /**
   * Whether the banner can be dismissed
   * @default true
   */
  dismissible?: boolean;

  /**
   * Callback when the banner is dismissed
   */
  onDismiss?: () => void;

  /**
   * Icon to display on the left (replaces default based on variant)
   */
  icon?: React.ReactNode;

  /**
   * Additional CSS classes
   */
  className?: string;
}

const variantStyles: Record<
  BannerVariant,
  { container: string; icon: string; title: string; body: string }
> = {
  info: {
    container: 'border-blue-200 bg-blue-50',
    icon: 'text-blue-600',
    title: 'text-blue-900',
    body: 'text-blue-800',
  },
  success: {
    container: 'border-green-200 bg-green-50',
    icon: 'text-green-600',
    title: 'text-green-900',
    body: 'text-green-800',
  },
  warning: {
    container: 'border-amber-200 bg-amber-50',
    icon: 'text-amber-600',
    title: 'text-amber-900',
    body: 'text-amber-800',
  },
  error: {
    container: 'border-red-200 bg-red-50',
    icon: 'text-red-600',
    title: 'text-red-900',
    body: 'text-red-800',
  },
  neutral: {
    container: 'border-border bg-muted/30',
    icon: 'text-muted-foreground',
    title: 'text-foreground',
    body: 'text-muted-foreground',
  },
};

const sizeStyles: Record<
  BannerSize,
  { container: string; gap: string; title: string; body: string; dismissIcon: string }
> = {
  default: {
    container: 'p-4',
    gap: 'gap-3',
    title: 'mb-2 text-sm font-semibold',
    body: 'text-sm whitespace-pre-line',
    dismissIcon: 'h-5 w-5',
  },
  compact: {
    container: 'px-4 py-3',
    gap: 'gap-2',
    title: 'mb-1 text-xs font-medium',
    body: 'text-xs leading-relaxed whitespace-pre-line',
    dismissIcon: 'h-4 w-4',
  },
};

/**
 * Dismissible banner component for notifications and alerts
 * Can be used with various variants (info, success, warning, error, neutral)
 */
export const Banner = React.forwardRef<HTMLDivElement, BannerProps>(
  (
    {
      className,
      variant = 'info',
      size = 'default',
      title,
      children,
      dismissible = true,
      onDismiss,
      icon,
    },
    ref
  ) => {
    const styles = variantStyles[variant];
    const sizing = sizeStyles[size];

    return (
      <div
        ref={ref}
        role="alert"
        className={cn('rounded-md border', sizing.container, styles.container, className)}
      >
        <div className={cn('flex', sizing.gap)}>
          {icon && <div className={cn('mt-0.5 shrink-0', styles.icon)}>{icon}</div>}
          <div className="min-w-0 flex-1">
            {title && <h4 className={cn(sizing.title, styles.title)}>{title}</h4>}
            <div className={cn(sizing.body, styles.body)}>{children}</div>
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onDismiss}
              className={cn('self-start shrink-0 transition-colors hover:opacity-70', styles.icon)}
              aria-label="Dismiss banner"
            >
              <X className={sizing.dismissIcon} />
            </button>
          )}
        </div>
      </div>
    );
  }
);
Banner.displayName = 'Banner';
