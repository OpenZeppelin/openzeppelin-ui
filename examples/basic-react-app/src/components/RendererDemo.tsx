import { useState } from 'react';
import type { Control } from 'react-hook-form';
import { FormProvider, useForm } from 'react-hook-form';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openzeppelin/ui-components';
import { DynamicFormField } from '@openzeppelin/ui-renderer';
import type { FormFieldType, FormValues, RenderFormSchema } from '@openzeppelin/ui-types';

import { useEcosystem } from '../context';
import { CodeBlock } from './CodeBlock';
import { EcosystemIndicator } from './EcosystemIndicator';

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
 * Uses DynamicFormField with real adapters for proper field rendering and validation.
 */
export function RendererDemo(): React.ReactElement {
  const [submittedData, setSubmittedData] = useState<Record<string, unknown> | null>(null);
  const { adapter, isLoading } = useEcosystem();

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

  // Show loading state while ecosystem data is being loaded
  if (isLoading || !adapter) {
    return (
      <section className="space-y-8">
        <div>
          <h2 className="mb-4 text-2xl font-semibold tracking-tight">FormRenderer</h2>
          <p className="text-muted-foreground">Loading ecosystem...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div>
        <h2 className="mb-4 text-2xl font-semibold tracking-tight">FormRenderer</h2>
        <p className="text-muted-foreground mb-6">
          A dynamic form rendering system that generates blockchain transaction forms from schema
          definitions. The renderer automatically handles field validation, data formatting, and
          form state management using real adapters.
        </p>
      </div>

      <EcosystemIndicator description="The form below uses DynamicFormField with the real adapter for validation." />

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
                {/* All fields rendered dynamically using DynamicFormField */}
                {exampleSchema.fields.map((field) => (
                  <DynamicFormField
                    key={field.id}
                    field={field}
                    control={methods.control as unknown as Control<FormValues>}
                    adapter={adapter}
                  />
                ))}

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
          <CodeBlock code={JSON.stringify(submittedData, null, 2)} language="json" />
        </div>
      )}

      {/* Schema Example */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Form Schema</h3>
        <p className="text-muted-foreground text-sm">
          Forms are defined using a JSON schema that describes fields, validation rules, and layout
          options. The renderer interprets this schema and generates the appropriate UI components.
        </p>
        <div className="max-h-96 overflow-auto">
          <CodeBlock code={JSON.stringify(exampleSchema, null, 2)} language="json" />
        </div>
      </div>

      {/* Code Example */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Usage</h3>
        <CodeBlock
          code={`import { DynamicFormField } from '@openzeppelin/ui-renderer';
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
</FormProvider>`}
          language="tsx"
        />
      </div>
    </section>
  );
}
