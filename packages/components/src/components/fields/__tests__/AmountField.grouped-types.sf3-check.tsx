/**
 * 007 SF-3 INV-8 type contract for `groupedDisplay`. Compile-only fixture: `pnpm
 * typecheck` (tsc --noEmit over `src/**`) compiles it, and each `@ts-expect-error` fails
 * the build if its line ever stops being an error. Never imported at runtime; never
 * exported from the package.
 */
import type { Control } from 'react-hook-form';

import {
  AmountField,
  type AmountFieldExactProps as EntryExactProps,
  type AmountFieldProps as EntryProps,
} from '../../../index';

declare const control: Control<{ amount: string }>;
declare const flag: boolean;
const base = { id: 'a', name: 'amount' as const, label: 'A', control };

// Exact mode: the prop is optional and takes any boolean.
export const on = <AmountField {...base} formatOnBlur={false} allowGrouping groupedDisplay />;
export const off = (
  <AmountField {...base} formatOnBlur={false} allowGrouping groupedDisplay={false} />
);
export const omitted = <AmountField {...base} formatOnBlur={false} allowGrouping />;
// No discriminated union on the pair: both may be runtime booleans, in any combination.
export const bothFlags = (
  <AmountField {...base} formatOnBlur={false} allowGrouping={flag} groupedDisplay={flag} />
);
export const withoutGrouping = <AmountField {...base} formatOnBlur={false} groupedDisplay />;
export const groupingOff = (
  <AmountField {...base} formatOnBlur={false} allowGrouping={false} groupedDisplay />
);

// Default mode: only the literal `false` (or nothing) is accepted.
export const defaultFalse = <AmountField {...base} groupedDisplay={false} />;
export const defaultExplicit = <AmountField {...base} formatOnBlur groupedDisplay={false} />;

// @ts-expect-error groupedDisplay needs formatOnBlur={false}
export const e1 = <AmountField {...base} groupedDisplay />;
// @ts-expect-error groupedDisplay with formatOnBlur={true}
export const e2 = <AmountField {...base} formatOnBlur groupedDisplay />;
// @ts-expect-error a runtime boolean is not `false` in default mode
export const e3 = <AmountField {...base} groupedDisplay={flag} />;
const exact = { ...base, formatOnBlur: false as const, allowGrouping: true };
// @ts-expect-error groupedDisplay must be a boolean
export const e4 = <AmountField {...exact} groupedDisplay="true" />;
// @ts-expect-error groupedDisplay must be a boolean
export const e5 = <AmountField {...exact} groupedDisplay={1} />;
// @ts-expect-error null is not a boolean
export const e6 = <AmountField {...exact} groupedDisplay={null} />;

// The declared types, read from the package entry.
type Assert<T extends true> = T;
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export type ExactPropIsOptionalBoolean = Assert<
  Same<EntryExactProps['groupedDisplay'], boolean | undefined>
>;
export type DefaultPropIsFalseOnly = Assert<Same<EntryProps['groupedDisplay'], false | undefined>>;

// 006-shaped callers (no groupedDisplay) are compiled, unchanged, by `AmountField.types.sf10-check.tsx`.
