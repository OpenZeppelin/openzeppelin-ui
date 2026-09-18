/**
 * SF-11 · Example-app numbered pager — INV-232 / SC-010 on the paginated demo.
 */
import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderDemo, SLOT } from './sf7-helpers';

function paginatedRoot(container: HTMLElement): HTMLElement {
  const caption = [...container.querySelectorAll(SLOT.caption)].find(
    (node) => node.textContent === 'Catalog (paginated)'
  );
  const wrap = caption?.closest(SLOT.wrap);
  const root = wrap?.parentElement;
  if (!(root instanceof HTMLElement) || root.getAttribute('data-slot') !== 'data-table-root') {
    throw new Error('SF-11: expected the paginated catalog DataTable root');
  }
  return root;
}

describe('SF-11 demo: paginated catalog shows a bounded numbered window', () => {
  it('pages 100 rows at size 5 with ellipsis, current page 1, and five body rows', () => {
    const { container } = renderDemo();
    const root = paginatedRoot(container);
    expect(root.querySelectorAll(SLOT.row).length, 'page size 5').toBe(5);
    expect(root.querySelector('[data-slot="data-table-pagination-status"]')?.textContent).toBe(
      'Showing 1–5 of 100'
    );
    const numbers = root.querySelectorAll('[data-slot="data-table-pagination-page"]');
    expect(numbers.length, 'INV-241: clustered window ≤ 5 numbers').toBeLessThanOrEqual(5);
    expect(root.querySelector('[data-page-index="0"]')?.getAttribute('aria-current')).toBe('page');
    expect(
      root.querySelectorAll('[data-slot="data-table-pagination-ellipsis"]').length
    ).toBeGreaterThan(0);
  });

  it('jumps to page 3 from a number button without remounting the table', () => {
    const { container } = renderDemo();
    const root = paginatedRoot(container);
    const table = root.querySelector(SLOT.table);
    fireEvent.click(root.querySelector('[data-page-index="2"]') as HTMLButtonElement);
    expect(root.querySelector('[data-slot="data-table-pagination-status"]')?.textContent).toBe(
      'Showing 11–15 of 100'
    );
    expect(root.querySelector('[data-page-index="2"]')?.getAttribute('aria-current')).toBe('page');
    expect(root.querySelector(SLOT.table), 'INV-250: table node identity').toBe(table);
  });
});
