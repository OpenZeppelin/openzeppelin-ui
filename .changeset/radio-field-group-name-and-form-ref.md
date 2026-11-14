---
'@openzeppelin/ui-components': patch
---

`RadioField` now names its radio group after the field label, in both variants, so screen readers announce the question before the options. It also passes the React Hook Form ref to a radio: the checked one, or the first enabled one when none is checked. Submitting a form whose first invalid field is a radio field focuses it, and `setFocus(name)` works for it.
