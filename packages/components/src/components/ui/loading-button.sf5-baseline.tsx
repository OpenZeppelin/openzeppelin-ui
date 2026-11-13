/**
 * Baseline: `LoadingButton` exactly as it was before loading stopped setting native `disabled`
 * (`git show 8424e7228:packages/components/src/components/ui/loading-button.tsx`), with only
 * the component and props renamed. Loading set native `disabled` here. Test fixture only;
 * never exported from the package.
 */
import { Slot, Slottable } from '@radix-ui/react-slot';
import { type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@openzeppelin/ui-utils';

import { buttonVariants } from '../../utils/button-variants';
import { Spinner } from './spinner';

export interface BaselineLoadingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const BaselineLoadingButton = React.forwardRef<HTMLButtonElement, BaselineLoadingButtonProps>(
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
BaselineLoadingButton.displayName = 'BaselineLoadingButton';

export { BaselineLoadingButton };
