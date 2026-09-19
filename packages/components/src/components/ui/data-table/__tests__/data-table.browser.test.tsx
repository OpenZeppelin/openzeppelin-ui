/**
 * SF-2 · Browser verification — INV-56 … INV-60.
 * Opt-in via `pnpm test:browser`. GitHub CI runs that script after jsdom `pnpm test`.
 */
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import { Button } from '../../button';
import { Checkbox } from '../../checkbox';
import { DataTable } from '../data-table';
import {
  captionTableProps,
  getTokenRowKey,
  TOKEN_ROWS,
  tokenColumns,
  type TokenRow,
} from './sf2-fixtures';

/**
 * The Vitest browser config does not load the kit stylesheet. Inject the
 * logical-align / overflow / sr-only recipes INV-36 / INV-57 / INV-59 depend on
 * so computed-style assertions exercise those class names, not a missing CSS file.
 */
function injectContractStyles(): void {
  if (document.getElementById('sf2-contract-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'sf2-contract-styles';
  style.textContent = `
    .text-start { text-align: start; }
    .text-end { text-align: end; }
    .overflow-x-auto { overflow-x: auto; }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }
    .caption-top { caption-side: top; }
  `;
  document.head.appendChild(style);
}

const mixedColumns = [
  {
    id: 'select',
    header: <Checkbox aria-label="Select all" />,
    headerLabel: 'Select',
    cell: (row: TokenRow) => <Checkbox aria-label={`Select ${row.label}`} />,
  },
  ...tokenColumns(),
];

async function axeViolations(
  container: HTMLElement,
  options?: { disableHeadingOrder?: boolean }
): Promise<axe.Result[]> {
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    rules: options?.disableHeadingOrder ? { 'heading-order': { enabled: false } } : undefined,
  });
  return results.violations;
}

describe('INV-56 (browser): accessibility tree is a named table, not a grid', () => {
  it('resolves table, columnheaders, rows, and cells for all three name branches', async () => {
    injectContractStyles();
    const { unmount: unmountCaption } = render(
      <DataTable
        caption="Tokenization requests"
        columns={mixedColumns}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
      />
    );
    expect(screen.getByRole('table', { name: 'Tokenization requests' })).toBeTruthy();
    expect(screen.queryByRole('grid')).toBeNull();
    expect(screen.getByRole('columnheader', { name: 'Select' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Amount' })).toBeTruthy();
    expect(screen.getAllByRole('columnheader')).toHaveLength(mixedColumns.length);
    expect(screen.getAllByRole('row').length).toBe(TOKEN_ROWS.length + 1);
    expect(screen.getAllByRole('cell').length).toBe(TOKEN_ROWS.length * mixedColumns.length);
    unmountCaption();

    const { unmount: unmountLabel } = render(
      <DataTable
        aria-label="Holders"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
      />
    );
    expect(screen.getByRole('table', { name: 'Holders' })).toBeTruthy();
    unmountLabel();

    render(
      <>
        <h2 id="holders-heading">Holders list</h2>
        <DataTable
          aria-labelledby="holders-heading"
          columns={tokenColumns()}
          rows={TOKEN_ROWS}
          getRowKey={getTokenRowKey}
        />
      </>
    );
    expect(screen.getByRole('table', { name: 'Holders list' })).toBeTruthy();
  });

  it('keeps native table display values and wrapper overflow', () => {
    injectContractStyles();
    const { container } = render(<DataTable {...captionTableProps()} />);
    const table = container.querySelector('[data-slot="data-table-table"]');
    const caption = container.querySelector('[data-slot="data-table-caption"]');
    const head = container.querySelector('[data-slot="data-table-head"]');
    const body = container.querySelector('[data-slot="data-table-body"]');
    const row = container.querySelector('[data-slot="data-table-row"]');
    const th = container.querySelector('[data-slot="data-table-header-cell"]');
    const td = container.querySelector('[data-slot="data-table-cell"]');
    const wrap = container.querySelector('[data-slot="data-table"]');
    expect(table && getComputedStyle(table).display).toBe('table');
    expect(caption?.className.split(/\s+/), 'INV-57: caption uses the sr-only exception').toContain(
      'sr-only'
    );
    expect(head && getComputedStyle(head).display).toBe('table-header-group');
    expect(body && getComputedStyle(body).display).toBe('table-row-group');
    expect(row && getComputedStyle(row).display).toBe('table-row');
    expect(th && getComputedStyle(th).display).toBe('table-cell');
    expect(td && getComputedStyle(td).display).toBe('table-cell');
    expect(wrap && getComputedStyle(wrap).overflowX).toBe('auto');
    expect(table && getComputedStyle(table).overflowX).toBe('visible');
  });
});

describe('INV-57 (browser): sr-only caption still names the table', () => {
  it('keeps the accessible name when the default caption is visually hidden', () => {
    injectContractStyles();
    const { container } = render(
      <DataTable
        caption="Tokenization requests"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
      />
    );
    expect(screen.getByRole('table', { name: 'Tokenization requests' })).toBeTruthy();
    const caption = container.querySelector('[data-slot="data-table-caption"]');
    expect(caption).not.toBeNull();
    const box = caption!.getBoundingClientRect();
    expect(box.width, 'INV-57: sr-only caption is not in the visual flow').toBeLessThanOrEqual(1);
    expect(box.height).toBeLessThanOrEqual(1);
  });

  it('lets not-sr-only restore a visible native caption', () => {
    injectContractStyles();
    const { container } = render(
      <DataTable
        caption="Visible tokenization requests"
        captionClassName="not-sr-only"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
      />
    );
    expect(screen.getByRole('table', { name: 'Visible tokenization requests' })).toBeTruthy();
    const caption = container.querySelector('[data-slot="data-table-caption"]');
    expect(caption?.className, 'INV-224: integrator visibility override wins').toContain(
      'not-sr-only'
    );
    expect(caption?.className.split(/\s+/)).not.toContain('sr-only');
    expect(caption!.getBoundingClientRect().width).toBeGreaterThan(1);
  });
});

describe('INV-58 (browser): widgets are keyboard-reachable in DOM order', () => {
  it('tabs header then row widgets, then the empty-slot action', async () => {
    injectContractStyles();
    const columns = [
      {
        id: 'act',
        header: <button type="button">Select all</button>,
        headerLabel: 'Select',
        cell: (row: TokenRow) => (
          <button type="button" data-row={row.id}>
            Open {row.id}
          </button>
        ),
      },
    ];
    const { unmount } = render(
      <DataTable
        caption="T"
        columns={columns}
        rows={TOKEN_ROWS.slice(0, 2)}
        getRowKey={getTokenRowKey}
      />
    );
    await userEvent.tab();
    expect(document.activeElement?.textContent).toBe('Select all');
    await userEvent.tab();
    expect((document.activeElement as HTMLElement | null)?.getAttribute('data-row')).toBe('a');
    await userEvent.tab();
    expect((document.activeElement as HTMLElement | null)?.getAttribute('data-row')).toBe('b');
    unmount();

    render(
      <DataTable
        caption="T"
        columns={tokenColumns().map((column) => {
          const { sortable: _sortable, getSortValue: _getSortValue, ...rest } = column;
          return rest;
        })}
        rows={[]}
        getRowKey={getTokenRowKey}
        emptyState={
          <Button type="button" data-empty-action="true">
            Add account
          </Button>
        }
      />
    );
    await userEvent.tab();
    expect(document.activeElement?.getAttribute('data-empty-action')).toBe('true');
  });

  it('lets Space toggle a cell checkbox (kit consumes no keys)', async () => {
    const columns = [
      {
        id: 'select',
        header: 'Select',
        cell: () => <Checkbox aria-label="Select row" />,
      },
    ];
    render(
      <DataTable
        caption="T"
        columns={columns}
        rows={TOKEN_ROWS.slice(0, 1)}
        getRowKey={getTokenRowKey}
      />
    );
    const checkbox = screen.getByRole('checkbox', { name: 'Select row' });
    checkbox.focus();
    await userEvent.keyboard(' ');
    expect(
      checkbox.getAttribute('data-state') === 'checked' ||
        checkbox.getAttribute('aria-checked') === 'true'
    ).toBe(true);
  });
});

describe('INV-59 (browser): logical alignment flips in RTL', () => {
  it('places end-aligned content on the physical left under dir=rtl', () => {
    injectContractStyles();
    const { container } = render(
      <div dir="rtl">
        <DataTable {...captionTableProps()} />
      </div>
    );
    const startTd = container.querySelector(
      '[data-slot="data-table-cell"][data-column-id="label"]'
    );
    const endTd = container.querySelector('[data-slot="data-table-cell"][data-column-id="amount"]');
    expect(startTd && getComputedStyle(startTd).textAlign).toMatch(/start|right/);
    expect(endTd && getComputedStyle(endTd).textAlign).toMatch(/end|left/);
    expect(endTd!.getBoundingClientRect().left).toBeLessThan(startTd!.getBoundingClientRect().left);
  });
});

describe('INV-60 (browser): axe WCAG 2.1 A/AA reports zero violations', () => {
  it('audits caption, label, labelledby, empty default, empty slot, and checkbox composition', async () => {
    injectContractStyles();

    const captionRender = render(
      <DataTable
        caption="Tokenization requests"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
      />
    );
    expect(await axeViolations(captionRender.container), 'INV-60(a) caption branch').toEqual([]);
    captionRender.unmount();

    const labelRender = render(
      <DataTable
        aria-label="Holders"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
      />
    );
    expect(await axeViolations(labelRender.container), 'INV-60(b) aria-label branch').toEqual([]);
    labelRender.unmount();

    const labelledByRender = render(
      <>
        <h2 id="holders-heading">Holders list</h2>
        <DataTable
          aria-labelledby="holders-heading"
          columns={tokenColumns()}
          rows={TOKEN_ROWS}
          getRowKey={getTokenRowKey}
        />
      </>
    );
    expect(
      await axeViolations(labelledByRender.container),
      'INV-60(c) aria-labelledby branch'
    ).toEqual([]);
    labelledByRender.unmount();

    const emptyDefault = render(
      <DataTable
        caption="Tokenization requests"
        columns={tokenColumns()}
        rows={[]}
        getRowKey={getTokenRowKey}
      />
    );
    expect(
      await axeViolations(emptyDefault.container, { disableHeadingOrder: true }),
      'INV-60(d) empty kit EmptyState (heading-order disabled — EmptyState <h3> is accepted)'
    ).toEqual([]);
    emptyDefault.unmount();

    const emptySlot = render(
      <DataTable
        caption="Tokenization requests"
        columns={tokenColumns()}
        rows={[]}
        getRowKey={getTokenRowKey}
        emptyState={<Button type="button">Add account</Button>}
      />
    );
    expect(await axeViolations(emptySlot.container), 'INV-60(e) empty slot').toEqual([]);
    emptySlot.unmount();

    const composed = render(
      <DataTable
        caption="Tokenization requests"
        columns={mixedColumns}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
      />
    );
    expect(await axeViolations(composed.container), 'INV-60(f) checkbox composition').toEqual([]);
    composed.unmount();

    const actionsRender = render(
      <DataTable
        caption="Accounts"
        columns={[
          { id: 'label', header: 'Account', cell: (row: TokenRow) => row.label },
          {
            id: 'actions',
            header: '',
            headerLabel: 'Actions',
            cell: () => <Button type="button">Edit Roles</Button>,
          },
        ]}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
      />
    );
    expect(
      await axeViolations(actionsRender.container),
      'INV-230: empty visible action header remains named and WCAG A/AA'
    ).toEqual([]);
    actionsRender.unmount();

    const sortableMixed = [
      {
        id: 'select',
        header: <Checkbox aria-label="Select all" />,
        headerLabel: 'Select',
        sortable: true,
        cell: (row: TokenRow) => <Checkbox aria-label={`Select ${row.label}`} />,
      },
      ...tokenColumns(),
    ];
    const sortableRender = render(
      <DataTable
        caption="Tokenization requests"
        columns={sortableMixed}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
      />
    );
    expect(
      await axeViolations(sortableRender.container),
      'INV-88 / INV-60: sortable mixed headers stay WCAG A/AA'
    ).toEqual([]);
  });
});

describe('INV-86 / INV-88 / INV-89 / INV-90 (browser): sort chrome stays table semantics', () => {
  const sortableSelect = {
    id: 'select',
    header: <Checkbox aria-label="Select all" />,
    headerLabel: 'Select',
    sortable: true,
    cell: (row: TokenRow) => <Checkbox aria-label={`Select ${row.label}`} />,
  };

  it('names wrap and sibling buttons; columnheaders still resolve to column names', () => {
    injectContractStyles();
    render(
      <DataTable
        caption="Tokenization requests"
        columns={[sortableSelect, ...tokenColumns()]}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
      />
    );
    expect(screen.getByRole('table', { name: 'Tokenization requests' })).toBeTruthy();
    expect(screen.queryByRole('grid')).toBeNull();
    expect(screen.getByRole('button', { name: 'Sort by Amount' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Sort by Select/i })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Amount' })).toBeTruthy();
    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
  });

  it('keeps computed display of sortable th as table-cell', () => {
    injectContractStyles();
    const { container } = render(
      <DataTable
        caption="T"
        columns={[sortableSelect, ...tokenColumns()]}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
      />
    );
    const amountTh = container.querySelector('[data-column-id="amount"]');
    const selectTh = container.querySelector('[data-column-id="select"]');
    expect(amountTh && getComputedStyle(amountTh).display).toBe('table-cell');
    expect(selectTh && getComputedStyle(selectTh).display).toBe('table-cell');
  });

  it('tabs integrator header widgets then sort buttons, then body widgets', async () => {
    injectContractStyles();
    const columns = [
      {
        id: 'select',
        header: <button type="button">Select all</button>,
        headerLabel: 'Select',
        sortable: true,
        cell: (row: TokenRow) => (
          <button type="button" data-row={row.id}>
            Open {row.id}
          </button>
        ),
      },
      ...tokenColumns(),
    ];
    render(
      <DataTable
        caption="T"
        columns={columns}
        rows={TOKEN_ROWS.slice(0, 1)}
        getRowKey={getTokenRowKey}
      />
    );
    await userEvent.tab();
    expect(document.activeElement?.textContent).toBe('Select all');
    await userEvent.tab();
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/Sort by Select/i);
    await userEvent.tab();
    expect(document.activeElement?.textContent).toContain('Amount');
    await userEvent.tab();
    expect((document.activeElement as HTMLElement | null)?.getAttribute('data-row')).toBe('a');
  });

  it('activates sort with Space on the header button and does not sort from a cell checkbox', async () => {
    injectContractStyles();
    const { container } = render(
      <DataTable
        caption="T"
        columns={tokenColumns()}
        rows={TOKEN_ROWS}
        getRowKey={getTokenRowKey}
      />
    );
    const amountButton = screen.getByRole('button', { name: 'Sort by Amount' });
    amountButton.focus();
    await userEvent.keyboard(' ');
    expect(container.querySelector('[data-column-id="amount"]')?.getAttribute('aria-sort')).toBe(
      'ascending'
    );

    const withCheckbox = [
      {
        id: 'select',
        header: 'Select',
        cell: () => <Checkbox aria-label="Select row" />,
      },
    ];
    const second = render(
      <DataTable
        caption="U"
        columns={withCheckbox}
        rows={TOKEN_ROWS.slice(0, 1)}
        getRowKey={getTokenRowKey}
        onSortChange={() => {
          throw new Error('INV-89: cell Space must not sort');
        }}
      />
    );
    const checkbox = second.container.querySelector('[aria-label="Select row"]');
    (checkbox as HTMLElement).focus();
    await userEvent.keyboard(' ');
    expect(
      checkbox?.getAttribute('data-state') === 'checked' ||
        checkbox?.getAttribute('aria-checked') === 'true'
    ).toBe(true);
  });
});
