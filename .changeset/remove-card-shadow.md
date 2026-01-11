---
"@openzeppelin/ui-components": patch
---

fix(Card): remove default shadow and add section spacing

- Remove default `shadow-sm` from Card, matching actual usage patterns where `shadow-none` was consistently applied
- Add default `pt-4` spacing to CardContent (space between header and content)
- Add default `pt-4` spacing to CardFooter (space between content and footer)

Consumers who want a shadow can add `shadow-sm` via className. Spacing can be overridden with `pt-0` or custom padding classes.
