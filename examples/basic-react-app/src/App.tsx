import {
  AlertTriangle,
  Calendar,
  CalendarRange,
  CheckSquare,
  CircleDot,
  CreditCard,
  ExternalLink as ExternalLinkIcon,
  FileCode2,
  FormInput,
  Hash,
  Layers,
  LayoutGrid,
  List,
  ListCollapse,
  Loader,
  Loader2,
  MessageSquare,
  MousePointerClick,
  Network,
  PanelTop,
  TextCursorInput,
  Type,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';

import {
  Footer,
  Header,
  SidebarButton,
  SidebarLayout,
  SidebarSection,
} from '@openzeppelin/ui-components';

import {
  AddressDisplayDemo,
  BannerDemo,
  ButtonDemo,
  CheckboxDemo,
  EmptyStateDemo,
  ExternalLinkDemo,
  FormDemo,
  InputDemo,
  LoadingButtonDemo,
  NetworkDemo,
  RadioGroupDemo,
  RendererDemo,
  SelectDemo,
  TextareaDemo,
} from './components';

// ============================================================================
// Types (T004)
// ============================================================================

/**
 * Union type identifying all demo components for navigation routing.
 * Organized by category per data-model.md specification.
 */
type DemoKey =
  // Inputs
  | 'button'
  | 'input'
  | 'select'
  | 'textarea'
  | 'checkbox'
  | 'radio-group'
  // Feedback
  | 'alert'
  | 'dialog'
  | 'tooltip'
  | 'popover'
  | 'toast'
  // Layout
  | 'card'
  | 'tabs'
  | 'accordion'
  | 'progress'
  | 'dropdown-menu'
  // Data Display
  | 'address-display'
  | 'network'
  | 'empty-state'
  | 'banner'
  | 'external-link'
  | 'loading-button'
  // Forms
  | 'form'
  | 'form-fields'
  | 'calendar'
  | 'date-range-picker'
  // Integration
  | 'wallet'
  | 'renderer';

/**
 * Single navigation item within a category
 */
interface NavItem {
  key: DemoKey;
  label: string;
  icon: React.ReactNode;
}

/**
 * Category grouping for navigation items (T005)
 */
interface NavCategory {
  key: string;
  title: string;
  items: NavItem[];
}

// ============================================================================
// Navigation Configuration (T005)
// ============================================================================

/**
 * Navigation items grouped by category per plan.md specification.
 * Categories: Inputs, Feedback, Layout, Data Display, Forms, Integration
 */
const navCategories: NavCategory[] = [
  {
    key: 'inputs',
    title: 'Inputs',
    items: [
      { key: 'button', label: 'Button', icon: <MousePointerClick className="size-4" /> },
      { key: 'input', label: 'Input', icon: <TextCursorInput className="size-4" /> },
      { key: 'select', label: 'Select', icon: <List className="size-4" /> },
      { key: 'textarea', label: 'Textarea', icon: <Type className="size-4" /> },
      { key: 'checkbox', label: 'Checkbox', icon: <CheckSquare className="size-4" /> },
      { key: 'radio-group', label: 'RadioGroup', icon: <CircleDot className="size-4" /> },
    ],
  },
  {
    key: 'feedback',
    title: 'Feedback',
    items: [
      { key: 'alert', label: 'Alert', icon: <AlertTriangle className="size-4" /> },
      { key: 'dialog', label: 'Dialog', icon: <PanelTop className="size-4" /> },
      { key: 'tooltip', label: 'Tooltip', icon: <MessageSquare className="size-4" /> },
      { key: 'popover', label: 'Popover', icon: <LayoutGrid className="size-4" /> },
      { key: 'toast', label: 'Toast', icon: <MessageSquare className="size-4" /> },
    ],
  },
  {
    key: 'layout',
    title: 'Layout',
    items: [
      { key: 'card', label: 'Card', icon: <CreditCard className="size-4" /> },
      { key: 'tabs', label: 'Tabs', icon: <LayoutGrid className="size-4" /> },
      { key: 'accordion', label: 'Accordion', icon: <ListCollapse className="size-4" /> },
      { key: 'progress', label: 'Progress', icon: <Loader2 className="size-4" /> },
      { key: 'dropdown-menu', label: 'DropdownMenu', icon: <List className="size-4" /> },
    ],
  },
  {
    key: 'data-display',
    title: 'Data Display',
    items: [
      { key: 'address-display', label: 'AddressDisplay', icon: <Hash className="size-4" /> },
      { key: 'network', label: 'Network', icon: <Network className="size-4" /> },
      { key: 'empty-state', label: 'EmptyState', icon: <LayoutGrid className="size-4" /> },
      { key: 'banner', label: 'Banner', icon: <PanelTop className="size-4" /> },
      {
        key: 'external-link',
        label: 'ExternalLink',
        icon: <ExternalLinkIcon className="size-4" />,
      },
      { key: 'loading-button', label: 'LoadingButton', icon: <Loader className="size-4" /> },
    ],
  },
  {
    key: 'forms',
    title: 'Forms',
    items: [
      { key: 'form', label: 'Form', icon: <FormInput className="size-4" /> },
      { key: 'form-fields', label: 'FormFields', icon: <FormInput className="size-4" /> },
      { key: 'calendar', label: 'Calendar', icon: <Calendar className="size-4" /> },
      {
        key: 'date-range-picker',
        label: 'DateRangePicker',
        icon: <CalendarRange className="size-4" />,
      },
    ],
  },
  {
    key: 'integration',
    title: 'Integration',
    items: [
      { key: 'wallet', label: 'Wallet', icon: <Wallet className="size-4" /> },
      { key: 'renderer', label: 'Renderer', icon: <Layers className="size-4" /> },
    ],
  },
];

// ============================================================================
// Placeholder Components (T007)
// ============================================================================

/**
 * Placeholder component for demos not yet implemented.
 * Shows a "Coming Soon" message with the component name.
 */
function PlaceholderDemo({ name }: { name: string }): React.ReactElement {
  return (
    <section className="space-y-8">
      <div>
        <h2 className="mb-4 text-2xl font-semibold tracking-tight">{name}</h2>
        <p className="text-muted-foreground mb-6">
          This demo is coming soon. Check back after the corresponding phase is implemented.
        </p>
      </div>
      <div className="bg-muted/50 flex h-48 items-center justify-center rounded-lg border border-dashed">
        <span className="text-muted-foreground text-sm">Demo placeholder</span>
      </div>
    </section>
  );
}

// Placeholder components for demos not yet implemented
const AlertDemo = () => <PlaceholderDemo name="Alert" />;
const DialogDemo = () => <PlaceholderDemo name="Dialog" />;
const TooltipDemo = () => <PlaceholderDemo name="Tooltip" />;
const PopoverDemo = () => <PlaceholderDemo name="Popover" />;
const ToastDemo = () => <PlaceholderDemo name="Toast" />;
const CardDemo = () => <PlaceholderDemo name="Card" />;
const TabsDemo = () => <PlaceholderDemo name="Tabs" />;
const AccordionDemo = () => <PlaceholderDemo name="Accordion" />;
const ProgressDemo = () => <PlaceholderDemo name="Progress" />;
const DropdownMenuDemo = () => <PlaceholderDemo name="DropdownMenu" />;
// Data Display demos imported from components (Phase 4)
const FormFieldsDemo = () => <PlaceholderDemo name="FormFields" />;
const CalendarDemo = () => <PlaceholderDemo name="Calendar" />;
const DateRangePickerDemo = () => <PlaceholderDemo name="DateRangePicker" />;
const WalletDemo = () => <PlaceholderDemo name="Wallet" />;

// ============================================================================
// Demo Component Registry (T007)
// ============================================================================

/**
 * Registry mapping demo keys to their component implementations.
 * Existing demos use actual implementations; future demos use placeholders.
 */
const demoComponents: Record<DemoKey, React.ComponentType> = {
  // Inputs
  button: ButtonDemo,
  input: InputDemo,
  select: SelectDemo,
  textarea: TextareaDemo,
  checkbox: CheckboxDemo,
  'radio-group': RadioGroupDemo,
  // Feedback - placeholders (Phase 5)
  alert: AlertDemo,
  dialog: DialogDemo,
  tooltip: TooltipDemo,
  popover: PopoverDemo,
  toast: ToastDemo,
  // Layout - placeholders (Phase 7)
  card: CardDemo,
  tabs: TabsDemo,
  accordion: AccordionDemo,
  progress: ProgressDemo,
  'dropdown-menu': DropdownMenuDemo,
  // Data Display (Phase 4)
  'address-display': AddressDisplayDemo,
  network: NetworkDemo,
  'empty-state': EmptyStateDemo,
  banner: BannerDemo,
  'external-link': ExternalLinkDemo,
  'loading-button': LoadingButtonDemo,
  // Forms - existing + placeholders (Phase 6)
  form: FormDemo,
  'form-fields': FormFieldsDemo,
  calendar: CalendarDemo,
  'date-range-picker': DateRangePickerDemo,
  // Integration - existing + placeholders (Phase 8)
  wallet: WalletDemo,
  renderer: RendererDemo,
};

// ============================================================================
// Layout Components
// ============================================================================

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

// ============================================================================
// Main Application
// ============================================================================

/**
 * Main application showcasing OpenZeppelin UI components.
 * Navigation is organized into categories per FR-015 specification.
 */
function App(): React.ReactElement {
  const [activeDemo, setActiveDemo] = useState<DemoKey>('button');
  const [mobileOpen, setMobileOpen] = useState(false);

  const ActiveComponent = demoComponents[activeDemo];

  return (
    <div className="bg-background text-foreground flex min-h-screen">
      {/* Sidebar with categorized navigation (T006) */}
      <SidebarLayout
        header={<SidebarHeader />}
        footer={<SidebarFooter />}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
        mobileAriaLabel="Navigation menu"
        background="bg-sidebar"
        width={280}
      >
        {/* Render each navigation category as a SidebarSection */}
        {navCategories.map((category) => (
          <SidebarSection key={category.key} title={category.title} className="mt-6">
            <nav className="flex flex-col gap-1">
              {category.items.map((item) => (
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
        ))}

        {/* Package reference section */}
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
