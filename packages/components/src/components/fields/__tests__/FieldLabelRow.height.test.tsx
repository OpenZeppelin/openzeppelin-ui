/**
 * @vitest-environment jsdom
 *
 * FieldLabelRow height when `labelEnd` holds a chip.
 * Low stakes: no invariants artifact. Contract from the acceptance scenarios and code draft:
 *   H1 end slot uses `-my-1` + items-center so a default Badge does not grow the row
 *   H2 without `labelEnd` the bare label is returned (no wrapper) — plain height unchanged
 *   H3 end slot never clips (`overflow-hidden` / fixed height cap absent); chip stays fully visible
 *   H4 failure: empty / null / false `labelEnd` leaves the DOM identical to omitting the prop
 * Real neighbour heights, chip clipping, and input overlap live in the example-app e2e suite
 * (`label-end-height.spec.ts`) because the components browser config has no Tailwind.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import React from 'react';
import { useForm } from 'react-hook-form';

import { Badge } from '../../ui/badge';
import { Form } from '../../ui/form';
import { TextField } from '../TextField';
import { FieldLabelRow } from '../utils/FieldLabelRow';

afterEach(cleanup);

function TextHost({ labelEnd }: { labelEnd?: React.ReactNode }): React.ReactElement {
  const form = useForm({ defaultValues: { value: '' } });
  return (
    <Form {...form}>
      <form>
        <TextField
          id="label-row-height"
          name="value"
          label="Memo"
          control={form.control}
          labelEnd={labelEnd}
        />
      </form>
    </Form>
  );
}

const endSlot = (root: HTMLElement): HTMLElement | null =>
  root.querySelector('[data-slot="field-label-end"]');
const labelRow = (root: HTMLElement): HTMLElement | null =>
  root.querySelector('[data-slot="field-label-row"]');

describe('FieldLabelRow height with labelEnd', () => {
  it('H1 happy: end slot uses -my-1 and items-center so a Badge chip does not grow the row', () => {
    const { container } = render(
      <TextHost labelEnd={<Badge label="Optional" variant="outline" data-testid="chip" />} />
    );
    const end = endSlot(container);
    expect(end).not.toBeNull();
    expect(end!.className).toContain('-my-1');
    expect(end!.className).toContain('items-center');
    expect(end!.className).toContain('shrink-0');
    expect(end!.contains(screen.getByTestId('chip'))).toBe(true);
    expect(labelRow(container)?.className).toContain('items-center');
  });

  it('H3 happy: end slot does not clip — no overflow-hidden and no fixed height cap', () => {
    const { container } = render(
      <TextHost labelEnd={<Badge label="Optional" variant="outline" data-testid="chip" />} />
    );
    const end = endSlot(container)!;
    expect(end.className).not.toMatch(/overflow-hidden|overflow-clip/);
    expect(end.className).not.toMatch(/\bh-\[|\bh-full\b|\bh-px\b|\bmax-h-/);
    expect(screen.getByTestId('chip')).toBeTruthy();
  });

  it('H2 boundary: without labelEnd the bare label is returned (no row wrapper)', () => {
    const { container } = render(<TextHost />);
    expect(labelRow(container)).toBeNull();
    expect(endSlot(container)).toBeNull();
    expect(container.querySelector('label')).not.toBeNull();
  });

  it.each([undefined, null, false] as const)(
    'H4 failure: labelEnd=%s matches a field with the prop omitted',
    (value) => {
      const a = render(<TextHost />).container.innerHTML;
      cleanup();
      const b = render(<TextHost labelEnd={value} />).container.innerHTML;
      expect(b).toBe(a);
      expect(b).not.toContain('field-label-end');
    }
  );

  it('H1 boundary: a short text end node still gets the same -my-1 end slot', () => {
    const { container } = render(<TextHost labelEnd={<span data-testid="text-end">USD</span>} />);
    const end = endSlot(container)!;
    expect(end.className).toContain('-my-1');
    expect(end.className).toContain('items-center');
    expect(end.contains(screen.getByTestId('text-end'))).toBe(true);
  });

  it('edge: a taller custom end node still renders fully (no clip classes on the slot)', () => {
    const { container } = render(
      <TextHost
        labelEnd={
          <span className="inline-flex h-8 items-center" data-testid="tall">
            Tall
          </span>
        }
      />
    );
    const end = endSlot(container)!;
    expect(end.className).not.toMatch(/overflow-hidden|overflow-clip/);
    expect(screen.getByTestId('tall').textContent).toBe('Tall');
  });

  it('H2 unit: FieldLabelRow alone returns children when labelEnd is absent', () => {
    const { container } = render(
      <FieldLabelRow>
        <label data-testid="bare">Label</label>
      </FieldLabelRow>
    );
    expect(labelRow(container)).toBeNull();
    expect(screen.getByTestId('bare').parentElement?.getAttribute('data-slot')).not.toBe(
      'field-label-row'
    );
  });

  it('H1 unit: FieldLabelRow alone applies -my-1 on the end slot', () => {
    const { container } = render(
      <FieldLabelRow labelEnd={<span data-testid="end">chip</span>}>
        <label>Label</label>
      </FieldLabelRow>
    );
    const end = endSlot(container)!;
    expect(end.className.split(/\s+/)).toEqual(
      expect.arrayContaining(['flex', 'shrink-0', 'items-center', 'gap-2', '-my-1'])
    );
    expect(end.contains(screen.getByTestId('end'))).toBe(true);
  });
});
