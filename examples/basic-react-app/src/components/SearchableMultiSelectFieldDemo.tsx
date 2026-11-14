import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button, SearchableMultiSelectField } from '@openzeppelin/ui-components';

import { CodeBlock } from './CodeBlock';

interface Country {
  code: string;
  name: string;
}

interface SearchableMultiSelectFieldValues {
  countries: string[];
  blocked: string[];
}

// Local on purpose: this demo does not share data with the SearchableMultiSelect page.
const COUNTRIES: Country[] = [
  { code: 'AR', name: 'Argentina' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'ES', name: 'Spain' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'NL', name: 'Netherlands' },
];

const getCountryId = (country: Country): string => country.code;
const getCountryLabel = (country: Country): string => country.name;

/**
 * SearchableMultiSelectFieldDemo - a required SearchableMultiSelectField on its own small form,
 * so the submitted payload shows the ids the field hands to the form, in pick order.
 *
 * `onTouched` mode on purpose: opening the picker must not flash the required error.
 * The second field shows the picks as removable chips (`showSelected="chips"`); the payload lists
 * the remaining chips' ids in pick order.
 * The Read-only toggle switches both fields to `readOnlyMode="readonly"`: the trigger stays
 * focusable, the list does not open, chips lose their remove buttons, and the picked ids stay in
 * the payload.
 * The `data-testid`s are stable hooks for browser checks against the running app.
 */
export function SearchableMultiSelectFieldDemo(): React.ReactElement {
  const [submitted, setSubmitted] = useState<SearchableMultiSelectFieldValues | null>(null);
  const [readOnly, setReadOnly] = useState(false);

  const form = useForm<SearchableMultiSelectFieldValues>({
    defaultValues: { countries: [], blocked: [] },
    mode: 'onTouched',
  });

  return (
    <section className="mt-8 space-y-4" aria-labelledby="searchable-multi-select-field-heading">
      <div className="space-y-1">
        <h3 id="searchable-multi-select-field-heading" className="text-lg font-medium">
          Searchable Multi Select Field
        </h3>
        <p className="text-muted-foreground text-sm">
          Submit empty to see the required error, then pick two countries and submit again. Blocked
          countries show as chips: remove one and submit to see it leave the payload.
        </p>
      </div>

      <Button
        type="button"
        size="sm"
        variant={readOnly ? 'default' : 'outline'}
        aria-pressed={readOnly}
        onClick={() => setReadOnly((value) => !value)}
        data-testid="smsf-readonly-toggle"
      >
        Read-only
      </Button>

      <form
        onSubmit={form.handleSubmit((values) => setSubmitted(values))}
        className="space-y-4"
        data-testid="smsf-form"
      >
        <SearchableMultiSelectField
          id="smsfCountries"
          name="countries"
          label="Allowed countries"
          control={form.control}
          validation={{ required: true }}
          helperText="Investors from these countries can hold the token."
          items={COUNTRIES}
          getItemId={getCountryId}
          getItemLabel={getCountryLabel}
          placeholder="Select countries"
          searchPlaceholder="Search countries..."
          searchLabel="Search countries"
          emptyText="No country matches your search."
          formatSelectedCount={(count, total) =>
            count === total ? 'All countries' : `${count} selected`
          }
          readOnly={readOnly}
          readOnlyMode="readonly"
        />
        <div className="bg-muted rounded-md p-3" data-testid="smsf-chips-tinted-panel">
          <SearchableMultiSelectField
            id="smsfBlocked"
            name="blocked"
            label="Blocked countries"
            control={form.control}
            helperText="Each pick shows as a chip you can remove. Chips keep a visible edge on this muted panel."
            items={COUNTRIES}
            getItemId={getCountryId}
            getItemLabel={getCountryLabel}
            placeholder="Select countries"
            searchPlaceholder="Search countries..."
            searchLabel="Search countries"
            emptyText="No country matches your search."
            showSelected="chips"
            readOnly={readOnly}
            readOnlyMode="readonly"
          />
        </div>
        <Button type="submit">Submit</Button>
      </form>

      <div data-testid="smsf-payload">
        <CodeBlock
          code={submitted ? JSON.stringify(submitted, null, 2) : '// submit the form'}
          language="json"
        />
      </div>
    </section>
  );
}
