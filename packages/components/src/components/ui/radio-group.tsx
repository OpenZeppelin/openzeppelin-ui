import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Circle } from 'lucide-react';
import * as React from 'react';

import { cn } from '@openzeppelin/ui-utils';

/**
 * Presentation of a RadioGroup's items. `default` is the classic circle; `card` is a selectable
 * card; `segmented` is a single-row segmented control meant for two or three short options.
 */
export type RadioGroupVariant = 'default' | 'card' | 'segmented';

const RadioGroupVariantContext = React.createContext<RadioGroupVariant>('default');

export interface RadioGroupProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> {
  /** Item presentation, shared by every item in the group. Defaults to `default`. */
  variant?: RadioGroupVariant;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <RadioGroupVariantContext.Provider value={variant}>
        <RadioGroupPrimitive.Root
          className={cn(
            variant === 'segmented'
              ? 'bg-muted inline-flex w-full flex-row items-stretch gap-1 rounded-lg p-1'
              : 'flex flex-col space-y-2',
            className
          )}
          data-slot="radiogroup"
          data-variant={variant === 'default' ? undefined : variant}
          {...props}
          ref={ref}
        />
      </RadioGroupVariantContext.Provider>
    );
  }
);
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

export interface RadioGroupItemProps
  extends Omit<React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>, 'title'> {
  /**
   * Card variant: the card's title and accessible name. Segmented variant: label fallback when no
   * children. Default variant: a string is set as the native `title` attribute (a tooltip), as before.
   */
  title?: React.ReactNode;
  /** Card variant only: supporting text under the title. It is the item's accessible description. */
  description?: React.ReactNode;
}

const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ className, title, description, children, ...props }, ref) => {
    const variant = React.useContext(RadioGroupVariantContext);
    const baseId = React.useId();

    if (variant === 'segmented') {
      // The label lives inside the button, so it is the accessible name without extra aria wiring.
      // Segments never wrap: each takes an equal share and truncates its label (overflow rule).
      return (
        <RadioGroupPrimitive.Item
          ref={ref}
          data-variant="segmented"
          className={cn(
            'text-muted-foreground hover:text-foreground focus-visible:ring-ring data-[state=checked]:bg-background data-[state=checked]:text-foreground min-w-0 flex-1 truncate rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:shadow-sm',
            className
          )}
          {...props}
        >
          {children ?? title}
        </RadioGroupPrimitive.Item>
      );
    }

    if (variant === 'card') {
      const titleId = `${baseId}-title`;
      const descriptionId = `${baseId}-description`;
      const hasTitle = title !== undefined && title !== null;
      const hasDescription = description !== undefined && description !== null;

      return (
        <RadioGroupPrimitive.Item
          ref={ref}
          aria-labelledby={hasTitle ? titleId : undefined}
          aria-describedby={hasDescription ? descriptionId : undefined}
          data-variant="card"
          className={cn(
            'border-muted-foreground bg-background hover:bg-accent focus-visible:ring-ring data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 flex w-full items-start gap-3 rounded-lg border-2 p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-background',
            className
          )}
          {...props}
        >
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground">
            <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
              <Circle className="text-selected h-2.5 w-2.5 fill-current" />
            </RadioGroupPrimitive.Indicator>
          </span>
          <span className="grid gap-0.5">
            {/* A 20px row: its centre (10px) matches the radio's (mt-0.5 + 16px box), and a
                20px chip such as a default Badge fits without growing the card. A long title
                wraps, and the radio stays level with its first line. */}
            {hasTitle && (
              <span
                id={titleId}
                className="flex min-h-5 flex-wrap items-center gap-x-2 text-sm font-medium"
              >
                {title}
              </span>
            )}
            {hasDescription && (
              <span id={descriptionId} className="text-muted-foreground text-sm">
                {description}
              </span>
            )}
            {children}
          </span>
        </RadioGroupPrimitive.Item>
      );
    }

    return (
      <RadioGroupPrimitive.Item
        ref={ref}
        // The default variant kept the native `title` before `title` became a ReactNode slot.
        title={typeof title === 'string' ? title : undefined}
        className={cn(
          'border-muted-foreground bg-background text-selected h-4 w-4 rounded-full border shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      >
        <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
          <Circle className="h-2.5 w-2.5 fill-current text-current" />
        </RadioGroupPrimitive.Indicator>
      </RadioGroupPrimitive.Item>
    );
  }
);
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
