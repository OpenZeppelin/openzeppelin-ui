import { useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';

import {
  Button,
  FormDescription,
  FormItem,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openzeppelin/ui-components';

interface FormData {
  username: string;
  email: string;
  network: string;
}

/**
 * Demonstrates Form components with validation and submission
 */
export function FormDemo(): React.ReactElement {
  const [submittedData, setSubmittedData] = useState<FormData | null>(null);

  const form = useForm<FormData>({
    defaultValues: {
      username: '',
      email: '',
      network: '',
    },
    mode: 'onChange',
  });

  const onSubmit = (data: FormData): void => {
    setSubmittedData(data);
  };

  return (
    <section className="space-y-8">
      <div>
        <h2 className="mb-4 text-2xl font-semibold tracking-tight">Form</h2>
        <p className="text-muted-foreground mb-6">
          Form components with validation using react-hook-form integration.
        </p>
      </div>

      {/* Complete Form Example */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Complete Form</h3>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md space-y-6">
            <FormItem>
              <Label htmlFor="username">Username</Label>
              <Controller
                control={form.control}
                name="username"
                rules={{
                  required: 'Username is required',
                  minLength: {
                    value: 3,
                    message: 'Username must be at least 3 characters',
                  },
                }}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      id="username"
                      placeholder="Enter username"
                      {...field}
                      value={field.value ?? ''}
                    />
                    <FormDescription>This is your public display name.</FormDescription>
                    {fieldState.error && (
                      <p className="text-destructive text-sm">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </FormItem>

            <FormItem>
              <Label htmlFor="email">Email</Label>
              <Controller
                control={form.control}
                name="email"
                rules={{
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                }}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      {...field}
                      value={field.value ?? ''}
                    />
                    <FormDescription>We will never share your email.</FormDescription>
                    {fieldState.error && (
                      <p className="text-destructive text-sm">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </FormItem>

            <FormItem>
              <Label htmlFor="network">Network</Label>
              <Controller
                control={form.control}
                name="network"
                rules={{ required: 'Please select a network' }}
                render={({ field, fieldState }) => (
                  <>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger id="network">
                        <SelectValue placeholder="Select a network" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ethereum">Ethereum</SelectItem>
                        <SelectItem value="polygon">Polygon</SelectItem>
                        <SelectItem value="arbitrum">Arbitrum</SelectItem>
                        <SelectItem value="stellar">Stellar</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Select your preferred blockchain network.</FormDescription>
                    {fieldState.error && (
                      <p className="text-destructive text-sm">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </FormItem>

            <Button type="submit" disabled={!form.formState.isValid}>
              Submit
            </Button>
          </form>
        </FormProvider>
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

      {/* Code Example */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Usage</h3>
        <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
          <code>{`import { FormItem, Input, Label, Button } from '@openzeppelin/ui-components';
import { Controller, FormProvider, useForm } from 'react-hook-form';

const form = useForm({ defaultValues: { name: '' }, mode: 'onChange' });

<FormProvider {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormItem>
      <Label htmlFor="name">Name</Label>
      <Controller
        control={form.control}
        name="name"
        rules={{ required: 'Name is required' }}
        render={({ field, fieldState }) => (
          <>
            <Input {...field} value={field.value ?? ''} />
            {fieldState.error && (
              <p className="text-destructive text-sm">{fieldState.error.message}</p>
            )}
          </>
        )}
      />
    </FormItem>
    <Button type="submit">Submit</Button>
  </form>
</FormProvider>`}</code>
        </pre>
      </div>
    </section>
  );
}
