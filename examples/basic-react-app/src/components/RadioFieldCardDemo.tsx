import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button, RadioField } from '@openzeppelin/ui-components';

import { CodeBlock } from './CodeBlock';

interface RadioFieldCardValues {
  plan: string;
}

interface RadioFieldVariantValues {
  tier: string;
  mode: string;
  network: string;
}

/**
 * RadioFieldCardDemo - RadioField's card and segmented variants, each on a small form so the
 * submitted payload shows what the fields hand to the form.
 *
 * The second form has no `noValidate`, like most consumer forms, so an empty submit shows that
 * the kit's required message appears instead of a browser bubble.
 *
 * The `data-testid`s are stable hooks for browser checks against the running app.
 */
export function RadioFieldCardDemo(): React.ReactElement {
  const [submitted, setSubmitted] = useState<RadioFieldCardValues | null>(null);
  const [submittedVariants, setSubmittedVariants] = useState<RadioFieldVariantValues | null>(null);

  const form = useForm<RadioFieldCardValues>({ defaultValues: { plan: '' }, mode: 'onSubmit' });
  const variantsForm = useForm<RadioFieldVariantValues>({
    defaultValues: { tier: 'team', mode: '', network: 'testnet' },
    mode: 'onSubmit',
  });

  return (
    <>
      <section className="mt-8 space-y-4" aria-labelledby="radio-field-card-heading">
        <div className="space-y-1">
          <h3 id="radio-field-card-heading" className="text-lg font-medium">
            Radio Field: card variant with descriptions
          </h3>
          <p className="text-muted-foreground text-sm">
            Submit empty to see the required error, then pick a plan and submit again.
          </p>
        </div>

        <form
          onSubmit={form.handleSubmit((values) => setSubmitted(values))}
          className="space-y-4"
          data-testid="radio-field-card-form"
        >
          <RadioField
            id="radioFieldCard"
            name="plan"
            label="Plan"
            control={form.control}
            variant="card"
            validation={{ required: true }}
            helperText="Pick one plan"
            options={[
              { value: 'starter', label: 'Starter', description: 'For trying things out' },
              { value: 'team', label: 'Team', description: 'Shared access for small teams' },
              {
                value: 'enterprise',
                label: 'Enterprise',
                description: 'Contact sales',
                disabled: true,
              },
            ]}
          />
          <Button type="submit">Submit</Button>
        </form>

        <div data-testid="radio-field-card-payload">
          <CodeBlock
            code={submitted ? JSON.stringify(submitted, null, 2) : '// submit the form'}
            language="json"
          />
        </div>
      </section>

      <section className="mt-8 space-y-4" aria-labelledby="radio-field-variants-heading">
        <div className="space-y-1">
          <h3 id="radio-field-variants-heading" className="text-lg font-medium">
            Radio Field: side-by-side cards and segmented
          </h3>
          <p className="text-muted-foreground text-sm">
            <code>layout=&quot;horizontal&quot;</code> puts cards side by side; they stack in a
            narrow container. Submit with no mode picked to see the required error, then pick one
            and submit. The network field is read-only: clicks and arrow keys don&apos;t change it,
            and its value is still submitted.
          </p>
        </div>

        <form
          onSubmit={variantsForm.handleSubmit((values) => setSubmittedVariants(values))}
          className="space-y-6"
          data-testid="radio-field-variants-form"
        >
          <RadioField
            id="radioFieldTier"
            name="tier"
            label="Tier"
            control={variantsForm.control}
            variant="card"
            layout="horizontal"
            options={[
              { value: 'starter', label: 'Starter', description: 'For trying things out' },
              {
                value: 'team',
                label: 'Team',
                description: 'Shared access for small teams, with roles and an audit log',
              },
              { value: 'scale', label: 'Scale', description: 'Higher limits' },
            ]}
          />

          <RadioField
            id="radioFieldMode"
            name="mode"
            label="Mode"
            control={variantsForm.control}
            variant="segmented"
            validation={{ required: true }}
            helperText="How transactions are sent"
            options={[
              { value: 'automatic', label: 'Automatic' },
              { value: 'manual', label: 'Manual' },
            ]}
          />

          <RadioField
            id="radioFieldNetwork"
            name="network"
            label="Network"
            control={variantsForm.control}
            variant="segmented"
            readOnly
            readOnlyMode="readonly"
            helperText="Set by the deployment"
            options={[
              { value: 'mainnet', label: 'Mainnet' },
              { value: 'testnet', label: 'Testnet' },
            ]}
          />

          <Button type="submit">Submit</Button>
        </form>

        <div data-testid="radio-field-variants-payload">
          <CodeBlock
            code={
              submittedVariants ? JSON.stringify(submittedVariants, null, 2) : '// submit the form'
            }
            language="json"
          />
        </div>
      </section>
    </>
  );
}
