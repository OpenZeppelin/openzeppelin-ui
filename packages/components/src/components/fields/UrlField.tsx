import React from 'react';
import { Controller, FieldValues } from 'react-hook-form';

import { getInvalidUrlMessage, isValidUrl } from '@openzeppelin/ui-utils';

import { FieldLabelRow } from './utils/FieldLabelRow';
import { getReadOnlyState } from './utils/readOnlyState';

import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { BaseFieldProps, LabelEndProps, ReadOnlyModeProps } from './BaseField';
import {
  ErrorMessage,
  getAccessibilityProps,
  getRequiredMessage,
  getValidationStateClasses,
  handleEscapeKey,
  runCustomCheck,
  validateField,
} from './utils';

/**
 * URL input field component specifically designed for React Hook Form integration.
 */
export function UrlField<TFieldValues extends FieldValues = FieldValues>({
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
}: BaseFieldProps<TFieldValues> & ReadOnlyModeProps & LabelEndProps): React.ReactElement {
  const isRequired = !!validation?.required;
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;
  const ro = getReadOnlyState(readOnly, readOnlyMode);

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
            // Check required field explicitly first
            if (value === undefined || value === null || value === '') {
              return validation?.required ? getRequiredMessage(validation) : true;
            }

            // Perform standard validations (min, max, pattern, etc.) if they exist
            const standardValidationResult = validateField(value, validation);
            if (standardValidationResult !== true) {
              return standardValidationResult;
            }

            // Perform URL-specific validation using the shared validator
            if (typeof value === 'string' && value && !isValidUrl(value)) {
              return getInvalidUrlMessage();
            }

            return runCustomCheck(value, validation);
          },
        }}
        disabled={ro.controllerDisabled}
        render={({ field, fieldState: { error, isTouched } }) => {
          const hasError = !!error;
          const shouldShowError = hasError && isTouched;
          const validationClasses = getValidationStateClasses(error, isTouched);

          // Handle input change with validation
          const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
            const value = e.target.value;
            field.onChange(value);

            // Trigger validation if the field is required and empty
            if (isRequired && value === '') {
              setTimeout(() => field.onBlur(), 0);
            }
          };

          // Add keyboard accessibility for clearing the field with Escape
          const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
            // INV-12: no Escape-clear (and no preventDefault) in readonly mode.
            if (e.key === 'Escape' && !ro.isFocusableReadOnly) {
              handleEscapeKey(field.onChange, field.value)(e);

              // If required, trigger validation after clearing
              if (isRequired) {
                setTimeout(() => field.onBlur(), 0);
              }
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
                type="url"
                placeholder={placeholder || 'https://example.com'}
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

UrlField.displayName = 'UrlField';
