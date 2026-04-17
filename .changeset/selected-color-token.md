---
"@openzeppelin/ui-styles": minor
"@openzeppelin/ui-components": patch
---

Introduce `--selected` / `--selected-foreground` semantic color tokens for UI selection state

Adds a new pair of design tokens that express the new designer guideline: "selected" surfaces
(current wizard step, selected cards, selected rows, selected radio options, active drop zones,
highlighted autocomplete suggestions, etc.) should use a consistent blue across the product. The
tokens are defined for both light and dark themes and are bridged through `@theme inline` so they
are consumable from Tailwind as `bg-selected`, `text-selected`, `text-selected-foreground`,
`border-selected/40`, `bg-selected/5`, `ring-selected/30`, etc.

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
