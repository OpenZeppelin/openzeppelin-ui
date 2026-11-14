/**
 * DataTable section rows: heading look and the `groupRowClassName` hook (jsdom).
 * The virtualized path and computed styles are covered in the Chromium suite beside this file.
 */
import './sf4-jsdom-setup';

import { render, within } from '@testing-library/react';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { DATA_TABLE_GROUP_HEADER_CELL_CHROME, DATA_TABLE_GROUP_ROW_CHROME } from '../chrome';
import { DataTable } from '../data-table';
import type { DataTableGrouping, DataTableProps } from '../types';
import {
  byRole,
  getKeyRowKey,
  keyColumns,
  keyRows,
  type KeyRow,
} from './grouped-rows.sf22-fixtures';

function tableProps(grouping: DataTableGrouping<KeyRow>): DataTableProps<KeyRow> {
  return {
    caption: 'Keys',
    columns: keyColumns(),
    rows: keyRows(12, [5]),
    getRowKey: getKeyRowKey,
    grouping,
  };
}

function sectionRows(container: HTMLElement): HTMLTableRowElement[] {
  return [
    ...container.querySelectorAll<HTMLTableRowElement>('tr[data-slot="data-table-group-row"]'),
  ];
}

function tokens(className: string): string[] {
  return className.split(/\s+/).filter(Boolean);
}

describe('default section look', () => {
  it('uses a heavier fill than the data rows and small semibold muted type', () => {
    expect(tokens(DATA_TABLE_GROUP_ROW_CHROME)).toContain('bg-muted/60');
    expect(tokens(DATA_TABLE_GROUP_HEADER_CELL_CHROME)).toEqual(
      expect.arrayContaining(['text-xs', 'font-semibold', 'text-muted-foreground'])
    );
    // Weight and size differ from the data cell default (text-sm, normal weight).
    expect(tokens(DATA_TABLE_GROUP_HEADER_CELL_CHROME)).not.toContain('text-sm');
    expect(tokens(DATA_TABLE_GROUP_HEADER_CELL_CHROME)).not.toContain('font-medium');
  });

  it('does not change the case of the label (no uppercase / capitalize / lowercase)', () => {
    for (const token of tokens(DATA_TABLE_GROUP_HEADER_CELL_CHROME)) {
      expect(['uppercase', 'lowercase', 'capitalize', 'normal-case']).not.toContain(token);
    }
    const { container } = render(
      <DataTable {...tableProps({ getGroupKey: () => '0xabAB12cdCD' })} />
    );
    expect(container.querySelector('th[data-slot="data-table-group-header"]')!.textContent).toBe(
      '0xabAB12cdCD'
    );
  });

  it('paints exactly the default classes when groupRowClassName is absent', () => {
    const { container } = render(<DataTable {...tableProps(byRole())} />);
    const rows = sectionRows(container);
    expect(rows.length).toBeGreaterThan(0);
    for (const tr of rows) {
      expect(tr.className).toBe(DATA_TABLE_GROUP_ROW_CHROME);
    }
  });

  it.each([[undefined], ['']])('leaves the default untouched for groupRowClassName=%j', (value) => {
    const { container } = render(
      <DataTable {...tableProps(byRole({ groupRowClassName: value }))} />
    );
    for (const tr of sectionRows(container)) {
      expect(tr.className).toBe(DATA_TABLE_GROUP_ROW_CHROME);
    }
  });
});

describe('groupRowClassName on the plain path', () => {
  it('puts the class on every section row, including the "Other" section', () => {
    const { container } = render(
      <DataTable {...tableProps(byRole({ groupRowClassName: 'my-group-row' }))} />
    );
    const rows = sectionRows(container);
    // Admin, Minter, Pauser, plus the trailing "Other" for the row with no role.
    expect(rows).toHaveLength(4);
    for (const tr of rows) {
      expect(tokens(tr.className)).toContain('my-group-row');
      expect(tokens(tr.className)).toContain('border-b');
    }
    expect(container.querySelector('tr[data-slot="data-table-row"].my-group-row')).toBeNull();
  });

  it('replaces the default fill when the consumer sets a bg-* class', () => {
    const { container } = render(
      <DataTable {...tableProps(byRole({ groupRowClassName: 'bg-accent' }))} />
    );
    for (const tr of sectionRows(container)) {
      const list = tokens(tr.className);
      expect(list).toContain('bg-accent');
      expect(list).not.toContain('bg-muted/60');
      expect(list.filter((t) => t.startsWith('bg-'))).toEqual(['bg-accent']);
    }
  });

  it('keeps a non-conflicting default alongside a consumer class (border stays)', () => {
    const { container } = render(
      <DataTable {...tableProps(byRole({ groupRowClassName: 'text-primary' }))} />
    );
    for (const tr of sectionRows(container)) {
      expect(tokens(tr.className)).toEqual(
        expect.arrayContaining(['border-b', 'bg-muted/60', 'text-primary'])
      );
    }
  });

  it('applies the class after the data has re-grouped (rows prop change)', () => {
    const grouping = byRole({ groupRowClassName: 'my-group-row' });
    const { container, rerender } = render(<DataTable {...tableProps(grouping)} />);
    rerender(<DataTable {...tableProps(grouping)} rows={keyRows(30)} />);
    const rows = sectionRows(container);
    expect(rows).toHaveLength(3);
    for (const tr of rows) {
      expect(tokens(tr.className)).toContain('my-group-row');
    }
  });

  it('does not add the class when the table is not grouped', () => {
    const { container } = render(
      <DataTable caption="Keys" columns={keyColumns()} rows={keyRows(4)} getRowKey={getKeyRowKey} />
    );
    expect(sectionRows(container)).toHaveLength(0);
  });
});

describe('custom group header renderer inside the restyled row', () => {
  it('renders the renderer content unchanged in the spanning <th>', () => {
    const { container } = render(
      <DataTable
        {...tableProps(
          byRole({
            groupRowClassName: 'bg-accent',
            renderGroupHeader: (info) => (
              <span data-testid="custom-header">
                {info.key ?? 'none'} · <b>{info.rows.length}</b>
              </span>
            ),
          })
        )}
      />
    );
    for (const tr of sectionRows(container)) {
      const th = tr.querySelector('th')!;
      expect(th.getAttribute('scope')).toBe('row');
      const custom = within(th).getByTestId('custom-header');
      expect(custom.querySelector('b')!.textContent).toMatch(/^\d+$/);
      expect(th.children).toHaveLength(1);
      expect(th.className).toBe(DATA_TABLE_GROUP_HEADER_CELL_CHROME);
    }
  });

  it('adds no display, position, sticky or inline style to the row or cell', () => {
    const { container } = render(
      <DataTable {...tableProps(byRole({ groupRowClassName: 'bg-accent' }))} />
    );
    const forbidden =
      /^(block|inline|inline-block|flex|inline-flex|grid|table|table-row|table-cell|contents|hidden|sticky|fixed|absolute|relative)$/;
    for (const tr of sectionRows(container)) {
      expect(tokens(tr.className).filter((t) => forbidden.test(t))).toEqual([]);
      expect(tr.hasAttribute('style')).toBe(false);
      expect(tr.querySelector('th')!.hasAttribute('style')).toBe(false);
    }
  });
});

describe('type contract', () => {
  it('groupRowClassName is an optional string on DataTableGrouping', () => {
    expectTypeOf<DataTableGrouping<KeyRow>['groupRowClassName']>().toEqualTypeOf<
      string | undefined
    >();
    const ok: DataTableGrouping<KeyRow> = { getGroupKey: () => 'x', groupRowClassName: 'a b' };
    expect(ok.groupRowClassName).toBe('a b');
  });

  it('rejects a function form', () => {
    const bad: DataTableGrouping<KeyRow> = {
      getGroupKey: () => 'x',
      // @ts-expect-error groupRowClassName is a string, not a function
      groupRowClassName: () => 'a',
    };
    expect(typeof bad.groupRowClassName).toBe('function');
  });
});
