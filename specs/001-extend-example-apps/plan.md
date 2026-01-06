# Implementation Plan: Extend Example Apps

**Branch**: `001-extend-example-apps` | **Date**: 2026-01-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-extend-example-apps/spec.md`

## Summary

Extend the existing `examples/basic-react-app` to provide comprehensive demonstrations of all components exported from `@openzeppelin/ui-components`, `@openzeppelin/ui-react`, and related packages. The app will be organized into logical categories with live working examples, code snippets, and a fully functional wallet connection integration using the EVM adapter pattern from contracts-ui-builder.

## Technical Context

**Language/Version**: TypeScript 5.8+, React 19.x  
**Primary Dependencies**: @openzeppelin/ui-\* packages, react-hook-form, lucide-react, wagmi, viem, @rainbow-me/rainbowkit  
**Storage**: N/A (demo app - no persistent storage)  
**Testing**: Visual verification via the example app; Vitest for component testing  
**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge)  
**Project Type**: Web application (frontend-only example app)  
**Performance Goals**: N/A (demonstration purposes)  
**Constraints**: Must remain within openzeppelin-ui monorepo, chain-agnostic core with EVM-specific wallet demo  
**Scale/Scope**: ~25 demo components organized into 6 navigation categories

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                        | Status       | Notes                                                                      |
| -------------------------------- | ------------ | -------------------------------------------------------------------------- |
| I. Library-First Architecture    | ✅ PASS      | Example app consumes workspace packages; no new packages created           |
| II. Chain-Agnostic Design        | ⚠️ EXCEPTION | Wallet demo requires EVM adapter for live integration (documented in spec) |
| III. Type Safety & API Stability | ✅ PASS      | TypeScript strict mode; consuming existing typed APIs                      |
| IV. Design System Ownership      | ✅ PASS      | Uses @openzeppelin/ui-styles and ui-components patterns                    |
| V. Testing & Documentation       | ✅ PASS      | Example app serves as living documentation; demos are visual tests         |
| VI. Packaging & Release          | ✅ PASS      | Example app is private; no npm publishing                                  |
| VII. Consumer-First Development  | ✅ PASS      | Validates library usability from consumer perspective                      |

**Exception Justification**: The EVM wallet integration (FR-016/17/18) is explicitly required per clarification. This is contained within the example app only and does not affect the core library's chain-agnostic design. The adapter pattern from contracts-ui-builder is referenced as the implementation model.

## Project Structure

### Documentation (this feature)

```text
specs/001-extend-example-apps/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
examples/basic-react-app/
├── src/
│   ├── App.tsx                    # Main app with sidebar navigation
│   ├── main.tsx                   # Entry point with providers
│   ├── index.css                  # Global styles
│   ├── components/
│   │   ├── index.ts               # Barrel export
│   │   │
│   │   ├── # Core Input Components
│   │   ├── ButtonDemo.tsx         # (existing)
│   │   ├── InputDemo.tsx          # (existing)
│   │   ├── SelectDemo.tsx         # (existing)
│   │   ├── TextareaDemo.tsx       # NEW
│   │   ├── CheckboxDemo.tsx       # NEW
│   │   ├── RadioGroupDemo.tsx     # NEW
│   │   │
│   │   ├── # Feedback Components
│   │   ├── AlertDemo.tsx          # NEW
│   │   ├── DialogDemo.tsx         # NEW
│   │   ├── TooltipDemo.tsx        # NEW
│   │   ├── PopoverDemo.tsx        # NEW
│   │   ├── ToastDemo.tsx          # NEW (Sonner)
│   │   │
│   │   ├── # Layout Components
│   │   ├── CardDemo.tsx           # NEW
│   │   ├── TabsDemo.tsx           # NEW
│   │   ├── AccordionDemo.tsx      # NEW
│   │   ├── ProgressDemo.tsx       # NEW
│   │   ├── DropdownMenuDemo.tsx   # NEW
│   │   │
│   │   ├── # Data Display Components
│   │   ├── AddressDisplayDemo.tsx # NEW
│   │   ├── NetworkDemo.tsx        # NEW (Icon, Selector, StatusBadge)
│   │   ├── EmptyStateDemo.tsx     # NEW
│   │   ├── BannerDemo.tsx         # NEW
│   │   ├── ExternalLinkDemo.tsx   # NEW
│   │   ├── LoadingButtonDemo.tsx  # NEW
│   │   │
│   │   ├── # Form Field Components
│   │   ├── FormDemo.tsx           # (existing - enhance)
│   │   ├── FormFieldsDemo.tsx     # NEW (all specialized fields)
│   │   ├── CalendarDemo.tsx       # NEW
│   │   ├── DateRangePickerDemo.tsx# NEW
│   │   │
│   │   ├── # React Integration
│   │   ├── WalletDemo.tsx         # NEW (live wallet connection)
│   │   ├── RendererDemo.tsx       # (existing - enhance)
│   │   │
│   │   └── # Shared
│   │       └── DemoSection.tsx    # NEW (reusable demo wrapper)
│   │
│   ├── config/
│   │   └── networks.ts            # Network configurations for wallet demo
│   │
│   └── providers/
│       └── AppProviders.tsx       # Wallet providers wrapper
│
├── package.json                   # Updated dependencies
├── vite.config.ts
└── tsconfig.json
```

**Structure Decision**: Extend the existing `examples/basic-react-app` with additional demo components organized by category. The flat component structure with clear naming conventions (`*Demo.tsx`) maintains simplicity while the sidebar navigation provides logical grouping.

## Component Inventory

### UI Components (31 total from @openzeppelin/ui-components)

| Component               | Demo File               | Category     | Status  |
| ----------------------- | ----------------------- | ------------ | ------- |
| Accordion               | AccordionDemo.tsx       | Layout       | NEW     |
| AddressDisplay          | AddressDisplayDemo.tsx  | Data Display | NEW     |
| Alert                   | AlertDemo.tsx           | Feedback     | NEW     |
| Banner                  | BannerDemo.tsx          | Data Display | NEW     |
| Button                  | ButtonDemo.tsx          | Inputs       | EXISTS  |
| Calendar                | CalendarDemo.tsx        | Forms        | NEW     |
| Card                    | CardDemo.tsx            | Layout       | NEW     |
| Checkbox                | CheckboxDemo.tsx        | Inputs       | NEW     |
| DateRangePicker         | DateRangePickerDemo.tsx | Forms        | NEW     |
| Dialog                  | DialogDemo.tsx          | Feedback     | NEW     |
| DropdownMenu            | DropdownMenuDemo.tsx    | Layout       | NEW     |
| EmptyState              | EmptyStateDemo.tsx      | Data Display | NEW     |
| ExternalLink            | ExternalLinkDemo.tsx    | Data Display | NEW     |
| Footer                  | (shown in App.tsx)      | Layout       | EXISTS  |
| Form\*                  | FormDemo.tsx            | Forms        | EXISTS  |
| Header                  | (shown in App.tsx)      | Layout       | EXISTS  |
| Input                   | InputDemo.tsx           | Inputs       | EXISTS  |
| Label                   | FormDemo.tsx            | Forms        | EXISTS  |
| LoadingButton           | LoadingButtonDemo.tsx   | Data Display | NEW     |
| NetworkIcon             | NetworkDemo.tsx         | Data Display | NEW     |
| NetworkSelector         | NetworkDemo.tsx         | Data Display | NEW     |
| NetworkStatusBadge      | NetworkDemo.tsx         | Data Display | NEW     |
| Popover                 | PopoverDemo.tsx         | Feedback     | NEW     |
| Progress                | ProgressDemo.tsx        | Layout       | NEW     |
| RadioGroup              | RadioGroupDemo.tsx      | Inputs       | NEW     |
| Select                  | SelectDemo.tsx          | Inputs       | EXISTS  |
| Sidebar\*               | (shown in App.tsx)      | Layout       | EXISTS  |
| Tabs                    | TabsDemo.tsx            | Layout       | NEW     |
| Textarea                | TextareaDemo.tsx        | Inputs       | NEW     |
| Tooltip                 | TooltipDemo.tsx         | Feedback     | NEW     |
| ViewContractStateButton | RendererDemo.tsx        | Forms        | ENHANCE |

### Form Fields (20 total from @openzeppelin/ui-components/fields)

All demonstrated in `FormFieldsDemo.tsx`:

- AddressField, AmountField, ArrayField, ArrayObjectField, BigIntField
- BooleanField, BytesField, DateTimeField, EnumField, FileUploadField
- MapField, NumberField, ObjectField, PasswordField, RadioField
- SelectField, SelectGroupedField, TextAreaField, TextField, UrlField

_Note: BaseField is an internal abstraction, not a user-facing field component._

### React Hooks/Providers (from @openzeppelin/ui-react)

Demonstrated in `WalletDemo.tsx`:

- AdapterProvider, WalletStateProvider
- useDerivedAccountStatus, useDerivedChainInfo
- useDerivedConnectStatus, useDerivedDisconnect
- WalletConnectionHeader, WalletConnectionUI

## Navigation Categories

```typescript
const categories = [
  {
    title: 'Inputs',
    items: ['Button', 'Input', 'Select', 'Textarea', 'Checkbox', 'RadioGroup'],
  },
  {
    title: 'Feedback',
    items: ['Alert', 'Dialog', 'Tooltip', 'Popover', 'Toast'],
  },
  {
    title: 'Layout',
    items: ['Card', 'Tabs', 'Accordion', 'Progress', 'DropdownMenu'],
  },
  {
    title: 'Data Display',
    items: ['AddressDisplay', 'Network', 'EmptyState', 'Banner', 'ExternalLink', 'LoadingButton'],
  },
  {
    title: 'Forms',
    items: ['Form', 'FormFields', 'Calendar', 'DateRangePicker'],
  },
  {
    title: 'Integration',
    items: ['Wallet', 'Renderer'],
  },
];
```

## Complexity Tracking

| Violation              | Why Needed                                             | Simpler Alternative Rejected Because                            |
| ---------------------- | ------------------------------------------------------ | --------------------------------------------------------------- |
| EVM adapter dependency | Live wallet connection required per spec clarification | Static code examples don't demonstrate actual wallet state flow |

## Dependencies to Add

```json
{
  "dependencies": {
    "@openzeppelin/ui-react": "workspace:^",
    "@rainbow-me/rainbowkit": "^2.x",
    "@tanstack/react-query": "^5.x",
    "wagmi": "^2.x",
    "viem": "^2.x"
  }
}
```

## Implementation Phases

### Phase 1: Foundation (P1 Stories)

- Create `DemoSection` wrapper component for consistent demo structure
- Implement remaining Input category demos (Textarea, Checkbox, RadioGroup)
- Add all Data Display demos (AddressDisplay, Network components, etc.)

### Phase 2: Feedback & Layout (P2 Stories)

- Implement all Feedback category demos (Alert, Dialog, Tooltip, Popover, Toast)
- Implement all Layout category demos (Card, Tabs, Accordion, Progress, DropdownMenu)

### Phase 3: Forms (P2 Stories)

- Enhance existing FormDemo
- Create comprehensive FormFieldsDemo with all field types
- Add Calendar and DateRangePicker demos

### Phase 4: Integration (P3 Stories)

- Set up wallet providers (wagmi, RainbowKit)
- Create WalletDemo with live connection
- Enhance RendererDemo with more complete examples

### Phase 5: Polish

- Navigation category grouping in sidebar
- Responsive design verification
- Code example consistency
- Accessibility audit
