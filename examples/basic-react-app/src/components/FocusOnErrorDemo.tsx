import { useForm } from 'react-hook-form';

import { Button, EnumField, TextField } from '@openzeppelin/ui-components';

import { CodeEditorField } from '@openzeppelin/ui-components/code-editor';

interface FocusOnErrorValues {
  name: string;
  status: { tag: string } | undefined;
  config: string;
}

/**
 * FocusOnErrorDemo - a failed submit moves focus to the first invalid field.
 *
 * Each field hands the form's ref to its control, so react-hook-form can focus it.
 * The form sets `noValidate`: without it the browser's own required prompt runs
 * first and RHF never sees the submit.
 *
 * The `data-testid`s are stable hooks for the browser proof.
 */
export function FocusOnErrorDemo(): React.ReactElement {
  const form = useForm<FocusOnErrorValues>({
    defaultValues: { name: '', status: undefined, config: '' },
  });

  return (
    <section className="mt-8 space-y-4" aria-labelledby="focus-on-error-heading">
      <div className="space-y-1">
        <h3 id="focus-on-error-heading" className="text-lg font-medium">
          Focus on first error
        </h3>
        <p className="text-muted-foreground text-sm">
          Submit with the required fields empty. Focus moves to the first invalid one; fill it in
          and submit again to reach the next.
        </p>
      </div>

      <form
        onSubmit={form.handleSubmit(() => undefined)}
        noValidate
        className="space-y-6"
        data-testid="focus-on-error-form"
      >
        <TextField
          id="foeName"
          name="name"
          label="Name"
          control={form.control}
          placeholder="e.g. Treasury team"
          validation={{ required: true }}
        />
        <EnumField
          id="foeStatus"
          name="status"
          label="Status"
          control={form.control}
          validation={{ required: true }}
          enumMetadata={{
            name: 'Status',
            variants: [
              { name: 'Active', type: 'void' },
              { name: 'Paused', type: 'void' },
            ],
            isUnitOnly: true,
          }}
        />
        <CodeEditorField
          id="foeConfig"
          name="config"
          label="Config"
          control={form.control}
          language="json"
          height="100px"
          required
        />
        <div className="flex justify-end">
          <Button type="submit" data-testid="focus-on-error-submit">
            Submit
          </Button>
        </div>
      </form>
    </section>
  );
}
