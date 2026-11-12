import React from 'react';
import { Controller, FieldValues } from 'react-hook-form';

import { cn } from '@openzeppelin/ui-utils';

import { FieldLabelRow } from './utils/FieldLabelRow';

import { Label } from '../ui/label';
import {
  SearchableMultiSelect,
  type SearchableMultiSelectProps,
} from '../ui/searchable-multi-select';
import { BaseFieldProps, LabelEndProps } from './BaseField';
import { ErrorMessage, getAccessibilityProps, getRequiredMessage, runCustomCheck } from './utils';

const INVALID_SELECTION_MESSAGE = 'Invalid selection';

// INV-9, INV-22: one frozen empty list, so a non-array form value always maps to the same
// reference and SF-15's selection memo is not rebuilt on every render. It never enters form
// state: the field only writes arrays SF-15 emits, and those are always fresh.
const EMPTY_IDS: readonly string[] = Object.freeze([]);

/** INV-9: the only reading of the form value, shared by the display and the rules. */
function toIds(value: unknown): readonly string[] {
  return Array.isArray(value) ? (value as string[]) : EMPTY_IDS;
}

/**
 * Props for {@link SearchableMultiSelectField}. The form value at `name` is
 * `string[]`: the selected item ids, in selection order.
 */
export interface SearchableMultiSelectFieldProps<
  TItem,
  TFieldValues extends FieldValues = FieldValues,
> extends BaseFieldProps<TFieldValues>,
    LabelEndProps,
    Pick<
      SearchableMultiSelectProps<TItem>,
      | 'items'
      | 'getItemId'
      | 'getItemLabel'
      | 'filterItem'
      | 'searchPlaceholder'
      | 'searchLabel'
      | 'emptyText'
      | 'formatSelectedCount'
      | 'formatSelectionSummary'
      | 'clearAllLabel'
    > {
  /**
   * Extra rule, run after the required check and only for a non-empty selection.
   * Return `true` when valid, an error message string when not. `false` or an
   * empty string shows 'Invalid selection'.
   */
  validateSelection?: (ids: readonly string[]) => boolean | string;
}

/**
 * Searchable multi-select bound to React Hook Form. The form value is the
 * selected item ids (`string[]`) in selection order: new picks are appended,
 * removed picks leave the rest in place, Clear all gives `[]`. Ids with no
 * matching item are kept and submitted.
 *
 * The form ref lands on the trigger button, so focus-on-first-error and
 * `setFocus(name)` focus it. Opening the picker does not mark the field
 * touched; leaving the control does. `readOnly` disables the trigger and keeps
 * the value in the submitted data.
 */
export function SearchableMultiSelectField<TItem, TFieldValues extends FieldValues = FieldValues>({
  id,
  label,
  labelEnd,
  placeholder,
  helperText,
  control,
  name,
  width = 'full',
  validation,
  readOnly = false,
  items,
  getItemId,
  getItemLabel,
  filterItem,
  searchPlaceholder,
  searchLabel,
  emptyText,
  formatSelectedCount,
  formatSelectionSummary,
  clearAllLabel,
  validateSelection,
}: SearchableMultiSelectFieldProps<TItem, TFieldValues>): React.ReactElement {
  const isRequired = !!validation?.required;
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;
  // INV-25: name the trigger, listbox and dialog after the label, only when there is one (A1).
  const labelledBy = label ? labelId : undefined;

  // INV-15, INV-16: mirrors SF-15's effective open state. Opening moves focus from the trigger
  // to the search box, and that blur must not reach RHF. SF-15 reports the open before focus
  // moves, and reports every close (forced ones after commit), so this is never stale.
  const openRef = React.useRef(false);

  // INV-15 (Tests F1): a label mousedown blurs a focused trigger before the label's click
  // reopens it, so that blur would pass the gate while it is still closed. Keeping focus on the
  // trigger removes the blur; the click still activates the trigger through `htmlFor`.
  const handleLabelMouseDown = (event: React.MouseEvent<HTMLLabelElement>): void => {
    if (event.currentTarget.control && event.currentTarget.control === document.activeElement) {
      event.preventDefault();
    }
  };

  const widthPercentage = width === 'full' ? '100%' : width === 'half' ? '50%' : '33.333%';
  const widthClass = width === 'full' ? 'w-full' : width === 'half' ? 'w-1/2' : 'w-1/3';

  return (
    <div className={cn('flex flex-col gap-2', widthClass)} style={{ width: widthPercentage }}>
      {label && (
        <FieldLabelRow labelEnd={labelEnd}>
          <Label id={labelId} htmlFor={id} onMouseDown={handleLabelMouseDown}>
            {label} {isRequired && <span className="text-destructive">*</span>}
          </Label>
        </FieldLabelRow>
      )}

      <Controller
        control={control}
        name={name}
        // INV-12: rebuilt every render, so a changed `required` or `validateSelection` applies.
        // `readOnly` never reaches the Controller, so the value stays in the payload (INV-13).
        rules={{
          validate: (value) => {
            const ids = toIds(value);
            // INV-10: empty, nullish and non-array values all fail required.
            if (ids.length === 0) return isRequired ? getRequiredMessage(validation) : true;
            if (validateSelection) {
              // INV-11: checks the array that will be submitted; never an empty message (A3).
              const result = validateSelection(ids);
              if (result !== true) {
                return typeof result === 'string' && result !== ''
                  ? result
                  : INVALID_SELECTION_MESSAGE;
              }
            }
            // A non-empty selection is the stored array itself, passed unchanged.
            return runCustomCheck(value, validation);
          },
        }}
        render={({ field, fieldState: { error } }) => {
          const hasError = !!error;

          return (
            <>
              <SearchableMultiSelect
                // INV-17: the form ref focuses the trigger.
                ref={field.ref}
                id={id}
                items={items}
                getItemId={getItemId}
                getItemLabel={getItemLabel}
                filterItem={filterItem}
                // INV-4, INV-9: display reads the same normalised ids the rules read.
                selectedIds={toIds(field.value)}
                // INV-7, INV-8: the emitted array goes to the form as is. No other write path.
                onSelectionChange={field.onChange}
                placeholder={placeholder}
                searchPlaceholder={searchPlaceholder}
                searchLabel={searchLabel}
                emptyText={emptyText}
                formatSelectedCount={formatSelectedCount}
                formatSelectionSummary={formatSelectionSummary}
                clearAllLabel={clearAllLabel}
                // INV-13 (D7): the component is disabled, never the Controller.
                disabled={readOnly}
                onOpenChange={(open) => {
                  openRef.current = open;
                }}
                // INV-15, INV-16: touched means focus left the control, not that the picker opened.
                onBlur={() => {
                  if (!openRef.current) field.onBlur();
                }}
                // INV-2, INV-3, D10: field state goes on the trigger only.
                aria-labelledby={labelledBy}
                aria-invalid={hasError}
                aria-required={isRequired}
                aria-describedby={
                  getAccessibilityProps({ id, hasError, hasHelperText: !!helperText })[
                    'aria-describedby'
                  ]
                }
              />

              {helperText && (
                <div id={descriptionId} className="text-muted-foreground text-sm">
                  {helperText}
                </div>
              )}

              <ErrorMessage error={error} id={errorId} />
            </>
          );
        }}
      />
    </div>
  );
}

SearchableMultiSelectField.displayName = 'SearchableMultiSelectField';
