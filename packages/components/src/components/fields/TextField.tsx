import React from 'react';
import { Controller, FieldValues } from 'react-hook-form';

import { FieldLabelRow } from './utils/FieldLabelRow';
import { getReadOnlyState } from './utils/readOnlyState';

import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { BaseFieldProps, LabelEndProps, ReadOnlyModeProps } from './BaseField';
import {
  ErrorMessage,
  getAccessibilityProps,
  getValidationStateClasses,
  handleEscapeKey,
  validateField,
} from './utils';

/**
 * TextField component properties
 */
export interface TextFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues>,
    ReadOnlyModeProps,
    LabelEndProps {
  /**
   * Placeholder text displayed when the field is empty
   */
  placeholder?: string;

  /**
   * Fired with the new value on USER-originated edits only — keystrokes and the
   * Escape-clear — never on programmatic writes (`setValue`/`reset`). This is
   * the discriminator consumers need to tell "the user claimed this field" from
   * "code seeded this field" (e.g. the address book's ENS alias suggestion,
   * SF-5 INV-103/INV-105); RHF's `dirtyFields` cannot express it because any
   * form-wide dirty recompute retroactively marks a seeded value dirty.
   */
  onUserEdit?: (value: string) => void;
}

/**
 * Text input field component specifically designed for React Hook Form integration.
 *
 * Architecture flow:
 * 1. Form schemas are generated from contract functions using adapters
 * 2. TransactionForm renders the overall form structure with React Hook Form
 * 3. DynamicFormField selects the appropriate field component (like TextField) based on field type
 * 4. BaseField provides consistent layout and hook form integration
 * 5. This component handles text-specific rendering and validation
 *
 * The component includes:
 * - Integration with React Hook Form
 * - Text-specific validations (minLength, maxLength, pattern)
 * - Customizable validation through adapter integration
 * - Automatic error handling and reporting
 * - Full accessibility support with ARIA attributes
 * - Keyboard navigation
 */
export function TextField<TFieldValues extends FieldValues = FieldValues>({
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
  onUserEdit,
}: TextFieldProps<TFieldValues>): React.ReactElement {
  const isRequired = !!validation?.required;
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;
  const ro = getReadOnlyState(readOnly, readOnlyMode);

  // Function for validating text values
  const validateTextValue = (value: string): string | true => {
    const validationResult = validateField(value, validation);
    return validationResult === true ? true : (validationResult as string);
  };

  return (
    <div
      className={`flex flex-col gap-2 ${width === 'full' ? 'w-full' : width === 'half' ? 'w-1/2' : 'w-1/3'}`}
    >
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
        rules={{
          validate: (value) => {
            // Handle required validation explicitly
            if (value === undefined || value === null || value === '') {
              return validation?.required ? 'This field is required' : true;
            }

            // Validate text values
            if (typeof value === 'string') {
              return validateTextValue(value);
            }

            return true;
          },
        }}
        disabled={ro.controllerDisabled}
        render={({ field, fieldState: { error, isTouched } }) => {
          const hasError = !!error;
          const shouldShowError = hasError && isTouched;
          const validationClasses = getValidationStateClasses(error, isTouched);

          // Handle input change with validation for required fields
          const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
            const value = e.target.value;
            field.onChange(value);
            onUserEdit?.(value);
            // Note: Validation happens naturally when user leaves the field
            // No need to trigger it programmatically on every change
          };

          // Handle keyboard events
          const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
            // INV-12: no Escape-clear (and no preventDefault) in readonly mode.
            if (e.key === 'Escape' && !ro.isFocusableReadOnly) {
              // Escape-clear is a user edit too — notify with the cleared value.
              handleEscapeKey((value) => {
                field.onChange(value);
                onUserEdit?.(value);
              }, field.value)(e);
              // Note: Validation happens naturally when user leaves the field
              // No need to trigger it programmatically
            }
          };

          // Get accessibility attributes
          const accessibilityProps = getAccessibilityProps({
            id,
            hasError,
            isRequired,
            isReadOnly: ro.isFocusableReadOnly,
            hasHelperText: !!helperText,
          });

          return (
            <>
              <Input
                {...field}
                id={id}
                placeholder={placeholder}
                className={validationClasses}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                data-slot="input"
                value={field.value ?? ''}
                {...accessibilityProps}
                {...ro.controlProps}
              />

              {/* Display helper text */}
              {helperText && (
                <div id={descriptionId} className="text-muted-foreground text-sm">
                  {helperText}
                </div>
              )}

              {/* Display error message */}
              <ErrorMessage
                error={error}
                id={errorId}
                message={shouldShowError ? error?.message : undefined}
              />
            </>
          );
        }}
      />
    </div>
  );
}

// Set displayName manually for better debugging
TextField.displayName = 'TextField';
