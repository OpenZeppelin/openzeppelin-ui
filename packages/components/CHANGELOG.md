# @openzeppelin/ui-components

## 2.0.1

### Patch Changes

- [#120](https://github.com/OpenZeppelin/openzeppelin-ui/pull/120) [`d4b53ba`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/d4b53bab26eef50276b4bac0e9d059b5aee532c0) Thanks [@pasevin](https://github.com/pasevin)! - Promote `--primary` to the OpenZeppelin brand blue

  The `--primary` token was previously set to shadcn's stock near-black
  (`oklch(0.205 0 0)` in light, `oklch(0.985 0 0)` in dark), which never matched
  the OpenZeppelin brand. This changeset promotes `--primary` to the brand blue
  that already backs `--selected`:
  - Light: `oklch(55.43% 0.238 273.87)` (aka `hsl(238, 94%, 65%)`)
  - Dark: `oklch(0.72 0.18 273.87)` — same hue, lifted lightness / reduced chroma
    for readability on dark surfaces

  As a result, every call site that was already semantically "brand action" —
  primary `Button` variants, `ExternalLink`, `Progress` bar fill, brand emphasis
  text, brand pills, icon tiles, the app-wide focus ring — now correctly renders
  in the brand blue. This is the change shadcn's `--primary` was designed to hold
  in the first place (the brand's primary action color); the stock value was
  simply never overridden.

  `--selected` / `--selected-foreground` are kept as distinct, first-class tokens
  but are now declared as CSS variable aliases of `--primary` /
  `--primary-foreground`. This preserves the semantic difference at the call site
  (`selected` communicates "this indicates user selection", `primary`
  communicates "this is the main action / brand surface") while guaranteeing the
  two palettes can never drift visually. Consumers already migrated to
  `bg-selected` / `text-selected` / etc. in prior changesets keep working with no
  code change.

  A small audit was done on every `-primary` call site in the component library
  to catch non-action surfaces that were relying on `--primary` as a cheap
  near-black:
  - `TooltipContent` previously used `bg-primary text-primary-foreground` as an
    inverted "dark pill" pattern (shadcn's convention). That semantic is
    "inverted high-contrast surface", not "brand action", so it is repointed to
    `bg-foreground text-background` and remains a near-black pill in light mode,
    near-white in dark mode, regardless of brand hue.
  - `Header`'s mobile menu toggle had `text-primary` on a decorative hamburger
    icon. That was a neutral icon color, not a brand accent, so it is repointed
    to `text-foreground`. The button's focus ring stays on `ring-primary` —
    brand-blue focus rings are a deliberate design upgrade.

  Every other `-primary` usage (primary `Button`, `Progress`, `ExternalLink`,
  demo icon tiles / hero emphasis / CTA buttons in `basic-react-app`, etc.) is
  semantically a brand-action surface and is kept as-is, now correctly rendering
  in OZ blue. No public API changes.

- [#120](https://github.com/OpenZeppelin/openzeppelin-ui/pull/120) [`d4b53ba`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/d4b53bab26eef50276b4bac0e9d059b5aee532c0) Thanks [@pasevin](https://github.com/pasevin)! - Introduce `--selected` / `--selected-foreground` semantic color tokens for UI selection state

  Adds a new pair of design tokens that express the new designer guideline: "selected" surfaces
  (current wizard step, selected cards, selected rows, selected radio options, active drop zones,
  highlighted autocomplete suggestions, etc.) should use a consistent blue across the product. The
  base value is the OpenZeppelin brand blue `hsl(238, 94%, 65%)`, stored as
  `oklch(55.43% 0.238 273.87)` for consistency with the rest of the palette; the dark-mode variant
  preserves the brand hue (`h = 273.87`) but lifts lightness to `L = 0.72` and trims chroma to
  `C = 0.18` so it stays readable on dark surfaces while remaining recognisably the brand color.
  The tokens are bridged through `@theme inline` so they are consumable from Tailwind as
  `bg-selected`, `text-selected`, `text-selected-foreground`, `border-selected/40`,
  `bg-selected/5`, `ring-selected/30`, etc.

  The following components are refactored to consume the new tokens in place of hard-coded color
  literals or mis-applied semantic tokens:
  - `WizardStepper` — replaces hard-coded `blue-*`, `zinc-*`, `red-*`, `bg-white`, `text-white`
    literals with `selected`, `border`, `muted`, `muted-foreground`, `destructive`, and `card`
    tokens, so the stepper renders correctly in dark mode for the first time.
  - `SidebarButton` — selected state now uses `bg-selected/10 text-selected` instead of the
    hard-coded `bg-neutral-100 text-[#111928]` (which was not theme-aware). Neutral states were also
    migrated from `text-gray-*` literals to `text-muted-foreground` / `text-foreground`.
  - `FileUploadField` — drag-over state and default-hover affordance on the drop zone now use
    `selected` instead of `primary`, matching the "target of a pending selection" semantics.
  - `RadioField` — selected option background, radio circle, inner dot, and focus ring now use
    `selected` instead of `primary`.
  - `AddressField` — keyboard-highlighted and hovered autocomplete suggestions now use
    `bg-selected/10` instead of `bg-accent`, matching the "this is the item you are about to pick"
    semantics of the rest of the design system.

  No public API changes. Purely visual/internal refactor on the components side; the styles package
  gains two new tokens, which is a minor bump.

- [#120](https://github.com/OpenZeppelin/openzeppelin-ui/pull/120) [`d4b53ba`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/d4b53bab26eef50276b4bac0e9d059b5aee532c0) Thanks [@pasevin](https://github.com/pasevin)! - Adopt `--selected` token in form primitives and selection surfaces

  Follow-up to the `--selected` / `--selected-foreground` token introduction. Migrates the remaining
  components whose selection/active semantics were expressed via `primary`, `accent`, or hard-coded
  Tailwind palette literals onto the new `selected` token, so every selection cue in the library
  now shares a single upstream source of truth.
  - `Checkbox`: the `data-[state=checked]` box (background, foreground, and border) switches from
    `primary` to `selected`. Focus-visible ring is left on the existing `ring` token since it is a
    focus affordance, not a selection affordance.
  - `RadioGroup` (primitive): the indicator's `text-primary` — which colors the filled `Circle` via
    `text-current` — switches to `text-selected`.
  - `Tabs`: the active `TabsTrigger`'s label color switches from `text-foreground` to
    `text-selected`, giving the raised pill a subtle selection accent while preserving the existing
    Shadcn pill design.
  - `Calendar`: the selected day, the range-middle bar, and the `day` wrapper cell's
    `[&:has([aria-selected])]` backgrounds switch from `bg-accent`/`bg-zinc-200`/`bg-zinc-700`
    literals to `bg-selected` (solid for the selected day) and `bg-selected/15` /
    `bg-selected/10` (for the range-middle fill and the aria-selected-outside-day fill). The
    `today` highlight is intentionally left on `bg-accent text-accent-foreground` because today is
    a distinct semantic from selection.
  - `DateRangePicker`: inherits all of its day styling from `Calendar`, so the migration flows
    through without any direct change.
  - `NetworkSelector`: the multi-select row's tick box previously rendered an identical
    `border border-primary` square whether checked or not (relying solely on the presence of the
    `Check` glyph as a cue). It now mirrors the updated `Checkbox` primitive:
    `border-selected bg-selected text-selected-foreground` when selected,
    `border-input bg-background` otherwise. The single-select row's trailing `Check` glyph is
    tinted `text-selected` so the selection cue is consistent across the selector.

  No public API changes; purely visual.

## 2.0.0

### Major Changes

- [#113](https://github.com/OpenZeppelin/openzeppelin-ui/pull/113) [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728) Thanks [@pasevin](https://github.com/pasevin)! - Migrate shared UI packages from monolithic adapter APIs to capability-based runtime APIs.

  BREAKING CHANGE: shared component props, helper types, and React context exports now use
  narrow capability interfaces and runtime-oriented names instead of `ContractAdapter` and
  `FullContractAdapter` surfaces.

### Patch Changes

- Updated dependencies [[`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728), [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728), [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728)]:
  - @openzeppelin/ui-types@2.0.0
  - @openzeppelin/ui-utils@2.0.0

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
