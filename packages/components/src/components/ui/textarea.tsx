import * as React from 'react';

import { cn } from '@openzeppelin/ui-utils';

/**
 * Read-only look: pass `readOnly` together with `data-readonly` (`<Textarea readOnly data-readonly />`)
 * for the kit's focusable read-only style (muted fill, full-contrast text). A plain
 * `<Textarea readOnly>` keeps the editable look.
 */
export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        data-slot="textarea"
        className={cn(
          'border-input bg-background ring-offset-background focus-visible:ring-ring placeholder:text-muted-foreground aria-invalid:ring-destructive/20 aria-invalid:border-destructive dark:aria-invalid:ring-destructive/40 min-h-16 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
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
Textarea.displayName = 'Textarea';

export { Textarea };
