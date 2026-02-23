import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, FieldValues } from 'react-hook-form';

import type { AddressSuggestion, ContractAdapter } from '@openzeppelin/ui-types';
import { cn } from '@openzeppelin/ui-utils';

import { AddressSuggestionContext } from './address-suggestion/context';

import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { BaseFieldProps } from './BaseField';
import {
  ErrorMessage,
  getAccessibilityProps,
  getValidationStateClasses,
  handleEscapeKey,
  validateField,
} from './utils';

const DEBOUNCE_MS = 200;
const MAX_SUGGESTIONS = 5;

interface AddressFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  adapter?: ContractAdapter;

  /**
   * Explicit suggestion list. When provided, overrides context-based resolution.
   * Pass `false` to disable suggestions entirely (even when a context provider is mounted).
   */
  suggestions?: AddressSuggestion[] | false;

  /**
   * Called when the user selects a suggestion. Receives the selected suggestion
   * so callers can perform additional side-effects beyond filling the field value.
   */
  onSuggestionSelect?: (suggestion: AddressSuggestion) => void;
}

/**
 * Address input field component specifically designed for blockchain addresses via React Hook Form integration.
 *
 * Architecture flow:
 * 1. Form schemas are generated from contract functions using adapters
 * 2. TransactionForm renders the overall form structure with React Hook Form
 * 3. DynamicFormField selects the appropriate field component (like AddressField) based on field type
 * 4. BaseField provides consistent layout and hook form integration
 * 5. This component handles blockchain address-specific rendering and validation using the passed adapter
 *
 * The component includes:
 * - Integration with React Hook Form
 * - Blockchain address validation through adapter-provided custom validation
 * - Automatic error handling and reporting
 * - Chain-agnostic design (validation handled by adapters)
 * - Full accessibility support with ARIA attributes
 * - Keyboard navigation
 *
 * Autocomplete suggestions can be provided in two ways:
 *
 * 1. **Context-based (zero-config)**: Mount an `AddressSuggestionProvider` in the
 *    component tree. Every `AddressField` below it automatically resolves suggestions.
 *
 * 2. **Prop-based (explicit)**: Pass `suggestions` directly. This overrides context.
 *    Pass `suggestions={false}` to opt out when a provider is mounted.
 *
 * The suggestion dropdown includes built-in debouncing, keyboard navigation (Arrow keys,
 * Enter, Escape), click-outside dismissal, and ARIA listbox semantics.
 */
export function AddressField<TFieldValues extends FieldValues = FieldValues>({
  id,
  label,
  placeholder,
  helperText,
  control,
  name,
  width = 'full',
  validation,
  adapter,
  readOnly,
  suggestions: suggestionsProp,
  onSuggestionSelect,
}: AddressFieldProps<TFieldValues>): React.ReactElement {
  const isRequired = !!validation?.required;
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;

  const contextResolver = useContext(AddressSuggestionContext);
  const containerRef = useRef<HTMLDivElement>(null);

  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    if (!inputValue.trim()) {
      setDebouncedQuery('');
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(inputValue), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const suggestionsDisabled = suggestionsProp === false;

  const resolvedSuggestions = useMemo<AddressSuggestion[]>(() => {
    if (suggestionsDisabled) return [];
    if (Array.isArray(suggestionsProp)) return suggestionsProp;
    if (!contextResolver || !debouncedQuery.trim()) return [];
    return contextResolver.resolveSuggestions(debouncedQuery).slice(0, MAX_SUGGESTIONS);
  }, [suggestionsDisabled, suggestionsProp, contextResolver, debouncedQuery]);

  const hasSuggestions = showSuggestions && resolvedSuggestions.length > 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSuggestionKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!hasSuggestions) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < resolvedSuggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : resolvedSuggestions.length - 1));
      }
    },
    [hasSuggestions, resolvedSuggestions.length]
  );

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
            // Check required field explicitly first
            if (value === undefined || value === null || value === '') {
              return validation?.required ? 'This field is required' : true;
            }

            // Perform standard validations (min, max, pattern, etc.) if they exist
            // Using the existing validateField utility for this part
            const standardValidationResult = validateField(value, validation);
            if (standardValidationResult !== true) {
              return standardValidationResult;
            }

            // Perform adapter-specific address validation if adapter exists
            if (adapter && typeof value === 'string') {
              if (!adapter.isValidAddress(value)) {
                return 'Invalid address format for the selected chain';
              }
            }

            // If all checks pass
            return true;
          },
        }}
        disabled={readOnly}
        render={({ fieldState: { error, isTouched }, field }) => {
          const hasError = !!error;
          const shouldShowError = hasError && isTouched;
          const validationClasses = getValidationStateClasses(error, isTouched);

          // Safely extract the pattern error message. The `pattern` validation rule can be either a
          // RegExp object or an object with a `value` (RegExp) and a `message` (string). This
          // type guard ensures we only try to access `.message` on the correct object type.
          const patternErrorMessage =
            validation?.pattern &&
            typeof validation.pattern === 'object' &&
            'message' in validation.pattern
              ? (validation.pattern.message as string)
              : undefined;

          // Handle input change with validation
          const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
            const value = e.target.value;
            field.onChange(value);
            // Note: Validation happens naturally when user leaves the field
            // No need to trigger it programmatically on every change
            setInputValue(value);
            setShowSuggestions(value.length > 0);
            setHighlightedIndex(-1);
          };

          // Add keyboard accessibility for clearing the field with Escape
          const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
            if (hasSuggestions && e.key === 'Enter' && highlightedIndex >= 0) {
              e.preventDefault();
              const selected = resolvedSuggestions[highlightedIndex];
              field.onChange(selected.value);
              onSuggestionSelect?.(selected);
              setInputValue('');
              setShowSuggestions(false);
              setHighlightedIndex(-1);
              return;
            }

            if (e.key === 'Escape') {
              if (hasSuggestions) {
                setShowSuggestions(false);
                return;
              }
              handleEscapeKey(field.onChange, field.value)(e);
            }
          };

          const handleSelectSuggestion = (suggestion: AddressSuggestion): void => {
            field.onChange(suggestion.value);
            onSuggestionSelect?.(suggestion);
            setInputValue('');
            setShowSuggestions(false);
            setHighlightedIndex(-1);
          };

          // Get accessibility attributes
          const accessibilityProps = getAccessibilityProps({
            id,
            hasError,
            isRequired,
            hasHelperText: !!helperText,
          });

          return (
            <>
              <div ref={containerRef} className="relative" onKeyDown={handleSuggestionKeyDown}>
                <Input
                  {...field}
                  id={id}
                  placeholder={placeholder || '0x...'}
                  className={validationClasses}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  data-slot="input"
                  value={field.value ?? ''}
                  {...accessibilityProps}
                  aria-describedby={`${helperText ? descriptionId : ''} ${hasError ? errorId : ''}`}
                  aria-expanded={hasSuggestions}
                  aria-autocomplete={suggestionsDisabled ? undefined : 'list'}
                  aria-controls={hasSuggestions ? `${id}-suggestions` : undefined}
                  aria-activedescendant={
                    hasSuggestions && highlightedIndex >= 0
                      ? `${id}-suggestion-${highlightedIndex}`
                      : undefined
                  }
                  disabled={readOnly}
                />

                {hasSuggestions && (
                  <div
                    id={`${id}-suggestions`}
                    className={cn(
                      'absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md',
                      'max-h-48 overflow-auto'
                    )}
                    role="listbox"
                  >
                    {resolvedSuggestions.map((s, i) => (
                      <button
                        key={`${s.value}-${s.description ?? i}`}
                        id={`${id}-suggestion-${i}`}
                        type="button"
                        role="option"
                        aria-selected={i === highlightedIndex}
                        className={cn(
                          'flex w-full flex-col px-3 py-2 text-left text-sm',
                          'hover:bg-accent',
                          i === highlightedIndex && 'bg-accent'
                        )}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectSuggestion(s);
                        }}
                        onMouseEnter={() => setHighlightedIndex(i)}
                      >
                        <span className="font-medium">{s.label}</span>
                        <span className="truncate font-mono text-xs text-muted-foreground">
                          {s.value}
                        </span>
                      </button>
                    ))}
                  </div>
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
                message={shouldShowError ? error?.message || patternErrorMessage : undefined}
              />
            </>
          );
        }}
      />
    </div>
  );
}

// Set displayName manually for better debugging
AddressField.displayName = 'AddressField';
