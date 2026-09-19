/**
 * SF-8 · Example-app controlled row-selection composition.
 */
import { fireEvent, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderDemo, SLOT } from './sf7-helpers';

function selectableWrap(container: HTMLElement): HTMLElement {
  const table = within(container).getByRole('table', { name: 'Accounts (selectable)' });
  const wrap = table.closest(SLOT.wrap);
  if (!(wrap instanceof HTMLElement)) {
    throw new Error('SF-8 demo: expected selectable DataTable wrapper');
  }
  return wrap;
}

describe('SF-8 demo: app-owned row selection', () => {
  it('renders kit selection chrome and an app-owned selected count', () => {
    const { container, getByRole, getByText } = renderDemo();
    const wrap = selectableWrap(container);

    expect(wrap.querySelectorAll(SLOT.headerCell)).toHaveLength(6);
    expect(getByRole('checkbox', { name: 'Select all accounts' })).toBeTruthy();
    expect(getByRole('checkbox', { name: 'Select USDC account' })).toBeTruthy();
    expect(getByText('0 of 4 accounts selected')).toBeTruthy();
  });

  it('updates row and select-all state through the controlled selection prop', () => {
    const { getByRole, getByText } = renderDemo();
    const selectAll = getByRole('checkbox', { name: 'Select all accounts' });

    fireEvent.click(selectAll);
    expect(getByText('2 of 4 accounts selected')).toBeTruthy();
    expect(selectAll.getAttribute('data-state')).toBe('checked');

    fireEvent.click(selectAll);
    expect(getByText('0 of 4 accounts selected')).toBeTruthy();
    expect(selectAll.getAttribute('data-state')).toBe('unchecked');

    fireEvent.click(getByRole('checkbox', { name: 'Select WETH account' }));
    expect(getByText('1 of 4 accounts selected')).toBeTruthy();
  });

  it('keeps selected identity while sorting the composed table', () => {
    const { container, getByRole } = renderDemo();
    const wrap = selectableWrap(container);
    const wethCheckbox = getByRole('checkbox', { name: 'Select WETH account' });
    fireEvent.click(wethCheckbox);

    const amountSort = wrap.querySelector(`${SLOT.headerCell}[data-column-id="amount"] button`);
    expect(amountSort).toBeInstanceOf(HTMLButtonElement);
    fireEvent.click(amountSort!);

    const firstRow = wrap.querySelector(SLOT.row);
    expect(firstRow?.querySelector('[data-column-id="token"]')?.textContent).toBe('WETH');
    expect(firstRow?.getAttribute('data-selected')).toBe('true');
    expect(wethCheckbox.getAttribute('data-state')).toBe('checked');
  });
});
