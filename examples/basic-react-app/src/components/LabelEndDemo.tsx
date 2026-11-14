import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { AddressField, Badge, Button, TextField } from '@openzeppelin/ui-components';

import { useEcosystem } from '../context';

interface LabelEndValues {
  recipient: string;
  memo: string;
}

/**
 * LabelEndDemo - the `labelEnd` slot at the end of a field's label row.
 *
 * The address field carries an "Address book" action and the memo field an "Optional" chip.
 * Both sit beside the label, so each input's accessible name stays its label text and a click on
 * the label text still focuses the input.
 *
 * The `data-testid`s are stable hooks for the SF-18 running-app check.
 */
export function LabelEndDemo(): React.ReactElement {
  const { capabilities, sampleAddresses } = useEcosystem();
  const [bookOpens, setBookOpens] = useState(0);

  const form = useForm<LabelEndValues>({
    defaultValues: { recipient: sampleAddresses.wallet ?? '', memo: '' },
  });

  return (
    <section
      className="mt-8 space-y-4"
      aria-labelledby="label-end-heading"
      data-testid="label-end-demo"
    >
      <div>
        <h3 id="label-end-heading" className="text-lg font-semibold">
          Label-row slot
        </h3>
        <p className="text-muted-foreground text-sm">
          <code>labelEnd</code> puts a chip or a small action at the end of the label row. The input
          keeps the label text as its accessible name.
        </p>
      </div>

      <div className="max-w-md space-y-4">
        <AddressField
          id="label-end-recipient"
          name="recipient"
          label="Recipient"
          control={form.control}
          addressing={capabilities ?? undefined}
          labelEnd={
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0"
              data-testid="label-end-address-book"
              onClick={() => setBookOpens((n) => n + 1)}
            >
              Address book
            </Button>
          }
        />
        <TextField
          id="label-end-memo"
          name="memo"
          label="Memo"
          control={form.control}
          labelEnd={<Badge label="Optional" variant="outline" data-testid="label-end-optional" />}
        />
        <p className="text-muted-foreground text-sm" data-testid="label-end-address-book-count">
          Address book opened: {bookOpens}
        </p>
      </div>
    </section>
  );
}
