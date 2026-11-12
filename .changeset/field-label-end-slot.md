---
'@openzeppelin/ui-components': minor
---

Add an optional `labelEnd` slot to the label row of the field family (`TextField`, `TextAreaField`, `NumberField`, `BigIntField`, `AmountField`, `UrlField`, `PasswordField`, `BytesField`, `AddressField`, `DateTimeField`, `SelectField`, `SelectGroupedField`, `SearchableMultiSelectField`, `RadioField` and `BaseField`). Pass an "Optional" chip or a small action such as "Address book" and it renders at the end of the label row. It sits beside the label, not inside it, so the control's accessible name stays the label text and clicking the label still focuses the input. Without `labelEnd` the markup is unchanged. New exported type: `LabelEndProps`.
