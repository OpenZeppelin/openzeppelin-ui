# @openzeppelin/ui-styles

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
