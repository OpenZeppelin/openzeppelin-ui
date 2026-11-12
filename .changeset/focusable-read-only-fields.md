---
'@openzeppelin/ui-components': minor
---

Add an opt-in focusable read-only mode to the text-like fields (`TextField`, `TextAreaField`, `NumberField`, `BigIntField`, `AmountField`, `UrlField`, `PasswordField`, `BytesField`, `AddressField`, `DateTimeField`). Pass `readOnly` with `readOnlyMode="readonly"` and the field stays focusable and selectable, sets the native `readonly` attribute, and keeps its value in the `handleSubmit` data. Every edit is blocked, including Escape-clear, arrow stepping, blur reformatting and address suggestions. Validation still runs. The default `readOnlyMode="disabled"` keeps today's behaviour. `Input` and `Textarea` get a read-only look (muted fill, full-contrast text) that applies only with both `readOnly` and `data-readonly`, so existing `<Input readOnly>` usages look the same. New exported types: `ReadOnlyMode`, `ReadOnlyModeProps`.
