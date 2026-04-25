import { useState, type ReactElement } from 'react';

import { Input, Label, WizardLayout, type WizardStepConfig } from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

// ---------------------------------------------------------------------------
// Sample step content
// ---------------------------------------------------------------------------

function StepContent({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Field A</Label>
          <Input placeholder="Enter value…" />
        </div>
        <div className="space-y-2">
          <Label>Field B</Label>
          <Input placeholder="Enter value…" />
        </div>
      </div>
    </div>
  );
}

const STEPS: WizardStepConfig[] = [
  {
    id: 'basics',
    title: 'Basics',
    component: (
      <StepContent
        title="Basic Information"
        description="Provide the fundamental details for your project."
      />
    ),
  },
  {
    id: 'config',
    title: 'Configuration',
    component: (
      <StepContent
        title="Configuration"
        description="Adjust the settings to match your requirements."
      />
    ),
  },
  {
    id: 'permissions',
    title: 'Permissions',
    component: (
      <StepContent
        title="Permissions"
        description="Configure roles and access control for your project."
      />
    ),
  },
  {
    id: 'review',
    title: 'Review & Deploy',
    component: (
      <StepContent
        title="Review & Deploy"
        description="Review your configuration before deploying."
      />
    ),
  },
];

// ---------------------------------------------------------------------------
// Interactive demos
// ---------------------------------------------------------------------------

function VerticalDemo() {
  const [step, setStep] = useState(0);
  return (
    <div className="h-[520px] overflow-hidden rounded-lg border">
      <WizardLayout
        variant="vertical"
        steps={STEPS}
        currentStepIndex={step}
        onStepChange={setStep}
        onCancel={() => setStep(0)}
        lastStepLabel="Deploy"
        lastStepSecondaryLabel="Preview"
        onLastStepSecondary={() => alert('Preview (secondary CTA)')}
      />
    </div>
  );
}

function HorizontalDemo() {
  const [step, setStep] = useState(0);
  return (
    <div className="h-[420px] overflow-hidden rounded-lg border">
      <WizardLayout
        variant="horizontal"
        steps={STEPS}
        currentStepIndex={step}
        onStepChange={setStep}
        onCancel={() => setStep(0)}
        lastStepSecondaryLabel="Preview"
        onLastStepSecondary={() => alert('Preview (secondary CTA)')}
      />
    </div>
  );
}

function ScrollableDemo() {
  const [step, setStep] = useState(0);
  return (
    <div className="h-[520px] overflow-hidden rounded-lg border">
      <WizardLayout
        variant="scrollable"
        steps={STEPS}
        currentStepIndex={step}
        onStepChange={setStep}
        scrollableSecondaryLabel="Save draft"
        onScrollableSecondary={() => alert('Save draft (secondary CTA)')}
        onComplete={() => alert('Wizard complete!')}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public demo
// ---------------------------------------------------------------------------

export function WizardDemo(): ReactElement {
  return (
    <DemoSection
      title="Wizard"
      description="Multi-step wizard with three layout variants: vertical sidebar (paged), horizontal top bar (paged), and scrollable single-page. Includes step indicators, navigation, visited-step tracking, and an optional outline secondary CTA on the last step (paged) or beside Finish (scrollable)."
      codeExample={`import { WizardLayout, type WizardStepConfig } from '@openzeppelin/ui-components';

const steps: WizardStepConfig[] = [
  { id: 'basics', title: 'Basics', component: <BasicsStep /> },
  { id: 'config', title: 'Configuration', component: <ConfigStep /> },
  { id: 'review', title: 'Review', component: <ReviewStep /> },
];

function MyWizard() {
  const [step, setStep] = useState(0);

  return (
    <WizardLayout
      variant="vertical"     // or "horizontal" | "scrollable"
      steps={steps}
      currentStepIndex={step}
      onStepChange={setStep}
      onCancel={() => setStep(0)}
      onComplete={() => console.log('Done!')}
      lastStepSecondaryLabel="Preview"
      onLastStepSecondary={() => console.log('Secondary')}
    />
  );
}`}
    >
      {/* Vertical variant */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Vertical (Paged)</h3>
        <p className="text-sm text-muted-foreground">
          Sidebar stepper with one step visible at a time. Navigate forward with Next, or click any
          previously visited step to jump back. Try clicking Next a few times, then click back to an
          earlier step — the visited steps stay enabled.
        </p>
        <VerticalDemo />
      </div>

      {/* Horizontal variant */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Horizontal (Paged)</h3>
        <p className="text-sm text-muted-foreground">
          Top bar stepper with connector lines. Same paged navigation behavior as vertical.
        </p>
        <HorizontalDemo />
      </div>

      {/* Scrollable variant */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Scrollable (Single Page)</h3>
        <p className="text-sm text-muted-foreground">
          All steps rendered on a single scrollable page. The sidebar stepper tracks the scroll
          position and clicking a step scrolls to that section.
        </p>
        <ScrollableDemo />
      </div>
    </DemoSection>
  );
}
