import { useEffect, useState } from 'react';

import {
  Button,
  Timeline,
  type TimelineItem,
  type TimelineTone,
} from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

const STEPS = [
  { key: 'compile', label: 'Compile contract', description: 'Solidity 0.8.28' },
  { key: 'deploy', label: 'Deploy to network', description: 'Waiting for confirmation' },
  { key: 'verify', label: 'Verify source', description: 'Publishing to the explorer' },
  { key: 'wire', label: 'Grant roles', description: 'Assign the admin role' },
] as const;

const STEP_INTERVAL_MS = 1500;

type JobState = 'running' | 'paused' | 'failed';

const CURRENT_TONE: Record<JobState, TimelineTone> = {
  running: 'active',
  paused: 'warning',
  failed: 'failure',
};

function toneFor(index: number, progress: number, state: JobState): TimelineTone {
  if (index < progress) return 'success';
  if (index === progress) return CURRENT_TONE[state];
  return 'pending';
}

// Status text overrides: a custom warning text, and an empty one where the label already says it.
const OVERRIDE_ITEMS: TimelineItem[] = [
  { key: 'snapshot', label: 'Snapshot state', tone: 'success' },
  {
    key: 'migrate',
    label: 'Migrate balances',
    description: 'Stopped by an operator',
    tone: 'warning',
    statusLabel: 'Stopped',
  },
  { key: 'rollback', label: 'Rollback not needed', tone: 'pending', statusLabel: '' },
];

/** Demonstrates Timeline driven by a simulated job that advances one step at a time. */
export function TimelineDemo(): React.ReactElement {
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<JobState>('running');
  const done = progress >= STEPS.length;

  useEffect(() => {
    if (done || state !== 'running') return;
    const id = setTimeout(() => setProgress((p) => p + 1), STEP_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [progress, done, state]);

  const items: TimelineItem[] = STEPS.map((step, index) => ({
    ...step,
    tone: toneFor(index, progress, state),
  }));

  return (
    <DemoSection
      title="Timeline"
      description="Ordered steps with a tone each (pending, active, success, warning, failure). Tone is shown by an icon and read out as status text, not colour alone."
      codeExample={`import { Timeline } from '@openzeppelin/ui-components';

<Timeline
  items={[
    { key: 'compile', label: 'Compile contract', tone: 'success' },
    { key: 'deploy', label: 'Deploy to network', tone: 'active' },
    { key: 'verify', label: 'Verify source', tone: 'warning' }, // paused: "Paused"
    { key: 'wire', label: 'Grant roles', tone: 'pending' },
  ]}
/>

// statusLabel replaces the default status text; '' renders none
{ label: 'Migrate balances', tone: 'warning', statusLabel: 'Stopped' }
{ label: 'Rollback not needed', tone: 'pending', statusLabel: '' }`}
    >
      <div className="space-y-6">
        <div className="space-y-4 rounded-lg border p-4" data-testid="timeline-demo">
          <Timeline items={items} aria-label="Deployment progress" data-testid="timeline-job" />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setProgress(0);
                setState('running');
              }}
            >
              Restart job
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={done || state === 'failed'}
              onClick={() => setState((s) => (s === 'paused' ? 'running' : 'paused'))}
            >
              {state === 'paused' ? 'Resume job' : 'Pause current step'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={done || state === 'failed'}
              onClick={() => setState('failed')}
            >
              Fail current step
            </Button>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border p-4" data-testid="timeline-overrides">
          <h3 className="text-lg font-medium">Status text overrides</h3>
          <Timeline
            items={OVERRIDE_ITEMS}
            aria-label="Migration steps"
            data-testid="timeline-overrides-list"
          />
        </div>
      </div>
    </DemoSection>
  );
}
