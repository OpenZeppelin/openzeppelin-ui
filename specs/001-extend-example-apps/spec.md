# Feature Specification: Extend Example Apps

**Feature Branch**: `001-extend-example-apps`  
**Created**: January 6, 2026  
**Status**: Ready for Review  
**Input**: User description: "Extend example apps with more examples covering all components and usecases."

## Clarifications

### Session 2026-01-06

- Q: Should React Integration (User Story 6) include working wallet connections or just code examples? → A: Live wallet integration using ui-builder with EVM adapter as reference implementation (reference: `packages/adapter-evm` from ui-builder main branch).
- Q: Should wallet integration be added to existing basic-react-app or a new separate example app? → A: Extend existing basic-react-app with wallet integration section added to sidebar navigation.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Component Showcase Discovery (Priority: P1)

A developer new to OpenZeppelin UI visits the example application to understand what components are available and how they look and behave. They want to browse through all UI components to evaluate if the library fits their project needs.

**Why this priority**: This is the foundational use case - developers need to see what's available before they can use it. Without comprehensive component coverage in examples, developers cannot properly evaluate the library.

**Independent Test**: Can be fully tested by navigating through all component sections in the example app and verifying each component displays with various states and variants.

**Acceptance Scenarios**:

1. **Given** a developer opens the example app, **When** they navigate to any component section, **Then** they see a live demonstration of that component with all its variants displayed.
2. **Given** a developer is viewing a component demo, **When** they examine the section, **Then** they see the component in various states (default, hover, disabled, loading, error states where applicable).
3. **Given** a developer views a component, **When** they scroll to the usage section, **Then** they find code snippets demonstrating how to import and use the component.

---

### User Story 2 - Data Display Components (Priority: P1)

A developer needs to display blockchain data such as addresses, network badges, and transaction status in their application. They visit the examples to understand how to use data display components correctly.

**Why this priority**: Data display is critical for blockchain applications - showing addresses, networks, and transaction states is fundamental functionality that most applications require.

**Independent Test**: Can be fully tested by navigating to data display demos and verifying address display, network icons/badges, and status components render correctly with sample data.

**Acceptance Scenarios**:

1. **Given** a developer navigates to the Address Display demo, **When** they view the component, **Then** they see addresses displayed in various formats (full, truncated, with copy button).
2. **Given** a developer navigates to the Network components demo, **When** they view the section, **Then** they see network icons, network selector, and network status badges for multiple blockchain networks.
3. **Given** a developer views the transaction status demo, **When** they examine the component, **Then** they see transaction status displays in various states (pending, confirmed, failed).

---

### User Story 3 - Feedback and Overlay Components (Priority: P2)

A developer needs to provide user feedback through alerts, dialogs, tooltips, and notifications. They want to understand how to implement these interaction patterns.

**Why this priority**: User feedback components are essential for good UX but are secondary to core layout and data display functionality.

**Independent Test**: Can be fully tested by interacting with alert, dialog, toast, and tooltip demos to verify they display and dismiss correctly.

**Acceptance Scenarios**:

1. **Given** a developer navigates to the Alert demo, **When** they view the section, **Then** they see alerts in various types (info, success, warning, destructive).
2. **Given** a developer navigates to the Dialog demo, **When** they click trigger buttons, **Then** dialogs open and close correctly with proper overlay behavior.
3. **Given** a developer navigates to the Tooltip demo, **When** they hover over trigger elements, **Then** tooltips appear with proper positioning and content.

---

### User Story 4 - Form Field Components (Priority: P2)

A developer building a blockchain form needs specialized input fields. They want to see examples of address fields, amount fields, and other blockchain-specific form inputs.

**Why this priority**: Form fields are crucial for blockchain applications but build upon basic components already demonstrated.

**Independent Test**: Can be fully tested by navigating to form fields demo and interacting with each specialized field type with valid and invalid inputs.

**Acceptance Scenarios**:

1. **Given** a developer navigates to the Form Fields demo, **When** they view the section, **Then** they see all specialized field types (AddressField, AmountField, BigIntField, BytesField, etc.) with working examples.
2. **Given** a developer interacts with a form field, **When** they enter invalid data, **Then** they see appropriate validation messages.
3. **Given** a developer views form fields, **When** they examine each field type, **Then** they can see helper text, labels, and accessibility features in action.

---

### User Story 5 - Layout and Navigation Components (Priority: P3)

A developer wants to understand how to structure their application using layout primitives, cards, tabs, and accordion components.

**Why this priority**: Layout components help organize content but developers can work without them initially.

**Independent Test**: Can be fully tested by viewing the layout section and verifying cards, tabs, accordion, and progress components render and function correctly.

**Acceptance Scenarios**:

1. **Given** a developer navigates to the Card demo, **When** they view the section, **Then** they see cards with headers, content, and footers in various configurations.
2. **Given** a developer navigates to the Tabs demo, **When** they click different tabs, **Then** content panels switch correctly and tab states update.
3. **Given** a developer navigates to the Accordion demo, **When** they click accordion headers, **Then** sections expand and collapse appropriately.

---

### User Story 6 - React Hooks and Providers (Priority: P3)

A developer needs to integrate wallet connections and blockchain state management. They want to see working examples of wallet integration using the React package hooks and providers.

**Why this priority**: Integration patterns are advanced topics that require understanding of basic components first.

**Independent Test**: Can be fully tested by connecting a wallet, verifying connection state displays correctly, and testing disconnection flow.

**Reference Implementation**: Use ui-builder with EVM adapter as the reference for wallet integration patterns.

**Acceptance Scenarios**:

1. **Given** a developer navigates to the React Integration section, **When** they view the section, **Then** they see a working wallet connection demo with AdapterProvider and WalletStateProvider configured.
2. **Given** a developer clicks the connect wallet button, **When** a wallet is available, **Then** the connection flow initiates and wallet state updates reflect in the UI.
3. **Given** a developer is connected, **When** they examine the demo, **Then** they see derived state hooks (useDerivedAccountStatus, useDerivedChainInfo, etc.) displaying real wallet data.
4. **Given** a developer views code examples, **When** they examine provider setup, **Then** they find copy-ready configuration matching the ui-builder EVM adapter pattern.

---

### Edge Cases

- What happens when a component receives invalid or missing props? The demo should show graceful fallback behavior.
- How do components behave on mobile viewport sizes? The example app should be responsive and demonstrate mobile-friendly variants.
- How do components handle long text content or large data sets? Examples should include edge cases with overflow handling.
- What happens when optional features (like network icons for unsupported networks) are missing? Demos should show placeholder or fallback states.
- What happens when no wallet extension is installed? The wallet demo should display a helpful message guiding users to install a wallet.
- What happens when a user rejects the wallet connection request? The demo should show the rejected state and allow retry.
- What happens when the connected wallet is on an unsupported network? The demo should prompt network switching or show a mismatch warning.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Example app MUST demonstrate all UI components exported from `@openzeppelin/ui-components`.
- **FR-002**: Example app MUST include interactive demos for Button, Input, Select, Textarea, Checkbox, and RadioGroup components.
- **FR-003**: Example app MUST demonstrate Alert, Dialog, Tooltip, Popover, and Toast (Sonner) components.
- **FR-004**: Example app MUST showcase Card, Tabs, Accordion, and Progress components with multiple variants.
- **FR-005**: Example app MUST include demos for blockchain-specific components: AddressDisplay, NetworkIcon, NetworkSelector, NetworkStatusBadge.
- **FR-006**: Example app MUST demonstrate all specialized form fields exported from `@openzeppelin/ui-components/fields`: AddressField, AmountField, ArrayField, ArrayObjectField, BigIntField, BooleanField, BytesField, DateTimeField, EnumField, FileUploadField, MapField, NumberField, ObjectField, PasswordField, RadioField, SelectField, SelectGroupedField, TextAreaField, TextField, UrlField.
- **FR-007**: Example app MUST show LoadingButton states and ExternalLink component usage.
- **FR-008**: Example app MUST display code examples for each demonstrated component.
- **FR-009**: Example app MUST include a Layout category section; Header, Footer, and Sidebar components are demonstrated as part of the app structure (App.tsx) rather than dedicated demos since they are structural page elements.
- **FR-010**: Example app MUST demonstrate DropdownMenu component with various menu item configurations.
- **FR-011**: Example app MUST include Calendar and DateRangePicker component demonstrations.
- **FR-012**: Example app MUST showcase EmptyState and Banner components for common UI patterns.
- **FR-013**: Each component demo MUST show all supported variants and sizes as defined in the component's TypeScript props interface (source of truth: `@openzeppelin/ui-components` package exports).
- **FR-014**: Each component demo MUST include at least one accessibility consideration (labels, ARIA attributes).
- **FR-015**: Example app navigation MUST organize components into logical categories (Inputs, Feedback, Layout, Data Display, Forms).
- **FR-016**: Example app MUST include a working wallet connection demo using the EVM adapter pattern from ui-builder.
- **FR-017**: Example app MUST demonstrate WalletConnectionHeader and WalletConnectionUI components with live wallet state.
- **FR-018**: Example app MUST show usage of derived state hooks (useDerivedAccountStatus, useDerivedChainInfo, useDerivedConnectStatus, useDerivedDisconnect).
- **FR-019**: Example app MUST demonstrate loading states for asynchronous components (wallet connection, network selector) to show proper UX during pending operations. NetworkDemo MUST include explicit loading state demonstration for NetworkSelector.
- **FR-020**: Example app MUST demonstrate ViewContractStateButton component usage within RendererDemo.

### Non-Functional Requirements

- **NFR-001**: Example app MUST maintain responsive layout across mobile (320px), tablet (768px), and desktop (1024px+) viewports.
- **NFR-002**: Example app MUST support keyboard navigation for all interactive demos (Tab, Enter, Escape, Arrow keys).
- **NFR-003**: Example app MUST meet WCAG 2.1 AA accessibility guidelines for color contrast and focus indicators.
- **NFR-004**: Example app bundle size is NOT a constraint (demonstration purposes); however, code splitting SHOULD be used for wallet provider dependencies.
- **NFR-005**: Example app MUST render initial content within 3 seconds on a standard broadband connection.

### Key Entities

- **Component Demo**: A section displaying a single component with variants, states, usage code, and description.
- **Demo Category**: A grouping of related component demos (e.g., "Inputs", "Feedback", "Layout", "Blockchain").
- **Code Example**: A code snippet showing how to import and use a component, displayed alongside the live demo.
- **Navigation Item**: A sidebar entry linking to a component or category demo section.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of public components from `@openzeppelin/ui-components` are demonstrated in the example app.
- **SC-002**: Each component demo includes at least 2 different variants or configurations.
- **SC-003**: Developers can find any component within 2 clicks from the sidebar navigation (category → component), with each component name visible in the navigation without scrolling within its category.
- **SC-004**: All component demos are accessible via keyboard navigation (Tab/Shift+Tab traversal, Enter activation) and include ARIA labels; verified via browser accessibility audit (Lighthouse accessibility score ≥90).
- **SC-005**: Example app maintains responsive behavior across mobile, tablet, and desktop viewports.
- **SC-006**: Each component section includes working code examples that developers can copy and use directly.
- **SC-007**: New developers can successfully integrate at least one component into their own project by copying a code example from the demo and rendering the component without TypeScript or runtime errors.

## Assumptions

- The existing `examples/basic-react-app` will be extended (no new example apps created).
- The example app will use React as the framework (consistent with current implementation).
- Components will be grouped into logical categories to aid navigation.
- Code examples will use modern React patterns (hooks, function components).
- The existing sidebar navigation pattern will be extended to accommodate additional demos.
- Performance is not a primary concern for the example app as it's for demonstration purposes.
- All component variants shown in demos should reflect the actual available variants from the components package.
- Wallet integration will follow the EVM adapter pattern from ui-builder as reference.
