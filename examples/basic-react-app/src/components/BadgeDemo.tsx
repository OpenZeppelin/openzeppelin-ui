import { AlertCircle, Check, Clock, Info, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  type BadgeTone,
  type BadgeVariant,
} from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

const toneExamples = [
  { tone: 'neutral', label: 'Queued', icon: <Clock /> },
  { tone: 'info', label: 'In progress', icon: <Info /> },
  { tone: 'success', label: 'Completed', icon: <Check /> },
  { tone: 'warning', label: 'Needs review', icon: <TriangleAlert /> },
  { tone: 'danger', label: 'Failed', icon: <AlertCircle /> },
] satisfies ReadonlyArray<{
  readonly tone: BadgeTone;
  readonly label: string;
  readonly icon: React.ReactNode;
}>;

const variants = ['filled', 'outline', 'solid'] satisfies BadgeVariant[];

/**
 * Demonstrates every Badge tone and variant.
 */
export function BadgeDemo(): React.ReactElement {
  const [activationCount, setActivationCount] = useState(0);

  return (
    <DemoSection
      title="Badge"
      description="A compact, domain-neutral label for statuses and categories. The label communicates the meaning directly; tone reinforces it without making colour the only signal."
      codeExample={`import { Badge } from '@openzeppelin/ui-components';

<Badge label="Queued" />
<Badge label="Completed" tone="success" icon={<Check />} />
<Badge label="Needs review" tone="warning" variant="outline" />
<Badge label="Failed" tone="danger" variant="solid" />

// Supplying onActivate renders a native button.
<Badge label="View owner role" variant="outline" onActivate={openRole} />

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
        <h3 className="text-lg font-medium">Interactive and composable</h3>
        <p className="text-muted-foreground text-sm">
          An activation handler renders a native button. Badges also forward overlay-trigger props
          and refs, while an icon can have its own accessible name.
        </p>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
          <Badge
            label={`Activated ${activationCount} ${activationCount === 1 ? 'time' : 'times'}`}
            variant="outline"
            icon={<Check />}
            iconLabel="Owner role"
            onActivate={() => setActivationCount((count) => count + 1)}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge label="Hover for details" tone="info" variant="solid" />
              </TooltipTrigger>
              <TooltipContent>
                <p>This non-interactive badge remains a span.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">With icons</h3>
        <p className="text-muted-foreground text-sm">
          Pass any node as <code>icon</code>. The kit does not ship an icon set; the icon is
          decorative and the label remains the accessible name.
        </p>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
          {toneExamples.map(({ tone, label, icon }) => (
            <Badge key={tone} label={label} tone={tone} icon={icon} />
          ))}
        </div>
      </div>

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
