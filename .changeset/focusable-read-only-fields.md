---
'@openzeppelin/ui-components': minor
---

Add an opt-in focusable read-only mode to the text-like fields (`TextField`, `TextAreaField`, `NumberField`, `BigIntField`, `AmountField`, `UrlField`, `PasswordField`, `BytesField`, `AddressField`, `DateTimeField`) and to `SelectField`. Pass `readOnly` with `readOnlyMode="readonly"` and the field stays focusable and in the tab order, blocks every edit, and keeps its value in the `handleSubmit` data. Validation still runs. The default `readOnlyMode="disabled"` keeps today's behaviour. New exported types: `ReadOnlyMode`, `ReadOnlyModeProps`.

- Text-like fields set the native `readonly` attribute and stay selectable. Escape-clear, arrow stepping, blur reformatting and address suggestions are all blocked.
- `SelectField` sets `aria-readonly="true"` and a visually hidden "Read-only" description on its trigger. The list does not open on click, tap, Enter, Space or the arrow keys, typing a letter does not change the value, and a list that is open when the field turns read-only closes. Without `readOnlyMode="readonly"`, `SelectField` still ignores `readOnly`.
- `Input`, `Textarea` and `SelectTrigger` get a read-only look (muted fill, full-contrast text). It applies only when `data-readonly` is set (with `readOnly` on `Input` and `Textarea`), so existing `<Input readOnly>` usages look the same and a disabled trigger still looks disabled.
