/**
 * @vitest-environment jsdom
 *
 * SelectGroupedField forwards the form ref to its trigger, as SelectField does (SF-6):
 * focus-on-first-error and `setFocus(name)` focus the trigger.
 */
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { SelectGroupedField } from './SelectGroupedField';

type Values = { first?: string; choice?: string };

const GROUPS = [
  { label: 'Letters', options: [{ value: 'a', label: 'Alpha' }] },
  { label: 'More', options: [{ value: 'b', label: 'Beta' }] },
];

let form: UseFormReturn<Values>;

function Harness({
  onValid = () => undefined,
  textFirst = false,
  required = true,
}: {
  onValid?: (v: Values) => void;
  textFirst?: boolean;
  required?: boolean;
}): React.ReactElement {
  form = useForm<Values>({ defaultValues: { first: '', choice: '' } });
  return (
    <form onSubmit={form.handleSubmit(onValid)}>
      {textFirst && <input aria-label="First" {...form.register('first', { required: true })} />}
      <SelectGroupedField
        id="choice"
        name="choice"
        label="Choice"
        control={form.control}
        groups={GROUPS}
        validation={required ? { required: true } : undefined}
      />
      <button type="submit">Submit</button>
    </form>
  );
}

beforeAll(() => {
  const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture ??= () => false;
  proto.releasePointerCapture ??= () => undefined;
  proto.setPointerCapture ??= () => undefined;
  proto.scrollIntoView ??= () => undefined;
});

afterEach(cleanup);

describe('SelectGroupedField form ref', () => {
  it('submit with an empty required select focuses the trigger', async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    render(<Harness onValid={onValid} />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    const trigger = screen.getByRole('combobox');
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    expect(onValid).not.toHaveBeenCalled();
  });

  it('an earlier invalid field keeps the focus', async () => {
    const user = userEvent.setup();
    render(<Harness textFirst />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('First')));
  });

  it('setFocus(name) focuses the trigger', async () => {
    render(<Harness required={false} />);
    act(() => form.setFocus('choice'));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('combobox')));
  });

  it('still opens, selects and writes the value', async () => {
    const user = userEvent.setup();
    render(<Harness required={false} />);
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Beta' }));
    await waitFor(() => expect(form.getValues('choice')).toBe('b'));
  });
});
