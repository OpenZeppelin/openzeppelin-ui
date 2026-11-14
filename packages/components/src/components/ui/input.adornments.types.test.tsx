/**
 * @vitest-environment jsdom
 *
 * Input's public type stays additive: everything that compiled against the
 * `React.InputHTMLAttributes<HTMLInputElement>` alias still compiles, and the two new keys
 * are optional `ReactNode`s.
 *
 * The package `tsc` excludes test files; `tsconfig.all-tests.json` (in `typecheck:suites`)
 * type-checks this file, so a `@ts-expect-error` probe that stops erroring fails that run.
 */
import { render } from '@testing-library/react';
import { describe, expect, expectTypeOf, it } from 'vitest';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import { Input as InputFromIndex, type InputProps as InputPropsFromIndex } from '../../index';
import { Input, type InputProps } from './input';

type Before = React.InputHTMLAttributes<HTMLInputElement>;
type Expected = Before & { startAdornment?: React.ReactNode; endAdornment?: React.ReactNode };

describe('InputProps is additive', () => {
  it('is assignable to and from the old attributes plus two optional ReactNode keys', () => {
    expectTypeOf<InputProps>().toMatchTypeOf<Expected>();
    expectTypeOf<Expected>().toMatchTypeOf<InputProps>();
    expectTypeOf<InputProps['startAdornment']>().toEqualTypeOf<React.ReactNode | undefined>();
    expectTypeOf<InputProps['endAdornment']>().toEqualTypeOf<React.ReactNode | undefined>();
  });

  it('every old attribute keeps its type', () => {
    expectTypeOf<Omit<InputProps, 'startAdornment' | 'endAdornment'>>().toEqualTypeOf<
      Omit<Expected, 'startAdornment' | 'endAdornment'>
    >();
    expectTypeOf<Before>().toMatchTypeOf<InputProps>();
  });

  it('is re-exported from the package index unchanged', () => {
    expectTypeOf<InputPropsFromIndex>().toEqualTypeOf<InputProps>();
    expect(InputFromIndex).toBe(Input);
  });

  it('consumer patterns from before still compile', () => {
    type WithoutSize = Omit<InputProps, 'size'>;
    type Extended = InputProps & { foo: string };
    interface Derived extends InputProps {
      bar?: number;
    }
    expectTypeOf<WithoutSize>().toMatchTypeOf<Omit<Before, 'size'>>();
    expectTypeOf<Extended['foo']>().toEqualTypeOf<string>();
    expectTypeOf<Derived['bar']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<React.ComponentProps<typeof Input>>().toMatchTypeOf<InputProps>();
    expectTypeOf<React.ComponentProps<typeof Input>['ref']>().toMatchTypeOf<
      React.Ref<HTMLInputElement> | undefined
    >();
  });

  it('accepts a React Hook Form field spread and a typed ref (renders)', () => {
    function Form(): React.ReactElement {
      const { register } = useForm<{ amount: string }>();
      const ref = React.useRef<HTMLInputElement>(null);
      const field = register('amount');
      return (
        <>
          <Input {...field} endAdornment="USD" />
          <Input ref={ref} startAdornment={<svg />} endAdornment={0} />
        </>
      );
    }
    const { container } = render(<Form />);
    expect(container.querySelectorAll('input')).toHaveLength(2);
  });

  it('rejects non-ReactNode adornments', () => {
    // @ts-expect-error a function is not a ReactNode
    const fn: InputProps = { startAdornment: () => null };
    // @ts-expect-error a plain object is not a ReactNode
    const obj: InputProps = { endAdornment: { label: 'USD' } };
    expect([fn, obj]).toHaveLength(2);
  });
});
