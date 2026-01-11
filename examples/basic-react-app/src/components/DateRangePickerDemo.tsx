import { useState } from 'react';

import { DateRangePicker, type DateRange } from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

// Helper functions for date manipulation
const subDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * DateRangePickerDemo - Demonstrates the DateRangePicker component with various configurations.
 * A complete date range selection UI with button trigger and calendar popover.
 */
export function DateRangePickerDemo(): React.ReactElement {
  const [basicRange, setBasicRange] = useState<DateRange | undefined>(undefined);
  const [presetRange, setPresetRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [singleMonthRange, setSingleMonthRange] = useState<DateRange | undefined>(undefined);

  const codeExample = `import { DateRangePicker } from '@openzeppelin/ui-components';
import type { DateRange } from 'react-day-picker';
import { useState } from 'react';

const [dateRange, setDateRange] = useState<DateRange | undefined>();

// Basic usage
<DateRangePicker
  value={dateRange}
  onChange={setDateRange}
  placeholder="Select date range"
/>

// With custom number of months and alignment
<DateRangePicker
  value={dateRange}
  onChange={setDateRange}
  numberOfMonths={1}
  align="center"
/>

// Disabled state
<DateRangePicker
  value={dateRange}
  onChange={setDateRange}
  disabled={true}
/>`;

  return (
    <DemoSection
      title="DateRangePicker"
      description="A date range picker component with a button trigger and calendar popover. Perfect for filtering data by date ranges or selecting time periods."
      codeExample={codeExample}
    >
      {/* Basic Usage */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Usage</h3>
        <p className="text-muted-foreground text-sm">
          Click the button to open the calendar popover and select a date range. The picker displays
          two months by default for easier range selection.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <DateRangePicker
            value={basicRange}
            onChange={setBasicRange}
            placeholder="Select date range"
          />
          <div className="bg-muted rounded-lg px-4 py-2">
            <span className="text-muted-foreground text-sm">
              {basicRange?.from
                ? `${basicRange.from.toLocaleDateString()}${basicRange.to ? ` - ${basicRange.to.toLocaleDateString()}` : ''}`
                : 'No range selected'}
            </span>
          </div>
        </div>
      </div>

      {/* With Preset Value */}
      <div className="mt-8 space-y-4">
        <h3 className="text-lg font-medium">With Preset Value</h3>
        <p className="text-muted-foreground text-sm">
          Initialize with a preset date range. This example shows the last 7 days pre-selected.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <DateRangePicker
            value={presetRange}
            onChange={setPresetRange}
            placeholder="Select date range"
          />
          <button
            onClick={() =>
              setPresetRange({
                from: subDays(new Date(), 7),
                to: new Date(),
              })
            }
            className="text-muted-foreground hover:text-foreground text-sm underline"
          >
            Reset to last 7 days
          </button>
        </div>
      </div>

      {/* Single Month Display */}
      <div className="mt-8 space-y-4">
        <h3 className="text-lg font-medium">Single Month Display</h3>
        <p className="text-muted-foreground text-sm">
          Configure to show only one month for a more compact UI. Useful for mobile or limited
          space.
        </p>
        <DateRangePicker
          value={singleMonthRange}
          onChange={setSingleMonthRange}
          placeholder="Select date range"
          numberOfMonths={1}
        />
      </div>

      {/* Alignment Options */}
      <div className="mt-8 space-y-4">
        <h3 className="text-lg font-medium">Alignment Options</h3>
        <p className="text-muted-foreground text-sm">
          Control how the popover aligns with the trigger button.
        </p>
        <div className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Start (default)</p>
            <DateRangePicker placeholder="Align start" align="start" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Center</p>
            <DateRangePicker placeholder="Align center" align="center" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">End</p>
            <DateRangePicker placeholder="Align end" align="end" />
          </div>
        </div>
      </div>

      {/* States */}
      <div className="mt-8 space-y-4">
        <h3 className="text-lg font-medium">States</h3>
        <div className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Normal</p>
            <DateRangePicker placeholder="Normal state" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Disabled</p>
            <DateRangePicker placeholder="Disabled state" disabled />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">With Value</p>
            <DateRangePicker
              value={{
                from: new Date(),
                to: addDays(new Date(), 14),
              }}
              placeholder="With value"
            />
          </div>
        </div>
      </div>

      {/* Common Use Cases */}
      <div className="mt-8 space-y-4">
        <h3 className="text-lg font-medium">Common Use Cases</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h4 className="mb-2 text-sm font-medium">Transaction History Filter</h4>
            <p className="text-muted-foreground mb-3 text-xs">
              Filter blockchain transactions by date range.
            </p>
            <DateRangePicker placeholder="Filter transactions..." />
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="mb-2 text-sm font-medium">Vesting Schedule</h4>
            <p className="text-muted-foreground mb-3 text-xs">
              Define token vesting or lock periods.
            </p>
            <DateRangePicker placeholder="Select vesting period..." />
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="mb-2 text-sm font-medium">Analytics Dashboard</h4>
            <p className="text-muted-foreground mb-3 text-xs">
              Select time period for metrics and charts.
            </p>
            <DateRangePicker
              placeholder="Select period..."
              value={{
                from: subDays(new Date(), 30),
                to: new Date(),
              }}
            />
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="mb-2 text-sm font-medium">Contract Duration</h4>
            <p className="text-muted-foreground mb-3 text-xs">
              Set start and end dates for smart contract operations.
            </p>
            <DateRangePicker placeholder="Select duration..." numberOfMonths={1} />
          </div>
        </div>
      </div>

      {/* Quick Range Presets Example */}
      <div className="mt-8 space-y-4">
        <h3 className="text-lg font-medium">Quick Range Presets</h3>
        <p className="text-muted-foreground text-sm">
          Combine with quick preset buttons for common date ranges.
        </p>
        <QuickRangeExample />
      </div>

      {/* Props Reference */}
      <div className="bg-muted/50 mt-8 rounded-lg border p-4">
        <h4 className="mb-2 text-sm font-medium">Props Reference</h4>
        <div className="text-muted-foreground space-y-1 text-sm">
          <p>
            <code className="bg-muted rounded px-1">value</code> - The selected date range (
            {'DateRange | undefined'})
          </p>
          <p>
            <code className="bg-muted rounded px-1">onChange</code> - Callback when range changes
          </p>
          <p>
            <code className="bg-muted rounded px-1">placeholder</code> - Text shown when no date
            selected
          </p>
          <p>
            <code className="bg-muted rounded px-1">disabled</code> - Disable the picker
          </p>
          <p>
            <code className="bg-muted rounded px-1">numberOfMonths</code> - Number of months to
            display (default: 2)
          </p>
          <p>
            <code className="bg-muted rounded px-1">align</code> - Popover alignment
            (&apos;start&apos; | &apos;center&apos; | &apos;end&apos;)
          </p>
        </div>
      </div>
    </DemoSection>
  );
}

/**
 * Example component showing quick range preset buttons
 */
function QuickRangeExample(): React.ReactElement {
  const [range, setRange] = useState<DateRange | undefined>(undefined);

  const presets = [
    { label: 'Today', getDates: () => ({ from: new Date(), to: new Date() }) },
    { label: 'Last 7 days', getDates: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
    { label: 'Last 30 days', getDates: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
    { label: 'Last 90 days', getDates: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DateRangePicker value={range} onChange={setRange} placeholder="Custom range..." />
      <div className="flex flex-wrap gap-1">
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => setRange(preset.getDates())}
            className="bg-muted hover:bg-muted/80 rounded px-2 py-1 text-xs transition-colors"
          >
            {preset.label}
          </button>
        ))}
        {range && (
          <button
            onClick={() => setRange(undefined)}
            className="text-muted-foreground hover:text-foreground px-2 py-1 text-xs"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
