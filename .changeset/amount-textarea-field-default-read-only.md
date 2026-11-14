---
'@openzeppelin/ui-components': patch
---

`AmountField` and `TextAreaField`: with `readOnly` and no `readOnlyMode` (or `readOnlyMode="disabled"`), the field is now disabled, like the other text fields.

Behaviour change: a read-only `AmountField` or `TextAreaField` can no longer be focused or typed into, and its value is left out of the `handleSubmit` data. Before, `AmountField` ignored `readOnly`, so the field stayed editable and its value was submitted. `TextAreaField` stayed editable too, but anything typed was already left out of the submitted data. Use `readOnlyMode="readonly"` for a focusable read-only field that keeps its value. In forms built by the renderer, a read-only `amount` field is now disabled and its value leaves the submitted data, as read-only `text` and `number` fields already do. Fields marked `isHardcoded` keep working: adapters take their value from `hardcodedValue`, not from the submitted data.
