import * as React from 'react';

import { cn } from '@openzeppelin/ui-utils';

export interface SpinnerProps extends Omit<React.SVGAttributes<SVGSVGElement>, 'children'> {
  /**
   * Accessible label. When set, the spinner is wrapped in a `role="status"` span whose
   * text is this label (visually hidden), so screen readers have status text to read; the
   * `<svg>` itself stays hidden. When omitted, the spinner is decorative (`aria-hidden`),
   * which suits spinners that sit next to visible text such as a button label.
   */
  label?: string;
}

/**
 * Animated loading spinner. Inherits its color from `currentColor`; size it with `className`.
 */
export const Spinner = ({ label, className, ...props }: SpinnerProps): React.ReactElement => {
  const svg = (
    <svg
      className={cn('h-4 w-4 animate-spin', className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden={true}
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
  if (!label) return svg;
  // A status role on the bare <svg> has no text content, which many screen readers skip. The
  // wrapper keeps the label as its name too (a status is not named by its content).
  return (
    <span role="status" aria-label={label} className="inline-flex">
      {svg}
      <span className="sr-only">{label}</span>
    </span>
  );
};
Spinner.displayName = 'Spinner';
