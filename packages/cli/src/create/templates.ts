import { packageJson } from './package-json';
import { resolveCreateAppSpec } from './recipes';
import {
  appConfig,
  indexCss,
  ozConfig,
  ozProviders,
  ozRuntime,
  rainbowKitConfig,
  runtimeStatus,
} from './support-files';
import type { CreateAppSpec, CreateFile, ResolvedCreateOptions } from './types';
import { viteConfig } from './vite-template';

const OZ_LOGO_BLACK_BG_SVG = `<svg width="522" height="94" viewBox="0 0 522 94" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M480.533 70.7091V36.5247H488.592V40.684H489.047C490.411 38.1494 493.791 35.6799 498.665 35.6799C506.334 35.6799 511.013 41.074 511.013 48.3528V70.7091H502.564V50.5624C502.564 46.4031 499.9 43.6086 496 43.6086C491.906 43.6086 488.982 46.858 488.982 51.1473V70.7091H480.533Z" fill="black"/>
<path d="M471.949 33.4829C468.895 33.4829 466.75 31.5982 466.75 28.5437C466.75 25.6192 468.895 23.6695 471.949 23.6695C475.004 23.6695 477.148 25.6192 477.148 28.5437C477.148 31.5982 475.004 33.4829 471.949 33.4829ZM467.725 70.7085V36.5241H476.173V70.7085H467.725Z" fill="black"/>
<path d="M433.956 71.554C423.883 71.554 416.734 64.0152 416.734 53.8119C416.734 43.0236 423.948 35.6799 433.956 35.6799C444.939 35.6799 450.918 43.8035 450.918 53.4219V56.0865H424.923C425.182 61.2856 428.757 64.7951 434.216 64.7951C438.375 64.7951 441.56 62.8454 442.73 60.0508H450.593C448.904 67.0047 442.795 71.554 433.956 71.554ZM425.053 50.1075H442.86C442.47 45.4932 438.895 42.4387 433.956 42.4387C429.212 42.4387 425.572 45.8182 425.053 50.1075Z" fill="black"/>
<path d="M377.282 83.4489V36.5247H385.6V40.879H386.055C386.965 39.4492 390.084 35.6799 396.323 35.6799C405.877 35.6799 412.441 42.8287 412.441 53.4869C412.441 64.1452 405.942 71.5539 396.583 71.5539C390.539 71.5539 387.29 68.1745 386.185 66.2898H385.73V83.4489H377.282ZM394.699 63.8852C400.158 63.8852 403.862 59.6609 403.862 53.6169C403.862 47.3779 400.158 43.3486 394.634 43.3486C389.045 43.3486 385.535 47.8329 385.535 53.6169C385.535 59.9859 389.435 63.8852 394.699 63.8852Z" fill="black"/>
<path d="M316.554 71.554C306.48 71.554 299.331 64.0152 299.331 53.8119C299.331 43.0236 306.545 35.6799 316.554 35.6799C327.537 35.6799 333.516 43.8035 333.516 53.4219V56.0865H307.52C307.78 61.2856 311.354 64.7951 316.814 64.7951C320.973 64.7951 324.157 62.8454 325.327 60.0508H333.191C331.501 67.0047 325.392 71.554 316.554 71.554ZM307.65 50.1075H325.457C325.067 45.4932 321.493 42.4387 316.554 42.4387C311.809 42.4387 308.17 45.8182 307.65 50.1075Z" fill="black"/>
<path d="M260.462 70.7083V62.7117L284.118 31.8677V31.3973H261.307V23.6695H294.906V31.5989L271.25 62.4429V62.9805H295.036V70.7083H260.462Z" fill="black"/>
<path d="M225.673 70.7091V36.5247H233.731V40.684H234.186C235.551 38.1494 238.93 35.6799 243.805 35.6799C251.473 35.6799 256.153 41.074 256.153 48.3528V70.7091H247.704V50.5624C247.704 46.4031 245.039 43.6086 241.14 43.6086C237.046 43.6086 234.121 46.858 234.121 51.1473V70.7091H225.673Z" fill="black"/>
<path d="M204.413 71.554C194.34 71.554 187.191 64.0152 187.191 53.8119C187.191 43.0236 194.405 35.6799 204.413 35.6799C215.396 35.6799 221.375 43.8035 221.375 53.4219V56.0865H195.38C195.64 61.2856 199.214 64.7951 204.673 64.7951C208.833 64.7951 212.017 62.8454 213.187 60.0508H221.051C219.361 67.0047 213.252 71.554 204.413 71.554ZM195.51 50.1075H213.317C212.927 45.4932 209.352 42.4387 204.413 42.4387C199.669 42.4387 196.03 45.8182 195.51 50.1075Z" fill="black"/>
<path d="M147.739 83.4V36.4053H156.057V40.879H156.512C157.422 39.4492 160.542 35.6799 166.781 35.6799C176.334 35.6799 182.898 42.8287 182.898 53.4869C182.898 64.1452 176.399 71.5539 167.04 71.5539C160.997 71.5539 157.747 68.1745 156.642 66.2898H156.187V83.4H147.739ZM165.156 63.8852C170.615 63.8852 174.319 59.6609 174.319 53.6169C174.319 47.3779 170.615 43.3486 165.091 43.3486C159.502 43.3486 155.992 47.8329 155.992 53.6169C155.992 59.9859 159.892 63.8852 165.156 63.8852Z" fill="black"/>
<path d="M118.541 71.5537C104.263 71.5537 93.7572 61.1149 93.7572 47.1066C93.7572 33.233 104.331 22.6594 118.608 22.6594C132.886 22.6594 143.46 33.3677 143.46 47.1066C143.46 60.9802 132.819 71.5537 118.541 71.5537ZM118.608 63.0006C127.633 63.0006 134.098 56.2658 134.098 47.1066C134.098 38.082 127.633 31.2125 118.608 31.2125C109.517 31.2125 103.051 38.082 103.051 47.1066C103.051 56.2658 109.517 63.0006 118.608 63.0006Z" fill="black"/>
<rect x="455.215" y="23.4707" width="8.19647" height="47.2383" fill="black"/>
<path d="M337.813 83.4482V36.524H346.132V40.8783H346.587C347.496 39.4485 350.616 35.6791 356.855 35.6791C366.408 35.6791 372.972 42.828 372.972 53.4862C372.972 64.1445 366.473 71.5532 357.115 71.5532C351.071 71.5532 347.821 68.1738 346.716 66.2891H346.262V83.4482H337.813ZM355.23 63.8845C360.689 63.8845 364.394 59.6602 364.394 53.6162C364.394 47.3772 360.689 43.3479 355.165 43.3479C349.576 43.3479 346.067 47.8321 346.067 53.6162C346.067 59.9851 349.966 63.8845 355.23 63.8845Z" fill="black"/>
<path d="M10.4995 83.5166C18.5557 69.5776 25.4014 58.0821 34.1023 42.3266C37.1758 37.01 42.4865 33.7064 49.0425 33.7064H59.3439L30.5759 83.5166H10.4995Z" fill="#2E99FF"/>
<path d="M10.5907 10.9531H72.404L61.8422 29.3684H10.5907V10.9531Z" fill="#4F56FA"/>
<path d="M41.5527 72.0477C43.8772 67.9384 47.6136 65.3855 52.8471 65.3855L72.4153 65.3321V83.5179H34.921C37.2685 79.492 39.3069 76.0179 41.5527 72.0477Z" fill="#09C2FF"/>
</svg>
`;

function mainTsx(spec: CreateAppSpec): string {
  const imports = [
    "import React from 'react';",
    "import { createRoot } from 'react-dom/client';",
    spec.hasTheme ? "import { ThemeProvider } from 'next-themes';" : '',
    spec.hasToasts ? "import { Toaster } from '@openzeppelin/ui-components';" : '',
    spec.hasWallet ? "import { initializeAppConfig } from './oz/config';" : '',
    spec.hasWallet ? "import { OzProviders } from './oz/OzProviders';" : '',
    "import App from './App';",
    "import './index.css';",
  ].filter(Boolean);
  const appTree = spec.hasWallet ? '<OzProviders><App /></OzProviders>' : '<App />';
  const themedTree = spec.hasTheme
    ? `<ThemeProvider attribute="class" defaultTheme="light" enableSystem>${appTree}</ThemeProvider>`
    : appTree;
  const toaster = spec.hasToasts ? '\n  <Toaster />' : '';

  return `${imports.join('\n')}

async function bootstrap() {
${spec.hasWallet ? '  await initializeAppConfig();\n' : ''}  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      ${themedTree}${toaster}
    </React.StrictMode>
  );
}

void bootstrap();
`;
}

function appTsx(spec: CreateAppSpec): string {
  if (spec.content === 'wizard') {
    return wizardAppTsx(spec);
  }
  if (spec.layout === 'sidebar-shell') {
    return appShellTsx(spec);
  }
  return dappTsx(spec);
}

function sharedAppImports(spec: CreateAppSpec): string[] {
  return [
    spec.hasTooltips ? 'TooltipProvider' : '',
    'Button',
    'Card',
    'CardContent',
    'CardDescription',
    'CardHeader',
    'CardTitle',
    'Footer',
    spec.layout === 'sidebar-shell' ? 'Header' : '',
  ].filter(Boolean);
}

function walletHeaderImport(spec: CreateAppSpec): string {
  return spec.hasWallet ? "import { WalletConnectionUI } from '@openzeppelin/ui-react';\n" : '';
}

function runtimeStatusImport(spec: CreateAppSpec): string {
  return spec.hasStatusPanel ? "import { RuntimeStatus } from './components/RuntimeStatus';\n" : '';
}

function walletHeader(spec: CreateAppSpec): string {
  return spec.hasWallet ? '<WalletConnectionUI />' : 'null';
}

function statusPanel(spec: CreateAppSpec): string {
  return spec.hasStatusPanel ? '<RuntimeStatus />' : '';
}

function maybeTooltipWrapper(spec: CreateAppSpec, body: string): string {
  return spec.hasTooltips ? `<TooltipProvider>\n${body}\n    </TooltipProvider>` : body.trimStart();
}

function dappTsx(spec: CreateAppSpec): string {
  const imports = sharedAppImports(spec);
  const body = spec.content === 'landing' ? minimalBody() : dappBody(spec);
  return `import { ${imports.join(', ')} } from '@openzeppelin/ui-components';
${walletHeaderImport(spec)}${runtimeStatusImport(spec)}
export default function App() {
  return (
    ${maybeTooltipWrapper(spec, body)}
  );
}
`;
}

function minimalBody(): string {
  return `<div className="flex min-h-screen flex-col bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>OpenZeppelin UI app</CardTitle>
            <CardDescription>Vite + React + TypeScript with OpenZeppelin UI styles.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button>Start building</Button>
          </CardContent>
        </Card>
      </main>
    </div>`;
}

function dappBody(spec: CreateAppSpec): string {
  return `<div className="flex min-h-screen flex-col bg-background text-foreground">
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
      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-6 px-6 py-10 md:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Your dApp shell is ready</CardTitle>
            <CardDescription>
              This starter proves the selected OpenZeppelin UI wiring and gives you a clean place
              to add contract interactions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Edit <code className="rounded bg-muted px-1 py-0.5">src/oz</code> to customize
              adapters, wallet config, networks, and runtime behavior.
            </p>
            <Button>Open next step</Button>
          </CardContent>
        </Card>
        ${statusPanel(spec)}
      </main>
      <Footer companyName="OpenZeppelin" />
    </div>`;
}

function appShellTsx(spec: CreateAppSpec): string {
  const imports = [
    ...sharedAppImports(spec),
    'SidebarButton',
    'SidebarGroup',
    'SidebarLayout',
    'SidebarSection',
  ];
  return `import { useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ${imports.join(', ')} } from '@openzeppelin/ui-components';
${walletHeaderImport(spec)}${runtimeStatusImport(spec)}
const primaryRoutes = [
  { path: '/', label: 'Dashboard', description: 'Track activity, network status, and app health.' },
  { path: '/activity', label: 'Activity', description: 'Review recent user and contract events.' },
  { path: '/deployments', label: 'Deployments', description: 'Monitor contracts and environments.' },
];

const buildRoutes = [
  { path: '/contracts', label: 'Contracts', description: 'Organize ABI-backed contract screens.' },
  { path: '/workflows', label: 'Workflows', description: 'Model multi-step transaction flows.' },
];

const manageRoutes = [
  { path: '/team', label: 'Team', description: 'Invite collaborators and manage access.' },
  { path: '/settings', label: 'Settings', description: 'Customize generated providers in src/oz.' },
];

function Dashboard() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>Your route-aware app shell is ready.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button>Add your first workflow</Button>
        </CardContent>
      </Card>
      ${statusPanel(spec)}
    </div>
  );
}

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button>Customize this section</Button>
      </CardContent>
    </Card>
  );
}

function SidebarLogo() {
  return (
    <div className="mb-8">
      <img src="/OZ-Logo-BlackBG.svg" alt="OpenZeppelin Logo" className="h-6 w-auto" />
    </div>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const goTo = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <div className="flex flex-col gap-12">
      <SidebarSection title="Overview">
        {primaryRoutes.map((item) => (
          <SidebarButton
            key={item.path}
            isSelected={location.pathname === item.path}
            onClick={() => goTo(item.path)}
          >
            {item.label}
          </SidebarButton>
        ))}
      </SidebarSection>

      <SidebarSection title="Workspace">
        <SidebarGroup title="Build" defaultOpen>
          {buildRoutes.map((item) => (
            <SidebarButton
              key={item.path}
              isSelected={location.pathname === item.path}
              onClick={() => goTo(item.path)}
            >
              {item.label}
            </SidebarButton>
          ))}
        </SidebarGroup>
        <SidebarGroup title="Manage" defaultOpen>
          {manageRoutes.map((item) => (
            <SidebarButton
              key={item.path}
              isSelected={location.pathname === item.path}
              onClick={() => goTo(item.path)}
            >
              {item.label}
            </SidebarButton>
          ))}
        </SidebarGroup>
      </SidebarSection>

      <SidebarSection title="Resources">
        <SidebarButton href="https://docs.openzeppelin.com/ui-builder" target="_blank" rel="noreferrer">
          Documentation
        </SidebarButton>
        <SidebarButton badge="Soon" disabled>
          Templates
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
        <SidebarNav onNavigate={() => setMobileOpen(false)} />
      </SidebarLayout>
      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          title="OpenZeppelin UI app"
          onOpenSidebar={() => setMobileOpen(true)}
          rightContent={${walletHeader(spec)}}
        />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            <div className="p-6 lg:p-8">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                {[...primaryRoutes.slice(1), ...buildRoutes, ...manageRoutes].map((item) => (
                  <Route
                    key={item.path}
                    path={item.path}
                    element={<PlaceholderPage title={item.label} description={item.description} />}
                  />
                ))}
              </Routes>
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

function wizardAppTsx(spec: CreateAppSpec): string {
  if (spec.layout === 'sidebar-shell') {
    return wizardSidebarAppTsx(spec);
  }

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

function wizardSidebarAppTsx(spec: CreateAppSpec): string {
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
 *
 */
export function buildCreateFiles(options: ResolvedCreateOptions): CreateFile[] {
  const spec = resolveCreateAppSpec(options);
  const files: CreateFile[] = [
    { path: 'package.json', content: packageJson(options, spec) },
    {
      path: 'index.html',
      content: `<div id="root"></div><script type="module" src="/src/main.tsx"></script>\n`,
    },
    {
      path: 'tsconfig.json',
      content: `${JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            useDefineForClassFields: true,
            lib: ['ES2022', 'DOM', 'DOM.Iterable'],
            allowJs: false,
            skipLibCheck: true,
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            strict: true,
            forceConsistentCasingInFileNames: true,
            module: 'ESNext',
            moduleResolution: 'Bundler',
            resolveJsonModule: true,
            isolatedModules: true,
            noEmit: true,
            jsx: 'react-jsx',
            types: ['vite/client'],
            baseUrl: '.',
            paths: {
              '@/*': ['./src/*'],
            },
          },
          include: ['src'],
          references: [],
        },
        null,
        2
      )}\n`,
    },
    { path: 'vite.config.ts', content: viteConfig(spec) },
    { path: 'src/main.tsx', content: mainTsx(spec) },
    { path: 'src/App.tsx', content: appTsx(spec) },
    { path: 'src/index.css', content: indexCss() },
    { path: 'src/vite-env.d.ts', content: '/// <reference types="vite/client" />\n' },
  ];

  if (spec.hasWallet) {
    files.push(
      { path: 'public/app.config.json', content: appConfig(options) },
      { path: 'src/oz/config.ts', content: ozConfig() },
      { path: 'src/oz/runtime.ts', content: ozRuntime(options) },
      { path: 'src/oz/OzProviders.tsx', content: ozProviders() }
    );
  }

  if (spec.requiresLogoAsset) {
    files.push({ path: 'public/OZ-Logo-BlackBG.svg', content: OZ_LOGO_BLACK_BG_SVG });
  }

  if (spec.hasStatusPanel) {
    files.push({ path: 'src/components/RuntimeStatus.tsx', content: runtimeStatus() });
  }

  if (options.wallet === 'rainbowkit') {
    files.push({ path: 'src/oz/wallet/rainbowkit.config.ts', content: rainbowKitConfig(options) });
  }

  return files;
}
