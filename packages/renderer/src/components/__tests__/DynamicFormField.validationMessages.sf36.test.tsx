/**
 * @vitest-environment jsdom
 *
 * 005 SF-36 · INV-7: renderer-built forms get custom validation messages with no renderer
 * change. `DynamicFormField` passes `field.validation` straight to the kit field, so messages
 * from a stored (JSON) form config show; a check doesn't survive JSON and simply isn't there.
 */
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import React from 'react';
import { useForm } from 'react-hook-form';

import type { FormFieldType } from '@openzeppelin/ui-types';

import { DynamicFormField } from '../DynamicFormField';

type Values = Record<string, unknown>;

function Form({ field }: { field: FormFieldType }): React.ReactElement {
  const { control, handleSubmit } = useForm<Values>({ defaultValues: { [field.name]: '' } });
  return (
    <form noValidate onSubmit={handleSubmit(() => {})}>
      <DynamicFormField field={field} control={control} />
      <button type="submit">Submit</button>
    </form>
  );
}

const FIELD: FormFieldType = {
  id: 'display-name',
  name: 'displayName',
  label: 'Display name',
  type: 'text',
  validation: {
    required: true,
    maxLength: 5,
    messages: { required: 'Enter a display name', maxLength: 'Five characters max' },
    validate: (v) => (v === 'admin' ? 'Reserved' : true),
  },
};

async function submit(): Promise<void> {
  await act(async () => {
    screen.getByRole('button', { name: 'Submit' }).click();
  });
}

describe('SF-36 INV-7 — renderer forms show custom messages from a stored config', () => {
  it('a JSON round-tripped field keeps its messages and shows the custom required text', async () => {
    const stored = JSON.parse(JSON.stringify(FIELD)) as FormFieldType;
    expect(stored.validation.messages).toEqual(FIELD.validation.messages);
    expect('validate' in stored.validation).toBe(false);

    render(<Form field={stored} />);
    await submit();
    expect(await screen.findByText('Enter a display name')).toBeTruthy();
  });

  it('the in-memory field shows the custom required text too', async () => {
    render(<Form field={FIELD} />);
    await submit();
    expect(await screen.findByText('Enter a display name')).toBeTruthy();
  });
});
