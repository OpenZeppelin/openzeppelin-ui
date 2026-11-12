---
'@openzeppelin/ui-components': patch
---

`SelectField` now passes the React Hook Form ref to its trigger. Submitting a form whose first invalid field is a select focuses that select, and `setFocus(name)` works for it.
