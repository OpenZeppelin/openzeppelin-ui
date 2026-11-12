---
'@openzeppelin/ui-components': patch
---

`AmountField`: with `readOnly` and no `readOnlyMode` (or `readOnlyMode="disabled"`), the field is now disabled, like the other text fields. Behaviour change: a read-only `AmountField` can no longer be focused or typed into, and its value is left out of the submitted data. Before, `readOnly` was ignored unless `readOnlyMode="readonly"` was set, so the field stayed editable. Use `readOnlyMode="readonly"` for a focusable read-only amount that keeps its value.
