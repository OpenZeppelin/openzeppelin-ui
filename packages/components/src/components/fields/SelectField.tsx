import React from 'react';
import { Controller, FieldValues } from 'react-hook-form';

import { cn } from '@openzeppelin/ui-utils';

import { FieldLabelRow } from './utils/FieldLabelRow';
import { getReadOnlyState } from './utils/readOnlyState';

import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { BaseFieldProps, LabelEndProps, ReadOnlyModeProps } from './BaseField';
import { ErrorMessage, getAccessibilityProps, getRequiredMessage, runCustomCheck } from './utils';

/**
 * Option item for select fields
 */
export interface SelectOption {
  /**
   * Value to be submitted with the form
   */
  value: string;

  /**
   * Display label for the option
   */
  label: string;

  /**
   * Whether this option is disabled
   */
  disabled?: boolean;
}

/**
 * SelectField component properties
 */
export interface SelectFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues>,
    LabelEndProps,
    ReadOnlyModeProps {
  /**
   * Available options for selection
   */
  options?: SelectOption[];

  /**
   * Custom validation function for select values
   */
  validateSelect?: (value: string) => boolean | string;

  /**
   * Optional default value used when the field has no value yet
   */
  defaultValue?: string;
}

/**
 * Select dropdown field component specifically designed for React Hook Form integration.
 *
 * Architecture flow:
 * 1. Form schemas are generated from contract functions using adapters
 * 2. TransactionForm renders the overall form structure with React Hook Form
 * 3. DynamicFormField selects the appropriate field component based on field type
 * 4. BaseField provides consistent layout and hook form integration
 * 5. This component handles radio-specific rendering and validation
 *
 * The component includes:
 * - Integration with React Hook Form
 * - Customizable options list
 * - Horizontal or vertical layout options
 * - Customizable validation through adapter integration
 * - Automatic error handling and reporting
 * - Full accessibility support with ARIA attributes
 *
 * Read-only: `readOnly` is ignored unless `readOnlyMode="readonly"` is set, as it was before
 * `readOnlyMode` existed. With both, the trigger stays focusable and in the tab order, the list
 * never opens, no user act changes the value, the value stays in `handleSubmit` data, and the
 * trigger is reported read-only (`aria-readonly` plus a visually hidden "Read-only" description).
 */
export function SelectField<TFieldValues extends FieldValues = FieldValues>({
  id,
  label,
  labelEnd,
  placeholder = 'Select an option',
  helperText,
  control,
  name,
  width = 'full',
  validation,
  options = [],
  validateSelect,
  defaultValue,
  readOnly,
  readOnlyMode,
}: SelectFieldProps<TFieldValues>): React.ReactElement {
  const isRequired = !!validation?.required;
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;
  const readOnlyDescriptionId = `${id}-readonly`;

  // Without the explicit opt-in, `readOnly` is ignored exactly as before
  // (`getReadOnlyState` gets `undefined`), so the Controller sees `disabled: undefined`. With the opt-in,
  // `controllerDisabled` is `false`, so the value stays in `handleSubmit` data.
  const isReadOnlyModeOptIn = readOnlyMode === 'readonly';
  const ro = getReadOnlyState(isReadOnlyModeOptIn ? readOnly : undefined, readOnlyMode);
  const isRO = ro.isFocusableReadOnly;

  // The field owns the list's open state in every mode. Switching Radix between
  // controlled and uncontrolled `open` on each save would log a warning, so it is always controlled.
  const [open, setOpen] = React.useState(false);
  // A list open when read-only turns on closes, and stays closed when it turns off again.
  // Render-time reset of this component's own state (not inside the Controller render prop).
  if (isRO && open) setOpen(false);
  const handleOpenChange = (next: boolean): void => {
    // Every Radix open path (pointer, touch, pen, label click, Enter, Space, arrows)
    // ends here; refuse it while read-only. Closing is always applied.
    if (next && isRO) return;
    setOpen(next);
  };

  // Determine width values
  const widthPercentage = width === 'full' ? '100%' : width === 'half' ? '50%' : '33.333%';
  const widthClass = width === 'full' ? 'w-full' : width === 'half' ? 'w-1/2' : 'w-1/3';

  return (
    <div className={cn('flex flex-col gap-2', widthClass)} style={{ width: widthPercentage }}>
      {label && (
        <FieldLabelRow labelEnd={labelEnd}>
          <Label htmlFor={id}>
            {label} {isRequired && <span className="text-destructive">*</span>}
          </Label>
        </FieldLabelRow>
      )}

      <Controller
        control={control}
        name={name}
        disabled={ro.controllerDisabled}
        defaultValue={defaultValue as unknown as undefined}
        rules={{
          validate: (value) => {
            // Handle required validation explicitly
            if (value === undefined || value === null || value === '') {
              return validation?.required ? getRequiredMessage(validation) : true;
            }

            // Run custom validation if provided
            if (validateSelect && value) {
              const validation = validateSelect(value);
              if (validation !== true && typeof validation === 'string') {
                return validation;
              }
            }

            return runCustomCheck(value, validation);
          },
        }}
        render={({ field, fieldState: { error } }) => {
          const hasError = !!error;

          const describedBy = getAccessibilityProps({
            id,
            hasError,
            hasHelperText: !!helperText,
          })['aria-describedby'];

          // Get accessibility attributes
          const accessibilityAttrs = {
            'aria-invalid': hasError,
            'aria-required': isRequired,
            // The read-only id goes last, after the error and helper ids, and only
            // while its element is rendered. Default mode passes the same value as before.
            'aria-describedby': isRO
              ? [describedBy, readOnlyDescriptionId].filter(Boolean).join(' ')
              : describedBy,
          };

          // Ensure we properly handle the onValueChange event
          const handleValueChange = (newValue: string): void => {
            // Closed-trigger typeahead and a `change` on Radix's hidden native
            // <select> both commit through here without opening the list. Drop them while read-only.
            if (isRO) return;
            field.onChange(newValue);
          };

          // The Root is always controlled ('' shows the placeholder, like `undefined`), so the
          // shown text is always the form value. With an `undefined` value Radix would keep its
          // own uncontrolled value: a read-only typeahead could change it on screen even though
          // `handleValueChange` drops it, and Radix Select would log an
          // uncontrolled-to-controlled warning on the first pick in an empty field.
          const rootValue = field.value ?? '';

          return (
            <>
              <Select
                defaultValue={field.value}
                onValueChange={handleValueChange}
                value={rootValue}
                open={open && !isRO}
                onOpenChange={handleOpenChange}
              >
                <SelectTrigger
                  id={id}
                  ref={field.ref}
                  {...accessibilityAttrs}
                  // Reported read-only, never disabled. `data-readonly` keys
                  // the read-only look on SelectTrigger.
                  aria-readonly={isRO || undefined}
                  data-readonly={isRO ? '' : undefined}
                >
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent
                  // Ensure dropdown width matches trigger width
                  style={{
                    width: 'var(--radix-select-trigger-width)',
                    maxWidth: 'var(--radix-select-trigger-width)',
                  }}
                >
                  {options.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No options available
                    </div>
                  ) : (
                    options.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                      >
                        {option.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {/* Chromium exposes read-only on no combobox, so say it in the
                  description. Out of flow (sr-only), so the switch causes no layout shift. */}
              {isRO && (
                <span id={readOnlyDescriptionId} className="sr-only">
                  Read-only
                </span>
              )}

              {/* Display helper text */}
              {helperText && (
                <div id={descriptionId} className="text-muted-foreground text-sm">
                  {helperText}
                </div>
              )}

              {/* Display error message */}
              <ErrorMessage error={error} id={errorId} />
            </>
          );
        }}
      />
    </div>
  );
}

// Set displayName manually for better debugging
SelectField.displayName = 'SelectField';
