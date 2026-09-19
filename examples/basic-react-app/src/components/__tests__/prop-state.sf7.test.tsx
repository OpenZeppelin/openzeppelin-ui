/**
 * SF-7 · Prop / state contract — DEMO-INV-4, DEMO-INV-5.
 */
import { describe, expect, it } from 'vitest';

import { headerCell, renderDemo, SLOT } from './sf7-helpers';

describe('DEMO-INV-4: sortable vs unsortable columns', () => {
  it('offers sort controls on Token, Status, and Amount only', () => {
    const { container } = renderDemo();
    for (const id of ['token', 'status', 'amount'] as const) {
      expect(
        headerCell(container, id).querySelector('button'),
        `DEMO-INV-4: ${id} must be sortable`
      ).not.toBeNull();
    }
    expect(
      headerCell(container, 'holder').querySelector('button'),
      'DEMO-INV-4: Holder must not pretend to sort'
    ).toBeNull();
    expect(
      headerCell(container, 'actions').querySelector('button'),
      'DEMO-INV-4: Actions header must not pretend to sort'
    ).toBeNull();
  });
});

describe('DEMO-INV-5: empty-state path keeps the table mounted', () => {
  it('exposes a Clear rows control while rows are present and no empty slot', () => {
    const { container, getByRole, queryByText } = renderDemo();
    expect(getByRole('button', { name: 'Clear rows' })).toBeTruthy();
    expect(container.querySelector(SLOT.empty)).toBeNull();
    expect(queryByText(/Row source is empty/)).toBeNull();
  });
});
