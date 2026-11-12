/**
 * @vitest-environment jsdom
 *
 * SF-1 · Field description reference sweep (US-1, issue #251).
 *
 * Contract: a kit form field writes `aria-describedby` only when it has helper
 * text and/or a validation error, lists exactly the ids of those elements,
 * and every listed id resolves to an element in the DOM. The attribute is never
 * empty or whitespace-only. Spec scenarios 1 and 2 (scenario 3 is the
 * prove-it-works run in the example app, outside this suite).
 *
 * Matrix: 16 field components x {neither, helper only, error only, both}.
 * The invariant tag is the spec scenario (SC-1 / SC-2); SF-1 has no Invariants stage.
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import React from 'react';
import { useForm, type Control, type UseFormReturn } from 'react-hook-form';

import { AddressField } from './AddressField';
import { AmountField } from './AmountField';
import { ArrayField } from './ArrayField';
import { ArrayObjectField } from './ArrayObjectField';
import type { BaseFieldProps } from './BaseField';
import { BigIntField } from './BigIntField';
import { BooleanField } from './BooleanField';
import { BytesField } from './BytesField';
import { DateTimeField } from './DateTimeField';
import { EnumField } from './EnumField';
import { NumberField } from './NumberField';
import { ObjectField } from './ObjectField';
import { PasswordField } from './PasswordField';
import { RadioField } from './RadioField';
import { SelectField } from './SelectField';
import { SelectGroupedField } from './SelectGroupedField';
import { TextAreaField } from './TextAreaField';
import { TextField } from './TextField';
import { UrlField } from './UrlField';

type Values = Record<string, unknown>;
type CommonProps = BaseFieldProps<Values>;

const HELPER = 'Helper copy';
const FIELD_ID = 'f';

const FIELDS: ReadonlyArray<{
  name: string;
  render: (p: CommonProps) => React.ReactElement;
}> = [
  { name: 'TextField', render: (p) => <TextField {...p} /> },
  { name: 'TextAreaField', render: (p) => <TextAreaField {...p} /> },
  { name: 'PasswordField', render: (p) => <PasswordField {...p} /> },
  { name: 'UrlField', render: (p) => <UrlField {...p} /> },
  { name: 'NumberField', render: (p) => <NumberField {...p} /> },
  { name: 'BigIntField', render: (p) => <BigIntField {...p} /> },
  { name: 'AmountField', render: (p) => <AmountField {...p} /> },
  { name: 'BytesField', render: (p) => <BytesField {...p} /> },
  { name: 'DateTimeField', render: (p) => <DateTimeField {...p} /> },
  { name: 'BooleanField', render: (p) => <BooleanField {...p} /> },
  { name: 'AddressField', render: (p) => <AddressField {...p} /> },
  {
    name: 'SelectField',
    render: (p) => <SelectField {...p} options={[{ label: 'One', value: '1' }]} />,
  },
  {
    name: 'SelectGroupedField',
    render: (p) => (
      <SelectGroupedField
        {...p}
        groups={[{ label: 'G', options: [{ label: 'One', value: '1' }] }]}
      />
    ),
  },
  {
    name: 'RadioField',
    render: (p) => <RadioField {...p} options={[{ label: 'One', value: '1' }]} />,
  },
  { name: 'ArrayField', render: (p) => <ArrayField {...p} elementType="text" /> },
  { name: 'ArrayObjectField', render: (p) => <ArrayObjectField {...p} components={[]} /> },
  { name: 'ObjectField', render: (p) => <ObjectField {...p} components={[]} /> },
  { name: 'EnumField', render: (p) => <EnumField {...p} /> },
];

interface Harness {
  form: UseFormReturn<Values>;
}

function mount(
  renderField: (p: CommonProps) => React.ReactElement,
  opts: { helperText?: string }
): { container: HTMLElement; harness: Harness } {
  const harness = {} as Harness;
  function Wrapper(): React.ReactElement {
    const form = useForm<Values>({ defaultValues: {}, mode: 'onChange' });
    harness.form = form;
    return renderField({
      id: FIELD_ID,
      name: FIELD_ID,
      label: 'Label',
      helperText: opts.helperText,
      control: form.control as Control<Values>,
    });
  }
  const { container } = render(<Wrapper />);
  return { container, harness };
}

/** Every element in the subtree that carries the attribute. */
function describedByHolders(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[aria-describedby]'));
}

function tokens(el: HTMLElement): string[] {
  const raw = el.getAttribute('aria-describedby') ?? '';
  return raw.split(/\s+/).filter(Boolean);
}

async function triggerError(harness: Harness, container: HTMLElement): Promise<void> {
  const setError = async (): Promise<void> => {
    await act(async () => {
      harness.form.setError(FIELD_ID, { type: 'manual', message: 'Bad value' });
    });
  };
  await setError();
  // Error copy is shown once the field is touched; blur whatever holds the reference.
  // Some fields re-validate on blur (clearing the manual error), so set it again after.
  const holder = describedByHolders(container)[0];
  if (holder) {
    await act(async () => {
      fireEvent.blur(holder);
    });
    await setError();
  }
}

function resolve(container: HTMLElement, id: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(`[id="${id}"]`);
}

afterEach(cleanup);

describe.each(FIELDS)('SC-1/SC-2 · $name aria-describedby', ({ render: renderField }) => {
  it('SC-1 happy: neither helper nor error → no aria-describedby anywhere (not "" or " ")', () => {
    const { container } = mount(renderField, {});
    expect(describedByHolders(container)).toEqual([]);
  });

  it('SC-2 happy: helper only → one token, the description element, which exists', () => {
    const { container } = mount(renderField, { helperText: HELPER });
    const holders = describedByHolders(container);
    expect(holders.length).toBeGreaterThan(0);
    for (const h of holders) {
      const ids = tokens(h);
      expect(ids).toHaveLength(1);
      expect(ids[0]).toMatch(/description$/);
      expect(resolve(container, ids[0])?.textContent).toContain(HELPER);
      expect(h.getAttribute('aria-describedby')).toBe(ids[0]);
    }
  });

  it('SC-2 failure: error only → one token, the error element, which exists', async () => {
    const { container, harness } = mount(renderField, {});
    await triggerError(harness, container);
    const holders = describedByHolders(container);
    expect(holders.length).toBeGreaterThan(0);
    for (const h of holders) {
      const ids = tokens(h);
      expect(ids).toHaveLength(1);
      expect(ids[0]).toMatch(/error$/);
      expect(resolve(container, ids[0])?.textContent).toContain('Bad value');
    }
  });

  it('SC-2 boundary: helper and error → exactly both ids, each exists, single-space separated', async () => {
    const { container, harness } = mount(renderField, { helperText: HELPER });
    await triggerError(harness, container);
    const holders = describedByHolders(container);
    expect(holders.length).toBeGreaterThan(0);
    for (const h of holders) {
      const ids = tokens(h);
      // RadioField's per-option inputs deliberately reference only the error
      // (one valid token); the radiogroup carries the full helper + error pair.
      if (h.matches('input[type="radio"]')) {
        expect(ids).toHaveLength(1);
        expect(ids[0]).toMatch(/error$/);
        expect(resolve(container, ids[0])).not.toBeNull();
        continue;
      }
      expect(ids).toHaveLength(2);
      expect(ids.filter((i) => /description$/.test(i))).toHaveLength(1);
      expect(ids.filter((i) => /error$/.test(i))).toHaveLength(1);
      expect(h.getAttribute('aria-describedby')).toBe(ids.join(' '));
      for (const id of ids) expect(resolve(container, id)).not.toBeNull();
    }
  });

  it('SC-1/SC-2 transition: clearing the error removes the attribute again (no helper)', async () => {
    const { container, harness } = mount(renderField, {});
    await triggerError(harness, container);
    await act(async () => {
      harness.form.clearErrors(FIELD_ID);
    });
    expect(describedByHolders(container)).toEqual([]);
  });
});
