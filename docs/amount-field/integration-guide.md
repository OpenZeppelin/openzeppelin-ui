# AmountField exact-entry mode — Integration Guide

Four patterns cover most uses. Each one builds a hand-written `react-hook-form` form. The
snippets assume:

```tsx
import { formatUnits, parseUnits } from 'viem';
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
  the field. The text shows without commas until the user edits it.
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
value`. Only text the user types has its commas stripped.
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

`AmountField` ignores `readOnly` on its own (with the default `readOnlyMode="disabled"`),
as it always has.

## Pattern 4: Moving an existing default-mode field to exact mode

Add `formatOnBlur={false}`, then work through what the types flag and what changes in
behaviour:

| What                       | Default mode                           | Exact mode                                    |
| -------------------------- | -------------------------------------- | --------------------------------------------- |
| Text after blur            | `parseFloat(...).toFixed(decimals)`    | unchanged                                     |
| Keystrokes                 | anything outside `-?\d*\.?\d*` dropped | all kept; invalid text gets a message         |
| Value type                 | `string`, or `null` after Escape       | always `string` (`''` when empty)             |
| `min` / `max`              | `number`                               | `number` or `string`                          |
| `step` / arrow keys        | float stepping                         | removed; arrows move the caret                |
| `validateAmount` argument  | `number` (`parseFloat`)                | comma-free `string`                           |
| `validateAmount` → `false` | passes                                 | fails (`Enter a valid amount`)                |
| Extra decimals             | rounded on blur                        | `Use at most N decimal places`, blocks submit |
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
nothing to switch: the renderer's `amount` field type uses default mode and converts with
`Number()`. Render `AmountField` yourself to get exact entry.

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
  Seed `'1000'`. The user can type commas. Your code should not write them.
- **Using `validateAmount` for a value the built-in checks already cover.** Decimals, range
  and grammar run first. Use the validator for rules like "not zero" or "a multiple of
  the lot size", on the string it receives.
- **Expecting the field to swallow Escape inside a dialog.** In the kit's `Dialog`, Escape
  closes the dialog in both modes, even when the field has a value.
