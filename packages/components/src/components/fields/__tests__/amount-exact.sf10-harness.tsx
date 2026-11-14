/**
 * 005 SF-10 test harness: one AmountField in a react-hook-form form. Exports components
 * only (fast refresh rule); the handle and option types live in `amount-exact.sf10-kit.ts`.
 * Test fixture only; never exported from the package.
 */
import React, { Profiler, StrictMode } from 'react';
import { useForm, type FieldValues, type Mode } from 'react-hook-form';

import { AmountField } from '../AmountField';
import type {
  AmountFieldAnyProps,
  AmountFieldOptions,
  HarnessHandle,
} from './amount-exact.sf10-kit';

export interface HarnessProps {
  readonly handle: HarnessHandle;
  readonly options: AmountFieldOptions;
  readonly defaultValues?: FieldValues;
  readonly mode?: Mode;
  readonly name?: string;
  readonly id?: string;
}

/**
 * One AmountField in a form with a submit button. Subscribes to `isDirty`,
 * `dirtyFields` and `touchedFields`, records every committed (text, value) pair through
 * a Profiler, and records each `field.onChange` write.
 */
export function AmountHarness({
  handle,
  options,
  defaultValues = { amount: '' },
  mode = 'onSubmit',
  name = 'amount',
  id = 'amount',
}: HarnessProps): React.ReactElement {
  const form = useForm<FieldValues>({ defaultValues, mode });
  handle.api = form;
  // Read during render so react-hook-form's proxy subscribes to these.
  void form.formState.isDirty;
  void form.formState.dirtyFields;
  void form.formState.touchedFields;

  React.useEffect(() => {
    const subscription = form.watch((values, info) => {
      if (info.type === 'change' && info.name === name) handle.changeWrites.push(values[name]);
    });
    return () => subscription.unsubscribe();
  }, [form, handle, name]);

  const onCommit = (): void => {
    const input = document.getElementById(id);
    handle.commits.push({
      text: input instanceof HTMLInputElement ? input.value : null,
      value: form.getValues(name),
    });
  };

  const fieldProps: AmountFieldAnyProps = { ...options, id, name, control: form.control };

  return (
    <form onSubmit={form.handleSubmit(handle.onValid, handle.onInvalid)} noValidate>
      <Profiler id="amount" onRender={onCommit}>
        <AmountField {...fieldProps} />
      </Profiler>
      <button type="submit">Submit</button>
    </form>
  );
}

/** `AmountHarness` under `<StrictMode>`. */
export function StrictHarness(props: HarnessProps): React.ReactElement {
  return (
    <StrictMode>
      <AmountHarness {...props} />
    </StrictMode>
  );
}
