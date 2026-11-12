---
'@openzeppelin/ui-components': minor
---

`AmountField`: opt-in exact-entry mode for money values. With `formatOnBlur={false}` the typed text is never rewritten, and the form value is a decimal `string` that never passes through a float. Add `allowGrouping` to accept `,` thousands separators; the form value has them removed. Too many decimals (`decimals`), out-of-range values (`min` / `max`, which also accept strings for bounds beyond float precision) and malformed text are validation errors that block submit. Nothing is rounded. Convert at submit with `parseUnits(value, tokenDecimals)`. The default mode is unchanged. New exported type: `AmountFieldExactProps`. `AmountField` now takes `AmountFieldProps | AmountFieldExactProps`, so a type derived with `ComponentProps<typeof AmountField>` sees `min` / `max` as `number | string`.
