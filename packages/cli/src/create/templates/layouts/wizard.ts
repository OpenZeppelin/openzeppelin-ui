import type { CreateAppSpec } from '../../types';
import {
  maybeTooltipWrapper,
  runtimeStatusImport,
  sharedAppImports,
  statusPanel,
  walletHeader,
  walletHeaderImport,
} from '../shared';

function wizardTopbarTsx(spec: CreateAppSpec): string {
  const imports = [...sharedAppImports(spec), 'WizardLayout', 'type WizardStepConfig'];
  return `import { useState } from 'react';
import { ${imports.join(', ')} } from '@openzeppelin/ui-components';
${walletHeaderImport(spec)}${runtimeStatusImport(spec)}
function IntroStep() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Start your workflow</CardTitle>
        <CardDescription>Use this step to collect the first decision from your user.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button>Primary action</Button>
      </CardContent>
    </Card>
  );
}

function RuntimeStep() {
  return ${statusPanel(spec) || '<Card><CardHeader><CardTitle>Runtime</CardTitle></CardHeader></Card>'};
}

export default function App() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const steps: WizardStepConfig[] = [
    { id: 'intro', title: 'Intro', component: <IntroStep /> },
    { id: 'runtime', title: 'Runtime', component: <RuntimeStep /> },
    {
      id: 'ship',
      title: 'Ship',
      component: (
        <Card>
          <CardHeader>
            <CardTitle>Ship it</CardTitle>
            <CardDescription>Replace these placeholders with your product workflow.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button>Generate preview</Button>
          </CardContent>
        </Card>
      ),
    },
  ];

  return (
    ${maybeTooltipWrapper(
      spec,
      `<div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="border-b bg-background">
        <div className="flex h-16 w-full items-center gap-4 px-3 sm:px-4 md:px-5">
          <img src="/OZ-Logo-BlackBG.svg" alt="OpenZeppelin" className="h-6 w-auto" />
          <div className="hidden h-6 border-l sm:block" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">${spec.title}</div>
            <div className="hidden text-xs text-muted-foreground sm:block">${spec.subtitle ?? ''}</div>
          </div>
          <div className="ml-auto">{${walletHeader(spec)}}</div>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-hidden px-6 py-8">
        <div className="mx-auto h-full max-w-6xl overflow-hidden rounded-lg border">
          <WizardLayout
            steps={steps}
            currentStepIndex={currentStepIndex}
            onStepChange={setCurrentStepIndex}
            onCancel={() => setCurrentStepIndex(0)}
            onComplete={() => setCurrentStepIndex(0)}
            lastStepLabel="Finish"
            lastStepSecondaryLabel="Preview"
            onLastStepSecondary={() => setCurrentStepIndex(0)}
            variant="vertical"
          />
        </div>
      </main>
      <Footer companyName="OpenZeppelin" />
    </div>`
    )}
  );
}
`;
}

function wizardSidebarTsx(spec: CreateAppSpec): string {
  const imports = [
    ...sharedAppImports(spec),
    'SidebarButton',
    'SidebarLayout',
    'SidebarSection',
    'WizardLayout',
    'type WizardStepConfig',
  ];
  return `import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ${imports.join(', ')} } from '@openzeppelin/ui-components';
${walletHeaderImport(spec)}${runtimeStatusImport(spec)}
function IntroStep() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Start your workflow</CardTitle>
        <CardDescription>Use this step to collect the first decision from your user.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button>Primary action</Button>
      </CardContent>
    </Card>
  );
}

function RuntimeStep() {
  return ${statusPanel(spec) || '<Card><CardHeader><CardTitle>Runtime</CardTitle></CardHeader></Card>'};
}

function WizardContent() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const steps: WizardStepConfig[] = [
    { id: 'intro', title: 'Intro', component: <IntroStep /> },
    { id: 'runtime', title: 'Runtime', component: <RuntimeStep /> },
    {
      id: 'ship',
      title: 'Ship',
      component: (
        <Card>
          <CardHeader>
            <CardTitle>Ship it</CardTitle>
            <CardDescription>Replace these placeholders with your product workflow.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button>Generate preview</Button>
          </CardContent>
        </Card>
      ),
    },
  ];

  return (
    <WizardLayout
      steps={steps}
      currentStepIndex={currentStepIndex}
      onStepChange={setCurrentStepIndex}
      onCancel={() => setCurrentStepIndex(0)}
      onComplete={() => setCurrentStepIndex(0)}
      lastStepLabel="Finish"
      lastStepSecondaryLabel="Preview"
      onLastStepSecondary={() => setCurrentStepIndex(0)}
      variant="vertical"
    />
  );
}

function SidebarLogo() {
  return (
    <div className="mb-8">
      <img src="/OZ-Logo-BlackBG.svg" alt="OpenZeppelin Logo" className="h-6 w-auto" />
    </div>
  );
}

function WizardSidebar() {
  return (
    <div className="flex flex-col gap-12">
      <SidebarSection title="Workflow">
        <SidebarButton isSelected>Wizard</SidebarButton>
        <SidebarButton disabled badge="Soon">
          Review
        </SidebarButton>
      </SidebarSection>
      <SidebarSection title="Resources">
        <SidebarButton href="https://docs.openzeppelin.com/ui-builder" target="_blank" rel="noreferrer">
          Documentation
        </SidebarButton>
      </SidebarSection>
    </div>
  );
}

function Shell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <SidebarLayout
        header={<SidebarLogo />}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
        mobileAriaLabel="Navigation menu"
        background="bg-sidebar"
        width={280}
      >
        <WizardSidebar />
      </SidebarLayout>
      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          title="${spec.title}"
          onOpenSidebar={() => setMobileOpen(true)}
          rightContent={${walletHeader(spec)}}
        />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            <div className="h-full p-6 lg:p-8">
              <div className="h-full overflow-hidden rounded-lg border">
                <WizardContent />
              </div>
            </div>
          </main>
        </div>
        <Footer companyName="OpenZeppelin" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      ${maybeTooltipWrapper(spec, '<Shell />')}
    </BrowserRouter>
  );
}
`;
}

/**
 * Renders the generated `src/App.tsx` for wizard content. The wizard preset
 * supports two outer frames (topbar or sidebar shell); the recipe's `layout`
 * field decides which variant is emitted.
 */
export function wizardAppTsx(spec: CreateAppSpec): string {
  return spec.layout === 'sidebar-shell' ? wizardSidebarTsx(spec) : wizardTopbarTsx(spec);
}
