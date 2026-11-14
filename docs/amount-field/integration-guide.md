# AmountField exact-entry mode — Integration Guide

Five patterns cover most uses. Each one builds a hand-written `react-hook-form` form. The
snippets assume:

```tsx
import { formatUnits, parseUnits } from 'viem';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { AmountField, Button } from '@openzeppelin/ui-components';

interface Token {
  symbol: string;
  decimals: number;
}
```

Complete, copy-paste versions are in [examples/](./examples/README.md).

## Pattern 1: A transfer form capped at the wallet balance

The common case: the user enters an amount of a token, the form refuses anything above
their balance or with more decimals than the token has, and submit hands you base units.

```tsx
interface TransferValues {
  amount: string;
}

function TransferForm({
  token,
  balance,
  onSend,
}: {
  token: Token;
  balance: bigint;
  onSend: (raw: bigint) => Promise<void>;
}) {
  const form = useForm<TransferValues>({ defaultValues: { amount: '' }, mode: 'onChange' });
  const maxAmount = formatUnits(balance, token.decimals); // exact decimal string

  return (
    <form
      onSubmit={form.handleSubmit(async ({ amount }) => {
        await onSend(parseUnits(amount, token.decimals));
      })}
    >
      <AmountField
        id="transfer-amount"
        name="amount"
        label="Amount"
        control={form.control}
        validation={{ required: true }}
        formatOnBlur={false}
        allowGrouping
        decimals={token.decimals}
        min="0"
        max={maxAmount}
        symbol={token.symbol}
        helperText={`Up to ${token.decimals} decimals. Use "," for thousands and "." for decimals.`}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          form.setValue('amount', maxAmount, { shouldValidate: true, shouldDirty: true })
        }
      >
        Max
      </Button>
      <Button type="submit">Send</Button>
    </form>
  );
}
```

What you get:

- `max={maxAmount}` is a string, so a balance of `1234567890123456789012` wei stays exact.
  A `number` there would already be off by the time the field sees it.
- `decimals={token.decimals}` means a 19th decimal on an 18-decimal token is an error the
  user sees, not a rounding inside `parseUnits`.
- The "Max" button writes an ungrouped string. `formatUnits` output is always valid for
  the field. The text shows without commas until the user edits it. Add `groupedDisplay`
  (Pattern 5) to show it grouped.
- `parseUnits(amount, token.decimals)` is exact for any value that passed validation.

## Pattern 2: Editing an amount that already exists

Load the stored amount as a string and write it in with `reset` or `defaultValues`. The
field shows it as is and does not write anything back, so the form starts clean.

```tsx
interface EditValues {
  amount: string;
}

function EditAllowance({ token, current }: { token: Token; current: bigint }) {
  const form = useForm<EditValues>({
    defaultValues: { amount: formatUnits(current, token.decimals) },
    mode: 'onChange',
  });

  return (
    <form
      onSubmit={form.handleSubmit(({ amount }) => {
        const next = parseUnits(amount, token.decimals);
        // …submit `next`
        form.reset({ amount }); // the saved value becomes the new clean state
      })}
    >
      <AmountField
        id="allowance"
        name="amount"
        label="Allowance"
        control={form.control}
        formatOnBlur={false}
        allowGrouping
        decimals={token.decimals}
        min="0"
        symbol={token.symbol}
      />
      <Button type="submit" disabled={!form.formState.isDirty}>
        Save
      </Button>
    </form>
  );
}
```

Rules for values you write in:

- **Write ungrouped decimal strings.** `'1500.25'`, not `'1,500.25'`. A grouped string
  written from outside is shown and then flagged with `Remove the , separators from this
value`. Only text the user types has its commas stripped. (With `groupedDisplay` an
  editable field accepts the grouped string, at the cost of a dirty form. See Pattern 5.)
- **Prefer strings to numbers.** A `number` default is shown as its exact decimal string,
  but the form keeps the `number` until the user edits the field, and `handleSubmit`
  passes it to you unchanged. If you seed numbers, type the field as
  `string | number` and convert with `String()` before `parseUnits`. The same goes for
  `bigint`, which is shown as an integer.
- **Clear with `''`, not `undefined`.** `setValue('amount', '')` empties the field.
  `setValue('amount', undefined)` makes react-hook-form's `Controller` fall back to the
  `defaultValues` entry, so the input shows the default while `getValues()` returns
  `undefined`. This is react-hook-form's behaviour and happens in default mode too.

## Pattern 3: Read-only while a save is in flight

Pass `readOnly` with `readOnlyMode="readonly"` to lock the field during an async step. The
input stays focusable, its text stays selectable, edits and Escape do nothing, and its
value stays in `handleSubmit` data. Validation still runs.

```tsx
const [saving, setSaving] = useState(false);

<AmountField
  id="deposit"
  name="amount"
  label="Deposit"
  control={form.control}
  formatOnBlur={false}
  decimals={6}
  readOnly={saving}
  readOnlyMode="readonly"
/>;
```

With `readOnly` alone (the default `readOnlyMode="disabled"`), `AmountField` is disabled,
like the other text fields: it can't be focused, and its value is left out of the
`handleSubmit` data.

## Pattern 4: Moving an existing default-mode field to exact mode

Add `formatOnBlur={false}`, then work through what the types flag and what changes in
behaviour:

| What                       | Default mode                           | Exact mode                                    |
| -------------------------- | -------------------------------------- | --------------------------------------------- |
| Text after blur            | padded or rounded to `decimals`        | unchanged                                     |
| Keystrokes                 | anything outside `-?\d*\.?\d*` dropped | all kept; invalid text gets a message         |
| Value type                 | `string`, or `null` after Escape       | always `string` (`''` when empty)             |
| `min` / `max`              | `number`                               | `number` or `string`                          |
| `step` / arrow keys        | exact decimal stepping                 | removed; arrows move the caret                |
| `validateAmount` argument  | `number` (`parseFloat`)                | comma-free `string`                           |
| `validateAmount` → `false` | passes                                 | fails (`Enter a valid amount`)                |
| Extra decimals             | rounded half away from zero on blur    | `Use at most N decimal places`, blocks submit |
| Escape on a value          | writes `null`                          | writes `''`                                   |

Checklist:

1. Set `decimals` to the token's decimals if you relied on the default `2` before.
2. Change `validateAmount` to take a string. If it returned `false` to mean "fine", make it
   return `true`.
3. Remove `step`.
4. Replace `null` checks on the value with `''` checks.
5. Convert at submit with `parseUnits(value, decimals)` instead of `Number(value)` or
   `parseFloat(value)`.
6. Say in `helperText` which separators the field takes.

If you build `AmountField` through `@openzeppelin/ui-renderer`'s dynamic forms, there is
nothing to switch: the renderer's `amount` field type uses default mode. The field shows
the exact text, but the renderer converts the value with `Number()` on submit
([#262](https://github.com/OpenZeppelin/openzeppelin-ui/issues/262)). Render
`AmountField` yourself to get exact entry.

## Pattern 5: Showing thousands separators (grouped display)

Add `groupedDisplay` next to `allowGrouping`. The field shows `250,000.00` whenever it is
not being edited and `250000.00` while it is. The form value, validation and your submit
code don't change: the value is still the plain string you pass to `parseUnits`. Add
`restrictInput` to refuse letters and excess decimals as they are typed, and
`padDecimals` to pad the unfocused display to `decimals` places; both default off.

A common shape is an entry step followed by a read-only review step on the same form
value:

```tsx
interface DepositValues {
  amount: string;
}

function DepositForm({ token, onDeposit }: { token: Token; onDeposit: (raw: bigint) => void }) {
  const [reviewing, setReviewing] = useState(false);
  const form = useForm<DepositValues>({ defaultValues: { amount: '' }, mode: 'onChange' });

  return (
    <form
      onSubmit={form.handleSubmit(({ amount }) => {
        if (!reviewing) return setReviewing(true);
        onDeposit(parseUnits(amount, token.decimals));
      })}
    >
      <AmountField
        id="deposit-amount"
        name="amount"
        label={reviewing ? 'Confirm amount' : 'Amount'}
        control={form.control}
        validation={{ required: true }}
        formatOnBlur={false}
        allowGrouping
        groupedDisplay
        decimals={token.decimals}
        min="0"
        symbol={token.symbol}
        readOnly={reviewing}
        readOnlyMode="readonly"
      />
      {reviewing && (
        <Button type="button" variant="outline" onClick={() => setReviewing(false)}>
          Edit
        </Button>
      )}
      <Button type="submit">{reviewing ? 'Confirm deposit' : 'Review'}</Button>
    </form>
  );
}
```

What you get:

- The user types `1250000.5` and presses Review. The field turns read-only and shows
  `1,250,000.5`, focused or not. The form value is `'1250000.5'` throughout.
- The review step reads the value the entry step wrote, which is already plain, so the
  read-only field never holds a grouped string.
- Tabbing back into the editable field selects the whole plain text, so typing replaces
  the amount.

Rules for values you write in with `groupedDisplay`:

- **Seed plain strings, as before.** `defaultValues: { amount: '250000.00' }` is shown as
  `250,000.00` and the form starts pristine.
- **A correctly grouped seed works on an editable field, but dirties the form.**
  `reset({ amount: '250,000.00' })` is stored as `'250000.00'` right away. `isDirty`
  becomes `true`, and a "Save" button that is disabled while the form is pristine becomes
  enabled before the user has done anything. If your data arrives grouped, strip it
  first: `value.replaceAll(',', '')`.
- **Seed a read-only amount plain.** A read-only field is never rewritten, so a grouped
  string there stays in the form and blocks submit with `Remove the , separators from
this value`, on a field the user cannot edit.
- **Don't `setValue` the field from an effect in the same render that seeds it grouped.**
  A component above the field that does so loses its value to the field's own write. See
  [Known limits](./api-reference.md#known-limits).
- **Don't call `reset` and `handleSubmit` back to back.** react-hook-form validates
  nothing until the next render, with or without `groupedDisplay`.

## Common mistakes

- **Leaving `decimals` at the default.** An 18-decimal token with the default `2` rejects
  `0.001`. That is visible and safe, but it is not what you want. Pass the token's
  decimals.
- **Passing a balance as a `number` bound.** `max={Number(formatUnits(balance, 18))}` loses
  digits before the field sees it. Pass the string.
- **Converting with `Number()` or `parseFloat()`.** The point of exact mode is that the
  value never becomes a float. Convert with `parseUnits` (or your chain's equivalent) at
  submit.
- **Expecting Escape to undo.** Escape clears the field. It does not restore the previous
  value.
- **Seeding grouped strings.** `defaultValues: { amount: '1,000' }` is flagged as an error.
  Seed `'1000'`. The user can type commas. Your code should not write them. With
  `groupedDisplay` an editable field takes `'1,000'` and stores `'1000'`, which marks the
  form dirty. A read-only field still refuses it.
- **Passing `groupedDisplay` without `allowGrouping`.** It compiles and does nothing. The
  field shows plain text and refuses commas.
- **Reading the input's text for the amount.** With `groupedDisplay` the DOM value has
  commas while the field is not focused. Read the form value (`getValues`, `watch`, the
  `handleSubmit` argument), which never has them.
- **Expecting grouped display in default mode.** It is an exact-mode prop. TypeScript
  rejects it without `formatOnBlur={false}`.
- **Using `validateAmount` for a value the built-in checks already cover.** Decimals, range
  and grammar run first. Use the validator for rules like "not zero" or "a multiple of
  the lot size", on the string it receives.
- **Expecting the field to swallow Escape inside a dialog.** In the kit's `Dialog`, Escape
  closes the dialog in both modes, even when the field has a value.
