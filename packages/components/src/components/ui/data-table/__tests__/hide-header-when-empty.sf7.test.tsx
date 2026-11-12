/**
 * 005 SF-7 · DataTable `hideHeaderWhenEmpty` — jsdom contract suite.
 *
 * Invariants: artifacts/005-uikit-requests/sf-7-data-table-hide-header-when-empty/03-invariants.md
 * `INV-N` in this file is 005 SF-7's series. Initiative 004 ids are always written `004 INV-NN`.
 * Chromium-only checks (computed display, Tab walk, axe, virtual geometry, browser focus fixup)
 * live in `hide-header-when-empty.sf7.browser.test.tsx`; the running-app proof (INV-6) lives in
 * `examples/basic-react-app/e2e/data-table-hide-header.sf7.spec.ts`.
 */
import './sf4-jsdom-setup';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import { Profiler, type ReactElement } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';

import { logger } from '@openzeppelin/ui-utils';

import { DATA_TABLE_HEAD_CHROME } from '../chrome';
import { DataTable } from '../data-table';
import * as dataTableBarrel from '../index';
import type { DataTableProps, DataTableSortState } from '../types';
import {
  captionTableProps,
  getTokenRowKey,
  numberedTokenRows,
  TOKEN_ROWS,
  tokenColumns,
  type TokenRow,
} from './sf2-fixtures';

const DATA_TABLE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

type Extra = NonNullable<Parameters<typeof captionTableProps>[0]>;

/**
 * Caption-branch props with the opt-in set to `value`. Pass the value explicitly — no default
 * parameter, because a default would turn an explicit `undefined` back into `true`.
 */
function withOptIn(extra: Extra | undefined, value: boolean | undefined): DataTableProps<TokenRow> {
  return { ...captionTableProps(extra), hideHeaderWhenEmpty: value };
}

/** Caption-branch props with the opt-in on. */
function optedIn(extra?: Extra): DataTableProps<TokenRow> {
  return withOptIn(extra, true);
}

function headOf(root: ParentNode): HTMLTableSectionElement {
  const head = root.querySelector<HTMLTableSectionElement>('thead[data-slot="data-table-head"]');
  expect(head, '004 INV-35: <thead> is always mounted').not.toBeNull();
  return head!;
}

/** True when the empty row is painted *with content* (not the infinite blank placeholder). */
function emptyContentPainted(root: ParentNode): boolean {
  const cell = root.querySelector('tr[data-slot="data-table-empty"] > td');
  return cell != null && cell.childNodes.length > 0;
}

function dataRowCount(root: ParentNode): number {
  return root.querySelectorAll('tr[data-slot="data-table-row"]').length;
}

/** React `useId` output differs between independent roots; normalize before comparing HTML. */
function normalizeIds(html: string): string {
  return html.replace(/«[^»]*»|:r[0-9a-z]+:|_r_[0-9a-z]+_/g, 'ID');
}

function stripTheadHidden(html: string): string {
  return html.replace(/(<thead[^>]*?) hidden=""/, '$1');
}

function htmlOf(props: DataTableProps<TokenRow>): string {
  const { container, unmount } = render(<DataTable {...props} />);
  const html = normalizeIds(container.innerHTML);
  unmount();
  return html;
}

const noop = (): void => undefined;
const SEARCH_TOOLBAR = <input aria-label="Search accounts" />;

let loggerError: MockInstance<typeof logger.error>;

beforeEach(() => {
  // Diagnostics are asserted explicitly in INV-8; elsewhere they are noise.
  loggerError = vi.spyOn(logger, 'error').mockImplementation(noop);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Render Contract ────────────────────────────────────────────────────────────

describe('INV-1: opt-in + painted empty state → <thead> mounted but hidden, empty row painted', () => {
  it.each([
    { name: 'three columns', columns: tokenColumns(), withSelection: false, th: 3 },
    { name: 'one column', columns: tokenColumns().slice(0, 1), withSelection: false, th: 1 },
    { name: 'three columns + selection', columns: tokenColumns(), withSelection: true, th: 4 },
    { name: 'zero columns', columns: [], withSelection: false, th: 0 },
  ])('$name: header hidden, $th <th> still mounted, one exposed empty row', (fixture) => {
    const { container } = render(
      <DataTable
        {...optedIn({
          columns: fixture.columns,
          rows: [],
          ...(fixture.withSelection
            ? { selection: { selectedKeys: new Set<string>(), onSelectionChange: vi.fn() } }
            : {}),
        })}
      />
    );
    const head = headOf(container);

    expect(head.hidden).toBe(true);
    expect(head.getAttribute('hidden')).toBe('');
    expect(head.querySelectorAll('tr')).toHaveLength(1);
    expect(head.querySelectorAll('th[scope="col"]')).toHaveLength(fixture.th);
    expect(screen.queryAllByRole('columnheader')).toHaveLength(0);
    expect(screen.queryAllByRole('columnheader', { hidden: true })).toHaveLength(fixture.th);

    const emptyRows = container.querySelectorAll('tr[data-slot="data-table-empty"]');
    expect(emptyRows).toHaveLength(1);
    const cell = emptyRows[0]!.querySelector('td')!;
    expect(cell.colSpan).toBe(Math.max(fixture.th, 1));
    expect(emptyRows[0]!.hasAttribute('aria-hidden')).toBe(false);
    expect(cell.hasAttribute('aria-hidden')).toBe(false);
    expect(within(cell).getByText('Nothing to show')).toBeTruthy();
    expect(dataRowCount(container)).toBe(0);
  });
});

type MatrixCase = { name: string; extra: Extra; hidden: boolean };

const MATRIX: MatrixCase[] = [
  { name: 'rows present', extra: { rows: TOKEN_ROWS }, hidden: false },
  { name: 'real empty dataset', extra: { rows: [] }, hidden: true },
  { name: 'virtualized + empty', extra: { rows: [], virtualized: true }, hidden: true },
  {
    name: 'client page in range',
    extra: {
      rows: numberedTokenRows(3),
      pagination: { kind: 'client', pageIndex: 0, pageSize: 10, onPageChange: noop },
    },
    hidden: false,
  },
  {
    name: 'client pageIndex past the last page',
    extra: {
      rows: numberedTokenRows(3),
      pagination: { kind: 'client', pageIndex: 5, pageSize: 10, onPageChange: noop },
    },
    hidden: true,
  },
  {
    name: 'server page with rows',
    extra: {
      rows: TOKEN_ROWS,
      pagination: { kind: 'server', pageIndex: 1, pageSize: 3, totalCount: 9, onPageChange: noop },
    },
    hidden: false,
  },
  {
    name: 'server page returned rows=[]',
    extra: {
      rows: [],
      pagination: { kind: 'server', pageIndex: 2, pageSize: 10, onPageChange: noop },
    },
    hidden: true,
  },
  {
    name: 'infinite first chunk busy',
    extra: { rows: [], infiniteScroll: { hasMore: true, busy: true, onLoadMore: noop } },
    hidden: false,
  },
  {
    name: 'infinite hasMore, idle',
    extra: { rows: [], infiniteScroll: { hasMore: true, onLoadMore: noop } },
    hidden: false,
  },
  {
    name: 'infinite known-empty',
    extra: { rows: [], infiniteScroll: { hasMore: false, onLoadMore: noop } },
    hidden: true,
  },
  {
    name: 'infinite with rows and more to load',
    extra: { rows: TOKEN_ROWS, infiniteScroll: { hasMore: true, onLoadMore: noop } },
    hidden: false,
  },
];

describe('INV-2: header hidden ⇔ opt-in on ∧ empty row painted with content', () => {
  it.each(MATRIX)('$name → opt-in on hides: $hidden; opt-in off never hides', (fixture) => {
    const on = render(<DataTable {...optedIn(fixture.extra)} />);
    const onHead = headOf(on.container);
    expect(onHead.hidden).toBe(fixture.hidden);
    expect(onHead.hidden, 'hidden must track the painted empty content').toBe(
      emptyContentPainted(on.container)
    );
    if (dataRowCount(on.container) > 0) {
      expect(onHead.hidden, 'never hidden while data rows are painted').toBe(false);
    }
    on.unmount();

    const off = render(<DataTable {...captionTableProps(fixture.extra)} />);
    expect(headOf(off.container).hidden).toBe(false);
    off.unmount();
  });
});

describe('INV-3: default path is unchanged (no `hidden`, same HTML as prop absent)', () => {
  const selectionOn = { selectedKeys: new Set(['a']), onSelectionChange: noop };
  const shapes: { name: string; extra: Extra }[] = [
    { name: 'unframed', extra: {} },
    { name: 'toolbar frame', extra: { toolbar: SEARCH_TOOLBAR } },
    { name: 'selection', extra: { selection: selectionOn } },
    { name: 'toolbar + selection', extra: { toolbar: SEARCH_TOOLBAR, selection: selectionOn } },
  ];
  const cases = shapes.flatMap((shape) => [
    { name: `${shape.name} · empty`, extra: { ...shape.extra, rows: [] } },
    { name: `${shape.name} · rows`, extra: { ...shape.extra, rows: TOKEN_ROWS } },
  ]);

  it.each(cases)('$name: omitted ≡ false ≡ undefined, and no thead[hidden]', ({ extra }) => {
    const absent = htmlOf(captionTableProps(extra));
    expect(absent).not.toMatch(/<thead[^>]* hidden=/);
    expect(htmlOf(withOptIn(extra, false))).toBe(absent);
    expect(htmlOf(withOptIn(extra, undefined))).toBe(absent);
  });

  it.each(cases.filter((c) => c.name.endsWith('rows')))(
    '$name: opt-in on with a painted data body is identical to the default',
    ({ extra }) => {
      expect(htmlOf(optedIn(extra))).toBe(htmlOf(captionTableProps(extra)));
    }
  );
});

describe('INV-4: for an empty table, opt-in on vs off differs only by thead[hidden]', () => {
  const clientPager = { kind: 'client' as const, pageIndex: 0, pageSize: 10, onPageChange: noop };
  const configs: { name: string; extra: Extra }[] = [
    { name: 'unframed', extra: {} },
    { name: 'toolbar', extra: { toolbar: SEARCH_TOOLBAR } },
    { name: 'inside pager', extra: { pagination: { ...clientPager, placement: 'inside' } } },
    { name: 'outside pager', extra: { pagination: clientPager } },
    {
      name: 'controls-only pager',
      extra: { pagination: { ...clientPager, placement: 'inside', hideStatus: true } },
    },
    {
      name: 'selection',
      extra: { selection: { selectedKeys: new Set<string>(), onSelectionChange: noop } },
    },
    { name: 'visible caption', extra: { captionClassName: 'not-sr-only' } },
    { name: 'sticky header', extra: { stickyHeader: true } },
    {
      name: 'demo combo: toolbar + selection + sticky + inside pager',
      extra: {
        toolbar: SEARCH_TOOLBAR,
        stickyHeader: true,
        selection: { selectedKeys: new Set<string>(), onSelectionChange: noop },
        pagination: { ...clientPager, placement: 'inside' },
      },
    },
  ];

  it.each(configs)('$name', ({ extra }) => {
    const off = htmlOf(captionTableProps({ ...extra, rows: [] }));
    const on = htmlOf(optedIn({ ...extra, rows: [] }));
    expect(on).not.toBe(off);
    expect(stripTheadHidden(on)).toBe(off);
    expect(on.match(/ hidden=""/g)?.length ?? 0).toBe((off.match(/ hidden=""/g)?.length ?? 0) + 1);
  });

  it('keeps the known-empty pager copy and disabled arrows (004 INV-254 / INV-255)', () => {
    render(
      <DataTable
        {...optedIn({
          rows: [],
          pagination: { ...clientPager, placement: 'inside' },
        })}
      />
    );
    expect(screen.getByText('No rows')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Previous' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeTruthy();
  });
});

describe('INV-5 (jsdom half): the `hidden` attribute is the only hiding mechanism', () => {
  it.each([{ stickyHeader: false }, { stickyHeader: true }])(
    'stickyHeader=$stickyHeader: thead class stays DATA_TABLE_HEAD_CHROME, no style/aria-hidden/inert',
    ({ stickyHeader }) => {
      const { container } = render(<DataTable {...optedIn({ rows: [], stickyHeader })} />);
      const head = headOf(container);
      expect(head.hidden).toBe(true);
      expect(head.className).toBe(DATA_TABLE_HEAD_CHROME);
      // Decorative sort-icon <svg aria-hidden> is 004 markup and also present with the opt-in off.
      for (const node of [head, ...head.querySelectorAll('tr, th, button, [role="checkbox"]')]) {
        expect(node.hasAttribute('style'), `${node.tagName} style`).toBe(false);
        expect(node.hasAttribute('aria-hidden'), `${node.tagName} aria-hidden`).toBe(false);
        expect(node.hasAttribute('inert'), `${node.tagName} inert`).toBe(false);
      }
      for (const node of [head, ...head.querySelectorAll('*')]) {
        expect(node.getAttribute('class') ?? '').not.toMatch(
          /(^|\s)(hidden|sr-only|invisible)(\s|$)/
        );
      }
    }
  );
});

// ─── Prop / State Contract ─────────────────────────────────────────────────────

describe('INV-7: public surface is one optional readonly boolean, additive only', () => {
  it('type-checks in all three name branches and rejects non-boolean values', () => {
    const base = { columns: tokenColumns(), rows: TOKEN_ROWS, getRowKey: getTokenRowKey };
    const viaCaption: DataTableProps<TokenRow> = {
      ...base,
      caption: 'A',
      hideHeaderWhenEmpty: true,
    };
    const viaLabel: DataTableProps<TokenRow> = {
      ...base,
      'aria-label': 'A',
      hideHeaderWhenEmpty: true,
    };
    const viaLabelledBy: DataTableProps<TokenRow> = {
      ...base,
      'aria-labelledby': 'heading',
      hideHeaderWhenEmpty: false,
    };
    // @ts-expect-error INV-7: a string is not a boolean
    const badString: DataTableProps<TokenRow> = { ...base, caption: 'A', hideHeaderWhenEmpty: 'x' };
    // @ts-expect-error INV-7: a number is not a boolean
    const badNumber: DataTableProps<TokenRow> = { ...base, caption: 'A', hideHeaderWhenEmpty: 1 };

    expectTypeOf<DataTableProps<TokenRow>['hideHeaderWhenEmpty']>().toEqualTypeOf<
      boolean | undefined
    >();
    expect([viaCaption, viaLabel, viaLabelledBy, badString, badNumber]).toHaveLength(5);
  });

  it('does not leak the internal scroller or a header-hidden symbol through the barrel', () => {
    const keys = Object.keys(dataTableBarrel);
    expect(keys).toContain('DataTable');
    expect(keys.filter((key) => /scroller|headerhidden|hideheader/i.test(key))).toEqual([]);
  });
});

describe('INV-8: only strict `true` opts in; every value is valid and silent', () => {
  it.each([
    { label: "'true'", value: 'true' },
    { label: "'false'", value: 'false' },
    { label: '1', value: 1 },
    { label: '{}', value: {} },
    { label: 'null', value: null },
  ])('untyped $label keeps the header visible and does not throw', ({ value }) => {
    const { container } = render(
      <DataTable {...captionTableProps({ rows: [] })} hideHeaderWhenEmpty={value as never} />
    );
    expect(headOf(container).hidden).toBe(false);
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
  });

  it('emits exactly the same dev diagnostics with the opt-in on as off, including while hidden', () => {
    const diagnosticsFor = (optIn: boolean): unknown[][] => {
      loggerError.mockClear();
      const { container, unmount } = render(
        <DataTable
          aria-labelledby="sf7-missing-heading"
          columns={tokenColumns()}
          rows={[]}
          getRowKey={getTokenRowKey}
          hideHeaderWhenEmpty={optIn}
        />
      );
      expect(headOf(container).hidden).toBe(optIn);
      const calls = loggerError.mock.calls.map((call) => [...call]);
      unmount();
      return calls;
    };
    const off = diagnosticsFor(false);
    const on = diagnosticsFor(true);
    expect(off.length, 'fixture must trigger at least one 004 diagnostic').toBeGreaterThan(0);
    expect(on).toEqual(off);
  });
});

describe('INV-9 / INV-10: hide/show is a same-commit attribute flip on the same nodes', () => {
  it('keeps every skeleton node identical through [] → N → [] → M and opt-in toggles', () => {
    let optIn = true;
    const commitViolations: string[] = [];
    const checkCommit = (): void => {
      const head = document.querySelector<HTMLTableSectionElement>('thead');
      if (head == null) return;
      const rows = dataRowCount(document);
      if (head.hidden && rows > 0) commitViolations.push(`hidden header over ${rows} rows`);
      if (optIn && !head.hidden && emptyContentPainted(document)) {
        commitViolations.push('visible header over painted empty content with opt-in on');
      }
    };
    const view = (rows: readonly TokenRow[]): ReactElement => (
      <Profiler id="sf7" onRender={checkCommit}>
        <DataTable
          {...optedIn({
            rows,
            selection: { selectedKeys: new Set<string>(), onSelectionChange: noop },
          })}
          hideHeaderWhenEmpty={optIn}
        />
      </Profiler>
    );

    const { container, rerender } = render(view([]));
    const nodes = {
      wrapper: container.querySelector('[data-slot="data-table"]'),
      table: container.querySelector('table'),
      caption: container.querySelector('caption'),
      thead: container.querySelector('thead'),
      tbody: container.querySelector('tbody'),
      thLabel: container.querySelector('th[data-column-id="label"]'),
      thAmount: container.querySelector('th[data-column-id="amount"]'),
    };
    const expectSameNodes = (step: string): void => {
      expect(container.querySelector('[data-slot="data-table"]'), step).toBe(nodes.wrapper);
      expect(container.querySelector('table'), step).toBe(nodes.table);
      expect(container.querySelector('caption'), step).toBe(nodes.caption);
      expect(container.querySelector('thead'), step).toBe(nodes.thead);
      expect(container.querySelector('tbody'), step).toBe(nodes.tbody);
      expect(container.querySelector('th[data-column-id="label"]'), step).toBe(nodes.thLabel);
      expect(container.querySelector('th[data-column-id="amount"]'), step).toBe(nodes.thAmount);
    };

    const steps: { name: string; rows: readonly TokenRow[]; optIn: boolean; hidden: boolean }[] = [
      { name: 'N rows', rows: TOKEN_ROWS, optIn: true, hidden: false },
      { name: 'back to []', rows: [], optIn: true, hidden: true },
      { name: 'M rows', rows: numberedTokenRows(2), optIn: true, hidden: false },
      { name: '[] again', rows: [], optIn: true, hidden: true },
      { name: 'same props rerender (no stale state)', rows: [], optIn: true, hidden: true },
      { name: 'opt-in toggled off while empty', rows: [], optIn: false, hidden: false },
      { name: 'opt-in toggled back on while empty', rows: [], optIn: true, hidden: true },
      { name: 'rows return', rows: TOKEN_ROWS, optIn: true, hidden: false },
    ];

    expect(headOf(container).hidden).toBe(true);
    for (const step of steps) {
      optIn = step.optIn;
      rerender(view(step.rows));
      expect(headOf(container).hidden, step.name).toBe(step.hidden);
      expectSameNodes(step.name);
    }
    expect(commitViolations).toEqual([]);
  });
});

// ─── Interaction & Transition ───────────────────────────────────────────────────

describe('INV-11: sort state survives hide/show and is unreachable while hidden', () => {
  const rowOrder = (root: ParentNode): (string | null)[] =>
    [...root.querySelectorAll('tr[data-slot="data-table-row"]')].map((row) =>
      row.getAttribute('data-row-key')
    );

  it('uncontrolled: descending sort comes back with the same aria-sort and row order', () => {
    const { container, rerender } = render(<DataTable {...optedIn({ rows: TOKEN_ROWS })} />);
    const sortAmount = (): HTMLElement =>
      screen.getByRole('button', { name: /Sort by Amount/, hidden: true });
    fireEvent.click(sortAmount());
    fireEvent.click(sortAmount());
    const amountTh = container.querySelector('th[data-column-id="amount"]')!;
    expect(amountTh.getAttribute('aria-sort')).toBe('descending');
    expect(rowOrder(container)).toEqual(['c', 'b', 'a']);

    rerender(<DataTable {...optedIn({ rows: [] })} />);
    expect(headOf(container).hidden).toBe(true);
    expect(screen.queryAllByRole('button', { name: /sort/i })).toHaveLength(0);
    expect(sortAmount()).toHaveProperty('disabled', false);
    expect(amountTh.getAttribute('aria-sort')).toBe('descending');

    rerender(<DataTable {...optedIn({ rows: TOKEN_ROWS })} />);
    expect(headOf(container).hidden).toBe(false);
    expect(amountTh.getAttribute('aria-sort')).toBe('descending');
    expect(rowOrder(container)).toEqual(['c', 'b', 'a']);
  });

  it('controlled: a sort change made while hidden is what shows on return; no callback fires', () => {
    const onSortChange = vi.fn();
    const props = (rows: readonly TokenRow[], sort: DataTableSortState): DataTableProps<TokenRow> =>
      optedIn({ rows, sort, onSortChange });
    const { container, rerender } = render(
      <DataTable {...props(TOKEN_ROWS, { columnId: 'amount', direction: 'asc' })} />
    );
    const amountTh = container.querySelector('th[data-column-id="amount"]')!;
    expect(amountTh.getAttribute('aria-sort')).toBe('ascending');

    rerender(<DataTable {...props([], { columnId: 'amount', direction: 'asc' })} />);
    rerender(<DataTable {...props([], { columnId: 'amount', direction: 'desc' })} />);
    expect(headOf(container).hidden).toBe(true);

    rerender(<DataTable {...props(TOKEN_ROWS, { columnId: 'amount', direction: 'desc' })} />);
    expect(amountTh.getAttribute('aria-sort')).toBe('descending');
    expect(rowOrder(container)).toEqual(['c', 'b', 'a']);
    expect(onSortChange).not.toHaveBeenCalled();
  });
});

describe('INV-12: select-all reflects selectedKeys in the first commit after the header returns', () => {
  const selectAll = (): HTMLElement =>
    screen.getByRole('checkbox', { name: 'Select all', hidden: true });
  const rowCheckbox = (root: ParentNode, key: string): Element =>
    root.querySelector(`tr[data-row-key="${key}"] [role="checkbox"]`)!;

  it.each([
    { name: 'some selected', keys: ['a', 'b'], header: 'mixed' },
    { name: 'all selected', keys: ['a', 'b', 'c'], header: 'true' },
    { name: 'none selected', keys: [], header: 'false' },
  ])('$name → select-all $header on return; rows keep their checks', ({ keys, header }) => {
    const onSelectionChange = vi.fn();
    const selection = { selectedKeys: new Set(keys), onSelectionChange };
    const { container, rerender } = render(
      <DataTable {...optedIn({ rows: TOKEN_ROWS, selection })} />
    );
    expect(selectAll().getAttribute('aria-checked')).toBe(header);

    rerender(<DataTable {...optedIn({ rows: [], selection })} />);
    expect(headOf(container).hidden).toBe(true);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(selectAll().getAttribute('aria-checked')).toBe('false');
    expect(selectAll()).toHaveProperty('disabled', true);
    fireEvent.click(selectAll());
    expect(onSelectionChange).not.toHaveBeenCalled();

    rerender(<DataTable {...optedIn({ rows: TOKEN_ROWS, selection })} />);
    expect(headOf(container).hidden).toBe(false);
    expect(selectAll().getAttribute('aria-checked')).toBe(header);
    expect(selectAll()).toHaveProperty('disabled', false);
    for (const row of TOKEN_ROWS) {
      expect(rowCheckbox(container, row.id).getAttribute('aria-checked'), row.id).toBe(
        keys.includes(row.id) ? 'true' : 'false'
      );
    }
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});

describe('INV-13: the opt-in emits no callbacks', () => {
  it('paged + sortable + selectable: identical call lists on vs off across [] → N → [] → N', () => {
    const run = (optIn: boolean): unknown[][][] => {
      const onSortChange = vi.fn();
      const onSelectionChange = vi.fn();
      const onPageChange = vi.fn();
      const view = (rows: readonly TokenRow[], flag: boolean): ReactElement => (
        <DataTable
          {...optedIn({
            rows,
            onSortChange,
            selection: { selectedKeys: new Set(['a']), onSelectionChange },
            pagination: { kind: 'client', pageIndex: 0, pageSize: 2, onPageChange },
          })}
          hideHeaderWhenEmpty={flag}
        />
      );
      const { rerender, unmount } = render(view([], optIn));
      rerender(view(TOKEN_ROWS, optIn));
      rerender(view([], optIn));
      rerender(view([], !optIn));
      rerender(view([], optIn));
      rerender(view(TOKEN_ROWS, optIn));
      unmount();
      return [onSortChange.mock.calls, onSelectionChange.mock.calls, onPageChange.mock.calls];
    };
    const on = run(true);
    expect(on).toEqual(run(false));
    expect(on[0]).toEqual([]);
    expect(on[1]).toEqual([]);
  });

  it('infinite feed: identical onLoadMore calls on vs off across known-empty ↔ loading ↔ rows', () => {
    const run = (optIn: boolean): unknown[][] => {
      const onLoadMore = vi.fn();
      const view = (rows: readonly TokenRow[], hasMore: boolean, busy: boolean): ReactElement => (
        <DataTable {...withOptIn({ rows, infiniteScroll: { hasMore, busy, onLoadMore } }, optIn)} />
      );
      const { rerender, unmount } = render(view([], false, false));
      rerender(view([], true, true));
      rerender(view(TOKEN_ROWS, true, false));
      rerender(view([], false, false));
      unmount();
      return onLoadMore.mock.calls;
    };
    expect(run(true)).toEqual(run(false));
  });
});

describe('INV-14 (jsdom half): the kit never moves focus because the header hid', () => {
  it('does not call focus() when a focused sort button is hidden and shown again', () => {
    const { container, rerender } = render(<DataTable {...optedIn({ rows: TOKEN_ROWS })} />);
    const sortButton = screen.getByRole('button', { name: /Sort by Amount/ });
    act(() => {
      sortButton.focus();
    });
    expect(document.activeElement).toBe(sortButton);
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    const blurSpy = vi.spyOn(HTMLElement.prototype, 'blur');

    expect(() => {
      rerender(<DataTable {...optedIn({ rows: [] })} />);
    }).not.toThrow();
    expect(headOf(container).hidden).toBe(true);
    rerender(<DataTable {...optedIn({ rows: TOKEN_ROWS })} />);

    expect(focusSpy).not.toHaveBeenCalled();
    expect(blurSpy).not.toHaveBeenCalled();
  });
});

describe('INV-15: pager stays reachable and operable while the header is hidden', () => {
  it.each([
    {
      name: 'client pageIndex past the last page',
      rows: numberedTokenRows(3),
      pagination: { kind: 'client' as const, pageIndex: 5, pageSize: 10 },
      previousTarget: 4,
    },
    {
      name: 'server page returned rows=[]',
      rows: [],
      pagination: { kind: 'server' as const, pageIndex: 2, pageSize: 10, hasNextPage: false },
      previousTarget: 1,
    },
  ])('$name: Previous is enabled and calls onPageChange like opt-in off', (fixture) => {
    const callsFor = (optIn: boolean): unknown[][] => {
      const onPageChange = vi.fn();
      const { container, unmount } = render(
        <DataTable
          {...withOptIn(
            { rows: fixture.rows, pagination: { ...fixture.pagination, onPageChange } },
            optIn
          )}
        />
      );
      expect(headOf(container).hidden).toBe(optIn);
      const previous = screen.getByRole('button', { name: 'Previous' });
      expect(previous).toHaveProperty('disabled', false);
      fireEvent.click(previous);
      unmount();
      return onPageChange.mock.calls;
    };
    const on = callsFor(true);
    expect(on).toEqual([[fixture.previousTarget]]);
    expect(on).toEqual(callsFor(false));
  });
});

// ─── Performance, Scalability & Stability ──────────────────────────────────────

describe('INV-16: the opt-in adds zero renders, observers, listeners and timers', () => {
  it('commits the same number of times on vs off over [] → N → [] → N', () => {
    const commitsFor = (optIn: boolean): number => {
      let commits = 0;
      const view = (rows: readonly TokenRow[]): ReactElement => (
        <Profiler id="sf7-perf" onRender={() => (commits += 1)}>
          <DataTable {...withOptIn({ rows, toolbar: SEARCH_TOOLBAR }, optIn)} />
        </Profiler>
      );
      const { rerender, unmount } = render(view([]));
      rerender(view(numberedTokenRows(50)));
      rerender(view([]));
      rerender(view(numberedTokenRows(50)));
      unmount();
      return commits;
    };
    const off = commitsFor(false);
    expect(off).toBeGreaterThan(0);
    expect(commitsFor(true)).toBe(off);
  });

  it('100 mount/unmount cycles register the same observers, listeners and timers on vs off', () => {
    const tally = (optIn: boolean): Record<string, number> => {
      const spies = {
        observe: vi.spyOn(ResizeObserver.prototype, 'observe'),
        disconnect: vi.spyOn(ResizeObserver.prototype, 'disconnect'),
        addListener: vi.spyOn(EventTarget.prototype, 'addEventListener'),
        removeListener: vi.spyOn(EventTarget.prototype, 'removeEventListener'),
        setTimeout: vi.spyOn(globalThis, 'setTimeout'),
      };
      for (let cycle = 0; cycle < 100; cycle += 1) {
        const { unmount } = render(<DataTable {...withOptIn({ rows: [] }, optIn)} />);
        unmount();
      }
      const counts = Object.fromEntries(
        Object.entries(spies).map(([name, spy]) => [name, spy.mock.calls.length])
      );
      for (const spy of Object.values(spies)) spy.mockRestore();
      return counts;
    };
    const off = tally(false);
    expect(tally(true)).toEqual(off);
    expect(off.observe).toBe(off.disconnect);
  });
});

describe('INV-18: SSR and hydration are consistent', () => {
  it.each([
    { name: 'empty + opt-in', rows: [], optIn: true, hidden: true },
    { name: 'empty + default', rows: [], optIn: false, hidden: false },
    { name: 'rows + opt-in', rows: TOKEN_ROWS, optIn: true, hidden: false },
  ])('$name: server markup hidden=$hidden and hydrates without a mismatch', (fixture) => {
    const element = <DataTable {...withOptIn({ rows: fixture.rows }, fixture.optIn)} />;
    const html = renderToString(element);
    expect(/<thead[^>]*\shidden=""/.test(html)).toBe(fixture.hidden);

    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);
    const serverHead = headOf(container);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(noop);
    const recoverable: unknown[] = [];
    let root: Root | undefined;

    try {
      act(() => {
        root = hydrateRoot(container, element, {
          onRecoverableError: (error) => recoverable.push(error),
        });
      });
      expect(consoleError.mock.calls.filter((call) => /hydrat/i.test(String(call[0])))).toEqual([]);
      expect(recoverable).toEqual([]);
      expect(headOf(container), 'hydration reuses the server <thead>').toBe(serverHead);
      expect(serverHead.hidden).toBe(fixture.hidden);
    } finally {
      act(() => root?.unmount());
      container.remove();
    }
  });
});

// ─── Async / Loading / Error / Empty ────────────────────────────────────────────

describe('INV-19: infinite first chunk keeps the header; only a known-empty feed hides it', () => {
  type Branch = 'placeholder' | 'empty-content' | 'data';
  const branchOf = (root: ParentNode): Branch => {
    if (dataRowCount(root) > 0) return 'data';
    return emptyContentPainted(root) ? 'empty-content' : 'placeholder';
  };

  it.each<{
    name: string;
    rows: readonly TokenRow[];
    hasMore: boolean;
    busy: boolean;
    branch: Branch;
    hidden: boolean;
  }>([
    {
      name: 'busy, zero rows',
      rows: [],
      hasMore: true,
      busy: true,
      branch: 'placeholder',
      hidden: false,
    },
    {
      name: 'hasMore, idle, zero rows',
      rows: [],
      hasMore: true,
      busy: false,
      branch: 'placeholder',
      hidden: false,
    },
    {
      name: 'known-empty',
      rows: [],
      hasMore: false,
      busy: false,
      branch: 'empty-content',
      hidden: true,
    },
    {
      name: 'rows > 0',
      rows: TOKEN_ROWS,
      hasMore: true,
      busy: false,
      branch: 'data',
      hidden: false,
    },
  ])('$name → body $branch, header hidden=$hidden', (fixture) => {
    const { container } = render(
      <DataTable
        {...optedIn({
          rows: fixture.rows,
          infiniteScroll: { hasMore: fixture.hasMore, busy: fixture.busy, onLoadMore: noop },
        })}
      />
    );
    expect(branchOf(container)).toBe(fixture.branch);
    expect(headOf(container).hidden).toBe(fixture.hidden);
  });

  it('a known-empty feed reset to a new query shows the header over the placeholder', () => {
    const view = (rows: readonly TokenRow[], hasMore: boolean, busy: boolean): ReactElement => (
      <DataTable {...optedIn({ rows, infiniteScroll: { hasMore, busy, onLoadMore: noop } })} />
    );
    const { container, rerender } = render(view([], false, false));
    expect(headOf(container).hidden).toBe(true);
    rerender(view([], true, true));
    expect(headOf(container).hidden).toBe(false);
    expect(emptyContentPainted(container)).toBe(false);
    rerender(view(TOKEN_ROWS, true, false));
    expect(headOf(container).hidden).toBe(false);
  });
});

describe('INV-20: still one empty state; the opt-in adds no loading or error presentation', () => {
  it('renders the consumer emptyState slot (with an action) instead of the kit EmptyState', () => {
    const { container } = render(
      <DataTable
        {...optedIn({
          rows: [],
          emptyState: (
            <div data-testid="sf7-slot">
              No matching accounts <button type="button">Add account</button>
            </div>
          ),
        })}
      />
    );
    expect(headOf(container).hidden).toBe(true);
    expect(screen.getByTestId('sf7-slot')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add account' })).toBeTruthy();
    expect(screen.queryByText('Nothing to show')).toBeNull();
  });

  it('keeps emptyTitle / emptyDescription precedence', () => {
    render(
      <DataTable
        {...optedIn({
          rows: [],
          emptyTitle: 'No accounts',
          emptyDescription: 'Try a new search',
        })}
      />
    );
    expect(screen.getByText('No accounts')).toBeTruthy();
    expect(screen.getByText('Try a new search')).toBeTruthy();
  });

  it.each(['progressbar', 'alert', 'status'] as const)(
    'adds no %s role compared with opt-in off',
    (role) => {
      const off = render(<DataTable {...captionTableProps({ rows: [] })} />);
      const offCount = screen.queryAllByRole(role).length;
      off.unmount();
      render(<DataTable {...optedIn({ rows: [] })} />);
      expect(screen.queryAllByRole(role)).toHaveLength(offCount);
    }
  );
});

// ─── Accessibility ─────────────────────────────────────────────────────────────

describe('INV-21: the table keeps its accessible name and role while the header is hidden', () => {
  const base = {
    columns: tokenColumns(),
    rows: [] as readonly TokenRow[],
    getRowKey: getTokenRowKey,
  };
  const branches: {
    name: string;
    element: (optIn: boolean) => ReactElement;
    accessibleName: string;
  }[] = [
    {
      name: 'string caption',
      element: (optIn) => <DataTable {...withOptIn({ rows: [] }, optIn)} />,
      accessibleName: 'Tokenization requests',
    },
    {
      name: 'ReactNode caption',
      element: (optIn) => (
        <DataTable
          {...withOptIn(
            {
              rows: [],
              caption: (
                <span>
                  Token <em>requests</em>
                </span>
              ),
            },
            optIn
          )}
        />
      ),
      accessibleName: 'Token requests',
    },
    {
      name: 'visible caption (not-sr-only)',
      element: (optIn) => (
        <DataTable {...withOptIn({ rows: [], captionClassName: 'not-sr-only' }, optIn)} />
      ),
      accessibleName: 'Tokenization requests',
    },
    {
      name: 'aria-label',
      element: (optIn) => (
        <DataTable {...base} aria-label="Pending requests" hideHeaderWhenEmpty={optIn} />
      ),
      accessibleName: 'Pending requests',
    },
    {
      name: 'aria-labelledby',
      element: (optIn) => (
        <>
          <h2 id="sf7-external-heading">External requests</h2>
          <DataTable {...base} aria-labelledby="sf7-external-heading" hideHeaderWhenEmpty={optIn} />
        </>
      ),
      accessibleName: 'External requests',
    },
  ];

  it.each(branches)('$name: same named table on vs off, one exposed empty row', (branch) => {
    const off = render(branch.element(false));
    expect(screen.getByRole('table', { name: branch.accessibleName })).toBeTruthy();
    off.unmount();

    const { container } = render(branch.element(true));
    expect(headOf(container).hidden).toBe(true);
    const table = screen.getByRole('table', { name: branch.accessibleName });
    expect(table).toBe(container.querySelector('table'));
    expect(table.hasAttribute('aria-hidden')).toBe(false);
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.getAttribute('data-slot')).toBe('data-table-empty');
    expect(within(rows[0]!).getByRole('cell')).toBeTruthy();
  });
});

describe('INV-22 (jsdom half): hidden header controls leave the a11y tree; empty content stays', () => {
  it('exposes zero sort buttons / checkboxes while hidden, yet they stay mounted and unmarked', () => {
    const { container } = render(
      <DataTable
        {...optedIn({
          rows: [],
          selection: { selectedKeys: new Set<string>(), onSelectionChange: noop },
          emptyState: <button type="button">Add account</button>,
        })}
      />
    );
    expect(headOf(container).hidden).toBe(true);
    expect(screen.queryAllByRole('button', { name: /sort/i })).toHaveLength(0);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Add account' })).toBeTruthy();

    const headerControls = screen
      .queryAllByRole('button', { hidden: true })
      .filter((node) => headOf(container).contains(node));
    expect(headerControls.length).toBeGreaterThan(0);
    for (const control of headerControls) {
      expect(control.hasAttribute('aria-hidden')).toBe(false);
      expect(control.hasAttribute('inert')).toBe(false);
      expect(control.getAttribute('tabindex')).not.toBe('-1');
    }
  });
});

describe('INV-23: no ARIA row-count claim counts a hidden header', () => {
  it.each<{ name: string; extra: Extra }>([
    { name: 'plain empty', extra: { rows: [] } },
    { name: 'virtualized empty', extra: { rows: [], virtualized: true } },
    {
      name: 'infinite known-empty',
      extra: { rows: [], infiniteScroll: { hasMore: false, onLoadMore: noop } },
    },
    {
      name: 'virtualized + infinite known-empty',
      extra: { rows: [], virtualized: true, infiniteScroll: { hasMore: false, onLoadMore: noop } },
    },
  ])('$name: no aria-rowcount on the table, no aria-rowindex on the header row', ({ extra }) => {
    const { container } = render(<DataTable {...optedIn(extra)} />);
    expect(headOf(container).hidden).toBe(true);
    expect(container.querySelector('table')!.hasAttribute('aria-rowcount')).toBe(false);
    expect(headOf(container).querySelector('tr')!.hasAttribute('aria-rowindex')).toBe(false);
  });

  it('boundary: an infinite feed with more to load keeps the header visible and indexed', () => {
    const { container } = render(
      <DataTable {...optedIn({ rows: [], infiniteScroll: { hasMore: true, onLoadMore: noop } })} />
    );
    expect(headOf(container).hidden).toBe(false);
    expect(headOf(container).querySelector('tr')!.getAttribute('aria-rowindex')).toBe('1');
  });
});

// ─── Source shape (cheap guards for structural clauses) ────────────────────────

describe('source shape: INV-2 single empty-row rule, INV-4 / INV-9 single reader, INV-14 no focus', () => {
  const read = (name: string): string => readFileSync(join(DATA_TABLE_DIR, name), 'utf8');
  const SOURCES = [
    'chrome.ts',
    'data-table-scroller.tsx',
    'data-table.tsx',
    'helpers.ts',
    'index.ts',
    'pagination-controls.tsx',
    'selection.ts',
    'sort.ts',
    'types.ts',
    'virtualization.ts',
  ];

  it('INV-2: `isEmpty && !suppressEmptyChrome` is defined once, in data-table.tsx only', () => {
    const rule = /isEmpty\s*&&\s*!suppressEmptyChrome/g;
    // Code only: the scroller's prop doc comment names the expression on purpose.
    const code = (name: string): string =>
      read(name)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
    expect(code('data-table.tsx').match(rule)).toHaveLength(1);
    expect(code('data-table-scroller.tsx').match(rule)).toBeNull();
  });

  it('INV-4 / INV-9: only types.ts and data-table.tsx mention hideHeaderWhenEmpty', () => {
    const readers = SOURCES.filter((name) => read(name).includes('hideHeaderWhenEmpty'));
    expect(readers).toEqual(['data-table.tsx', 'types.ts']);
  });

  it('INV-14: DataTable and its scroller contain no .focus( / .blur( call', () => {
    for (const name of ['data-table.tsx', 'data-table-scroller.tsx']) {
      expect(read(name), name).not.toMatch(/\.(focus|blur)\(/);
    }
  });
});
