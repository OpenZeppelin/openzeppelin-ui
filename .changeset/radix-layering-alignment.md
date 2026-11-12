---
'@openzeppelin/ui-components': patch
---

Raise the Radix dialog, dropdown menu, select, tooltip and toast ranges to the release train of `@radix-ui/react-popover` 1.1.19, so a popover or searchable multi-select opened inside a Dialog keeps focus, closes on its own Escape, and leaves the page interactive after closing. If your lockfile holds older Radix versions, update them together (`pnpm update "@radix-ui/*"`) so they share one copy of the layering internals.

`SelectField` and `SelectGroupedField` now always pass a value to the Radix Select root (`''` when the form value is empty), so the newer select no longer logs "Select is changing from uncontrolled to controlled" on the first pick in an empty field. When the form value is reset to empty after a pick, the trigger now shows the placeholder instead of the previously picked label.
