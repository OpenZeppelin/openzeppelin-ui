/**
 * 005 SF-19 · Shared harness for the focusable read-only mode tests (jsdom and Chromium).
 *
 * One form per mounted field, `readOnly` / `readOnlyMode` switchable with `rerender` so the
 * field (and the form) stay mounted across the switch, the way an app's save flow does it.
 * Not a test file: no `.test.` in the name, so neither vitest config collects it.
 */
/* eslint-disable react-refresh/only-export-components -- test harness, never hot-reloaded */
import { act, render } from '@testing-library/react';
import React from 'react';
import { useForm, type Control, type UseFormReturn } from 'react-hook-form';

import type { FieldValidation } from '@openzeppelin/ui-types';

import { AddressField } from '../AddressField';
import { AmountField } from '../AmountField';
import type { ReadOnlyMode } from '../BaseField';
import { BigIntField } from '../BigIntField';
import { BytesField } from '../BytesField';
import { DateTimeField } from '../DateTimeField';
import { NumberField } from '../NumberField';
import { PasswordField } from '../PasswordField';
import { TextAreaField } from '../TextAreaField';
import { TextField } from '../TextField';
import { UrlField } from '../UrlField';

export type Values = Record<string, unknown>;

/** Props every supported field accepts; the harness renders each field with exactly these. */
export interface CommonFieldProps {
  id: string;
  name: string;
  label: string;
  helperText?: string;
  control: Control<Values>;
  readOnly?: boolean;
  readOnlyMode?: ReadOnlyMode;
  validation?: FieldValidation;
}

export type FieldKey =
  | 'TextField'
  | 'TextAreaField'
  | 'NumberField'
  | 'BigIntField'
  | 'AmountField'
  | 'AmountFieldExact'
  | 'UrlField'
  | 'PasswordField'
  | 'BytesField'
  | 'AddressField'
  | 'DateTimeField';

export interface FieldSpec {
  key: FieldKey;
  /** A valid value, used as the default value (same values as the INV-1 baseline). */
  value: unknown;
  /** What the control shows for `value`. */
  display: string;
  /** Element the control is. */
  tag: 'INPUT' | 'TEXTAREA';
  /** Whether a text selection range can be set on the control (not on datetime-local). */
  selectable: boolean;
  /** Whether Escape clears the value in editable mode today. */
  escapeClears: boolean;
  el: (p: CommonFieldProps) => React.ReactElement;
}

/** The ten supported fields; AmountField twice (default branch and SF-10 exact branch). */
export const FIELDS: readonly FieldSpec[] = [
  {
    key: 'TextField',
    value: 'hello',
    display: 'hello',
    tag: 'INPUT',
    selectable: true,
    escapeClears: true,
    el: (p) => <TextField {...p} />,
  },
  {
    key: 'TextAreaField',
    value: 'multi line',
    display: 'multi line',
    tag: 'TEXTAREA',
    selectable: true,
    escapeClears: true,
    el: (p) => <TextAreaField {...p} />,
  },
  {
    key: 'NumberField',
    value: 5,
    display: '5',
    tag: 'INPUT',
    selectable: true,
    escapeClears: true,
    el: (p) => <NumberField {...p} />,
  },
  {
    key: 'BigIntField',
    value: '123',
    display: '123',
    tag: 'INPUT',
    selectable: true,
    escapeClears: true,
    el: (p) => <BigIntField {...p} />,
  },
  {
    key: 'AmountField',
    value: '1.5',
    display: '1.5',
    tag: 'INPUT',
    selectable: true,
    escapeClears: true,
    el: (p) => <AmountField {...p} />,
  },
  {
    key: 'AmountFieldExact',
    value: '1.5',
    display: '1.5',
    tag: 'INPUT',
    selectable: true,
    escapeClears: true,
    el: (p) => <AmountField {...p} formatOnBlur={false} />,
  },
  {
    key: 'UrlField',
    value: 'https://example.com',
    display: 'https://example.com',
    tag: 'INPUT',
    selectable: true,
    escapeClears: true,
    el: (p) => <UrlField {...p} />,
  },
  {
    key: 'PasswordField',
    value: 'secret',
    display: 'secret',
    tag: 'INPUT',
    selectable: true,
    escapeClears: true,
    el: (p) => <PasswordField {...p} />,
  },
  {
    key: 'BytesField',
    value: '0xabcd',
    display: '0xabcd',
    tag: 'TEXTAREA',
    selectable: true,
    escapeClears: true,
    el: (p) => <BytesField {...p} />,
  },
  {
    key: 'AddressField',
    value: '0x1234567890abcdef1234567890abcdef12345678',
    display: '0x1234567890abcdef1234567890abcdef12345678',
    tag: 'INPUT',
    selectable: true,
    escapeClears: true,
    el: (p) => <AddressField {...p} />,
  },
  {
    key: 'DateTimeField',
    value: '2026-01-01T10:00',
    display: '2026-01-01T10:00',
    tag: 'INPUT',
    selectable: false,
    escapeClears: true,
    el: (p) => <DateTimeField {...p} />,
  },
];

export const fieldSpec = (key: FieldKey): FieldSpec => {
  const spec = FIELDS.find((f) => f.key === key);
  if (!spec) throw new Error(`unknown field ${key}`);
  return spec;
};

/** Live view of the form a mounted field belongs to. */
export interface FormHandle {
  api: UseFormReturn<Values> | null;
}

export interface MountOptions {
  readOnly?: boolean;
  readOnlyMode?: ReadOnlyMode;
  /** Default value for the field's name `v`; the spec's `value` when omitted. */
  value?: unknown;
  validation?: FieldValidation;
  helperText?: string;
  formMode?: 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched' | 'all';
  /** Rendered after the field inside the form, e.g. extra fields or a submit button. */
  after?: React.ReactNode;
  onFormKeyDown?: (event: React.KeyboardEvent<HTMLFormElement>) => void;
  onNativeSubmit?: () => void;
}

interface HostProps {
  handle: FormHandle;
  defaultValues: Values;
  formMode: MountOptions['formMode'];
  onFormKeyDown?: MountOptions['onFormKeyDown'];
  onNativeSubmit?: MountOptions['onNativeSubmit'];
  children: (control: Control<Values>) => React.ReactNode;
}

/** A form host; `useForm` only reads `defaultValues` once, so rerendering with new props is safe. */
export function Host({
  handle,
  defaultValues,
  formMode,
  onFormKeyDown,
  onNativeSubmit,
  children,
}: HostProps): React.ReactElement {
  const api = useForm<Values>({ defaultValues, mode: formMode });
  handle.api = api;
  return (
    <form
      data-testid="host"
      onKeyDown={onFormKeyDown}
      onSubmit={(e) => {
        e.preventDefault();
        onNativeSubmit?.();
      }}
    >
      {children(api.control)}
    </form>
  );
}

export interface SubmitResult {
  valid: boolean;
  data: Values | null;
}

export interface MountedField {
  handle: FormHandle;
  api: () => UseFormReturn<Values>;
  /** The field's control (`#f`). */
  control: () => HTMLInputElement | HTMLTextAreaElement;
  host: () => HTMLElement;
  /** Re-render with the given options merged in; the field stays mounted. */
  set: (next: Partial<MountOptions>) => void;
  /** Run `handleSubmit` and report whether `onValid` ran and with what data. */
  submit: () => Promise<SubmitResult>;
  unmount: () => void;
}

/** Render one supported field (`id="f"`, `name="v"`) in its own form. */
export function mountField(
  spec: FieldSpec,
  initial: MountOptions = {},
  renderField: (p: CommonFieldProps) => React.ReactElement = spec.el
): MountedField {
  const handle: FormHandle = { api: null };
  let opts: MountOptions = { helperText: 'Help', ...initial };
  const defaultValues: Values = { v: 'value' in initial ? initial.value : spec.value };

  const ui = (): React.ReactElement => (
    <Host
      handle={handle}
      defaultValues={defaultValues}
      formMode={opts.formMode}
      onFormKeyDown={opts.onFormKeyDown}
      onNativeSubmit={opts.onNativeSubmit}
    >
      {(control) => (
        <>
          {renderField({
            id: 'f',
            name: 'v',
            label: 'Label',
            helperText: opts.helperText,
            control,
            readOnly: opts.readOnly,
            readOnlyMode: opts.readOnlyMode,
            validation: opts.validation,
          })}
          {opts.after}
        </>
      )}
    </Host>
  );

  const r = render(ui());
  const api = (): UseFormReturn<Values> => {
    if (!handle.api) throw new Error('form not mounted');
    return handle.api;
  };
  return {
    handle,
    api,
    control: () => {
      const el = document.getElementById('f');
      if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) {
        throw new Error(`#f is not a text control: ${el?.tagName}`);
      }
      return el;
    },
    host: () => r.getByTestId('host'),
    set: (next) => {
      opts = { ...opts, ...next };
      act(() => {
        r.rerender(ui());
      });
    },
    submit: async () => {
      const result: SubmitResult = { valid: false, data: null };
      await act(async () => {
        await api().handleSubmit(
          (data) => {
            result.valid = true;
            result.data = data;
          },
          () => {
            result.valid = false;
          }
        )();
      });
      return result;
    },
    unmount: r.unmount,
  };
}

/** Readonly mode on. */
export const READONLY: MountOptions = { readOnly: true, readOnlyMode: 'readonly' };
/** Readonly mode off but opted in (`readOnly` false). */
export const EDITABLE_OPTED_IN: MountOptions = { readOnly: false, readOnlyMode: 'readonly' };

/** The four look tokens SF-19 appends to the base Input / Textarea class string (INV-1, INV-3). */
export const LOOK_TOKEN = /\s?data-readonly:read-only:not-disabled:[\w-]+/g;
export const stripLook = (html: string): string => html.replace(LOOK_TOKEN, '');

/** All attributes of an element as a plain map. */
export function attrs(el: Element): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of Array.from(el.attributes)) out[a.name] = a.value;
  return out;
}
