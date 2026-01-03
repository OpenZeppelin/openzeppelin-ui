import { useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from '@openzeppelin/ui-components';
import type { FormFieldType, RenderFormSchema } from '@openzeppelin/ui-types';

/**
 * Example form schema demonstrating the renderer's capabilities
 */
const exampleSchema: RenderFormSchema = {
  id: 'transfer-form',
  title: 'Token Transfer',
  description: 'Transfer tokens to another address on the blockchain.',
  contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
  fields: [
    {
      id: 'recipient',
      name: 'recipient',
      label: 'Recipient Address',
      type: 'blockchain-address',
      placeholder: '0x...',
      helperText: 'The address that will receive the tokens',
      validation: {
        required: true,
      },
    },
    {
      id: 'amount',
      name: 'amount',
      label: 'Amount',
      type: 'amount',
      placeholder: '0.0',
      helperText: 'The number of tokens to transfer',
      validation: {
        required: true,
        min: 0,
      },
    },
    {
      id: 'memo',
      name: 'memo',
      label: 'Memo (Optional)',
      type: 'textarea',
      placeholder: 'Add a note to your transfer...',
      helperText: 'An optional message to attach to the transaction',
      validation: {
        required: false,
        maxLength: 256,
      },
    },
  ] as FormFieldType[],
  layout: {
    columns: 1,
    spacing: 'normal',
    labelPosition: 'top',
  },
  validation: {
    mode: 'onChange',
    showErrors: 'inline',
  },
  submitButton: {
    text: 'Transfer',
    loadingText: 'Processing...',
    variant: 'primary',
  },
};

/**
 * Demonstrates the FormRenderer capabilities for building dynamic blockchain forms.
 * This simplified example shows schema-driven form rendering without the full
 * DynamicFormField component, which requires a complete adapter implementation.
 */
export function RendererDemo(): React.ReactElement {
  const [submittedData, setSubmittedData] = useState<Record<string, unknown> | null>(null);

  const methods = useForm({
    mode: 'onChange',
    defaultValues: {
      recipient: '',
      amount: '',
      memo: '',
    },
  });

  const onSubmit = (data: Record<string, unknown>): void => {
    setSubmittedData(data);
  };

  /**
   * Validates an Ethereum-style address
   */
  const validateAddress = (value: string): string | true => {
    if (!value) return true;
    if (!/^0x/.test(value)) return 'Address must start with 0x';
    if (value.length !== 42) return 'Address must be 42 characters';
    if (!/^0x[a-fA-F0-9]{40}$/.test(value)) return 'Invalid hex characters';
    return true;
  };

  return (
    <section className="space-y-8">
      <div>
        <h2 className="mb-4 text-2xl font-semibold tracking-tight">FormRenderer</h2>
        <p className="text-muted-foreground mb-6">
          A dynamic form rendering system that generates blockchain transaction forms from schema
          definitions. The renderer automatically handles field validation, data formatting, and
          form state management.
        </p>
      </div>

      {/* Schema-Driven Form Example */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Schema-Driven Form</h3>
        <Card>
          <CardHeader>
            <CardTitle>{exampleSchema.title}</CardTitle>
            <CardDescription>{exampleSchema.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <FormProvider {...methods}>
              <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
                {/* Recipient Field */}
                <div className="space-y-2">
                  <Label htmlFor="recipient">{exampleSchema.fields[0].label}</Label>
                  <Controller
                    control={methods.control}
                    name="recipient"
                    rules={{
                      required: 'Recipient address is required',
                      validate: validateAddress,
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <Input
                          id="recipient"
                          placeholder={exampleSchema.fields[0].placeholder}
                          {...field}
                          value={field.value ?? ''}
                        />
                        <p className="text-muted-foreground text-sm">
                          {exampleSchema.fields[0].helperText}
                        </p>
                        {fieldState.error && (
                          <p className="text-destructive text-sm">{fieldState.error.message}</p>
                        )}
                      </>
                    )}
                  />
                </div>

                {/* Amount Field */}
                <div className="space-y-2">
                  <Label htmlFor="amount">{exampleSchema.fields[1].label}</Label>
                  <Controller
                    control={methods.control}
                    name="amount"
                    rules={{
                      required: 'Amount is required',
                      min: { value: 0, message: 'Amount must be positive' },
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <Input
                          id="amount"
                          type="number"
                          placeholder={exampleSchema.fields[1].placeholder}
                          {...field}
                          value={field.value ?? ''}
                        />
                        <p className="text-muted-foreground text-sm">
                          {exampleSchema.fields[1].helperText}
                        </p>
                        {fieldState.error && (
                          <p className="text-destructive text-sm">{fieldState.error.message}</p>
                        )}
                      </>
                    )}
                  />
                </div>

                {/* Memo Field */}
                <div className="space-y-2">
                  <Label htmlFor="memo">{exampleSchema.fields[2].label}</Label>
                  <Controller
                    control={methods.control}
                    name="memo"
                    rules={{
                      maxLength: { value: 256, message: 'Memo must be 256 characters or less' },
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <Textarea
                          id="memo"
                          placeholder={exampleSchema.fields[2].placeholder}
                          {...field}
                          value={field.value ?? ''}
                        />
                        <p className="text-muted-foreground text-sm">
                          {exampleSchema.fields[2].helperText}
                        </p>
                        {fieldState.error && (
                          <p className="text-destructive text-sm">{fieldState.error.message}</p>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="border-t pt-4">
                  <Button type="submit" disabled={!methods.formState.isValid}>
                    {exampleSchema.submitButton.text}
                  </Button>
                </div>
              </form>
            </FormProvider>
          </CardContent>
        </Card>
      </div>

      {/* Submitted Data Display */}
      {submittedData && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Submitted Data</h3>
          <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
            <code>{JSON.stringify(submittedData, null, 2)}</code>
          </pre>
        </div>
      )}

      {/* Schema Example */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Form Schema</h3>
        <p className="text-muted-foreground text-sm">
          Forms are defined using a JSON schema that describes fields, validation rules, and layout
          options. The renderer interprets this schema and generates the appropriate UI components.
        </p>
        <pre className="bg-muted max-h-96 overflow-auto rounded-lg p-4 text-sm">
          <code>{JSON.stringify(exampleSchema, null, 2)}</code>
        </pre>
      </div>

      {/* Code Example */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Usage</h3>
        <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
          <code>{`import { DynamicFormField } from '@openzeppelin/ui-renderer';
import { FormProvider, useForm } from 'react-hook-form';
import type { RenderFormSchema } from '@openzeppelin/ui-types';

// Define schema with field definitions
const schema: RenderFormSchema = {
  id: 'my-form',
  title: 'My Transaction Form',
  contractAddress: '0x...',
  fields: [
    {
      id: 'recipient',
      name: 'recipient', 
      label: 'Recipient Address',
      type: 'blockchain-address',
      validation: { required: true }
    }
  ],
  layout: { columns: 1, spacing: 'normal', labelPosition: 'top' },
  validation: { mode: 'onChange', showErrors: 'inline' },
  submitButton: { text: 'Submit', loadingText: 'Processing...' }
};

// Use with DynamicFormField component (requires adapter)
const methods = useForm({ mode: 'onChange' });

<FormProvider {...methods}>
  <form onSubmit={methods.handleSubmit(onSubmit)}>
    {schema.fields.map(field => (
      <DynamicFormField
        key={field.id}
        field={field}
        control={methods.control}
        adapter={adapter}
      />
    ))}
    <Button type="submit">{schema.submitButton.text}</Button>
  </form>
</FormProvider>`}</code>
        </pre>
      </div>
    </section>
  );
}
