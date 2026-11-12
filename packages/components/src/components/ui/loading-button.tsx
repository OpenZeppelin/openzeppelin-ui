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
  loading?: boolean;
}

const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (
    { className, loading = false, children, disabled, variant, size, asChild = false, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        data-slot="button"
        data-variant={variant || 'default'}
        data-size={size || 'default'}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={loading || disabled}
        {...props}
      >
        {loading && <Spinner className="mr-2" />}
        <Slottable>{children}</Slottable>
      </Comp>
    );
  }
);
LoadingButton.displayName = 'LoadingButton';

export { LoadingButton };
