/**
 * 007 SF-3 test harness: one AmountField in a react-hook-form form, with everything the
 * grouped-display tests need to vary: how the form is configured (`defaultValues`,
 * `values`, async defaults), a mount effect in the parent, siblings rendered before and
 * after the field, a field name that can change and a key that remounts only the field.
 * Exports components only (fast refresh rule); the handle lives in
 * `amount-grouped.sf3-kit.ts`. Test fixture only; never exported from the package.
 */
import React, { Profiler, StrictMode, useEffect, useLayoutEffect, useState } from 'react';
import {
  useForm,
  useWatch,
  type FieldValues,
  type UseFormProps,
  type UseFormReturn,
} from 'react-hook-form';

import { AmountField } from '../AmountField';
import { AmountFieldGroupedExactInput } from '../AmountFieldGroupedExactInput';
import type { ReadOnlyMode } from '../BaseField';
import { getAccessibilityProps } from '../utils';
import { getReadOnlyState } from '../utils/readOnlyState';
import type { AmountFieldAnyProps, AmountFieldOptions } from './amount-exact.sf10-kit';
import type { DirectSpies, GroupedHandle } from './amount-grouped.sf3-kit';

export interface GroupedHarnessProps {
  readonly handle: GroupedHandle;
  readonly options: AmountFieldOptions;
  /** Passed to `useForm` as given. Default: `{ defaultValues: { amount: '' } }`. */
  readonly formProps?: UseFormProps<FieldValues>;
  readonly name?: string;
  readonly id?: string;
  /** Changing it remounts the AmountField only; the form stays. */
  readonly fieldKey?: number;
  /** Rendered inside the form before the field, so their effects run before the field's. */
  readonly before?: React.ReactNode;
  /** Rendered inside the form after the field, so their effects run after the field's. */
  readonly after?: React.ReactNode;
  /** Runs once in the form component's own mount effect (after every child effect). */
  readonly onMount?: (api: UseFormReturn<FieldValues>) => void;
  readonly strict?: boolean;
}

/**
 * Records every `field.onChange` call. It is the first child of the form, so its
 * subscription exists before the field's own effects run, mount included.
 */
function WriteRecorder({ handle }: { readonly handle: GroupedHandle }): null {
  useEffect(() => {
    const api = handle.api;
    if (!api) return undefined;
    const subscription = api.watch((values, info) => {
      if (info.type !== 'change' || info.name === undefined) return;
      const value = api.getValues(info.name);
      handle.writes.push({ name: info.name, value });
      handle.changeWrites.push(value);
      void values;
    });
    return () => subscription.unsubscribe();
  }, [handle]);
  return null;
}

function GroupedHarnessInner({
  handle,
  options,
  formProps = { defaultValues: { amount: '' } },
  name = 'amount',
  id = 'amount',
  fieldKey = 0,
  before,
  after,
  onMount,
}: GroupedHarnessProps): React.ReactElement {
  const form = useForm<FieldValues>(formProps);
  handle.api = form;
  // Read during render so react-hook-form's proxy subscribes to these.
  void form.formState.isDirty;
  void form.formState.dirtyFields;
  void form.formState.touchedFields;
  void form.formState.errors;

  useEffect(() => {
    onMount?.(form);
    // Mount only: this models a parent that seeds the form once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <WriteRecorder handle={handle} />
      <button type="button">Before</button>
      {before}
      <Profiler id="amount" onRender={onCommit}>
        <AmountField key={fieldKey} {...fieldProps} />
      </Profiler>
      {after}
      <button type="button">After</button>
      <button type="submit">Submit</button>
    </form>
  );
}

/** One AmountField in a form. `strict` wraps it in `<StrictMode>`. */
export function GroupedHarness(props: GroupedHarnessProps): React.ReactElement {
  return props.strict ? (
    <StrictMode>
      <GroupedHarnessInner {...props} />
    </StrictMode>
  ) : (
    <GroupedHarnessInner {...props} />
  );
}

export interface SecondWriterProps {
  readonly handle: GroupedHandle;
  /** The value that makes this component write. */
  readonly when: unknown;
  /** What it writes with `setValue('amount', …)`, from an effect. */
  readonly write: unknown;
  readonly name?: string;
}

/**
 * A second writer of the same field: when it sees `when` as the field's value it calls
 * `setValue` from an effect, in the same flush as the field's own effects.
 */
export function SecondWriter({ handle, when, write, name = 'amount' }: SecondWriterProps): null {
  const api = handle.api;
  const value: unknown = useWatch({ control: api?.control, name });
  useEffect(() => {
    if (api && Object.is(value, when)) api.setValue(name, write);
  }, [api, value, when, write, name]);
  return null;
}

export interface DirectGroupedInputProps {
  readonly spies: DirectSpies;
  readonly initial: unknown;
  readonly readOnly?: boolean;
  readonly readOnlyMode?: ReadOnlyMode;
  readonly strict?: boolean;
  /** Changing it remounts the input only. */
  readonly inputKey?: number;
  readonly decimals?: number;
  readonly restrictInput?: boolean;
  readonly padDecimals?: boolean;
}

/** Reads the write count in a layout and a passive effect of every commit, after the input's own. */
function PhaseProbe({ spies }: { readonly spies: DirectSpies }): null {
  useLayoutEffect(() => {
    spies.phases.push({ phase: 'layout', writes: spies.onChange.length });
  });
  useEffect(() => {
    spies.phases.push({ phase: 'passive', writes: spies.onChange.length });
  });
  return null;
}

function DirectInner({
  spies,
  initial,
  readOnly,
  readOnlyMode,
  inputKey = 0,
  decimals,
  restrictInput,
  padDecimals,
}: DirectGroupedInputProps): React.ReactElement {
  const [value, setValue] = useState<unknown>(initial);
  spies.renders += 1;
  spies.setOutside = setValue;
  const field = {
    name: 'amount',
    value,
    onChange: (next: string): void => {
      spies.onChange.push(next);
      setValue(next);
    },
    onBlur: (): void => {
      spies.onBlur += 1;
    },
    ref: null,
  };
  return (
    <div>
      <label htmlFor="amount">Amount</label>
      <AmountFieldGroupedExactInput
        key={inputKey}
        field={field}
        id="amount"
        className=""
        accessibilityProps={getAccessibilityProps({
          id: 'amount',
          hasError: false,
          isRequired: false,
          hasHelperText: false,
        })}
        readOnlyState={getReadOnlyState(readOnly, readOnlyMode)}
        decimals={decimals}
        restrictInput={restrictInput}
        padDecimals={padDecimals}
      />
      <PhaseProbe spies={spies} />
      <button type="button">Elsewhere</button>
    </div>
  );
}

/**
 * The grouped input alone, driven by a spied `field` object in place of react-hook-form.
 * `field.onChange` and `field.onBlur` calls are counted exactly.
 */
export function DirectGroupedInput(props: DirectGroupedInputProps): React.ReactElement {
  return props.strict ? (
    <StrictMode>
      <DirectInner {...props} />
    </StrictMode>
  ) : (
    <DirectInner {...props} />
  );
}
