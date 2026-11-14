/**
 * 005 SF-36 INV-5 baseline: `validateField` exactly as it was before SF-36
 * (`git show 33ae72814:packages/components/src/components/fields/utils/validation.ts`),
 * renamed, with the import paths adjusted to this folder. Test fixture only.
 */
import type { FieldValidation } from '@openzeppelin/ui-types';

import { INTEGER_PATTERN } from '../utils/integerValidation';

/** Pre-SF-36 `validateField`, verbatim. */
export function baselineValidateField(
  value: unknown,
  validation?: FieldValidation
): string | boolean {
  // Return true if no validation rules are provided
  if (!validation) return true;

  // Check if required but empty
  if (validation.required && (value === undefined || value === null || value === '')) {
    return typeof validation.required === 'boolean'
      ? 'This field is required'
      : 'This field is required'; // Always return the standard message for required fields
  }

  // Skip other validations if value is empty and not required
  if (value === undefined || value === null || value === '') {
    return true;
  }

  // Validate string length
  if (typeof value === 'string') {
    if (validation.minLength && value.length < validation.minLength) {
      return `Minimum length is ${validation.minLength} characters`;
    }

    if (validation.maxLength && value.length > validation.maxLength) {
      return `Maximum length is ${validation.maxLength} characters`;
    }

    // Validate pattern
    if (validation.pattern) {
      const pattern =
        typeof validation.pattern === 'string'
          ? new RegExp(validation.pattern)
          : validation.pattern;

      if (!pattern.test(value)) {
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
      return `Minimum value is ${validation.min}`;
    }

    if (validation.max !== undefined && numValue > validation.max) {
      return `Maximum value is ${validation.max}`;
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
