import { useState } from 'react';

import { Calendar, type DateRange } from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/**
 * CalendarDemo - Demonstrates the Calendar component with various selection modes.
 * The Calendar is built on react-day-picker with shadcn/ui styling.
 */
export function CalendarDemo(): React.ReactElement {
  const [singleDate, setSingleDate] = useState<Date | undefined>(undefined);
  const [multipleDates, setMultipleDates] = useState<Date[] | undefined>(undefined);
  const [rangeDate, setRangeDate] = useState<DateRange | undefined>(undefined);

  const codeExample = `import { Calendar } from '@openzeppelin/ui-components';
import { useState } from 'react';

// Single date selection
const [date, setDate] = useState<Date | undefined>();
<Calendar
  mode="single"
  selected={date}
  onSelect={setDate}
/>

// Multiple dates selection
const [dates, setDates] = useState<Date[] | undefined>();
<Calendar
  mode="multiple"
  selected={dates}
  onSelect={setDates}
/>

// Date range selection
const [range, setRange] = useState<{ from: Date; to?: Date }>();
<Calendar
  mode="range"
  selected={range}
  onSelect={setRange}
  numberOfMonths={2}
/>`;

  return (
    <DemoSection
      title="Calendar"
      description="A date picker calendar component built on react-day-picker. Supports single date, multiple dates, and date range selection modes."
      codeExample={codeExample}
    >
      {/* Single Date Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Single Date Selection</h3>
        <p className="text-muted-foreground text-sm">
          Select a single date from the calendar. Commonly used for selecting a specific date like a
          transaction date or deadline.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="overflow-hidden rounded-lg border">
            <Calendar mode="single" selected={singleDate} onSelect={setSingleDate} />
          </div>
          <div className="bg-muted min-w-48 rounded-lg p-4">
            <p className="text-sm font-medium">Selected Date:</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {singleDate ? singleDate.toLocaleDateString() : 'None selected'}
            </p>
          </div>
        </div>
      </div>

      {/* Multiple Dates Selection */}
      <div className="mt-8 space-y-4">
        <h3 className="text-lg font-medium">Multiple Dates Selection</h3>
        <p className="text-muted-foreground text-sm">
          Select multiple individual dates. Useful for selecting non-consecutive dates like vesting
          milestones or scheduled events.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="overflow-hidden rounded-lg border">
            <Calendar mode="multiple" selected={multipleDates} onSelect={setMultipleDates} />
          </div>
          <div className="bg-muted min-w-48 rounded-lg p-4">
            <p className="text-sm font-medium">Selected Dates:</p>
            <div className="text-muted-foreground mt-1 text-sm">
              {multipleDates && multipleDates.length > 0 ? (
                <ul className="space-y-1">
                  {multipleDates.map((date, index) => (
                    <li key={index}>{date.toLocaleDateString()}</li>
                  ))}
                </ul>
              ) : (
                'None selected'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Date Range Selection */}
      <div className="mt-8 space-y-4">
        <h3 className="text-lg font-medium">Date Range Selection</h3>
        <p className="text-muted-foreground text-sm">
          Select a date range with start and end dates. Perfect for filtering transactions by date
          range or setting lock periods.
        </p>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="overflow-hidden rounded-lg border">
            <Calendar
              mode="range"
              selected={rangeDate}
              onSelect={setRangeDate}
              numberOfMonths={2}
            />
          </div>
          <div className="bg-muted min-w-48 rounded-lg p-4">
            <p className="text-sm font-medium">Selected Range:</p>
            <div className="text-muted-foreground mt-1 text-sm">
              {rangeDate?.from ? (
                <>
                  <p>From: {rangeDate.from.toLocaleDateString()}</p>
                  <p>To: {rangeDate.to ? rangeDate.to.toLocaleDateString() : 'Select end date'}</p>
                </>
              ) : (
                'None selected'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Variants */}
      <div className="mt-8 space-y-4">
        <h3 className="text-lg font-medium">Configuration Options</h3>
        <div className="flex flex-wrap gap-4">
          <div className="w-fit rounded-lg border p-4">
            <h4 className="mb-2 text-sm font-medium">Hide Outside Days</h4>
            <p className="text-muted-foreground mb-3 text-xs">
              Hide days from adjacent months for cleaner display.
            </p>
            <div className="overflow-hidden rounded border">
              <Calendar mode="single" showOutsideDays={false} hideNavigation />
            </div>
          </div>

          <div className="w-fit rounded-lg border p-4">
            <h4 className="mb-2 text-sm font-medium">Disabled Dates</h4>
            <p className="text-muted-foreground mb-3 text-xs">
              Disable past dates or specific dates.
            </p>
            <div className="overflow-hidden rounded border">
              <Calendar
                mode="single"
                disabled={(date) => date < new Date()}
                defaultMonth={new Date()}
                hideNavigation
              />
            </div>
          </div>

          <div className="w-fit rounded-lg border p-4">
            <h4 className="mb-2 text-sm font-medium">Fixed Weeks</h4>
            <p className="text-muted-foreground mb-3 text-xs">
              Always display 6 weeks for consistent height.
            </p>
            <div className="overflow-hidden rounded border">
              <Calendar mode="single" fixedWeeks hideNavigation />
            </div>
          </div>
        </div>
      </div>

      {/* Usage Notes */}
      <div className="bg-muted/50 mt-8 rounded-lg border p-4">
        <h4 className="mb-2 text-sm font-medium">Usage Notes</h4>
        <ul className="text-muted-foreground space-y-1 text-sm">
          <li>
            • The Calendar component is built on{' '}
            <code className="bg-muted rounded px-1">react-day-picker</code> v9
          </li>
          <li>• All react-day-picker props are supported through the component</li>
          <li>• Use with DateRangePicker for a complete date range selection UI with popover</li>
          <li>• Styling follows the design system tokens for consistent theming</li>
        </ul>
      </div>
    </DemoSection>
  );
}
