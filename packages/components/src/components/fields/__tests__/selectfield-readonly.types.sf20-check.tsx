/**
 * 005 SF-20 INV-9 type contract. Compile-only fixture: `pnpm typecheck` (tsc --noEmit over
 * `src/**`) compiles it, and each `@ts-expect-error` fails the build if its line ever stops being
 * an error. Never imported at runtime; never exported from the package.
 */
import type * as SelectPrimitive from '@radix-ui/react-select';
import type { ComponentPropsWithoutRef, ComponentPropsWithRef } from 'react';
import type { Control, FieldValues } from 'react-hook-form';

import {
  SelectField,
  SelectTrigger,
  type BaseFieldProps,
  type LabelEndProps,
  type ReadOnlyMode,
  type ReadOnlyModeProps,
  type SelectFieldProps,
  type SelectGroupedFieldProps,
} from '../../../index';

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const is = <T extends true>(): T => true as T;

/** `true` when P declares `readOnlyMode`. */
type HasMode<P> = 'readOnlyMode' extends keyof P ? true : false;

type Props = SelectFieldProps<FieldValues>;

export const surface = [
  // readOnlyMode is optional and typed as SF-19's ReadOnlyMode.
  is<Equals<Props['readOnlyMode'], ReadOnlyMode | undefined>>(),
  is<Props extends ReadOnlyModeProps ? true : false>(),
  // Exactly the pre-SF-20 keys plus ReadOnlyModeProps: no other prop was added.
  is<
    Equals<
      keyof Props,
      | keyof BaseFieldProps<FieldValues>
      | keyof LabelEndProps
      | keyof ReadOnlyModeProps
      | 'options'
      | 'validateSelect'
      | 'defaultValue'
    >
  >(),
  // SelectGroupedField is out of scope (D-8): no readOnlyMode.
  is<Equals<HasMode<SelectGroupedFieldProps<FieldValues>>, false>>(),
  // SelectTrigger gained no prop: still exactly Radix's trigger props (plus its ref).
  is<
    Equals<
      ComponentPropsWithoutRef<typeof SelectTrigger>,
      ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
    >
  >(),
  is<Equals<HasMode<ComponentPropsWithRef<typeof SelectTrigger>>, false>>(),
];

declare const control: Control<{ role: string }>;
const base = { id: 'role', name: 'role' as const, label: 'Role', control };

export const ok = [
  <SelectField key="1" {...base} readOnly readOnlyMode="readonly" />,
  <SelectField key="2" {...base} readOnly readOnlyMode="disabled" />,
  <SelectField key="3" {...base} readOnly />,
  <SelectField key="4" {...base} />,
];

export const bad = [
  // @ts-expect-error -- only 'disabled' | 'readonly' are accepted
  <SelectField key="1" {...base} readOnly readOnlyMode="locked" />,
  // @ts-expect-error -- the mode is a string union, not a boolean
  <SelectField key="2" {...base} readOnly readOnlyMode />,
];
