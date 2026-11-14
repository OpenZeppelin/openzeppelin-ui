import React from 'react';
import { Controller, FieldValues } from 'react-hook-form';

import { cn } from '@openzeppelin/ui-utils';

import { FieldLabelRow } from './utils/FieldLabelRow';
import { getReadOnlyState } from './utils/readOnlyState';

import { Label } from '../ui/label';
import {
  SearchableMultiSelect,
  type SearchableMultiSelectProps,
} from '../ui/searchable-multi-select';
import { BaseFieldProps, LabelEndProps, ReadOnlyModeProps } from './BaseField';
import { ErrorMessage, getAccessibilityProps, getRequiredMessage, runCustomCheck } from './utils';

const INVALID_SELECTION_MESSAGE = 'Invalid selection';

// One frozen empty list, so a non-array form value always maps to the same
// reference and the selection memo is not rebuilt on every render. It never enters form
// state: the field only writes arrays the picker emits, and those are always fresh.
const EMPTY_IDS: readonly string[] = Object.freeze([]);

/** The only reading of the form value, shared by the display and the rules. */
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
    ReadOnlyModeProps,
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
 * touched; leaving the control does.
 *
 * Read-only works as in the other fields. By default `readOnly` disables the
 * field: the trigger is disabled and the value is left out of `handleSubmit`
 * data. With `readOnlyMode="readonly"` the trigger stays focusable and in the
 * tab order, the list never opens, the value stays in `handleSubmit` data, and
 * the trigger has a hidden "Read-only" description.
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
  readOnly,
  readOnlyMode,
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
  // Name the trigger, listbox and dialog after the label, only when there is one (A1).
  const labelledBy = label ? labelId : undefined;
  // Read-only pattern: the default mode disables through RHF (value dropped from submit data);
  // readonly mode keeps the Controller enabled and blocks the list instead.
  const ro = getReadOnlyState(readOnly, readOnlyMode);

  // Mirrors the picker's effective open state. Opening moves focus from the trigger
  // to the search box, and that blur must not reach RHF. The picker reports the open before focus
  // moves, and reports every close (forced ones after commit), so this is never stale.
  const openRef = React.useRef(false);

  // A label mousedown blurs a focused trigger before the label's click
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
        disabled={ro.controllerDisabled}
        // Rebuilt every render, so a changed `required` or `validateSelection` applies.
        rules={{
          validate: (value) => {
            const ids = toIds(value);
            // Empty, nullish and non-array values all fail required.
            if (ids.length === 0) return isRequired ? getRequiredMessage(validation) : true;
            if (validateSelection) {
              // Checks the array that will be submitted; never an empty message (A3).
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
                // The form ref focuses the trigger.
                ref={field.ref}
                id={id}
                items={items}
                getItemId={getItemId}
                getItemLabel={getItemLabel}
                filterItem={filterItem}
                // Display reads the same normalised ids the rules read.
                selectedIds={toIds(field.value)}
                // The emitted array goes to the form as is. No other write path.
                onSelectionChange={field.onChange}
                placeholder={placeholder}
                searchPlaceholder={searchPlaceholder}
                searchLabel={searchLabel}
                emptyText={emptyText}
                formatSelectedCount={formatSelectedCount}
                formatSelectionSummary={formatSelectionSummary}
                clearAllLabel={clearAllLabel}
                disabled={ro.controlProps.disabled}
                readOnly={ro.isFocusableReadOnly}
                onOpenChange={(open) => {
                  openRef.current = open;
                }}
                // Touched means focus left the control, not that the picker opened.
                onBlur={() => {
                  if (!openRef.current) field.onBlur();
                }}
                // Field state goes on the trigger only.
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
