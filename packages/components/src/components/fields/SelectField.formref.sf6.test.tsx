/**
 * @vitest-environment jsdom
 *
 * SF-6 · SelectField forwards the form ref to its trigger (US-1, issue #252).
 *
 * Contract (spec scenarios; SF-6 has no Invariants stage):
 *  - S1: submitting a form whose first invalid field is a select focuses its trigger.
 *  - S1b: programmatic `setFocus(name)` focuses the trigger.
 *  - S2: the select still opens, closes and selects as before.
 */
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { SelectField } from './SelectField';

type Values = { first?: string; choice?: string; other?: string };

const OPTIONS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
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
  form = useForm<Values>({ defaultValues: { first: '', choice: '', other: '' } });
  return (
    <form onSubmit={form.handleSubmit(onValid)}>
      {textFirst && <input aria-label="First" {...form.register('first', { required: true })} />}
      <SelectField
        id="choice"
        name="choice"
        label="Choice"
        control={form.control}
        options={OPTIONS}
        validation={required ? { required: true } : undefined}
      />
      <button type="submit">Submit</button>
    </form>
  );
}

beforeAll(() => {
  // Radix Select needs these jsdom gaps filled to open via pointer/keyboard.
  const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture ??= () => false;
  proto.releasePointerCapture ??= () => undefined;
  proto.setPointerCapture ??= () => undefined;
  proto.scrollIntoView ??= () => undefined;
  (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
});

afterEach(cleanup);

describe('SelectField form ref (SF-6)', () => {
  it('S1 happy: submit with empty required select focuses the trigger', async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    render(<Harness onValid={onValid} />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    const trigger = screen.getByRole('combobox');
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    expect(onValid).not.toHaveBeenCalled();
  });

  it('S1 boundary: with an earlier invalid text field, focus goes to the first invalid field, not the select', async () => {
    const user = userEvent.setup();
    render(<Harness textFirst />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('First')));
    expect(document.activeElement).not.toBe(screen.getByRole('combobox'));
  });

  it('S1 boundary: a valid select does not steal focus and the form submits', async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    render(<Harness onValid={onValid} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Beta' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(onValid).toHaveBeenCalledTimes(1));
    expect(onValid.mock.calls[0][0]).toMatchObject({ choice: 'b' });
  });

  it('S1b happy: setFocus(name) focuses the select trigger', async () => {
    render(<Harness required={false} />);

    // react-hook-form defers setFocus with a timeout, so assert eventually.
    act(() => form.setFocus('choice'));

    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('combobox')));
  });

  it('S1b failure: setFocus on a name with no mounted field does not move focus or throw', async () => {
    render(<Harness required={false} />);
    const submit = screen.getByRole('button', { name: 'Submit' });
    submit.focus();

    expect(() => act(() => form.setFocus('other'))).not.toThrow();
    await new Promise((r) => setTimeout(r, 20));
    expect(document.activeElement).toBe(submit);
  });

  it('S2 regression: opens, selects an option, closes, and writes the value to the form', async () => {
    const user = userEvent.setup();
    render(<Harness required={false} />);
    const trigger = screen.getByRole('combobox');

    await user.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    await user.click(await screen.findByRole('option', { name: 'Alpha' }));

    await waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('false'));
    expect(trigger.textContent).toContain('Alpha');
    expect(form.getValues('choice')).toBe('a');
  });

  it('S2 regression: Escape closes the open list without changing the value', async () => {
    const user = userEvent.setup();
    render(<Harness required={false} />);
    const trigger = screen.getByRole('combobox');

    await user.click(trigger);
    await screen.findByRole('listbox');
    await user.keyboard('{Escape}');

    await waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('false'));
    expect(form.getValues('choice')).toBe('');
  });

  it('S2 regression: the trigger keeps its id, label association and a11y attributes', () => {
    render(<Harness />);
    const trigger = screen.getByRole('combobox', { name: /Choice/ });

    expect(trigger.id).toBe('choice');
    expect(trigger.getAttribute('aria-required')).toBe('true');
    expect(trigger.getAttribute('aria-invalid')).toBe('false');
  });
});
