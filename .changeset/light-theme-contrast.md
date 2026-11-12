---
'@openzeppelin/ui-styles': patch
'@openzeppelin/ui-components': patch
---

The light theme now meets WCAG AA contrast for focus rings, muted text, and unchecked checkbox and radio borders.

Behaviour change: in the light theme, `--ring` and `--muted-foreground` are a darker grey (`oklch(0.53 0 0)`), so focus rings and muted text such as descriptions, helper text and placeholders look darker. This includes your own elements that use these colours. An unchecked `Checkbox` or `RadioGroupItem` (default and card) now draws its border in the muted foreground colour: darker in light, and for `Checkbox` and the default `RadioGroupItem`, lighter in dark. A focused `Checkbox` shows a solid focus ring instead of a faint one. Text inputs, selects, textareas and buttons keep their current borders. Dark theme token values are unchanged.
