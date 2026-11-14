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

| Prop             | Type                          | Default      | Notes                                                                                                                                                                                                                                |
| ---------------- | ----------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`             | `string`                      | required     | Input id. The helper text is `${id}-description` and the error is `${id}-error`.                                                                                                                                                     |
| `name`           | `FieldPath<TFieldValues>`     | required     | Form field name.                                                                                                                                                                                                                     |
| `control`        | `Control<TFieldValues>`       | required     | From `useForm()`.                                                                                                                                                                                                                    |
| `label`          | `string`                      | required     | Visible label. An empty string renders no label row.                                                                                                                                                                                 |
| `placeholder`    | `string`                      | —            |                                                                                                                                                                                                                                      |
| `helperText`     | `string`                      | —            | Rendered below the input and linked through `aria-describedby`. In exact mode, say which separators the field uses.                                                                                                                  |
| `width`          | `'full' \| 'half' \| 'third'` | `'full'`     |                                                                                                                                                                                                                                      |
| `validation`     | `FieldValidation`             | —            | Reads `required` (label asterisk and the "required" check), `messages` and `validate`. Exact mode also reads `messages.format`, `decimals`, `min` and `max` (see [Validation order and messages](#validation-order-and-messages)).   |
| `decimals`       | `number`                      | `2`          | Default mode: places the value is formatted to on blur, exactly. Exact mode: the most fraction digits allowed (see [Decimals](#decimals)).                                                                                           |
| `symbol`         | `string`                      | `''`         | Shown inside the input's border and announced with the value. Not part of the value. See [Symbol](#symbol).                                                                                                                          |
| `symbolPosition` | `'prefix' \| 'suffix'`        | `'suffix'`   |                                                                                                                                                                                                                                      |
| `readOnly`       | `boolean`                     | `false`      | Disables the field (not focusable, value left out of `handleSubmit` data) unless `readOnlyMode="readonly"` is also set.                                                                                                              |
| `readOnlyMode`   | `'disabled' \| 'readonly'`    | `'disabled'` | With `readOnly`, `'readonly'` keeps the input focusable, ignores edits and Escape, and keeps the value in `handleSubmit` data. Works in both modes.                                                                                  |
| `labelEnd`       | `ReactNode`                   | —            | Content at the end of the label row (an "Optional" chip, a small action). Shown only when there is a `label`.                                                                                                                        |
| `showValidState` | `boolean`                     | `true`       | Shows the green success border once the field is touched without an error. `false` keeps the field neutral, so a touched, empty optional field doesn't look valid. The error border and message are unaffected. Works in both modes. |

### `AmountFieldProps` — default mode

```ts
interface AmountFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends AmountFieldCommonProps<TFieldValues> {
  formatOnBlur?: true;
  allowGrouping?: false;
  groupedDisplay?: false;
  min?: number;
  max?: number;
  step?: number;
  validateAmount?: (value: number) => boolean | string;
}
```

Same props as before. Still an `interface` under its old name, so
`interface MyProps extends AmountFieldProps` compiles as before.

| Prop             | Type                                   | Notes                                                                                                                         |
| ---------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `formatOnBlur`   | `true` (optional)                      | Omit or pass `true`.                                                                                                          |
| `allowGrouping`  | `false` (optional)                     | Grouping exists only in exact mode.                                                                                           |
| `groupedDisplay` | `false` (optional)                     | Grouped display exists only in exact mode.                                                                                    |
| `min`, `max`     | `number`                               | Inclusive. Validation compares them as floats. Arrow-key clamping is exact. A `NaN` or infinite bound is ignored by clamping. |
| `step`           | `number`, default `0.01`               | ArrowUp / ArrowDown step, added as an exact decimal. A `NaN` or infinite `step` makes the arrow keys write nothing.           |
| `validateAmount` | `(value: number) => boolean \| string` | Receives `parseFloat` of the value. A returned string is the error. `true` **and `false`** both pass.                         |

Behaviour:

- Keystrokes outside `^-?\d*\.?\d*$` are dropped.
- On blur, a plain decimal (an optional `-`, then digits with at most one `.`, such as
  `007.5`, `.5` or `5.`) is written back with exactly `decimals` fraction digits. Every
  digit is kept, leading zeros in the integer part are trimmed, and the fraction is
  padded, or rounded half away from zero. No float is involved: `0.1` at 18 decimals gives
  `0.100000000000000000`, `1.005` at 2 gives `1.01`, and an integer past 2^53 keeps every
  digit. A zero result has no minus sign (`-0.001` at 2 gives `0.00`).
- Blur leaves anything else as it is: an empty field, `-`, `.`, and text written from
  outside the field such as `1,000`, `12abc` or `1e3`.
- ArrowUp / ArrowDown add or subtract `step`, clamp to `min` / `max`, then format the
  same way. They step from `0` when the field is empty or holds only `-`, `.` or `-.`, and
  write nothing when it holds other text that is not a plain decimal.
- A `decimals` that is not a whole number from 0 to 100 turns formatting off. Blur and the
  arrow keys write nothing, and blur still marks the field as touched.
- Escape writes `null` when the field has a value and blurs when it is empty.
- The form value is a `string` after any edit, or `null` after Escape.

### `AmountFieldExactProps` — exact-entry mode

```ts
interface AmountFieldExactProps<TFieldValues extends FieldValues = FieldValues>
  extends AmountFieldCommonProps<TFieldValues> {
  formatOnBlur: false;
  allowGrouping?: boolean;
  groupedDisplay?: boolean;
  restrictInput?: boolean;
  padDecimals?: boolean;
  min?: number | string;
  max?: number | string;
  step?: never;
  validateAmount?: (value: string) => boolean | string;
}
```

| Prop             | Type                                   | Default | Notes                                                                                                                                             |
| ---------------- | -------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `formatOnBlur`   | `false`                                | —       | Required to select this mode.                                                                                                                     |
| `allowGrouping`  | `boolean`                              | `false` | Accept `,` thousands grouping. See [Grammar](#grammar).                                                                                           |
| `groupedDisplay` | `boolean`                              | `false` | Show the value with `,` groups while the field is not focused, plain while it is. Needs `allowGrouping`. See [Grouped display](#grouped-display). |
| `restrictInput`  | `boolean`                              | `false` | With `groupedDisplay`, refuse inserts that break the amount grammar or exceed `decimals`. Deletes always apply. See [Grouped display](#grouped-display). |
| `padDecimals`    | `boolean`                              | `false` | With `groupedDisplay`, pad the unfocused display to `decimals` places. Focused text stays unpadded. See [Grouped display](#grouped-display).      |
| `min`, `max`     | `number \| string`                     | —       | Inclusive. Compared exactly on decimal strings. A string must be a plain decimal (no commas). See [Bounds](#bounds).                              |
| `step`           | `never`                                | —       | Arrow-key stepping is off. ArrowUp / ArrowDown move the caret.                                                                                    |
| `validateAmount` | `(value: string) => boolean \| string` | —       | Called last, with the comma-free value, only when every built-in check passed. Only `true` passes. See [Custom validation](#custom-validation).   |

#### Type-level rules

These are compile errors:

```tsx
<AmountField {...base} allowGrouping />                         // grouping needs formatOnBlur={false}
<AmountField {...base} groupedDisplay />                        // so does grouped display
<AmountField {...base} min="0" />                               // string bounds need exact mode
<AmountField {...base} formatOnBlur={false} step={1} />         // no stepping in exact mode
<AmountField {...base} formatOnBlur={false}
  validateAmount={(n: number) => n > 0} />                      // exact validator takes a string
<AmountField {...base} formatOnBlur="false" />                  // must be the boolean false
```

A plain `boolean` variable passed to `formatOnBlur` compiles only when no mode-specific
prop is set.

In exact mode `allowGrouping` and `groupedDisplay` are independent booleans, so both can
come from runtime flags. `groupedDisplay` without `allowGrouping` compiles and does
nothing: the field behaves as a plain exact field, with no warning.

**`ComponentProps<typeof AmountField>` is now a union**
(`AmountFieldProps | AmountFieldExactProps`). If you derive prop types from the
component, `min` and `max` read as `number | string`, and `validateAmount` is a union of
a `number` validator and a `string` validator. JSX callers and
`extends AmountFieldProps` are unaffected. Code that reads
`ComponentProps<typeof AmountField>['min']` as a `number` needs a narrowing or should
use `AmountFieldProps['min']` directly.

## Symbol

`symbol` is drawn in the input's adornment slot: after the text by default, before it
with `symbolPosition="prefix"`. It works the same in default mode, exact mode and with
`groupedDisplay`.

- **Layout.** The text is padded clear of the symbol by its measured width, so `$`
  reserves less room than `USDC` and a long value never runs under it.
- **Colour and size.** The theme's muted text colour (`text-muted-foreground`) at the
  input's text size. It meets 4.5:1 contrast on the input's background in light and
  dark, read-only fill included. On a disabled field the symbol dims with the input.
- **Accessibility.** The symbol is rendered as `<span id="{id}-symbol">` and its id is
  listed first in the input's `aria-describedby`, before the error and helper ids. A
  screen reader announces it after the value, for example "Amount, edit text, 250.00,
  USD". The accessible name stays the label.
- **Value.** The symbol is never part of the input text, the form value or the
  validation.
- **Changing it.** Switching between two non-empty symbols (`USD` to `ETH`), or moving
  the symbol between prefix and suffix, keeps the input mounted, so focus and the typed
  text stay. Switching between an empty and a non-empty symbol remounts the input: a
  focused field loses focus, and the form value is kept.

## Exact mode in detail

The sections from here to [Changing mode at runtime](#changing-mode-at-runtime) describe
exact mode without `groupedDisplay`. [Grouped display](#grouped-display) lists what that
prop changes. Everything it doesn't mention is the same.

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

| Step | Check                                          | Message                                                               | Custom text (`validation.messages`) |
| ---- | ---------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------- |
| 1    | Empty (`''`, `null`, `undefined`)              | `This field is required` when `validation.required`, otherwise passes | `required`                          |
| 2    | Value is not a string, finite number or bigint | `Enter a valid amount`                                                | never replaced                      |
| 3    | Grammar, by cause:                             |                                                                       | `format`, for every cause           |
|      | — `-`, `.`, `-.`                               | `Please enter a complete number`                                      |                                     |
|      | — a number-shaped text with one `e`/`E`        | `Scientific notation is not supported`                                |                                     |
|      | — more than one `.`                            | `Only one decimal point is allowed`                                   |                                     |
|      | — `,` without `allowGrouping`                  | `Grouping separators (,) are not allowed`                             |                                     |
|      | — `,` with `allowGrouping`, bad groups         | `Use , only between groups of three digits, e.g. 1,234,567.89`        |                                     |
|      | — validly grouped text written from outside    | `Remove the , separators from this value`                             |                                     |
|      | — anything else                                | `Enter digits, an optional leading - and one . for decimals`          |                                     |
| 4    | `decimals` misconfigured                       | `Amount limit is misconfigured`                                       | never replaced                      |
|      | Too many fraction digits                       | `Use at most {decimals} decimal places`                               | `decimals`                          |
| 5    | `min` / `max` misconfigured                    | `Amount limit is misconfigured`                                       | never replaced                      |
|      | Below `min` / above `max`                      | `Value must be at least {min}` / `Value must be at most {max}`        | `min` / `max`                       |
| 6    | `validateAmount`                               | Your message, or `Enter a valid amount`                               | never replaced                      |
| 7    | `validation.validate`, non-empty values only   | Your message, or `This field is invalid`                              | never replaced                      |

A custom text replaces only its own step's message and never changes which values pass.
It is a plain string, shown as written. An empty string, or a value that isn't a string,
is ignored and the default shows. `min` and `max` texts apply only when the `min` or `max`
**prop** is set; `validation.min` and `validation.max` set no bound in exact mode and
activate no message. `format` also replaces "Remove the , separators from this value", so
seed plain strings. Default mode ignores `format`, `decimals`, `min` and `max` messages
and keeps its own wording.

Malformed text never reads as "required". Errors are shown once the field is touched, as
in default mode. They render through the kit's `ErrorMessage` with `role="alert"`, and
the input carries `aria-invalid` and `aria-errormessage` / `aria-describedby` pointing at
it.

A grouped string written from outside (for example `setValue('amount', '1,000')`) is
shown as written and fails at step 3. Only user edits strip commas. With
[`groupedDisplay`](#grouped-display) an editable field accepts that value and stores it
plain.

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

## Grouped display

```tsx
<AmountField {...base} formatOnBlur={false} allowGrouping groupedDisplay />
```

Grouped display is on only when `formatOnBlur` is `false`, `allowGrouping` is truthy and
`groupedDisplay` is exactly `true`. Any other combination renders the plain exact field
described above, with no difference in markup or behaviour.

It renders the same single `<input type="text" inputMode="decimal">` with the same
attributes and ARIA wiring. Focus and blur swap the text in place. Nothing is announced,
and no element is added or remounted.

Two further opt-ins apply only on this grouped input (both default off; without
`groupedDisplay` they do nothing):

- **`restrictInput`.** Refuses an insert (keystroke or paste) that would break the amount
  grammar or go past `decimals`. Backspace, Delete and clearing a selection always
  apply. A paste is accepted or refused as a whole — never partially. Refusing a
  keystroke does not introduce a new validation error on its own.
- **`padDecimals`.** Pads the unfocused grouped display to `decimals` places
  (`123000` → `123,000.00` when decimals are 2). Focused editable text stays the plain
  unpadded value. When the value already has more fraction digits than `decimals`, the
  display is not padded, so the over-decimal error stays visible.

### What is shown

| Field state                           | Shown                                       |
| ------------------------------------- | ------------------------------------------- |
| Not focused, valid text               | The text with `,` groups: `250,000.00`      |
| Not focused, `padDecimals`, valid     | Grouped and padded: `123000` → `123,000.00` |
| Focused and editable                  | The text as the user has it: `250000.00`    |
| Read-only (`readOnlyMode="readonly"`) | Grouped, focused or not                     |
| Disabled                              | Grouped                                     |
| Invalid text, in any state            | The text as given, never regrouped or fixed |
| Empty (`''`, `null`, `undefined`)     | Empty; the placeholder shows                |

Grouping inserts `,` between groups of three digits in the integer part and changes
nothing else. It uses no float and no locale API, so every digit survives at any length.

| Plain text                             | Shown when not focused                           |
| -------------------------------------- | ------------------------------------------------ |
| `250000.00`                            | `250,000.00`                                     |
| `-1234567.5`                           | `-1,234,567.5`                                   |
| `1000.`                                | `1,000.`                                         |
| `999`, `.5`, `0.000001`                | unchanged (fewer than four integer digits)       |
| `000123.450`                           | unchanged (an integer part that starts with `0`) |
| `12345678901234567.123456789012345678` | `12,345,678,901,234,567.123456789012345678`      |

The fraction is never grouped.

### Editing

- **Focus** swaps the grouped text for the plain text. It writes nothing, validates
  nothing and changes no form state.
- **Tab or Shift+Tab into the field** selects the whole plain text, as in any text input,
  so the next keystroke replaces the amount.
- **`element.focus()`, `setFocus(name)` and focus after a failed submit** keep the
  browser's own caret position, which is normally the end of the text.
- **A mouse click** puts the caret under the pointer, measured against the plain text.
  Because the commas disappear as the field takes focus, the caret can land up to one
  character to the right of the clicked digit for each comma left of the click. A click
  before the first character or past the last one is exact, and so is every click once
  the field has focus.
- **While focused, nothing is reformatted.** Each edit is kept whole and written once, as
  in a plain exact field. The user can still type commas: `1,000` stays `1,000` while
  they edit, the form value is `'1000'`, and after they leave and come back the field
  shows `1000`.
- **Blur** marks the field touched and shows the grouped form. It never writes the form
  value.
- **Switching to another window or tab** changes nothing. The field keeps its plain text
  and selection, so a paste on return replaces what was selected.
- **Escape** behaves as in [Keyboard](#keyboard).

### Form value and writes

The form value is what a plain exact field would hold: the text with every `,` removed
when the text is valid, the raw text when it isn't, `''` when empty. A valid value never
contains a comma, whichever form is on screen.

The field writes the form value on a user edit, on Escape, and in one more case:

**A correctly grouped string written from outside is stored plain.** When
`defaultValues`, `reset`, `setValue` or `useForm({ values })` gives an editable field a
string that matches the grouped [grammar](#grammar) (`'250,000.00'`), the field writes
`'250000.00'` right after that render. What you should know about this write:

- It marks the field and the form **dirty** (`isDirty`, `dirtyFields`), because the
  value no longer equals the default. It does not mark the field touched.
- It runs validation as any change does. In `mode: 'onChange'` or `'all'`, a seed that
  breaks another rule (say it is over `max`) shows that rule's message as soon as the
  field mounts. The message is never about the commas.
- It fires your `watch` and `useWatch` subscribers once (twice with
  `useForm({ values })`), always with the same plain string.
- The shown amount does not change: the field shows `250,000.00` before and after.
- A submit with no edit delivers `'250000.00'`.

A plain string, a `number` or a `bigint` from outside is shown grouped and **not**
written, so the form stays pristine and the value keeps its type. Seed plain strings.

A wrongly grouped string (`'25,00,000'`) is not rewritten. It is shown as given and
blocks submit with `Use , only between groups of three digits, e.g. 1,234,567.89`.

A value written while the field has focus (a `reset` in a timer, for example) is shown
plain at once, focus stays, and the next blur groups it.

### Read-only and disabled fields

A read-only or disabled field shows the grouped form and is never written: not on mount,
focus, blur or Escape, and not by the write described above.

| Seed                      | `readOnly` + `readOnlyMode="readonly"`                                                                       | `readOnly` (disabled)                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Plain: `'1250000.50'`     | Shown `1,250,000.50`, form pristine, submits `'1250000.50'`                                                  | Shown `1,250,000.50`; left out of submit data          |
| Grouped: `'1,250,000.50'` | Shown as given; the value stays grouped and **blocks submit** with `Remove the , separators from this value` | Shown as given; not validated, left out of submit data |

So **seed read-only amounts plain.** The field refuses a grouped value there and doesn't
strip it, because stripping would write a field the user can't edit and mark a review
step dirty.

In a read-only field Tab selects the grouped text, and copying gives the grouped text.

When a read-only or disabled field holding a grouped string becomes editable, the value
is stored plain at that moment (and the form becomes dirty), as for any grouped value
arriving in an editable field.

### Turning it on or off at runtime

Changing `groupedDisplay` or `allowGrouping` remounts the input, which rebuilds its text
from the form value. The change itself writes nothing. Turning grouped display on over
an editable field that holds a grouped string stores it plain, as above.

### Known limits

- **A grouped seed makes the form dirty.** Described above. Seed plain to stay pristine.
- **Another writer in the same render can lose its value.** The field stores a grouped
  value plain from an effect. If a component rendered _above_ the field writes the same
  field from its own effect in the same render in which a grouped value arrives (a
  `reset('250,000.00')` together with a sibling's `setValue('amount', '5')`), the field's
  write runs second and the form ends at `'250000.00'`. The `'5'` is lost. The screen and
  the form still agree, and the value has no comma. A writer rendered below the field, or
  the form's own parent, wins as expected. Plain seeds never trigger this, because the
  field writes nothing for them.
- **`reset(grouped)` then submit in the same tick is not validated.** react-hook-form
  drops a field's rules inside `reset` and registers them again on the next render. A
  `handleSubmit` call made before that render validates nothing, so
  `reset({ amount: '250,000.00' })` followed at once by `handleSubmit(cb)()` hands `cb`
  the grouped string. A plain exact field does the same with the same value. Submit from
  a later event, or seed plain. `setValue(grouped)` followed by an immediate submit is
  blocked by validation.
- **The first mouse click is approximate.** See [Editing](#editing).
- **Undo does not cross the focus swap.** The browser drops the input's undo history when
  the text is replaced, so Ctrl/Cmd+Z undoes only what was typed since the field last took
  focus.
- **Browser coverage.** Selection, caret and window-switch behaviour are tested in
  Chromium. Firefox and WebKit, right-aligned or right-to-left inputs, and fields inside
  a shadow root are not.
- **`,` and `.` only.** Grouped display follows the same grammar as `allowGrouping`. It
  does not use the user's locale.
