/**
 * 005 SF-19 INV-9 type contract. Compile-only fixture: `pnpm typecheck` (tsc --noEmit over
 * `src/**`) compiles it, and each `@ts-expect-error` fails the build if its line ever stops being
 * an error. Never imported at runtime; never exported from the package.
 */
import type { ComponentProps } from 'react';
import type { Control } from 'react-hook-form';

import {
  AmountField,
  TextField,
  type AddressFieldProps,
  type AddressListFieldProps,
  type AmountFieldExactProps,
  type AmountFieldProps,
  type ArrayFieldProps,
  type ArrayObjectFieldProps,
  type BaseFieldProps,
  type BigIntFieldProps,
  type BooleanFieldProps,
  type BytesFieldProps,
  type DateTimeFieldProps,
  type EnumFieldProps,
  type FileUploadFieldProps,
  type InputProps,
  type MapFieldProps,
  type NumberFieldProps,
  type ObjectFieldProps,
  type PasswordFieldProps,
  type RadioFieldProps,
  type ReadOnlyMode,
  type ReadOnlyModeProps,
  type TextAreaFieldProps,
  type TextareaProps,
  type TextFieldProps,
  type UrlField,
} from '../../../index';
import type { CodeEditorFieldProps } from '../CodeEditorField';

/** `true` when P declares `readOnlyMode`. */
type HasMode<P> = 'readOnlyMode' extends keyof P ? true : false;
/** Compile-time equality: only `true` is assignable when A and B are the same type. */
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const is = <T extends true>(): T | undefined => undefined;

// The public types are exactly what the design names.
export const modeUnion = is<Equals<ReadOnlyMode, 'disabled' | 'readonly'>>();
export const modeProps = is<Equals<ReadOnlyModeProps, { readOnlyMode?: ReadOnlyMode }>>();

// The ten supported fields (AmountField on both union branches) accept readOnlyMode, typed.
export const supported = [
  is<Equals<TextFieldProps['readOnlyMode'], ReadOnlyMode | undefined>>(),
  is<Equals<TextAreaFieldProps['readOnlyMode'], ReadOnlyMode | undefined>>(),
  is<Equals<NumberFieldProps['readOnlyMode'], ReadOnlyMode | undefined>>(),
  is<Equals<BigIntFieldProps['readOnlyMode'], ReadOnlyMode | undefined>>(),
  is<Equals<AmountFieldProps['readOnlyMode'], ReadOnlyMode | undefined>>(),
  is<Equals<AmountFieldExactProps['readOnlyMode'], ReadOnlyMode | undefined>>(),
  is<Equals<ComponentProps<typeof UrlField>['readOnlyMode'], ReadOnlyMode | undefined>>(),
  is<Equals<PasswordFieldProps['readOnlyMode'], ReadOnlyMode | undefined>>(),
  is<Equals<BytesFieldProps['readOnlyMode'], ReadOnlyMode | undefined>>(),
  is<Equals<AddressFieldProps['readOnlyMode'], ReadOnlyMode | undefined>>(),
  is<Equals<DateTimeFieldProps['readOnlyMode'], ReadOnlyMode | undefined>>(),
];

// Nowhere else: not on BaseFieldProps, not on the other fields, not on Input / Textarea.
export const unsupported = [
  is<Equals<HasMode<BaseFieldProps>, false>>(),
  is<Equals<HasMode<BooleanFieldProps>, false>>(),
  is<Equals<HasMode<RadioFieldProps>, false>>(),
  is<Equals<HasMode<EnumFieldProps>, false>>(),
  // SelectField / SelectGroupedField are deliberately not pinned here: SF-20 adds readOnlyMode to
  // them and owns that type contract.
  is<Equals<HasMode<FileUploadFieldProps>, false>>(),
  is<Equals<HasMode<CodeEditorFieldProps>, false>>(),
  is<Equals<HasMode<ArrayFieldProps>, false>>(),
  is<Equals<HasMode<ArrayObjectFieldProps>, false>>(),
  is<Equals<HasMode<ObjectFieldProps>, false>>(),
  is<Equals<HasMode<MapFieldProps>, false>>(),
  is<Equals<HasMode<AddressListFieldProps>, false>>(),
  is<Equals<HasMode<InputProps>, false>>(),
  is<Equals<HasMode<TextareaProps>, false>>(),
];

declare const control: Control<{ v: string }>;
const base = { id: 'f', name: 'v' as const, label: 'L', control };

export const ok = [
  <TextField key="1" {...base} readOnly readOnlyMode="readonly" />,
  <TextField key="2" {...base} readOnly readOnlyMode="disabled" />,
  <AmountField key="3" {...base} readOnly readOnlyMode="readonly" />,
  <AmountField key="4" {...base} formatOnBlur={false} readOnly readOnlyMode="readonly" />,
];

export const bad = [
  // @ts-expect-error -- only 'disabled' | 'readonly' are accepted
  <TextField key="1" {...base} readOnly readOnlyMode="focusable" />,
  // @ts-expect-error -- the mode is a string union, not a boolean
  <TextField key="2" {...base} readOnly readOnlyMode />,
];
