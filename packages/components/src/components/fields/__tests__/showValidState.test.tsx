/**
 * @vitest-environment jsdom
 *
 * `showValidState`: opt a field out of the green success border.
 *
 * Contract:
 *   V1 `false` => a touched, error-free field never gets the success border      (every field)
 *   V2 omitted, `true` and `undefined` => same success border as before          (every field)
 *   V3 the error border still shows, and `false` does not hide it                (helper + required field)
 *   V4 a non-boolean value from an untyped config keeps today's look             (helper)
 */
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import React from 'react';
import { FormProvider, useForm, type Control } from 'react-hook-form';

import type { AddressingCapability } from '@openzeppelin/ui-types';

import { AddressField } from '../AddressField';
import { AmountField } from '../AmountField';
import { BigIntField } from '../BigIntField';
import { BooleanField } from '../BooleanField';
import { BytesField } from '../BytesField';
import { DateTimeField } from '../DateTimeField';
import { EnumField } from '../EnumField';
import { NumberField } from '../NumberField';
import { PasswordField } from '../PasswordField';
import { TextAreaField } from '../TextAreaField';
import { TextField } from '../TextField';
import { UrlField } from '../UrlField';
import { getValidationStateClasses } from '../utils/validation';

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

afterEach(cleanup);

const SUCCESS = 'border-success focus:border-success focus:ring-success/30';
const ERROR = 'border-destructive focus:border-destructive focus:ring-destructive/30';
const ADDRESSING: AddressingCapability = {
  isValidAddress: (a: string) => /^0x[0-9a-fA-F]{40}$/.test(a),
};

describe('getValidationStateClasses: showValidState', () => {
  it('V2 omitted, true and undefined all return the success classes once touched', () => {
    const omitted = getValidationStateClasses(undefined, true);
    expect(omitted).toBe(SUCCESS);
    expect(getValidationStateClasses(undefined, true, true)).toBe(omitted);
    expect(getValidationStateClasses(undefined, true, undefined)).toBe(omitted);
  });

  it('V1 false returns no classes for a touched field without an error', () => {
    expect(getValidationStateClasses(undefined, true, false)).toBe('');
  });

  it('V2 an untouched field is neutral whatever the option says', () => {
    for (const opt of [undefined, true, false]) {
      expect(getValidationStateClasses(undefined, false, opt)).toBe('');
      expect(getValidationStateClasses(undefined, undefined, opt)).toBe('');
    }
  });

  it('V3 an error returns the error classes for false, true and omitted', () => {
    const error = { type: 'required', message: 'This field is required' };
    for (const opt of [undefined, true, false]) {
      expect(getValidationStateClasses(error, true, opt)).toBe(ERROR);
      expect(getValidationStateClasses(error, false, opt)).toBe(ERROR);
    }
  });

  it('V4 only a strict false opts out: other non-boolean values keep the success classes', () => {
    for (const odd of [null, 0, '', 'false', 'no']) {
      expect(getValidationStateClasses(undefined, true, odd as unknown as boolean)).toBe(SUCCESS);
    }
  });
});

interface Spec {
  key: string;
  /** A value that passes the field's own checks, so no error shows. */
  valid: unknown;
  render: (p: {
    id: string;
    name: string;
    label: string;
    control: Control<Record<string, unknown>>;
    showValidState?: boolean;
  }) => React.ReactElement;
}

const SPECS: readonly Spec[] = [
  { key: 'TextField', valid: 'hello', render: (p) => <TextField {...p} /> },
  { key: 'TextAreaField', valid: 'notes', render: (p) => <TextAreaField {...p} /> },
  { key: 'PasswordField', valid: 'secret', render: (p) => <PasswordField {...p} /> },
  { key: 'UrlField', valid: 'https://example.com', render: (p) => <UrlField {...p} /> },
  { key: 'NumberField', valid: '12', render: (p) => <NumberField {...p} /> },
  { key: 'BigIntField', valid: '123', render: (p) => <BigIntField {...p} /> },
  { key: 'BooleanField', valid: true, render: (p) => <BooleanField {...p} /> },
  { key: 'EnumField (JSON entry)', valid: '{"tag":"A"}', render: (p) => <EnumField {...p} /> },
  {
    key: 'AddressField',
    valid: '0x1234567890abcdef1234567890abcdef12345678',
    render: (p) => <AddressField {...p} addressing={ADDRESSING} />,
  },
  { key: 'BytesField', valid: '0xabcd', render: (p) => <BytesField {...p} /> },
  { key: 'DateTimeField', valid: '2026-01-01T10:00', render: (p) => <DateTimeField {...p} /> },
  { key: 'AmountField', valid: '12.5', render: (p) => <AmountField {...p} /> },
  {
    key: 'AmountField (exact entry)',
    valid: '12.5',
    render: (p) => <AmountField {...p} formatOnBlur={false} decimals={6} />,
  },
];

function Harness({
  spec,
  showValidState,
  required,
  expose,
}: {
  spec: Spec;
  showValidState?: boolean;
  required?: boolean;
  expose: (form: ReturnType<typeof useForm<Record<string, unknown>>>) => void;
}): React.ReactElement {
  const form = useForm<Record<string, unknown>>({ mode: 'onChange', defaultValues: {} });
  expose(form);
  return (
    <FormProvider {...form}>
      {spec.render({
        id: 'f',
        name: 'v',
        label: 'Field',
        control: form.control,
        ...(showValidState === undefined ? {} : { showValidState }),
        ...(required ? { validation: { required: true } } : {}),
      } as Parameters<Spec['render']>[0])}
    </FormProvider>
  );
}

/** Mount, fill with a valid value and mark touched, as a user who filled it then left. */
async function touchedValid(spec: Spec, showValidState?: boolean): Promise<HTMLElement> {
  let form!: ReturnType<typeof useForm<Record<string, unknown>>>;
  const { container } = render(
    <Harness
      spec={spec}
      showValidState={showValidState}
      expose={(f) => {
        form = f;
      }}
    />
  );
  await act(async () => {
    form.setValue('v', spec.valid, { shouldTouch: true, shouldValidate: true, shouldDirty: true });
  });
  return container;
}

const hasSuccess = (c: HTMLElement): boolean => c.querySelector('.border-success') !== null;

describe('every field that shows the success border honours showValidState', () => {
  it('guards the field list: 12 fields, AmountField in both modes', () => {
    expect(SPECS.map((s) => s.key)).toHaveLength(13);
  });

  for (const spec of SPECS) {
    describe(spec.key, () => {
      it('V2 omitted: touched and valid shows the success border (control)', async () => {
        expect(hasSuccess(await touchedValid(spec))).toBe(true);
      });

      it('V2 showValidState={true}: same as omitted', async () => {
        expect(hasSuccess(await touchedValid(spec, true))).toBe(true);
      });

      it('V1 showValidState={false}: touched and valid stays neutral', async () => {
        const c = await touchedValid(spec, false);
        expect(hasSuccess(c)).toBe(false);
        expect(c.querySelector('.border-destructive')).toBeNull();
      });
    });
  }
});

describe('V3 the error border survives showValidState={false}', () => {
  it('a required TextField left empty after touch shows the error border and message', async () => {
    let form!: ReturnType<typeof useForm<Record<string, unknown>>>;
    const spec = SPECS[0];
    const { container, findByText } = render(
      <Harness
        spec={spec}
        showValidState={false}
        required
        expose={(f) => {
          form = f;
        }}
      />
    );
    await act(async () => {
      form.setValue('v', '', { shouldTouch: true, shouldValidate: true });
      await form.trigger('v');
    });
    expect(container.querySelector('.border-destructive')).not.toBeNull();
    expect(await findByText('This field is required')).toBeTruthy();
    expect(hasSuccess(container)).toBe(false);
  });
});
