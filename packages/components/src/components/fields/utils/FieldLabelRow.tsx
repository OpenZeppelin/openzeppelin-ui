import type { ReactNode } from 'react';

interface FieldLabelRowProps {
  /** Optional content placed at the end of the label row (a chip, a small action). */
  labelEnd?: ReactNode;
  /** The field's `<Label>`. */
  children: ReactNode;
}

/**
 * Lays out a field's label with optional content at the end of the row.
 *
 * `labelEnd` is a sibling of the `<Label>`, never a child, so the control's accessible name stays
 * the label text and clicking the end content does not focus the input. With no `labelEnd` the
 * label renders on its own, exactly as before.
 */
export function FieldLabelRow({ labelEnd, children }: FieldLabelRowProps): ReactNode {
  if (labelEnd === undefined || labelEnd === null || labelEnd === false) return children;

  return (
    <div className="flex items-center justify-between gap-2" data-slot="field-label-row">
      {children}
      <div className="flex shrink-0 items-center gap-2" data-slot="field-label-end">
        {labelEnd}
      </div>
    </div>
  );
}
