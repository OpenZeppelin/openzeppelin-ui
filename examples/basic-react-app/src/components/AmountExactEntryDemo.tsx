import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { AmountField, Button } from '@openzeppelin/ui-components';

import { useEcosystem } from '../context';
import { CodeBlock } from './CodeBlock';

interface AmountExactEntryValues {
  /** Default mode writes a formatted string, or `null` after Escape. */
  defaultAmount: string | null;
  /** Exact-entry mode always writes a string. */
  exactAmount: string;
}

/**
 * AmountExactEntryDemo - a default AmountField next to one in exact-entry mode
 * (`formatOnBlur={false}`, `allowGrouping`), on their own small form so the submitted
 * payload shows every digit each field hands to the form.
 *
 * The `data-testid`s are stable hooks for the browser precision check. AmountField
 * does not forward arbitrary attributes, so the field ids sit on wrapper elements.
 *
 * A second section shows the same exact field with `groupedDisplay`, a third shows
 * `restrictInput` and `padDecimals` on that grouped input, and a fourth shows symbols
 * of different widths in every mode.
 */
export function AmountExactEntryDemo(): React.ReactElement {
  return (
    <>
      <AmountExactEntrySection />
      <AmountGroupedDisplaySection />
      <AmountGroupedRestrictPadSection />
      <AmountSymbolSection />
    </>
  );
}

function AmountExactEntrySection(): React.ReactElement {
  const { ecosystem } = useEcosystem();
  const decimals = ecosystem === 'evm' ? 18 : 7;
  const symbol = ecosystem === 'evm' ? 'ETH' : 'XLM';

  const [submitted, setSubmitted] = useState<AmountExactEntryValues | null>(null);
  const [submitCount, setSubmitCount] = useState(0);

  const form = useForm<AmountExactEntryValues>({
    defaultValues: { defaultAmount: '', exactAmount: '' },
    mode: 'onChange',
  });

  const onSubmit = (values: AmountExactEntryValues): void => {
    setSubmitted(values);
    setSubmitCount((count) => count + 1);
  };

  return (
    <section className="mt-8 space-y-4" aria-labelledby="amount-exact-entry-heading">
      <div className="space-y-1">
        <h3 id="amount-exact-entry-heading" className="text-lg font-medium">
          Amount Field: exact entry
        </h3>
        <p className="text-muted-foreground text-sm">
          With <code>formatOnBlur={'{false}'}</code> the text you type is never rewritten, and the
          form gets it as a string with grouping commas removed. Extra decimals and malformed input
          are validation errors, never roundings. The default field pads or rounds to {decimals}{' '}
          decimals on blur, keeping every digit you typed. Try a value past 2^53 or with{' '}
          {decimals + 1} decimals in both fields.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div data-testid="amount-default-field">
            <AmountField
              id="amountDefaultEntry"
              name="defaultAmount"
              label="Amount (default)"
              control={form.control}
              placeholder="0.00"
              helperText={`Formats to ${decimals} decimals on blur`}
              symbol={symbol}
              decimals={decimals}
            />
          </div>

          <div data-testid="amount-exact-field">
            <AmountField
              id="amountExactEntry"
              name="exactAmount"
              label="Amount (exact entry)"
              control={form.control}
              placeholder="0.00"
              helperText={`Use "," for thousands and "." for decimals, e.g. 12,345.67 (up to ${decimals} decimals)`}
              symbol={symbol}
              decimals={decimals}
              formatOnBlur={false}
              allowGrouping
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-4">
          <p className="text-muted-foreground text-sm" data-testid="amount-exact-submit-count">
            Submitted {submitCount} {submitCount === 1 ? 'time' : 'times'}
          </p>
          <Button type="submit" data-testid="amount-exact-submit">
            Submit amounts
          </Button>
        </div>
      </form>

      {submitted && (
        <div className="space-y-2" data-testid="amount-exact-payload">
          <h4 className="text-sm font-medium">Submitted amounts</h4>
          <CodeBlock language="json" code={JSON.stringify(submitted, null, 2)} />
        </div>
      )}
    </section>
  );
}

interface AmountGroupedDisplayValues {
  /** Editable, with grouped display. Always a plain string once the field has settled. */
  amount: string;
  /** Focusable read-only, seeded plain. Never written by the field. */
  confirmedAmount: string;
}

const PLAIN_SEED = '250000.00';
const GROUPED_SEED = '250,000.00';
const CONFIRMED_AMOUNT = '1250000.50';

/**
 * Exact entry with `groupedDisplay`: the field shows `,` groups while it is not
 * focused and the plain text while it is, and the form value is always plain.
 *
 * The seed buttons call `reset`, the same path as late `defaultValues`. A plain seed
 * leaves the form pristine; a grouped seed is stored plain right away, which marks the
 * form dirty. The readout shows both. The seed text box lets the browser check seed
 * any value.
 */
function AmountGroupedDisplaySection(): React.ReactElement {
  const { ecosystem } = useEcosystem();
  const decimals = ecosystem === 'evm' ? 18 : 7;
  const symbol = ecosystem === 'evm' ? 'ETH' : 'XLM';

  const [submitted, setSubmitted] = useState<AmountGroupedDisplayValues | null>(null);
  const [submitCount, setSubmitCount] = useState(0);
  const [seedText, setSeedText] = useState(GROUPED_SEED);

  const form = useForm<AmountGroupedDisplayValues>({
    defaultValues: { amount: '', confirmedAmount: CONFIRMED_AMOUNT },
    mode: 'onChange',
  });
  const currentAmount = useWatch({ control: form.control, name: 'amount' });
  const { isDirty } = form.formState;

  const seed = (amount: string): void => {
    form.reset({ amount, confirmedAmount: CONFIRMED_AMOUNT });
  };

  const onSubmit = (values: AmountGroupedDisplayValues): void => {
    setSubmitted(values);
    setSubmitCount((count) => count + 1);
  };

  return (
    <section className="mt-8 space-y-4" aria-labelledby="amount-grouped-display-heading">
      <div className="space-y-1">
        <h3 id="amount-grouped-display-heading" className="text-lg font-medium">
          Amount Field: grouped display (exact entry)
        </h3>
        <p className="text-muted-foreground text-sm">
          With <code>groupedDisplay</code> the field shows thousands separators while it is not
          focused and the plain text while you edit it. The commas are display only: the form value
          is always the plain decimal string. A read-only field stays grouped when focused.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div data-testid="amount-grouped-field">
            <AmountField
              id="amountGroupedDisplay"
              name="amount"
              label="Amount (grouped display)"
              control={form.control}
              placeholder="0.00"
              helperText={`Type 250000 and tab out to see 250,000 (up to ${decimals} decimals)`}
              symbol={symbol}
              decimals={decimals}
              formatOnBlur={false}
              allowGrouping
              groupedDisplay
            />
          </div>

          <div data-testid="amount-grouped-readonly-field">
            <AmountField
              id="amountGroupedDisplayReadOnly"
              name="confirmedAmount"
              label="Confirmed amount (read-only)"
              control={form.control}
              helperText="Seeded plain, shown grouped, never written by the field"
              symbol={symbol}
              decimals={decimals}
              formatOnBlur={false}
              allowGrouping
              groupedDisplay
              readOnly
              readOnlyMode="readonly"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <Button
            type="button"
            variant="outline"
            data-testid="amount-grouped-seed-plain"
            onClick={() => seed(PLAIN_SEED)}
          >
            Seed {PLAIN_SEED}
          </Button>
          <Button
            type="button"
            variant="outline"
            data-testid="amount-grouped-seed-grouped"
            onClick={() => seed(GROUPED_SEED)}
          >
            Seed {GROUPED_SEED}
          </Button>
          <div className="flex flex-col gap-1">
            <label htmlFor="amountGroupedSeedText" className="text-sm font-medium">
              Custom seed
            </label>
            <input
              id="amountGroupedSeedText"
              type="text"
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              data-testid="amount-grouped-seed-text"
              value={seedText}
              onChange={(event) => setSeedText(event.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            data-testid="amount-grouped-seed-custom"
            onClick={() => seed(seedText)}
          >
            Seed custom value
          </Button>
          <Button
            type="button"
            variant="outline"
            data-testid="amount-grouped-reset"
            onClick={() => seed('')}
          >
            Reset
          </Button>
        </div>

        <dl className="text-muted-foreground grid gap-1 text-sm">
          <div className="flex gap-2">
            <dt>Form value:</dt>
            <dd data-testid="amount-grouped-form-value">{JSON.stringify(currentAmount)}</dd>
          </div>
          <div className="flex gap-2">
            <dt>isDirty:</dt>
            <dd data-testid="amount-grouped-is-dirty">{String(isDirty)}</dd>
          </div>
        </dl>

        <div className="flex items-center justify-end gap-4">
          <p className="text-muted-foreground text-sm" data-testid="amount-grouped-submit-count">
            Submitted {submitCount} {submitCount === 1 ? 'time' : 'times'}
          </p>
          <Button type="submit" data-testid="amount-grouped-submit">
            Submit amount
          </Button>
        </div>
      </form>

      {submitted && (
        <div className="space-y-2" data-testid="amount-grouped-payload">
          <h4 className="text-sm font-medium">Submitted amount</h4>
          <CodeBlock language="json" code={JSON.stringify(submitted, null, 2)} />
        </div>
      )}
    </section>
  );
}

interface AmountGroupedRestrictPadValues {
  /** Editable with restrictInput + padDecimals. Always a plain string once settled. */
  amount: string;
}

const RESTRICT_PAD_SEED = '123000';

/**
 * Grouped exact entry with both opt-ins: `restrictInput` refuses letters and excess
 * decimals; `padDecimals` shows `123,000.00` while unfocused (decimals fixed at 2 so
 * the pad is visible). Focused text stays the plain unpadded value.
 */
function AmountGroupedRestrictPadSection(): React.ReactElement {
  const { ecosystem } = useEcosystem();
  const symbol = ecosystem === 'evm' ? 'ETH' : 'XLM';

  const [submitted, setSubmitted] = useState<AmountGroupedRestrictPadValues | null>(null);
  const [submitCount, setSubmitCount] = useState(0);

  const form = useForm<AmountGroupedRestrictPadValues>({
    defaultValues: { amount: RESTRICT_PAD_SEED },
    mode: 'onChange',
  });
  const currentAmount = useWatch({ control: form.control, name: 'amount' });

  const onSubmit = (values: AmountGroupedRestrictPadValues): void => {
    setSubmitted(values);
    setSubmitCount((count) => count + 1);
  };

  return (
    <section className="mt-8 space-y-4" aria-labelledby="amount-grouped-restrict-pad-heading">
      <div className="space-y-1">
        <h3 id="amount-grouped-restrict-pad-heading" className="text-lg font-medium">
          Amount Field: grouped restrictInput and padDecimals
        </h3>
        <p className="text-muted-foreground text-sm">
          With <code>restrictInput</code> letters and a third decimal digit are refused; Backspace
          and Delete still work. With <code>padDecimals</code> and <code>decimals={'{2}'}</code> an
          unfocused <code>{RESTRICT_PAD_SEED}</code> shows <code>123,000.00</code>; focus shows the
          plain unpadded text.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div data-testid="amount-grouped-restrict-pad-field">
          <AmountField
            id="amountGroupedRestrictPad"
            name="amount"
            label="Amount (restrict + pad)"
            control={form.control}
            placeholder="0.00"
            helperText="Type a letter or a third decimal — nothing changes; blur to see 123,000.00"
            symbol={symbol}
            decimals={2}
            formatOnBlur={false}
            allowGrouping
            groupedDisplay
            restrictInput
            padDecimals
          />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <Button
            type="button"
            variant="outline"
            data-testid="amount-grouped-restrict-pad-seed"
            onClick={() => form.reset({ amount: RESTRICT_PAD_SEED })}
          >
            Seed {RESTRICT_PAD_SEED}
          </Button>
          <Button
            type="button"
            variant="outline"
            data-testid="amount-grouped-restrict-pad-reset"
            onClick={() => form.reset({ amount: '' })}
          >
            Reset
          </Button>
        </div>

        <dl className="text-muted-foreground grid gap-1 text-sm">
          <div className="flex gap-2">
            <dt>Form value:</dt>
            <dd data-testid="amount-grouped-restrict-pad-form-value">
              {JSON.stringify(currentAmount)}
            </dd>
          </div>
        </dl>

        <div className="flex items-center justify-end gap-4">
          <p
            className="text-muted-foreground text-sm"
            data-testid="amount-grouped-restrict-pad-submit-count"
          >
            Submitted {submitCount} {submitCount === 1 ? 'time' : 'times'}
          </p>
          <Button type="submit" data-testid="amount-grouped-restrict-pad-submit">
            Submit amount
          </Button>
        </div>
      </form>

      {submitted && (
        <div className="space-y-2" data-testid="amount-grouped-restrict-pad-payload">
          <h4 className="text-sm font-medium">Submitted amount</h4>
          <CodeBlock language="json" code={JSON.stringify(submitted, null, 2)} />
        </div>
      )}
    </section>
  );
}

interface AmountSymbolValues {
  prefixAmount: string;
  usdAmount: string;
  usdcAmount: string;
  groupedAmount: string;
  readOnlyAmount: string;
}

/** Longer than any field in the grid, so the end of the text meets the symbol. */
const LONG_AMOUNT = '123456789012345678901234567890123456789012345678901234567890.123456';
const LONG_GROUPED_AMOUNT = '123456789012345678901234567890123456789012345678.90';

/**
 * Symbols of different widths inside the input's border: a `$` prefix, `USD` and
 * `USDC` suffixes, a grouped field and a focusable read-only one. Every field is
 * seeded with a value longer than the field, so the padding the symbol reserves is
 * visible at a glance. The symbol is announced after the value through the input's
 * description.
 */
function AmountSymbolSection(): React.ReactElement {
  const form = useForm<AmountSymbolValues>({
    defaultValues: {
      prefixAmount: LONG_AMOUNT,
      usdAmount: LONG_AMOUNT,
      usdcAmount: LONG_AMOUNT,
      groupedAmount: LONG_GROUPED_AMOUNT,
      readOnlyAmount: LONG_GROUPED_AMOUNT,
    },
    mode: 'onChange',
  });

  return (
    <section className="mt-8 space-y-4" aria-labelledby="amount-symbol-heading">
      <div className="space-y-1">
        <h3 id="amount-symbol-heading" className="text-lg font-medium">
          Amount Field: symbol
        </h3>
        <p className="text-muted-foreground text-sm">
          The symbol sits inside the input&apos;s border in the muted text colour. The text is
          padded by the symbol&apos;s own width, so a long value never runs under it and{' '}
          <code>$</code> reserves less room than <code>USDC</code>. Screen readers hear the symbol
          right after the value.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div data-testid="amount-symbol-prefix-field">
          <AmountField
            id="amountSymbolPrefix"
            name="prefixAmount"
            label="Amount ($ prefix)"
            control={form.control}
            symbol="$"
            symbolPosition="prefix"
            decimals={6}
            formatOnBlur={false}
            allowGrouping
          />
        </div>

        <div data-testid="amount-symbol-usd-field">
          <AmountField
            id="amountSymbolUsd"
            name="usdAmount"
            label="Amount (USD suffix)"
            control={form.control}
            helperText="Up to 6 decimals"
            symbol="USD"
            decimals={6}
            formatOnBlur={false}
            allowGrouping
          />
        </div>

        <div data-testid="amount-symbol-usdc-field">
          <AmountField
            id="amountSymbolUsdc"
            name="usdcAmount"
            label="Amount (USDC suffix)"
            control={form.control}
            symbol="USDC"
            decimals={6}
            formatOnBlur={false}
            allowGrouping
          />
        </div>

        <div data-testid="amount-symbol-grouped-field">
          <AmountField
            id="amountSymbolGrouped"
            name="groupedAmount"
            label="Amount (USD suffix, grouped display)"
            control={form.control}
            symbol="USD"
            decimals={2}
            formatOnBlur={false}
            allowGrouping
            groupedDisplay
          />
        </div>

        <div data-testid="amount-symbol-readonly-field">
          <AmountField
            id="amountSymbolReadOnly"
            name="readOnlyAmount"
            label="Confirmed amount (USD, read-only)"
            control={form.control}
            symbol="USD"
            decimals={2}
            formatOnBlur={false}
            allowGrouping
            groupedDisplay
            readOnly
            readOnlyMode="readonly"
          />
        </div>
      </div>
    </section>
  );
}
