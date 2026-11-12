/**
 * @vitest-environment jsdom
 *
 * 005 SF-18 · Label-row slot (`labelEnd`) on the field family.
 * Stakes Low: no invariants artifact, so the contract is the three acceptance scenarios (S1, S2
 * here; S3 is proven in the running example app) plus the code draft's stated rules:
 *   R1 chip sits at the end of the row, outside the <Label>      (S1)
 *   R2 control's accessible name is the label text, no chip text (S1)
 *   R3 action is a tabbable, operable sibling after the label     (S2)
 *   R4 clicking the label text still focuses the control          (S2)
 *   R5 no slot / null / undefined / false => DOM identical to a field without the prop
 *   R6 slot renders only when the field has a label
 *   R7 clicking the end content does not move focus into the control or fire label activation
 * artifacts/005-uikit-requests/sf-18-label-row-slot/05-tests.md
 */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { computeAccessibleName } from 'dom-accessibility-api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { useForm, type FieldValues } from 'react-hook-form';

import { Form } from '../../ui/form';
import { AddressField } from '../AddressField';
import { AmountField } from '../AmountField';
import { BaseField } from '../BaseField';
import { BigIntField } from '../BigIntField';
import { BytesField } from '../BytesField';
import { DateTimeField } from '../DateTimeField';
import { NumberField } from '../NumberField';
import { PasswordField } from '../PasswordField';
import { RadioField } from '../RadioField';
import { SearchableMultiSelectField } from '../SearchableMultiSelectField';
import { SelectField } from '../SelectField';
import { SelectGroupedField } from '../SelectGroupedField';
import { TextAreaField } from '../TextAreaField';
import { TextField } from '../TextField';
import { UrlField } from '../UrlField';

// jsdom lacks scrollIntoView, which Radix Select calls when its trigger gains focus.
Element.prototype.scrollIntoView = function scrollIntoView(): void {};

afterEach(cleanup);

const LABEL = 'Recipient';
const ID = 'sf18-field';
const NAME = 'value';

type Slot = React.ReactNode;
interface CommonProps {
  id: string;
  name: string;
  label: string;
  labelEnd?: Slot;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
}

interface Spec {
  name: string;
  render: (p: CommonProps) => React.ReactElement;
  /** The focusable control the label points at. */
  control: () => HTMLElement;
  /** Popover-style triggers: a label click activates (opens) them, as before SF-18. */
  labelClickOpens?: boolean;
}

/** React `useId` values differ per render; blank them before comparing markup. */
const norm = (html: string): string => html.replace(/[«:]r?[\w-]+[»:]|_r_\w+_/g, '«id»');

const byId = (): HTMLElement => {
  const el = document.getElementById(ID);
  if (!el) throw new Error('control #' + ID + ' not found');
  return el;
};

const SPECS: Spec[] = [
  { name: 'TextField', render: (p) => <TextField {...p} />, control: byId },
  { name: 'TextAreaField', render: (p) => <TextAreaField {...p} />, control: byId },
  { name: 'NumberField', render: (p) => <NumberField {...p} />, control: byId },
  { name: 'BigIntField', render: (p) => <BigIntField {...p} />, control: byId },
  { name: 'AmountField', render: (p) => <AmountField {...p} />, control: byId },
  { name: 'UrlField', render: (p) => <UrlField {...p} />, control: byId },
  { name: 'PasswordField', render: (p) => <PasswordField {...p} />, control: byId },
  { name: 'BytesField', render: (p) => <BytesField {...p} />, control: byId },
  { name: 'AddressField', render: (p) => <AddressField {...p} />, control: byId },
  { name: 'DateTimeField', render: (p) => <DateTimeField {...p} />, control: byId },
  {
    name: 'SelectField',
    render: (p) => <SelectField {...p} options={[{ value: 'a', label: 'A' }]} />,
    control: byId,
    labelClickOpens: true,
  },
  {
    name: 'SelectGroupedField',
    render: (p) => (
      <SelectGroupedField {...p} groups={[{ label: 'G', options: [{ value: 'a', label: 'A' }] }]} />
    ),
    control: byId,
    labelClickOpens: true,
  },
  {
    name: 'SearchableMultiSelectField',
    render: (p) => (
      <SearchableMultiSelectField
        {...p}
        items={[{ id: 'a', name: 'A' }]}
        getItemId={(i) => i.id}
        getItemLabel={(i) => i.name}
      />
    ),
    control: byId,
    labelClickOpens: true,
  },
  {
    name: 'BaseField',
    render: (p) => (
      <BaseField
        id={p.id}
        name={p.name}
        label={p.label}
        labelEnd={p.labelEnd}
        control={p.control}
        renderInput={(field, props) => (
          <input {...(field as React.InputHTMLAttributes<HTMLInputElement>)} id={props.id} />
        )}
      />
    ),
    control: byId,
    labelClickOpens: true,
  },
];

// RadioField labels a group, not a single control: asserted separately below.
const RADIO_SPEC = {
  name: 'RadioField',
  render: (p: CommonProps) => (
    <RadioField
      {...p}
      options={[
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ]}
    />
  ),
};

function Host({
  spec,
  labelEnd,
  label = LABEL,
  after,
}: {
  spec: { render: (p: CommonProps) => React.ReactElement };
  labelEnd?: Slot;
  label?: string;
  after?: boolean;
}): React.ReactElement {
  const form = useForm<FieldValues>({ defaultValues: { [NAME]: '' } });
  return (
    <Form {...form}>
      <form>
        {spec.render({ id: ID, name: NAME, label, labelEnd, control: form.control })}
        {after ? <button type="button">After</button> : null}
      </form>
    </Form>
  );
}

const row = (c: HTMLElement) => c.querySelector('[data-slot="field-label-row"]');
const end = (c: HTMLElement) => c.querySelector('[data-slot="field-label-end"]');

describe.each(SPECS)('$name', (spec) => {
  it('R1 S1 happy: chip sits at the end of the label row, after and outside the label', () => {
    const { container } = render(
      <Host spec={spec} labelEnd={<span data-testid="chip">Optional</span>} />
    );
    const label = container.querySelector('label') as HTMLLabelElement;
    const chip = screen.getByTestId('chip');
    expect(row(container)).not.toBeNull();
    expect(label.parentElement).toBe(row(container));
    expect(end(container)?.contains(chip)).toBe(true);
    expect(label.contains(chip)).toBe(false);
    // chip is the last child of the row, label the first (end of the row)
    expect(row(container)?.lastElementChild).toBe(end(container));
    expect(row(container)?.firstElementChild).toBe(label);
  });

  it('R2 S1 name: accessible name stays the label text, chip text never appended', () => {
    const { container } = render(
      <Host spec={spec} labelEnd={<span data-testid="chip">Optional chip</span>} />
    );
    const name = computeAccessibleName(spec.control());
    expect(name).toBe(LABEL);
    expect(name).not.toContain('Optional');
    expect(container.querySelector('label')?.textContent?.trim()).toBe(LABEL);
  });

  it('R3 S2 action: tabbable after the label and operable by mouse and keyboard', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <Host
        spec={spec}
        after
        labelEnd={
          <button type="button" onClick={onAction}>
            Address book
          </button>
        }
      />
    );
    await user.tab();
    const action = screen.getByRole('button', { name: 'Address book' });
    expect(document.activeElement).toBe(action);
    await user.keyboard('{Enter}');
    expect(onAction).toHaveBeenCalledTimes(1);
    await user.keyboard(' ');
    expect(onAction).toHaveBeenCalledTimes(2);
    await user.click(action);
    expect(onAction).toHaveBeenCalledTimes(3);
  });

  it('R4 S2 label click: clicking the label text focuses the control, slot present', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const { container } = render(
      <Host
        spec={spec}
        labelEnd={
          <button type="button" onClick={onAction}>
            Address book
          </button>
        }
      />
    );
    await user.click(container.querySelector('label') as HTMLLabelElement);
    expect(onAction).not.toHaveBeenCalled();
    if (spec.labelClickOpens) {
      // Popover triggers open on a label click; the slot must not change what that does.
      const withSlot =
        document.activeElement?.getAttribute('role') ?? document.activeElement?.tagName;
      cleanup();
      const bare = render(<Host spec={spec} />).container;
      await user.click(bare.querySelector('label') as HTMLLabelElement);
      expect(withSlot).toBe(
        document.activeElement?.getAttribute('role') ?? document.activeElement?.tagName
      );
    } else {
      expect(document.activeElement).toBe(spec.control());
    }
  });

  it('R7 failure: clicking the slot content does not focus the control', async () => {
    const user = userEvent.setup();
    render(<Host spec={spec} labelEnd={<span data-testid="chip">Optional</span>} />);
    await user.click(screen.getByTestId('chip'));
    expect(document.activeElement).not.toBe(spec.control());
  });

  it.each([undefined, null, false] as const)(
    'R5 boundary: labelEnd=%s renders exactly the DOM of a field without the prop',
    (value) => {
      const a = render(<Host spec={spec} />).container.innerHTML;
      cleanup();
      const b = render(<Host spec={spec} labelEnd={value} />).container.innerHTML;
      expect(norm(b)).toBe(norm(a));
      expect(b).not.toContain('field-label-row');
      expect(b).not.toContain('field-label-end');
    }
  );

  it('R5 boundary: no labelEnd leaves the label a direct child of the field wrapper (as before)', () => {
    const { container } = render(<Host spec={spec} />);
    expect(row(container)).toBeNull();
    expect(computeAccessibleName(spec.control())).toBe(LABEL);
  });

  it('R6 boundary: with no label, no row and no slot content is rendered', () => {
    const { container } = render(
      <Host spec={spec} label="" labelEnd={<span data-testid="chip">Optional</span>} />
    );
    expect(screen.queryByTestId('chip')).toBeNull();
    expect(row(container)).toBeNull();
  });

  it('R2 boundary: a long label and a rich slot keep the name equal to the label', () => {
    render(
      <Host
        spec={spec}
        label="A very long label that wraps"
        labelEnd={
          <>
            <span>Optional</span>
            <button type="button">Help</button>
          </>
        }
      />
    );
    expect(computeAccessibleName(spec.control())).toBe('A very long label that wraps');
  });
});

describe('RadioField (group label)', () => {
  it('R1/R2 chip is outside the label and the label text is unchanged', () => {
    const { container } = render(
      <Host spec={RADIO_SPEC} labelEnd={<span data-testid="chip">Optional</span>} />
    );
    const label = container.querySelector('label') as HTMLLabelElement;
    expect(label.contains(screen.getByTestId('chip'))).toBe(false);
    expect(label.parentElement).toBe(row(container));
    expect(label.textContent?.trim()).toBe(LABEL);
  });

  it('R3 action is tabbable and operable', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <Host
        spec={RADIO_SPEC}
        labelEnd={
          <button type="button" onClick={onAction}>
            Help
          </button>
        }
      />
    );
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Help' }));
    await user.keyboard('{Enter}');
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, null, false] as const)('R5 labelEnd=%s leaves the DOM unchanged', (v) => {
    const a = render(<Host spec={RADIO_SPEC} />).container.innerHTML;
    cleanup();
    expect(norm(render(<Host spec={RADIO_SPEC} labelEnd={v} />).container.innerHTML)).toBe(norm(a));
  });

  it('R6 no label, no slot', () => {
    render(<Host spec={RADIO_SPEC} label="" labelEnd={<span data-testid="chip" />} />);
    expect(screen.queryByTestId('chip')).toBeNull();
  });
});

describe('slot is not a child of the label for validation state', () => {
  it('R2 required asterisk stays in the label while the chip stays out', () => {
    function Req(): React.ReactElement {
      const form = useForm<FieldValues>({ defaultValues: { [NAME]: '' } });
      return (
        <TextField
          id={ID}
          name={NAME}
          label={LABEL}
          control={form.control}
          validation={{ required: true }}
          labelEnd={<span data-testid="chip">Optional</span>}
        />
      );
    }
    const { container } = render(<Req />);
    const label = container.querySelector('label') as HTMLLabelElement;
    expect(label.textContent).toContain('*');
    expect(label.contains(screen.getByTestId('chip'))).toBe(false);
  });
});
