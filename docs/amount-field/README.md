# AmountField: exact-entry mode

> Token and currency amounts that reach your form exactly as the user typed them. No
> float, no rounding, no rewrite on blur.

## Overview

`AmountField` is the kit's amount input for `react-hook-form`. It has two modes:

- **Default mode** (no new props). It accepts plain decimals and formats the text to
  `decimals` places on blur and on the arrow keys. The formatting is exact decimal
  arithmetic, with no float: every typed digit is kept, and the fraction is padded, or
  rounded half away from zero, to `decimals`. With `decimals={18}`, typing `0.1` and
  leaving the field shows `0.100000000000000000`. Extra decimals are rounded, not
  reported: `1.005` at 2 decimals becomes `1.01`.
- **Exact-entry mode** (`formatOnBlur={false}`). Use this one for money. The text is
  never rewritten. The form value is a decimal **string** with any `,` grouping removed,
  and it never passes through a float. Too many decimals, out-of-range amounts and
  malformed text are validation errors that block submit. Nothing is rounded,
  truncated or dropped.

**It is for** teams building token transfer, mint, deposit or payment forms by hand with
`react-hook-form`. **It does not** convert to base units (that is your `parseUnits` call
at submit), parse locale separators (`,` is grouping, `.` is the decimal point), or
change how a field in default mode behaves.

The one thing to remember: in exact mode, **the submitted value is a string you pass
straight to `parseUnits(value, tokenDecimals)`**. Set `decimals` to the token's decimals
and the conversion is exact. viem neither rounds nor throws.

## Quick Start

Exact mode ships in `@openzeppelin/ui-components`. Nothing new to install. The example
uses `viem` for the conversion. Any `parseUnits` with the same grammar works.

```bash
pnpm add @openzeppelin/ui-components react-hook-form viem
```

```tsx
import { parseUnits } from 'viem';
import { useForm } from 'react-hook-form';

import { AmountField, Button } from '@openzeppelin/ui-components';

interface TransferValues {
  amount: string;
}

export function TransferAmount({ onSend }: { onSend: (raw: bigint) => void }) {
  const decimals = 18;
  const form = useForm<TransferValues>({ defaultValues: { amount: '' }, mode: 'onChange' });

  return (
    <form onSubmit={form.handleSubmit(({ amount }) => onSend(parseUnits(amount, decimals)))}>
      <AmountField
        id="amount"
        name="amount"
        label="Amount"
        control={form.control}
        validation={{ required: true }}
        formatOnBlur={false}
        allowGrouping
        decimals={decimals}
        min="0"
        symbol="ETH"
        helperText='Use "," for thousands and "." for decimals'
      />
      <Button type="submit">Send</Button>
    </form>
  );
}
```

The user types `12,345,678,901,234,567.123456789012345678` and leaves the field. The
input still shows exactly that. On submit the form value is
`'12345678901234567.123456789012345678'`, and `parseUnits` gives
`12345678901234567123456789012345678n`. If they type a 19th decimal, the field shows
`Use at most 18 decimal places` and submit does nothing.

## Key Concepts

**1. The text is the user's.** In exact mode the field never filters a keystroke, never
formats on blur, and never trims or pads. A pasted `1e18` or `1,000` stays on screen
and gets an error message that names the problem. Escape clears the field. It does not
revert to an earlier value.

**2. The value is derived from the text, one way.**

| On screen                          | Valid? | Form value                        |
| ---------------------------------- | ------ | --------------------------------- |
| (empty)                            | empty  | `''`                              |
| `12,345.60` (with `allowGrouping`) | yes    | `'12345.60'`                      |
| `007`, `.5`, `5.`, `-0`            | yes    | the same text                     |
| `1,5`, `1e18`, `1..2`, `-`, `1`    | no     | the same raw text (blocks submit) |
| `1,000` (without `allowGrouping`)  | no     | `'1,000'` (blocks submit)         |

A value that passes validation is the on-screen text minus its commas. Invalid text
reaches the form as itself, so it can never be submitted as a different number.

**3. Limits are checks, not rewrites.** `decimals`, `min` and `max` are validated on
strings with exact digit comparison. `decimals` counts digits as typed, so `1.500` has
three. `min` and `max` accept strings, so a bound like a wallet balance past 2^53 stays
exact.

**4. The props are a typed union.** `formatOnBlur={false}` selects
`AmountFieldExactProps`. TypeScript rejects `allowGrouping` without it, string bounds in
default mode, and `step` in exact mode. Your existing `AmountField` code compiles and
behaves as before.

## API Reference

See [api-reference.md](./api-reference.md).

## Integration Guide

See [integration-guide.md](./integration-guide.md) for transfer forms, a "Max" button,
seeding and resetting values, and moving an existing default-mode field to exact mode.
Copy-paste modules are in [examples/](./examples/README.md).

## Safety

- **Set `decimals` to the token's decimals.** The default is `2`, and exact mode enforces
  it. That makes a forgotten `decimals` visible (an 18-decimal entry fails at 2) and not
  a silent rounding inside `parseUnits`. With `decimals` equal to the token's decimals,
  every value that passes validation converts exactly.
- **Pass bounds as strings when they can exceed 2^53 or carry many decimals.** A `number`
  literal past 2^53 was already changed by JavaScript before the field sees it. Use
  `formatUnits(balance, decimals)` for a balance cap.
- **Set `min="0"` if negatives make no sense.** Exact mode accepts a leading `-` unless a
  bound rules it out.
- **A broken limit fails closed.** A `decimals` that is not a non-negative safe integer, or
  a `min`/`max` that is not a plain decimal (`'abc'`, `NaN`, `Infinity`), makes every
  non-empty value fail with `Amount limit is misconfigured`. Nothing gets through a
  broken cap.
- **Seed with strings.** `defaultValues`, `setValue` and `reset` should write ungrouped
  decimal strings. A `number` default is shown exactly as JavaScript holds it and is
  submitted unchanged, still a `number`, until the user edits it.
- **Default mode rounds extra decimals.** Its formatting keeps every digit, but a user who
  types more fraction digits than `decimals` gets a rounded amount, with no message. Use
  exact mode for money when that rounding is not acceptable. If you use default mode for
  token amounts, set `decimals` to the token's decimals. The text then always has exactly
  that many fraction digits, so `parseUnits(value, decimals)` converts it without
  rounding anything itself.
- **The dynamic form renderer uses default mode.** `@openzeppelin/ui-renderer`'s `amount`
  field type shows the exact text, but its submit transform still converts the value with
  `Number()`, so amounts past about 15 significant digits lose precision at submit. This
  is tracked in [#262](https://github.com/OpenZeppelin/openzeppelin-ui/issues/262). Exact
  mode is only available when you render `AmountField` yourself.

## Behaviour pending review

Three points are implemented, tested and documented here as the current contract. A
maintainer review is still open on each, so they could change before release:

- **(a)** Invalid text stays on screen as typed, and the form value is that raw text.
  The alternative is a keystroke filter.
- **(b)** `decimals` counts fraction digits as typed (`1.500` is 3). The alternative is
  counting significant digits.
- **(c)** A `number` or `bigint` default is not converted to a string on mount. It
  reaches `handleSubmit` unchanged unless the user edits the field.

## License

Same as the repository: see [LICENSE](../../LICENSE).
