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
  /** Toggle state for an interactive badge; sets `aria-pressed` and a selected style. Ignored without `onActivate`. */
  readonly pressed?: boolean;
  /**
   * Disables an interactive badge: the button gets the native `disabled` attribute, leaves
   * the tab order, never calls `onActivate`, and dims like a disabled `Button`. `aria-pressed`
   * stays exposed. Ignored without `onActivate`, like `pressed`.
   */
  readonly disabled?: boolean;
  /**
   * Read-only: an interactive badge stays focusable and in full colour, keeps
   * `aria-pressed`, and ignores click, Enter and Space so `onActivate` never fires.
   * Announced via a visually hidden "Read-only" description (`aria-describedby`), not
   * `aria-readonly` (invalid on a button) or `aria-disabled`. `disabled` wins when both
   * are set. Ignored without `onActivate`, like `pressed` and `disabled`.
   */
  readonly readOnly?: boolean;
  readonly 'aria-label'?: string;
  readonly className?: string;
}

const READ_ONLY_TEXT = 'Read-only';

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
    // Dark fill pinned to red-900 so white text keeps its contrast (see buttonVariants destructive).
    danger: 'bg-destructive text-destructive-foreground dark:bg-red-900',
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
 * trigger composition. `pressed` turns the button into a toggle chip. `disabled`
 * turns off an interactive badge and is ignored on a static one. `readOnly` keeps
 * an interactive badge focusable and full-colour while blocking activation; it is
 * ignored on a static badge, and `disabled` wins when both are set.
 */
export const Badge = React.forwardRef<BadgeElement, BadgeProps>(function Badge(
  {
    label,
    variant = 'filled',
    tone = 'neutral',
    icon,
    iconLabel,
    onActivate,
    pressed,
    // Destructured so they never reach the span through the host props.
    disabled,
    readOnly,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    className,
    ...rest
  },
  ref
): React.ReactElement {
  // Only the consumer-owned activation prop changes the host element.
  const isInteractive = typeof onActivate === 'function';
  // Pressed is meaningful only on the button form; a span must not expose aria-pressed.
  const isPressed = isInteractive && pressed === true;
  // The native attribute blocks pointer, keyboard and programmatic clicks, so handleClick needs no guard.
  const isDisabled = isInteractive && disabled === true;
  // Disabled wins: a disabled badge is reported disabled only, never read-only.
  const isReadOnly = isInteractive && readOnly === true && disabled !== true;
  // Stable id for the sr-only description; only referenced while read-only.
  const readOnlyDescriptionId = React.useId();
  const describedBy = isReadOnly
    ? [ariaDescribedBy, readOnlyDescriptionId].filter(Boolean).join(' ')
    : ariaDescribedBy;
  const hasIcon = icon != null && icon !== false;
  // The graphic stays decorative; non-empty text names it separately.
  const hasIconLabel = hasIcon && typeof iconLabel === 'string' && iconLabel.length > 0;
  // Untyped invalid values fail closed instead of unmounting a containing surface.
  const variantClasses = toneClasses[variant] ?? toneClasses.filled;
  const toneClass = variantClasses[tone] ?? variantClasses.neutral;
  // Remove Slot collisions before spreading host props.
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
    // Matches buttonVariants; pointer-events-none also cancels the hover tint and pointer cursor.
    // Gated on isDisabled so an enabled badge keeps its existing class string.
    isDisabled && 'disabled:pointer-events-none disabled:opacity-50',
    isPressed &&
      (variant === 'solid'
        ? // An inset ring (its own shadow layer), so pressed never takes the outer focus ring's
          // shape and a pressed, focused chip shows both.
          'inset-ring-2 inset-ring-foreground'
        : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'),
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
        aria-describedby={ariaDescribedBy}
        className={hostClassName}
        onClick={slotOnClick as React.MouseEventHandler<HTMLSpanElement> | undefined}
      >
        {content}
      </span>
    );
  }

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    // Overlay bookkeeping runs before consumer activation.
    slotOnClick?.(event);
    // Enter and Space on a native button arrive here as click; skip activation when read-only.
    if (isReadOnly) {
      event.preventDefault();
      return;
    }
    onActivate(event);
  };

  // Description lives inside the button so the host stays a single element for ref / Slot.
  // `hidden` (not sr-only) keeps it out of name-from-content so the accessible name stays the
  // label; aria-describedby still announces it — same pattern as SearchableMultiSelect.
  const readOnlyDescription = isReadOnly ? (
    <span id={readOnlyDescriptionId} hidden>
      {READ_ONLY_TEXT}
    </span>
  ) : null;

  return (
    <button
      {...hostProps}
      ref={ref as React.Ref<HTMLButtonElement>}
      type="button"
      disabled={isDisabled}
      {...(typeof pressed === 'boolean' ? { 'aria-pressed': pressed } : {})}
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      className={hostClassName}
      onClick={handleClick}
    >
      {content}
      {readOnlyDescription}
    </button>
  );
});

Badge.displayName = 'Badge';
