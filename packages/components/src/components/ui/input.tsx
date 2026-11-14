import * as React from 'react';

import { cn } from '@openzeppelin/ui-utils';

/**
 * Input component that follows shadcn/ui styling and accessibility patterns.
 *
 * Read-only look: pass `readOnly` together with `data-readonly` (`<Input readOnly data-readonly />`)
 * for the kit's focusable read-only style (muted fill, full-contrast text). A plain
 * `<Input readOnly>` keeps the editable look.
 */
export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        data-slot="input"
        className={cn(
          'border-input bg-background ring-offset-background focus-visible:ring-ring placeholder:text-muted-foreground h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          // SF-19 INV-3 / INV-4: the read-only look, only on `[data-readonly]:read-only:not(:disabled)`.
          // Leaves the border, the error styling and the focus ring alone.
          'data-readonly:read-only:not-disabled:bg-muted data-readonly:read-only:not-disabled:text-foreground data-readonly:read-only:not-disabled:opacity-100 data-readonly:read-only:not-disabled:cursor-default',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
