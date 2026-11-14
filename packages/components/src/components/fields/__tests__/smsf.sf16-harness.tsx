/**
 * 005 SF-16 test harness: one SearchableMultiSelectField in a react-hook-form form.
 * Exports components only (fast refresh rule); data, handle and lookups live in
 * `smsf.sf16-kit.ts`. Test fixture only; never exported from the package.
 */
import React from 'react';
import { useForm, type FieldValues, type Mode } from 'react-hook-form';

import {
  SearchableMultiSelectField,
  type SearchableMultiSelectFieldProps,
} from '../SearchableMultiSelectField';
import {
  COUNTRIES,
  countryId,
  countryLabel,
  FIELD_ID,
  FIELD_NAME,
  type Country,
  type FieldHandle,
} from './smsf.sf16-kit';

export type FieldOptions = Partial<
  Omit<SearchableMultiSelectFieldProps<Country, FieldValues>, 'control' | 'name' | 'id'>
>;

export interface FieldHarnessProps {
  readonly handle: FieldHandle;
  readonly options?: FieldOptions;
  readonly defaultValues?: FieldValues;
  readonly mode?: Mode;
  readonly reValidateMode?: Exclude<Mode, 'onTouched' | 'all'>;
  /** Render a required text input before the field (INV-17 registration order). */
  readonly textFirst?: boolean;
  /** Render the field at all (INV-23 unmount). */
  readonly show?: boolean;
  /** Called on every harness render (INV-22 sibling render counting). */
  readonly onSiblingRender?: () => void;
}

/** Stands in for a sibling field: renders exactly when the form host re-renders. */
function Sibling({ onRender }: { readonly onRender?: () => void }): React.ReactElement {
  onRender?.();
  return <span data-testid="sibling" />;
}

/**
 * Form: optional required text input → the field → Submit → an "After" button to Tab to.
 * Subscribes to `touchedFields`, `errors` and `isDirty` so RHF re-renders on those.
 */
export function FieldHarness({
  handle,
  options = {},
  defaultValues = { [FIELD_NAME]: [] },
  mode = 'onSubmit',
  reValidateMode,
  textFirst = false,
  show = true,
  onSiblingRender,
}: FieldHarnessProps): React.ReactElement {
  const form = useForm<FieldValues>({
    defaultValues,
    mode,
    ...(reValidateMode ? { reValidateMode } : {}),
  });
  handle.api = form;
  // Read during render so react-hook-form's proxy subscribes to these.
  void form.formState.touchedFields;
  void form.formState.errors;
  void form.formState.isDirty;

  return (
    <form
      onSubmit={(event) => {
        handle.nativeSubmits += 1;
        void form.handleSubmit(
          (values) => {
            handle.submits.push(values);
          },
          () => {
            handle.invalids += 1;
          }
        )(event);
      }}
    >
      {textFirst && <input aria-label="First" {...form.register('first', { required: true })} />}
      {show && (
        <SearchableMultiSelectField<Country, FieldValues>
          id={FIELD_ID}
          name={FIELD_NAME}
          label="Allowed countries"
          control={form.control}
          items={COUNTRIES}
          getItemId={countryId}
          getItemLabel={countryLabel}
          {...options}
        />
      )}
      <Sibling onRender={onSiblingRender} />
      <button type="submit">Submit</button>
      <button type="button">After</button>
    </form>
  );
}
