---
"@openzeppelin/ui-styles": minor
"@openzeppelin/ui-components": patch
---

Introduce `--selected` / `--selected-foreground` semantic color tokens for UI selection state

Adds a new pair of design tokens that express the new designer guideline: "selected" surfaces
(current wizard step, selected cards, selected rows, etc.) should use a consistent blue across
the product. The tokens are defined for both light and dark themes and are bridged through
`@theme inline` so they are consumable from Tailwind as `bg-selected`, `text-selected`,
`text-selected-foreground`, `border-selected/40`, `bg-selected/5`, `ring-selected/30`, etc.

`WizardStepper` is refactored to consume the new tokens (plus the existing `border`, `muted`,
`muted-foreground`, `destructive`, and `card` tokens) in place of hard-coded Tailwind palette
literals (`blue-*`, `zinc-*`, `red-*`, `bg-white`, `text-white`). This makes the stepper render
correctly in dark mode for the first time, and gives consumers a single upstream source of
truth for selection styling.

No public API changes. Purely visual/internal refactor on the components side; the styles
package gains two new tokens, which is a minor bump.
