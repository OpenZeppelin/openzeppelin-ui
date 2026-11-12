/**
 * Validation and error handling utilities for form field components
 */
import { FieldError } from 'react-hook-form';

import { FieldValidation, FieldValidationMessages, MapEntry } from '@openzeppelin/ui-types';
import { logger } from '@openzeppelin/ui-utils';

import { INTEGER_PATTERN } from './integerValidation';

/** Default text for a required field left empty. */
export const REQUIRED_MESSAGE = 'This field is required';

/**
 * Shown when a custom check (`FieldValidation.validate`) fails without a usable
 * message or throws. Same text `getErrorMessage` falls back to.
 */
export const CUSTOM_CHECK_FALLBACK_MESSAGE = 'This field is invalid';

const MESSAGE_KEYS = ['required', 'min', 'max', 'minLength', 'maxLength', 'pattern'] as const;

/**
 * The custom messages that can apply: those whose rule is set on `validation`
 * (`required` truthy, every other rule not `undefined`) and whose text is a
 * non-empty string. Anything else in `messages`, including a non-object loaded
 * from a stored config, is ignored. Returns a new object, `{}` when nothing applies.
 */
export function getActiveMessages(validation?: FieldValidation): FieldValidationMessages {
  const active: FieldValidationMessages = {};
  const messages: unknown = validation?.messages;
  if (!validation || typeof messages !== 'object' || messages === null || Array.isArray(messages)) {
    return active;
  }
  const source = messages as Record<string, unknown>;
  for (const key of MESSAGE_KEYS) {
    const ruleSet =
      key === 'required' ? Boolean(validation.required) : validation[key] !== undefined;
    const text = source[key];
    if (ruleSet && typeof text === 'string' && text !== '') active[key] = text;
  }
  return active;
}

/**
 * The text a field shows when its required rule fails: the custom
 * `messages.required` when active, otherwise `fieldDefault` (the field's own
 * wording, `REQUIRED_MESSAGE` unless the field has its own).
 */
export function getRequiredMessage(
  validation: FieldValidation | undefined,
  fieldDefault: string = REQUIRED_MESSAGE
): string {
  return getActiveMessages(validation).required ?? fieldDefault;
}

/**
 * Runs the custom check `validation.validate` on a non-empty value. Fields call
 * it last, after required, their built-in rules and their own validator passed.
 *
 * Returns `true` when there is no check or it returns exactly `true`, and the
 * returned string when it is non-empty. Any other result fails closed with
 * `CUSTOM_CHECK_FALLBACK_MESSAGE`. Never throws: a thrown error is logged
 * (without the value, which may be a secret) and fails with the same text, so a
 * broken check can neither let a value through nor leave a submit hanging.
 */
export function runCustomCheck(value: unknown, validation?: FieldValidation): true | string {
  // A config from outside TypeScript can hold anything here.
  const check = validation?.validate;
  if (typeof check !== 'function') return true;

  let result: unknown;
  try {
    result = check(value);
  } catch (error) {
    logger.error('FieldValidation', 'Custom validate check threw', error);
    return CUSTOM_CHECK_FALLBACK_MESSAGE;
  }
  if (result === true) return true;
  return typeof result === 'string' && result !== '' ? result : CUSTOM_CHECK_FALLBACK_MESSAGE;
}

/**
 * Determines if a field has an error
 */
export function hasFieldError(error: FieldError | undefined): boolean {
  return !!error;
}

/**
 * Gets appropriate error message from field error
 */
export function getErrorMessage(error: FieldError | undefined): string | undefined {
  if (!error) return undefined;

  return error.message || 'This field is invalid';
}

/**
 * Formats validation error messages for display
 */
export function formatValidationError(
  error: FieldError | undefined,
  fieldName?: string
): string | undefined {
  if (!error) return undefined;

  const defaultMessage = fieldName ? `${fieldName} is invalid` : 'This field is invalid';

  return error.message || defaultMessage;
}

/**
 * Generates common CSS classes for field validation states
 */
export function getValidationStateClasses(
  error: FieldError | undefined,
  touched?: boolean
): string {
  if (error) {
    return 'border-destructive focus:border-destructive focus:ring-destructive/30';
  }

  if (touched) {
    return 'border-success focus:border-success focus:ring-success/30';
  }

  return '';
}

/**
 * Helper for handling form validation errors with React Hook Form
 */
export function handleValidationError(
  error: FieldError | undefined,
  id: string
): {
  errorId: string;
  errorMessage: string | undefined;
  hasError: boolean;
  validationClasses: string;
} {
  const hasError = hasFieldError(error);
  const errorMessage = getErrorMessage(error);
  const errorId = `${id}-error`;
  const validationClasses = getValidationStateClasses(error);

  return {
    errorId,
    errorMessage,
    hasError,
    validationClasses,
  };
}

/**
 * Creates a validation result object for field components
 */
export function createValidationResult(
  id: string,
  error: FieldError | undefined,
  touched?: boolean
): {
  hasError: boolean;
  errorMessage: string | undefined;
  errorId: string;
  validationClasses: string;
  'aria-invalid': boolean;
  'aria-errormessage'?: string;
} {
  const hasError = hasFieldError(error);
  const errorMessage = getErrorMessage(error);
  const errorId = `${id}-error`;
  const validationClasses = getValidationStateClasses(error, touched);

  return {
    hasError,
    errorMessage,
    errorId,
    validationClasses,
    'aria-invalid': hasError,
    'aria-errormessage': hasError ? errorId : undefined,
  };
}

/**
 * Generic field validation function that can be used to validate any field type
 * based on common validation criteria.
 *
 * Each failing rule returns its custom text from `messages` when present,
 * otherwise its default text. `messages` defaults to the active messages of
 * `validation`. A field that injects rules of its own into `validation` passes
 * the active messages of the consumer's original `validation`, so an injected
 * rule never shows a message meant for a rule the consumer didn't set.
 *
 * Does not run `validation.validate`; fields call `runCustomCheck` for that.
 */
export function validateField(
  value: unknown,
  validation?: FieldValidation,
  messages: FieldValidationMessages = getActiveMessages(validation)
): string | boolean {
  // Return true if no validation rules are provided
  if (!validation) return true;

  // Check if required but empty
  if (validation.required && (value === undefined || value === null || value === '')) {
    return messages.required ?? REQUIRED_MESSAGE;
  }

  // Skip other validations if value is empty and not required
  if (value === undefined || value === null || value === '') {
    return true;
  }

  // Validate string length
  if (typeof value === 'string') {
    if (validation.minLength && value.length < validation.minLength) {
      return messages.minLength ?? `Minimum length is ${validation.minLength} characters`;
    }

    if (validation.maxLength && value.length > validation.maxLength) {
      return messages.maxLength ?? `Maximum length is ${validation.maxLength} characters`;
    }

    // Validate pattern
    if (validation.pattern) {
      const pattern =
        typeof validation.pattern === 'string'
          ? new RegExp(validation.pattern)
          : validation.pattern;

      if (!pattern.test(value)) {
        if (messages.pattern) return messages.pattern;
        // Provide more specific error message for integer validation
        if (!INTEGER_PATTERN.test(value) && /\d/.test(value)) {
          return 'Value must be a valid integer (no decimals)';
        }
        return 'Value does not match the required pattern';
      }
    }
  }

  // Validate number range
  if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))) {
    const numValue = typeof value === 'number' ? value : Number(value);

    if (validation.min !== undefined && numValue < validation.min) {
      return messages.min ?? `Minimum value is ${validation.min}`;
    }

    if (validation.max !== undefined && numValue > validation.max) {
      return messages.max ?? `Maximum value is ${validation.max}`;
    }
  }

  // Check field conditions if defined
  if (validation.conditions && validation.conditions.length > 0) {
    // Note: This would need the current form values to evaluate conditions
    // This is intended to be used with React Hook Form's validation context
    // Implementation would depend on how conditions are evaluated in the form context
  }

  // If all validations pass
  return true;
}

/**
 * Map validation utilities
 */

/**
 * Checks if a map entry at the given index has a duplicate key
 * @param entries - Array of map entries
 * @param currentIndex - Index of the entry to check
 * @returns true if the key at currentIndex is duplicated elsewhere in the array
 */
export function isDuplicateMapKey(entries: MapEntry[], currentIndex: number): boolean {
  if (!Array.isArray(entries) || entries.length <= 1) {
    return false;
  }

  const currentKeyValue = entries[currentIndex]?.key;

  // Don't consider empty keys as duplicates
  if (!currentKeyValue || currentKeyValue === '') {
    return false;
  }

  // Prefer strict equality to avoid cross-type false positives (e.g., 123 vs "123")
  // Treat empty string as non-duplicate as above.
  return entries.some((entry: MapEntry, i: number) => {
    if (i === currentIndex) return false;
    const key = entry?.key;
    if (key === '') return false;
    // If both are strings, compare strings
    if (typeof key === 'string' && typeof currentKeyValue === 'string') {
      return key === currentKeyValue;
    }
    // If both are numbers, compare numbers
    if (typeof key === 'number' && typeof currentKeyValue === 'number') {
      return Number.isNaN(key) ? Number.isNaN(currentKeyValue) : key === currentKeyValue;
    }
    // If both are booleans
    if (typeof key === 'boolean' && typeof currentKeyValue === 'boolean') {
      return key === currentKeyValue;
    }
    // For objects (including dates) fall back to reference equality
    if (
      typeof key === 'object' &&
      key !== null &&
      typeof currentKeyValue === 'object' &&
      currentKeyValue !== null
    ) {
      return key === currentKeyValue;
    }
    // Otherwise, consider different types as different keys
    return false;
  });
}

/**
 * Validates an array of map entries for duplicate keys
 * @param entries - Array of map entries to validate
 * @returns Validation error message if duplicates found, otherwise undefined
 */
export function validateMapEntries(entries: MapEntry[]): string | undefined {
  if (!Array.isArray(entries) || entries.length <= 1) {
    return undefined;
  }

  const keys = entries
    .map((entry) => entry?.key)
    .filter((key) => key !== undefined && key !== null && key !== '');

  const keyStrings = keys.map((key) => String(key));
  const uniqueKeyStrings = new Set(keyStrings);

  if (keyStrings.length !== uniqueKeyStrings.size) {
    return 'Duplicate keys are not allowed';
  }

  return undefined;
}
