import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as React from 'react';

import { cn } from '@openzeppelin/ui-utils';

type SwitchProps = React.ComponentProps<typeof SwitchPrimitive.Root> & {
  /**
   * Read-only: the switch stays focusable and in full colour, exposes `aria-readonly="true"`,
   * and ignores click, Space, Enter and label clicks, so `onCheckedChange` never fires. Its
   * value still submits with a native form, and `required` is dropped so it can't block
   * submission. `disabled` wins when both are set.
   */
  readonly readOnly?: boolean;
};

/**
 * Switch component wrapping the Radix UI Switch primitive.
 * Exposes `role="switch"` with `aria-checked`, toggles on click and Space, and
 * ignores input when `disabled`. With `readOnly` it stays focusable and in full
 * colour, reports `aria-readonly`, and ignores input. Name it with a
 * `<Label htmlFor>` or `aria-label`.
 */
function Switch({ className, readOnly, onClick, ...props }: SwitchProps): React.ReactElement {
  // Disabled wins: a disabled switch is reported disabled only, never read-only.
  const isReadOnly = readOnly === true && props.disabled !== true;
  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    onClick?.(event);
    // Click, Space, Enter and label clicks all arrive here as one click. Radix composes this
    // handler before its toggle and skips the toggle when the event is default-prevented.
    if (isReadOnly) event.preventDefault();
  };

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer data-[state=checked]:bg-selected data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
      // Set after the spread so only `readOnly` decides these; a consumer's own
      // aria-readonly can't announce a state that doesn't block input.
      aria-readonly={isReadOnly || undefined}
      // A read-only control is barred from constraint validation, as in HTML: a required,
      // unchecked read-only switch must not block a form the user can't fix.
      required={isReadOnly ? undefined : props.required}
      onClick={handleClick}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="bg-background pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
