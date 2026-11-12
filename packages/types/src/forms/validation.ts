import { FieldCondition } from './fields';

/**
 * Custom error text for the built-in rules of a `FieldValidation`.
 *
 * A message applies only when its rule is set on the same `FieldValidation` and
 * that rule fails. An empty string counts as unset, and the field's default text
 * shows. Messages are plain strings, so they survive a form config stored as JSON.
 */
export interface FieldValidationMessages {
  /** Shown when `required` is set and the field is empty. */
  required?: string;

  /** Shown when the value is below `min`. */
  min?: string;

  /** Shown when the value is above `max`. */
  max?: string;

  /** Shown when the text is shorter than `minLength`. */
  minLength?: string;

  /** Shown when the text is longer than `maxLength`. */
  maxLength?: string;

  /** Shown when the text doesn't match `pattern`. Replaces the integer-pattern wording too. */
  pattern?: string;
}

/**
 * A custom check for a field value.
 *
 * Runs after every built-in rule and the field's own validator have passed, and
 * only for a non-empty value, so an optional field stays optional. Receives the
 * value as the form stores it: a string for text fields and exact-entry amounts,
 * a number or string for number fields, an id list for a multi-select, and so on.
 *
 * Return `true` to pass, or the error message to show. Any other result,
 * including `false`, an empty string or a Promise, fails with a generic message,
 * as does a thrown error. Must be synchronous. Being a function, it does not
 * survive a form config stored as JSON.
 */
export type FieldValidationCheck = (value: unknown) => boolean | string;

/**
 * Validation rules for form fields
 */
export interface FieldValidation {
  /**
   * Whether the field is required
   */
  required?: boolean;

  /**
   * Minimum value for number fields
   */
  min?: number;

  /**
   * Maximum value for number fields
   */
  max?: number;

  /**
   * Minimum length for text fields
   */
  minLength?: number;

  /**
   * Maximum length for text fields
   */
  maxLength?: number;

  /**
   * Regular expression pattern for text validation
   */
  pattern?: string | RegExp;

  /**
   * Validation rules that depend on other fields
   */
  conditions?: FieldCondition[];

  /**
   * Custom error text for the rules above. Each message applies only when its
   * rule is set here and fails.
   */
  messages?: FieldValidationMessages;

  /**
   * Custom check, run after the built-in rules and the field's own validator,
   * for non-empty values only. Return `true` to pass or the error message.
   */
  validate?: FieldValidationCheck;
}
