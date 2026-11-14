import * as React from 'react';

import { cn } from '@openzeppelin/ui-utils';

export interface DescriptionListItem {
  /** Term shown for the pair. */
  label: React.ReactNode;
  /** Definition shown for the pair. May be any node, including kit components. */
  value: React.ReactNode;
  /** Stable key for the pair. Defaults to the pair's index. */
  key?: string;
  /**
   * When true in a multi-column list, the pair spans the full row. In a single-column list
   * the pair is already full width, so this is a no-op.
   */
  span?: boolean;
}

/** How a label sits relative to its value. */
export type DescriptionListLayout = 'inline' | 'stacked';

/** Number of columns the pairs are laid out in on wide viewports. */
export type DescriptionListColumns = 1 | 2 | 3 | 4 | 5;

/** Inline alignment of each value within its pair. */
export type DescriptionListValueAlign = 'start' | 'end';

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
  /**
   * `inline` stacks the value under its label on narrow widths and puts them side by side
   * from the `sm` breakpoint up. `stacked` keeps the label above its value at every width.
   * @default 'inline'
   */
  layout?: DescriptionListLayout;
  /**
   * Lays the pairs out in this many columns on wide viewports. Below `sm` every list is a
   * single column. Multi-column lists separate pairs with spacing and a vertical rule between
   * columns instead of row dividers.
   * @default 1
   */
  columns?: DescriptionListColumns;
  /**
   * Aligns each value to the start or the end of its pair.
   * @default 'start'
   */
  valueAlign?: DescriptionListValueAlign;
  /**
   * When `columns` is `1`, draws a horizontal rule between pairs. Set to `false` for a
   * single-column list without rules. Multi-column lists ignore this and use vertical rules
   * between columns instead.
   * @default true
   */
  dividers?: boolean;
}

const isPresent = (node: React.ReactNode): boolean =>
  node !== undefined && node !== null && node !== false && node !== '';

// Literal class strings so Tailwind's source scan picks them up. A single-column list keeps
// optional row dividers; a grid of pairs uses gaps plus a vertical rule between columns.
const MULTI_COLUMN_LIST_CLASSES: Record<Exclude<DescriptionListColumns, 1>, string> = {
  2: 'grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2',
  3: 'grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  5: 'grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
};

// Half of `gap-x-8` so the rule sits in the middle of the column gap. `sm:` for two columns
// (full count from `sm`); `lg:` when the full count only lands at `lg` (3–5).
const COLUMN_RULE_CLASSES: Record<Exclude<DescriptionListColumns, 1>, string> = {
  2: 'relative sm:before:absolute sm:before:inset-y-0 sm:before:-left-4 sm:before:w-px sm:before:bg-border',
  3: 'relative lg:before:absolute lg:before:inset-y-0 lg:before:-left-4 lg:before:w-px lg:before:bg-border',
  4: 'relative lg:before:absolute lg:before:inset-y-0 lg:before:-left-4 lg:before:w-px lg:before:bg-border',
  5: 'relative lg:before:absolute lg:before:inset-y-0 lg:before:-left-4 lg:before:w-px lg:before:bg-border',
};

interface PairLayoutMeta {
  spanFull: boolean;
  showColumnRule: boolean;
}

/**
 * Tracks visual column index at the widest breakpoint so vertical rules and full-row spans
 * stay aligned with CSS grid auto-placement (a mid-row span wraps to the next row).
 */
function pairLayoutMeta(
  items: readonly DescriptionListItem[],
  columns: Exclude<DescriptionListColumns, 1>
): PairLayoutMeta[] {
  let col = 0;
  return items.map((item) => {
    const spanFull = item.span === true;
    if (spanFull && col !== 0) {
      col = 0;
    }
    const showColumnRule = !spanFull && col > 0;
    col = spanFull ? 0 : (col + 1) % columns;
    return { spanFull, showColumnRule };
  });
}

/**
 * Label/value pairs as a semantic description list (`dl` / `dt` / `dd`). Each label is
 * exposed as a term and each value as its definition. By default the value stacks under
 * its label on narrow widths and sits beside it from the `sm` breakpoint up; `layout`,
 * `columns`, `valueAlign` and `dividers` change that for review and summary screens.
 */
export const DescriptionList = React.forwardRef<HTMLDListElement, DescriptionListProps>(
  (
    {
      items,
      emptyValue = '—',
      layout = 'inline',
      columns = 1,
      valueAlign = 'start',
      dividers = true,
      className,
      ...props
    },
    ref
  ) => {
    // An unknown `columns` from untyped callers falls back to the single-column list.
    const multiColumnClasses =
      columns === 2 || columns === 3 || columns === 4 || columns === 5
        ? MULTI_COLUMN_LIST_CLASSES[columns]
        : undefined;
    const columnCount =
      columns === 2 || columns === 3 || columns === 4 || columns === 5 ? columns : undefined;
    const isInline = layout !== 'stacked';
    const showRowDividers = !multiColumnClasses && dividers !== false;
    const layoutMeta = columnCount ? pairLayoutMeta(items, columnCount) : undefined;

    return (
      <dl
        ref={ref}
        className={cn(multiColumnClasses ?? (showRowDividers ? 'divide-y' : undefined), className)}
        {...props}
      >
        {items.map((item, index) => {
          const meta = layoutMeta?.[index];
          const pairClassName = cn(
            'flex flex-col gap-1',
            // Grid gaps space a multi-column list; `min-w-0` lets long values wrap in a narrow track.
            multiColumnClasses ? 'min-w-0' : 'py-3 first:pt-0 last:pb-0',
            // Content-sized label track + flexible value (replaces a fixed 1/3 + 2/3 split).
            isInline && 'sm:grid sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-4',
            meta?.spanFull && 'col-span-full',
            meta?.showColumnRule && columnCount && COLUMN_RULE_CLASSES[columnCount]
          );
          const valueClassName = cn(
            'min-w-0 break-words text-sm',
            // An auto start margin pushes the value to the end in both the flex column and the
            // grid track, block-level children included; `max-w-full` keeps a long value wrapping.
            valueAlign === 'end' && 'ms-auto max-w-full text-end'
          );

          return (
            <div key={item.key ?? index} className={pairClassName}>
              <dt className="text-sm text-muted-foreground">{item.label}</dt>
              <dd className={valueClassName}>{isPresent(item.value) ? item.value : emptyValue}</dd>
            </div>
          );
        })}
      </dl>
    );
  }
);
DescriptionList.displayName = 'DescriptionList';
