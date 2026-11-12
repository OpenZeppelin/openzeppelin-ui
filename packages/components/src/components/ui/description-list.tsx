import * as React from 'react';

import { cn } from '@openzeppelin/ui-utils';

export interface DescriptionListItem {
  /** Term shown for the pair. */
  label: React.ReactNode;
  /** Definition shown for the pair. May be any node, including kit components. */
  value: React.ReactNode;
  /** Stable key for the pair. Defaults to the pair's index. */
  key?: string;
}

export interface DescriptionListProps
  extends Omit<React.HTMLAttributes<HTMLDListElement>, 'children'> {
  /** Label/value pairs, rendered in order. */
  items: readonly DescriptionListItem[];
  /**
   * Shown in place of an empty value (`undefined`, `null`, `false` or `''`) so the pair
   * keeps its place and structure.
   * @default '—'
   */
  emptyValue?: React.ReactNode;
}

const isPresent = (node: React.ReactNode): boolean =>
  node !== undefined && node !== null && node !== false && node !== '';

/**
 * Label/value pairs as a semantic description list (`dl` / `dt` / `dd`). Each label is
 * exposed as a term and each value as its definition. On narrow widths the value stacks
 * under its label; from the `sm` breakpoint up they sit side by side.
 */
export const DescriptionList = React.forwardRef<HTMLDListElement, DescriptionListProps>(
  ({ items, emptyValue = '—', className, ...props }, ref) => (
    <dl ref={ref} className={cn('divide-y', className)} {...props}>
      {items.map((item, index) => (
        <div
          key={item.key ?? index}
          className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:grid sm:grid-cols-3 sm:gap-4"
        >
          <dt className="text-sm text-muted-foreground">{item.label}</dt>
          <dd className="min-w-0 break-words text-sm sm:col-span-2">
            {isPresent(item.value) ? item.value : emptyValue}
          </dd>
        </div>
      ))}
    </dl>
  )
);
DescriptionList.displayName = 'DescriptionList';
