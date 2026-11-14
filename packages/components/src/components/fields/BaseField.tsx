import { type ForwardedRef, type ReactElement, type ReactNode } from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';

import { type FieldValidation } from '@openzeppelin/ui-types';

import { FieldLabelRow } from './utils/FieldLabelRow';
import { getWidthClasses } from './utils/layout';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';

/**
 * Base props shared by all field components
 *
 * @template TFieldValues The field values type from React Hook Form
 */
export interface BaseFieldProps<TFieldValues extends FieldValues = FieldValues> {
  /**
   * Unique identifier for the field
   */
  id: string;

  /**
   * Label text to display
   */
  label: string;

  /**
   * Placeholder text when empty
   */
  placeholder?: string;

  /**
   * Helper text to display below the field
   */
  helperText?: string;

  /**
   * Field width for layout
   */
  width?: 'full' | 'half' | 'third';

  /**
   * Validation rules for the field
   */
  validation?: FieldValidation;

  /**
   * Form control from React Hook Form
   */
  control: Control<TFieldValues>;

  /**
   * Field name in the form
   */
  name: FieldPath<TFieldValues>;

  /**
   * Whether the field should be displayed as read-only/disabled.
   * @default false
   */
  readOnly?: boolean;
}

/**
 * How a field renders when `readOnly` is true.
 * - `'disabled'` (default): today's behaviour. The control is disabled, leaves the tab order,
 *   and react-hook-form leaves its value out of `handleSubmit` data.
 * - `'readonly'`: the control stays focusable and selectable, gets the native `readonly`
 *   attribute and the kit's read-only look, ignores user edits, and keeps its value in
 *   `handleSubmit` data. Validation still runs.
 */
export type ReadOnlyMode = 'disabled' | 'readonly';

/** Mixed into the props of fields that support the focusable read-only mode. */
export interface ReadOnlyModeProps {
  /**
   * Has an effect only when `readOnly` is true. See {@link ReadOnlyMode}.
   * @default 'disabled'
   */
  readOnlyMode?: ReadOnlyMode;
}

/** Mixed into the props of fields that accept content at the end of the label row. */
export interface LabelEndProps {
  /**
   * Content placed at the end of the label row, such as an "Optional" chip or a small action
   * ("Address book"). It sits beside the label, not inside it, so the control's accessible name
   * stays the label text and clicking the label still focuses the input. Shown only when the
   * field has a `label`.
   */
  labelEnd?: ReactNode;
}

/** Mixed into the props of fields that show a success border once touched without an error. */
export interface ValidStateProps {
  /**
   * Whether the field shows the success border when it has been touched and has no error.
   * `false` keeps the field neutral instead, so a touched, empty optional field doesn't look
   * "valid". The error border is unaffected.
   * @default true
   */
  showValidState?: boolean;
}

/**
 * BaseField component to provide a consistent layout for form fields
 *
 * @important This component is the foundation of the app rendering architecture and should
 * ONLY be used by field-specific components within the system, not as a standalone component.
 *
 * Architecture role:
 * 1. Provides a consistent layout structure for all field types
 * 2. Handles integration with React Hook Form through the FormField component
 * 3. Manages common rendering aspects like labels, error messages, and help text
 * 4. Delegates actual input rendering to field-specific components via renderInput
 *
 * Field component hierarchy:
 * - TransactionForm (top-level renderer)
 *   - DynamicFormField (field type selector)
 *     - Specific field components (TextField, NumberField, etc.)
 *       - BaseField (common field structure - this component)
 *         - Actual input element rendered by renderInput
 *
 * This component should only be extended by field-specific components like
 * TextField, NumberField, and AddressField - it is not meant for direct use in forms.
 */
export function BaseField<TFieldValues extends FieldValues = FieldValues>({
  id,
  label,
  helperText,
  control,
  name,
  width = 'full',
  labelEnd,
  renderInput,
}: BaseFieldProps<TFieldValues> &
  LabelEndProps & {
    renderInput: (
      field: Record<string, unknown>,
      props: { id: string; ref?: ForwardedRef<HTMLElement> }
    ) => ReactNode;
    ref?: ForwardedRef<HTMLElement>;
  }): ReactElement {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={getWidthClasses(width)}>
          {label && (
            <FieldLabelRow labelEnd={labelEnd}>
              <FormLabel htmlFor={id}>{label}</FormLabel>
            </FieldLabelRow>
          )}
          <FormControl>{renderInput(field, { id })}</FormControl>
          {helperText && <FormDescription id={`${id}-description`}>{helperText}</FormDescription>}
          <FormMessage id={`${id}-error`} />
        </FormItem>
      )}
    />
  );
}

// Set displayName properly
BaseField.displayName = 'BaseField';
