import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button, RadioField } from '@openzeppelin/ui-components';

import { CodeBlock } from './CodeBlock';

interface RadioFieldCardValues {
  plan: string;
}

/**
 * RadioFieldCardDemo - a required RadioField in the `card` variant with described options, on its
 * own small form so the submitted payload shows what the field hands to the form.
 *
 * The `data-testid`s are stable hooks for browser checks against the running app.
 */
export function RadioFieldCardDemo(): React.ReactElement {
  const [submitted, setSubmitted] = useState<RadioFieldCardValues | null>(null);

  const form = useForm<RadioFieldCardValues>({ defaultValues: { plan: '' }, mode: 'onSubmit' });

  return (
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
  );
}
