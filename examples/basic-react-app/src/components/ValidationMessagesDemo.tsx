import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import {
  AmountField,
  Button,
  MapField,
  SearchableMultiSelectField,
  TextField,
} from '@openzeppelin/ui-components';
import type { FieldValidation } from '@openzeppelin/ui-types';

import { CodeBlock } from './CodeBlock';

interface ValidationMessagesValues {
  displayName: string;
  amount: string;
  countries: string[];
  defaultName: string;
  limits: Array<{ key: string; value: string }>;
}

interface Country {
  code: string;
  name: string;
}

// Local on purpose: this demo does not share data with other pages.
const COUNTRIES: Country[] = [
  { code: 'BR', name: 'Brazil' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'ES', name: 'Spain' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
];

const getCountryId = (country: Country): string => country.code;
const getCountryLabel = (country: Country): string => country.name;

const RESERVED_NAMES = new Set(['admin', 'root']);
/** Zero in any spelling the exact grammar accepts: `0`, `0.00`, `.0`, `-0`. */
const ZERO_AMOUNT = /^-?0*\.?0*$/;

const DISPLAY_NAME_VALIDATION: FieldValidation = {
  required: true,
  maxLength: 20,
  pattern: /^[A-Za-z0-9 ]+$/,
  messages: {
    required: 'Enter a display name',
    maxLength: 'Keep the display name to 20 characters or fewer',
    pattern: 'Use letters, digits and spaces only',
  },
  validate: (value) =>
    typeof value === 'string' && RESERVED_NAMES.has(value.trim().toLowerCase())
      ? 'That name is reserved'
      : true,
};

const AMOUNT_VALIDATION: FieldValidation = {
  required: true,
  messages: { required: 'Enter an amount' },
  // Exact-entry mode hands the check the typed string, never a float.
  validate: (value) =>
    typeof value === 'string' && ZERO_AMOUNT.test(value) ? 'Amount must be above zero' : true,
};

const COUNTRIES_VALIDATION: FieldValidation = {
  required: true,
  messages: { required: 'Pick at least one country' },
  validate: (value) =>
    Array.isArray(value) && value.includes('DE') ? 'Germany is not available yet' : true,
};

const LIMITS_VALIDATION: FieldValidation = {
  required: true,
  messages: { required: 'Add at least one limit' },
};

const LIMIT_KEY_VALIDATION: FieldValidation = {
  required: true,
  pattern: /^[a-z][a-z0-9_]*$/,
  messages: {
    required: 'Enter a limit name',
    pattern: 'Use lowercase letters, digits and underscores, starting with a letter',
  },
  validate: (value) =>
    typeof value === 'string' && RESERVED_NAMES.has(value) ? 'That limit name is reserved' : true,
};

/**
 * ValidationMessagesDemo - custom messages and a custom check on `FieldValidation`,
 * next to a field with neither, on one small form.
 *
 * Each custom field layers its rules in the kit's order: required, the built-in
 * rules, the field's own validator (`validateAmount`, `validateSelection`), then
 * `validation.validate`. The first failure's message shows. The default field
 * keeps the kit's own wording.
 *
 * The `data-testid`s are stable hooks for the browser proof.
 */
export function ValidationMessagesDemo(): React.ReactElement {
  const [submitted, setSubmitted] = useState<ValidationMessagesValues | null>(null);
  const [submitCount, setSubmitCount] = useState(0);

  const form = useForm<ValidationMessagesValues>({
    defaultValues: {
      displayName: '',
      amount: '',
      countries: [],
      defaultName: '',
      limits: [],
    },
    mode: 'onTouched',
  });

  const onSubmit = (values: ValidationMessagesValues): void => {
    setSubmitted(values);
    setSubmitCount((count) => count + 1);
  };

  return (
    <section className="mt-8 space-y-4" aria-labelledby="validation-messages-heading">
      <div className="space-y-1">
        <h3 id="validation-messages-heading" className="text-lg font-medium">
          Validation messages
        </h3>
        <p className="text-muted-foreground text-sm">
          The first four fields set custom messages and a custom check in <code>validation</code>.
          Leave them empty, break each rule, then fix them and submit. The last field sets no
          messages and shows the default wording.
        </p>
      </div>

      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          // Without noValidate the browser's own required prompt preempts the kit messages.
          noValidate
          className="space-y-6"
          data-testid="validation-messages-form"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <TextField
              id="vmDisplayName"
              name="displayName"
              label="Display name"
              control={form.control}
              placeholder="e.g. Treasury team"
              helperText='Letters, digits and spaces, up to 20 characters. "admin" and "root" are reserved.'
              validation={DISPLAY_NAME_VALIDATION}
            />

            <div data-testid="vm-amount-field">
              <AmountField
                id="vmAmount"
                name="amount"
                label="Amount"
                control={form.control}
                placeholder="0.00"
                helperText="Up to 6 decimals, at most 1000, above zero."
                decimals={6}
                max="1000"
                formatOnBlur={false}
                validateAmount={(value) =>
                  value.startsWith('-') ? 'Enter a positive amount' : true
                }
                validation={AMOUNT_VALIDATION}
              />
            </div>

            <SearchableMultiSelectField
              id="vmCountries"
              name="countries"
              label="Countries"
              control={form.control}
              helperText="Up to three countries. Germany is not available yet."
              items={COUNTRIES}
              getItemId={getCountryId}
              getItemLabel={getCountryLabel}
              placeholder="Select countries"
              searchPlaceholder="Search countries..."
              searchLabel="Search countries"
              emptyText="No country matches your search."
              validateSelection={(ids) => ids.length <= 3 || 'Pick at most three countries'}
              validation={COUNTRIES_VALIDATION}
            />

            <div data-testid="vm-limits-field">
              <MapField
                id="vmLimits"
                name="limits"
                label="Limits"
                control={form.control}
                helperText='Name each limit in lowercase. "admin" and "root" are reserved.'
                validation={LIMITS_VALIDATION}
                renderKeyField={(field, index) => (
                  <TextField
                    key={`key-${index}`}
                    id={field.id}
                    name={`limits.${index}.key` as `limits.${number}.key`}
                    label=""
                    control={form.control}
                    placeholder="Limit name"
                    validation={LIMIT_KEY_VALIDATION}
                  />
                )}
                renderValueField={(field, index) => (
                  <TextField
                    key={`value-${index}`}
                    id={field.id}
                    name={`limits.${index}.value` as `limits.${number}.value`}
                    label=""
                    control={form.control}
                    placeholder="Value"
                  />
                )}
              />
            </div>

            <TextField
              id="vmDefaultName"
              name="defaultName"
              label="Default field"
              control={form.control}
              placeholder="Up to 10 characters"
              helperText="Required, at most 10 characters, no custom messages."
              validation={{ required: true, maxLength: 10 }}
            />
          </div>

          <div className="flex items-center justify-end gap-4">
            <p
              className="text-muted-foreground text-sm"
              data-testid="validation-messages-submit-count"
            >
              Submitted {submitCount} {submitCount === 1 ? 'time' : 'times'}
            </p>
            <Button type="submit" data-testid="validation-messages-submit">
              Submit
            </Button>
          </div>
        </form>
      </FormProvider>

      <div data-testid="validation-messages-payload">
        <CodeBlock
          code={submitted ? JSON.stringify(submitted, null, 2) : '// submit the form'}
          language="json"
        />
      </div>
    </section>
  );
}
