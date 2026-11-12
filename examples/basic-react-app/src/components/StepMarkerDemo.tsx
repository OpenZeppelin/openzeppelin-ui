import { StepMarker, type StepMarkerState } from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

const STATES: readonly StepMarkerState[] = [
  'completed',
  'current',
  'visited',
  'invalid',
  'upcoming',
];

const REVIEW_ROWS: ReadonlyArray<{ title: string; state: StepMarkerState }> = [
  { title: 'Connect wallet', state: 'completed' },
  { title: 'Choose network', state: 'visited' },
  { title: 'Enter contract address', state: 'invalid' },
  { title: 'Review and confirm', state: 'current' },
  { title: 'Deploy', state: 'upcoming' },
];

/** Demonstrates StepMarker: every state, and a numbered review list. */
export function StepMarkerDemo(): React.ReactElement {
  return (
    <DemoSection
      title="StepMarker"
      description="The numbered circle the wizard stepper draws, usable on its own for numbered rows in tables and review lists."
      codeExample={`import { StepMarker } from '@openzeppelin/ui-components';

<StepMarker state="current" number={2} />

// Numbered review list
{rows.map((row, i) => (
  <li key={row.title} className="flex items-center gap-3">
    <StepMarker state={row.state} number={i + 1} />
    {row.title}
  </li>
))}`}
    >
      <div className="space-y-6">
        <div className="space-y-2" data-testid="step-marker-states">
          <h3 className="text-lg font-medium">States</h3>
          <div className="flex flex-wrap items-center gap-6">
            {STATES.map((state, i) => (
              <div key={state} className="flex items-center gap-2 text-sm">
                <StepMarker state={state} number={i + 1} />
                {state}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2" data-testid="step-marker-review-list">
          <h3 className="text-lg font-medium">Numbered review list</h3>
          <ol className="space-y-2 rounded-lg border p-4">
            {REVIEW_ROWS.map((row, i) => (
              <li key={row.title} className="flex items-center gap-3 text-sm">
                <StepMarker state={row.state} number={i + 1} />
                <span>{row.title}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </DemoSection>
  );
}
