/**
 * 005 SF-10 INV-6 type contract. Compile-only fixture: `pnpm typecheck` (tsc --noEmit
 * over `src/**`) compiles it, and each `@ts-expect-error` fails the build if its line
 * ever stops being an error. Never imported at runtime; never exported from the package.
 */
import type { ComponentType } from 'react';
import type { Control, FieldValues } from 'react-hook-form';

import type { DynamicFormContextProps } from '@openzeppelin/ui-types';

import {
  AmountField,
  type AmountFieldExactProps as EntryExactProps,
  type AmountFieldProps as EntryProps,
} from '../../../index';
import type { BaseFieldProps } from '../BaseField';

declare const control: Control<{ amount: string }>;
const base = { id: 'a', name: 'amount' as const, label: 'A', control };

// Existing callers compile unchanged; validateAmount is contextually `number`.
export const existing = (
  <AmountField
    {...base}
    min={0}
    max={10}
    step={0.1}
    decimals={6}
    validateAmount={(v) => v.toFixed(2) !== ''}
  />
);
export const explicitTrue = <AmountField {...base} formatOnBlur />;
export const explicitTrueNoGrouping = <AmountField {...base} formatOnBlur allowGrouping={false} />;

// Exact callers: string or number bounds; validateAmount contextually `string`.
export const exact = (
  <AmountField
    {...base}
    formatOnBlur={false}
    allowGrouping
    min="0"
    max={1e21}
    validateAmount={(v) => v.startsWith('-') || 'negative only'}
  />
);

// @ts-expect-error allowGrouping needs formatOnBlur={false}
export const e1 = <AmountField {...base} allowGrouping />;
// @ts-expect-error allowGrouping with formatOnBlur={true}
export const e1b = <AmountField {...base} formatOnBlur allowGrouping />;
// @ts-expect-error a string min in default mode
export const e2 = <AmountField {...base} min="0" />;
// @ts-expect-error a string max in default mode
export const e2b = <AmountField {...base} max="10" />;
// @ts-expect-error step in exact mode
export const e3 = <AmountField {...base} formatOnBlur={false} step={1} />;
const numberValidator = (v: number): boolean => v > 0;
const stringValidator = (v: string): boolean => v !== '';
// @ts-expect-error a number validator in exact mode
export const e4 = <AmountField {...base} formatOnBlur={false} validateAmount={numberValidator} />;
// @ts-expect-error a string validator in default mode
export const e5 = <AmountField {...base} validateAmount={stringValidator} />;
// @ts-expect-error formatOnBlur must be a boolean literal of the union
export const e6 = <AmountField {...base} formatOnBlur="false" />;

// `extends AmountFieldProps` still compiles; both names come from the package entry.
export interface ExtendedProps extends EntryProps {
  extra?: string;
}
export type ExactAlias = EntryExactProps<FieldValues>;
export const exactShape: Pick<EntryExactProps, 'formatOnBlur'> = { formatOnBlur: false };

// The renderer's registry shape still accepts AmountField.
export const registry: ComponentType<BaseFieldProps & DynamicFormContextProps> = AmountField;
