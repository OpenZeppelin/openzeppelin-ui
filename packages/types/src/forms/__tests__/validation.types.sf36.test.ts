/**
 * 005 SF-36 · INV-1: the `FieldValidation` change is additive.
 *
 * Compile-time assertions (`expectTypeOf`, `@ts-expect-error`), checked by `pnpm typecheck`
 * (this file is under `src/`, so tsc compiles it); Vitest runs them too so the file registers.
 * Existing rule members keep their exact types, so every reader that treats `min` as a number
 * (the renderer's `minItems: field.validation?.min`, numeric helpers) still compiles.
 */
import { describe, expectTypeOf, it } from 'vitest';

import type {
  FieldCondition,
  FieldValidation,
  FieldValidationCheck,
  FieldValidationMessages,
} from '../../index';

describe('SF-36 INV-1 — FieldValidation stays additive', () => {
  it('existing members keep their exact types', () => {
    expectTypeOf<FieldValidation['required']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<FieldValidation['min']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<FieldValidation['max']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<FieldValidation['minLength']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<FieldValidation['maxLength']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<FieldValidation['pattern']>().toEqualTypeOf<string | RegExp | undefined>();
    expectTypeOf<FieldValidation['conditions']>().toEqualTypeOf<FieldCondition[] | undefined>();
  });

  it('only messages and validate are new, both optional', () => {
    expectTypeOf<keyof FieldValidation>().toEqualTypeOf<
      | 'required'
      | 'min'
      | 'max'
      | 'minLength'
      | 'maxLength'
      | 'pattern'
      | 'conditions'
      | 'messages'
      | 'validate'
    >();
    expectTypeOf<FieldValidation['messages']>().toEqualTypeOf<
      FieldValidationMessages | undefined
    >();
    expectTypeOf<FieldValidation['validate']>().toEqualTypeOf<FieldValidationCheck | undefined>();
    // Every member optional: an empty config is still a FieldValidation.
    const none: FieldValidation = {};
    expectTypeOf(none).toEqualTypeOf<FieldValidation>();
  });

  it('FieldValidationMessages has exactly six optional string keys', () => {
    expectTypeOf<FieldValidationMessages>().toEqualTypeOf<{
      required?: string;
      min?: string;
      max?: string;
      minLength?: string;
      maxLength?: string;
      pattern?: string;
    }>();
  });

  it('FieldValidationCheck is (value: unknown) => boolean | string', () => {
    expectTypeOf<FieldValidationCheck>().toEqualTypeOf<(value: unknown) => boolean | string>();
    expectTypeOf<FieldValidationCheck>().returns.not.toMatchTypeOf<Promise<unknown>>();
  });

  it('a rule stays a plain number; the react-hook-form object form does not compile', () => {
    const readMin = (v: FieldValidation): number | undefined => v.min;
    expectTypeOf(readMin).returns.toEqualTypeOf<number | undefined>();
    // @ts-expect-error — rules are not widened to { value, message } (SC-008)
    const widened: FieldValidation = { maxLength: { value: 5, message: 'x' } };
    void widened;
    // @ts-expect-error — an async check is ruled out by the type (D2, A3)
    const asyncCheck: FieldValidation = { validate: async () => true };
    void asyncCheck;
  });
});
