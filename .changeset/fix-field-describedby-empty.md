---
'@openzeppelin/ui-components': patch
---

Form fields no longer render an empty or whitespace-only `aria-describedby`. The attribute is omitted unless a helper text or error element exists. When both exist, `aria-describedby` now lists the error before the helper text (it used to list the helper first), so screen readers read the error first. `RadioField` now points `aria-describedby` at its real helper text and error elements; before, it referenced ids that were never rendered.
