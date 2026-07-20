import React from 'react';
import { Controller, FieldValues } from 'react-hook-form';

import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { BaseFieldProps } from './BaseField';
import {
  ErrorMessage,
  getAccessibilityProps,
  getValidationStateClasses,
  handleEscapeKey,
} from './utils';

/**
 * TextAreaField component properties
 */
export interface TextAreaFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  /**
   * Number of rows for the textarea
   */
  rows?: number;

  /**
   * Maximum characters allowed in textarea
   */
  maxLength?: number;

  /**
   * Custom validation function for textarea values
   */
  validateTextArea?: (value: string) => boolean | string;

  /**
   * Optional trailing content pinned under the textarea's bottom-right edge
   * (e.g. an entry-mode toggle). When set, helper text renders on a separate
   * row beneath with spacing so the slot stays flush to the textarea.
   */
  helperEndSlot?: React.ReactNode;
}

/**
 * Multi-line text input field component specifically designed for React Hook Form integration.
 *
 * Architecture flow:
 * 1. Form schemas are generated from contract functions using adapters
 * 2. TransactionForm renders the overall form structure with React Hook Form
 * 3. DynamicFormField selects the appropriate field component based on field type
 * 4. BaseField provides consistent layout and hook form integration
 * 5. This component handles textarea-specific rendering and validation
 *
 * The component includes:
 * - Integration with React Hook Form
 * - Resizable multi-line text input
 * - Character limit support
 * - Customizable validation through adapter integration
 * - Automatic error handling and reporting
 * - Full accessibility support with ARIA attributes
 * - Keyboard navigation with Escape to clear
 */
export function TextAreaField<TFieldValues extends FieldValues = FieldValues>({
  id,
  label,
  placeholder,
  helperText,
  control,
  name,
  width = 'full',
  validation,
  rows = 4,
  maxLength,
  validateTextArea,
  readOnly,
  helperEndSlot,
}: TextAreaFieldProps<TFieldValues>): React.ReactElement {
  const isRequired = !!validation?.required;
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;

  return (
    <div
      className={`flex flex-col gap-2 ${width === 'full' ? 'w-full' : width === 'half' ? 'w-1/2' : 'w-1/3'}`}
    >
      {label && (
        <Label htmlFor={id}>
          {label} {isRequired && <span className="text-destructive">*</span>}
        </Label>
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

            // Run custom validation if provided
            if (validateTextArea && value) {
              const validation = validateTextArea(value);
              if (validation !== true && typeof validation === 'string') {
                return validation;
              }
            }

            // Check maximum length
            if (maxLength && typeof value === 'string' && value.length > maxLength) {
              return `Maximum length is ${maxLength} characters`;
            }

            return true;
          },
        }}
        disabled={readOnly}
        render={({ field, fieldState: { error, isTouched } }) => {
          const hasError = !!error;
          const shouldShowError = hasError && isTouched;
          const validationClasses = getValidationStateClasses(error, isTouched);

          // Get accessibility attributes
          const accessibilityProps = getAccessibilityProps({
            id,
            hasError,
            isRequired,
            hasHelperText: !!helperText,
          });

          const hasHelperEndSlot = helperEndSlot != null;

          const textareaElement = (
            <Textarea
              {...field}
              id={id}
              placeholder={placeholder}
              rows={rows}
              maxLength={maxLength}
              // With a flush end slot the toggle overlaps the bottom border; lift
              // the textarea so its focus ring is not covered by the toggle.
              className={
                hasHelperEndSlot ? `relative z-10 ${validationClasses}` : validationClasses
              }
              value={field.value ?? ''}
              disabled={readOnly}
              {...accessibilityProps}
              aria-describedby={`${helperText ? descriptionId : ''} ${hasError ? errorId : ''}`}
              onKeyDown={handleEscapeKey((value) => {
                if (typeof field.onChange === 'function') {
                  field.onChange(value);
                }
              }, field.value)}
            />
          );

          const helperTextContent = helperText != null && helperText !== '' ? helperText : null;

          return (
            <>
              {textareaElement}

              {/* Display character count if maxLength is provided */}
              {maxLength && typeof field.value === 'string' && (
                <div className="text-muted-foreground text-right text-xs">
                  {field.value.length}/{maxLength}
                </div>
              )}

              {/* When an end slot is present, the toggle is pinned flush to the
                  textarea's bottom-right (an attached tab) while helper text sits
                  on a separate gapped row on the left — both share one in-flow row
                  so the toggle keeps its position when helper text appears (INV: no
                  shift) and the row reserves height so it never overlaps content
                  below. The row cancels the parent `gap-2` (`-mt-2`) so the toggle
                  can sit flush against the textarea's border. */}
              {hasHelperEndSlot ? (
                <div className="-mt-2 flex items-start justify-between gap-2 pr-2.5">
                  <div
                    id={descriptionId}
                    className="mt-4 min-w-0 flex-1 text-sm text-muted-foreground"
                  >
                    {helperTextContent}
                  </div>
                  <div className="-mt-px shrink-0">{helperEndSlot}</div>
                </div>
              ) : (
                helperTextContent && (
                  <div id={descriptionId} className="text-muted-foreground text-sm">
                    {helperTextContent}
                  </div>
                )
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
TextAreaField.displayName = 'TextAreaField';
