/**
 * SF-7 · Async / empty states — DEMO-INV-5, DEMO-INV-7.
 */
import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { primaryWrap, renderDemo, SLOT } from './sf7-helpers';

describe('DEMO-INV-5: populated and empty presentations are distinct', () => {
  it('swaps row slots for the empty slot without dropping the table name', () => {
    const { container, getByRole } = renderDemo();
    const wrap = primaryWrap(container);
    expect(wrap.querySelectorAll(SLOT.row).length).toBeGreaterThan(0);
    expect(wrap.querySelector(SLOT.empty)).toBeNull();
    fireEvent.click(getByRole('button', { name: 'Clear rows' }));
    expect(primaryWrap(container).querySelectorAll(SLOT.row).length).toBe(0);
    expect(primaryWrap(container).querySelector(SLOT.empty)).not.toBeNull();
    expect(primaryWrap(container).textContent).not.toMatch(/\bUSDC\b/);
    expect(primaryWrap(container).querySelector(SLOT.table)).not.toBeNull();
    expect(primaryWrap(container).querySelector(SLOT.caption)?.textContent).toBe('Token holdings');
  });
});

describe('DEMO-INV-7: no in-flight fetch chrome', () => {
  it('does not render a loading or error fetch surface on the demo table', () => {
    const { queryByText, queryByRole } = renderDemo();
    expect(queryByText(/loading/i)).toBeNull();
    expect(queryByRole('alert')).toBeNull();
    expect(queryByText(/failed to load/i)).toBeNull();
  });
});
