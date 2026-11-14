/**
 * @vitest-environment jsdom
 *
 * SF-6 · CodeEditorField and EnumField hand the form ref to their control (US-2).
 *
 * A failed submit moves focus to the first invalid field, and `setFocus(name)` focuses it.
 * Forms use `noValidate` so react-hook-form, not the browser, runs the validation.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { CodeEditorField } from './CodeEditorField';
import { EnumField, type EnumMetadata } from './EnumField';

type Values = { code?: string; choice?: unknown };

const METADATA: EnumMetadata = {
  name: 'Mode',
  isUnitOnly: true,
  variants: [
    { name: 'One', type: 'void' },
    { name: 'Two', type: 'void' },
  ],
};

let form: UseFormReturn<Values>;

function Harness({
  children,
  onValid = () => undefined,
}: {
  children: (control: UseFormReturn<Values>['control']) => React.ReactNode;
  onValid?: (v: Values) => void;
}): React.ReactElement {
  form = useForm<Values>({ defaultValues: { code: '', choice: undefined } });
  return (
    <form noValidate onSubmit={form.handleSubmit(onValid)}>
      {children(form.control)}
      <button type="submit">Submit</button>
    </form>
  );
}

afterEach(cleanup);

async function submitAndExpectFocus(getTarget: () => HTMLElement): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Submit' }));
  await waitFor(() => expect(document.activeElement).toBe(getTarget()));
}

describe('CodeEditorField form ref (SF-6)', () => {
  it.each([
    ['highlight', 5000],
    ['no-highlight', -1],
  ])('focuses its textarea on a failed submit (%s variant)', async (_name, threshold) => {
    const onValid = vi.fn();
    render(
      <Harness onValid={onValid}>
        {(control) => (
          <CodeEditorField
            id="code"
            name="code"
            control={control}
            label="Code"
            required
            performanceThreshold={threshold}
          />
        )}
      </Harness>
    );

    const editor = screen.getByTestId(
      threshold < 0 ? 'code-code-editor-no-highlight' : 'code-code-editor'
    );
    expect(editor.tagName).toBe('TEXTAREA');
    await submitAndExpectFocus(() => editor);
    expect(onValid).not.toHaveBeenCalled();
  });

  it('setFocus(name) focuses the textarea', async () => {
    render(
      <Harness>
        {(control) => <CodeEditorField id="code" name="code" control={control} label="Code" />}
      </Harness>
    );
    form.setFocus('code');
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('textbox')));
  });
});

describe('EnumField form ref (SF-6)', () => {
  it('focuses the variant select trigger on a failed submit', async () => {
    const onValid = vi.fn();
    render(
      <Harness onValid={onValid}>
        {(control) => (
          <EnumField
            id="choice"
            name="choice"
            control={control}
            label="Choice"
            enumMetadata={METADATA}
            validation={{ required: true }}
          />
        )}
      </Harness>
    );

    await submitAndExpectFocus(() => screen.getByRole('combobox'));
    expect(onValid).not.toHaveBeenCalled();
  });

  it('focuses the JSON fallback textarea on a failed submit', async () => {
    const onValid = vi.fn();
    render(
      <Harness onValid={onValid}>
        {(control) => (
          <EnumField
            id="choice"
            name="choice"
            control={control}
            label="Choice"
            validation={{ required: true }}
          />
        )}
      </Harness>
    );

    await submitAndExpectFocus(() => screen.getByRole('textbox'));
    expect(onValid).not.toHaveBeenCalled();
  });
});
