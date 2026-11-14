import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { AddressField, Badge, Button, TextField } from '@openzeppelin/ui-components';

import { useEcosystem } from '../context';

interface LabelEndValues {
  recipient: string;
  memo: string;
  plain: string;
  withChip: string;
  withTall: string;
}

/**
 * LabelEndDemo - the `labelEnd` slot at the end of a field's label row.
 *
 * The address field carries an "Address book" action and the memo field an "Optional" chip.
 * Both sit beside the label, so each input's accessible name stays its label text and a click on
 * the label text still focuses the input.
 *
 * The neighbour pair below proves a chip in `labelEnd` does not grow the label row: the plain
 * field and the chipped field share one row height, the Badge stays fully visible, and it does
 * not overlap the input below.
 *
 * The `data-testid`s are stable hooks for browser checks against the running app.
 */
export function LabelEndDemo(): React.ReactElement {
  const { capabilities, sampleAddresses } = useEcosystem();
  const [bookOpens, setBookOpens] = useState(0);

  const form = useForm<LabelEndValues>({
    defaultValues: {
      recipient: sampleAddresses.wallet ?? '',
      memo: '',
      plain: '',
      withChip: '',
      withTall: '',
    },
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
          keeps the label text as its accessible name. Neighbour fields share one label-row height
          whether or not a chip is present; the chip shows in full without growing the row.
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

      <div
        className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2"
        data-testid="label-end-height-pair"
      >
        <div data-testid="label-end-plain-field">
          <TextField
            id="label-end-plain"
            name="plain"
            label="Without chip"
            control={form.control}
          />
        </div>
        <div data-testid="label-end-with-chip-field">
          <TextField
            id="label-end-with-chip"
            name="withChip"
            label="With chip"
            control={form.control}
            labelEnd={
              <Badge label="Optional" variant="outline" data-testid="label-end-height-chip" />
            }
          />
        </div>
        <div data-testid="label-end-with-tall-field">
          <TextField
            id="label-end-with-tall"
            name="withTall"
            label="Tall end node"
            control={form.control}
            labelEnd={
              <span
                className="bg-muted inline-flex h-8 items-center rounded px-2 text-xs"
                data-testid="label-end-tall-node"
              >
                Tall
              </span>
            }
          />
        </div>
      </div>
    </section>
  );
}
