import { Slot, Slottable } from '@radix-ui/react-slot';
import { type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@openzeppelin/ui-utils';

import { buttonVariants } from '../../utils/button-variants';
import { Spinner } from './spinner';

export interface LoadingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /**
   * Shows a spinner and blocks activation. The button stays focusable and is not
   * natively `disabled`: it sets `aria-disabled="true"` and `aria-busy="true"`, and
   * ignores clicks, Enter, Space and implicit form submission (the click is cancelled
   * and `onClick` isn't called). Only clicks are ignored: other handlers such as
   * `onKeyDown` still run. A focused button keeps focus while loading. `disabled`
   * still disables the button natively, with or without `loading`.
   *
   * Set it synchronously in your handler, before the first `await`, so a second
   * activation already sees it. With `asChild`, pass `onClick` to `LoadingButton`,
   * not to the child element, because a handler on the child runs before the guard.
   */
  loading?: boolean;
}

/**
 * Dimmed like a natively disabled kit button, applied only while loading so the idle
 * class string is unchanged. Leaves out `pointer-events-none`: a click would fall
 * through to the container and its mousedown would drop focus to the body. The button
 * keeps the click and the guard cancels it.
 */
const LOADING_LOOK = 'opacity-50';

const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (
    {
      className,
      loading = false,
      children,
      disabled,
      onClick,
      variant,
      size,
      asChild = false,
      'aria-disabled': ariaDisabled,
      'aria-busy': ariaBusy,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    // Native `disabled` would move focus to the body, so loading blocks here instead.
    // Enter and Space on a button, and implicit form submission, all reach the button
    // as a `click`, so this one guard covers pointer, keyboard and implicit submit.
    // preventDefault cancels the submit or link navigation. No stopPropagation:
    // ancestor click listeners still see the click.
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
      if (loading) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
    };

    // The loading values come after the spread so no consumer prop can switch them off.
    return (
      <Comp
        data-slot="button"
        data-variant={variant || 'default'}
        data-size={size || 'default'}
        className={cn(buttonVariants({ variant, size, className }), loading && LOADING_LOOK)}
        ref={ref}
        {...props}
        disabled={disabled}
        aria-disabled={loading ? true : ariaDisabled}
        aria-busy={loading ? true : ariaBusy}
        onClick={handleClick}
      >
        {loading && <Spinner className="mr-2" />}
        <Slottable>{children}</Slottable>
      </Comp>
    );
  }
);
LoadingButton.displayName = 'LoadingButton';

export { LoadingButton };
