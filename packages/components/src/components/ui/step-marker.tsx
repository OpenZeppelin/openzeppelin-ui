import { AlertCircle, Check, Pencil } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@openzeppelin/ui-utils';

/** Visual state of a {@link StepMarker}. */
export type StepMarkerState = 'completed' | 'current' | 'visited' | 'invalid' | 'upcoming';

export interface StepMarkerProps extends Omit<ComponentPropsWithoutRef<'span'>, 'children'> {
  /** Visual state. `completed`, `visited` and `invalid` show an icon; the others show the number. */
  state: StepMarkerState;
  /** One-based number shown for the `current` and `upcoming` states. */
  number: number;
}

/**
 * The numbered circle used by the wizard stepper, for numbered rows in tables and review lists.
 * It is decorative on its own: when it is the only cue for a state, name the row or pass
 * `aria-label` (and `role="img"`).
 */
export function StepMarker({ state, number, className, ...rest }: StepMarkerProps) {
  return (
    <span
      {...rest}
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all',
        state === 'completed' && 'bg-selected text-selected-foreground',
        state === 'current' && 'bg-selected text-selected-foreground ring-2 ring-selected/30',
        state === 'visited' && 'bg-selected/10 text-selected ring-1 ring-selected/40',
        state === 'invalid' && 'bg-destructive/10 text-destructive ring-1 ring-destructive/40',
        state === 'upcoming' && 'bg-muted text-muted-foreground',
        className
      )}
    >
      {state === 'completed' ? (
        <Check className="size-3.5" />
      ) : state === 'visited' ? (
        <Pencil className="size-3" />
      ) : state === 'invalid' ? (
        <AlertCircle className="size-3.5" />
      ) : (
        number
      )}
    </span>
  );
}
