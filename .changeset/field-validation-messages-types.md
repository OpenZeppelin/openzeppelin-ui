---
'@openzeppelin/ui-types': minor
---

`FieldValidation` has two new optional members. New exported types: `FieldValidationMessages` and `FieldValidationCheck`. The existing members keep their types.

- `messages` sets custom error text for the built-in rules (`required`, `min`, `max`, `minLength`, `maxLength`, `pattern`). A message shows only when its rule is set on the same `validation` and fails.
- `validate` is a synchronous custom check. It runs after the built-in rules, only for non-empty values, and returns `true` to pass or the error message to show.
