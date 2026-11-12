/**
 * @vitest-environment jsdom
 *
 * SF-6 · TextField hands the form ref to its input (US-2).
 *
 * Contract (spec scenarios; SF-6 has no Invariants stage):
 *  - S1: submitting a form whose first invalid field is a required, empty TextField focuses its input.
 *  - S1b: programmatic `setFocus(name)` focuses the input.
 *  - S2: typing, blur validation and the a11y attributes keep working.
 *
 * Forms use `noValidate`: without it the browser's own `required` check blocks the
 * submit before react-hook-form runs, so no ref-based focus can happen at all.
 */
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { TextField } from './TextField';

type Values = { first?: string; name?: string; other?: string };

let form: UseFormReturn<Values>;

function Harness({
  onValid = () => undefined,
  nativeValidation = false,
  textFirst = false,
  required = true,
}: {
  onValid?: (v: Values) => void;
  nativeValidation?: boolean;
  textFirst?: boolean;
  required?: boolean;
}): React.ReactElement {
  form = useForm<Values>({ defaultValues: { first: '', name: '', other: '' } });
  return (
    <form noValidate={!nativeValidation} onSubmit={form.handleSubmit(onValid)}>
      {textFirst && (
        <TextField
          id="first"
          name="first"
          label="First"
          control={form.control}
          validation={{ required: true }}
        />
      )}
      <TextField
        id="name"
        name="name"
        label="Name"
        control={form.control}
        validation={required ? { required: true } : undefined}
      />
      <button type="submit">Submit</button>
    </form>
  );
}

afterEach(cleanup);

describe('TextField form ref (SF-6)', () => {
  it('S1 happy: submit with an empty required field focuses its input', async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    render(<Harness onValid={onValid} />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    const input = screen.getByLabelText(/Name/);
    await waitFor(() => expect(document.activeElement).toBe(input));
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(onValid).not.toHaveBeenCalled();
  });

  it('S1 boundary: with two invalid fields, focus goes to the first one', async () => {
    const user = userEvent.setup();
    render(<Harness textFirst />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/First/)));
    expect(document.activeElement).not.toBe(screen.getByLabelText(/Name/));
  });

  it('S1 boundary: a valid field does not take focus and the form submits', async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    render(<Harness onValid={onValid} />);

    await user.type(screen.getByLabelText(/Name/), 'Ada');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(onValid).toHaveBeenCalledTimes(1));
    expect(onValid.mock.calls[0][0]).toMatchObject({ name: 'Ada' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Submit' }));
  });

  it('S1 failure: without noValidate the native required check blocks submit and focus stays on the button', async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    render(<Harness nativeValidation onValid={onValid} />);

    const submit = screen.getByRole('button', { name: 'Submit' });
    await user.click(submit);
    await new Promise((r) => setTimeout(r, 20));

    expect(onValid).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(submit);
  });

  it('S1b happy: setFocus(name) focuses the input', async () => {
    render(<Harness required={false} />);

    // react-hook-form defers setFocus with a timeout, so assert eventually.
    act(() => form.setFocus('name'));

    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/Name/)));
  });

  it('S1b failure: setFocus on a name with no mounted field does not move focus or throw', async () => {
    render(<Harness required={false} />);
    const submit = screen.getByRole('button', { name: 'Submit' });
    submit.focus();

    expect(() => act(() => form.setFocus('other'))).not.toThrow();
    await new Promise((r) => setTimeout(r, 20));
    expect(document.activeElement).toBe(submit);
  });

  it('S2 regression: typing writes the value to the form', async () => {
    const user = userEvent.setup();
    render(<Harness required={false} />);

    await user.type(screen.getByLabelText(/Name/), 'Grace');

    expect(form.getValues('name')).toBe('Grace');
  });

  it('S2 regression: the input keeps its id, label association and a11y attributes', () => {
    render(<Harness />);
    const input = screen.getByRole('textbox', { name: /Name/ });

    expect(input.id).toBe('name');
    expect(input.getAttribute('aria-required')).toBe('true');
    expect(input.getAttribute('aria-invalid')).toBe('false');
  });
});
