/**
 * SF-1 · Accessibility data on the column type — INV-25, INV-26, INV-27.
 * Markup association is SF-2; this slice freezes naming fields and forbids HTML attrs.
 */
import { describe, expect, it } from 'vitest';

import { Checkbox } from '../../checkbox';
import type { DataTableColumn } from '../types';

type Row = { id: string };

describe('INV-25: a column always has naming data (header | headerLabel | id)', () => {
  it('allows a string header without headerLabel', () => {
    const column: DataTableColumn<Row> = {
      id: 'amount',
      header: 'Amount',
      cell: () => null,
    };
    expect(typeof column.header).toBe('string');
    expect(column.headerLabel).toBeUndefined();
  });

  it('allows a composed header with headerLabel for the accessible column name', () => {
    const column = {
      id: 'select',
      header: <Checkbox aria-label="Select all" />,
      headerLabel: 'Select',
      cell: () => <Checkbox aria-label="Select row" />,
    } satisfies DataTableColumn<Row>;
    expect(column.headerLabel).toBe('Select');
    expect(column.id).toBe('select');
  });

  it('allows a composed header with omitted headerLabel (name falls through to id at SF-2)', () => {
    const column: DataTableColumn<Row> = {
      id: 'select',
      header: <Checkbox aria-label="Select all" />,
      cell: () => null,
    };
    expect(column.headerLabel).toBeUndefined();
    expect(column.id).toBe('select');
  });
});

describe('INV-26: accessible name data is not HTML association markup', () => {
  it('rejects scope / htmlId / headers fields on the column type', () => {
    const withScope = {
      id: 'amount',
      header: 'Amount',
      cell: () => null,
      // @ts-expect-error INV-26: scope is SF-2 markup, not a column field
      scope: 'col',
    } satisfies DataTableColumn<Row>;

    const withHtmlId = {
      id: 'amount',
      header: 'Amount',
      cell: () => null,
      // @ts-expect-error INV-26: htmlId is not required on the column
      htmlId: 'col-amount',
    } satisfies DataTableColumn<Row>;

    const withHeaders = {
      id: 'amount',
      header: 'Amount',
      cell: () => null,
      // @ts-expect-error INV-26: headers association attrs are not column fields
      headers: 'col-amount',
    } satisfies DataTableColumn<Row>;

    expect(withScope.id).toBe('amount');
    expect(withHtmlId.id).toBe('amount');
    expect(withHeaders.id).toBe('amount');
  });
});

describe('INV-27: column type does not auto-inject aria-label onto header/cell nodes', () => {
  it('has no ariaLabel field that would substitute for control names', () => {
    const withAriaLabel = {
      id: 'select',
      header: <Checkbox aria-label="Select all" />,
      headerLabel: 'Select',
      cell: () => <Checkbox aria-label="Select row" />,
      // @ts-expect-error INV-27: kit does not inject aria-label onto arbitrary ReactNodes
      ariaLabel: 'Select',
    } satisfies DataTableColumn<Row>;
    expect(withAriaLabel.headerLabel).toBe('Select');
  });
});
