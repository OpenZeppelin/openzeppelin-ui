import { AlertCircle, AlertTriangle, Check, Circle, Loader2 } from 'lucide-react';
import * as React from 'react';

import { cn } from '@openzeppelin/ui-utils';

/**
 * State of a {@link TimelineItem}. `warning` is for a step that is paused or stopped but has
 * not failed.
 */
export type TimelineTone = 'pending' | 'active' | 'success' | 'warning' | 'failure';

export interface TimelineItem {
  /** Stable key for the item. Defaults to the item's index. */
  key?: string;
  /** Step title. */
  label: React.ReactNode;
  /** Optional supporting text under the label. */
  description?: React.ReactNode;
  /** @default 'pending' */
  tone?: TimelineTone;
  /**
   * Replaces the default status text ("Pending", "In progress", "Completed", "Paused",
   * "Failed") that screen readers hear after the label. An empty string renders no status text.
   */
  statusLabel?: string;
}

export interface TimelineProps extends Omit<React.HTMLAttributes<HTMLOListElement>, 'children'> {
  /** Steps in display order. */
  items: readonly TimelineItem[];
}

const TONE_TEXT: Record<TimelineTone, string> = {
  pending: 'Pending',
  active: 'In progress',
  success: 'Completed',
  warning: 'Paused',
  failure: 'Failed',
};

const TONE_MARKER: Record<TimelineTone, string> = {
  pending: 'bg-muted text-muted-foreground',
  active: 'bg-selected text-selected-foreground ring-2 ring-selected/30',
  success: 'bg-selected/10 text-selected ring-1 ring-selected/40',
  warning: 'bg-warning/20 text-foreground ring-1 ring-warning/60',
  failure: 'bg-destructive/10 text-destructive ring-1 ring-destructive/40',
};

function ToneIcon({ tone }: { tone: TimelineTone }): React.ReactElement {
  switch (tone) {
    case 'active':
      return <Loader2 className="size-3.5 motion-safe:animate-spin" />;
    case 'success':
      return <Check className="size-3.5" />;
    case 'warning':
      return <AlertTriangle className="size-3.5" />;
    case 'failure':
      return <AlertCircle className="size-3.5" />;
    case 'pending':
      return <Circle className="size-3" />;
  }
}

/**
 * Ordered steps with a tone each (pending, active, success, warning, failure), for deploy or job
 * progress. Tone is shown by an icon and exposed as visually hidden status text, so it does
 * not rely on colour. The list is an `ol`; the active step carries `aria-current="step"`.
 */
export const Timeline = React.forwardRef<HTMLOListElement, TimelineProps>(
  ({ items, className, ...props }, ref) => (
    <ol ref={ref} className={cn('flex flex-col', className)} {...props}>
      {items.map((item, index) => {
        const tone = item.tone ?? 'pending';
        const isLast = index === items.length - 1;
        // An explicit empty statusLabel opts out of status text; omitted falls back to the tone's.
        const status = item.statusLabel ?? TONE_TEXT[tone];
        return (
          <li
            key={item.key ?? index}
            data-tone={tone}
            aria-current={tone === 'active' ? 'step' : undefined}
            className="relative flex gap-3 pb-6 last:pb-0"
          >
            {!isLast && (
              <span aria-hidden="true" className="absolute left-3 top-6 bottom-0 w-px bg-border" />
            )}
            <span
              aria-hidden="true"
              className={cn(
                'z-10 flex size-6 shrink-0 items-center justify-center rounded-full',
                TONE_MARKER[tone]
              )}
            >
              <ToneIcon tone={tone} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="text-sm font-medium">
                {item.label}
                {status !== '' && <span className="sr-only">{`: ${status}`}</span>}
              </div>
              {item.description !== undefined && item.description !== null && (
                <div className="text-sm text-muted-foreground">{item.description}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  )
);
Timeline.displayName = 'Timeline';
