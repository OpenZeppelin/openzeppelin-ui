---
'@openzeppelin/ui-components': patch
---

`TextAreaField`: with `readOnly` and no `readOnlyMode` (or `readOnlyMode="disabled"`), the textarea is now disabled, like the other text fields. Behaviour change: a read-only `TextAreaField` can no longer be focused or typed into. Before, it stayed editable, but anything typed was left out of the submitted data. Use `readOnlyMode="readonly"` for a focusable read-only textarea that keeps its value.
