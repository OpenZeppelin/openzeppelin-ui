---
"@openzeppelin/ui-styles": minor
"@openzeppelin/ui-components": patch
---

Promote `--primary` to the OpenZeppelin brand blue

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
