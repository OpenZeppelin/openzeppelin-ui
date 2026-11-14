# AmountField — API Reference

Everything here is exported from the main entry:

```ts
import {
  AmountField,
  type AmountFieldExactProps,
  type AmountFieldProps,
} from '@openzeppelin/ui-components';
```

The grammar, validation and comparison helpers behind exact mode are internal. They are
not exported, and the rules they implement are written out below.

## `AmountField`

```ts
function AmountField<TFieldValues extends FieldValues = FieldValues>(
  props: AmountFieldProps<TFieldValues> | AmountFieldExactProps<TFieldValues>
): React.ReactElement;
```

A `react-hook-form` amount input with a label, an optional currency/token symbol, helper
text and an error message. It renders a `<input type="text" inputMode="decimal">` inside
a `Controller` and registers its own `rules.validate`. It is synchronous and returns an
element. Nothing about it is async.

The mode is chosen by `formatOnBlur`, strictly: only the literal `false` selects exact
mode. Omitted, `undefined`, `true`, and any value that gets past the types (`0`, `null`,
`'false'`) all select default mode. The input and the validation rule always come from
the same mode.

### Shared props

Both modes take these. They come from `BaseFieldProps`, `ReadOnlyModeProps` and
`LabelEndProps`, plus three amount props.

| Prop             | Type                          | Default      | Notes                                                                                                                                               |
| ---------------- | ----------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`             | `string`                      | required     | Input id. The helper text is `${id}-description` and the error is `${id}-error`.                                                                    |
| `name`           | `FieldPath<TFieldValues>`     | required     | Form field name.                                                                                                                                    |
| `control`        | `Control<TFieldValues>`       | required     | From `useForm()`.                                                                                                                                   |
| `label`          | `string`                      | required     | Visible label. An empty string renders no label row.                                                                                                |
| `placeholder`    | `string`                      | —            |                                                                                                                                                     |
| `helperText`     | `string`                      | —            | Rendered below the input and linked through `aria-describedby`. In exact mode, say which separators the field uses.                                 |
| `width`          | `'full' \| 'half' \| 'third'` | `'full'`     |                                                                                                                                                     |
| `validation`     | `FieldValidation`             | —            | Only `validation.required` is read. It adds the label asterisk and the "required" check.                                                            |
| `decimals`       | `number`                      | `2`          | Default mode: places the value is formatted to on blur. Exact mode: the most fraction digits allowed (see [Decimals](#decimals)).                   |
| `symbol`         | `string`                      | `''`         | Shown inside the input. Not part of the value.                                                                                                      |
| `symbolPosition` | `'prefix' \| 'suffix'`        | `'suffix'`   |                                                                                                                                                     |
| `readOnly`       | `boolean`                     | `false`      | Ignored by `AmountField` unless `readOnlyMode="readonly"` is also set.                                                                              |
| `readOnlyMode`   | `'disabled' \| 'readonly'`    | `'disabled'` | With `readOnly`, `'readonly'` keeps the input focusable, ignores edits and Escape, and keeps the value in `handleSubmit` data. Works in both modes. |
| `labelEnd`       | `ReactNode`                   | —            | Content at the end of the label row (an "Optional" chip, a small action). Shown only when there is a `label`.                                       |

### `AmountFieldProps` — default mode

```ts
interface AmountFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends AmountFieldCommonProps<TFieldValues> {
  formatOnBlur?: true;
  allowGrouping?: false;
  min?: number;
  max?: number;
  step?: number;
  validateAmount?: (value: number) => boolean | string;
}
```

Unchanged behaviour. Still an `interface` under its old name, so
`interface MyProps extends AmountFieldProps` compiles as before.

| Prop             | Type                                   | Notes                                                                                                 |
| ---------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `formatOnBlur`   | `true` (optional)                      | Omit or pass `true`.                                                                                  |
| `allowGrouping`  | `false` (optional)                     | Grouping exists only in exact mode.                                                                   |
| `min`, `max`     | `number`                               | Inclusive, compared as floats.                                                                        |
| `step`           | `number`, default `0.01`               | ArrowUp / ArrowDown step, in floats.                                                                  |
| `validateAmount` | `(value: number) => boolean \| string` | Receives `parseFloat` of the value. A returned string is the error. `true` **and `false`** both pass. |

Behaviour: keystrokes outside `^-?\d*\.?\d*$` are dropped. On blur a non-empty value is
written back as `parseFloat(value).toFixed(decimals)`. Escape writes `null` when the
field has a value and blurs when it is empty. The form value is a `string` after any
edit, or `null` after Escape.

### `AmountFieldExactProps` — exact-entry mode

```ts
interface AmountFieldExactProps<TFieldValues extends FieldValues = FieldValues>
  extends AmountFieldCommonProps<TFieldValues> {
  formatOnBlur: false;
  allowGrouping?: boolean;
  min?: number | string;
  max?: number | string;
  step?: never;
  validateAmount?: (value: string) => boolean | string;
}
```

| Prop             | Type                                   | Default | Notes                                                                                                                                           |
| ---------------- | -------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `formatOnBlur`   | `false`                                | —       | Required to select this mode.                                                                                                                   |
| `allowGrouping`  | `boolean`                              | `false` | Accept `,` thousands grouping. See [Grammar](#grammar).                                                                                         |
| `min`, `max`     | `number \| string`                     | —       | Inclusive. Compared exactly on decimal strings. A string must be a plain decimal (no commas). See [Bounds](#bounds).                            |
| `step`           | `never`                                | —       | Arrow-key stepping is off. ArrowUp / ArrowDown move the caret.                                                                                  |
| `validateAmount` | `(value: string) => boolean \| string` | —       | Called last, with the comma-free value, only when every built-in check passed. Only `true` passes. See [Custom validation](#custom-validation). |

#### Type-level rules

These are compile errors:

```tsx
<AmountField {...base} allowGrouping />                         // grouping needs formatOnBlur={false}
<AmountField {...base} min="0" />                               // string bounds need exact mode
<AmountField {...base} formatOnBlur={false} step={1} />         // no stepping in exact mode
<AmountField {...base} formatOnBlur={false}
  validateAmount={(n: number) => n > 0} />                      // exact validator takes a string
<AmountField {...base} formatOnBlur="false" />                  // must be the boolean false
```

A plain `boolean` variable passed to `formatOnBlur` compiles only when no mode-specific
prop is set.

**`ComponentProps<typeof AmountField>` is now a union**
(`AmountFieldProps | AmountFieldExactProps`). If you derive prop types from the
component, `min` and `max` read as `number | string`, and `validateAmount` is a union of
a `number` validator and a `string` validator. JSX callers and
`extends AmountFieldProps` are unaffected. Code that reads
`ComponentProps<typeof AmountField>['min']` as a `number` needs a narrowing or should
use `AmountFieldProps['min']` directly.

## Exact mode in detail

### Display text

The input shows exactly what the user produced: every keystroke, paste, IME commit or
autofill is kept whole. Nothing is filtered on input, and nothing is formatted, trimmed
or padded on blur. An error message appearing, a failed submit or a re-render does not
change the text either.

The text changes only when:

- the user edits it,
- the user presses Escape on a non-empty field (it becomes empty), or
- a value is written from outside: `defaultValues`, `reset()`, `setValue()`, or a
  change of `name`. The new text is built from that value in the same render, so the
  old text is never shown with the new value.

### Form value

| When                                   | Form value                       |
| -------------------------------------- | -------------------------------- |
| Text is empty                          | `''` (never `null`)              |
| Text is valid                          | Text with every `,` removed      |
| Text is invalid                        | The raw text, unchanged **(a)**  |
| Seeded with a `number`, not yet edited | That `number`, unchanged **(c)** |
| Seeded with a `bigint`, not yet edited | That `bigint`, unchanged **(c)** |

The field writes the form value only on a user edit (once per edit) and on Escape. It
never writes on mount, focus, blur, re-render, remount, a mode change, or when it adopts
an outside value. Mounting does not mark the form dirty.

### Grammar

The plain grammar is always accepted:

```
^-?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)$
```

That is: an optional leading `-`, ASCII digits, at most one `.`, and at least one digit
somewhere. `0`, `007`, `.5`, `5.`, `-0` and `-12.30` are all valid and kept as typed.
This is viem's `parseUnits` grammar minus the four digitless strings `''`, `-`, `.` and
`-.`, which viem reads as zero and this field rejects (`''` is "empty", the others are
"incomplete").

With `allowGrouping`, this grouped grammar is also accepted:

```
^-?[1-9][0-9]{0,2}(?:,[0-9]{3})+(?:\.[0-9]*)?$
```

- `,` only in the integer part, between groups of exactly three digits.
- The first group has one to three digits and does not start with `0`. So `0,123` is
  rejected, not read as `123`.
- Ungrouped text is still valid with grouping on (`1234567`). Mixed forms (`1234,567`)
  are not.
- The decimal point is always `.`. Locale separators (`1.234,56`, spaces, `'`) are not
  supported.

Whitespace, `+`, exponents, letters and non-ASCII digits are never valid in either mode.

### Validation order and messages

Validation runs as `rules.validate`, so it follows your `useForm` `mode`. The first
failing step wins:

| Step | Check                                          | Message                                                               |
| ---- | ---------------------------------------------- | --------------------------------------------------------------------- |
| 1    | Empty (`''`, `null`, `undefined`)              | `This field is required` when `validation.required`, otherwise passes |
| 2    | Value is not a string, finite number or bigint | `Enter a valid amount`                                                |
| 3    | Grammar, by cause:                             |                                                                       |
|      | — `-`, `.`, `-.`                               | `Please enter a complete number`                                      |
|      | — a number-shaped text with one `e`/`E`        | `Scientific notation is not supported`                                |
|      | — more than one `.`                            | `Only one decimal point is allowed`                                   |
|      | — `,` without `allowGrouping`                  | `Grouping separators (,) are not allowed`                             |
|      | — `,` with `allowGrouping`, bad groups         | `Use , only between groups of three digits, e.g. 1,234,567.89`        |
|      | — validly grouped text written from outside    | `Remove the , separators from this value`                             |
|      | — anything else                                | `Enter digits, an optional leading - and one . for decimals`          |
| 4    | `decimals` misconfigured                       | `Amount limit is misconfigured`                                       |
|      | Too many fraction digits                       | `Use at most {decimals} decimal places`                               |
| 5    | `min` / `max` misconfigured                    | `Amount limit is misconfigured`                                       |
|      | Below `min` / above `max`                      | `Value must be at least {min}` / `Value must be at most {max}`        |
| 6    | `validateAmount`                               | Your message, or `Enter a valid amount`                               |

Malformed text never reads as "required". Errors are shown once the field is touched, as
in default mode. They render through the kit's `ErrorMessage` with `role="alert"`, and
the input carries `aria-invalid` and `aria-errormessage` / `aria-describedby` pointing at
it.

A grouped string written from outside (for example `setValue('amount', '1,000')`) is
shown as written and fails at step 3. Only user edits strip commas.

### Decimals

`decimals` must be a non-negative safe integer. Any other value fails every non-empty
amount with `Amount limit is misconfigured`.

Fraction digits are counted as typed **(b)**: `1.500` has 3, `5.` has 0, `.5` has 1,
`-0.00` has 2. So `1.500` fails with `decimals={2}` even though it equals `1.5`. This
guarantees that the fraction part of a valid value is never longer than `decimals`,
whatever conversion you use.

The default of `2` applies in exact mode too.

### Bounds

`min` and `max` are inclusive and compared exactly, digit by digit. No float or `BigInt`
rounding is involved.

- A `string` bound must match the plain grammar. `'1,000'`, `'abc'` and `' 5'` are
  misconfigured.
- A `number` bound is expanded to its exact decimal string first (`1e21` →
  `'1000000000000000000000'`, `1e-7` → `'0.0000001'`). `NaN` and `±Infinity` are
  misconfigured.
- The message shows the bound as that decimal string.
- `min > max` is not an error in itself: every value fails one of the two checks.

### Custom validation

`validateAmount` runs only after steps 1–5 pass. It is called once per validation run,
with the comma-free decimal string. It is never called with raw invalid text, `''`, a
`number` or a `bigint`. An unedited `number`/`bigint` default is passed as its decimal
string.

| Returns                                          | Result                            |
| ------------------------------------------------ | --------------------------------- |
| `true`                                           | passes                            |
| a non-empty `string`                             | that string is the error          |
| `false`, `''`, `undefined`, a Promise, an object | fails with `Enter a valid amount` |

This differs from default mode, where `false` passes. A validator that throws is not
caught, in either mode.

### Values written from outside

| Value                         | Shown as                                                     | Validates as             |
| ----------------------------- | ------------------------------------------------------------ | ------------------------ |
| `''`, `null`, `undefined`     | empty                                                        | empty                    |
| a `string`                    | itself                                                       | itself (commas included) |
| a finite `number`             | its exact decimal string (`1e21` → `1000000000000000000000`) | that string              |
| a `bigint`                    | `value.toString()`                                           | that string              |
| `NaN`, `±Infinity`            | `NaN` / `Infinity`                                           | `Enter a valid amount`   |
| an object, symbol or function | empty                                                        | `Enter a valid amount`   |

A `number` literal past 2^53 (or with more than about 15 significant digits) was already
changed when JavaScript parsed your source. The field shows that changed value. Seed
with strings.

### Keyboard

| Key                       | Exact mode                                                                |
| ------------------------- | ------------------------------------------------------------------------- |
| Escape, field has a value | Clears the text and writes `''`. Focus stays. `preventDefault` is called. |
| Escape, field is empty    | Blurs the input.                                                          |
| ArrowUp / ArrowDown       | Normal caret movement. No stepping, nothing written.                      |
| Enter                     | Submits the enclosing form as usual. An invalid value blocks submit.      |
| Everything else           | Browser default.                                                          |

With `readOnly` and `readOnlyMode="readonly"`, Escape does nothing and is not
`preventDefault`-ed.

Inside a Radix-based `Dialog` (the kit's `Dialog`), Escape also closes the dialog, in
both modes. Radix listens for Escape on the document in the capture phase, before the
input sees it.

### Changing mode at runtime

Switching `formatOnBlur` between `false` and `true`/omitted remounts the input and
validates with the mode now rendered. Nothing is written at the switch. Exact mode shows
whatever value is in the form, including one default mode already rounded. Default mode
receives whatever exact mode left, including raw invalid text.
