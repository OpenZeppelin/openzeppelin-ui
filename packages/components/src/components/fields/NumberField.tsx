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
  getActiveMessages,
  getRequiredMessage,
  getValidationStateClasses,
  handleEscapeKey,
  runCustomCheck,
  validateField,
} from './utils';

/**
 * NumberField component properties
 */
export interface NumberFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues>,
    ReadOnlyModeProps,
    LabelEndProps {
  /**
   * Minimum value validation
   */
  min?: number;

  /**
   * Maximum value validation
   */
  max?: number;

  /**
   * Step value for increment/decrement
   */
  step?: number;

  /**
   * Custom validation function for number values
   */
  validateNumber?: (value: number) => boolean | string;
}

/**
 * Number input field component specifically designed for React Hook Form integration.
 *
 * Architecture flow:
 * 1. Form schemas are generated from contract functions using adapters
 * 2. TransactionForm renders the overall form structure with React Hook Form
 * 3. DynamicFormField selects the appropriate field component (like NumberField) based on field type
 * 4. BaseField provides consistent layout and hook form integration
 * 5. This component handles number-specific rendering and validation
 *
 * The component includes:
 * - Integration with React Hook Form
 * - Numeric-specific validations (min, max, step)
 * - Customizable validation through adapter integration
 * - Automatic error handling and reporting
 * - Full accessibility support with ARIA attributes
 * - Keyboard navigation with arrow keys for numeric increment/decrement
 */
export function NumberField<TFieldValues extends FieldValues = FieldValues>({
  id,
  label,
  labelEnd,
  placeholder,
  helperText,
  control,
  name,
  width = 'full',
  validation,
  min,
  max,
  step = 1,
  validateNumber,
  readOnly,
  readOnlyMode,
}: NumberFieldProps<TFieldValues>): React.ReactElement {
  const isRequired = !!validation?.required;
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;
  const ro = getReadOnlyState(readOnly, readOnlyMode);

  // Create merged validation that includes min/max from props
  const mergedValidation = {
    ...validation,
    min: validation?.min !== undefined ? validation.min : min,
    max: validation?.max !== undefined ? validation.max : max,
  };

  // Regular expressions for number validation
  const NUMBER_REGEX = {
    // Allow optional minus sign, digits, optional decimal point, more digits
    VALID_FORMAT: /^-?\d*\.?\d*$/,
    // Complete number (more strict than the format check)
    COMPLETE_NUMBER: /^-?\d+\.?\d*$/,
  };

  // Common validation for numeric values. `storedValue` is what the form holds,
  // passed to the custom check unchanged rather than the parsed number.
  const validateNumericValue = (value: number, storedValue: unknown): string | true => {
    // Run standard validation. Messages come from the consumer's own rules, so a
    // bound taken from the `min`/`max` props keeps its wording.
    const standardValidation = validateField(
      value,
      mergedValidation,
      getActiveMessages(validation)
    );
    if (standardValidation !== true) return standardValidation as string;

    // Run custom validator if provided
    if (validateNumber) {
      const customValidation = validateNumber(value);
      if (customValidation !== true && typeof customValidation === 'string') {
        return customValidation;
      }
    }

    return runCustomCheck(storedValue, validation);
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
            // Skip validation if empty and check required separately
            if (value === undefined || value === null || value === '') {
              return mergedValidation?.required ? getRequiredMessage(validation) : true;
            }

            // Handle incomplete number inputs
            if (value === '-') {
              return 'Please enter a complete number';
            }

            // Handle decimal point at the end
            if (typeof value === 'string' && value.endsWith('.')) {
              return 'Please enter a complete decimal number';
            }

            // For string values that passed our format check but aren't complete numbers
            if (typeof value === 'string') {
              // Parse the validated string to a number
              const parsedNum = parseFloat(value);
              if (isNaN(parsedNum)) {
                return 'Invalid number'; // Explicitly return error for NaN
              }
              return validateNumericValue(parsedNum, value);
            }

            // For already numeric values
            if (typeof value === 'number') {
              return validateNumericValue(value, value);
            }

            return runCustomCheck(value, validation);
          },
        }}
        disabled={ro.controllerDisabled}
        render={({ field, fieldState: { error, isTouched } }) => {
          const hasError = !!error;
          const shouldShowError = hasError && isTouched;
          const validationClasses = getValidationStateClasses(error, isTouched);

          // Handle input change
          const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
            const rawValue = e.target.value;

            // Check if the input matches our valid number format
            const isValidNumberFormat = NUMBER_REGEX.VALID_FORMAT.test(rawValue);

            if (!isValidNumberFormat && rawValue !== '') {
              // Don't update the field value for invalid formats
              // This prevents entering invalid characters
              return;
            }

            // For valid format or empty string
            if (rawValue === '') {
              // Empty value
              field.onChange('');
            } else if (rawValue === '-') {
              // Allow standalone minus for user to continue typing
              field.onChange(rawValue);
            } else if (rawValue.endsWith('.')) {
              // Allow numbers ending with decimal point for user to continue typing
              field.onChange(rawValue);
            } else {
              // Convert to number for valid numeric values
              const numValue = parseFloat(rawValue);
              field.onChange(isNaN(numValue) ? rawValue : numValue);
            }

            // Note: Validation happens naturally when user leaves the field
            // No need to trigger it programmatically on every change
          };

          // Handle keyboard events
          const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
            // Allow only numeric characters, backspace, delete, tab, escape, enter, arrows, period, hyphen
            // This is a basic filter; more complex scenarios might need a more robust solution
            const allowedKeys = [
              '0',
              '1',
              '2',
              '3',
              '4',
              '5',
              '6',
              '7',
              '8',
              '9',
              'Backspace',
              'Delete',
              'Tab',
              'Escape',
              'Enter',
              'ArrowLeft',
              'ArrowRight',
              'ArrowUp',
              'ArrowDown',
              '.',
              '-',
            ];

            // Allow Ctrl/Cmd+A, C, V, X, Z for common editing operations
            if (
              (e.ctrlKey || e.metaKey) &&
              ['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase())
            ) {
              return;
            }

            if (!allowedKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
              e.preventDefault();
            }

            // In readonly mode Escape and the arrows never write and are not
            // preventDefault-ed, so native caret movement and ancestor Escape handlers apply.
            if (
              ro.isFocusableReadOnly &&
              (e.key === 'Escape' || e.key === 'ArrowUp' || e.key === 'ArrowDown')
            ) {
              return;
            }

            // Handle escape key to clear input
            if (e.key === 'Escape') {
              handleEscapeKey(field.onChange, field.value)(e);
              return;
            }

            // Handle arrow keys for increment/decrement
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault(); // Prevent default browser behavior

              // Get current value as number or default to 0
              let currentValue = 0;
              if (typeof field.value === 'number') {
                currentValue = field.value;
              } else if (
                typeof field.value === 'string' &&
                NUMBER_REGEX.COMPLETE_NUMBER.test(field.value)
              ) {
                currentValue = parseFloat(field.value);
              }

              // Calculate new value based on step, respecting min/max
              const increment = e.key === 'ArrowUp' ? step : -step;
              const newValue = Math.min(
                max !== undefined ? max : Infinity,
                Math.max(min !== undefined ? min : -Infinity, currentValue + increment)
              );

              // Update the field
              field.onChange(newValue);
              // Note: Validation happens naturally, no need to trigger it programmatically
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
                value={field.value ?? ''}
                id={id}
                placeholder={placeholder}
                type="text"
                min={min}
                max={max}
                step={step}
                className={validationClasses}
                onKeyDown={handleKeyDown}
                data-slot="input"
                onChange={handleInputChange}
                inputMode="decimal"
                pattern="-?[0-9]*\.?[0-9]*"
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
NumberField.displayName = 'NumberField';
