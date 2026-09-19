/**
 * SF-7 · Render contract — DEMO-INV-1, DEMO-INV-2, DEMO-INV-3.
 */
import { describe, expect, it } from 'vitest';

import {
  expectedUnsortedTokenOrder,
  headerCell,
  primaryWrap,
  renderDemo,
  SLOT,
  tokenOrder,
} from './sf7-helpers';

describe('DEMO-INV-1: named kit table is on the page', () => {
  it('renders a kit DataTable named Token holdings with four sample rows', () => {
    const { container } = renderDemo();
    const wrap = primaryWrap(container);
    const table = wrap.querySelector(SLOT.table);
    const caption = wrap.querySelector(SLOT.caption);
    expect(wrap, 'DEMO-INV-1: kit DataTable wrapper must mount').not.toBeNull();
    expect(table, 'DEMO-INV-1: native table slot must exist').not.toBeNull();
    expect(caption?.textContent, 'DEMO-INV-1: caption names the table').toBe('Token holdings');
    expect(tokenOrder(container), 'DEMO-INV-1: sample holdings must render in given order').toEqual(
      [...expectedUnsortedTokenOrder()]
    );
  });
});

describe('DEMO-INV-2: mixed composed cells', () => {
  it('shows Token text, AddressDisplay copy control, Status badges, and outline actions', () => {
    const { container, getAllByText } = renderDemo();
    expect(
      primaryWrap(container).querySelector(`${SLOT.cell}[data-column-id="token"]`)?.textContent
    ).toBe('USDC');
    expect(
      container.querySelector(
        `${SLOT.cell}[data-column-id="holder"] button[aria-label="Copy address"]`
      ),
      'DEMO-INV-2: Holder cell must compose AddressDisplay (copy control)'
    ).not.toBeNull();
    expect(
      getAllByText('Active').length,
      'DEMO-INV-2: Status Badge for active rows'
    ).toBeGreaterThan(0);
    expect(getAllByText('Paused').length).toBeGreaterThan(0);
    expect(getAllByText('Revoked').length).toBeGreaterThan(0);
    const action = primaryWrap(container).querySelector(
      `${SLOT.cell}[data-column-id="actions"] button`
    );
    expect(
      action?.textContent,
      'DEMO-INV-2 / INV-231: Actions cell must compose a text button'
    ).toBe('Edit Roles');
  });
});

describe('DEMO-INV-3: amount column is end-aligned', () => {
  it('marks Amount header and cells data-align=end with text-end', () => {
    const { container } = renderDemo();
    const amountTh = headerCell(container, 'amount');
    expect(amountTh.getAttribute('data-align'), 'DEMO-INV-3: Amount header align').toBe('end');
    expect(amountTh.className).toMatch(/\btext-end\b/);
    const amountCells = primaryWrap(container).querySelectorAll(
      `${SLOT.cell}[data-column-id="amount"]`
    );
    expect(amountCells.length).toBe(4);
    for (const cell of amountCells) {
      expect(cell.getAttribute('data-align'), 'DEMO-INV-3: Amount cell align').toBe('end');
      expect(cell.className).toMatch(/\btext-end\b/);
    }
    const tokenTh = headerCell(container, 'token');
    expect(tokenTh.getAttribute('data-align'), 'DEMO-INV-3: Token stays start-aligned').toBe(
      'start'
    );
  });
});
