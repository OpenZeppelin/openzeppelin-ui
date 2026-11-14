# Changelog — AmountField

The release notes come from `.changeset/amount-field-exact-entry.md` (minor bump of
`@openzeppelin/ui-components`). This file holds the longer version. Do not add a second
changeset from docs.

## Unreleased (targets the next `@openzeppelin/ui-components` minor)

### Added

- **Exact-entry mode** on `AmountField`, selected with `formatOnBlur={false}`. The typed
  text is never rewritten: no keystroke filter, no formatting on blur. The form value is
  a decimal `string` with grouping commas removed, and it never passes through a float.
- `allowGrouping` (exact mode only): accepts `,` between groups of three digits in the
  integer part. The first group must not start with `0`. The decimal point is always `.`.
- Exact-mode validation, in a fixed order: empty/required, value type, grammar (one
  message per cause), `decimals` limit, inclusive `min`/`max`, then `validateAmount`.
  Too many decimals and out-of-range amounts are errors that block submit, never
  roundings. A misconfigured `decimals`, `min` or `max` fails every non-empty value.
- `min` / `max` accept strings in exact mode, compared exactly digit by digit, so bounds
  beyond 2^53 stay exact.
- Exported type `AmountFieldExactProps`.

### Changed

- `AmountField` now takes `AmountFieldProps | AmountFieldExactProps`. JSX callers and
  `interface X extends AmountFieldProps` compile unchanged. A type derived with
  `ComponentProps<typeof AmountField>` is now that union, so its `min` / `max` read as
  `number | string`. Narrow it, or use `AmountFieldProps['min']`.

### Unchanged

- Default mode (no `formatOnBlur`, or `true`): same input filter, same
  `parseFloat(...).toFixed(decimals)` on blur, same arrow-key stepping, same Escape to
  `null`, same validation (including `validateAmount` returning `false` passing). Its
  known float artefact is kept: with `decimals={18}`, `0.1` becomes
  `0.100000000000000006` on blur.
- `@openzeppelin/ui-renderer`: its `amount` field type still renders default mode.
- No new dependencies.

### Migration Guide

None required. To move a field to exact mode, follow Pattern 4 in the
[integration guide](./integration-guide.md#pattern-4-moving-an-existing-default-mode-field-to-exact-mode).
