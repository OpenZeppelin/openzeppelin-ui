import React from 'react';
import { Controller, FieldValues } from 'react-hook-form';

import {
  AMOUNT_REQUIRED_MESSAGE,
  formatAmountText,
  isEmptyAmountValue,
  stepAmountText,
  validateExactAmount,
} from './utils/decimalValidation';
import { FieldLabelRow } from './utils/FieldLabelRow';
import { getReadOnlyState } from './utils/readOnlyState';

import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { AmountFieldExactInput } from './AmountFieldExactInput';
import { BaseFieldProps, LabelEndProps, ReadOnlyModeProps } from './BaseField';
import {
  ErrorMessage,
  getAccessibilityProps,
  getRequiredMessage,
  getValidationStateClasses,
  handleEscapeKey,
  runCustomCheck,
} from './utils';

/**
 * Props shared by both AmountField modes.
 */
interface AmountFieldCommonProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues>,
    ReadOnlyModeProps,
    LabelEndProps {
  /**
   * Default mode: decimal places the value is formatted to on blur, exactly, rounding
   * half away from zero.
   * Exact-entry mode: the most decimal places allowed. More is a validation error,
   * never a rounding. Counted on the text as typed (`1.500` has 3).
   * @default 2
   */
  decimals?: number;

  /**
   * Currency/token symbol to display
   */
  symbol?: string;

  /**
   * Position of the symbol (before or after the amount)
   */
  symbolPosition?: 'prefix' | 'suffix';
}

/**
 * AmountField component properties (default mode: the value is formatted to
 * `decimals` places on blur).
 */
export interface AmountFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends AmountFieldCommonProps<TFieldValues> {
  /**
   * Omit, or pass `true`, for format-on-blur. Pass `false` for exact-entry mode
   * (see `AmountFieldExactProps`).
   * @default true
   */
  formatOnBlur?: true;

  /**
   * Grouping is only available in exact-entry mode (`formatOnBlur={false}`).
   */
  allowGrouping?: false;

  /**
   * Minimum value validation
   */
  min?: number;

  /**
   * Maximum value validation
   */
  max?: number;

  /**
   * Step value for increment/decrement. Added exactly, as a decimal, with no float.
   */
  step?: number;

  /**
   * Custom validation function for amount values. Receives the parsed number. A string
   * result is the error; `true` and `false` both pass. In exact-entry mode `false` fails
   * instead, so return a message rather than `false` if you may switch modes.
   */
  validateAmount?: (value: number) => boolean | string;
}

/**
 * AmountField properties in exact-entry mode (`formatOnBlur={false}`). The text is
 * never rewritten. Every value the user types reaches the form as a decimal `string`
 * (grouping commas removed) that never passes through a float. A `number` or `bigint`
 * written by `defaultValues`, `reset` or `setValue` is shown exactly but stays as it is
 * until the user edits the field, so seed the form with strings.
 */
export interface AmountFieldExactProps<TFieldValues extends FieldValues = FieldValues>
  extends AmountFieldCommonProps<TFieldValues> {
  /**
   * `false` turns on exact-entry mode.
   */
  formatOnBlur: false;

  /**
   * Accept `,` thousands grouping (`12,345.6`). Groups after the first must have
   * exactly three digits, and the first group must not start with `0`. The decimal
   * point is always `.`.
   * @default false
   */
  allowGrouping?: boolean;

  /**
   * Inclusive lower bound. Pass a string to keep a bound beyond float precision exact.
   */
  min?: number | string;

  /**
   * Inclusive upper bound. Pass a string to keep a bound beyond float precision exact.
   */
  max?: number | string;

  /**
   * Arrow-key stepping is not available in exact-entry mode.
   */
  step?: never;

  /**
   * Custom validation. Receives the normalized decimal string after every built-in
   * check has passed. Return `true` to pass or an error message. Any other result,
   * `false` and `''` included, fails with "Enter a valid amount". (In the default mode
   * `false` passes.)
   */
  validateAmount?: (value: string) => boolean | string;
}

/** Default-mode props the exact branch never reads. */
const NO_DEFAULT_MODE_PROPS: Pick<AmountFieldProps, 'min' | 'max' | 'step' | 'validateAmount'> = {};

/**
 * Amount input field component specifically designed for currency/token amounts with React Hook Form integration.
 *
 * Architecture flow:
 * 1. Form schemas are generated from contract functions using adapters
 * 2. TransactionForm renders the overall form structure with React Hook Form
 * 3. DynamicFormField selects the appropriate field component based on field type
 * 4. BaseField provides consistent layout and hook form integration
 * 5. This component handles amount-specific rendering and validation
 *
 * The component includes:
 * - Integration with React Hook Form
 * - Support for currency/token symbols
 * - Numeric-specific validations (min, max, decimals)
 * - Customizable validation through adapter integration
 * - Automatic error handling and reporting
 * - Full accessibility support with ARIA attributes
 * - Keyboard navigation with arrow keys for numeric increment/decrement
 *
 * Default mode formats on blur and on arrow keys without floating-point math: the
 * typed digits are kept and padded, or rounded half away from zero, to `decimals`.
 * Text that is not a plain decimal is left as it is.
 *
 * Exact-entry mode (`formatOnBlur={false}`), for money values: the text the user types
 * is never rewritten. With `allowGrouping`, `,` thousands groups are accepted. The form
 * value is the text with grouping removed, always a `string` and never parsed to a
 * float. Too many decimals, out-of-range values and malformed text are validation
 * errors that block submit, never roundings. Arrow-key stepping is off. Convert at
 * submit with `parseUnits(value, tokenDecimals)`.
 */
export function AmountField<TFieldValues extends FieldValues = FieldValues>(
  props: AmountFieldProps<TFieldValues> | AmountFieldExactProps<TFieldValues>
): React.ReactElement {
  const {
    id,
    label,
    labelEnd,
    placeholder,
    helperText,
    control,
    name,
    width = 'full',
    validation,
    decimals = 2,
    symbol = '',
    symbolPosition = 'suffix',
    readOnly,
    readOnlyMode,
  } = props;
  // Exact mode only on a strict `false`; omitted, `true` and type-bypass values
  // all keep the default mode.
  const exactProps = props.formatOnBlur === false ? props : undefined;
  // Reduced to a boolean once; only exact mode reads it.
  const allowGrouping = !!exactProps?.allowGrouping;
  const {
    min,
    max,
    step = 0.01,
    validateAmount,
  } = props.formatOnBlur === false ? NO_DEFAULT_MODE_PROPS : props;
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
          // The rules are re-registered on every render, so a runtime mode flip
          // validates with the mode now rendered.
          validate: exactProps
            ? (value) => {
                const result = validateExactAmount(value, {
                  required: isRequired,
                  allowGrouping,
                  decimals,
                  min: exactProps.min,
                  max: exactProps.max,
                  validateAmount: exactProps.validateAmount,
                  requiredMessage: getRequiredMessage(validation, AMOUNT_REQUIRED_MESSAGE),
                });
                // validateExactAmount also passes an empty optional value; the
                // custom check must never see one. It gets the stored
                // exact string, never a float.
                if (result !== true || isEmptyAmountValue(value)) return result;
                return runCustomCheck(value, validation);
              }
            : (value) => {
                // Convert to number for validation
                const numValue = typeof value === 'string' ? parseFloat(value) : value;

                // Handle required validation explicitly
                if (value === undefined || value === null || value === '' || isNaN(numValue)) {
                  return validation?.required ? getRequiredMessage(validation) : true;
                }

                // Validate min/max constraints
                if (min !== undefined && numValue < min) {
                  return `Value must be at least ${min}`;
                }

                if (max !== undefined && numValue > max) {
                  return `Value must be at most ${max}`;
                }

                // Run custom validation if provided
                if (validateAmount && !isNaN(numValue)) {
                  const validation = validateAmount(numValue);
                  if (validation !== true && typeof validation === 'string') {
                    return validation;
                  }
                }

                return runCustomCheck(value, validation);
              },
        }}
        disabled={ro.controllerDisabled}
        render={({ field, fieldState: { error, isTouched } }) => {
          const hasError = !!error?.message;
          const shouldShowError = hasError && isTouched;
          const validationClasses = getValidationStateClasses(error, isTouched);

          // Get accessibility attributes
          const accessibilityProps = getAccessibilityProps({
            id,
            hasError,
            isRequired,
            isReadOnly: ro.isFocusableReadOnly,
            hasHelperText: !!helperText,
          });

          // Format display value
          const displayValue = field.value !== undefined && field.value !== null ? field.value : '';

          const inputClassName = `${validationClasses} ${
            symbol && symbolPosition === 'prefix' ? 'pl-8' : ''
          } ${symbol && symbolPosition === 'suffix' ? 'pr-8' : ''}`;

          return (
            <>
              <div className="relative">
                {symbol && symbolPosition === 'prefix' && (
                  <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">
                    {symbol}
                  </span>
                )}

                {exactProps ? (
                  <AmountFieldExactInput
                    field={field}
                    id={id}
                    placeholder={placeholder}
                    allowGrouping={allowGrouping}
                    className={inputClassName}
                    accessibilityProps={accessibilityProps}
                    readOnlyState={ro}
                  />
                ) : (
                  <Input
                    {...field}
                    id={id}
                    type="text"
                    inputMode="decimal"
                    placeholder={placeholder}
                    value={displayValue}
                    className={inputClassName}
                    data-slot="input"
                    {...accessibilityProps}
                    onChange={(e) => {
                      // Allow numeric values and decimal point
                      const value = e.target.value;
                      if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
                        field.onChange(value);
                      }
                    }}
                    onBlur={(e) => {
                      // Format on blur, never in readonly mode; blur still marks touched.
                      // An unchanged result is still written, which keeps validation timing as
                      // it was. `null` (non-plain text, unusable decimals) writes nothing.
                      if (!ro.isFocusableReadOnly) {
                        const formatted = formatAmountText(e.target.value, decimals);
                        if (formatted !== null) field.onChange(formatted);
                      }
                      if (field.onBlur) {
                        field.onBlur();
                      }
                    }}
                    onKeyDown={(e) => {
                      // In readonly mode Escape and the arrows never write and
                      // are not preventDefault-ed.
                      if (ro.isFocusableReadOnly) return;

                      // Handle Escape key
                      if (e.key === 'Escape') {
                        handleEscapeKey((value) => {
                          field.onChange(value === '' ? null : value);
                        }, field.value)(e);
                        return;
                      }

                      // Arrow keys step exactly. preventDefault runs even when nothing is
                      // written, so the caret never jumps on an arrow press in this field.
                      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        const next = stepAmountText(field.value, {
                          direction: e.key === 'ArrowUp' ? 1 : -1,
                          step,
                          decimals,
                          min,
                          max,
                        });
                        if (next !== null) field.onChange(next);
                      }
                    }}
                    {...ro.controlProps}
                  />
                )}

                {symbol && symbolPosition === 'suffix' && (
                  <span className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500">
                    {symbol}
                  </span>
                )}
              </div>

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
AmountField.displayName = 'AmountField';
