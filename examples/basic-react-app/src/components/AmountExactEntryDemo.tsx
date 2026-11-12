import { useState } from 'react';
import { useForm } from 'react-hook-form';

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
 * The `data-testid`s are stable hooks for the SF-10 browser precision check. AmountField
 * does not forward arbitrary attributes, so the field ids sit on wrapper elements.
 */
export function AmountExactEntryDemo(): React.ReactElement {
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
