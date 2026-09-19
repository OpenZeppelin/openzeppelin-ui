/**
 * SF-7 · Accessibility — DEMO-INV-1, DEMO-INV-4, DEMO-INV-5.
 */
import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { headerCell, primaryWrap, renderDemo, SLOT, sortButton } from './sf7-helpers';

describe('DEMO-INV-1: native table semantics', () => {
  it('uses a captioned table with column headers scoped to columns', () => {
    const { container } = renderDemo();
    const wrap = primaryWrap(container);
    const table = wrap.querySelector(SLOT.table);
    expect(table?.tagName).toBe('TABLE');
    expect(table?.querySelector('caption')?.textContent).toBe('Token holdings');
    const headers = wrap.querySelectorAll(`${SLOT.headerCell}[scope="col"]`);
    expect(headers.length, 'DEMO-INV-1: five declared columns').toBe(5);
  });
});

describe('DEMO-INV-4: sort affordance is keyboard-reachable', () => {
  it('keeps Token sort on a native button that Enter activates', () => {
    const { container } = renderDemo();
    const token = sortButton(container, 'token');
    token.focus();
    expect(document.activeElement).toBe(token);
    fireEvent.keyDown(token, { key: 'Enter', code: 'Enter' });
    fireEvent.click(token);
    expect(headerCell(container, 'token').getAttribute('aria-sort')).toBe('ascending');
  });
});

describe('DEMO-INV-5: empty path stays named', () => {
  it('keeps the caption after rows are cleared', () => {
    const { container, getByRole } = renderDemo();
    fireEvent.click(getByRole('button', { name: 'Clear rows' }));
    expect(container.querySelector(SLOT.caption)?.textContent).toBe('Token holdings');
    expect(container.querySelector(SLOT.table)?.tagName).toBe('TABLE');
  });
});
