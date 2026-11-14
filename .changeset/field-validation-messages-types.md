---
'@openzeppelin/ui-types': minor
---

`FieldValidation` has two new optional members. New exported types: `FieldValidationMessages` and `FieldValidationCheck`. The existing members keep their types.

- `messages` sets custom error text for the built-in rules (`required`, `min`, `max`, `minLength`, `maxLength`, `pattern`), and for two rules a field enforces from its own props: `format` (text that can't be read as a value) and `decimals` (too many decimal places). A message shows only when the field enforces its rule and that rule fails. For the six built-in keys that means the rule is set on the same `validation`; `format`, `decimals`, and `min` / `max` in `AmountField` exact-entry mode follow the field's own props instead. Fields that don't enforce a rule ignore its message.
- `validate` is a synchronous custom check. It runs after the built-in rules, only for non-empty values, and returns `true` to pass or the error message to show.
