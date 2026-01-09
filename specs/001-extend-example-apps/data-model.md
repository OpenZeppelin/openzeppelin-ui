# Data Model: Extend Example Apps

**Feature**: 001-extend-example-apps  
**Date**: 2026-01-06

## Overview

The example app is a stateless demonstration application. It has no persistent data storage requirements. This document defines the runtime data structures used for navigation, demo configuration, and wallet state management.

## Core Entities

### DemoKey (Union Type)

Identifies a specific demo component for navigation routing.

```typescript
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
```

### NavCategory

Groups navigation items into logical sections.

```typescript
interface NavCategory {
  /** Unique identifier for the category */
  key: string;
  /** Display title for the sidebar section */
  title: string;
  /** Demo items within this category */
  items: NavItem[];
}
```

### NavItem

Represents a single navigation entry in the sidebar.

```typescript
interface NavItem {
  /** Unique key matching DemoKey */
  key: DemoKey;
  /** Display label in navigation */
  label: string;
  /** Icon component from lucide-react */
  icon: React.ReactNode;
}
```

### DemoComponent

Registry mapping demo keys to their component implementations.

```typescript
type DemoComponentRegistry = Record<DemoKey, React.ComponentType>;

const demoComponents: DemoComponentRegistry = {
  button: ButtonDemo,
  input: InputDemo,
  // ... etc.
};
```

### DemoSectionProps

Props interface for the reusable demo section wrapper.

```typescript
interface DemoSectionProps {
  /** Section title displayed as h2 */
  title: string;
  /** Brief description of the component */
  description: string;
  /** Demo content (live examples) */
  children: React.ReactNode;
  /** Optional code example to display */
  codeExample?: string;
}
```

## Wallet Integration Entities

### NetworkConfig (from @openzeppelin/ui-types)

Network configuration for wallet demo. Uses existing type from ui-types package.

```typescript
// Already defined in @openzeppelin/ui-types
interface NetworkConfig {
  id: string;
  name: string;
  chainId: number;
  ecosystem: 'evm' | 'stellar' | 'solana' | 'midnight';
  // ... additional fields
}
```

### DemoNetworkConfig

Simplified network config for example app demos.

```typescript
interface DemoNetworkConfig {
  id: string;
  name: string;
  chainId: number;
  testnet?: boolean;
}

const demoNetworks: DemoNetworkConfig[] = [
  { id: '1', name: 'Ethereum', chainId: 1 },
  { id: '11155111', name: 'Sepolia', chainId: 11155111, testnet: true },
  { id: '137', name: 'Polygon', chainId: 137 },
  { id: '42161', name: 'Arbitrum One', chainId: 42161 },
];
```

### WalletDemoState

Local state for the wallet integration demo component.

```typescript
interface WalletDemoState {
  /** Currently selected network for demonstration */
  selectedNetworkId: string | null;
  /** Whether to show connection details panel */
  showDetails: boolean;
}
```

## Form Field Demo Entities

### FormFieldCategory

Groups form fields for tabbed display.

```typescript
interface FormFieldCategory {
  key: string;
  label: string;
  fields: FormFieldDemoConfig[];
}

interface FormFieldDemoConfig {
  /** Field type identifier */
  type: string;
  /** Display name */
  label: string;
  /** Field-specific props for demo */
  demoProps: Record<string, unknown>;
}
```

### FormFieldCategories

Categorization of all 18+ form field types.

```typescript
const formFieldCategories: FormFieldCategory[] = [
  {
    key: 'text',
    label: 'Text Fields',
    fields: [
      { type: 'TextField', label: 'Text Field', demoProps: { placeholder: 'Enter text...' } },
      { type: 'TextAreaField', label: 'Text Area', demoProps: { rows: 4 } },
      { type: 'PasswordField', label: 'Password', demoProps: {} },
      { type: 'UrlField', label: 'URL', demoProps: { placeholder: 'https://...' } },
    ],
  },
  {
    key: 'number',
    label: 'Number Fields',
    fields: [
      { type: 'NumberField', label: 'Number', demoProps: {} },
      { type: 'AmountField', label: 'Amount', demoProps: { decimals: 18 } },
      { type: 'BigIntField', label: 'BigInt', demoProps: {} },
    ],
  },
  {
    key: 'selection',
    label: 'Selection Fields',
    fields: [
      { type: 'SelectField', label: 'Select', demoProps: { options: [] } },
      { type: 'SelectGroupedField', label: 'Grouped Select', demoProps: { groups: [] } },
      { type: 'RadioField', label: 'Radio', demoProps: { options: [] } },
      { type: 'EnumField', label: 'Enum', demoProps: { enumValues: [] } },
      { type: 'BooleanField', label: 'Boolean', demoProps: {} },
    ],
  },
  {
    key: 'data',
    label: 'Data Fields',
    fields: [
      { type: 'AddressField', label: 'Address', demoProps: {} },
      { type: 'BytesField', label: 'Bytes', demoProps: {} },
      { type: 'DateTimeField', label: 'DateTime', demoProps: {} },
      { type: 'FileUploadField', label: 'File Upload', demoProps: {} },
    ],
  },
  {
    key: 'complex',
    label: 'Complex Fields',
    fields: [
      { type: 'ArrayField', label: 'Array', demoProps: { itemType: 'string' } },
      { type: 'ArrayObjectField', label: 'Array of Objects', demoProps: {} },
      { type: 'ObjectField', label: 'Object', demoProps: {} },
      { type: 'MapField', label: 'Map', demoProps: {} },
    ],
  },
];
```

## State Management

### App-Level State

```typescript
// App.tsx state
const [activeDemo, setActiveDemo] = useState<DemoKey>('button');
const [mobileOpen, setMobileOpen] = useState(false);
```

### Wallet Provider State

Uses existing state management from @openzeppelin/ui-react:

- `AdapterContext` - Adapter registry
- `WalletStateContext` - Active network and wallet state

## Relationships

```
NavCategory ──1:N──> NavItem
NavItem ───────────> DemoKey (references)
DemoKey ───────────> DemoComponentRegistry (lookup)

FormFieldCategory ─1:N──> FormFieldDemoConfig

WalletStateContext ──> NetworkConfig
WalletStateContext ──> ContractAdapter
```

## Validation Rules

| Entity              | Field   | Rule                                          |
| ------------------- | ------- | --------------------------------------------- |
| DemoKey             | -       | Must match a key in `demoComponents` registry |
| NavItem.key         | key     | Must be valid DemoKey                         |
| DemoNetworkConfig   | chainId | Must be positive integer                      |
| FormFieldDemoConfig | type    | Must match exported field component name      |

## No Persistent Storage

This example app has no database, no API calls (except wallet RPC), and no persistent state. All data is:

- Hardcoded configuration (networks, navigation)
- Runtime React state (active demo, form values)
- Wallet state from wagmi/RainbowKit (ephemeral session)
