# @openzeppelin/ui-styles

## 1.2.1

### Patch Changes

- [#263](https://github.com/OpenZeppelin/openzeppelin-ui/pull/263) [`f8662f8`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f8662f811696a3060252304b9e0af29a459b3774) Thanks [@pasevin](https://github.com/pasevin)! - Dark mode: `dark:` classes now apply, and destructive and success text meet WCAG AA contrast. Before, the dark variant in `global.css` never matched, so no `dark:` class took effect.

  Behaviour change: in dark mode, `dark:` utilities now apply on an element with the `dark` class and on everything inside it. This includes the `dark:` classes in your own app if its Tailwind build imports `@openzeppelin/ui-styles/global.css`.
  - Kit components now show their dark styles. `NetworkServiceErrorBanner` has a dark red surface with lighter text and icon instead of a light pink box, the `destructive` and `success` `Alert` borders and the `Progress` track use their dark colours, and invalid `Checkbox`, `Switch` and `Textarea` fields show a stronger red focus ring.
  - `--destructive` is a lighter red in dark (`oklch(0.704 0.191 22.216)`), so destructive text, error messages, required-field asterisks, invalid input borders and destructive `Alert` borders are bright red and readable. This includes your own elements that use this colour. If your own components put white text on `bg-destructive`, add `dark:bg-red-900` (and `dark:hover:bg-red-900/90` for a hover fill) to keep their contrast in dark.
  - The success `Alert` uses a lighter green for its text and icon in dark.
  - The destructive `Button` and the solid danger `Badge` keep their dark red fill. The `NetworkServiceErrorBanner` settings button keeps the same red fill in both themes.
  - If you pass a `className` that sets something the component also sets with a `dark:` class, the component's dark value now wins in dark mode. Examples: a border colour on a `destructive` `Alert`, the background of a destructive `Button` or solid danger `Badge`, or the text colour of a success `Alert`. Add a matching `dark:` class to your override.
  - Upgrade `@openzeppelin/ui-styles` and `@openzeppelin/ui-components` together. With `@openzeppelin/ui-components` 3.13.0 and earlier, the destructive `Button`, the solid danger `Badge` and the `NetworkServiceErrorBanner` settings button turn a lighter red in dark mode, and their white text falls below WCAG AA contrast.

  Light mode is unchanged.

- [#263](https://github.com/OpenZeppelin/openzeppelin-ui/pull/263) [`f8662f8`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f8662f811696a3060252304b9e0af29a459b3774) Thanks [@pasevin](https://github.com/pasevin)! - The light theme now meets WCAG AA contrast for focus rings, muted text, and unchecked checkbox and radio borders.

  Behaviour change: in the light theme, `--ring` and `--muted-foreground` are a darker grey (`oklch(0.53 0 0)`), so focus rings and muted text such as descriptions, helper text and placeholders look darker. This includes your own elements that use these colours. An unchecked `Checkbox` or `RadioGroupItem` (default and card) now draws its border in the muted foreground colour: darker in light, and for `Checkbox` and the default `RadioGroupItem`, lighter in dark. A focused `Checkbox` shows a solid focus ring instead of a faint one. Text inputs, selects, textareas and buttons keep their current borders. Dark theme token values are unchanged.

## 1.2.0

### Minor Changes

- [#242](https://github.com/OpenZeppelin/openzeppelin-ui/pull/242) [`a55b8dc`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/a55b8dcde30a9e02b5da5368925b34cc0da81612) Thanks [@pasevin](https://github.com/pasevin)! - Add `--success-foreground`, `--warning-foreground`, and `--info-foreground` so semantic fills have theme-aware contrast pairs (matching `--destructive-foreground`). Declared in `:root` and `.dark`, exposed in `@theme` / `@theme inline` as `--color-success-foreground`, `--color-warning-foreground`, and `--color-info-foreground` for Tailwind (`text-success-foreground`, `text-warning-foreground`, `text-info-foreground`). Fill tokens `--success` / `--warning` / `--info` are unchanged.

## 1.1.1

### Patch Changes

- [#214](https://github.com/OpenZeppelin/openzeppelin-ui/pull/214) [`ddd681e`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/ddd681eaaeef9fc1e30645e84f1b0e471626979a) Thanks [@pasevin](https://github.com/pasevin)! - Ship the AGPL-3.0 licence text inside each published package.

  The repository has a root `LICENSE`, but npm does not walk up to the repository root
  when packing, and these packages declare narrow `files` arrays (`dist`,
  `README.md`). So every published tarball carried an AGPL-3.0 declaration in its
  `package.json` with no accompanying licence text — confirmed with
  `npm pack --dry-run`, which listed no `LICENSE` entry.

  Each published package now has its own copy, which npm includes automatically.

## 1.1.0

### Minor Changes

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
