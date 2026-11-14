/**
 * 005 SF-22 · DataTable grouped rows — jsdom contract suite.
 *
 * Invariants: artifacts/005-uikit-requests/sf-22-data-table-grouped-rows/03-invariants.md
 * `INV-N` in this file is 005 SF-22's series. Initiative 004 ids are always written `004 INV-NN`.
 * Chromium-only checks (computed display and sticky z-order, live offsets, scrollToRowKey
 * landing, end-of-feed under real measurement, Tab walk, axe, timing tiers) live in
 * `grouped-rows.sf22.browser.test.tsx`; the running-app proof (scenario 4, INV-8) lives in
 * `examples/basic-react-app/e2e/data-table-grouped-rows.sf22.spec.ts`.
 *
 * Property tests use a seeded generator (`mulberry32`); a failure message names the seed.
 */
import './sf4-jsdom-setup';

import { createHash } from 'node:crypto';
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
import {
  Component,
  createRef,
  Profiler,
  useState,
  type ErrorInfo,
  type ReactElement,
  type ReactNode,
} from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';

import { logger } from '@openzeppelin/ui-utils';

import { DATA_TABLE_GROUP_HEADER_CELL_CHROME, DATA_TABLE_GROUP_ROW_CHROME } from '../chrome';
import { DataTable } from '../data-table';
import {
  buildGroupedBodyItems,
  DATA_TABLE_DEFAULT_UNGROUPED_LABEL,
  DATA_TABLE_GROUP_ITEM_KEY_PREFIX,
  DATA_TABLE_GROUP_ROW_ESTIMATE_SIZE,
  DATA_TABLE_UNGROUPED_ITEM_KEY,
  findPaintIndexByRowKey,
  groupDisplayRows,
  isEmptyGroupHeaderContent,
  isInvalidGroupKey,
  resolveGroupHeaderContent,
  resolveGroupKey,
  type DataTableBodyItem,
} from '../grouping';
import { sliceClientPage } from '../helpers';
import * as dataTableBarrel from '../index';
import { applyClientSort } from '../sort';
import type {
  DataTableColumn,
  DataTableGroupHeaderInfo,
  DataTableGrouping,
  DataTableProps,
  DataTableSortState,
  DataTableVirtualizationHandle,
} from '../types';
import { DATA_TABLE_INFINITE_SENTINEL_KEY } from '../virtualization';
import baseline from './grouped-rows.sf22-baseline.json';
import {
  byRole,
  defaultPathMatrix,
  getKeyRowKey,
  keyColumns,
  keyRows,
  mulberry32,
  normalizeIds,
  paginatedKeyRows,
  type KeyRow,
} from './grouped-rows.sf22-fixtures';

// INV-27: pass-through spies on the pipeline so scroll-only renders can be shown to skip it.
vi.mock('../grouping', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../grouping')>();
  return {
    ...actual,
    groupDisplayRows: vi.fn(actual.groupDisplayRows),
    buildGroupedBodyItems: vi.fn(actual.buildGroupedBodyItems),
  };
});

const DATA_TABLE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const TABLE_SOURCE = readFileSync(join(DATA_TABLE_DIR, 'data-table.tsx'), 'utf8');
const SCROLLER_SOURCE = readFileSync(join(DATA_TABLE_DIR, 'data-table-scroller.tsx'), 'utf8');
const GROUPING_SOURCE = readFileSync(join(DATA_TABLE_DIR, 'grouping.ts'), 'utf8');
const TYPES_SOURCE = readFileSync(join(DATA_TABLE_DIR, 'types.ts'), 'utf8');

const noop = (): void => undefined;
const RESERVED = '__data-table-group';

let loggerError: MockInstance<typeof logger.error>;

beforeEach(() => {
  // Diagnostics are asserted explicitly in INV-18 / INV-31; elsewhere they are noise.
  loggerError = vi.spyOn(logger, 'error').mockImplementation(noop);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

// ─── helpers ────────────────────────────────────────────────────────────────────

/** Untyped overrides: tests mix name branches and load strategies across one helper. */
function tableProps(extra: Readonly<Record<string, unknown>> = {}): DataTableProps<KeyRow> {
  return {
    caption: 'Keys',
    columns: keyColumns(),
    rows: keyRows(12, [5]),
    getRowKey: getKeyRowKey,
    grouping: byRole(),
    ...extra,
  } as DataTableProps<KeyRow>;
}

type Painted =
  | { kind: 'group'; key: string | null; el: HTMLTableRowElement }
  | { kind: 'row'; key: string; el: HTMLTableRowElement };

function bodyOf(root: ParentNode): HTMLTableSectionElement {
  const body = root.querySelector<HTMLTableSectionElement>('tbody[data-slot="data-table-body"]');
  expect(body).not.toBeNull();
  return body!;
}

/** Section and data rows in DOM order (spacers, sentinel and empty rows skipped). */
function painted(root: ParentNode): Painted[] {
  const out: Painted[] = [];
  for (const tr of bodyOf(root).querySelectorAll<HTMLTableRowElement>(':scope > tr')) {
    const slot = tr.getAttribute('data-slot');
    if (slot === 'data-table-group-row') {
      out.push({ kind: 'group', key: tr.getAttribute('data-group-key'), el: tr });
    } else if (slot === 'data-table-row') {
      out.push({ kind: 'row', key: tr.getAttribute('data-row-key')!, el: tr });
    }
  }
  return out;
}

function sectionKeys(root: ParentNode): (string | null)[] {
  return painted(root)
    .filter((item) => item.kind === 'group')
    .map((item) => item.key);
}

function sectionTexts(root: ParentNode): string[] {
  return [...root.querySelectorAll('th[data-slot="data-table-group-header"]')].map(
    (th) => th.textContent ?? ''
  );
}

function dataRowKeys(root: ParentNode): string[] {
  return painted(root)
    .filter((item) => item.kind === 'row')
    .map((item) => item.key);
}

/** Data-row keys under each painted section, in DOM order. */
function rowsBySection(root: ParentNode): { key: string | null; rows: string[] }[] {
  const out: { key: string | null; rows: string[] }[] = [];
  for (const item of painted(root)) {
    if (item.kind === 'group') {
      out.push({ key: item.key, rows: [] });
    } else {
      expect(out.length, `INV-2: data row ${item.key} has no section above it`).toBeGreaterThan(0);
      out[out.length - 1]!.rows.push(item.key);
    }
  }
  return out;
}

function rowById(rows: readonly KeyRow[], id: string): KeyRow {
  const row = rows.find((candidate) => candidate.id === id);
  expect(row, `fixture row ${id}`).toBeDefined();
  return row!;
}

function htmlOf(element: ReactElement): string {
  const { container, unmount } = render(element);
  const html = normalizeIds(container.innerHTML);
  unmount();
  return html;
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function scroller(root: ParentNode): HTMLDivElement {
  const wrap = root.querySelector<HTMLDivElement>('div[data-slot="data-table"]');
  expect(wrap).not.toBeNull();
  return wrap!;
}

function scrollTo(root: ParentNode, top: number): void {
  const wrap = scroller(root);
  act(() => {
    wrap.scrollTop = top;
    fireEvent.scroll(wrap);
  });
}

/** 10 groups `G0…G9`, contiguous in the input (so `rows` order is already grouped). */
function tenGroupRows(count: number): KeyRow[] {
  const perGroup = Math.ceil(count / 10);
  return keyRows(count).map((row, n) => ({ ...row, role: `G${String(Math.floor(n / perGroup))}` }));
}

// Random inputs for the property tests -------------------------------------------------

type PRow = { readonly id: string; readonly k: unknown; readonly v: number | undefined };

/** Includes blanks, case / space variants, non-strings and the reserved-looking key. */
const KEY_POOL: readonly unknown[] = [
  'Admin',
  'Minter',
  'Pauser',
  ' Admin',
  'admin',
  '',
  '  ',
  '\t',
  undefined,
  null,
  0,
  false,
  '__data-table-group-none',
  'none',
];

/** Untyped feed: the property tests drive `getGroupKey` with values its type forbids. */
const untypedKey = ((row: PRow) => row.k) as (row: PRow) => string | null | undefined;

const P_COLUMNS: readonly DataTableColumn<PRow>[] = [
  { id: 'v', header: 'V', sortable: true, getSortValue: (row) => row.v, cell: (row) => row.v },
  { id: 'id', header: 'Id', sortable: true, getSortValue: (row) => row.id, cell: (row) => row.id },
];

const SORTS: readonly (DataTableSortState | null)[] = [
  null,
  { columnId: 'v', direction: 'asc' },
  { columnId: 'v', direction: 'desc' },
  { columnId: 'id', direction: 'asc' },
  { columnId: 'id', direction: 'desc' },
];

function randomRows(rand: () => number, max = 40): PRow[] {
  const count = Math.floor(rand() * (max + 1));
  const keyCount = 1 + Math.floor(rand() * KEY_POOL.length);
  return Array.from({ length: count }, (_, n) => ({
    id: `p${String(n)}`,
    k: KEY_POOL[Math.floor(rand() * keyCount)],
    v: rand() < 0.15 ? undefined : Math.floor(rand() * 6),
  }));
}

/** The partition the kit must produce before sorting: first appearance, null last, stable. */
function expectedPartition<Row>(
  rows: readonly Row[],
  keyOf: (row: Row) => string | null
): { key: string | null; rows: Row[] }[] {
  const keyed = new Map<string, Row[]>();
  const none: Row[] = [];
  for (const row of rows) {
    const key = keyOf(row);
    if (key == null) {
      none.push(row);
    } else {
      keyed.set(key, [...(keyed.get(key) ?? []), row]);
    }
  }
  const out = [...keyed].map(([key, groupRows]) => ({
    key: key as string | null,
    rows: groupRows,
  }));
  if (none.length > 0) {
    out.push({ key: null, rows: none });
  }
  return out;
}

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  public state: { error: Error | null } = { error: null };
  public static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }
  public componentDidCatch(_error: Error, _info: ErrorInfo): void {}
  public render(): ReactNode {
    return this.state.error ? (
      <p role="alert">caught: {this.state.error.message}</p>
    ) : (
      this.props.children
    );
  }
}

// ─── Render Contract ────────────────────────────────────────────────────────────

describe('INV-1: a section row is one <tr> holding one scoped, spanning <th>', () => {
  it.each([
    { name: 'three columns', columns: keyColumns(), selection: false, span: 3 },
    { name: 'one column', columns: keyColumns().slice(0, 1), selection: false, span: 1 },
    { name: 'three columns + selection', columns: keyColumns(), selection: true, span: 4 },
    { name: 'one column + selection', columns: keyColumns().slice(0, 1), selection: true, span: 2 },
  ])('$name: colSpan $span, single th child, no row / selection attributes', (fixture) => {
    const { container } = render(
      <DataTable
        {...tableProps({
          columns: fixture.columns,
          ...(fixture.selection
            ? { selection: { selectedKeys: new Set(['key-0']), onSelectionChange: noop } }
            : {}),
        })}
      />
    );
    expect(container.querySelectorAll('thead')).toHaveLength(1);
    expect(container.querySelectorAll('thead tr')).toHaveLength(1);
    expect(container.querySelectorAll('tbody')).toHaveLength(1);

    const sections = container.querySelectorAll<HTMLTableRowElement>(
      'tr[data-slot="data-table-group-row"]'
    );
    expect(sections).toHaveLength(4); // Admin, Minter, Pauser, null
    for (const tr of sections) {
      expect(tr.parentElement?.getAttribute('data-slot')).toBe('data-table-body');
      expect(tr.children).toHaveLength(1);
      const th = tr.children[0] as HTMLTableCellElement;
      expect(th.tagName).toBe('TH');
      expect(th.getAttribute('data-slot')).toBe('data-table-group-header');
      expect(th.getAttribute('scope')).toBe('row');
      expect(th.colSpan).toBe(fixture.span);
      expect(tr.querySelector('td')).toBeNull();
      for (const el of [tr, th]) {
        expect(el.hasAttribute('role')).toBe(false);
        expect(el.hasAttribute('headers')).toBe(false);
        expect(el.hasAttribute('id')).toBe(false);
      }
      for (const attr of ['data-row-key', 'data-selected', 'data-state', 'data-index']) {
        expect(tr.hasAttribute(attr), `INV-1: section has ${attr}`).toBe(false);
      }
      expect(tr.hasAttribute('aria-rowindex')).toBe(false);
      expect(tr.querySelector('[role="checkbox"], input, button')).toBeNull();
    }
    const nullSection = [...sections].at(-1)!;
    expect(nullSection.hasAttribute('data-group-key')).toBe(false);
    expect([...sections].slice(0, 3).map((tr) => tr.getAttribute('data-group-key'))).toEqual([
      'Admin',
      'Minter',
      'Pauser',
    ]);
  });

  it('failure guard: no section row and no group slot when grouping is omitted', () => {
    const { container } = render(<DataTable {...tableProps({ grouping: undefined })} />);
    expect(container.querySelector('[data-slot^="data-table-group"]')).toBeNull();
  });

  it('source: one section-row JSX site shared by both body paths', () => {
    expect(SCROLLER_SOURCE.match(/data-slot="data-table-group-row"/g)).toHaveLength(1);
    expect(SCROLLER_SOURCE.match(/renderBodyItem\(\{/g)).toHaveLength(2);
  });
});

describe('INV-2: every data row is painted under its own group, each group once', () => {
  it('DOM walk (plain): nearest preceding section key = the row’s resolved key', () => {
    const rows = keyRows(30, [4, 17, 29]);
    const { container } = render(<DataTable {...tableProps({ rows })} />);
    const groups = rowsBySection(container);
    expect(groups.map((group) => group.key)).toEqual(['Admin', 'Minter', 'Pauser', null]);
    for (const group of groups) {
      expect(group.rows.length).toBeGreaterThan(0);
      for (const id of group.rows) {
        expect(resolveGroupKey(rowById(rows, id).role), `INV-2: ${id}`).toBe(group.key);
      }
    }
    expect(groups.flatMap((group) => group.rows).sort()).toEqual(rows.map((row) => row.id).sort());
  });

  it('DOM walk (virtualized window after scrolling mid-list): mounted rows sit under their section', () => {
    const rows = keyRows(300, [7, 150]);
    const { container } = render(<DataTable {...tableProps({ rows, virtualized: true })} />);
    scrollTo(container, 5000);
    const items = painted(container);
    expect(items.length).toBeGreaterThan(0);
    // The window may open mid-group; its leading rows belong to the first group whose
    // section sits above it, which the data-index sequence lets us recover.
    let current: string | null | undefined;
    for (const item of items) {
      if (item.kind === 'group') {
        current = item.key;
        continue;
      }
      const expected = resolveGroupKey(rowById(rows, item.key).role);
      if (current !== undefined) {
        expect(expected, `INV-2: ${item.key} under ${String(current)}`).toBe(current);
      }
    }
  });

  it('property: buildGroupedBodyItems ∘ groupDisplayRows over random rows, sorts and page windows', () => {
    for (let seed = 1; seed <= 300; seed += 1) {
      const rand = mulberry32(seed);
      const rows = randomRows(rand);
      const sort = SORTS[Math.floor(rand() * SORTS.length)]!;
      const grouped = groupDisplayRows({
        rows,
        getGroupKey: untypedKey,
        columns: P_COLUMNS,
        sort,
        clientSort: rand() < 0.7,
      });
      const paged = rand() < 0.6;
      const pageSize = 1 + Math.floor(rand() * 8);
      const pageIndex = Math.floor(rand() * (Math.ceil(rows.length / pageSize) + 1));
      const bodyRows = paged
        ? sliceClientPage(grouped.displayRows, pageIndex, pageSize)
        : grouped.displayRows;
      const pageStart = paged ? pageIndex * pageSize : 0;
      const items = buildGroupedBodyItems({
        bodyRows,
        pageStart,
        grouped,
        getRowKey: (row) => row.id,
      });
      const where = `seed ${String(seed)}`;

      const data = items.filter((item) => item.kind === 'row');
      expect(
        data.map((item) => item.row),
        `${where}: data items = bodyRows`
      ).toEqual([...bodyRows]);
      data.forEach((item, n) => expect(item.bodyIndex, where).toBe(n));

      const sectionItems = items.filter((item) => item.kind === 'group');
      const distinct = new Set(bodyRows.map((row) => resolveGroupKey(row.k)));
      expect(sectionItems.length, `${where}: one section per distinct key`).toBe(distinct.size);
      expect(new Set(sectionItems.map((item) => item.info.key)).size, where).toBe(
        sectionItems.length
      );
      if (items.length > 0) {
        expect(items.at(-1)!.kind, `${where}: never ends on a section`).toBe('row');
        expect(items[0]!.kind, `${where}: starts with a section`).toBe('group');
      }
      let current: string | null | undefined;
      items.forEach((item, n) => {
        if (item.kind === 'group') {
          expect(items[n + 1]?.kind, `${where}: adjacent sections`).toBe('row');
          current = item.info.key;
        } else {
          expect(resolveGroupKey(item.row.k), `${where}: ${item.row.id}`).toBe(current);
        }
      });
    }
  });
});

describe('INV-3: grouped data rows render exactly as ungrouped ones', () => {
  function rowHtmlByKey(root: ParentNode): Map<string, string> {
    const out = new Map<string, string>();
    for (const tr of root.querySelectorAll<HTMLTableRowElement>('tr[data-slot="data-table-row"]')) {
      const html = normalizeIds(tr.outerHTML)
        .replace(/ data-index="\d+"/, '')
        .replace(/ aria-rowindex="\d+"/, '');
      out.set(tr.getAttribute('data-row-key')!, html);
    }
    return out;
  }

  it.each([
    { name: 'plain', extra: {} },
    { name: 'virtualized', extra: { virtualized: true } },
    { name: 'infinite feed', extra: { infiniteScroll: { hasMore: true, onLoadMore: noop } } },
  ])('$name: outerHTML parity per data-row-key (selection, getRowClassName)', ({ extra }) => {
    const rows = keyRows(20, [3]);
    const shared = {
      rows,
      selection: { selectedKeys: new Set(['key-1', 'key-6']), onSelectionChange: noop },
      getRowClassName: (row: KeyRow) => (row.added % 2 === 0 ? 'is-even' : undefined),
      ...extra,
    };
    const grouped = render(<DataTable {...tableProps(shared)} />);
    const groupedRows = rowHtmlByKey(grouped.container);
    grouped.unmount();
    const plain = render(<DataTable {...tableProps({ ...shared, grouping: undefined })} />);
    const plainRows = rowHtmlByKey(plain.container);
    plain.unmount();

    const common = [...groupedRows.keys()].filter((key) => plainRows.has(key));
    expect(common.length).toBeGreaterThan(3);
    for (const key of common) {
      expect(groupedRows.get(key), `INV-3: ${key}`).toBe(plainRows.get(key));
    }
    const selected = groupedRows.get('key-1');
    if (selected !== undefined) {
      expect(selected).toContain('data-state="selected"');
    }
    expect([...groupedRows.values()].some((html) => html.includes('is-even'))).toBe(true);
    expect([...groupedRows.values()].some((html) => /colspan/i.test(html))).toBe(false);
  });

  it('column.cell receives the same row object references as rows', () => {
    const rows = keyRows(15, [2]);
    const seen: KeyRow[] = [];
    render(<DataTable {...tableProps({ rows, columns: keyColumns((row) => seen.push(row)) })} />);
    expect(seen.length).toBeGreaterThan(0);
    for (const row of seen) {
      expect(rows.includes(row)).toBe(true);
    }
  });
});

describe('INV-4: section label resolution always yields a visible text label', () => {
  const OUTPUTS: { name: string; value: ReactNode | 'absent'; empty: boolean }[] = [
    { name: 'no renderer', value: 'absent', empty: true },
    { name: 'element', value: 'element', empty: false },
    { name: 'null', value: null, empty: true },
    { name: 'undefined', value: undefined, empty: true },
    { name: 'false', value: false, empty: true },
    { name: 'true', value: true, empty: true },
    { name: "''", value: '', empty: true },
    { name: "'  '", value: '  ', empty: true },
    { name: '0 (renders "0")', value: 0, empty: false },
  ];
  const LABELS: (string | undefined)[] = [undefined, '', '   ', 'No role'];

  for (const output of OUTPUTS) {
    for (const ungroupedLabel of LABELS) {
      it(`renderer → ${output.name}, ungroupedLabel ${JSON.stringify(ungroupedLabel)}`, () => {
        const rows = [
          { id: 'a', role: 'Admin', label: 'a', added: 1 },
          { id: 'b', label: 'b', added: 2 },
        ];
        const renderer = vi.fn(
          (info: DataTableGroupHeaderInfo<KeyRow>): ReactNode =>
            output.value === 'element' ? <em>custom {info.key ?? 'none'}</em> : output.value
        );
        const { container } = render(
          <DataTable
            {...tableProps({
              rows,
              grouping: byRole({
                ...(output.value === 'absent' ? {} : { renderGroupHeader: renderer }),
                ungroupedLabel,
              }),
            })}
          />
        );
        const nullFallback =
          ungroupedLabel === 'No role' ? 'No role' : DATA_TABLE_DEFAULT_UNGROUPED_LABEL;
        const expected =
          output.value === 'element'
            ? ['custom Admin', 'custom none']
            : output.empty
              ? ['Admin', nullFallback]
              : [String(output.value), String(output.value)];
        expect(sectionTexts(container)).toEqual(expected);
        for (const text of sectionTexts(container)) {
          expect(text.trim()).not.toBe('');
        }
        if (output.value === 'absent') {
          expect(renderer).not.toHaveBeenCalled();
        } else {
          // Once per painted section per render; both sections painted.
          const keys = renderer.mock.calls.map(([info]) => info.key);
          expect(keys.filter((key) => key === 'Admin').length).toBe(
            keys.filter((key) => key === null).length
          );
          expect(keys.length % 2).toBe(0);
          expect(keys.length).toBeGreaterThanOrEqual(2);
        }
      });
    }
  }

  it('renderer is called once per painted section per render, never for unpainted groups', () => {
    const renderer = vi.fn((info: DataTableGroupHeaderInfo<KeyRow>) => info.key);
    const commits: number[] = [];
    render(
      <Profiler id="t" onRender={() => commits.push(1)}>
        <DataTable
          {...tableProps({
            rows: paginatedKeyRows(),
            grouping: byRole({ renderGroupHeader: renderer }),
            pagination: { kind: 'client', pageIndex: 2, pageSize: 5, onPageChange: noop },
          })}
        />
      </Profiler>
    );
    // Page 3 holds only Pauser rows: Admin and Minter have no painted section.
    expect(new Set(renderer.mock.calls.map(([info]) => info.key))).toEqual(new Set(['Pauser']));
    expect(renderer).toHaveBeenCalledTimes(commits.length);
  });

  it('unit: isEmptyGroupHeaderContent / resolveGroupHeaderContent', () => {
    for (const value of [null, undefined, true, false, '', ' ', '\n\t']) {
      expect(isEmptyGroupHeaderContent(value), JSON.stringify(value)).toBe(true);
    }
    for (const value of ['x', 0, <b key="b">x</b>, [' ', 'x']]) {
      expect(isEmptyGroupHeaderContent(value)).toBe(false);
    }
    const info = Object.freeze({ key: null, rows: [], continued: false });
    expect(resolveGroupHeaderContent(info, {})).toEqual({
      content: 'Other',
      rendererReturnedEmpty: false,
    });
    expect(
      resolveGroupHeaderContent(info, { renderGroupHeader: () => '', ungroupedLabel: 'None' })
    ).toEqual({ content: 'None', rendererReturnedEmpty: true });
  });
});

describe('INV-5: the default path is byte-identical to the pre-SF-22 output', () => {
  const cases = baseline.cases as Record<string, { sha256: string; length: number }>;
  const matrix = defaultPathMatrix();

  it('the captured baseline covers the whole 20-case matrix', () => {
    expect(matrix).toHaveLength(20);
    expect(Object.keys(cases).sort()).toEqual(matrix.map((testCase) => testCase.name).sort());
  });

  for (const variant of ['omitted', 'undefined', 'null'] as const) {
    it.each(matrix.map((testCase) => [testCase.name, testCase] as const))(
      `grouping ${variant}: %s matches the pre-change HTML`,
      (_name, testCase) => {
        const { grouping: _ignored, ...rest } = testCase.props;
        const props =
          variant === 'omitted'
            ? rest
            : variant === 'undefined'
              ? { ...rest, grouping: undefined }
              : // A4: untyped JS may pass null.
                ({ ...rest, grouping: null } as unknown as DataTableProps<KeyRow>);
        const html = htmlOf(<DataTable {...(props as DataTableProps<KeyRow>)} />);
        const expected = cases[testCase.name]!;
        expect(html).not.toContain('data-table-group');
        expect(
          { sha256: sha256(html), length: html.length },
          'INV-5: default-path HTML drifted from the pre-SF-22 capture (see evidence/baseline/capture-baseline.sh)'
        ).toEqual(expected);
      }
    );
  }

  it('source: the ungrouped branch keeps the shipped pipeline expression', () => {
    expect(TABLE_SOURCE).toMatch(
      /:\s*skipClientSort\s*\?\s*rows\s*:\s*applyClientSort\(rows, columns, effectiveSort\);/
    );
    expect(TABLE_SOURCE).toMatch(/grouping == null\s*\?\s*null\s*:\s*groupDisplayRows\(/);
    expect(TABLE_SOURCE).toMatch(/grouped == null \? null : buildGroupedBodyItems\(/);
  });
});

describe('INV-6: an empty grouped table is today’s empty table; empty groups never paint', () => {
  it('a group emptied by filtering loses its section (and comes back)', () => {
    const rows = paginatedKeyRows();
    const { container, rerender } = render(<DataTable {...tableProps({ rows })} />);
    expect(sectionKeys(container)).toEqual(['Admin', 'Minter', 'Pauser']);
    rerender(<DataTable {...tableProps({ rows: rows.filter((row) => row.role !== 'Minter') })} />);
    expect(sectionKeys(container)).toEqual(['Admin', 'Pauser']);
    rerender(<DataTable {...tableProps({ rows })} />);
    expect(sectionKeys(container)).toEqual(['Admin', 'Minter', 'Pauser']);
  });

  it.each([
    { name: 'rows=[]', extra: { rows: [] } },
    { name: 'rows=[] + hideHeaderWhenEmpty', extra: { rows: [], hideHeaderWhenEmpty: true } },
    { name: 'rows=[] + virtualized', extra: { rows: [], virtualized: true } },
    {
      name: 'infinite busy, 0 rows (blank placeholder)',
      extra: { rows: [], infiniteScroll: { hasMore: true, busy: true, onLoadMore: noop } },
    },
    {
      name: 'client pageIndex past the end',
      extra: {
        rows: paginatedKeyRows(),
        pagination: { kind: 'client', pageIndex: 9, pageSize: 5, onPageChange: noop },
      },
    },
    {
      name: 'client pageIndex NaN',
      extra: {
        rows: paginatedKeyRows(),
        pagination: { kind: 'client', pageIndex: Number.NaN, pageSize: 5, onPageChange: noop },
      },
    },
    {
      name: 'server rows=[]',
      extra: {
        rows: [],
        pagination: {
          kind: 'server',
          pageIndex: 1,
          pageSize: 5,
          totalCount: 5,
          onPageChange: noop,
        },
      },
    },
  ])('$name: grouped HTML = ungrouped HTML, no section row', ({ extra }) => {
    const grouped = htmlOf(<DataTable {...tableProps(extra)} />);
    const plain = htmlOf(<DataTable {...tableProps({ ...extra, grouping: undefined })} />);
    expect(grouped).not.toContain('data-table-group');
    expect(grouped).toBe(plain);
  });
});

describe('INV-7: section chrome keeps table display discipline and is not sticky', () => {
  const FORBIDDEN = new Set([
    'block',
    'inline',
    'inline-block',
    'flex',
    'inline-flex',
    'grid',
    'inline-grid',
    'table',
    'table-row',
    'table-cell',
    'contents',
    'hidden',
    'sticky',
    'fixed',
    'absolute',
    'relative',
    'static',
    'sr-only',
    'not-sr-only',
    'invisible',
  ]);

  it.each([
    ['DATA_TABLE_GROUP_ROW_CHROME', DATA_TABLE_GROUP_ROW_CHROME],
    ['DATA_TABLE_GROUP_HEADER_CELL_CHROME', DATA_TABLE_GROUP_HEADER_CELL_CHROME],
  ])('%s has no display / position / sticky / hiding token', (_name, value) => {
    const tokens = value.split(/\s+/).filter(Boolean);
    expect(tokens.length).toBeGreaterThan(0);
    for (const token of tokens) {
      const base = token.split(':').at(-1)!;
      expect(FORBIDDEN.has(base), `INV-7: ${token}`).toBe(false);
      expect(base.startsWith('top-'), `INV-7: ${token}`).toBe(false);
      expect(base.startsWith('display'), `INV-7: ${token}`).toBe(false);
    }
  });

  it('painted section row and cell carry exactly those constants, no inline style', () => {
    const { container } = render(<DataTable {...tableProps()} />);
    const tr = container.querySelector('tr[data-slot="data-table-group-row"]')!;
    expect(tr.className).toBe(DATA_TABLE_GROUP_ROW_CHROME);
    expect(tr.querySelector('th')!.className).toBe(DATA_TABLE_GROUP_HEADER_CELL_CHROME);
    expect(tr.hasAttribute('style')).toBe(false);
    expect(tr.querySelector('th')!.hasAttribute('style')).toBe(false);
  });
});

// ─── Prop / State Contract ─────────────────────────────────────────────────────

describe('INV-9: the public surface is additive (one optional prop, two type-only exports)', () => {
  it('types: optional readonly prop; readonly info fields; exact member set', () => {
    expectTypeOf<DataTableProps<KeyRow>['grouping']>().toEqualTypeOf<
      DataTableGrouping<KeyRow> | undefined
    >();
    expectTypeOf<DataTableGroupHeaderInfo<KeyRow>['key']>().toEqualTypeOf<string | null>();
    expectTypeOf<DataTableGroupHeaderInfo<KeyRow>['rows']>().toEqualTypeOf<readonly KeyRow[]>();
    expectTypeOf<DataTableGroupHeaderInfo<KeyRow>['continued']>().toEqualTypeOf<boolean>();
    expectTypeOf<keyof DataTableGrouping<KeyRow>>().toEqualTypeOf<
      'getGroupKey' | 'renderGroupHeader' | 'ungroupedLabel'
    >();
    expectTypeOf<keyof DataTableGroupHeaderInfo<KeyRow>>().toEqualTypeOf<
      'key' | 'rows' | 'continued'
    >();
    expectTypeOf<DataTableGrouping<KeyRow>['getGroupKey']>().toEqualTypeOf<
      (row: KeyRow) => string | null | undefined
    >();

    // Compile-time only (tsc -p tsconfig.data-table-tests.json); never executed.
    const typeOnly = (info: DataTableGroupHeaderInfo<KeyRow>, g: DataTableGrouping<KeyRow>) => {
      // @ts-expect-error INV-9: info.key is readonly
      info.key = 'x';
      // @ts-expect-error INV-9: info.rows is readonly
      info.rows.push(keyRows(1)[0]!);
      // @ts-expect-error INV-9: grouping members are readonly
      g.ungroupedLabel = 'x';
      // @ts-expect-error INV-10: typed callers cannot return numbers
      const bad: DataTableGrouping<KeyRow> = { getGroupKey: () => 1 };
      return bad;
    };
    expect(typeof typeOnly).toBe('function');
  });

  it('barrel: no grouping runtime symbol (types are erased)', () => {
    const keys = Object.keys(dataTableBarrel);
    expect(keys.filter((key) => /group|bodyitem/i.test(key))).toEqual([]);
    expect(keys).toEqual(expect.arrayContaining(['DataTable', 'DATA_TABLE_SELECT_COLUMN_ID']));
  });

  it('source: grouping.ts is internal; index.ts exports only the two types', () => {
    const index = readFileSync(join(DATA_TABLE_DIR, 'index.ts'), 'utf8');
    expect(index).not.toMatch(/from\s+['"]\.\/grouping['"]/);
    expect(index).toMatch(/DataTableGroupHeaderInfo,/);
    expect(index).toMatch(/DataTableGrouping,/);
    expect(index).toMatch(/export type \{/);
  });
});

describe('INV-10: group-key resolution is total, never throws, exact string identity', () => {
  it.each([
    ['Admin', 'Admin', false],
    [' Admin', ' Admin', false],
    ['admin', 'admin', false],
    ['0', '0', false],
    ['', null, false],
    ['   ', null, false],
    ['\t', null, false],
    ['\n', null, false],
    [null, null, false],
    [undefined, null, false],
    [0, null, true],
    [1, null, true],
    [Number.NaN, null, true],
    [false, null, true],
    [true, null, true],
    [{}, null, true],
    [['Admin'], null, true],
    [Symbol('k'), null, true],
    [10n, null, true],
  ] as const)('%s → %s (invalid flag %s)', (raw, expected, invalid) => {
    expect(resolveGroupKey(raw)).toBe(expected);
    expect(isInvalidGroupKey(raw)).toBe(invalid);
  });

  it('objects are never stringified (a throwing toString is never called)', () => {
    const hostile = {
      toString: () => {
        throw new Error('String() called');
      },
      [Symbol.toPrimitive]: () => {
        throw new Error('coerced');
      },
    };
    expect(() => resolveGroupKey(hostile)).not.toThrow();
    expect(resolveGroupKey(hostile)).toBeNull();
    const grouped = groupDisplayRows({
      rows: [{ id: 'x', k: hostile, v: 1 }],
      getGroupKey: untypedKey,
      columns: P_COLUMNS,
      sort: null,
      clientSort: true,
    });
    expect(grouped.groups.map((group) => group.key)).toEqual([null]);
    expect(grouped.invalidKeySeen).toBe(true);
  });

  it("'Admin', ' Admin', 'admin' are three sections; 0 and '0' never merge", () => {
    const rows: PRow[] = [
      { id: 'a', k: 'Admin', v: 1 },
      { id: 'b', k: ' Admin', v: 1 },
      { id: 'c', k: 'admin', v: 1 },
      { id: 'd', k: '0', v: 1 },
      { id: 'e', k: 0, v: 1 },
      { id: 'f', k: Symbol('s'), v: 1 },
    ];
    const grouped = groupDisplayRows({
      rows,
      getGroupKey: untypedKey,
      columns: P_COLUMNS,
      sort: null,
      clientSort: true,
    });
    expect(grouped.groups.map((group) => group.key)).toEqual([
      'Admin',
      ' Admin',
      'admin',
      '0',
      null,
    ]);
    expect(grouped.groups.at(-1)!.rows.map((row) => row.id)).toEqual(['e', 'f']);
  });

  it('component: a symbol key from untyped JS does not crash render', () => {
    const rows = keyRows(4);
    const { container } = render(
      <DataTable
        {...tableProps({
          rows,
          grouping: {
            getGroupKey: ((row: KeyRow) =>
              row.id === 'key-2'
                ? Symbol('bad')
                : row.role) as DataTableGrouping<KeyRow>['getGroupKey'],
          },
        })}
      />
    );
    expect(sectionKeys(container)).toEqual(['Admin', 'Minter', null]);
    expect(rowsBySection(container).at(-1)!.rows).toEqual(['key-2']);
  });
});

describe('INV-11: displayRows is a group-contiguous permutation of rows', () => {
  it('property: permutation by reference, contiguity, per-group sort, stability, no mutation, reordered', () => {
    for (let seed = 1; seed <= 400; seed += 1) {
      const rand = mulberry32(seed);
      const rows = Object.freeze(randomRows(rand));
      const snapshot = [...rows];
      const sort = SORTS[Math.floor(rand() * SORTS.length)]!;
      const clientSort = rand() < 0.5;
      const where = `seed ${String(seed)} clientSort=${String(clientSort)}`;
      let grouped!: ReturnType<typeof groupDisplayRows<PRow>>;
      expect(() => {
        grouped = groupDisplayRows({
          rows,
          getGroupKey: untypedKey,
          columns: P_COLUMNS,
          sort,
          clientSort,
        });
      }, where).not.toThrow();
      expect([...rows], `${where}: input mutated`).toEqual(snapshot);

      // Permutation by reference.
      expect(grouped.displayRows.length, where).toBe(rows.length);
      const counts = new Map<PRow, number>();
      for (const row of grouped.displayRows) {
        counts.set(row, (counts.get(row) ?? 0) + 1);
      }
      for (const row of rows) {
        expect(counts.get(row), `${where}: ${row.id}`).toBe(1);
      }

      // Contiguity and the parallel index.
      expect(grouped.groupIndexByDisplayRow.length, where).toBe(rows.length);
      grouped.groups.forEach((group, g) => {
        const slice = grouped.displayRows.slice(group.start, group.start + group.rows.length);
        expect(slice, where).toEqual([...group.rows]);
        for (let j = group.start; j < group.start + group.rows.length; j += 1) {
          expect(grouped.groupIndexByDisplayRow[j], where).toBe(g);
        }
        for (const row of group.rows) {
          expect(resolveGroupKey(row.k), where).toBe(group.key);
        }
      });
      expect(
        grouped.groups.reduce((sum, group) => sum + group.rows.length, 0),
        where
      ).toBe(rows.length);

      // Per-group order.
      const partition = expectedPartition(rows, (row) => resolveGroupKey(row.k));
      expect(
        grouped.groups.map((group) => group.key),
        where
      ).toEqual(partition.map((part) => part.key));
      partition.forEach((part, g) => {
        const expected = clientSort ? applyClientSort(part.rows, P_COLUMNS, sort) : part.rows;
        expect([...grouped.groups[g]!.rows], `${where}: group ${String(part.key)}`).toEqual([
          ...expected,
        ]);
      });

      // `reordered` describes the partition only.
      const flatPartition = partition.flatMap((part) => part.rows);
      const moved = flatPartition.some((row, j) => rows[j] !== row);
      expect(grouped.reordered, `${where}: reordered`).toBe(moved);
    }
  });

  it('reordered truth table: contiguous input + within-group sort → false; interleaved → true', () => {
    const contiguous: PRow[] = [
      { id: 'a', k: 'A', v: 3 },
      { id: 'b', k: 'A', v: 1 },
      { id: 'c', k: 'B', v: 2 },
    ];
    const sorted = groupDisplayRows({
      rows: contiguous,
      getGroupKey: untypedKey,
      columns: P_COLUMNS,
      sort: { columnId: 'v', direction: 'asc' },
      clientSort: true,
    });
    expect(sorted.displayRows.map((row) => row.id)).toEqual(['b', 'a', 'c']);
    expect(sorted.reordered).toBe(false);
    const interleaved = groupDisplayRows({
      rows: [contiguous[0]!, contiguous[2]!, contiguous[1]!],
      getGroupKey: untypedKey,
      columns: P_COLUMNS,
      sort: null,
      clientSort: false,
    });
    expect(interleaved.displayRows.map((row) => row.id)).toEqual(['a', 'b', 'c']);
    expect(interleaved.reordered).toBe(true);
  });
});

describe('INV-12: group order is first appearance in rows, independent of sort [provisional (a)]', () => {
  it('property: group key sequence is identical under every sort state', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const rand = mulberry32(seed);
      const rows = randomRows(rand);
      const sequences = SORTS.map((sort) =>
        groupDisplayRows({
          rows,
          getGroupKey: untypedKey,
          columns: P_COLUMNS,
          sort,
          clientSort: true,
        }).groups.map((group) => group.key)
      );
      const firstAppearance: (string | null)[] = [];
      for (const row of rows) {
        const key = resolveGroupKey(row.k);
        if (key != null && !firstAppearance.includes(key)) {
          firstAppearance.push(key);
        }
      }
      if (rows.some((row) => resolveGroupKey(row.k) == null)) {
        firstAppearance.push(null);
      }
      for (const sequence of sequences) {
        expect(sequence, `seed ${String(seed)}`).toEqual(firstAppearance);
      }
    }
  });

  it('component: section sequence unchanged across every header sort state', () => {
    // Input order Pauser first: groups follow rows, not alphabetical order.
    const rows = keyRows(15, [7]).map((row, n) => (n === 0 ? { ...row, role: 'Pauser' } : row));
    const { container } = render(<DataTable {...tableProps({ rows })} />);
    const initial = sectionKeys(container);
    expect(initial).toEqual(['Pauser', 'Minter', 'Admin', null]);
    for (const column of ['Label', 'Added']) {
      for (let click = 0; click < 3; click += 1) {
        fireEvent.click(screen.getByRole('button', { name: new RegExp(`Sort by ${column}`) }));
        expect(sectionKeys(container), `${column} click ${String(click + 1)}`).toEqual(initial);
      }
    }
  });
});

describe('INV-13: missing keys form exactly one trailing section [provisional (b)]', () => {
  it.each([
    { name: 'none missing', missing: [] as number[], sections: ['Admin', 'Minter', 'Pauser'] },
    {
      name: 'some missing (interleaved)',
      missing: [0, 4, 8],
      sections: ['Minter', 'Pauser', 'Admin', null],
    },
    { name: 'all missing', missing: [0, 1, 2, 3, 4, 5, 6, 7, 8], sections: [null] },
  ])('$name', ({ missing, sections }) => {
    const rows = keyRows(9, missing);
    const { container } = render(<DataTable {...tableProps({ rows })} />);
    expect(sectionKeys(container)).toEqual(sections);
    const groups = rowsBySection(container);
    const nullGroups = groups.filter((group) => group.key === null);
    expect(nullGroups.length).toBe(missing.length > 0 ? 1 : 0);
    if (missing.length > 0) {
      expect(groups.at(-1)!.key).toBeNull();
      expect(nullGroups[0]!.rows).toEqual(missing.map((n) => `key-${String(n)}`));
      expect(sectionTexts(container).at(-1)).toBe('Other');
      const last = container.querySelectorAll('tr[data-slot="data-table-group-row"]');
      expect([...last].at(-1)!.hasAttribute('data-group-key')).toBe(false);
    }
  });

  it('item key of the null section is the reserved ungrouped key', () => {
    const grouped = groupDisplayRows({
      rows: keyRows(3, [1]),
      getGroupKey: (row) => row.role,
      columns: keyColumns(),
      sort: null,
      clientSort: true,
    });
    const items = buildGroupedBodyItems({
      bodyRows: grouped.displayRows,
      pageStart: 0,
      grouped,
      getRowKey: getKeyRowKey,
    });
    expect(items.filter((item) => item.kind === 'group').map((item) => item.itemKey)).toEqual([
      `${DATA_TABLE_GROUP_ITEM_KEY_PREFIX}Admin`,
      `${DATA_TABLE_GROUP_ITEM_KEY_PREFIX}Pauser`,
      DATA_TABLE_UNGROUPED_ITEM_KEY,
    ]);
  });
});

describe('INV-14: DataTableGroupHeaderInfo is accurate [continued provisional (c)]', () => {
  function infosByPage(
    rows: readonly KeyRow[],
    pageIndex: number,
    pageSize = 5
  ): DataTableGroupHeaderInfo<KeyRow>[] {
    const infos: DataTableGroupHeaderInfo<KeyRow>[] = [];
    const { unmount } = render(
      <DataTable
        {...tableProps({
          rows,
          grouping: byRole({
            renderGroupHeader: (info) => {
              infos.push(info);
              return info.key;
            },
          }),
          pagination: { kind: 'client', pageIndex, pageSize, onPageChange: noop },
        })}
      />
    );
    unmount();
    // One render per commit is enough to read: keep the last render's infos.
    const perRender = new Map<string | null, DataTableGroupHeaderInfo<KeyRow>>();
    for (const info of infos) {
      perRender.set(info.key, info);
    }
    return [...perRender.values()];
  }

  it.each([
    {
      page: 0,
      expected: [
        ['Admin', false, 4],
        ['Minter', false, 5],
      ],
    },
    {
      page: 1,
      expected: [
        ['Minter', true, 5],
        ['Pauser', false, 3],
      ],
    },
    { page: 2, expected: [['Pauser', true, 3]] },
  ] as const)('client page $page: keys, continued, full-group rows', ({ page, expected }) => {
    const rows = paginatedKeyRows();
    const infos = infosByPage(rows, page);
    expect(infos.map((info) => [info.key, info.continued, info.rows.length])).toEqual(expected);
    for (const info of infos) {
      expect(Object.isFrozen(info)).toBe(true);
      expect(Object.isFrozen(info.rows)).toBe(true);
      expect(info.rows.every((row) => rows.includes(row))).toBe(true);
      expect(info.rows.every((row) => row.role === info.key)).toBe(true);
    }
    expect(infos.filter((info) => info.continued).length).toBeLessThanOrEqual(1);
    if (infos.some((info) => info.continued)) {
      expect(infos[0]!.continued).toBe(true);
    }
  });

  it('info is fresh per render, and the integrator’s rows array is never frozen', () => {
    const rows = paginatedKeyRows();
    const seen: DataTableGroupHeaderInfo<KeyRow>[] = [];
    const grouping = byRole({
      renderGroupHeader: (info) => {
        seen.push(info);
        return info.key;
      },
    });
    const { rerender } = render(<DataTable {...tableProps({ rows, grouping })} />);
    const firstAdmin = seen.find((info) => info.key === 'Admin')!;
    seen.length = 0;
    rerender(<DataTable {...tableProps({ rows, grouping })} />);
    const secondAdmin = seen.find((info) => info.key === 'Admin')!;
    expect(secondAdmin).not.toBe(firstAdmin);
    expect(Object.isFrozen(rows)).toBe(false);
  });

  it.each([
    { name: 'pageSize 0 → 1', pageSize: 0 },
    { name: 'pageSize NaN → 1', pageSize: Number.NaN },
    { name: 'pageSize 2.5 → 2', pageSize: 2.5 },
  ])('$name: slice and pageStart agree (continued on a split)', ({ pageSize }) => {
    const rows = paginatedKeyRows();
    for (const pageIndex of [0, 1, 4, 5, 11]) {
      const { container, unmount } = render(
        <DataTable
          {...tableProps({
            rows,
            grouping: byRole({
              renderGroupHeader: ({ key, continued }) =>
                `${String(key)}${continued ? ' (continued)' : ''}`,
            }),
            pagination: { kind: 'client', pageIndex, pageSize, onPageChange: noop },
          })}
        />
      );
      const data = dataRowKeys(container);
      const groups = rowsBySection(container);
      expect(groups.flatMap((group) => group.rows)).toEqual(data);
      if (data.length === 0) {
        // Past the end: the empty state, never an orphan section (INV-6).
        expect(sectionKeys(container)).toEqual([]);
        unmount();
        continue;
      }
      for (const group of groups) {
        const firstRow = rowById(rows, group.rows[0]!);
        const firstInGroup = rows.findIndex((row) => row.role === firstRow.role);
        const continued = rows.indexOf(firstRow) !== firstInGroup;
        const text = container.querySelector(
          `tr[data-group-key="${String(group.key)}"] th`
        )!.textContent;
        expect(text, `pageIndex ${String(pageIndex)}`).toBe(
          `${String(group.key)}${continued ? ' (continued)' : ''}`
        );
      }
      unmount();
    }
  });

  it('no client pagination: continued is always false and rows span the whole group', () => {
    const infos: DataTableGroupHeaderInfo<KeyRow>[] = [];
    render(
      <DataTable
        {...tableProps({
          rows: paginatedKeyRows(),
          grouping: byRole({ renderGroupHeader: (info) => (infos.push(info), info.key) }),
        })}
      />
    );
    expect(infos.every((info) => !info.continued)).toBe(true);
    expect(Object.fromEntries(infos.map((info) => [info.key, info.rows.length]))).toEqual({
      Admin: 4,
      Minter: 5,
      Pauser: 3,
    });
  });
});

describe('INV-15: bodyRows stays data-only; counts, selection and empty read it', () => {
  it('source: bodyItems is consumed only by the scroller props and the diagnostics signature', () => {
    const uses = TABLE_SOURCE.split('\n').filter(
      (line) => /\bbodyItems\b/.test(line) && !/^\s*(\*|\/\/)/.test(line)
    );
    expect(uses.length).toBeGreaterThanOrEqual(3);
    for (const line of uses) {
      expect(line, `INV-15: unexpected bodyItems use: ${line.trim()}`).toMatch(
        /const bodyItems|bodyItems=\{bodyItems\}|groupedItemKeySignature\(bodyItems\)|grouped == null \? null : buildGroupedBodyItems|\/\//
      );
    }
    expect(TABLE_SOURCE).toMatch(/applicableRowKeys\(bodyRows, getRowKey\)/);
    expect(TABLE_SOURCE).toMatch(/const isEmpty = bodyRows\.length === 0;/);
    expect(TABLE_SOURCE).not.toMatch(/applicableRowKeys\(bodyItems/);
    expect(TABLE_SOURCE).not.toMatch(/resolveVirtualization\([^)]*bodyItems/);
  });

  it.each([0, 1, 2])(
    'client page %i: pager status and select-all equal the ungrouped table',
    (pageIndex) => {
      const read = (grouping: unknown) => {
        const { container, unmount } = render(
          <DataTable
            {...tableProps({
              rows: paginatedKeyRows(),
              grouping,
              selection: { selectedKeys: new Set(['key-0', 'key-5']), onSelectionChange: noop },
              pagination: { kind: 'client', pageIndex, pageSize: 5, onPageChange: noop },
            })}
          />
        );
        const status = container.querySelector(
          '[data-slot="data-table-pagination-status"]'
        )!.textContent;
        const selectAll = screen.getByRole('checkbox', { name: 'Select all' });
        const out = {
          status,
          selectAll: selectAll.getAttribute('aria-checked'),
          prevDisabled: container
            .querySelector('[data-slot="data-table-pagination-previous"]')!
            .hasAttribute('disabled'),
          nextDisabled: container
            .querySelector('[data-slot="data-table-pagination-next"]')!
            .hasAttribute('disabled'),
          pages: container.querySelectorAll('[data-slot="data-table-pagination-page"]').length,
          checkboxes: screen.getAllByRole('checkbox').length,
        };
        unmount();
        return out;
      };
      expect(read(byRole())).toEqual(read(undefined));
    }
  );

  it('virtualization activation counts data rows only (default bound)', () => {
    // 3 groups add 3 section items; activation still keys off bodyRows.length.
    const rows = keyRows(20);
    for (const grouping of [byRole(), undefined]) {
      const { container, unmount } = render(
        <DataTable {...tableProps({ rows, grouping, virtualized: true })} />
      );
      expect(scroller(container).style.maxHeight).not.toBe('');
      unmount();
    }
  });
});

describe('INV-16: item keys are unique; section keys live in a reserved namespace', () => {
  it('property: all item keys unique and distinct from the sentinel key', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const rand = mulberry32(seed);
      const rows = randomRows(rand);
      const grouped = groupDisplayRows({
        rows,
        getGroupKey: untypedKey,
        columns: P_COLUMNS,
        sort: SORTS[Math.floor(rand() * SORTS.length)]!,
        clientSort: true,
      });
      const items = buildGroupedBodyItems({
        bodyRows: grouped.displayRows,
        pageStart: 0,
        grouped,
        getRowKey: (row) => row.id,
      });
      const keys = items.map((item) => item.itemKey);
      expect(new Set(keys).size, `seed ${String(seed)}`).toBe(keys.length);
      expect(keys).not.toContain(DATA_TABLE_INFINITE_SENTINEL_KEY);
      for (const item of items) {
        if (item.kind === 'group') {
          expect(item.itemKey.startsWith(RESERVED)).toBe(true);
        }
      }
    }
  });

  it("group key '__data-table-group-none' differs from the null section's key", () => {
    const grouped = groupDisplayRows({
      rows: [
        { id: 'a', k: '__data-table-group-none', v: 1 },
        { id: 'b', k: undefined, v: 1 },
      ],
      getGroupKey: untypedKey,
      columns: P_COLUMNS,
      sort: null,
      clientSort: true,
    });
    const items = buildGroupedBodyItems({
      bodyRows: grouped.displayRows,
      pageStart: 0,
      grouped,
      getRowKey: (row) => row.id,
    });
    const sectionKeysOut = items
      .filter((item) => item.kind === 'group')
      .map((item) => item.itemKey);
    expect(sectionKeysOut).toEqual([
      '__data-table-group:__data-table-group-none',
      DATA_TABLE_UNGROUPED_ITEM_KEY,
    ]);
  });

  it('section item keys are stable across sorts and pages for the same group key', () => {
    const rows = paginatedKeyRows();
    const keysFor = (sort: DataTableSortState | null, pageStart: number, size: number) => {
      const grouped = groupDisplayRows({
        rows,
        getGroupKey: (row) => row.role,
        columns: keyColumns(),
        sort,
        clientSort: true,
      });
      return buildGroupedBodyItems({
        bodyRows: grouped.displayRows.slice(pageStart, pageStart + size),
        pageStart,
        grouped,
        getRowKey: getKeyRowKey,
      })
        .filter((item) => item.kind === 'group')
        .map((item) => item.itemKey);
    };
    expect(keysFor(null, 0, 12)).toEqual(keysFor({ columnId: 'added', direction: 'desc' }, 0, 12));
    expect(keysFor(null, 5, 5)).toEqual([
      `${DATA_TABLE_GROUP_ITEM_KEY_PREFIX}Minter`,
      `${DATA_TABLE_GROUP_ITEM_KEY_PREFIX}Pauser`,
    ]);
  });

  it('no React duplicate-key warning in grouped renders (reserved-looking group keys)', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(noop);
    const rows = keyRows(9).map((row, n) => ({
      ...row,
      role: n % 3 === 0 ? '__data-table-group-none' : n % 3 === 1 ? undefined : 'none',
    }));
    render(<DataTable {...tableProps({ rows, virtualized: true })} />);
    render(<DataTable {...tableProps({ rows })} />);
    const duplicateKeyWarnings = consoleError.mock.calls.filter((call) =>
      call.some((part) => typeof part === 'string' && /same key/i.test(part))
    );
    expect(duplicateKeyWarnings).toEqual([]);
  });

  it('types.ts documents the reserved prefix', () => {
    expect(TYPES_SOURCE).toMatch(/`__data-table-group` are reserved for section rows/);
  });
});

describe('INV-17: grouping is derived per render with bounded calls and no state', () => {
  function countingGrouping(calls: KeyRow[]): DataTableGrouping<KeyRow> {
    return {
      getGroupKey: (row) => {
        calls.push(row);
        return row.role;
      },
    };
  }

  /** Calls must come in complete input-order passes over rows: once per row per render. */
  function expectWholePasses(calls: readonly KeyRow[], rows: readonly KeyRow[]): number {
    expect(calls.length % rows.length, 'INV-17: partial pass').toBe(0);
    for (let n = 0; n < calls.length; n += 1) {
      expect(calls[n]).toBe(rows[n % rows.length]);
    }
    return calls.length / rows.length;
  }

  it('one pass per DataTable render: mount, inline-object rerender, sort click, page change', () => {
    const rows = paginatedKeyRows();
    const calls: KeyRow[] = [];
    let tableRenders = 0;
    const columns = keyColumns().map((column) =>
      column.id === 'label'
        ? {
            ...column,
            header: (() => {
              // The header node is built per DataTable render (columns are read in render).
              return 'Label';
            })(),
          }
        : column
    );
    function Harness({ pageIndex }: { pageIndex: number }): ReactElement {
      tableRenders += 1;
      return (
        <DataTable
          {...tableProps({
            rows,
            columns,
            grouping: countingGrouping(calls), // a new inline object each render
            pagination: { kind: 'client', pageIndex, pageSize: 5, onPageChange: noop },
          })}
        />
      );
    }
    const { rerender } = render(<Harness pageIndex={0} />);
    expect(expectWholePasses(calls, rows)).toBe(tableRenders);
    rerender(<Harness pageIndex={0} />);
    expect(expectWholePasses(calls, rows)).toBe(tableRenders);
    rerender(<Harness pageIndex={1} />);
    expect(expectWholePasses(calls, rows)).toBe(tableRenders);
    const before = calls.length;
    fireEvent.click(screen.getByRole('button', { name: /Sort by Label/ }));
    // The sort click re-renders DataTable itself (uncontrolled sort state): exactly one pass.
    expect(calls.length - before).toBe(rows.length);
    expectWholePasses(calls, rows);
  });

  it('zero calls on scroll-only renders of a virtualized table', () => {
    const rows = tenGroupRows(2000);
    const calls: KeyRow[] = [];
    const { container } = render(
      <DataTable {...tableProps({ rows, grouping: countingGrouping(calls), virtualized: true })} />
    );
    expectWholePasses(calls, rows);
    const afterMount = calls.length;
    const firstIndexBefore = painted(container)[0]!.el.getAttribute('data-index');
    for (let frame = 1; frame <= 10; frame += 1) {
      scrollTo(container, frame * 3000);
    }
    expect(painted(container)[0]!.el.getAttribute('data-index')).not.toBe(firstIndexBefore);
    expect(calls.length).toBe(afterMount);
  });

  it('inline vs hoisted grouping: identical commit counts; no extra renders', () => {
    const rows = keyRows(30, [3]);
    const commitsFor = (mode: 'inline' | 'hoisted' | 'ungrouped'): number => {
      let commits = 0;
      const hoisted = byRole();
      const pick = () =>
        mode === 'ungrouped' ? undefined : mode === 'inline' ? byRole() : hoisted;
      const { rerender, unmount } = render(
        <Profiler id="g" onRender={() => (commits += 1)}>
          <DataTable {...tableProps({ rows, grouping: pick() })} />
        </Profiler>
      );
      for (let n = 0; n < 3; n += 1) {
        rerender(
          <Profiler id="g" onRender={() => (commits += 1)}>
            <DataTable {...tableProps({ rows, grouping: pick() })} />
          </Profiler>
        );
      }
      unmount();
      return commits;
    };
    const inline = commitsFor('inline');
    expect(inline).toBe(commitsFor('hoisted'));
    expect(inline).toBe(commitsFor('ungrouped'));
  });

  it('a changed getGroupKey result shows on the next render (no stale groups)', () => {
    const rows = keyRows(6);
    const { container, rerender } = render(<DataTable {...tableProps({ rows })} />);
    expect(rowsBySection(container).find((group) => group.key === 'Admin')!.rows).toContain(
      'key-0'
    );
    const moved = rows.map((row) => (row.id === 'key-0' ? { ...row, role: 'Pauser' } : row));
    rerender(<DataTable {...tableProps({ rows: moved })} />);
    expect(rowsBySection(container).find((group) => group.key === 'Pauser')!.rows).toContain(
      'key-0'
    );
    // Same rows array, same grouping object, different key function result.
    let mode = 'role';
    const grouping: DataTableGrouping<KeyRow> = {
      getGroupKey: (row) => (mode === 'role' ? row.role : row.added > 100 ? 'old' : 'new'),
    };
    rerender(<DataTable {...tableProps({ rows, grouping })} />);
    mode = 'age';
    rerender(<DataTable {...tableProps({ rows, grouping })} />);
    expect(sectionKeys(container).sort()).toEqual(['new', 'old']);
  });

  it('source: no state, ref cache or memo keyed on grouping', () => {
    expect(TABLE_SOURCE).not.toMatch(/useMemo\([^)]*grouping/s);
    expect(TABLE_SOURCE).not.toMatch(/useState[^;]*group/i);
    expect(GROUPING_SOURCE).not.toMatch(/\buse[A-Z]\w*\(/);
  });
});

describe('INV-18: three dev-only, deduplicated diagnostics', () => {
  function groupMessages(): string[] {
    return loggerError.mock.calls
      .map((call) => String(call[1]))
      .filter((message) => /grouping/.test(message));
  }

  it('group:key-type fires once across re-renders for a non-string key', () => {
    const grouping = {
      getGroupKey: ((row: KeyRow) =>
        row.id === 'key-1' ? 0 : row.role) as DataTableGrouping<KeyRow>['getGroupKey'],
    };
    const { rerender } = render(<DataTable {...tableProps({ grouping })} />);
    rerender(<DataTable {...tableProps({ grouping, rows: keyRows(13) })} />);
    rerender(<DataTable {...tableProps({ grouping })} />);
    expect(groupMessages()).toEqual([
      'DataTable: grouping.getGroupKey returned a non-string value; the row is shown under the ungrouped section.',
    ]);
    expect(loggerError.mock.calls.find((call) => /non-string/.test(String(call[1])))![0]).toBe(
      'DataTable'
    );
  });

  it('group:reordered fires once for an interleaved server page; never for client rows', () => {
    const interleaved = keyRows(9);
    const server = (rows: KeyRow[]) =>
      tableProps({
        rows,
        pagination: {
          kind: 'server',
          pageIndex: 0,
          pageSize: 9,
          totalCount: 9,
          onPageChange: noop,
        },
      });
    const { rerender, unmount } = render(<DataTable {...server(interleaved)} />);
    rerender(<DataTable {...server([...interleaved].reverse())} />);
    expect(groupMessages()).toEqual([
      'DataTable: grouping moved rows of a server page or feed; deliver rows ordered by group to keep scroll position stable.',
    ]);
    unmount();
    loggerError.mockClear();
    const client = render(<DataTable {...tableProps({ rows: interleaved })} />);
    client.rerender(
      <DataTable
        {...tableProps({
          rows: interleaved,
          pagination: { kind: 'client', pageIndex: 0, pageSize: 4, onPageChange: noop },
        })}
      />
    );
    expect(groupMessages()).toEqual([]);
  });

  it('group:empty-header fires once when a renderer returns empty content', () => {
    const grouping = byRole({
      renderGroupHeader: (info) => (info.key === 'Minter' ? '  ' : info.key),
    });
    const { rerender } = render(<DataTable {...tableProps({ grouping })} />);
    rerender(<DataTable {...tableProps({ grouping, rows: keyRows(10) })} />);
    expect(groupMessages()).toEqual([
      'DataTable: grouping.renderGroupHeader returned empty content; using the default group label.',
    ]);
  });

  it('a clean grouped table logs nothing', () => {
    render(
      <DataTable
        {...tableProps({ grouping: byRole({ renderGroupHeader: (i) => i.key ?? 'No role' }) })}
      />
    );
    expect(groupMessages()).toEqual([]);
  });

  it('diagnostics run in the effect, not during render', () => {
    const grouping = {
      getGroupKey: ((row: KeyRow) =>
        row.id === 'key-1' ? 0 : row.role) as DataTableGrouping<KeyRow>['getGroupKey'],
    };
    const html = renderToString(<DataTable {...tableProps({ grouping })} />);
    expect(html).toContain('data-table-group-row');
    expect(groupMessages()).toEqual([]);
  });

  it('production build: none of the three fire (dev control fires all three)', async () => {
    const trigger = tableProps({
      rows: keyRows(9),
      grouping: {
        getGroupKey: ((row: KeyRow) =>
          row.id === 'key-1' ? 0 : row.role) as DataTableGrouping<KeyRow>['getGroupKey'],
        renderGroupHeader: () => '',
      },
      pagination: {
        kind: 'server',
        pageIndex: 0,
        pageSize: 9,
        totalCount: 9,
        onPageChange: noop,
      },
    });
    // Dev control: the same props raise all three diagnostics.
    const dev = render(<DataTable {...trigger} />);
    expect(groupMessages()).toHaveLength(3);
    dev.unmount();
    loggerError.mockClear();

    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    const utils = await import('@openzeppelin/ui-utils');
    const prodError = vi.spyOn(utils.logger, 'error').mockImplementation(noop);
    const { DataTable: ProdTable } = await import('../data-table');
    expect(ProdTable).not.toBe(DataTable); // re-evaluated with NODE_ENV=production
    const { render: prodRender } = await import('@testing-library/react');
    const prod = prodRender(<ProdTable {...trigger} />);
    expect(prod.container.querySelectorAll('tr[data-slot="data-table-group-row"]').length).toBe(4);
    expect(prodError).not.toHaveBeenCalled();
    expect(groupMessages()).toEqual([]);
    prod.unmount();
  });
});

describe('INV-19: integrator throws propagate; kit code adds none', () => {
  it.each([
    {
      name: 'getGroupKey throws',
      grouping: {
        getGroupKey: (row: KeyRow) => {
          if (row.id === 'key-3') {
            throw new Error('boom-key');
          }
          return row.role;
        },
      },
      message: 'boom-key',
    },
    {
      name: 'renderGroupHeader throws',
      grouping: byRole({
        renderGroupHeader: () => {
          throw new Error('boom-header');
        },
      }),
      message: 'boom-header',
    },
  ])('$name → the app error boundary renders the same error', ({ grouping, message }) => {
    vi.spyOn(console, 'error').mockImplementation(noop);
    const { container } = render(
      <Boundary>
        <DataTable {...tableProps({ grouping })} />
      </Boundary>
    );
    expect(screen.getByRole('alert').textContent).toBe(`caught: ${message}`);
    expect(container.querySelector('table')).toBeNull();
  });

  it('source: no try/catch in grouping.ts or around the resolver', () => {
    expect(GROUPING_SOURCE).not.toMatch(/\btry\s*\{/);
    expect(GROUPING_SOURCE).not.toMatch(/\bcatch\s*\(/);
  });

  it('degenerate inputs never throw in the pure pipeline', () => {
    const shapes: {
      rows: PRow[];
      columns: readonly DataTableColumn<PRow>[];
      sort: DataTableSortState | null;
    }[] = [
      { rows: [], columns: [], sort: null },
      { rows: [], columns: P_COLUMNS, sort: { columnId: 'nope', direction: 'asc' } },
      { rows: [{ id: 'a', k: undefined, v: undefined }], columns: [], sort: null },
      { rows: randomRows(mulberry32(7)), columns: [], sort: { columnId: 'v', direction: 'desc' } },
    ];
    for (const shape of shapes) {
      for (const clientSort of [true, false]) {
        const grouped = groupDisplayRows({ ...shape, getGroupKey: untypedKey, clientSort });
        for (const pageStart of [0, 3, 1000, Number.NaN, -2]) {
          expect(() =>
            buildGroupedBodyItems({
              bodyRows: grouped.displayRows.slice(0, 3),
              pageStart,
              grouped,
              getRowKey: (row) => row.id,
            })
          ).not.toThrow();
        }
      }
    }
  });

  it.each([
    { name: 'no columns', extra: { columns: [] } },
    { name: 'rows=[]', extra: { rows: [] } },
    {
      name: 'invalid pageSize',
      extra: { pagination: { kind: 'client', pageIndex: 0, pageSize: -3, onPageChange: noop } },
    },
  ])('component: $name renders without throwing', ({ extra }) => {
    expect(() => render(<DataTable {...tableProps(extra)} />)).not.toThrow();
  });
});

// ─── Interaction & Transition ───────────────────────────────────────────────────

describe('INV-20: sorting reorders rows within groups only', () => {
  function expectedSections(
    rows: readonly KeyRow[],
    sort: DataTableSortState | null
  ): { key: string | null; rows: string[] }[] {
    return expectedPartition(rows, (row) => resolveGroupKey(row.role)).map((part) => ({
      key: part.key,
      rows: applyClientSort(part.rows, keyColumns(), sort).map((row) => row.id),
    }));
  }

  it.each(['label', 'added'] as const)(
    'cycling %s: sections fixed, rows sorted per section; callbacks and aria-sort match ungrouped',
    (columnId) => {
      // Duplicate `added` values exercise stability; key-7 has no role.
      const rows = keyRows(24, [7]).map((row, n) => (n % 5 === 0 ? { ...row, added: 50 } : row));
      const groupedSort = vi.fn();
      const plainSort = vi.fn();
      const grouped = render(<DataTable {...tableProps({ rows, onSortChange: groupedSort })} />);
      const name = columnId === 'label' ? 'Label' : 'Added';
      const states: (DataTableSortState | null)[] = [];
      const ariaGrouped: (string | null)[] = [];
      const namesGrouped: string[] = [];
      let sort: DataTableSortState | null = null;
      for (let click = 0; click < 3; click += 1) {
        const button = within(grouped.container).getByRole('button', {
          name: new RegExp(`Sort by ${name}`),
        });
        fireEvent.click(button);
        sort = (groupedSort.mock.calls.at(-1)?.[0] as DataTableSortState | null) ?? null;
        states.push(sort);
        expect(rowsBySection(grouped.container), `click ${String(click + 1)}`).toEqual(
          expectedSections(rows, sort)
        );
        ariaGrouped.push(
          grouped.container
            .querySelector(`th[data-column-id="${columnId}"]`)!
            .getAttribute('aria-sort')
        );
        namesGrouped.push(
          within(grouped.container)
            .getByRole('button', { name: new RegExp(name) })
            .getAttribute('aria-label') ?? ''
        );
      }
      grouped.unmount();

      const plain = render(
        <DataTable {...tableProps({ rows, onSortChange: plainSort, grouping: undefined })} />
      );
      const ariaPlain: (string | null)[] = [];
      const namesPlain: string[] = [];
      for (let click = 0; click < 3; click += 1) {
        fireEvent.click(
          within(plain.container).getByRole('button', { name: new RegExp(`Sort by ${name}`) })
        );
        ariaPlain.push(
          plain.container
            .querySelector(`th[data-column-id="${columnId}"]`)!
            .getAttribute('aria-sort')
        );
        namesPlain.push(
          within(plain.container)
            .getByRole('button', { name: new RegExp(name) })
            .getAttribute('aria-label') ?? ''
        );
      }
      expect(groupedSort.mock.calls).toEqual(plainSort.mock.calls);
      expect(ariaGrouped).toEqual(ariaPlain);
      expect(namesGrouped).toEqual(namesPlain);
      expect(states.map((state) => state?.direction ?? null)).toEqual(['asc', 'desc', null]);
    }
  );

  it('missing sort values go last within their group', () => {
    const rows = keyRows(9).map((row, n) => ({ ...row, added: n === 0 ? Number.NaN : row.added }));
    const columns = keyColumns().map((column) =>
      column.id === 'added'
        ? { ...column, getSortValue: (row: KeyRow) => (row.id === 'key-3' ? undefined : row.added) }
        : column
    );
    const { container } = render(<DataTable {...tableProps({ rows, columns })} />);
    fireEvent.click(screen.getByRole('button', { name: /Sort by Added/ }));
    const admin = rowsBySection(container).find((group) => group.key === 'Admin')!;
    expect(admin.rows.at(-1)).toBe('key-3');
    fireEvent.click(screen.getByRole('button', { name: /Sort by Added/ }));
    expect(
      rowsBySection(container)
        .find((group) => group.key === 'Admin')!
        .rows.at(-1)
    ).toBe('key-3');
  });

  it('server pagination: a sort click only emits onSortChange; order is unchanged', () => {
    const rows = keyRows(9).sort((a, b) => (a.role ?? '').localeCompare(b.role ?? ''));
    const onSortChange = vi.fn();
    const { container } = render(
      <DataTable
        {...tableProps({
          rows,
          onSortChange,
          pagination: {
            kind: 'server',
            pageIndex: 0,
            pageSize: 9,
            totalCount: 9,
            onPageChange: noop,
          },
        })}
      />
    );
    const before = dataRowKeys(container);
    fireEvent.click(screen.getByRole('button', { name: /Sort by Label/ }));
    expect(onSortChange).toHaveBeenCalledTimes(1);
    expect(dataRowKeys(container)).toEqual(before);
    expect(before).toEqual(rows.map((row) => row.id));
  });
});

describe('INV-21: selection covers exactly the window’s data rows; sections never selectable', () => {
  function SelectableGrouped(props: {
    rows: KeyRow[];
    onChange: (next: ReadonlySet<string>) => void;
    extra?: Record<string, unknown>;
  }): ReactElement {
    const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(() => new Set());
    return (
      <>
        <p data-testid="readout">
          {selectedKeys.size} of {props.rows.length} keys selected
        </p>
        <DataTable
          {...tableProps({
            rows: props.rows,
            selection: {
              selectedKeys,
              onSelectionChange: (next: ReadonlySet<string>) => {
                props.onChange(next);
                setSelectedKeys(next);
              },
              selectAllLabel: 'Select all keys',
            },
            ...props.extra,
          })}
        />
      </>
    );
  }

  it('virtualized 120 rows: select-all → 120 data keys (mounted or not), no reserved key', () => {
    const rows = keyRows(120, [10, 55, 100]);
    const onChange = vi.fn();
    const { container } = render(
      <SelectableGrouped rows={rows} onChange={onChange} extra={{ virtualized: true }} />
    );
    expect(painted(container).length).toBeLessThan(rows.length);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all keys' }));
    const payload = onChange.mock.calls[0]![0] as ReadonlySet<string>;
    expect(payload.size).toBe(120);
    expect([...payload].sort()).toEqual(rows.map((row) => row.id).sort());
    expect([...payload].some((key) => key.startsWith(RESERVED))).toBe(false);
    expect(screen.getByTestId('readout').textContent).toBe('120 of 120 keys selected');
    expect(
      screen.getByRole('checkbox', { name: 'Select all keys' }).getAttribute('aria-checked')
    ).toBe('true');
    // Deselect-all clears exactly the data keys.
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all keys' }));
    expect((onChange.mock.calls[1]![0] as ReadonlySet<string>).size).toBe(0);
  });

  it('activating a section row (click, Enter, Space) emits nothing', () => {
    const onChange = vi.fn();
    const { container } = render(<SelectableGrouped rows={keyRows(12, [5])} onChange={onChange} />);
    for (const tr of container.querySelectorAll<HTMLElement>(
      'tr[data-slot="data-table-group-row"]'
    )) {
      const th = tr.querySelector('th')!;
      for (const target of [tr, th]) {
        fireEvent.click(target);
        fireEvent.keyDown(target, { key: 'Enter' });
        fireEvent.keyDown(target, { key: ' ' });
      }
    }
    expect(onChange).not.toHaveBeenCalled();
  });

  it('client page of 5 data rows + sections: select-all is exactly those 5 keys', () => {
    const onChange = vi.fn();
    render(
      <SelectableGrouped
        rows={paginatedKeyRows()}
        onChange={onChange}
        extra={{ pagination: { kind: 'client', pageIndex: 1, pageSize: 5, onPageChange: noop } }}
      />
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all keys' }));
    expect([...(onChange.mock.calls[0]![0] as ReadonlySet<string>)]).toEqual([
      'key-5',
      'key-6',
      'key-7',
      'key-8',
      'key-9',
    ]);
  });

  it('header tri-state is derived from data keys only; single toggles unchanged', () => {
    const onChange = vi.fn();
    const rows = keyRows(6);
    render(<SelectableGrouped rows={rows} onChange={onChange} />);
    const selectAll = () => screen.getByRole('checkbox', { name: 'Select all keys' });
    expect(selectAll().getAttribute('aria-checked')).toBe('false');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select key-2' }));
    expect([...(onChange.mock.calls[0]![0] as ReadonlySet<string>)]).toEqual(['key-2']);
    expect(selectAll().getAttribute('aria-checked')).toBe('mixed');
    for (const row of rows.filter((candidate) => candidate.id !== 'key-2')) {
      fireEvent.click(screen.getByRole('checkbox', { name: `Select ${row.id}` }));
    }
    expect(selectAll().getAttribute('aria-checked')).toBe('true');
    for (const call of onChange.mock.calls) {
      expect([...(call[0] as ReadonlySet<string>)].some((key) => key.startsWith(RESERVED))).toBe(
        false
      );
    }
  });
});

describe('INV-22: client pagination counts data rows; a split group repeats its section [provisional (c)]', () => {
  function Paged({ start = 0 }: { start?: number }): ReactElement {
    const [pageIndex, setPageIndex] = useState(start);
    return (
      <DataTable
        {...tableProps({
          rows: paginatedKeyRows(),
          grouping: byRole({
            renderGroupHeader: ({ key, continued }) =>
              `${String(key)}${continued ? ' (continued)' : ''}`,
          }),
          pagination: {
            kind: 'client',
            pageIndex,
            pageSize: 5,
            onPageChange: setPageIndex,
            placement: 'inside',
          },
        })}
      />
    );
  }

  it('pages 1–3: data rows 5/5/2, sections, continued, status, never ends on a section', () => {
    const { container } = render(<Paged />);
    const expected = [
      {
        status: 'Showing 1–5 of 12',
        sections: ['Admin', 'Minter'],
        data: 5,
        prev: true,
        next: false,
      },
      {
        status: 'Showing 6–10 of 12',
        sections: ['Minter (continued)', 'Pauser'],
        data: 5,
        prev: false,
        next: false,
      },
      {
        status: 'Showing 11–12 of 12',
        sections: ['Pauser (continued)'],
        data: 2,
        prev: false,
        next: true,
      },
    ];
    expected.forEach((page, n) => {
      if (n > 0) {
        fireEvent.click(container.querySelector('[data-slot="data-table-pagination-next"]')!);
      }
      expect(sectionTexts(container), `page ${String(n + 1)}`).toEqual(page.sections);
      expect(dataRowKeys(container)).toHaveLength(page.data);
      expect(
        container.querySelector('[data-slot="data-table-pagination-status"]')!.textContent
      ).toBe(page.status);
      expect(
        container
          .querySelector('[data-slot="data-table-pagination-previous"]')!
          .hasAttribute('disabled')
      ).toBe(page.prev);
      expect(
        container
          .querySelector('[data-slot="data-table-pagination-next"]')!
          .hasAttribute('disabled')
      ).toBe(page.next);
      expect(painted(container).at(-1)!.kind).toBe('row');
      expect(container.querySelectorAll('[data-slot="data-table-pagination-page"]')).toHaveLength(
        3
      );
    });
    // Back to page 1 re-derives sections in the same commit.
    fireEvent.click(container.querySelector('[data-page-index="0"]')!);
    expect(sectionTexts(container)).toEqual(['Admin', 'Minter']);
  });
});

describe('INV-23: scrollToRowKey targets data rows by paint index', () => {
  it('section keys and unknown keys are a no-op; a data key scrolls; handle null when inactive', () => {
    const ref = createRef<DataTableVirtualizationHandle>();
    const rows = tenGroupRows(500);
    const { container } = render(
      <DataTable {...tableProps({ rows, virtualized: true, virtualizationRef: ref })} />
    );
    expect(ref.current).not.toBeNull();
    const wrap = scroller(container);
    const scrollSpy = vi.spyOn(wrap, 'scrollTo');
    for (const key of [
      `${DATA_TABLE_GROUP_ITEM_KEY_PREFIX}G3`,
      DATA_TABLE_UNGROUPED_ITEM_KEY,
      'missing-key',
    ]) {
      expect(() => act(() => ref.current!.scrollToRowKey(key))).not.toThrow();
    }
    expect(scrollSpy).not.toHaveBeenCalled();
    act(() => ref.current!.scrollToRowKey('key-499', 'start'));
    expect(scrollSpy).toHaveBeenCalled();

    const inactiveRef = createRef<DataTableVirtualizationHandle>();
    render(<DataTable {...tableProps({ virtualizationRef: inactiveRef })} />);
    expect(inactiveRef.current).toBeNull();
  });

  it('unit: findPaintIndexByRowKey returns the data item’s paint index; sections → null', () => {
    const grouped = groupDisplayRows({
      rows: paginatedKeyRows(),
      getGroupKey: (row) => row.role,
      columns: keyColumns(),
      sort: null,
      clientSort: true,
    });
    const items = buildGroupedBodyItems({
      bodyRows: grouped.displayRows,
      pageStart: 0,
      grouped,
      getRowKey: getKeyRowKey,
    });
    // key-11 is the 12th data row; 3 sections sit above it.
    expect(findPaintIndexByRowKey(items, 'key-11')).toBe(14);
    expect(findPaintIndexByRowKey(items, 'key-0')).toBe(1);
    expect(findPaintIndexByRowKey(items, `${DATA_TABLE_GROUP_ITEM_KEY_PREFIX}Admin`)).toBeNull();
    expect(findPaintIndexByRowKey(items, 'nope')).toBeNull();
  });
});

describe('INV-24: data-row node identity and focus survive grouped re-orders', () => {
  it('sort, regroup (key move), grouping off/on: same <tr>, same focused checkbox, same <thead>', () => {
    const rows = keyRows(9);
    const selection = { selectedKeys: new Set<string>(), onSelectionChange: noop };
    const { container, rerender } = render(<DataTable {...tableProps({ rows, selection })} />);
    const tr = container.querySelector('tr[data-row-key="key-4"]')!;
    const thead = container.querySelector('thead')!;
    const checkbox = within(tr as HTMLElement).getByRole('checkbox');
    act(() => checkbox.focus());
    expect(document.activeElement).toBe(checkbox);

    const steps: [string, () => void][] = [
      ['sort asc', () => fireEvent.click(screen.getByRole('button', { name: /Sort by Label/ }))],
      ['sort desc', () => fireEvent.click(screen.getByRole('button', { name: /Sort by Label/ }))],
      [
        'key moves to another section',
        () =>
          rerender(
            <DataTable
              {...tableProps({
                rows: rows.map((row) => (row.id === 'key-4' ? { ...row, role: 'Pauser' } : row)),
                selection,
              })}
            />
          ),
      ],
      [
        'grouping off',
        () => rerender(<DataTable {...tableProps({ rows, selection, grouping: undefined })} />),
      ],
      ['grouping on', () => rerender(<DataTable {...tableProps({ rows, selection })} />)],
    ];
    for (const [name, step] of steps) {
      act(step);
      expect(container.querySelector('tr[data-row-key="key-4"]'), name).toBe(tr);
      expect(document.activeElement, name).toBe(checkbox);
      expect(container.querySelector('thead'), name).toBe(thead);
    }
  });

  it('page round-trip keeps a data row node that stays on the page', () => {
    function Paged({ pageIndex }: { pageIndex: number }): ReactElement {
      return (
        <DataTable
          {...tableProps({
            rows: paginatedKeyRows(),
            pagination: { kind: 'client', pageIndex, pageSize: 5, onPageChange: noop },
          })}
        />
      );
    }
    const { container, rerender } = render(<Paged pageIndex={0} />);
    const section = container.querySelector('tr[data-group-key="Admin"]')!;
    const tr = container.querySelector('tr[data-row-key="key-1"]')!;
    rerender(<Paged pageIndex={0} />);
    expect(container.querySelector('tr[data-row-key="key-1"]')).toBe(tr);
    expect(container.querySelector('tr[data-group-key="Admin"]')).toBe(section);
  });

  it('source: grouping code calls no .focus() and adds no tabIndex', () => {
    expect(GROUPING_SOURCE).not.toMatch(/\.focus\(/);
    const helpers = SCROLLER_SOURCE.slice(
      SCROLLER_SOURCE.indexOf('function renderGroupedDataRow'),
      SCROLLER_SOURCE.indexOf('function SpacerRow')
    );
    expect(helpers.length).toBeGreaterThan(100);
    expect(helpers).not.toMatch(/\.focus\(/);
    expect(helpers).not.toMatch(/tabIndex/);
  });
});

describe('INV-25: grouping adds no callbacks and no interaction state', () => {
  it('mount, new rows, regroup, page change via props: zero callbacks', () => {
    const spies = {
      onSortChange: vi.fn(),
      onSelectionChange: vi.fn(),
      onPageChange: vi.fn(),
    };
    const base = (rows: KeyRow[], pageIndex: number, grouping: DataTableGrouping<KeyRow>) =>
      tableProps({
        rows,
        grouping,
        onSortChange: spies.onSortChange,
        selection: { selectedKeys: new Set(['key-1']), onSelectionChange: spies.onSelectionChange },
        pagination: { kind: 'client', pageIndex, pageSize: 4, onPageChange: spies.onPageChange },
      });
    const { rerender } = render(<DataTable {...base(keyRows(12), 0, byRole())} />);
    rerender(<DataTable {...base(keyRows(15, [2]), 0, byRole())} />);
    rerender(
      <DataTable
        {...base(keyRows(15, [2]), 1, { getGroupKey: (row) => (row.added > 150 ? 'old' : 'new') })}
      />
    );
    rerender(<DataTable {...base(keyRows(3), 2, byRole())} />);
    for (const spy of Object.values(spies)) {
      expect(spy).not.toHaveBeenCalled();
    }

    const onLoadMore = vi.fn();
    const feed = (rows: KeyRow[]) =>
      tableProps({ rows, infiniteScroll: { hasMore: false, onLoadMore } });
    const second = render(<DataTable {...feed(keyRows(5))} />);
    second.rerender(<DataTable {...feed(keyRows(8))} />);
    expect(onLoadMore).not.toHaveBeenCalled();
  });
});

// ─── Performance, Scalability & Stability ──────────────────────────────────────

describe('INV-26: grouped virtualization stays O(viewport) at 10k rows (jsdom counts)', () => {
  it('mounts O(viewport) rows; cell and renderGroupHeader run only for mounted items', () => {
    const rows = tenGroupRows(10_000);
    const cellRows: KeyRow[] = [];
    const headerKeys: (string | null)[] = [];
    const { container } = render(
      <DataTable
        {...tableProps({
          rows,
          columns: keyColumns((row) => cellRows.push(row)),
          grouping: byRole({
            renderGroupHeader: (info) => {
              headerKeys.push(info.key);
              return info.key;
            },
          }),
          virtualized: true,
        })}
      />
    );
    const items = painted(container);
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThan(40);
    const mountedRows = new Set(
      items.filter((item) => item.kind === 'row').map((item) => item.key)
    );
    const mountedSections = new Set(
      items.filter((item) => item.kind === 'group').map((item) => item.key)
    );
    // Every mounted item was rendered; nothing far outside the window ever was. (The first
    // frame can paint a slightly larger window before measurement settles.)
    const celled = new Set(cellRows.map((row) => row.id));
    for (const key of mountedRows) {
      expect(celled.has(key)).toBe(true);
    }
    expect(celled.size).toBeLessThanOrEqual(mountedRows.size + 8);
    for (const id of celled) {
      expect(Number(id.slice(4))).toBeLessThan(60);
    }
    expect(new Set(headerKeys)).toEqual(mountedSections);
    expect(headerKeys.length).toBeLessThan(10);
  });
});

describe('INV-27: scrolling never re-groups and never copies the row list', () => {
  it('20 scroll frames on 10k grouped rows: zero pipeline and getGroupKey calls', () => {
    const rows = tenGroupRows(10_000);
    let keyCalls = 0;
    const cellRows: KeyRow[] = [];
    const { container } = render(
      <DataTable
        {...tableProps({
          rows,
          columns: keyColumns((row) => cellRows.push(row)),
          grouping: {
            getGroupKey: (row: KeyRow) => {
              keyCalls += 1;
              return row.role;
            },
          },
          virtualized: true,
        })}
      />
    );
    vi.mocked(groupDisplayRows).mockClear();
    vi.mocked(buildGroupedBodyItems).mockClear();
    const callsAfterMount = keyCalls;
    const firstBefore = painted(container)[0]!.el.getAttribute('data-index');
    for (let frame = 1; frame <= 20; frame += 1) {
      scrollTo(container, frame * 7000);
    }
    expect(painted(container)[0]!.el.getAttribute('data-index')).not.toBe(firstBefore);
    expect(keyCalls).toBe(callsAfterMount);
    expect(groupDisplayRows).not.toHaveBeenCalled();
    expect(buildGroupedBodyItems).not.toHaveBeenCalled();
    // Rows reaching `cell` are the integrator's own objects (no per-frame clone).
    const ids = new Map(rows.map((row) => [row.id, row]));
    for (const row of cellRows) {
      expect(ids.get(row.id)).toBe(row);
    }
  });
});

describe('INV-28: the virtualizer maps over bodyItems; estimateSize keeps data indices', () => {
  it('integrator estimateSize only sees data indices; data-index = paint index for every item', () => {
    const rows = tenGroupRows(10_000);
    const estimateArgs: number[] = [];
    const { container } = render(
      <DataTable
        {...tableProps({
          rows,
          virtualized: {
            estimateSize: (index: number) => {
              estimateArgs.push(index);
              return 64;
            },
          },
        })}
      />
    );
    scrollTo(container, 200_000);
    expect(estimateArgs.length).toBeGreaterThan(0);
    for (const arg of estimateArgs) {
      expect(Number.isInteger(arg)).toBe(true);
      expect(arg).toBeGreaterThanOrEqual(0);
      expect(arg).toBeLessThan(rows.length);
    }
    // 10k data rows + 10 sections: the integrator saw data indices only (never ≥ 10_000).
    expect(Math.max(...estimateArgs)).toBe(rows.length - 1);

    const grouped = groupDisplayRows({
      rows,
      getGroupKey: (row) => row.role,
      columns: keyColumns(),
      sort: null,
      clientSort: true,
    });
    const items = buildGroupedBodyItems({
      bodyRows: grouped.displayRows,
      pageStart: 0,
      grouped,
      getRowKey: getKeyRowKey,
    });
    const mounted = painted(container);
    expect(mounted.some((item) => item.kind === 'group') || mounted.length > 0).toBe(true);
    for (const item of mounted) {
      const index = Number(item.el.getAttribute('data-index'));
      const expected: DataTableBodyItem<KeyRow> = items[index]!;
      expect(item.kind).toBe(expected.kind);
      if (expected.kind === 'group') {
        expect(item.key).toBe(expected.info.key);
      } else {
        expect(item.key).toBe(expected.itemKey);
      }
    }
  });

  it('a fixed numeric estimate still gives sections the kit estimate (unit through the item list)', () => {
    expect(DATA_TABLE_GROUP_ROW_ESTIMATE_SIZE).toBe(40);
    const rows = tenGroupRows(200);
    const { container } = render(
      <DataTable {...tableProps({ rows, virtualized: { estimateSize: 64 } })} />
    );
    const first = painted(container);
    expect(first[0]!.kind).toBe('group');
    expect(first[0]!.el.getAttribute('data-index')).toBe('0');
    expect(first[1]!.el.getAttribute('data-index')).toBe('1');
  });
});

describe('INV-30: no new listeners or observers; SSR is consistent', () => {
  it('100 mount/unmount cycles: observers created = disconnected; listeners equal ungrouped', () => {
    const count = (grouping: DataTableGrouping<KeyRow> | undefined) => {
      const NativeObserver = globalThis.ResizeObserver;
      let created = 0;
      globalThis.ResizeObserver = class extends NativeObserver {
        public constructor(callback: ResizeObserverCallback) {
          super(callback);
          created += 1;
        }
      };
      const observe = vi.spyOn(NativeObserver.prototype, 'observe');
      const unobserve = vi.spyOn(NativeObserver.prototype, 'unobserve');
      const disconnect = vi.spyOn(NativeObserver.prototype, 'disconnect');
      const add = vi.spyOn(HTMLElement.prototype, 'addEventListener');
      const remove = vi.spyOn(HTMLElement.prototype, 'removeEventListener');
      const winAdd = vi.spyOn(window, 'addEventListener');
      const winRemove = vi.spyOn(window, 'removeEventListener');
      let mountedItems = 0;
      for (let n = 0; n < 100; n += 1) {
        const { container, unmount } = render(
          <DataTable {...tableProps({ rows: keyRows(200), grouping, virtualized: true })} />
        );
        mountedItems += painted(container).length;
        unmount();
      }
      const out = {
        created,
        disconnect: disconnect.mock.calls.length,
        // TanStack observes each measured row; one call per mounted item per mount.
        observePerItem: observe.mock.calls.length - unobserve.mock.calls.length - mountedItems,
        add: add.mock.calls.length,
        remove: remove.mock.calls.length,
        winAdd: winAdd.mock.calls.length,
        winRemove: winRemove.mock.calls.length,
      };
      globalThis.ResizeObserver = NativeObserver;
      vi.restoreAllMocks();
      return out;
    };
    const grouped = count(byRole());
    const plain = count(undefined);
    // Grouping adds no observer, listener or per-item observe beyond the ungrouped table's
    // (004 INV-137 owns the ungrouped balance; Checkbox / scroller observers are shared).
    expect(grouped).toEqual(plain);
    expect(grouped.created).toBeGreaterThan(0);
    expect(grouped.winAdd).toBe(grouped.winRemove);
  });

  it.each([
    { name: 'plain', extra: {} },
    {
      name: 'client page 2',
      extra: { pagination: { kind: 'client', pageIndex: 1, pageSize: 5, onPageChange: noop } },
    },
    {
      name: 'selection + renderer',
      extra: {
        selection: { selectedKeys: new Set(['key-2']), onSelectionChange: noop },
        grouping: byRole({ renderGroupHeader: (info) => <strong>{info.key ?? 'none'}</strong> }),
      },
    },
  ])(
    'SSR + hydrate ($name): no hydration warning, server section nodes reused',
    async ({ extra }) => {
      const element = <DataTable {...tableProps({ rows: keyRows(12, [5]), ...extra })} />;
      const html = renderToString(element);
      expect(html).toContain('data-table-group-row');
      const host = document.createElement('div');
      host.innerHTML = html;
      document.body.appendChild(host);
      const serverSection = host.querySelector('tr[data-slot="data-table-group-row"]');
      const consoleError = vi.spyOn(console, 'error').mockImplementation(noop);
      const recoverable = vi.fn();
      let root: Root | undefined;
      await act(async () => {
        root = hydrateRoot(host, element, { onRecoverableError: recoverable });
      });
      expect(recoverable).not.toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();
      expect(host.querySelector('tr[data-slot="data-table-group-row"]')).toBe(serverSection);
      act(() => root!.unmount());
      host.remove();
    }
  );
});

// ─── Async / Loading / Error / Empty ───────────────────────────────────────────

describe('INV-31: server pages and feeds are grouped without client sort', () => {
  const server = (rows: readonly KeyRow[], extra: Record<string, unknown> = {}) =>
    tableProps({
      rows,
      pagination: { kind: 'server', pageIndex: 2, pageSize: 6, totalCount: 30, onPageChange: noop },
      ...extra,
    });

  it('group-ordered page: DOM order = input order (element-wise), no diagnostic, continued false', () => {
    const rows = paginatedKeyRows().slice(2, 8); // Admin 2, Minter 4: a mid-group server page
    const infos: DataTableGroupHeaderInfo<KeyRow>[] = [];
    const getSortValue = vi.fn((row: KeyRow) => row.label);
    const columns = keyColumns().map((column) =>
      column.id === 'label' ? { ...column, getSortValue } : column
    );
    const { container } = render(
      <DataTable
        {...server(rows, {
          columns,
          defaultSort: { columnId: 'label', direction: 'desc' },
          grouping: byRole({ renderGroupHeader: (info) => (infos.push(info), info.key) }),
        })}
      />
    );
    expect(dataRowKeys(container)).toEqual(rows.map((row) => row.id));
    expect(getSortValue).not.toHaveBeenCalled();
    expect(infos.every((info) => info.continued === false)).toBe(true);
    expect(Object.fromEntries(infos.map((info) => [info.key, info.rows.length]))).toEqual({
      Admin: 2,
      Minter: 4,
    });
    expect(loggerError.mock.calls.filter((call) => /grouping/.test(String(call[1])))).toEqual([]);
  });

  it('interleaved page: stable first-appearance partition + one group:reordered', () => {
    const rows = keyRows(6); // Admin, Minter, Pauser, Admin, Minter, Pauser
    const { container } = render(<DataTable {...server(rows)} />);
    expect(rowsBySection(container)).toEqual([
      { key: 'Admin', rows: ['key-0', 'key-3'] },
      { key: 'Minter', rows: ['key-1', 'key-4'] },
      { key: 'Pauser', rows: ['key-2', 'key-5'] },
    ]);
    expect(
      loggerError.mock.calls.filter((call) => /moved rows/.test(String(call[1])))
    ).toHaveLength(1);
  });

  it('infinite feed: an appended Admin row paints inside the earlier Admin group (+ diagnostic)', () => {
    const first = paginatedKeyRows();
    const feed = (rows: KeyRow[]) =>
      tableProps({ rows, infiniteScroll: { hasMore: true, onLoadMore: noop } });
    const { container, rerender } = render(<DataTable {...feed(first)} />);
    expect(loggerError.mock.calls.filter((call) => /moved rows/.test(String(call[1])))).toEqual([]);
    const appended = [...first, { id: 'late-admin', role: 'Admin', label: 'Late', added: 1 }];
    rerender(<DataTable {...feed(appended)} />);
    const groups = rowsBySection(container);
    expect(groups.map((group) => group.key)).toEqual(['Admin', 'Minter', 'Pauser']);
    expect(groups[0]!.rows.at(-1)).toBe('late-admin');
    expect(
      loggerError.mock.calls.filter((call) => /moved rows/.test(String(call[1])))
    ).toHaveLength(1);
  });
});

describe('INV-32: end-of-feed detection and the sentinel use the paint list', () => {
  it('unvirtualized feed: the sentinel row stays after the last painted item', () => {
    const { container } = render(
      <DataTable
        {...tableProps({
          rows: keyRows(9, [4]),
          infiniteScroll: { hasMore: true, onLoadMore: noop },
        })}
      />
    );
    const trs = [...bodyOf(container).querySelectorAll(':scope > tr')];
    const last = trs.at(-1)!;
    expect(last.getAttribute('data-slot')).toBe('data-table-infinite-sentinel');
    expect(trs.at(-2)!.getAttribute('data-slot')).toBe('data-table-row');
  });

  it('source: the virtual end check is fed the paint count', () => {
    expect(SCROLLER_SOURCE).toMatch(/bodyRowCount: paintCount/);
    expect(SCROLLER_SOURCE).toMatch(
      /const paintCount = bodyItems\?\.length \?\? bodyRows\.length;/
    );
  });
});

describe('INV-33: grouping adds no loading, error or empty presentation', () => {
  const slotsOf = (root: ParentNode) =>
    [...bodyOf(root).querySelectorAll(':scope > tr')].map((tr) => tr.getAttribute('data-slot'));

  it.each([
    {
      name: 'infinite busy, 0 rows',
      extra: { rows: [], infiniteScroll: { hasMore: true, busy: true, onLoadMore: noop } },
    },
    {
      name: 'known-empty feed',
      extra: { rows: [], infiniteScroll: { hasMore: false, onLoadMore: noop } },
    },
    {
      name: 'server loading via rows=[] + busy',
      extra: {
        rows: [],
        pagination: { kind: 'server', pageIndex: 0, pageSize: 5, busy: true, onPageChange: noop },
      },
    },
  ])('$name: same body as ungrouped, no section row, same aria-busy', ({ extra }) => {
    const grouped = render(<DataTable {...tableProps(extra)} />);
    const groupedSlots = slotsOf(grouped.container);
    const groupedBusy = grouped.container.querySelector('[aria-busy]')?.getAttribute('aria-busy');
    grouped.unmount();
    const plain = render(<DataTable {...tableProps({ ...extra, grouping: undefined })} />);
    expect(groupedSlots).toEqual(slotsOf(plain.container));
    expect(groupedBusy).toBe(
      plain.container.querySelector('[aria-busy]')?.getAttribute('aria-busy')
    );
    expect(groupedSlots).not.toContain('data-table-group-row');
  });

  it('busy feed with rows: only section + data rows + the sentinel; no extra state rows', () => {
    const { container } = render(
      <DataTable
        {...tableProps({
          rows: keyRows(6),
          infiniteScroll: { hasMore: true, busy: true, onLoadMore: noop },
        })}
      />
    );
    expect(new Set(slotsOf(container))).toEqual(
      new Set(['data-table-group-row', 'data-table-row', 'data-table-infinite-sentinel'])
    );
  });
});

// ─── Accessibility ──────────────────────────────────────────────────────────────

describe('INV-34: section rows are distinguishable; one header row (jsdom role engine)', () => {
  it('rowheader per section named by its label; columnheaders = painted columns; data rows have none', () => {
    render(
      <DataTable
        {...tableProps({
          rows: keyRows(12, [5]),
          selection: { selectedKeys: new Set<string>(), onSelectionChange: noop },
          grouping: byRole({ ungroupedLabel: 'No role' }),
        })}
      />
    );
    const table = screen.getByRole('table', { name: 'Keys' });
    expect(within(table).getAllByRole('columnheader')).toHaveLength(4);
    const rowheaders = within(table).getAllByRole('rowheader');
    expect(rowheaders.map((cell) => cell.textContent)).toEqual([
      'Admin',
      'Minter',
      'Pauser',
      'No role',
    ]);
    for (const name of ['Admin', 'Minter', 'Pauser', 'No role']) {
      expect(within(table).getByRole('rowheader', { name })).toBeTruthy();
    }
    const [headGroup, bodyGroup] = within(table).getAllByRole('rowgroup');
    expect(within(headGroup!).getAllByRole('row')).toHaveLength(1);
    for (const row of within(bodyGroup!).getAllByRole('row')) {
      const isSection = row.getAttribute('data-slot') === 'data-table-group-row';
      expect(within(row).queryAllByRole('rowheader')).toHaveLength(isSection ? 1 : 0);
      expect(within(row).queryAllByRole('cell')).toHaveLength(isSection ? 0 : 4);
    }
  });
});

describe('INV-35: ARIA row count and indices are all-or-nothing with sections counted', () => {
  function readAria(root: ParentNode) {
    const table = root.querySelector('table')!;
    const rowsOut = painted(root).map((item) => ({
      index: item.el.getAttribute('aria-rowindex'),
      dataIndex: item.el.getAttribute('data-index'),
    }));
    return { count: table.getAttribute('aria-rowcount'), rows: rowsOut };
  }

  it('virtualized finite: aria-rowcount = 1 + bodyItems.length; every item = paintIndex + 2', () => {
    const rows = keyRows(120, [10, 55, 100]);
    const { container } = render(<DataTable {...tableProps({ rows, virtualized: true })} />);
    scrollTo(container, 2000);
    const aria = readAria(container);
    expect(aria.count).toBe(String(1 + 120 + 4));
    expect(aria.rows.length).toBeGreaterThan(0);
    let previous = 1;
    for (const row of aria.rows) {
      expect(row.index).not.toBeNull();
      expect(Number(row.index)).toBe(Number(row.dataIndex) + 2);
      expect(Number(row.index)).toBe(previous === 1 ? Number(row.index) : previous + 1);
      previous = Number(row.index);
    }
  });

  it('virtualized feed with hasMore: aria-rowcount -1; indices on every item', () => {
    const { container } = render(
      <DataTable
        {...tableProps({
          rows: keyRows(300),
          virtualized: true,
          infiniteScroll: { hasMore: true, onLoadMore: noop },
        })}
      />
    );
    const aria = readAria(container);
    expect(aria.count).toBe('-1');
    expect(aria.rows.every((row) => row.index !== null)).toBe(true);
  });

  it('unvirtualized feed: every section and data row indexed 2…n+1 in DOM order; spacer / sentinel none', () => {
    const { container } = render(
      <DataTable
        {...tableProps({
          rows: keyRows(9, [4]),
          infiniteScroll: { hasMore: true, onLoadMore: noop },
        })}
      />
    );
    const aria = readAria(container);
    expect(aria.rows.map((row) => row.index)).toEqual(aria.rows.map((_, n) => String(n + 2)));
    expect(
      container
        .querySelector('[data-slot="data-table-infinite-sentinel"]')!
        .hasAttribute('aria-rowindex')
    ).toBe(false);
  });

  it('unvirtualized plain: neither attribute anywhere', () => {
    const { container } = render(<DataTable {...tableProps()} />);
    const aria = readAria(container);
    expect(aria.count).toBeNull();
    expect(aria.rows.every((row) => row.index === null)).toBe(true);
  });
});

describe('INV-36: the kit adds no tab stops (jsdom structure)', () => {
  it('default renderer: section rows hold nothing focusable; focusables equal ungrouped', () => {
    const focusables = (grouping: DataTableGrouping<KeyRow> | undefined) => {
      const { container, unmount } = render(
        <DataTable
          {...tableProps({
            grouping,
            selection: { selectedKeys: new Set<string>(), onSelectionChange: noop },
          })}
        />
      );
      for (const tr of container.querySelectorAll('tr[data-slot="data-table-group-row"]')) {
        expect(tr.querySelector('[tabindex], button, a, input')).toBeNull();
        expect(tr.hasAttribute('tabindex')).toBe(false);
      }
      const out = [
        ...container.querySelectorAll<HTMLElement>('button, input, a[href], [tabindex]'),
      ].map((el) => el.getAttribute('aria-label') ?? el.textContent);
      unmount();
      return out.sort();
    };
    expect(focusables(byRole())).toEqual(focusables(undefined));
  });
});
