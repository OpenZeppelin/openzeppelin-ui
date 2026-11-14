---
'@openzeppelin/ui-components': minor
---

Add an optional `showValidState` prop to the fields that show a green success border once touched without an error (`TextField`, `TextAreaField`, `PasswordField`, `UrlField`, `NumberField`, `AmountField`, `BigIntField`, `BooleanField`, `EnumField`, `AddressField`, `BytesField` and `DateTimeField`). Set it to `false` to keep the field neutral instead, so a touched, empty optional field no longer looks "valid". The error border and message still show when a rule fails. Omitted or `true`, fields look as before. `getValidationStateClasses` takes the same option as an optional third argument. New exported type: `ValidStateProps`.
