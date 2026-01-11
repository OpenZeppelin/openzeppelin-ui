---
"@openzeppelin/ui-components": patch
---

fix(Card, Accordion): remove default shadows and improve section spacing

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
