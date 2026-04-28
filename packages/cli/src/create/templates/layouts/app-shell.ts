import type { CreateAppSpec } from '../../types';
import {
  maybeTooltipWrapper,
  runtimeStatusImport,
  sharedAppImports,
  statusPanel,
  walletHeader,
  walletHeaderImport,
} from '../shared';

/**
 * Renders the generated `src/App.tsx` for the sidebar shell layout: header,
 * `SidebarLayout`, route-aware navigation, and placeholder routes.
 */
export function appShellTsx(spec: CreateAppSpec): string {
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
