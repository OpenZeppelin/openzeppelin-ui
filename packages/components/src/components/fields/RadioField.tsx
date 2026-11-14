import React from 'react';
import { Controller, FieldValues } from 'react-hook-form';

import { cn } from '@openzeppelin/ui-utils';

import { FieldLabelRow } from './utils/FieldLabelRow';
import { getReadOnlyState } from './utils/readOnlyState';

import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { BaseFieldProps, LabelEndProps, ReadOnlyModeProps } from './BaseField';
import { ErrorMessage, getAccessibilityProps, getRequiredMessage, runCustomCheck } from './utils';

/**
 * Option item for radio fields
 */
export interface RadioOption {
  /**
   * Value to be submitted with the form
   */
  value: string;

  /**
   * Display label for the option
   */
  label: string;

  /**
   * Optional supporting text shown under the label. It is the option's accessible description.
   */
  description?: string;

  /**
   * Whether this option is disabled
   */
  disabled?: boolean;
}

/**
 * RadioField component properties
 */
export interface RadioFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues>,
    LabelEndProps,
    ReadOnlyModeProps {
  /**
   * Available options for selection
   */
  options?: RadioOption[];

  /**
   * Direction of the options. `default`: a column or a wrapping row. `card`: `vertical` stacks
   * the cards; `horizontal` puts them side by side in equal-width columns that wrap to fewer
   * columns, down to one, as the container narrows. `segmented`: ignored; segments always sit in
   * one row.
   * @default 'vertical'
   */
  layout?: 'horizontal' | 'vertical';

  /**
   * Option presentation. `card` renders each option as a selectable card; `segmented` renders a
   * single-row segmented control for two or three short options (see RadioGroup). Validation,
   * required state, read-only state and the submitted value are the same for every variant.
   * `segmented` shows each option's `label` only; `description` is not rendered.
   * @default 'default'
   */
  variant?: 'default' | 'card' | 'segmented';

  /**
   * Custom validation function for radio values
   */
  validateRadio?: (value: string) => boolean | string;
}

/** Card `layout="horizontal"`: equal columns of at least 12rem that wrap, down to one column. */
const HORIZONTAL_CARD_GRID = 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]';

/**
 * Read-only look for an enabled card: no pointer and no hover tint, so it looks the same as at
 * rest. The checked card keeps its tint on hover too.
 */
const READ_ONLY_CARD_ITEM =
  'cursor-default hover:bg-background data-[state=checked]:hover:bg-primary/5';

/** Read-only look for an enabled segment: no pointer and no hover text colour change. */
const READ_ONLY_SEGMENT_ITEM =
  'cursor-default hover:text-muted-foreground data-[state=checked]:hover:text-foreground';

/**
 * Radio button field component specifically designed for React Hook Form integration.
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
 * - Horizontal or vertical layout options, a selectable-card variant and a segmented variant
 * - Optional per-option descriptions
 * - Customizable validation through adapter integration
 * - Automatic error handling and reporting
 * - Full accessibility support with ARIA attributes
 *
 * Read-only: `readOnly` is ignored unless `readOnlyMode="readonly"` is set, as it was before
 * `readOnlyMode` existed. With both, in every variant, the options stay focusable and in full
 * colour, no click or key changes the value, the value stays in `handleSubmit` data, and the
 * group is reported read-only (`aria-readonly` plus a visually hidden "Read-only" description).
 */
export function RadioField<TFieldValues extends FieldValues = FieldValues>({
  id,
  label,
  labelEnd,
  helperText,
  control,
  name,
  width = 'full',
  validation,
  options = [],
  layout = 'vertical',
  variant = 'default',
  validateRadio,
  readOnly,
  readOnlyMode,
}: RadioFieldProps<TFieldValues>): React.ReactElement {
  const isRequired = !!validation?.required;
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;
  const radioGroupId = `${id}-group`;
  const labelId = `${id}-label`;
  const readOnlyDescriptionId = `${id}-readonly`;
  // A `<label for>` cannot name a radiogroup (it is not a form control), so the group points
  // at the label instead.
  const groupLabelledBy = label ? labelId : undefined;

  // Without the explicit opt-in, `readOnly` is ignored exactly as before (`getReadOnlyState`
  // gets `undefined`), so the Controller sees `disabled: undefined`. Passing `readOnly` through
  // would disable the field and drop its value from the payload. With the opt-in,
  // `controllerDisabled` is `false`, so the value stays in `handleSubmit` data.
  const isReadOnlyModeOptIn = readOnlyMode === 'readonly';
  const ro = getReadOnlyState(isReadOnlyModeOptIn ? readOnly : undefined, readOnlyMode);
  const isRO = ro.isFocusableReadOnly;

  return (
    <div
      className={`flex flex-col gap-2 ${width === 'full' ? 'w-full' : width === 'half' ? 'w-1/2' : 'w-1/3'}`}
    >
      {label && (
        <FieldLabelRow labelEnd={labelEnd}>
          <Label id={labelId} htmlFor={radioGroupId} className="text-sm font-medium">
            {label} {isRequired && <span className="text-destructive">*</span>}
          </Label>
        </FieldLabelRow>
      )}

      <Controller
        control={control}
        name={name}
        disabled={ro.controllerDisabled}
        rules={{
          validate: (value) => {
            // Handle required validation explicitly
            if (value === undefined || value === null || value === '') {
              return validation?.required ? getRequiredMessage(validation) : true;
            }

            // Run custom validation if provided
            if (validateRadio && value) {
              const validation = validateRadio(value);
              if (validation !== true && typeof validation === 'string') {
                return validation;
              }
            }

            return runCustomCheck(value, validation);
          },
        }}
        render={({ field, fieldState: { error } }) => {
          const hasError = !!error;

          // Group accessibility attributes
          const groupAccessibilityProps = getAccessibilityProps({
            id, // description/error elements are `${id}-description` / `${id}-error`, not group-scoped
            hasError,
            isRequired,
            hasHelperText: !!helperText,
          });
          // The read-only id goes last, after the error and helper ids, and only while its
          // element is rendered. Without the opt-in this is the same value as before.
          const groupDescribedBy = isRO
            ? [groupAccessibilityProps['aria-describedby'], readOnlyDescriptionId]
                .filter(Boolean)
                .join(' ')
            : groupAccessibilityProps['aria-describedby'];

          // Every user pick in every variant ends here. Dropped while read-only; the value is
          // controlled, so the shown selection stays the form value. `setValue` and `reset`
          // don't come through here, so they still land.
          const handleValueChange = (value: string): void => {
            if (isRO) return;
            field.onChange(value);
          };

          // The form ref goes to the radio that takes focus: the checked one, else the first
          // enabled one. Focus-on-first-error and `setFocus(name)` then land on the group.
          const checkedIndex = options.findIndex(
            (option) => option.value === field.value && !option.disabled
          );
          const focusIndex =
            checkedIndex >= 0 ? checkedIndex : options.findIndex((option) => !option.disabled);

          // Out of flow (sr-only), so switching read-only causes no layout shift.
          const readOnlyDescription = isRO && (
            <span id={readOnlyDescriptionId} className="sr-only">
              Read-only
            </span>
          );

          const helperAndError = (
            <>
              {helperText && (
                <div id={descriptionId} className="text-sm text-muted-foreground">
                  {helperText}
                </div>
              )}

              <ErrorMessage error={error} id={errorId} />
            </>
          );

          // Card and segmented share this root wiring. No Radix `required`: it renders a hidden
          // native required input per item, which could block a submit before the kit's own
          // required message. `aria-required` keeps the announcement.
          const radixRootProps = {
            id: radioGroupId,
            'aria-labelledby': groupLabelledBy,
            // Always controlled: with `undefined` Radix would keep its own selection.
            value: field.value ?? '',
            onValueChange: handleValueChange,
            onBlur: field.onBlur,
            'aria-invalid': hasError,
            'aria-required': isRequired,
            'aria-readonly': isRO || undefined,
            'data-readonly': isRO ? '' : undefined,
            'aria-describedby': groupDescribedBy,
            'aria-errormessage': groupAccessibilityProps['aria-errormessage'],
          };

          if (variant === 'segmented') {
            return (
              <>
                <RadioGroup
                  {...radixRootProps}
                  variant="segmented"
                  // A segment has no border to recolour, so the error ring goes on the group.
                  className={hasError ? 'ring-1 ring-destructive/50' : undefined}
                >
                  {options.map((option, index) => (
                    <RadioGroupItem
                      key={option.value}
                      ref={index === focusIndex ? field.ref : undefined}
                      value={option.value}
                      disabled={option.disabled}
                      className={isRO && !option.disabled ? READ_ONLY_SEGMENT_ITEM : undefined}
                    >
                      {option.label}
                    </RadioGroupItem>
                  ))}
                </RadioGroup>

                {readOnlyDescription}
                {helperAndError}
              </>
            );
          }

          if (variant === 'card') {
            return (
              <>
                <RadioGroup
                  {...radixRootProps}
                  variant="card"
                  // `cn` merges with the root's classes, so `grid` replaces its `flex`.
                  className={cn('gap-3 space-y-0', layout === 'horizontal' && HORIZONTAL_CARD_GRID)}
                >
                  {options.map((option, index) => (
                    <RadioGroupItem
                      key={option.value}
                      ref={index === focusIndex ? field.ref : undefined}
                      value={option.value}
                      disabled={option.disabled}
                      title={option.label}
                      description={option.description}
                      className={
                        cn(
                          hasError && 'border-destructive/50',
                          isRO && !option.disabled && READ_ONLY_CARD_ITEM
                        ) || undefined
                      }
                    />
                  ))}
                </RadioGroup>

                {readOnlyDescription}
                {helperAndError}
              </>
            );
          }

          return (
            <>
              <div
                id={radioGroupId}
                role="radiogroup"
                aria-labelledby={groupLabelledBy}
                className={`flex ${layout === 'vertical' ? 'flex-col gap-3' : 'flex-row flex-wrap gap-4'}`}
                {...groupAccessibilityProps}
                aria-describedby={groupDescribedBy}
                aria-readonly={isRO || undefined}
                data-readonly={isRO ? '' : undefined}
              >
                {options.map((option, index) => {
                  const optionId = `${id}-option-${index}`;
                  const optionLabelId = `${optionId}-label`;
                  const hasDescription = !!option.description;
                  const isSelected = field.value === option.value;
                  const isDisabled = option.disabled;
                  // Read-only drops the pointer and hover cues; a disabled option keeps its look.
                  const isReadOnlyOption = isRO && !isDisabled;

                  return (
                    <label
                      key={option.value}
                      htmlFor={optionId}
                      // The description stacks under the label text, so the radio aligns with the
                      // first line instead of centring on both.
                      className={`group relative flex ${isReadOnlyOption ? 'cursor-default' : 'cursor-pointer'} ${hasDescription ? 'items-start' : 'items-center'} gap-2 rounded-lg px-3 py-2 transition-all duration-150 ${
                        isDisabled
                          ? 'cursor-not-allowed opacity-50'
                          : isReadOnlyOption
                            ? ''
                            : 'hover:bg-muted/50'
                      } ${isSelected && !hasError ? 'bg-selected/5' : ''}`}
                    >
                      <input
                        type="radio"
                        ref={index === focusIndex ? field.ref : undefined}
                        id={optionId}
                        value={option.value}
                        disabled={isDisabled}
                        checked={isSelected}
                        // React restores the controlled `checked` after a dropped change.
                        onChange={() => handleValueChange(option.value)}
                        className="sr-only"
                        // The name is the label text only; the description sits in the same
                        // <label> (so clicking it selects) but is the description, not the name.
                        aria-labelledby={optionLabelId}
                        aria-describedby={
                          [hasError && errorId, hasDescription && `${optionId}-description`]
                            .filter(Boolean)
                            .join(' ') || undefined
                        }
                      />

                      {/* Custom Radio Button */}
                      <div
                        className={`relative flex size-4 shrink-0 items-center justify-center ${hasDescription ? 'mt-0.5' : ''}`}
                      >
                        <div
                          className={`absolute size-4 rounded-full border-2 transition-all duration-150 ${
                            isSelected
                              ? hasError
                                ? 'border-destructive bg-destructive/10'
                                : 'border-selected bg-selected/10'
                              : hasError
                                ? 'border-destructive/50'
                                : isReadOnlyOption
                                  ? 'border-muted-foreground/40'
                                  : 'border-muted-foreground/40 group-hover:border-muted-foreground/60'
                          } ${!isDisabled && (isReadOnlyOption ? '' : 'group-hover:scale-105')}`}
                        />

                        {/* Inner dot for selected state */}
                        <div
                          className={`absolute size-1.5 rounded-full transition-all duration-150 ${
                            isSelected
                              ? hasError
                                ? 'bg-destructive scale-100 opacity-100'
                                : 'bg-selected scale-100 opacity-100'
                              : 'scale-0 opacity-0'
                          }`}
                        />
                      </div>

                      {/* Label text, with the description stacked under it */}
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span
                          id={optionLabelId}
                          className={`text-sm transition-colors duration-150 ${
                            isDisabled
                              ? 'text-muted-foreground'
                              : isSelected
                                ? hasError
                                  ? 'text-destructive font-medium'
                                  : 'text-foreground font-medium'
                                : 'text-foreground'
                          }`}
                        >
                          {option.label}
                        </span>

                        {hasDescription && (
                          <span
                            id={`${optionId}-description`}
                            className="text-sm text-muted-foreground"
                          >
                            {option.description}
                          </span>
                        )}
                      </span>

                      {/* Focus ring */}
                      <div
                        className={`absolute -inset-1 rounded-lg ring-2 ring-selected ring-offset-2 ring-offset-background transition-opacity duration-150 ${
                          isSelected && !isDisabled
                            ? 'opacity-0 focus-within:opacity-100'
                            : 'opacity-0'
                        }`}
                      />
                    </label>
                  );
                })}
              </div>

              {readOnlyDescription}
              {helperAndError}
            </>
          );
        }}
      />
    </div>
  );
}

// Set displayName manually for better debugging
RadioField.displayName = 'RadioField';
