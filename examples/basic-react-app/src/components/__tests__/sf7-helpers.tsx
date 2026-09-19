import { render, type RenderResult } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';

import { DataTableDemo } from '../DataTableDemo';

export const SLOT = {
  wrap: '[data-slot="data-table"]',
  table: '[data-slot="data-table-table"]',
  caption: '[data-slot="data-table-caption"]',
  row: '[data-slot="data-table-row"]',
  cell: '[data-slot="data-table-cell"]',
  empty: '[data-slot="data-table-empty"]',
  headerCell: '[data-slot="data-table-header-cell"]',
} as const;

export function primaryWrap(container: HTMLElement): HTMLElement {
  const wrap = container.querySelector(SLOT.wrap);
  if (!(wrap instanceof HTMLElement)) {
    throw new Error('DEMO-INV-1: expected a kit DataTable wrapper');
  }
  return wrap;
}

const SAMPLE_TOKEN_ORDER = ['USDC', 'WETH', 'DAI', 'USDT'] as const;

export function renderDemo(): RenderResult {
  return render(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <DataTableDemo />
    </ThemeProvider>
  );
}

export function tokenOrder(container: HTMLElement): string[] {
  return [...primaryWrap(container).querySelectorAll(`${SLOT.row} [data-column-id="token"]`)].map(
    (cell) => cell.textContent ?? ''
  );
}

export function expectedUnsortedTokenOrder(): readonly string[] {
  return SAMPLE_TOKEN_ORDER;
}

export function headerCell(container: HTMLElement, columnId: string): HTMLElement {
  const th = primaryWrap(container).querySelector(
    `${SLOT.headerCell}[data-column-id="${columnId}"]`
  );
  if (!(th instanceof HTMLElement)) {
    throw new Error(`DEMO-INV-1: expected header cell for column "${columnId}"`);
  }
  return th;
}

export function sortButton(container: HTMLElement, columnId: string): HTMLButtonElement {
  const button = headerCell(container, columnId).querySelector('button');
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`DEMO-INV-4: expected a sort control on column "${columnId}"`);
  }
  return button;
}
