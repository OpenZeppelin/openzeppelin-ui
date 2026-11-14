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

function toneFor(index: number, progress: number, failed: boolean): TimelineTone {
  if (index < progress) return 'success';
  if (index === progress) return failed ? 'failure' : 'active';
  return 'pending';
}

/** Demonstrates Timeline driven by a simulated job that advances one step at a time. */
export function TimelineDemo(): React.ReactElement {
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const done = progress >= STEPS.length;

  useEffect(() => {
    if (done || failed) return;
    const id = setTimeout(() => setProgress((p) => p + 1), STEP_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [progress, done, failed]);

  const items: TimelineItem[] = STEPS.map((step, index) => ({
    ...step,
    tone: toneFor(index, progress, failed),
  }));

  return (
    <DemoSection
      title="Timeline"
      description="Ordered steps with a tone each. Tone is shown by an icon and read out as status text, not colour alone."
      codeExample={`import { Timeline } from '@openzeppelin/ui-components';

<Timeline
  items={[
    { key: 'compile', label: 'Compile contract', tone: 'success' },
    { key: 'deploy', label: 'Deploy to network', tone: 'active' },
    { key: 'verify', label: 'Verify source', tone: 'pending' },
  ]}
/>`}
    >
      <div className="space-y-4 rounded-lg border p-4" data-testid="timeline-demo">
        <Timeline items={items} aria-label="Deployment progress" data-testid="timeline-job" />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setProgress(0);
              setFailed(false);
            }}
          >
            Restart job
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={done || failed}
            onClick={() => setFailed(true)}
          >
            Fail current step
          </Button>
        </div>
      </div>
    </DemoSection>
  );
}
