---
'@openzeppelin/ui-components': patch
---

`SelectField` and `SelectGroupedField` now pass the React Hook Form ref to their trigger. Submitting a form whose first invalid field is a select focuses that select, and `setFocus(name)` works for it.
