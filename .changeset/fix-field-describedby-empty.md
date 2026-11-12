---
'@openzeppelin/ui-components': patch
---

Form fields no longer render an empty or whitespace-only `aria-describedby`. The attribute is omitted unless a helper text or error element exists. `RadioField` now points `aria-describedby` at its real helper text and error elements; before, it referenced ids that were never rendered.
