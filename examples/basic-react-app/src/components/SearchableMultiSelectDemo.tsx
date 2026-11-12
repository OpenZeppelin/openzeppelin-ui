import { useState } from 'react';

import { Label, SearchableMultiSelect } from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

interface Country {
  readonly code: string;
  readonly name: string;
}

/**
 * Sample allow-list items. Two entries share the label "Georgia" (the country
 * and the US state) to show that items are told apart by id, not label.
 */
const COUNTRIES: readonly Country[] = [
  { code: 'AR', name: 'Argentina' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CA', name: 'Canada' },
  { code: 'CL', name: 'Chile' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GE', name: 'Georgia' },
  { code: 'US-GA', name: 'Georgia' },
  { code: 'DE', name: 'Germany' },
  { code: 'GR', name: 'Greece' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'MX', name: 'Mexico' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NO', name: 'Norway' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'SG', name: 'Singapore' },
  { code: 'KR', name: 'South Korea' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'UY', name: 'Uruguay' },
];

const getCountryId = (country: Country): string => country.code;
const getCountryLabel = (country: Country): string => country.name;

/** Match the name, or the exact code ("fr" finds France). */
const filterCountry = (country: Country, query: string): boolean => {
  const q = query.toLowerCase();
  return country.name.toLowerCase().includes(q) || country.code.toLowerCase() === q;
};

const formatCountryCount = (count: number, total: number): string =>
  count === total ? 'All countries' : `${count} ${count === 1 ? 'country' : 'countries'} selected`;

const formatCountrySummary = (count: number): string => `${count} chosen`;

/**
 * Demonstrates SearchableMultiSelect: a country allow-list with custom copy and
 * a live selection readout, the generic defaults, and the disabled state.
 */
export function SearchableMultiSelectDemo(): React.ReactElement {
  const [allowed, setAllowed] = useState<string[]>([]);
  const [plain, setPlain] = useState<string[]>([]);

  return (
    <DemoSection
      title="SearchableMultiSelect"
      description="Pick many items of any type from a searchable list. Type to filter, use the arrow keys and Enter (or the pointer) to toggle. Selection is controlled and every piece of copy can be overridden."
      codeExample={`import { Label, SearchableMultiSelect } from '@openzeppelin/ui-components';

const [allowed, setAllowed] = useState<string[]>([]);

<Label id="allow-label">Allowed countries</Label>
<SearchableMultiSelect
  aria-labelledby="allow-label"
  items={COUNTRIES}                       // { code: 'FR', name: 'France' }[]
  getItemId={(c) => c.code}
  getItemLabel={(c) => c.name}
  selectedIds={allowed}
  onSelectionChange={setAllowed}          // ids in selection order
  placeholder="Select countries"
  searchPlaceholder="Search countries..."
  searchLabel="Search countries"
  emptyText="No country matches your search."
  formatSelectedCount={(n, total) =>
    n === total ? 'All countries' : \`\${n} countries selected\`}
/>`}
    >
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Country allow-list</h3>
        <div className="max-w-sm space-y-2">
          <Label id="sms-countries-label">Allowed countries</Label>
          <SearchableMultiSelect
            aria-labelledby="sms-countries-label"
            items={COUNTRIES}
            getItemId={getCountryId}
            getItemLabel={getCountryLabel}
            filterItem={filterCountry}
            selectedIds={allowed}
            onSelectionChange={setAllowed}
            placeholder="Select countries"
            searchPlaceholder="Search countries..."
            searchLabel="Search countries"
            emptyText="No country matches your search."
            formatSelectedCount={formatCountryCount}
            formatSelectionSummary={formatCountrySummary}
            clearAllLabel="Remove all"
          />
          <p className="text-muted-foreground text-sm">
            Selected ids:{' '}
            <output
              aria-live="polite"
              data-testid="sms-readout"
              className="text-foreground font-mono"
            >
              {allowed.length > 0 ? allowed.join(', ') : 'None'}
            </output>
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Default copy</h3>
        <div className="max-w-sm space-y-2">
          <Label id="sms-defaults-label">Items</Label>
          <SearchableMultiSelect
            aria-labelledby="sms-defaults-label"
            items={COUNTRIES}
            getItemId={getCountryId}
            getItemLabel={getCountryLabel}
            selectedIds={plain}
            onSelectionChange={setPlain}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Disabled</h3>
        <div className="max-w-sm space-y-2">
          <Label id="sms-disabled-label">Locked list</Label>
          <SearchableMultiSelect
            aria-labelledby="sms-disabled-label"
            items={COUNTRIES}
            getItemId={getCountryId}
            getItemLabel={getCountryLabel}
            selectedIds={['FR', 'DE']}
            onSelectionChange={() => {}}
            disabled
          />
        </div>
      </div>
    </DemoSection>
  );
}
