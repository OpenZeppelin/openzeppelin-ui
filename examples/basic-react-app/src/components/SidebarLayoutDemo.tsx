import { FileText, Home, Menu, Settings, Users } from 'lucide-react';
import { useState, type ReactElement } from 'react';

import {
  Button,
  Footer,
  Header,
  SidebarButton,
  SidebarGroup,
  SidebarSection,
} from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/**
 * Demonstrates Sidebar, Header, and Footer components for building app layouts.
 * Shows the individual components that make up the app shell without nesting
 * a full SidebarLayout (which uses fixed positioning and breaks container layouts).
 */
export function SidebarLayoutDemo(): ReactElement {
  const [activeItem, setActiveItem] = useState('dashboard');
  const [groupOpen, setGroupOpen] = useState(true);

  return (
    <DemoSection
      title="Scaffold"
      description="Structural layout components for building application scaffolds. Includes Header, Footer, SidebarLayout, SidebarSection, SidebarButton, and SidebarGroup."
      codeExample={`import {
  Footer,
  Header,
  SidebarButton,
  SidebarGroup,
  SidebarLayout,
  SidebarSection,
} from '@openzeppelin/ui-components';

function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeItem, setActiveItem] = useState('dashboard');

  return (
    <div className="flex min-h-screen">
      <SidebarLayout
        header={<Logo />}
        footer={<SidebarFooter />}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
        mobileAriaLabel="Navigation menu"
        background="bg-sidebar"
        width={280}
      >
        <SidebarSection title="Navigation">
          <SidebarButton
            icon={<Home className="size-4" />}
            isSelected={activeItem === 'dashboard'}
            onClick={() => setActiveItem('dashboard')}
          >
            Dashboard
          </SidebarButton>
        </SidebarSection>

        <SidebarSection title="Settings">
          <SidebarGroup
            title="Account"
            open={groupOpen}
            onOpenChange={setGroupOpen}
          >
            <SidebarButton size="small">Profile</SidebarButton>
            <SidebarButton size="small">Security</SidebarButton>
          </SidebarGroup>
        </SidebarSection>
      </SidebarLayout>

      <div className="flex flex-1 flex-col">
        <Header
          title="My App"
          onOpenSidebar={() => setMobileOpen(true)}
          rightContent={<UserMenu />}
        />
        <main className="flex-1 p-6">
          {/* Page content */}
        </main>
        <Footer companyName="OpenZeppelin" />
      </div>
    </div>
  );
}`}
    >
      {/* Visual Layout Diagram */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Layout Structure</h3>
        <p className="text-muted-foreground text-sm">
          The app shell combines a sidebar with header, main content, and footer. This example app
          uses this exact structure—see how the components work together.
        </p>

        {/* Mockup showing the layout structure */}
        <div className="overflow-hidden rounded-lg border-2 border-dashed">
          <div className="flex h-[400px]">
            {/* Sidebar mockup */}
            <div className="bg-sidebar flex w-56 shrink-0 flex-col border-r">
              {/* Sidebar header */}
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <div className="bg-primary size-6 rounded" />
                  <span className="font-semibold">SidebarLayout</span>
                </div>
              </div>

              {/* Sidebar content */}
              <div className="flex-1 overflow-auto p-3">
                <SidebarSection title="Navigation">
                  <nav className="flex flex-col gap-1">
                    <SidebarButton
                      icon={<Home className="size-4" />}
                      isSelected={activeItem === 'dashboard'}
                      onClick={() => setActiveItem('dashboard')}
                    >
                      Dashboard
                    </SidebarButton>
                    <SidebarButton
                      icon={<FileText className="size-4" />}
                      isSelected={activeItem === 'contracts'}
                      onClick={() => setActiveItem('contracts')}
                    >
                      Contracts
                    </SidebarButton>
                    <SidebarButton
                      icon={<Users className="size-4" />}
                      isSelected={activeItem === 'users'}
                      onClick={() => setActiveItem('users')}
                    >
                      Users
                    </SidebarButton>
                  </nav>
                </SidebarSection>

                <SidebarSection title="Settings" className="mt-6">
                  <SidebarGroup title="Account" open={groupOpen} onOpenChange={setGroupOpen}>
                    <div className="flex flex-col gap-0.5">
                      <SidebarButton
                        icon={<Settings className="size-4" />}
                        size="small"
                        isSelected={activeItem === 'profile'}
                        onClick={() => setActiveItem('profile')}
                      >
                        Profile
                      </SidebarButton>
                      <SidebarButton
                        size="small"
                        isSelected={activeItem === 'security'}
                        onClick={() => setActiveItem('security')}
                      >
                        Security
                      </SidebarButton>
                    </div>
                  </SidebarGroup>
                </SidebarSection>
              </div>

              {/* Sidebar footer */}
              <div className="text-muted-foreground p-4 text-xs">footer slot</div>
            </div>

            {/* Main area */}
            <div className="bg-background flex min-w-0 flex-1 flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="text-sm font-medium">Header</span>
                <span className="text-muted-foreground text-xs">rightContent slot</span>
              </div>

              {/* Main content */}
              <div className="bg-muted/20 flex flex-1 items-center justify-center p-4">
                <div className="text-center">
                  <p className="text-muted-foreground text-sm">Main Content Area</p>
                  <p className="text-muted-foreground mt-1 text-xs">Selected: {activeItem}</p>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t px-4 py-3 text-center text-sm">Footer</div>
            </div>
          </div>
        </div>
      </div>

      {/* Header Component */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Header</h3>
        <p className="text-muted-foreground text-sm">
          Responsive header with mobile menu trigger, title, and customizable right content.
        </p>
        <div className="overflow-hidden rounded-lg border">
          <Header
            title="Application Title"
            onOpenSidebar={() => alert('Mobile menu clicked')}
            rightContent={
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  Docs
                </Button>
                <Button size="sm">Sign In</Button>
              </div>
            }
          />
        </div>
      </div>

      {/* Footer Component */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Footer</h3>
        <p className="text-muted-foreground text-sm">
          Simple footer with company branding and automatic copyright year.
        </p>
        <div className="overflow-hidden rounded-lg border">
          <Footer companyName="OpenZeppelin" />
        </div>
      </div>

      {/* Sidebar Button Variants */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">SidebarButton</h3>
        <p className="text-muted-foreground text-sm">
          Navigation buttons with icon support, selection states, and size variants.
        </p>
        <div className="bg-sidebar flex max-w-xs flex-col gap-2 rounded-lg border p-4">
          <SidebarButton icon={<Home className="size-4" />} isSelected>
            Selected Item
          </SidebarButton>
          <SidebarButton icon={<FileText className="size-4" />}>Default Item</SidebarButton>
          <SidebarButton icon={<Settings className="size-4" />} size="small">
            Small Size
          </SidebarButton>
          <SidebarButton size="small" isSelected>
            Small Selected
          </SidebarButton>
        </div>
      </div>

      {/* Sidebar Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">SidebarSection</h3>
        <p className="text-muted-foreground text-sm">
          Groups navigation items under a labeled section header.
        </p>
        <div className="bg-sidebar max-w-xs rounded-lg border p-4">
          <SidebarSection title="Main Navigation">
            <nav className="flex flex-col gap-1">
              <SidebarButton icon={<Home className="size-4" />}>Dashboard</SidebarButton>
              <SidebarButton icon={<FileText className="size-4" />}>Documents</SidebarButton>
              <SidebarButton icon={<Users className="size-4" />}>Team</SidebarButton>
            </nav>
          </SidebarSection>
        </div>
      </div>

      {/* Sidebar Group */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">SidebarGroup</h3>
        <p className="text-muted-foreground text-sm">
          Collapsible section for organizing nested navigation items.
        </p>
        <div className="bg-sidebar flex max-w-xs flex-col gap-2 rounded-lg border p-4">
          <SidebarGroup title="Collapsible Section" open={groupOpen} onOpenChange={setGroupOpen}>
            <div className="flex flex-col gap-0.5">
              <SidebarButton size="small" icon={<Menu className="size-4" />}>
                Nested Item 1
              </SidebarButton>
              <SidebarButton size="small">Nested Item 2</SidebarButton>
              <SidebarButton size="small">Nested Item 3</SidebarButton>
            </div>
          </SidebarGroup>
        </div>
      </div>
    </DemoSection>
  );
}
