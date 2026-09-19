/**
 * SF-12 · Browser verification — INV-324, INV-323, INV-60*.
 * Opt-in via `pnpm test:browser`.
 */
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import { DataTable } from '../data-table';
import { getTokenRowKey, TOKEN_ROWS, tokenColumns } from './sf2-fixtures';

function injectContractStyles(): void {
  if (document.getElementById('sf12-contract-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'sf12-contract-styles';
  style.textContent = `
    .text-start { text-align: start; }
    .text-end { text-align: end; }
    .overflow-x-auto { overflow-x: auto; }
    .caption-top { caption-side: top; }
  `;
  document.head.appendChild(style);
}

async function axeViolations(container: HTMLElement): Promise<axe.Result[]> {
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
  });
  return results.violations;
}

describe('INV-324 / INV-323 (browser): localized sort names stay keyboard-operable', () => {
  it('cycles sort with Enter on a named override and keeps axe clean', async () => {
    injectContractStyles();
    const { container } = render(
      <DataTable
        caption="Tokenization requests"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
        formatSortButtonName={({ columnName, direction }) => {
          if (direction === 'none') {
            return `Ordenar por ${columnName}`;
          }
          if (direction === 'asc') {
            return `Ordenar por ${columnName}, ascendente`;
          }
          return `Ordenar por ${columnName}, descendente`;
        }}
      />
    );
    const button = screen.getByRole('button', { name: 'Ordenar por Amount' });
    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Ordenar por Amount, ascendente' })).toBeTruthy();
    expect(
      container
        .querySelector('[data-slot="data-table-header-cell"][data-column-id="amount"]')
        ?.getAttribute('aria-sort')
    ).toBe('ascending');
    const violations = await axeViolations(container);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
});
