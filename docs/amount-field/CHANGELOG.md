# Changelog — AmountField

The release notes come from `.changeset/amount-field-exact-entry.md` (minor bump of
`@openzeppelin/ui-components`). This file holds the longer version. Do not add a second
changeset from docs.

The default-mode formatting fix below has its own patch changeset,
`.changeset/amount-field-exact-default-formatting.md`, and so does the `readOnly` fix,
`.changeset/amount-textarea-field-default-read-only.md`.

## Unreleased (patch): `readOnly` disables the field

### Changed

- With `readOnly` and the default `readOnlyMode="disabled"`, `AmountField` is now
  disabled, like the other text fields: it can't be focused or typed into, and its value
  is left out of the `handleSubmit` data. Before, `AmountField` ignored `readOnly`, so the
  field stayed editable and its value was submitted. Use `readOnlyMode="readonly"` for a
  focusable read-only amount that keeps its value.

## Unreleased (patch): exact formatting in default mode

### Changed

- Default mode (`formatOnBlur` omitted or `true`) now formats on blur and on the arrow
  keys with exact decimal arithmetic, not `parseFloat(...).toFixed(decimals)`. Every typed
  digit is kept, and the fraction is padded, or rounded half away from zero, to
  `decimals`.

  | Typed, then blur       | `decimals` | Before                  | Now                     |
  | ---------------------- | ---------- | ----------------------- | ----------------------- |
  | `0.1`                  | 18         | `0.100000000000000006`  | `0.100000000000000000`  |
  | `1.005`                | 2          | `1.00`                  | `1.01`                  |
  | `123456789012345678.5` | 2          | `123456789012345680.00` | `123456789012345678.50` |
  | `-0.001`               | 2          | `-0.00`                 | `0.00`                  |

- Arrow-key steps are exact: `0.1` plus a `step` of `0.01` at 18 decimals gives
  `0.110000000000000000`.
- Text written into the field from outside that is not a plain decimal (`1,000`, `12abc`,
  `1e3`) is no longer rewritten on blur or stepped by the arrow keys. Validation still
  runs on it as before.
- A `step` that is `NaN` or infinite makes the arrow keys write nothing (before, they
  wrote `NaN`). A `min` or `max` that is `NaN` or infinite is ignored when clamping.
- A `decimals` that is not a whole number from 0 to 100 leaves the text unformatted (before,
  it was coerced, or blur threw and the field was not marked as touched).

### Unchanged

- Props, types and exports. The keystroke filter, Escape, and default-mode validation
  (which still reads the value with `parseFloat`).
- Exact-entry mode.
- `@openzeppelin/ui-renderer`'s `amount` field shows the exact text, but its submit
  transform still converts with `Number()`
  ([#262](https://github.com/OpenZeppelin/openzeppelin-ui/issues/262)).

### Migration Guide

No code change. If your own tests pin the old float output (`0.100000000000000006`,
`1.00` for `1.005`, `-0.00`, exponent strings for large integers), update them to the new
text.

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
- `groupedDisplay` (exact mode, with `allowGrouping`): the field shows the value with `,`
  thousands groups while it is not focused (`250,000.00`) and plain while it is being
  edited (`250000.00`). Display only: the form value stays the plain string, and focus and
  blur never write it. Off by default, so an exact field without the prop is unchanged.
  On that grouped input, `restrictInput` refuses inserts that break the amount grammar or
  exceed `decimals` (deletes always apply), and `padDecimals` pads the unfocused display
  to `decimals` places; both default off.
  - A correctly grouped string from `defaultValues`, `reset` or `setValue` is accepted on
    an editable field and stored plain right away. That write marks the form dirty, so
    seed plain strings to stay pristine.
  - A read-only or disabled field stays grouped on focus and is never written. Seed
    read-only amounts plain: a grouped string there blocks submit.
  - Known limits (a second writer in the same render, `reset` followed by an immediate
    submit, the approximate first mouse click) are listed in the
    [API reference](./api-reference.md#known-limits).
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
  `0.100000000000000006` on blur. The patch entry above replaces this float formatting.
- `@openzeppelin/ui-renderer`: its `amount` field type still renders default mode.
- No new dependencies.

### Migration Guide

None required. To move a field to exact mode, follow Pattern 4 in the
[integration guide](./integration-guide.md#pattern-4-moving-an-existing-default-mode-field-to-exact-mode).
