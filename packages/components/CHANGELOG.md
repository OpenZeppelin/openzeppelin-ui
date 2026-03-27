# @openzeppelin/ui-components

## 1.7.0

### Minor Changes

- [#96](https://github.com/OpenZeppelin/openzeppelin-ui/pull/96) [`b7f6eb5`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b7f6eb5d8c1c0a0090f8cc22370c1c397435d71a) Thanks [@pasevin](https://github.com/pasevin)! - Add VERSION export to all public packages for runtime peer compatibility validation. Each package now exports a `VERSION` constant that reflects the package version at build time, enabling consuming libraries (such as adapters) to verify compatible versions are installed and throw actionable errors on mismatch.

### Patch Changes

- Updated dependencies [[`b7f6eb5`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b7f6eb5d8c1c0a0090f8cc22370c1c397435d71a)]:
  - @openzeppelin/ui-types@1.12.0
  - @openzeppelin/ui-utils@1.4.0

## 1.6.0

### Minor Changes

- [#95](https://github.com/OpenZeppelin/openzeppelin-ui/pull/95) [`71a64bd`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/71a64bd439073fa814299e466d38f3ce42c05412) Thanks [@pasevin](https://github.com/pasevin)! - Add `showTooltip`, `variant`, and `untruncateOnHover` props to AddressDisplay
  - `showTooltip` shows the full address in a tooltip on hover when truncated.
  - `variant` accepts `"chip"` (default) or `"inline"` for use inside existing
    styled containers like wallet bars.
  - `untruncateOnHover` reveals the full address inline on hover (desktop) or
    tap (touch devices).
  - Fix TooltipContent to render inside a Portal, preventing layout shifts.

## 1.5.0

### Minor Changes

- [#89](https://github.com/OpenZeppelin/openzeppelin-ui/pull/89) [`120474f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/120474f4e1c262db8246d0d4ac16ad91b6649a3a) Thanks [@pasevin](https://github.com/pasevin)! - Add Wizard components (WizardStepper, WizardNavigation, WizardLayout) with vertical, horizontal, and scrollable layout variants

### Patch Changes

- [#88](https://github.com/OpenZeppelin/openzeppelin-ui/pull/88) [`bedb0f0`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/bedb0f0b7eaf93ee2d7b1a77f9c8ef39dd5edf65) Thanks [@pasevin](https://github.com/pasevin)! - SidebarButton: badge now wraps gracefully to a new line when it doesn't fit alongside the label. Fixed height replaced with min-height so the button grows naturally.

## 1.4.0

### Minor Changes

- [#76](https://github.com/OpenZeppelin/openzeppelin-ui/pull/76) [`0c32886`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0c328867950dc15282e31ed59c9fb0e1ad886ff9) Thanks [@pasevin](https://github.com/pasevin)! - Enhance `AddressDisplay` label rendering to use a two-line stacked layout when a label is present. The label renders prominently on the first line with the address in a smaller font below, keeping the component compact while improving information hierarchy.

- [#76](https://github.com/OpenZeppelin/openzeppelin-ui/pull/76) [`0c32886`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0c328867950dc15282e31ed59c9fb0e1ad886ff9) Thanks [@pasevin](https://github.com/pasevin)! - Add `AddressLabelContext`, `AddressLabelProvider`, and `useAddressLabel` for context-based address label resolution. Enhance `AddressDisplay` with optional `label` and `onLabelEdit` props that fall back to the context when not provided. When a provider is mounted, all `AddressDisplay` instances in the subtree automatically resolve and render labels with zero call-site changes.

- [#76](https://github.com/OpenZeppelin/openzeppelin-ui/pull/76) [`4a2ba22`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/4a2ba22b7df523c6ef7de52786ae0c1656da4746) Thanks [@pasevin](https://github.com/pasevin)! - Add `AddressSuggestionProvider`, `useAddressSuggestions`, and `AddressSuggestionContext` for context-based address autocomplete. Enhance `AddressField` with built-in suggestion dropdown that reads from context by default, with optional `suggestions` prop override and `suggestions={false}` opt-out. Includes debouncing, keyboard navigation, and ARIA listbox semantics.

- [#76](https://github.com/OpenZeppelin/openzeppelin-ui/pull/76) [`58a7136`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/58a7136dfee6f7b0a3d201a4b4c216ef08c2d7f0) Thanks [@pasevin](https://github.com/pasevin)! - Add multi-select mode to `NetworkSelector` via discriminated union props. When `multiple={true}`, the dropdown renders checkboxes, stays open on selection, and supports a `renderTrigger` prop for custom trigger elements. Existing single-select usage is unchanged.

- [#76](https://github.com/OpenZeppelin/openzeppelin-ui/pull/76) [`58a7136`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/58a7136dfee6f7b0a3d201a4b4c216ef08c2d7f0) Thanks [@pasevin](https://github.com/pasevin)! - Add `OverflowMenu` component — a reusable compact "..." dropdown for secondary actions. Accepts typed `OverflowMenuItem[]` with support for icons, destructive styling, and disabled state.

### Patch Changes

- Updated dependencies [[`c3cc7d1`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c3cc7d1f5fa2a2c1663f0c54449f51f321d78919), [`c3cc7d1`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c3cc7d1f5fa2a2c1663f0c54449f51f321d78919), [`c3cc7d1`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c3cc7d1f5fa2a2c1663f0c54449f51f321d78919)]:
  - @openzeppelin/ui-types@1.11.0

## 1.3.0

### Minor Changes

- [#70](https://github.com/OpenZeppelin/openzeppelin-ui/pull/70) [`fb078c4`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fb078c4e213d903249c91bcd4918f26b6b91d3cf) Thanks [@pasevin](https://github.com/pasevin)! - Add EcosystemDropdown and EcosystemIcon components
  - `EcosystemDropdown`: reusable dropdown for ecosystem selection with icon render prop
  - `EcosystemIcon`: renders adapter-provided icon component with fallback

### Patch Changes

- Updated dependencies [[`fb781d4`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fb781d4df95365b2ef184c893d6b39b38a2bc20e)]:
  - @openzeppelin/ui-types@1.9.0

## 1.2.1

### Patch Changes

- [#57](https://github.com/OpenZeppelin/openzeppelin-ui/pull/57) [`b62aab7`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b62aab793843d25797717feba6b9a0630df9ebac) Thanks [@pasevin](https://github.com/pasevin)! - Add exactBytes validation for fixed-size bytes types (bytes32, bytes4, etc.) to properly validate exact byte length requirements

- Updated dependencies [[`b62aab7`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b62aab793843d25797717feba6b9a0630df9ebac)]:
  - @openzeppelin/ui-utils@1.2.1

## 1.2.0

### Minor Changes

- [#48](https://github.com/OpenZeppelin/openzeppelin-ui/pull/48) [`0cb85e7`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0cb85e720dbd8bbac660227d1213acad4247ff92) Thanks [@pasevin](https://github.com/pasevin)! - Added NetworkServiceErrorBanner component for displaying network service connection errors with a call-to-action to configure alternative endpoints

### Patch Changes

- Updated dependencies [[`0cb85e7`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0cb85e720dbd8bbac660227d1213acad4247ff92), [`0cb85e7`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0cb85e720dbd8bbac660227d1213acad4247ff92)]:
  - @openzeppelin/ui-types@1.5.0
  - @openzeppelin/ui-utils@1.2.0

## 1.1.0

### Minor Changes

- [#35](https://github.com/OpenZeppelin/openzeppelin-ui/pull/35) [`5bed777`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/5bed77773ee815c9e7efc47005a2f091f2033b23) Thanks [@pasevin](https://github.com/pasevin)! - Add `SidebarGroup` component for collapsible navigation groups in sidebars. This new component uses `@radix-ui/react-collapsible` under the hood and supports both controlled and uncontrolled modes via `open`/`defaultOpen` props.

## 1.0.4

### Patch Changes

- [#17](https://github.com/OpenZeppelin/openzeppelin-ui/pull/17) [`c6fc89e`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c6fc89e7254f48b6f27e4b7d1f897022251c9e9d) Thanks [@pasevin](https://github.com/pasevin)! - fix(Card, Accordion): remove default shadows and improve section spacing

  Card changes:
  - Remove default `shadow-sm` from Card, matching actual usage patterns where `shadow-none` was consistently applied
  - Move vertical padding from Card container to individual sections for better flexibility:
    - CardHeader: `pt-6` (provides top padding for the card)
    - CardContent: `pt-4 pb-6` (gap from header + bottom padding)
    - CardFooter: `pt-4 pb-6` (gap from content + bottom padding)
  - This allows consumers to override Card's styling without breaking internal spacing

  Accordion changes:
  - Remove default `shadow-sm` from Accordion card variant for visual consistency

  Consumers who want a shadow can add `shadow-sm` via className. Spacing can be overridden with `pt-0`, `pb-0`, or custom padding classes.

## 1.0.3

### Patch Changes

- [#15](https://github.com/OpenZeppelin/openzeppelin-ui/pull/15) [`f5769f4`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f5769f40b77d2ac68da9a52a84f1eb52b7ea8f9e) Thanks [@pasevin](https://github.com/pasevin)! - fix(Card): remove default shadow and add section spacing
  - Remove default `shadow-sm` from Card, matching actual usage patterns where `shadow-none` was consistently applied
  - Add default `pt-4` spacing to CardContent (space between header and content)
  - Add default `pt-4` spacing to CardFooter (space between content and footer)

  Consumers who want a shadow can add `shadow-sm` via className. Spacing can be overridden with `pt-0` or custom padding classes.

## 1.0.2

### Patch Changes

- [#12](https://github.com/OpenZeppelin/openzeppelin-ui/pull/12) [`6e2e802`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/6e2e80226bfa421d88c9b7ed1cfcbee3fc1d01b7) Thanks [@pasevin](https://github.com/pasevin)! - Fix Calendar navigation buttons floating outside container by adding `position: relative` to the root element

- Updated dependencies [[`779a5fb`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/779a5fb82ae2611fb571f8015dae7a29177c4100)]:
  - @openzeppelin/ui-types@1.1.0

## 1.0.1

### Patch Changes

- [#1](https://github.com/OpenZeppelin/openzeppelin-ui/pull/1) [`8b96075`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/8b9607524611e5cf3b1b0a968460ece8c2aa5bd1) Thanks [@pasevin](https://github.com/pasevin)! - Separate CodeEditorField into dedicated entry point to prevent CSS import issues in test environments.

  **Breaking Change for CodeEditorField users:**

  The `CodeEditorField` component is no longer exported from the main package entry point. Import it from the new dedicated entry point:

  ```typescript
  // Before
  import { CodeEditorField } from '@openzeppelin/ui-components';

  // After
  import { CodeEditorField } from '@openzeppelin/ui-components/code-editor';
  ```

  This change prevents the `@uiw/react-textarea-code-editor` CSS import from causing "Unknown file extension .css" errors in Node.js test environments.
