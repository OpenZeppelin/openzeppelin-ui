/**
 * 007 SF-2 INV-9 type contract for the symbol. Compile-only fixture: `pnpm typecheck`
 * (tsc --noEmit over `src/**`) compiles it; each `Expect<Equal<…>>` and `@ts-expect-error`
 * fails the build if the type drifts. Never imported at runtime; never exported from the
 * package.
 *
 * Public `AmountFieldProps` keep `symbol?: string` and `symbolPosition?: 'prefix' | 'suffix'`.
 * The exact inputs' internal props gain exactly two optional readonly adornment keys, and the
 * grouped input's props get them through `Omit<…, 'allowGrouping'>`.
 */
import type { ReactNode } from 'react';
import type { Control } from 'react-hook-form';

import { AmountField, type AmountFieldProps as EntryProps } from '../../../index';
import type { InputProps } from '../../ui/input';
import type { AmountFieldProps } from '../AmountField';
import type { AmountFieldExactInputProps } from '../AmountFieldExactInput';
import type { AmountFieldGroupedExactInputProps } from '../AmountFieldGroupedExactInput';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

// Public props: unchanged.
export type PublicSymbol = Expect<Equal<AmountFieldProps['symbol'], string | undefined>>;
export type PublicPosition = Expect<
  Equal<AmountFieldProps['symbolPosition'], 'prefix' | 'suffix' | undefined>
>;
export type EntrySymbol = Expect<Equal<EntryProps['symbol'], string | undefined>>;
export type NoAdornmentKeys = Expect<
  Equal<Extract<keyof AmountFieldProps, 'startAdornment' | 'endAdornment'>, never>
>;

// Internal exact input props: two optional readonly keys typed as Input's.
export type ExactStart = Expect<
  Equal<AmountFieldExactInputProps['startAdornment'], InputProps['startAdornment']>
>;
export type ExactEnd = Expect<Equal<AmountFieldExactInputProps['endAdornment'], ReactNode>>;
export type ExactOptional = Expect<
  Equal<
    Pick<AmountFieldExactInputProps, 'startAdornment' | 'endAdornment'>,
    { readonly startAdornment?: ReactNode; readonly endAdornment?: ReactNode }
  >
>;
export type GroupedKeys = Expect<
  Equal<
    Pick<AmountFieldGroupedExactInputProps, 'startAdornment' | 'endAdornment'>,
    Pick<AmountFieldExactInputProps, 'startAdornment' | 'endAdornment'>
  >
>;

declare const control: Control<{ amount: string }>;
const base = { id: 'a', name: 'amount' as const, label: 'A', control };

export const suffix = <AmountField {...base} symbol="USD" />;
export const prefix = <AmountField {...base} symbol="$" symbolPosition="prefix" />;
export const exact = <AmountField {...base} formatOnBlur={false} symbol="USDC" />;

// @ts-expect-error the symbol stays a string, not a node
export const nodeSymbol = <AmountField {...base} symbol={<span>USD</span>} />;
// @ts-expect-error the position is a closed union
export const leftPosition = <AmountField {...base} symbol="USD" symbolPosition="left" />;
// @ts-expect-error AmountField has no public adornment prop
export const publicAdornment = <AmountField {...base} endAdornment="USD" />;
