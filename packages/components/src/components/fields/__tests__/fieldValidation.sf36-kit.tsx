/**
 * 005 SF-36 · Field table and form harness for the custom-messages / custom-check tests.
 *
 * Imports only APIs that existed before SF-36 (baseline 33ae72814), so the INV-15 recorder
 * (`noOptions.sf36.test.tsx`) runs unchanged on a baseline worktree. Every SF-36 test drives
 * a field through a real `useForm` (inside a `FormProvider`, which MapField's error effect
 * needs) and reads the verdict the user would see: `trigger`, then `errors[name]`.
 * Not a test file: no `.test.` in the name, so neither vitest config collects it.
 */
/* eslint-disable react-refresh/only-export-components -- test harness, never hot-reloaded */
import { act, render } from '@testing-library/react';
import React from 'react';
import {
  FormProvider,
  useForm,
  type Control,
  type FieldError,
  type UseFormReturn,
} from 'react-hook-form';

import type { AddressingCapability, FieldValidation } from '@openzeppelin/ui-types';

import { AddressField } from '../AddressField';
import { AmountField } from '../AmountField';
import { ArrayField } from '../ArrayField';
import { ArrayObjectField } from '../ArrayObjectField';
import { BigIntField } from '../BigIntField';
import { BooleanField } from '../BooleanField';
import { BytesField } from '../BytesField';
import { DateTimeField } from '../DateTimeField';
import { EnumField, type EnumMetadata } from '../EnumField';
import { FileUploadField } from '../FileUploadField';
import { MapField } from '../MapField';
import { NumberField } from '../NumberField';
import { ObjectField } from '../ObjectField';
import { PasswordField } from '../PasswordField';
import { RadioField } from '../RadioField';
import { SearchableMultiSelectField } from '../SearchableMultiSelectField';
import { SelectField } from '../SelectField';
import { SelectGroupedField } from '../SelectGroupedField';
import { TextAreaField } from '../TextAreaField';
import { TextField } from '../TextField';
import { UrlField } from '../UrlField';

// jsdom has no ResizeObserver; Radix (BooleanField's checkbox) needs one to mount.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

export type Values = Record<string, unknown>;

/** Props the harness hands every field (`id="f"`, `name="v"`). */
export interface FieldRenderProps {
  id: string;
  name: string;
  label: string;
  control: Control<Values>;
  validation?: FieldValidation;
  readOnly?: boolean;
  readOnlyMode?: 'readonly';
}

/** A field's own validator prop returns `'Prop says no'` for this value… */
export const PROP_NO = 'prop-no';
/** …and `false` for this one (INV-11 quirk probe). */
export const PROP_FALSE = 'prop-false';
export const PROP_NO_MESSAGE = 'Prop says no';

const propValidator = (v: unknown): boolean | string => {
  const s = typeof v === 'number' ? String(v) : JSON.stringify(v);
  if (s.includes('13')) return PROP_NO_MESSAGE;
  if (s.includes('14')) return false;
  return true;
};

const ADDRESSING: AddressingCapability = {
  isValidAddress: (address: string) => /^0x[0-9a-fA-F]{40}$/.test(address),
};

export const ENUM_META: EnumMetadata = {
  name: 'Choice',
  variants: [
    { name: 'A', type: 'void' },
    { name: 'B', type: 'void' },
  ],
  isUnitOnly: true,
};

export interface Country {
  id: string;
  name: string;
}
export const COUNTRIES: readonly Country[] = [
  { id: 'ca', name: 'Canada' },
  { id: 'de', name: 'Germany' },
  { id: 'fr', name: 'France' },
  { id: 'it', name: 'Italy' },
];

export const VALID_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';

export interface FieldSpec {
  key: string;
  el: (p: FieldRenderProps) => React.ReactElement;
  /** Values the field's required branch treats as empty (design "Empty today" column). */
  empties: readonly unknown[];
  /** A non-empty value that passes every built-in layer when only `required` is set. */
  valid: unknown;
  /** Non-empty values that leave through a type fallthrough exit (INV-8, INV-12). */
  fallthroughs?: readonly unknown[];
  /** More non-empty values for the no-options corpus; some fail built-in layers. */
  others: readonly unknown[];
  /** Read-only prop sets to probe (INV-17). */
  readOnlyVariants: readonly Partial<FieldRenderProps>[];
}

const RO: Partial<FieldRenderProps> = { readOnly: true };
const RO_MODE: Partial<FieldRenderProps> = { readOnly: true, readOnlyMode: 'readonly' };

/**
 * Allowance: SearchableMultiSelectField's `readOnly` was aligned with the other fields after the
 * fixture was recorded. By default it now disables the field like TextField (rule skipped, value
 * dropped), and it gained `readOnlyMode="readonly"` (rule runs, value kept). These are the
 * records it now shares with TextField; every other field stays pinned to the fixture.
 */
export const READ_ONLY_ALIGNED: Readonly<
  Record<string, Readonly<Record<string, { requiredEmpty: string | true; submitValid: number }>>>
> = {
  SearchableMultiSelectField: {
    [JSON.stringify(RO)]: { requiredEmpty: true, submitValid: 1 },
    [JSON.stringify(RO_MODE)]: { requiredEmpty: 'This field is required', submitValid: 0 },
  },
};

const TEXT_OTHERS = ['a', 'toolongvalue12345', 'UPPER', '5', '150', '1.5'] as const;

/** Every field that takes `validation`; AmountField and EnumField once per branch. */
export const FIELDS: readonly FieldSpec[] = [
  {
    key: 'TextField',
    el: (p) => <TextField {...p} />,
    empties: ['', undefined, null],
    valid: 'hello',
    fallthroughs: [42],
    others: TEXT_OTHERS,
    readOnlyVariants: [RO, RO_MODE],
  },
  {
    key: 'TextAreaField',
    el: (p) => <TextAreaField {...p} />,
    empties: ['', undefined, null],
    valid: 'some notes',
    others: TEXT_OTHERS,
    readOnlyVariants: [RO, RO_MODE],
  },
  {
    key: 'PasswordField',
    el: (p) => <PasswordField {...p} />,
    empties: ['', undefined, null],
    valid: 'secret',
    fallthroughs: [42],
    others: TEXT_OTHERS,
    readOnlyVariants: [RO, RO_MODE],
  },
  {
    key: 'DateTimeField',
    el: (p) => <DateTimeField {...p} />,
    empties: ['', undefined, null],
    valid: '2026-01-01T10:00',
    fallthroughs: [42],
    others: ['2026-13-99', '5'],
    readOnlyVariants: [RO, RO_MODE],
  },
  {
    key: 'UrlField',
    el: (p) => <UrlField {...p} />,
    empties: ['', undefined, null],
    valid: 'https://example.com',
    others: ['not a url', 'ftp://x.y', 'example.com'],
    readOnlyVariants: [RO, RO_MODE],
  },
  {
    key: 'AddressField',
    el: (p) => <AddressField {...p} addressing={ADDRESSING} />,
    empties: ['', undefined, null],
    valid: VALID_ADDRESS,
    others: ['0xnope', 'abc'],
    readOnlyVariants: [RO, RO_MODE],
  },
  {
    key: 'BigIntField',
    el: (p) => <BigIntField {...p} validateBigInt={propValidator} />,
    empties: ['', undefined, null],
    valid: '123',
    fallthroughs: [5, BigInt(5)],
    others: ['1.5', '-', '-7', '0', '13', '14', 'abc'],
    readOnlyVariants: [RO, RO_MODE],
  },
  {
    key: 'NumberField',
    el: (p) => <NumberField {...p} validateNumber={propValidator} />,
    empties: ['', undefined, null],
    valid: '12.50',
    fallthroughs: [7, true],
    others: ['-', '1.', 'abc', '0', '150', '13', '14', 2.5],
    readOnlyVariants: [RO, RO_MODE],
  },
  {
    key: 'NumberField[min=5,max=50]',
    el: (p) => <NumberField {...p} min={5} max={50} />,
    empties: ['', undefined, null],
    valid: '12.50',
    others: ['3', '60', 4],
    readOnlyVariants: [],
  },
  {
    key: 'BytesField',
    el: (p) => <BytesField {...p} />,
    empties: ['', undefined, null],
    valid: '0xabcd',
    others: ['0xzz', 'abc', '0xabc'],
    readOnlyVariants: [RO, RO_MODE],
  },
  {
    key: 'SelectField',
    el: (p) => (
      <SelectField
        {...p}
        options={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
          { value: '13', label: 'Thirteen' },
          { value: '14', label: 'Fourteen' },
        ]}
        validateSelect={propValidator}
      />
    ),
    empties: ['', undefined, null],
    valid: 'a',
    others: ['13', '14'],
    readOnlyVariants: [RO, RO_MODE],
  },
  {
    key: 'SelectGroupedField',
    el: (p) => (
      <SelectGroupedField
        {...p}
        groups={[
          {
            label: 'Letters',
            options: [
              { value: 'a', label: 'Alpha' },
              { value: 'b', label: 'Beta' },
            ],
          },
          {
            label: 'Numbers',
            options: [
              { value: '13', label: 'Thirteen' },
              { value: '14', label: 'Fourteen' },
            ],
          },
        ]}
        validateSelect={propValidator}
      />
    ),
    empties: ['', undefined, null],
    valid: 'a',
    others: ['13', '14'],
    readOnlyVariants: [RO],
  },
  {
    key: 'RadioField',
    el: (p) => (
      <RadioField
        {...p}
        options={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
          { value: '13', label: 'Thirteen' },
          { value: '14', label: 'Fourteen' },
        ]}
        validateRadio={propValidator}
      />
    ),
    empties: ['', undefined, null],
    valid: 'a',
    others: ['13', '14'],
    readOnlyVariants: [RO],
  },
  {
    key: 'EnumField(no variants)',
    el: (p) => <EnumField {...p} />,
    empties: [undefined, null],
    valid: '{"tag":"A"}',
    fallthroughs: [{ tag: 'A' }],
    others: ['', 'nope', '{"x":1}', { x: 1 }, 'toolongvalue12345'],
    readOnlyVariants: [RO],
  },
  {
    key: 'EnumField(variants)',
    el: (p) => <EnumField {...p} enumMetadata={ENUM_META} validateEnum={propValidator} />,
    empties: [undefined, null, { tag: '' }],
    valid: { tag: 'A' },
    others: [{ tag: 'B' }, { tag: '13' }, { tag: '14' }],
    readOnlyVariants: [RO],
  },
  {
    key: 'BooleanField',
    el: (p) => <BooleanField {...p} validateBoolean={(v) => (v ? true : 'Prop says no')} />,
    empties: [undefined, null],
    valid: true,
    fallthroughs: ['yes'],
    others: [false],
    readOnlyVariants: [RO],
  },
  {
    key: 'AmountField',
    el: (p) => <AmountField {...p} validateAmount={propValidator} />,
    empties: ['', undefined, null, 'abc'],
    valid: '1.5',
    fallthroughs: [2.5],
    others: ['0', '-1', '13', '14', '1e3'],
    readOnlyVariants: [RO, RO_MODE],
  },
  {
    key: 'AmountField[min=1,max=10]',
    el: (p) => <AmountField {...p} min={1} max={10} />,
    empties: ['', undefined, null],
    valid: '1.5',
    others: ['0.5', '11'],
    readOnlyVariants: [],
  },
  {
    key: 'AmountFieldExact',
    el: (p) => (
      <AmountField {...p} formatOnBlur={false} decimals={6} validateAmount={propValidator} />
    ),
    empties: ['', undefined, null, '   '],
    valid: '1.5',
    fallthroughs: [2.5],
    others: ['1.2.3', '1.1234567', 'abc', '13', '14', '-1', '0.1'],
    readOnlyVariants: [RO, RO_MODE],
  },
  {
    key: 'AmountFieldExact[min=1,max=10]',
    el: (p) => <AmountField {...p} formatOnBlur={false} decimals={2} min="1" max="10" />,
    empties: ['', undefined, null],
    valid: '1.5',
    others: ['0.5', '11', '1.234'],
    readOnlyVariants: [],
  },
  {
    key: 'SearchableMultiSelectField',
    el: (p) => (
      <SearchableMultiSelectField<Country, Values>
        {...p}
        items={COUNTRIES}
        getItemId={(c) => c.id}
        getItemLabel={(c) => c.name}
        validateSelection={(ids) =>
          ids.includes('de') ? PROP_NO_MESSAGE : ids.includes('it') ? false : true
        }
      />
    ),
    empties: [[], undefined, null],
    valid: ['ca'],
    others: [['ca', 'fr'], ['de'], ['it']],
    readOnlyVariants: [RO, RO_MODE],
  },
  {
    key: 'ObjectField',
    el: (p) => <ObjectField {...p} components={[]} />,
    empties: [undefined, null, []],
    valid: { a: '1' },
    others: [{}],
    readOnlyVariants: [RO],
  },
  {
    key: 'ArrayField',
    el: (p) => <ArrayField {...p} elementType="text" />,
    empties: [[], undefined],
    valid: ['x'],
    others: [['x', 'y', 'z']],
    readOnlyVariants: [RO],
  },
  {
    key: 'ArrayField[minItems=2,maxItems=3]',
    el: (p) => <ArrayField {...p} elementType="text" minItems={2} maxItems={3} />,
    empties: [[]],
    valid: ['x', 'y'],
    others: [['x'], ['a', 'b', 'c', 'd']],
    readOnlyVariants: [],
  },
  {
    key: 'ArrayObjectField',
    el: (p) => <ArrayObjectField {...p} components={[]} />,
    empties: [[], undefined],
    valid: [{ a: '1' }],
    others: [[{ a: '1' }, { a: '2' }]],
    readOnlyVariants: [RO],
  },
  {
    key: 'ArrayObjectField[minItems=2]',
    el: (p) => <ArrayObjectField {...p} components={[]} minItems={2} maxItems={2} />,
    empties: [[]],
    valid: [{ a: '1' }, { a: '2' }],
    others: [[{ a: '1' }], [{ a: '1' }, { a: '2' }, { a: '3' }]],
    readOnlyVariants: [],
  },
  {
    key: 'MapField',
    el: (p) => <MapField {...p} />,
    empties: [[], [{ key: '', value: '' }], undefined],
    valid: [{ key: 'k', value: 'v' }],
    others: [
      [
        { key: 'k', value: 'v' },
        { key: 'k', value: 'w' },
      ],
      [{ key: 'k', value: '' }],
      [
        { key: 'a', value: '1' },
        { key: 'b', value: '2' },
      ],
    ],
    readOnlyVariants: [RO],
  },
  {
    key: 'MapField[minItems=2]',
    el: (p) => <MapField {...p} minItems={2} />,
    empties: [[]],
    valid: [
      { key: 'a', value: '1' },
      { key: 'b', value: '2' },
    ],
    others: [[{ key: 'k', value: 'v' }]],
    readOnlyVariants: [],
  },
  {
    key: 'FileUploadField',
    el: (p) => <FileUploadField {...p} />,
    empties: ['', null, undefined],
    valid: 'data:text/plain;base64,aGk=',
    others: ['x'],
    readOnlyVariants: [RO],
  },
];

/** The fields the design table lists (no prop variants). */
export const BASE_FIELDS: readonly FieldSpec[] = FIELDS.filter((f) => !f.key.includes('['));

export const fieldSpec = (key: string): FieldSpec => {
  const spec = FIELDS.find((f) => f.key === key);
  if (!spec) throw new Error(`unknown field ${key}`);
  return spec;
};

/** Stable printable label for a corpus value (bigint and undefined included). */
export function valueLabel(v: unknown): string {
  if (v === undefined) return 'undefined';
  if (typeof v === 'bigint') return `${v}n`;
  if (typeof v === 'number') return `num:${v}`;
  return JSON.stringify(v);
}

/** Recorded when RHF holds an error for `v` with no message anywhere. */
export const NO_MESSAGE = '<error without message>';

export interface FormHandle {
  api: UseFormReturn<Values> | null;
}

export interface MountOptions {
  value?: unknown;
  validation?: FieldValidation;
  props?: Partial<FieldRenderProps>;
  mode?: 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched' | 'all';
  after?: React.ReactNode;
  /** Called on every host render. */
  onRender?: () => void;
}

interface HostProps {
  handle: FormHandle;
  defaultValues: Values;
  mode: MountOptions['mode'];
  onRender?: () => void;
  children: (control: Control<Values>) => React.ReactNode;
}

function Host({ handle, defaultValues, mode, onRender, children }: HostProps): React.ReactElement {
  const api = useForm<Values>({ defaultValues, mode });
  handle.api = api;
  onRender?.();
  // Subscribe so error changes re-render the host as an app's form would.
  void api.formState.errors;
  return (
    <FormProvider {...api}>
      <form
        data-testid="host"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        {children(api.control)}
      </form>
    </FormProvider>
  );
}

export interface SubmitResult {
  valid: number;
  invalid: number;
  data: Values | null;
}

export interface MountedField {
  api: () => UseFormReturn<Values>;
  /** Rerender with options merged in; the field stays mounted. */
  set: (next: Partial<MountOptions>) => void;
  /** `trigger('v')`, then the error the form holds: its message, or `true` for none. */
  verdict: () => Promise<true | string>;
  submit: () => Promise<SubmitResult>;
  /**
   * The error message RHF currently holds for `v`, or `true`. A field-array root keeps its
   * rule error at `errors.v.root` (RHF), so that is read too.
   */
  current: () => true | string;
  /**
   * Text of the field's error elements (every `[id$="-error"]` in the form, joined with
   * ` | `; FileUploadField's is `#f-field-error`), or `null` when none is rendered.
   */
  shown: () => string | null;
  container: HTMLElement;
  unmount: () => void;
}

/** Mount one field (`id="f"`, `name="v"`) in its own form. */
export function mountField(spec: FieldSpec, initial: MountOptions = {}): MountedField {
  const handle: FormHandle = { api: null };
  let opts: MountOptions = { ...initial };
  const defaultValues: Values = 'value' in initial ? { v: initial.value } : { v: undefined };

  const ui = (): React.ReactElement => (
    <Host handle={handle} defaultValues={defaultValues} mode={opts.mode} onRender={opts.onRender}>
      {(control) => (
        <>
          {spec.el({
            id: 'f',
            name: 'v',
            label: 'Label',
            control,
            validation: opts.validation,
            ...opts.props,
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
  const current = (): true | string => {
    const error = api().getFieldState('v').error as
      | (FieldError & { root?: FieldError })
      | undefined;
    if (!error) return true;
    return error.message || error.root?.message || NO_MESSAGE;
  };
  return {
    api,
    container: r.container,
    set: (next) => {
      opts = { ...opts, ...next };
      act(() => {
        r.rerender(ui());
      });
    },
    verdict: async () => {
      await act(async () => {
        await api().trigger('v');
      });
      return current();
    },
    current,
    shown: () => {
      const texts = Array.from(r.container.querySelectorAll('[id$="-error"]')).map(
        (el) => el.textContent ?? ''
      );
      return texts.length === 0 ? null : texts.join(' | ');
    },
    submit: async () => {
      const result: SubmitResult = { valid: 0, invalid: 0, data: null };
      await act(async () => {
        await api().handleSubmit(
          (data) => {
            result.valid += 1;
            result.data = data;
          },
          () => {
            result.invalid += 1;
          }
        )();
      });
      return result;
    },
    unmount: r.unmount,
  };
}

/** What one submit leaves behind: the rule's message (or `true`) and the text on screen. */
export interface Outcome {
  verdict: true | string;
  shown: string | null;
}

/** Mount, submit once, read the verdict and the shown error, unmount. */
export async function outcomeOf(
  spec: FieldSpec,
  value: unknown,
  validation?: FieldValidation,
  props?: Partial<FieldRenderProps>
): Promise<Outcome> {
  const m = mountField(spec, { value, validation, props });
  try {
    await m.submit();
    return { verdict: m.current(), shown: m.shown() };
  } finally {
    m.unmount();
  }
}

/** Mount, take one verdict, unmount. */
export async function verdictOf(
  spec: FieldSpec,
  value: unknown,
  validation?: FieldValidation,
  props?: Partial<FieldRenderProps>
): Promise<true | string> {
  const m = mountField(spec, { value, validation, props });
  try {
    return await m.verdict();
  } finally {
    m.unmount();
  }
}

/** Validation configs for the no-options corpus (INV-15). None sets `messages` or `validate`. */
export const NO_OPTION_VALIDATIONS: Readonly<Record<string, FieldValidation | undefined>> = {
  none: undefined,
  empty: {},
  required: { required: true },
  rules: {
    required: true,
    minLength: 2,
    maxLength: 12,
    pattern: '^[a-z0-9.x]+$',
    min: 1,
    max: 100,
  },
  optionalRules: { minLength: 2, maxLength: 12, pattern: /^[a-z0-9.x]+$/, min: 1, max: 100 },
};
