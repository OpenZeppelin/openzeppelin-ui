import { Badge, type BadgeTone, type BadgeVariant } from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

const toneExamples = [
  { tone: 'neutral', label: 'Queued' },
  { tone: 'info', label: 'In progress' },
  { tone: 'success', label: 'Completed' },
  { tone: 'warning', label: 'Needs review' },
  { tone: 'danger', label: 'Failed' },
] satisfies ReadonlyArray<{ readonly tone: BadgeTone; readonly label: string }>;

const variants = ['filled', 'outline'] satisfies BadgeVariant[];

/**
 * Demonstrates every Badge tone and variant.
 */
export function BadgeDemo(): React.ReactElement {
  return (
    <DemoSection
      title="Badge"
      description="A compact, domain-neutral label for statuses and categories. The label communicates the meaning directly; tone reinforces it without making colour the only signal."
      codeExample={`import { Badge } from '@openzeppelin/ui-components';

<Badge label="Queued" />
<Badge label="Completed" tone="success" />
<Badge label="Needs review" tone="warning" variant="outline" />
<Badge label="Failed" tone="danger" />

// Expand an abbreviated visible label for assistive technology.
<Badge label="P1" tone="danger" aria-label="Priority one: immediate action" />`}
    >
      {variants.map((variant) => (
        <div className="space-y-4" key={variant}>
          <h3 className="text-lg font-medium capitalize">{variant}</h3>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
            {toneExamples.map(({ tone, label }) => (
              <Badge key={tone} label={label} tone={tone} variant={variant} />
            ))}
          </div>
        </div>
      ))}

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Accessible abbreviation</h3>
        <p className="text-muted-foreground text-sm">
          The visible label is normally sufficient. Use the standard accessible-name attribute when
          an abbreviation needs more context for assistive technology.
        </p>
        <div className="rounded-lg border p-4">
          <Badge label="P1" tone="danger" aria-label="Priority one: immediate action" />
        </div>
      </div>
    </DemoSection>
  );
}
