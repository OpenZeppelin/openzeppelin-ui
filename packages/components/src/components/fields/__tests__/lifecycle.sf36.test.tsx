/**
 * 005 SF-36 · Error lifecycle of a check failure (INV-20), a throwing check never hangs the
 * form (INV-22), and parent options don't leak into children (INV-18).
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';

import type {
  FieldValidation,
  FormFieldType,
  FunctionParameter,
  TypeMappingCapability,
} from '@openzeppelin/ui-types';
import { logger } from '@openzeppelin/ui-utils';

import { ArrayField } from '../ArrayField';
import { ArrayObjectField } from '../ArrayObjectField';
import { ObjectField } from '../ObjectField';
import { TextField } from '../TextField';
import { CUSTOM_CHECK_FALLBACK_MESSAGE } from '../utils';
import { fieldSpec, mountField, type Values } from './fieldValidation.sf36-kit';

afterEach(() => {
  vi.restoreAllMocks();
});

const reserved = (v: unknown): true | string => (v === 'admin' ? 'Reserved' : true);

describe('SF-36 INV-20 — a check failure has the same lifecycle as any rule failure', () => {
  it('TextField: blocks submit, shows the message, clears when the user types an accepted value, then submits that value', async () => {
    const m = mountField(fieldSpec('TextField'), {
      value: 'admin',
      validation: { validate: reserved },
    });
    expect(m.shown(), 'nothing before submit (onSubmit mode)').toBeNull();
    const first = await m.submit();
    expect(first.valid).toBe(0);
    expect(m.shown()).toBe('Reserved');

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'alice' } });
    });
    expect(m.shown(), 'reValidateMode onChange clears it').toBeNull();

    const second = await m.submit();
    expect(second.valid).toBe(1);
    expect(second.data?.v).toBe('alice');
    m.unmount();
  });

  it('exact AmountField: same lifecycle; the submitted value is the exact string', async () => {
    const m = mountField(fieldSpec('AmountFieldExact'), {
      value: '5',
      validation: { validate: (v) => (v === '5' ? 'No fives' : true) },
    });
    expect((await m.submit()).valid).toBe(0);
    expect(m.shown()).toBe('No fives');
    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '2.500001' } });
    });
    expect(m.shown()).toBeNull();
    const ok = await m.submit();
    expect(ok.valid).toBe(1);
    expect(ok.data?.v).toBe('2.500001');
    m.unmount();
  });

  it('multi-select: same lifecycle on the id list', async () => {
    const m = mountField(fieldSpec('SearchableMultiSelectField'), {
      value: ['fr'],
      validation: {
        validate: (ids) => (Array.isArray(ids) && ids.includes('fr') ? 'No France' : true),
      },
    });
    expect((await m.submit()).valid).toBe(0);
    expect(m.shown()).toBe('No France');
    await act(async () => {
      m.api().setValue('v', ['ca'], { shouldValidate: true });
    });
    expect(m.shown()).toBeNull();
    const ok = await m.submit();
    expect(ok.valid).toBe(1);
    expect(ok.data?.v).toEqual(['ca']);
    m.unmount();
  });
});

describe('SF-36 INV-22 — a throwing check never hangs the form', () => {
  const boom = (): never => {
    throw new Error('boom');
  };

  for (const [key, value] of [
    ['TextField', 'hello'],
    ['AmountFieldExact', '1.5'],
    ['SearchableMultiSelectField', ['ca']],
    ['MapField', [{ key: 'a', value: '1' }]],
  ] as const) {
    it(`${key}: submit resolves, the invalid callback runs, isSubmitting returns to false, the fallback shows, one log per run`, async () => {
      const log = vi.spyOn(logger, 'error').mockImplementation(() => {});
      const m = mountField(fieldSpec(key), { value, validation: { validate: boom } });
      log.mockClear(); // MapField's effect runs the check on mount
      let invalid = 0;
      let valid = 0;
      await act(async () => {
        await expect(
          m.api().handleSubmit(
            () => {
              valid += 1;
            },
            () => {
              invalid += 1;
            }
          )()
        ).resolves.toBeUndefined();
      });
      expect(valid).toBe(0);
      expect(invalid).toBe(1);
      expect(m.api().formState.isSubmitting).toBe(false);
      expect(m.current()).toBe(CUSTOM_CHECK_FALLBACK_MESSAGE);
      expect(m.shown()).toBe(CUSTOM_CHECK_FALLBACK_MESSAGE);
      expect(log).toHaveBeenCalled();
      for (const call of log.mock.calls) expect(call[1]).toBe('Custom validate check threw');
      m.unmount();
    });
  }

  it('TextField in onChange mode: typing into a throwing check shows the fallback, no exception escapes', async () => {
    vi.spyOn(logger, 'error').mockImplementation(() => {});
    const m = mountField(fieldSpec('TextField'), {
      value: '',
      validation: { validate: boom },
      mode: 'onChange',
    });
    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x' } });
    });
    expect(m.shown()).toBe(CUSTOM_CHECK_FALLBACK_MESSAGE);
    m.unmount();
  });
});

describe('SF-36 INV-18 — parent options do not leak into children', () => {
  const COMPONENTS: FunctionParameter[] = [
    { name: 'a', type: 'string' },
    { name: 'b', type: 'string' },
  ];
  const typeMapping = {
    generateDefaultField: (p: FunctionParameter): FormFieldType =>
      ({
        id: p.name,
        name: p.name,
        label: p.name,
        type: 'text',
        validation: {},
      }) as FormFieldType,
  } as unknown as TypeMappingCapability;

  function Host({
    children,
    defaultValues,
    handle,
  }: {
    children: (api: UseFormReturn<Values>) => React.ReactNode;
    defaultValues: Values;
    handle: { api: UseFormReturn<Values> | null };
  }): React.ReactElement {
    const api = useForm<Values>({ defaultValues });
    handle.api = api;
    void api.formState.errors;
    return <FormProvider {...api}>{children(api)}</FormProvider>;
  }

  const renderChild = (api: UseFormReturn<Values>) =>
    function Child(field: FormFieldType): React.ReactElement {
      return (
        <TextField
          id={field.id}
          name={field.name}
          label={field.label}
          control={api.control}
          validation={field.validation}
        />
      );
    };

  async function submit(api: UseFormReturn<Values>): Promise<void> {
    await act(async () => {
      await api.handleSubmit(
        () => {},
        () => {}
      )();
    });
  }

  it('ObjectField: a required empty child shows the default text; the parent check sees only the whole object', async () => {
    const parentCheck = vi.fn((_v: unknown) => true as const);
    const handle: { api: UseFormReturn<Values> | null } = { api: null };
    const validation: FieldValidation = {
      required: true,
      messages: { required: 'Parent req' },
      validate: parentCheck,
    };
    render(
      <Host handle={handle} defaultValues={{ obj: { a: '', b: 'filled' } }}>
        {(api) => (
          <ObjectField
            id="obj"
            name="obj"
            label="Obj"
            control={api.control}
            components={COMPONENTS}
            typeMapping={typeMapping}
            validation={validation}
            renderProperty={(field) => renderChild(api)(field)}
          />
        )}
      </Host>
    );
    await submit(handle.api!);
    expect(handle.api!.getFieldState('obj.a').error?.message).toBe('This field is required');
    for (const [arg] of parentCheck.mock.calls) {
      expect(arg).toEqual(handle.api!.getValues('obj'));
    }
    expect(parentCheck).toHaveBeenCalled();
  });

  it('ArrayObjectField: children get the default required text, never the parent message or check', async () => {
    const parentCheck = vi.fn((_v: unknown) => true as const);
    const handle: { api: UseFormReturn<Values> | null } = { api: null };
    render(
      <Host handle={handle} defaultValues={{ rows: [{ a: '', b: 'x' }] }}>
        {(api) => (
          <ArrayObjectField
            id="rows"
            name="rows"
            label="Rows"
            control={api.control}
            components={COMPONENTS}
            typeMapping={typeMapping}
            validation={{
              required: true,
              messages: { required: 'Parent req' },
              validate: parentCheck,
            }}
            renderProperty={(field) => renderChild(api)(field)}
          />
        )}
      </Host>
    );
    await submit(handle.api!);
    expect(handle.api!.getFieldState('rows.0.a').error?.message).toBe('This field is required');
    for (const [arg] of parentCheck.mock.calls) expect(Array.isArray(arg)).toBe(true);
    expect(parentCheck).toHaveBeenCalled();
  });

  it('ArrayField: an element check runs once per element on that element’s value', async () => {
    const elementCheck = vi.fn((v: unknown) => (v === 'bad' ? 'Bad element' : true));
    const handle: { api: UseFormReturn<Values> | null } = { api: null };
    render(
      <Host handle={handle} defaultValues={{ list: ['ok', 'bad'] }}>
        {(api) => (
          <ArrayField
            id="list"
            name="list"
            label="List"
            control={api.control}
            elementType="text"
            elementFieldConfig={{ type: 'text', validation: { validate: elementCheck } }}
            renderElement={(field) => renderChild(api)(field)}
          />
        )}
      </Host>
    );
    elementCheck.mockClear();
    await submit(handle.api!);
    expect(elementCheck.mock.calls.map(([v]) => v).sort()).toEqual(['bad', 'ok']);
    expect(handle.api!.getFieldState('list.1').error?.message).toBe('Bad element');
    expect(handle.api!.getFieldState('list.0').error).toBeUndefined();
  });
});
