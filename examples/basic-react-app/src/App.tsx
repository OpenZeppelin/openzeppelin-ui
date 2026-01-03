import {
  FileCode2,
  FormInput,
  Layers,
  List,
  MousePointerClick,
  TextCursorInput,
} from 'lucide-react';
import { useState } from 'react';

import {
  Footer,
  Header,
  SidebarButton,
  SidebarLayout,
  SidebarSection,
} from '@openzeppelin/ui-components';

import { ButtonDemo, FormDemo, InputDemo, RendererDemo, SelectDemo } from './components';

type DemoKey = 'button' | 'input' | 'select' | 'form' | 'renderer';

interface NavItem {
  key: DemoKey;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { key: 'button', label: 'Button', icon: <MousePointerClick className="size-4" /> },
  { key: 'input', label: 'Input', icon: <TextCursorInput className="size-4" /> },
  { key: 'select', label: 'Select', icon: <List className="size-4" /> },
  { key: 'form', label: 'Form', icon: <FormInput className="size-4" /> },
  { key: 'renderer', label: 'FormRenderer', icon: <Layers className="size-4" /> },
];

const demoComponents: Record<DemoKey, React.ComponentType> = {
  button: ButtonDemo,
  input: InputDemo,
  select: SelectDemo,
  form: FormDemo,
  renderer: RendererDemo,
};

/**
 * Sidebar header with OpenZeppelin logo
 */
function SidebarHeader(): React.ReactElement {
  return (
    <div>
      <img src="/OZ-Logo-BlackBG.svg" alt="OpenZeppelin" className="h-6 w-auto" />
    </div>
  );
}

/**
 * Sidebar footer with GitHub link
 */
function SidebarFooter(): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <FileCode2 className="text-muted-foreground size-4" />
      <a
        href="https://github.com/OpenZeppelin/openzeppelin-ui"
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-foreground text-sm transition-colors"
      >
        View on GitHub
      </a>
    </div>
  );
}

/**
 * Main application showcasing OpenZeppelin UI components
 */
function App(): React.ReactElement {
  const [activeDemo, setActiveDemo] = useState<DemoKey>('button');
  const [mobileOpen, setMobileOpen] = useState(false);

  const ActiveComponent = demoComponents[activeDemo];

  return (
    <div className="bg-background text-foreground flex min-h-screen">
      {/* Sidebar */}
      <SidebarLayout
        header={<SidebarHeader />}
        footer={<SidebarFooter />}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
        mobileAriaLabel="Navigation menu"
        background="bg-sidebar"
        width={280}
      >
        <SidebarSection title="Components" className="mt-6">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <SidebarButton
                key={item.key}
                icon={item.icon}
                isSelected={activeDemo === item.key}
                onClick={() => {
                  setActiveDemo(item.key);
                  setMobileOpen(false);
                }}
              >
                {item.label}
              </SidebarButton>
            ))}
          </nav>
        </SidebarSection>

        <SidebarSection title="Packages" className="mt-8">
          <ul className="text-muted-foreground space-y-1.5 text-sm">
            <li>@openzeppelin/ui-components</li>
            <li>@openzeppelin/ui-renderer</li>
            <li>@openzeppelin/ui-types</li>
            <li>@openzeppelin/ui-utils</li>
            <li>@openzeppelin/ui-styles</li>
            <li>@openzeppelin/ui-storage</li>
            <li>@openzeppelin/ui-react</li>
          </ul>
        </SidebarSection>
      </SidebarLayout>

      {/* Main Content Area */}
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Header - visible on all screen sizes, mobile menu on small screens */}
        <Header
          title="Component Examples"
          onOpenSidebar={() => setMobileOpen(true)}
          rightContent={
            <a
              href="https://github.com/OpenZeppelin/openzeppelin-ui"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              GitHub
            </a>
          }
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="mx-auto max-w-4xl">
            <ActiveComponent />
          </div>
        </main>

        {/* Footer */}
        <Footer companyName="OpenZeppelin" />
      </div>
    </div>
  );
}

export default App;
