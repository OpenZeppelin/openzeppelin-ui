import { useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Label,
  SearchableMultiSelect,
} from '@openzeppelin/ui-components';

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

/**
 * Name the first two picks, then how many more: "France, Spain and 3 more".
 * The picks arrive in selection order.
 */
const formatCountryCount = (count: number, total: number, picked: readonly Country[]): string => {
  if (count === total) return 'All countries';
  const [first, second, ...rest] = picked.map(getCountryLabel);
  if (!first) return `${count} selected`;
  if (!second) return first;
  return rest.length === 0
    ? `${first} and ${second}`
    : `${first}, ${second} and ${rest.length} more`;
};

const formatCountrySummary = (count: number): string => `${count} chosen`;

/** Enough picks to wrap onto several lines in the narrow chips example. */
const CHIPS_SEED = ['FR', 'ES', 'DE', 'IT', 'NL', 'PT', 'SE', 'GB'];

/**
 * Demonstrates SearchableMultiSelect: a country allow-list with custom copy and
 * a live selection readout, removable chips, the generic defaults, the disabled
 * state, and the list opened inside a Dialog (a nested layer: one Escape closes
 * one layer).
 */
export function SearchableMultiSelectDemo(): React.ReactElement {
  const [allowed, setAllowed] = useState<string[]>([]);
  const [chips, setChips] = useState<string[]>(CHIPS_SEED);
  const [plain, setPlain] = useState<string[]>([]);
  const [inDialog, setInDialog] = useState<string[]>([]);

  return (
    <DemoSection
      title="SearchableMultiSelect"
      description="Pick many items of any type from a searchable list. Type to filter, use the arrow keys and Enter (or the pointer) to toggle. Selection is controlled and every piece of copy can be overridden. The count formatter also gets the picked items, so the closed list below names them."
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
  // The third argument is the picked items, in selection order.
  formatSelectedCount={(n, total, picked) =>
    n === total ? 'All countries' : nameFirstTwo(picked)} // "France, Spain and 3 more"
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
        <h3 className="text-lg font-medium">Chips</h3>
        <p className="text-muted-foreground text-sm">
          <code>showSelected=&quot;chips&quot;</code> also lists the picks below the trigger, in
          pick order. Each chip has a remove button; after a removal, focus moves to the next chip
          and the removal is announced. Chips wrap in a narrow field. The default chrome is a
          bordered background so chips stay visible on a muted panel; <code>chipClassName</code> can
          override that edge.
        </p>
        <div
          className="bg-muted max-w-xs space-y-3 rounded-md p-3"
          data-testid="sms-chips-tinted-panel"
        >
          <div className="space-y-2">
            <Label id="sms-chips-label">Shipping countries</Label>
            <SearchableMultiSelect
              aria-labelledby="sms-chips-label"
              items={COUNTRIES}
              getItemId={getCountryId}
              getItemLabel={getCountryLabel}
              filterItem={filterCountry}
              selectedIds={chips}
              onSelectionChange={setChips}
              placeholder="Select countries"
              searchPlaceholder="Search countries..."
              searchLabel="Search countries"
              emptyText="No country matches your search."
              showSelected="chips"
            />
            <p className="text-muted-foreground text-sm">
              Selected ids:{' '}
              <output
                aria-live="polite"
                data-testid="sms-chips-readout"
                className="text-foreground font-mono"
              >
                {chips.length > 0 ? chips.join(', ') : 'None'}
              </output>
            </p>
          </div>
          <div className="space-y-2" data-testid="sms-chips-override">
            <Label id="sms-chips-override-label">Custom chip border</Label>
            <SearchableMultiSelect
              aria-labelledby="sms-chips-override-label"
              items={COUNTRIES}
              getItemId={getCountryId}
              getItemLabel={getCountryLabel}
              filterItem={filterCountry}
              selectedIds={chips}
              onSelectionChange={setChips}
              placeholder="Select countries"
              showSelected="chips"
              chipClassName="border-primary"
            />
          </div>
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

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Inside a dialog</h3>
        <div className="max-w-sm space-y-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Edit items in a dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit items</DialogTitle>
                <DialogDescription>
                  The list opens on top of this dialog. Escape closes the list first, then the
                  dialog.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label id="sms-dialog-label">Items</Label>
                <SearchableMultiSelect
                  aria-labelledby="sms-dialog-label"
                  items={COUNTRIES}
                  getItemId={getCountryId}
                  getItemLabel={getCountryLabel}
                  filterItem={filterCountry}
                  selectedIds={inDialog}
                  onSelectionChange={setInDialog}
                />
              </div>
            </DialogContent>
          </Dialog>
          <p className="text-muted-foreground text-sm">
            Selected ids:{' '}
            <output
              aria-live="polite"
              data-testid="sms-dialog-readout"
              className="text-foreground font-mono"
            >
              {inDialog.length > 0 ? inDialog.join(', ') : 'None'}
            </output>
          </p>
        </div>
      </div>
    </DemoSection>
  );
}
