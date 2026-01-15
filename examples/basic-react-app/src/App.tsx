import {
  AlertTriangle,
  ArrowLeftRight,
  Calendar,
  CalendarRange,
  CheckSquare,
  CircleDot,
  CreditCard,
  ExternalLink as ExternalLinkIcon,
  FileCode2,
  FormInput,
  Hash,
  Home,
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
  Wand2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Footer,
  Header,
  SidebarButton,
  SidebarGroup,
  SidebarLayout,
  SidebarSection,
} from '@openzeppelin/ui-components';

import { EcosystemSwitcher } from './components/EcosystemSwitcher';

import {
  AccordionDemo,
  AddressDisplayDemo,
  AlertDemo,
  ArchitectureDemo,
  BannerDemo,
  ButtonDemo,
  CalendarDemo,
  CardDemo,
  CheckboxDemo,
  DateRangePickerDemo,
  DialogDemo,
  DropdownMenuDemo,
  EmptyStateDemo,
  ExternalLinkDemo,
  FormDemo,
  FormFieldsDemo,
  HomeDemo,
  InputDemo,
  LoadingButtonDemo,
  NetworkDemo,
  PopoverDemo,
  ProgressDemo,
  RadioGroupDemo,
  RendererDemo,
  SelectDemo,
  TabsDemo,
  TextareaDemo,
  ToastDemo,
  TooltipDemo,
  TypeMappingDemo,
  WalletDemo,
} from './components';
import { useUiStore } from './stores';

// ============================================================================
// Types
// ============================================================================

/**
 * Union type identifying all demo components for navigation routing.
 */
type DemoKey =
  // Integration
  | 'overview'
  | 'architecture'
  | 'type-mapping'
  | 'wallet'
  | 'renderer'
  | 'network'
  // Component Gallery - Inputs
  | 'button'
  | 'input'
  | 'select'
  | 'textarea'
  | 'checkbox'
  | 'radio-group'
  // Component Gallery - Feedback
  | 'alert'
  | 'dialog'
  | 'tooltip'
  | 'popover'
  | 'toast'
  // Component Gallery - Layout
  | 'card'
  | 'tabs'
  | 'accordion'
  | 'progress'
  | 'dropdown-menu'
  // Component Gallery - Data Display
  | 'address-display'
  | 'empty-state'
  | 'banner'
  | 'external-link'
  | 'loading-button'
  // Component Gallery - Forms
  | 'form'
  | 'form-fields'
  | 'calendar'
  | 'date-range-picker';

/**
 * Single navigation item
 */
interface NavItem {
  key: DemoKey;
  label: string;
  icon: React.ReactNode;
}

/**
 * Collapsible category for Component Gallery
 */
interface GalleryCategory {
  key: string;
  title: string;
  items: NavItem[];
}

// ============================================================================
// Navigation Configuration
// ============================================================================

/**
 * Integration section - flat list of demos showcasing adapter power
 */
const integrationItems: NavItem[] = [
  { key: 'overview', label: 'Overview', icon: <Home className="size-4" /> },
  { key: 'architecture', label: 'Architecture', icon: <Layers className="size-4" /> },
  { key: 'type-mapping', label: 'Type Mapping', icon: <ArrowLeftRight className="size-4" /> },
  { key: 'wallet', label: 'Wallet Connect', icon: <Wallet className="size-4" /> },
  { key: 'renderer', label: 'Form Renderer', icon: <Wand2 className="size-4" /> },
  { key: 'network', label: 'Network Management', icon: <Network className="size-4" /> },
];

/**
 * Component Gallery - collapsible categories
 */
const galleryCategories: GalleryCategory[] = [
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
];

// ============================================================================
// Demo Component Registry
// ============================================================================

/**
 * Registry mapping demo keys to their component implementations.
 */
const demoComponents: Record<
  DemoKey,
  React.ComponentType<{ onNavigate?: (key: string) => void }>
> = {
  // Integration
  overview: HomeDemo,
  architecture: ArchitectureDemo,
  'type-mapping': TypeMappingDemo,
  wallet: WalletDemo,
  renderer: RendererDemo,
  network: NetworkDemo,
  // Component Gallery - Inputs
  button: ButtonDemo,
  input: InputDemo,
  select: SelectDemo,
  textarea: TextareaDemo,
  checkbox: CheckboxDemo,
  'radio-group': RadioGroupDemo,
  // Component Gallery - Feedback
  alert: AlertDemo,
  dialog: DialogDemo,
  tooltip: TooltipDemo,
  popover: PopoverDemo,
  toast: ToastDemo,
  // Component Gallery - Layout
  card: CardDemo,
  tabs: TabsDemo,
  accordion: AccordionDemo,
  progress: ProgressDemo,
  'dropdown-menu': DropdownMenuDemo,
  // Component Gallery - Data Display
  'address-display': AddressDisplayDemo,
  'empty-state': EmptyStateDemo,
  banner: BannerDemo,
  'external-link': ExternalLinkDemo,
  'loading-button': LoadingButtonDemo,
  // Component Gallery - Forms
  form: FormDemo,
  'form-fields': FormFieldsDemo,
  calendar: CalendarDemo,
  'date-range-picker': DateRangePickerDemo,
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
 * Navigation is split into two sections:
 * 1. Integration - Showcases adapter power and cross-chain capabilities
 * 2. Component Gallery - Pure component reference with collapsible categories
 */
function App(): React.ReactElement {
  const activeDemo = useUiStore((s) => s.activeDemo) as DemoKey;
  const setActiveDemo = useUiStore((s) => s.setActiveDemo);
  const mobileOpen = useUiStore((s) => s.mobileOpen);
  const setMobileOpen = useUiStore((s) => s.setMobileOpen);

  // Track which sidebar groups are open (by category key)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  // Ref for the main content column (scrollable container)
  const contentColumnRef = useRef<HTMLDivElement>(null);

  // Scroll to top when navigating to a different demo
  useEffect(() => {
    contentColumnRef.current?.scrollTo(0, 0);
  }, [activeDemo]);

  // Find which category contains the active demo
  const activeCategoryKey = useMemo(() => {
    for (const category of galleryCategories) {
      if (category.items.some((item) => item.key === activeDemo)) {
        return category.key;
      }
    }
    return null;
  }, [activeDemo]);

  // Handle toggling a sidebar group
  const handleGroupToggle = useCallback((categoryKey: string, isOpen: boolean) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (isOpen) {
        next.add(categoryKey);
      } else {
        next.delete(categoryKey);
      }
      return next;
    });
  }, []);

  // A group is open if it contains the active demo OR user manually opened it
  const isGroupOpen = useCallback(
    (categoryKey: string) => {
      return categoryKey === activeCategoryKey || openGroups.has(categoryKey);
    },
    [activeCategoryKey, openGroups]
  );

  // Handle navigation with type coercion
  const handleNavigate = (key: string) => {
    setActiveDemo(key as DemoKey);
  };

  const ActiveComponent = demoComponents[activeDemo] ?? demoComponents.overview;

  return (
    <div className="bg-background text-foreground flex min-h-screen">
      <SidebarLayout
        header={<SidebarHeader />}
        footer={<SidebarFooter />}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
        mobileAriaLabel="Navigation menu"
        background="bg-sidebar"
        width={280}
      >
        {/* Integration Section */}
        <SidebarSection title="Integration" className="mt-6">
          <nav className="flex flex-col gap-1">
            {integrationItems.map((item) => (
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

        {/* Component Gallery Section */}
        <SidebarSection title="Component Gallery" className="mt-8">
          <nav className="flex flex-col gap-1">
            {galleryCategories.map((category) => (
              <SidebarGroup
                key={category.key}
                title={category.title}
                open={isGroupOpen(category.key)}
                onOpenChange={(isOpen) => handleGroupToggle(category.key, isOpen)}
              >
                <div className="flex flex-col gap-0.5">
                  {category.items.map((item) => (
                    <SidebarButton
                      key={item.key}
                      icon={item.icon}
                      size="small"
                      isSelected={activeDemo === item.key}
                      onClick={() => {
                        setActiveDemo(item.key);
                        setMobileOpen(false);
                      }}
                    >
                      {item.label}
                    </SidebarButton>
                  ))}
                </div>
              </SidebarGroup>
            ))}
          </nav>
        </SidebarSection>

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
      <div ref={contentColumnRef} className="flex min-h-screen flex-1 flex-col overflow-y-auto">
        {/* Header */}
        <Header
          title="OpenZeppelin UI"
          onOpenSidebar={() => setMobileOpen(true)}
          rightContent={
            <div className="flex items-center gap-4">
              <EcosystemSwitcher />
              <a
                href="https://github.com/OpenZeppelin/openzeppelin-ui"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                GitHub
              </a>
            </div>
          }
        />

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          <div className="mx-auto max-w-4xl">
            <ActiveComponent onNavigate={handleNavigate} />
          </div>
        </main>

        {/* Footer */}
        <Footer companyName="OpenZeppelin" />
      </div>
    </div>
  );
}

export default App;
