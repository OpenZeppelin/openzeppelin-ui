import { ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState, type ReactElement, type RefObject } from 'react';

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
// Async save: pending primary, disabled Back, guarded step form
// ---------------------------------------------------------------------------

const SAVE_DELAY_MS = 1500;

const ASYNC_STEPS = [
  { id: 'profile', title: 'Profile', field: 'Display name' },
  { id: 'details', title: 'Details', field: 'Organisation' },
  { id: 'confirm', title: 'Confirm', field: 'Note for reviewers' },
] as const;

function simulateSave(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, SAVE_DELAY_MS));
}

function AsyncStepForm({
  id,
  title,
  field,
  fieldRef,
  onSubmit,
}: {
  id: string;
  title: string;
  field: string;
  fieldRef: RefObject<HTMLInputElement | null>;
  onSubmit: () => void;
}) {
  return (
    <form
      className="max-w-sm space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <Label htmlFor={`async-save-${id}`}>{field}</Label>
      <Input id={`async-save-${id}`} ref={fieldRef} placeholder="Press Enter to save" />
    </form>
  );
}

function AsyncSaveDemo() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savesCompleted, setSavesCompleted] = useState(0);
  const [finished, setFinished] = useState(false);
  // The kit holds no pending state. This ref is the demo's own in-flight guard, so the
  // primary, the stepper and Enter in the step form all share one save per cycle.
  const inFlightRef = useRef(false);
  const fieldRef = useRef<HTMLInputElement>(null);
  // A save started from the step form moves focus to the next step's field once it renders.
  // A save started from the primary needs no restore: the primary is one stable node.
  const focusFieldAfterAdvanceRef = useRef(false);
  const lastIndex = ASYNC_STEPS.length - 1;

  useEffect(() => {
    if (!focusFieldAfterAdvanceRef.current) return;
    focusFieldAfterAdvanceRef.current = false;
    fieldRef.current?.focus();
  }, [step]);

  const saveAndAdvance = async (source: 'primary' | 'form') => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    // Set synchronously, before the first await, so a second activation already sees pending.
    setSaving(true);
    try {
      await simulateSave();
      setSavesCompleted((n) => n + 1);
      if (step === lastIndex) {
        setFinished(true);
      } else {
        focusFieldAfterAdvanceRef.current = source === 'form';
        setStep(step + 1);
      }
    } finally {
      inFlightRef.current = false;
      setSaving(false);
    }
  };

  const steps: WizardStepConfig[] = ASYNC_STEPS.map((s) => ({
    id: s.id,
    title: s.title,
    component: (
      <AsyncStepForm
        key={s.id}
        id={s.id}
        title={s.title}
        field={s.field}
        fieldRef={fieldRef}
        onSubmit={() => void saveAndAdvance('form')}
      />
    ),
  }));

  return (
    <div className="space-y-2">
      <div className="h-[360px] overflow-hidden rounded-lg border">
        <WizardLayout
          variant="horizontal"
          steps={steps}
          currentStepIndex={step}
          onStepChange={(next) => {
            // Ignore every step change while a save is in flight, stepper clicks included.
            if (inFlightRef.current) return;
            setFinished(false);
            if (next === step + 1) void saveAndAdvance('primary');
            else setStep(next);
          }}
          onComplete={() => void saveAndAdvance('primary')}
          nextLabel="Save & continue"
          lastStepLabel="Save & finish"
          previousLabel="Back"
          previousDisabled={saving}
          primaryLoading={saving}
          primaryIcon={<ArrowRight className="size-4" />}
        />
      </div>
      <p className="text-sm text-muted-foreground" data-testid="async-save-status">
        {saving ? 'Saving…' : finished ? 'Finished' : 'Idle'} · Saves completed:{' '}
        <span data-testid="async-save-count">{savesCompleted}</span>
      </p>
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

      {/* Async save: pending primary and disabled Back */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Async save (Paged)</h3>
        <p className="text-sm text-muted-foreground">
          Each step saves before advancing (simulated, about 1.5 s). During the save, Back is
          disabled and the primary shows a spinner and ignores clicks, Enter and Space, while
          keeping focus. Pressing Enter in the step field runs the same guarded save, so the counter
          goes up once per save however often you press.
        </p>
        <AsyncSaveDemo />
      </div>
    </DemoSection>
  );
}
