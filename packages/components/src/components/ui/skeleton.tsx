import * as React from 'react';

import { cn } from '@openzeppelin/ui-utils';

export type SkeletonShape = 'text' | 'rect' | 'circle';

export interface SkeletonProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /**
   * Shape preset. `text` is a one-line bar, `rect` a block that takes its size from
   * `className`/`style`, `circle` a round block (give it equal width and height).
   * @default 'text'
   */
  shape?: SkeletonShape;
}

const SHAPE_CLASSES: Record<SkeletonShape, string> = {
  text: 'h-4 w-full rounded',
  rect: 'rounded-md',
  circle: 'rounded-full',
};

/**
 * Placeholder block for content that is still loading. Pulses to signal loading, and stays
 * still for users who prefer reduced motion. It is hidden from assistive tech: announce
 * loading once, from the consumer's own status region, rather than per block.
 *
 * Size it to the content it stands in for with `className` or `style`.
 */
export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ shape = 'text', className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'animate-pulse bg-muted motion-reduce:animate-none',
        SHAPE_CLASSES[shape],
        className
      )}
      {...props}
      aria-hidden="true"
    />
  )
);
Skeleton.displayName = 'Skeleton';
