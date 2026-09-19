/**
 * SF-7 · Interaction & transition — DEMO-INV-4, DEMO-INV-5.
 */
import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  expectedUnsortedTokenOrder,
  headerCell,
  primaryWrap,
  renderDemo,
  SLOT,
  sortButton,
  tokenOrder,
} from './sf7-helpers';

describe('DEMO-INV-4: client sort cycle on Amount', () => {
  it('cycles Amount asc → desc → given order', () => {
    const { container } = renderDemo();
    const amount = sortButton(container, 'amount');
    fireEvent.click(amount);
    expect(tokenOrder(container), 'DEMO-INV-4: Amount asc puts 42 WETH first').toEqual([
      'WETH',
      'USDT',
      'DAI',
      'USDC',
    ]);
    expect(headerCell(container, 'amount').getAttribute('aria-sort')).toBe('ascending');
    fireEvent.click(amount);
    expect(tokenOrder(container), 'DEMO-INV-4: Amount desc puts 1,250,000 USDC first').toEqual([
      'USDC',
      'DAI',
      'USDT',
      'WETH',
    ]);
    expect(headerCell(container, 'amount').getAttribute('aria-sort')).toBe('descending');
    fireEvent.click(amount);
    expect(tokenOrder(container), 'DEMO-INV-4: third click restores given order').toEqual([
      ...expectedUnsortedTokenOrder(),
    ]);
    expect(headerCell(container, 'amount').hasAttribute('aria-sort')).toBe(false);
  });

  it('does not reorder when the Holder header is clicked', () => {
    const { container } = renderDemo();
    fireEvent.click(headerCell(container, 'holder'));
    expect(
      tokenOrder(container),
      'DEMO-INV-4: unsortable Holder must not scramble row order'
    ).toEqual([...expectedUnsortedTokenOrder()]);
  });
});

describe('DEMO-INV-5: clear and restore without unmounting the section', () => {
  it('clears to empty state then restores sample rows on the same section', () => {
    const { container, getByRole, getByText } = renderDemo();
    const sectionTitle = getByText('DataTable', { selector: 'h2' });
    fireEvent.click(getByRole('button', { name: 'Clear rows' }));
    expect(
      primaryWrap(container).querySelectorAll(SLOT.row).length,
      'DEMO-INV-5: body rows gone'
    ).toBe(0);
    expect(container.querySelector(SLOT.empty), 'DEMO-INV-5: empty slot visible').not.toBeNull();
    expect(getByText(/Row source is empty/)).toBeTruthy();
    expect(container.querySelector(SLOT.caption)?.textContent).toBe('Token holdings');
    expect(
      getByText('DataTable', { selector: 'h2' }),
      'DEMO-INV-5: DemoSection must stay mounted'
    ).toBe(sectionTitle);
    const emptySlot = container.querySelector(SLOT.empty);
    expect(emptySlot).not.toBeNull();
    const restoreInEmpty = emptySlot?.querySelector('button');
    expect(restoreInEmpty, 'DEMO-INV-5: emptyState must include restore').not.toBeNull();
    fireEvent.click(restoreInEmpty!);
    expect(tokenOrder(container)).toEqual([...expectedUnsortedTokenOrder()]);
    expect(container.querySelector(SLOT.empty)).toBeNull();
  });
});
