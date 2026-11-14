---
'@openzeppelin/ui-components': minor
---

Form fields that take `validation` now honour `validation.messages` and `validation.validate`. Without either, every field validates and words its errors as before.

- A custom message replaces the default text of its rule.
- The custom check runs last, after required, the built-in rules and the field's own validator such as `validateAmount` or `validateSelection`. The first failure's message shows.
- The check never runs on an empty value, so an optional field stays optional. It gets the value as the form stores it: the exact string in `AmountField` exact-entry mode, the id list in `SearchableMultiSelectField`.
- A check that returns anything other than `true` or a non-empty string, or throws, fails with `This field is invalid`.
- `MapField` also runs the check when it refreshes the map's error after a render. Pass a stable function (defined outside the component or memoised), or an inline `validate` arrow runs again on every re-render while the map is valid.
- Kit fields set the native `required` attribute, so a form needs `noValidate` for `messages.required` to show instead of the browser's own prompt.

New exports for custom fields: `getRequiredMessage`, `runCustomCheck`, `getActiveMessages`, `REQUIRED_MESSAGE` and `CUSTOM_CHECK_FALLBACK_MESSAGE`. `validateField` takes an optional third `messages` argument. `getActiveMessages` takes an optional second argument naming the rules a field enforces from its own props.
