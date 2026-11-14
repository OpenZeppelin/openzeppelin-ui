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
  const [selectedFilters, setSelectedFilters] = useState<ReadonlySet<string>>(new Set(['Open']));
  const [selectedSolid, setSelectedSolid] = useState<ReadonlySet<string>>(new Set(['Mine']));
  const [disabledActivations, setDisabledActivations] = useState(0);
  const [readOnlyActivations, setReadOnlyActivations] = useState(0);

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

// Add pressed to make an interactive badge a toggle chip (aria-pressed + selected style).
<Badge label="Open" variant="outline" pressed={isOpen} onActivate={toggleOpen} />

// disabled turns off an interactive badge; aria-pressed stays exposed.
<Badge label="Open" pressed={isOpen} onActivate={toggleOpen} disabled />

// readOnly keeps a held chip focusable and full-colour; activation is blocked.
<Badge label="Open" pressed onActivate={toggleOpen} readOnly />

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

      <div className="space-y-4" data-testid="badge-pressed-demo">
        <h3 className="text-lg font-medium">Toggle chips</h3>
        <p className="text-muted-foreground text-sm">
          Pass <code>pressed</code> to an interactive badge to expose <code>aria-pressed</code> and
          a selected style. It is ignored on non-interactive badges.
        </p>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
          {['Open', 'In review', 'Closed'].map((filter) => (
            <Badge
              key={filter}
              label={filter}
              variant="outline"
              pressed={selectedFilters.has(filter)}
              onActivate={() =>
                setSelectedFilters((current) => {
                  const next = new Set(current);
                  if (next.has(filter)) next.delete(filter);
                  else next.add(filter);
                  return next;
                })
              }
            />
          ))}
        </div>
        <div
          className="flex flex-wrap items-center gap-3 rounded-lg border p-4"
          data-testid="badge-pressed-solid-demo"
        >
          {['Mine', 'Team', 'Everyone'].map((filter) => (
            <Badge
              key={filter}
              label={filter}
              tone="info"
              variant="solid"
              pressed={selectedSolid.has(filter)}
              onActivate={() =>
                setSelectedSolid((current) => {
                  const next = new Set(current);
                  if (next.has(filter)) next.delete(filter);
                  else next.add(filter);
                  return next;
                })
              }
            />
          ))}
        </div>
      </div>

      <div className="space-y-4" data-testid="badge-disabled-demo">
        <h3 className="text-lg font-medium">Disabled</h3>
        <p className="text-muted-foreground text-sm">
          Pass <code>disabled</code> to an interactive badge to stop activation. The button leaves
          the tab order and dims, and a toggle chip still exposes its pressed state. A static badge
          ignores it.
        </p>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
          <Badge
            label="Open"
            variant="outline"
            pressed
            disabled
            onActivate={() => setDisabledActivations((count) => count + 1)}
          />
          <Badge
            label="Closed"
            variant="outline"
            pressed={false}
            disabled
            onActivate={() => setDisabledActivations((count) => count + 1)}
          />
          <Badge label="Static" variant="outline" disabled />
        </div>
        <p className="text-muted-foreground text-sm" data-testid="badge-disabled-count">
          Activations: {disabledActivations}
        </p>
      </div>

      <div className="space-y-4" data-testid="badge-readonly-demo">
        <h3 className="text-lg font-medium">Read-only</h3>
        <p className="text-muted-foreground text-sm">
          Pass <code>readOnly</code> to keep a held interactive badge in the tab order and full
          colour. It stays focusable with <code>aria-pressed</code>, announces &quot;Read-only&quot;
          via <code>aria-describedby</code>, and ignores click, Enter and Space.{' '}
          <code>disabled</code> wins when both are set. A static badge ignores it.
        </p>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
          <Badge
            label="Held open"
            variant="outline"
            pressed
            readOnly
            onActivate={() => setReadOnlyActivations((count) => count + 1)}
          />
          <Badge
            label="Held closed"
            // Solid neutral keeps AA contrast in dark; outline muted fails axe on this surface.
            variant="solid"
            tone="neutral"
            pressed={false}
            readOnly
            onActivate={() => setReadOnlyActivations((count) => count + 1)}
          />
          <Badge
            label="Held + disabled"
            variant="outline"
            pressed
            readOnly
            disabled
            onActivate={() => setReadOnlyActivations((count) => count + 1)}
          />
          <Badge label="Static" variant="outline" readOnly />
        </div>
        <p className="text-muted-foreground text-sm" data-testid="badge-readonly-count">
          Activations: {readOnlyActivations}
        </p>
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
