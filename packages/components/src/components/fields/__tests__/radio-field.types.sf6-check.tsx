/**
 * RadioField card / segmented / read-only type contract (INV-9). Compile-only fixture:
 * `pnpm typecheck` (tsc --noEmit over `src/**`) compiles it, and each `@ts-expect-error` fails the
 * build if its line ever stops being an error. Never imported at runtime; never exported from the
 * package. The runtime half (export names unchanged) is in `radio-field.baseline.sf6.test.tsx`.
 */
import type { Control } from 'react-hook-form';

import {
  RadioField,
  type RadioFieldProps,
  type RadioGroupItemProps,
  type RadioGroupProps,
  type RadioOption,
  type ReadOnlyMode,
} from '../../../index';
import type { RadioGroupVariant } from '../../ui/radio-group';

/** Compile-time equality: only `true` is assignable when A and B are the same type. */
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const is = <T extends true>(): T | undefined => undefined;

export const surface = [
  // The variant union is exactly the three variants.
  is<Equals<RadioFieldProps['variant'], 'default' | 'card' | 'segmented' | undefined>>(),
  // The read-only mode is the shared kit type.
  is<Equals<RadioFieldProps['readOnlyMode'], ReadOnlyMode | undefined>>(),
  is<Equals<RadioFieldProps['readOnly'], boolean | undefined>>(),
  // `layout` is unchanged.
  is<Equals<RadioFieldProps['layout'], 'horizontal' | 'vertical' | undefined>>(),
  // RadioOption is unchanged: value, label, optional description and disabled.
  is<
    Equals<RadioOption, { value: string; label: string; description?: string; disabled?: boolean }>
  >(),
  // RadioGroup's variant type is unchanged and is what RadioGroup takes.
  is<Equals<RadioGroupVariant, 'default' | 'card' | 'segmented'>>(),
  is<Equals<RadioGroupProps['variant'], RadioGroupVariant | undefined>>(),
  // RadioGroupItem gained no read-only prop (read-only is RadioField-only).
  is<Equals<'readOnlyMode' extends keyof RadioGroupItemProps ? true : false, false>>(),
  is<Equals<'readOnlyMode' extends keyof RadioGroupProps ? true : false, false>>(),
];

declare const control: Control<{ v: string }>;
const base = { id: 'f', name: 'v' as const, label: 'L', control, options: [] };

export const ok = [
  <RadioField key="1" {...base} variant="segmented" />,
  <RadioField key="2" {...base} variant="card" layout="horizontal" />,
  <RadioField key="3" {...base} readOnly readOnlyMode="readonly" />,
  <RadioField key="4" {...base} variant="segmented" readOnly readOnlyMode="disabled" />,
  // 006-tip call shapes still compile (SC-005).
  <RadioField key="5" {...base} />,
  <RadioField key="6" {...base} variant="card" readOnly />,
];

export const bad = [
  // @ts-expect-error -- no variant beyond the three
  <RadioField key="1" {...base} variant="pill" />,
  // @ts-expect-error -- the mode is a string union, not a boolean
  <RadioField key="2" {...base} readOnly readOnlyMode />,
  // @ts-expect-error -- only 'disabled' | 'readonly' are accepted
  <RadioField key="3" {...base} readOnly readOnlyMode="focusable" />,
  // @ts-expect-error -- no field-level disabled prop (per-option `disabled` only)
  <RadioField key="4" {...base} disabled />,
];
