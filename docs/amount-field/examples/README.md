# AmountField exact-entry mode — Examples

Copy-paste modules for a Vite + React 19 app with the kit installed:

```bash
pnpm add @openzeppelin/ui-components react-hook-form viem
```

Each example is one `.tsx` file whose imports are React, `react-hook-form`, `viem` and the
kit. Drop it into `src/`, render it from a page, and make sure your Tailwind build scans
the kit (see the package README's _Styling_ section). The running example app has a live
version under Forms → "Amount Field: exact entry", which puts a default field next to an
exact one and prints the submitted payload.

## 1. Transfer form — `TransferAmountForm.tsx`

Pattern 1 of the [integration guide](../integration-guide.md): grouping on, decimals and
cap from the token, a "Max" button, and base units at submit.

```tsx
import { formatUnits, parseUnits } from 'viem';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { AmountField, Button } from '@openzeppelin/ui-components';

export interface Token {
  symbol: string;
  decimals: number;
}

interface TransferValues {
  amount: string;
}

export function TransferAmountForm({
  token,
  balance,
  onSend,
}: {
  token: Token;
  balance: bigint;
  onSend: (raw: bigint) => Promise<void>;
}): React.ReactElement {
  const [lastSent, setLastSent] = useState<bigint | null>(null);
  const form = useForm<TransferValues>({ defaultValues: { amount: '' }, mode: 'onChange' });
  const maxAmount = formatUnits(balance, token.decimals);

  const submit = async ({ amount }: TransferValues): Promise<void> => {
    const raw = parseUnits(amount, token.decimals); // exact for any valid value
    await onSend(raw);
    setLastSent(raw);
    form.reset({ amount: '' });
  };

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
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
        helperText={`Balance ${maxAmount}. Use "," for thousands and "." for decimals.`}
      />
      <div className="flex gap-2">
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
      </div>
      {lastSent !== null && <p>Sent {lastSent.toString()} base units.</p>}
    </form>
  );
}
```

Try: `12,345.6789012345678901234` (19 decimals) with an 18-decimal token shows
`Use at most 18 decimal places`. `1,2345` shows the grouping message. Neither submits.

## 2. Edit a stored amount — `EditAmountForm.tsx`

Pattern 2: seed from a stored `bigint`, start clean, save, and reset to the saved value.
The input is read-only while the save runs (Pattern 3).

```tsx
import { formatUnits, parseUnits } from 'viem';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { AmountField, Button } from '@openzeppelin/ui-components';

interface EditValues {
  amount: string;
}

export function EditAmountForm({
  symbol,
  decimals,
  current,
  onSave,
}: {
  symbol: string;
  decimals: number;
  current: bigint;
  onSave: (raw: bigint) => Promise<void>;
}): React.ReactElement {
  const [saving, setSaving] = useState(false);
  const form = useForm<EditValues>({
    // An ungrouped decimal string. The field does not write it back, so the form is clean.
    defaultValues: { amount: formatUnits(current, decimals) },
    mode: 'onChange',
  });

  const save = async ({ amount }: EditValues): Promise<void> => {
    setSaving(true);
    try {
      await onSave(parseUnits(amount, decimals));
      form.reset({ amount });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(save)} className="space-y-4">
      <AmountField
        id="edit-amount"
        name="amount"
        label="Allowance"
        control={form.control}
        validation={{ required: true }}
        formatOnBlur={false}
        allowGrouping
        decimals={decimals}
        min="0"
        symbol={symbol}
        readOnly={saving}
        readOnlyMode="readonly"
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => form.setValue('amount', '')}>
          Clear
        </Button>
        <Button type="submit" disabled={!form.formState.isDirty || saving}>
          Save
        </Button>
      </div>
    </form>
  );
}
```

`Clear` writes `''`. Do not clear with `undefined`: react-hook-form would show the
default value again while the form holds `undefined`.

## 3. Lot-size rule — `LotSizeAmountField.tsx`

A custom rule on top of the built-in checks. `validateAmount` receives the comma-free
string only after grammar, decimals and range have passed, so it can go straight to
`parseUnits`.

```tsx
import { parseUnits } from 'viem';
import { useForm } from 'react-hook-form';

import { AmountField, Button } from '@openzeppelin/ui-components';

interface OrderValues {
  quantity: string;
}

const DECIMALS = 6;
const LOT = parseUnits('0.5', DECIMALS);

export function LotSizeAmountField({
  onOrder,
}: {
  onOrder: (raw: bigint) => void;
}): React.ReactElement {
  const form = useForm<OrderValues>({ defaultValues: { quantity: '' }, mode: 'onTouched' });

  return (
    <form
      onSubmit={form.handleSubmit(({ quantity }) => onOrder(parseUnits(quantity, DECIMALS)))}
      className="space-y-4"
    >
      <AmountField
        id="order-quantity"
        name="quantity"
        label="Quantity"
        control={form.control}
        validation={{ required: true }}
        formatOnBlur={false}
        allowGrouping
        decimals={DECIMALS}
        min="0.5"
        max="1000000"
        validateAmount={(value) =>
          parseUnits(value, DECIMALS) % LOT === 0n || 'Quantity must be a multiple of 0.5'
        }
        helperText="In lots of 0.5, up to 1,000,000."
      />
      <Button type="submit">Place order</Button>
    </form>
  );
}
```

Return `true` to pass. Returning `false` fails with the generic `Enter a valid amount`, so
return a message instead.
